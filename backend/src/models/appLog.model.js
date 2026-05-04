import mongoose from "mongoose";

const appLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "user_login",
        "user_logout",
        "user_signup",
        "user_deleted",
        "message_sent",
        "message_deleted",
        "group_created",
        "group_updated",
        "member_added",
        "member_removed",
        "block_user",
        "unblock_user",
        "auth_failed",
        "api_error",
        "database_error",
        "validation_error",
        "permission_denied",
        "server_error",
        "file_upload",
        "security_event",
        "other",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
    },
    message: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userEmail: {
      type: String,
      default: null,
    },
    action: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    endpoint: {
      type: String,
      default: null,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    errorStack: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

appLogSchema.index({ createdAt: 1 });
appLogSchema.index({ type: 1 });
appLogSchema.index({ severity: 1 });
appLogSchema.index({ userId: 1 });
appLogSchema.index({ createdAt: -1, severity: 1 });

const AppLog = mongoose.model("AppLog", appLogSchema);

export default AppLog;
