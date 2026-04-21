import mongoose from "mongoose";
import envelopeSchema from "./schemas/envelope.schema.js";

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    encryption: {
      version: {
        type: Number,
        required: true,
      },
      senderDeviceId: {
        type: String,
        required: true,
      },
      recipientEnvelopes: {
        type: [envelopeSchema],
        default: [],
      },
      senderEnvelope: {
        type: envelopeSchema,
        required: true,
      },
    },
    recipientDeviceCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

groupMessageSchema.index({ groupId: 1, createdAt: -1 });

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;
