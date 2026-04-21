import mongoose from "mongoose";
import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import { io, userSocketMap } from "../lib/socket.js";
import User from "../models/user.model.js";
import GroupAuditEvent from "../models/groupAuditEvent.model.js";

const isValidEncryptedPayload = (encryption) => {
  return Boolean(
    encryption &&
    Array.isArray(encryption.recipientEnvelopes) &&
    encryption.recipientEnvelopes.length > 0 &&
    encryption.senderEnvelope &&
    encryption.senderDeviceId,
  );
};

const getActiveMembers = (group) =>
  (group.members || []).filter((member) => !member.leftAt);

const normalizeCandidateIds = (candidateIds = []) => {
  if (!Array.isArray(candidateIds)) return [];

  return candidateIds
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return entry;
      if (typeof entry === "object") {
        return entry.userId || entry._id || entry.id || entry.value || null;
      }
      return null;
    })
    .filter(Boolean)
    .map((id) => String(id));
};

const canManageMembers = (group, userId) => {
  return getActiveMembers(group).some(
    (member) =>
      String(member.userId) === String(userId) &&
      ["owner", "admin"].includes(member.role),
  );
};

const getActiveMemberById = (group, userId) => {
  return getActiveMembers(group).find(
    (member) => String(member.userId) === String(userId),
  );
};

const writeAuditEvent = async ({
  groupId,
  actorUserId,
  targetUserId,
  action,
  metadata,
}) => {
  try {
    await GroupAuditEvent.create({
      groupId,
      actorUserId,
      targetUserId,
      action,
      metadata,
    });
  } catch (error) {
    console.error("Error writing group audit event:", error.message);
  }
};

