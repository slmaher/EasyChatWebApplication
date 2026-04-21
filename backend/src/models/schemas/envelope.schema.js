import mongoose from "mongoose";

const envelopeSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientDeviceId: {
      type: String,
      required: true,
    },
    keyType: {
      type: String,
      enum: ["prekey", "identity"],
      required: true,
    },
    preKeyId: {
      type: String,
    },
    ephemeralPublicKey: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    nonce: {
      type: String,
      required: true,
    },
    ciphertext: {
      type: String,
      required: true,
    },
    algorithm: {
      type: String,
      required: true,
      default: "aes-256-gcm+hkdf-sha256",
    },
  },
  { _id: false },
);

export default envelopeSchema;