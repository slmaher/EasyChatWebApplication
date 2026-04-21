import mongoose from "mongoose";

const preKeySchema = new mongoose.Schema(
  {
    keyId: {
      type: String,
      required: true,
    },
    publicKey: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const deviceKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    identityKey: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    preKeys: {
      type: [preKeySchema],
      default: [],
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

deviceKeySchema.index({ userId: 1, deviceId: 1 }, { unique: true });

const DeviceKey = mongoose.model("DeviceKey", deviceKeySchema);

export default DeviceKey;