export const createGroup = async (req, res) => {
  try {
    const creatorId = String(req.user._id);
    const {
      name,
      description = "",
      memberIds,
      members: memberEntries,
      participantIds,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const incomingMemberIds = [
      ...normalizeCandidateIds(memberIds),
      ...normalizeCandidateIds(memberEntries),
      ...normalizeCandidateIds(participantIds),
    ];

    const normalizedMemberIds = Array.from(
      new Set([creatorId, ...incomingMemberIds]),
    );

    const invalidMemberId = normalizedMemberIds.find(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    if (invalidMemberId) {
      return res.status(400).json({ message: "Invalid member id provided" });
    }

    const existingUsers = await User.countDocuments({
      _id: { $in: normalizedMemberIds },
    });
    if (existingUsers !== normalizedMemberIds.length) {
      return res
        .status(400)
        .json({ message: "One or more members do not exist" });
    }

    const groupMembers = normalizedMemberIds.map((userId) => ({
      userId,
      role: userId === creatorId ? "owner" : "member",
    }));

    const group = await Group.create({
      name: name.trim(),
      description: description.trim(),
      createdBy: creatorId,
      members: groupMembers,
    });

    await writeAuditEvent({
      groupId: group._id,
      actorUserId: creatorId,
      action: "group_created",
      metadata: {
        name: group.name,
        initialMemberCount: groupMembers.length,
      },
    });

    return res.status(201).json(group);
  } catch (error) {
    console.error("Error in createGroup:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const myId = req.user._id;

    const groups = await Group.find({
      isArchived: false,
      members: {
        $elemMatch: {
          userId: myId,
          leftAt: null,
        },
      },
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getMyGroups:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const myId = String(req.user._id);
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = parseInt(req.query.skip, 10) || 0;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId).lean();
    if (!group || group.isArchived) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = getActiveMembers(group).some(
      (member) => String(member.userId) === myId,
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const messages = await GroupMessage.find({ groupId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getGroupMessages:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const senderId = String(req.user._id);
    const { encryption } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    if (!isValidEncryptedPayload(encryption)) {
      return res.status(400).json({ message: "Invalid encrypted payload" });
    }

    const group = await Group.findById(groupId).lean();
    if (!group || group.isArchived) {
      return res.status(404).json({ message: "Group not found" });
    }

    const activeMembers = getActiveMembers(group);
    const isSenderMember = activeMembers.some(
      (member) => String(member.userId) === senderId,
    );
    if (!isSenderMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const recipientUserIdSet = new Set(
      activeMembers
        .map((member) => String(member.userId))
        .filter((memberId) => memberId !== senderId),
    );

    const invalidEnvelope = encryption.recipientEnvelopes.some(
      (envelope) => !recipientUserIdSet.has(String(envelope.recipientUserId)),
    );
    if (invalidEnvelope) {
      return res
        .status(400)
        .json({ message: "Envelope contains non-member recipient" });
    }

    const groupMessage = await GroupMessage.create({
      groupId,
      senderId,
      encryption,
      recipientDeviceCount: encryption.recipientEnvelopes.length,
    });

    const memberIds = Array.from(recipientUserIdSet);
    memberIds.push(senderId);

    memberIds.forEach((memberId) => {
      const socketId = userSocketMap[memberId];
      if (socketId) {
        io.to(socketId).emit("newGroupMessage", groupMessage);
      }
    });

    return res.status(201).json(groupMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterId = String(req.user._id);
    const { memberIds, members, participantIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!canManageMembers(group, requesterId)) {
      return res
        .status(403)
        .json({ message: "Only owner/admin can add members" });
    }

    const candidateIds = Array.from(
      new Set([
        ...normalizeCandidateIds(memberIds),
        ...normalizeCandidateIds(members),
        ...normalizeCandidateIds(participantIds),
      ]),
    );

    if (!candidateIds.length) {
      return res.status(400).json({ message: "No member ids provided" });
    }

    const invalidMemberId = candidateIds.find(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    if (invalidMemberId) {
      return res.status(400).json({ message: "Invalid member id provided" });
    }

    const existingUsers = await User.countDocuments({
      _id: { $in: candidateIds },
    });
    if (existingUsers !== candidateIds.length) {
      return res
        .status(400)
        .json({ message: "One or more members do not exist" });
    }

    const activeMemberSet = new Set(
      getActiveMembers(group).map((member) => String(member.userId)),
    );

    const toAdd = candidateIds.filter((userId) => !activeMemberSet.has(userId));
    if (!toAdd.length) {
      return res.status(200).json({
        message: "No new members to add",
        group,
      });
    }

    toAdd.forEach((userId) => {
      group.members.push({
        userId,
        role: "member",
        joinedAt: new Date(),
        leftAt: null,
      });
    });

    await group.save();

    await writeAuditEvent({
      groupId: group._id,
      actorUserId: requesterId,
      action: "members_added",
      metadata: {
        addedMemberIds: toAdd,
        addedCount: toAdd.length,
      },
    });

    return res.status(200).json({
      message: "Members added",
      group,
      addedMemberIds: toAdd,
    });
  } catch (error) {
    console.error("Error in addGroupMembers:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const requesterId = String(req.user._id);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid member id" });
    }

    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ message: "Group not found" });
    }

    const requesterMember = getActiveMemberById(group, requesterId);
    if (!requesterMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const targetMember = getActiveMemberById(group, memberId);
    if (!targetMember) {
      return res.status(404).json({ message: "Target member not found" });
    }

    const isSelfRemoval = String(memberId) === requesterId;
    const requesterRole = requesterMember.role;
    const targetRole = targetMember.role;

    if (!isSelfRemoval && !["owner", "admin"].includes(requesterRole)) {
      return res
        .status(403)
        .json({ message: "Insufficient permission to remove member" });
    }

    if (targetRole === "owner") {
      return res.status(400).json({ message: "Owner cannot be removed" });
    }

    if (requesterRole === "admin" && targetRole !== "member") {
      return res
        .status(403)
        .json({ message: "Admin can only remove regular members" });
    }

    const memberIndex = group.members.findIndex(
      (member) => String(member.userId) === String(memberId) && !member.leftAt,
    );
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Target member not found" });
    }

    group.members[memberIndex].leftAt = new Date();
    await group.save();

    await writeAuditEvent({
      groupId: group._id,
      actorUserId: requesterId,
      targetUserId: memberId,
      action: "member_removed",
      metadata: {
        removedByRole: requesterRole,
        removedTargetRole: targetRole,
        selfRemoval: isSelfRemoval,
      },
    });

    return res.status(200).json({
      message: "Member removed",
      group,
    });
  } catch (error) {
    console.error("Error in removeGroupMember:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateGroupMemberRole = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;
    const requesterId = String(req.user._id);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid member id" });
    }

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin or member" });
    }

    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ message: "Group not found" });
    }

    const requesterMember = getActiveMemberById(group, requesterId);
    if (!requesterMember || requesterMember.role !== "owner") {
      return res
        .status(403)
        .json({ message: "Only owner can change member roles" });
    }

    const targetMember = getActiveMemberById(group, memberId);
    if (!targetMember) {
      return res.status(404).json({ message: "Target member not found" });
    }

    if (targetMember.role === "owner") {
      return res.status(400).json({ message: "Owner role cannot be changed" });
    }

    if (targetMember.role === role) {
      return res.status(200).json({
        message: "Role unchanged",
        group,
      });
    }

    const targetMemberIndex = group.members.findIndex(
      (member) => String(member.userId) === String(memberId) && !member.leftAt,
    );
    if (targetMemberIndex === -1) {
      return res.status(404).json({ message: "Target member not found" });
    }

    group.members[targetMemberIndex].role = role;
    await group.save();

    const action =
      role === "admin" ? "member_promoted_admin" : "member_demoted_member";
    await writeAuditEvent({
      groupId: group._id,
      actorUserId: requesterId,
      targetUserId: memberId,
      action,
      metadata: {
        newRole: role,
      },
    });

    return res.status(200).json({
      message: "Role updated",
      group,
    });
  } catch (error) {
    console.error("Error in updateGroupMemberRole:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getGroupAuditEvents = async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterId = String(req.user._id);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId).lean();
    if (!group || group.isArchived) {
      return res.status(404).json({ message: "Group not found" });
    }

    const requesterMember = getActiveMemberById(group, requesterId);
    if (!requesterMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const events = await GroupAuditEvent.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actorUserId", "_id fullName profilePic")
      .populate("targetUserId", "_id fullName profilePic")
      .lean();

    return res.status(200).json(events);
  } catch (error) {
    console.error("Error in getGroupAuditEvents:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
