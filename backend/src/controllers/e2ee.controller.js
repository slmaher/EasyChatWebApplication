import mongoose from "mongoose";
import DeviceKey from "../models/deviceKey.model.js";

const MAX_PREKEYS = 200;

export const registerDeviceKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const { deviceId, identityKey, preKeys } = req.body;

    if (!deviceId || !identityKey || !Array.isArray(preKeys) || preKeys.length === 0) {
      return res.status(400).json({ message: "deviceId, identityKey and preKeys are required" });
    }

    if (preKeys.length > MAX_PREKEYS) {
      return res.status(400).json({ message: `Too many prekeys. Max ${MAX_PREKEYS}` });
    }

    const normalizedPreKeys = preKeys
      .filter((preKey) => preKey?.keyId && preKey?.publicKey)
      .map((preKey) => ({
        keyId: String(preKey.keyId),
        publicKey: preKey.publicKey,
        isUsed: false,
      }));

    if (!normalizedPreKeys.length) {
      return res.status(400).json({ message: "At least one valid prekey is required" });
    }

    const existing = await DeviceKey.findOne({ userId, deviceId });

    if (!existing) {
      const created = await DeviceKey.create({
        userId,
        deviceId,
        identityKey,
        preKeys: normalizedPreKeys,
        lastSeenAt: new Date(),
      });

      return res.status(201).json({
        message: "Device keys registered",
        deviceId: created.deviceId,
        preKeyCount: created.preKeys.length,
      });
    }

    const knownPreKeys = new Set(existing.preKeys.map((preKey) => preKey.keyId));
    const keysToAppend = normalizedPreKeys.filter((preKey) => !knownPreKeys.has(preKey.keyId));

    existing.identityKey = identityKey;
    existing.preKeys.push(...keysToAppend);
    existing.lastSeenAt = new Date();

    if (existing.preKeys.length > MAX_PREKEYS) {
      existing.preKeys = existing.preKeys.slice(existing.preKeys.length - MAX_PREKEYS);
    }

    await existing.save();

    return res.status(200).json({
      message: "Device keys updated",
      deviceId: existing.deviceId,
      preKeyCount: existing.preKeys.filter((preKey) => !preKey.isUsed).length,
    });
  } catch (error) {
    console.error("Error in registerDeviceKeys:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getPreKeyBundle = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const devices = await DeviceKey.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    const bundles = devices
      .map((device) => {
        const availablePreKey = device.preKeys.find((preKey) => !preKey.isUsed);

        return {
          deviceId: device.deviceId,
          identityKey: device.identityKey,
          preKey: availablePreKey
            ? {
                keyId: availablePreKey.keyId,
                publicKey: availablePreKey.publicKey,
              }
            : null,
        };
      })
      .filter((bundle) => Boolean(bundle.identityKey));

    if (!bundles.length) {
      return res.status(404).json({
        message: "Recipient has not registered E2EE keys yet. Ask them to log in from their device first.",
        code: "RECIPIENT_E2EE_NOT_REGISTERED",
      });
    }

    return res.status(200).json({ userId, bundles });
  } catch (error) {
    console.error("Error in getPreKeyBundle:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const consumePreKey = async (req, res) => {
  try {
    const userId = req.user._id;
    const { deviceId, preKeyId } = req.body;

    if (!deviceId || !preKeyId) {
      return res.status(400).json({ message: "deviceId and preKeyId are required" });
    }

    const updated = await DeviceKey.findOneAndUpdate(
      {
        userId,
        deviceId,
        "preKeys.keyId": String(preKeyId),
      },
      {
        $set: {
          "preKeys.$.isUsed": true,
          lastSeenAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Prekey not found" });
    }

    return res.status(200).json({ message: "Prekey consumed" });
  } catch (error) {
    console.error("Error in consumePreKey:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
