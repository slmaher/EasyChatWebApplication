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
      default: "xchacha20poly1305",
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    translatedText: {
      type: String,
    },
    translatedTo: {
      type: String,
    },
    detectedLanguage: {
      type: String,
    },
    encryption: {
      version: {
        type: Number,
      },
      senderDeviceId: {
        type: String,
      },
      recipientEnvelopes: {
        type: [envelopeSchema],
        default: [],
      },
      senderEnvelope: envelopeSchema,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
