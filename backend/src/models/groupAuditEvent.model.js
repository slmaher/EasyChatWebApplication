import mongoose from "mongoose";

const groupAuditEventSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    action: {
      type: String,
      enum: [
        "group_created",
        "members_added",
        "member_removed",
        "member_promoted_admin",
        "member_demoted_member",
      ],
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

groupAuditEventSchema.index({ groupId: 1, createdAt: -1 });

const GroupAuditEvent = mongoose.model(
  "GroupAuditEvent",
  groupAuditEventSchema,
);

export default GroupAuditEvent;
