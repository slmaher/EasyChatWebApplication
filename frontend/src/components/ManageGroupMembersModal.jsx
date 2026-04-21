import React, { useMemo, useState } from "react";
import { Crown, Shield, Trash2, UserPlus, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const roleBadgeClass = {
  owner: "badge badge-neutral",
  admin: "badge badge-primary",
  member: "badge badge-ghost",
};

const ManageGroupMembersModal = ({ isOpen, onClose, group }) => {
  const { authUser } = useAuthStore();
  const {
    users,
    addGroupMembers,
    removeGroupMember,
    updateGroupMemberRole,
    getGroupAuditEvents,
    groupAuditEventsById,
  } = useChatStore();

  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const members = useMemo(() => group?.members || [], [group]);
  const activeMembers = useMemo(
    () => members.filter((member) => !member.leftAt),
    [members],
  );
  const currentMember = activeMembers.find(
    (member) => String(member.userId) === String(authUser?._id),
  );

  const isOwner = currentMember?.role === "owner";
  const isAdmin = currentMember?.role === "admin";
  const canManage = isOwner || isAdmin;

  const activeMemberIdSet = new Set(activeMembers.map((m) => String(m.userId)));
  const usersAvailableToAdd = users.filter(
    (user) => !activeMemberIdSet.has(String(user._id)),
  );

  const auditEvents = groupAuditEventsById[group?._id] || [];

  const toggleSelectedToAdd = (userId) => {
    setSelectedToAdd((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleAddMembers = async () => {
    if (!group?._id || !selectedToAdd.length) return;
    setIsSaving(true);
    try {
      await addGroupMembers(group._id, selectedToAdd);
      setSelectedToAdd([]);
      await getGroupAuditEvents(group._id, 30);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!group?._id) return;
    setIsSaving(true);
    try {
      await removeGroupMember(group._id, memberId);
      await getGroupAuditEvents(group._id, 30);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    if (!group?._id) return;
    setIsSaving(true);
    try {
      await updateGroupMemberRole(group._id, memberId, role);
      await getGroupAuditEvents(group._id, 30);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadAudit = async () => {
    if (!group?._id) return;
    await getGroupAuditEvents(group._id, 30);
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Manage Members</h2>
            <p className="text-xs font-mono uppercase tracking-[0.12em] text-base-content/60">
              {group.name}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Current Members</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-base-300 p-2">
              {activeMembers.map((member) => {
                const user = users.find((u) => String(u._id) === String(member.userId));
                const memberId = String(member.userId);
                const canChangeRole = isOwner && member.role !== "owner";
                const canRemove =
                  canManage &&
                  member.role !== "owner" &&
                  (isOwner || member.role === "member" || memberId === String(authUser?._id));

                return (
                  <div
                    key={`${memberId}-${member.joinedAt}`}
                    className="rounded-lg border border-base-300 px-2 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={user?.profilePic || "/NoAvatar.png"}
                          alt={user?.fullName || "member"}
                          className="size-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-sm font-medium">{user?.fullName || memberId}</div>
                          <div className={roleBadgeClass[member.role] || "badge"}>{member.role}</div>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {canChangeRole && member.role === "member" && (
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => handleRoleChange(memberId, "admin")}
                            disabled={isSaving}
                            title="Promote to admin"
                          >
                            <Shield className="size-3" />
                            Promote
                          </button>
                        )}
                        {canChangeRole && member.role === "admin" && (
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => handleRoleChange(memberId, "member")}
                            disabled={isSaving}
                            title="Demote to member"
                          >
                            <Crown className="size-3" />
                            Demote
                          </button>
                        )}
                        {canRemove && (
                          <button
                            className="btn btn-xs btn-error btn-outline"
                            onClick={() => handleRemove(memberId)}
                            disabled={isSaving}
                            title="Remove member"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 className="text-sm font-semibold">Add Members</h3>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-base-300 p-2">
              {usersAvailableToAdd.map((user) => (
                <label
                  key={user._id}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-base-200"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={user.profilePic || "/NoAvatar.png"}
                      alt={user.fullName}
                      className="size-8 rounded-full object-cover"
                    />
                    <span className="text-sm">{user.fullName}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedToAdd.includes(user._id)}
                    onChange={() => toggleSelectedToAdd(user._id)}
                    disabled={!canManage || isSaving}
                  />
                </label>
              ))}
              {!usersAvailableToAdd.length && (
                <div className="text-xs text-base-content/60">No available users to add.</div>
              )}
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleAddMembers}
              disabled={!canManage || isSaving || !selectedToAdd.length}
            >
              <UserPlus className="size-4" />
              Add Selected Members
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Audit Events</h3>
              <button className="btn btn-xs btn-outline" onClick={handleLoadAudit}>
                Refresh
              </button>
            </div>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-xl border border-base-300 p-2">
              {auditEvents.length === 0 && (
                <p className="text-xs text-base-content/60">
                  No audit events loaded yet.
                </p>
              )}
              {auditEvents.map((event) => (
                <div key={event._id} className="rounded-lg border border-base-300 p-2">
                  <div className="text-xs font-mono uppercase tracking-[0.1em] text-primary">
                    {event.action.replaceAll("_", " ")}
                  </div>
                  <div className="text-xs text-base-content/70">
                    by {event.actorUserId?.fullName || "Unknown"}
                    {event.targetUserId?.fullName
                      ? ` -> ${event.targetUserId.fullName}`
                      : ""}
                  </div>
                  <div className="text-[11px] text-base-content/50">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageGroupMembersModal;
