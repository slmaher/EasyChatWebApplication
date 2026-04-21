import { axiosInstance } from "./axios";

const DEVICE_STORAGE_KEY_PREFIX = "easychat:e2ee:device";
const TARGET_PREKEY_BUFFER = 30;
const PREKEY_BATCH_SIZE = 20;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const getStorageKey = (userId) => `${DEVICE_STORAGE_KEY_PREFIX}:${userId}`;

const readDeviceState = (userId) => {
  const raw = localStorage.getItem(getStorageKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeDeviceState = (userId, state) => {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
};

const randomId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

const createExchangeKeyPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    publicKey: publicJwk,
    privateKey: privateJwk,
  };
};

const createPreKeyPair = async () => {
  const keyPair = await createExchangeKeyPair();
  return {
    keyId: randomId("prekey"),
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
};

const appendPreKeys = async (deviceState, count) => {
  const generated = [];
  for (let i = 0; i < count; i += 1) {
    generated.push(await createPreKeyPair());
  }
  return {
    ...deviceState,
    preKeys: [...deviceState.preKeys, ...generated],
  };
};

const importPublicKey = async (jwk) => {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
};

const importPrivateKey = async (jwk) => {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
};

const deriveMessageKey = async (sharedSecret, saltBytes) => {
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: saltBytes,
      info: textEncoder.encode("easychat-e2ee-v1"),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const randomBytes = (size) => {
  const out = new Uint8Array(size);
  crypto.getRandomValues(out);
  return out;
};

const encryptWithEnvelope = async (
  plaintext,
  recipientPublicKeyJwk,
  keyType,
  preKeyId,
  recipientUserId,
  recipientDeviceId,
) => {
  const recipientPublicKey = await importPublicKey(recipientPublicKeyJwk);
  const eph = await createExchangeKeyPair();
  const ephPrivateKey = await importPrivateKey(eph.privateKey);

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: recipientPublicKey },
    ephPrivateKey,
    256,
  );

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveMessageKey(sharedSecret, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(JSON.stringify(plaintext)),
  );

  return {
    recipientUserId,
    recipientDeviceId,
    keyType,
    preKeyId,
    ephemeralPublicKey: eph.publicKey,
    salt: toBase64(salt),
    nonce: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    algorithm: "aes-256-gcm+hkdf-sha256",
  };
};

const decryptEnvelope = async (envelope, privateKeyJwk) => {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const ephemeralPublicKey = await importPublicKey(envelope.ephemeralPublicKey);
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.nonce);
  const ciphertext = fromBase64(envelope.ciphertext);

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: ephemeralPublicKey },
    privateKey,
    256,
  );

  const key = await deriveMessageKey(sharedSecret, salt);
  const plaintextBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return JSON.parse(textDecoder.decode(plaintextBytes));
};

const registerCurrentDevice = async (userId, deviceState) => {
  await axiosInstance.post("/e2ee/register-device", {
    deviceId: deviceState.deviceId,
    identityKey: deviceState.identityPublicKey,
    preKeys: deviceState.preKeys.map((preKey) => ({
      keyId: preKey.keyId,
      publicKey: preKey.publicKey,
    })),
  });
};

export const initializeE2EEForUser = async (userId) => {
  let deviceState = readDeviceState(userId);

  if (!deviceState) {
    const identity = await createExchangeKeyPair();
    const freshState = {
      deviceId: randomId("device"),
      identityPublicKey: identity.publicKey,
      identityPrivateKey: identity.privateKey,
      preKeys: [],
    };
    deviceState = await appendPreKeys(freshState, TARGET_PREKEY_BUFFER);
    writeDeviceState(userId, deviceState);
    await registerCurrentDevice(userId, deviceState);
    return deviceState;
  }

  if ((deviceState.preKeys?.length || 0) < PREKEY_BATCH_SIZE) {
    deviceState = await appendPreKeys(
      deviceState,
      TARGET_PREKEY_BUFFER - deviceState.preKeys.length,
    );
    writeDeviceState(userId, deviceState);
  }

  await registerCurrentDevice(userId, deviceState);
  return deviceState;
};

export const encryptPayloadForUser = async (
  recipientUserId,
  payload,
  authUserId,
) => {
  const myState = readDeviceState(authUserId);
  if (!myState) {
    throw new Error(
      "Missing local E2EE keys. Re-authenticate to regenerate keys.",
    );
  }

  const bundleRes = await axiosInstance.get(
    `/e2ee/prekey-bundle/${recipientUserId}`,
  );
  const bundles = bundleRes.data?.bundles || [];

  if (!bundles.length) {
    throw new Error("Recipient has no registered encryption device");
  }

  const recipientEnvelopes = await Promise.all(
    bundles.map(async (bundle) => {
      const hasPreKey = Boolean(bundle.preKey?.publicKey);
      const targetPublicKey = hasPreKey
        ? bundle.preKey.publicKey
        : bundle.identityKey;
      const keyType = hasPreKey ? "prekey" : "identity";
      const preKeyId = hasPreKey ? bundle.preKey.keyId : null;

      return encryptWithEnvelope(
        payload,
        targetPublicKey,
        keyType,
        preKeyId,
        recipientUserId,
        bundle.deviceId,
      );
    }),
  );

  const senderEnvelope = await encryptWithEnvelope(
    payload,
    myState.identityPublicKey,
    "identity",
    null,
    authUserId,
    myState.deviceId,
  );

  return {
    version: 1,
    senderDeviceId: myState.deviceId,
    recipientEnvelopes,
    senderEnvelope,
  };
};

export const encryptGroupMessage = async (groupId, payload, authUserId) => {
  const myState = readDeviceState(authUserId);
  if (!myState) {
    throw new Error(
      "Missing local E2EE keys. Re-authenticate to regenerate keys.",
    );
  }

  const recipientRes = await axiosInstance.get(
    `/e2ee/group-recipient-devices/${groupId}`,
  );
  const recipients = recipientRes.data?.recipients || [];

  const recipientEnvelopes = await Promise.all(
    recipients.map(async (recipient) => {
      const hasPreKey = Boolean(recipient.preKey?.publicKey);
      const targetPublicKey = hasPreKey
        ? recipient.preKey.publicKey
        : recipient.identityKey;
      const keyType = hasPreKey ? "prekey" : "identity";
      const preKeyId = hasPreKey ? recipient.preKey.keyId : null;

      return encryptWithEnvelope(
        payload,
        targetPublicKey,
        keyType,
        preKeyId,
        recipient.userId,
        recipient.deviceId,
      );
    }),
  );

  const senderEnvelope = await encryptWithEnvelope(
    payload,
    myState.identityPublicKey,
    "identity",
    null,
    authUserId,
    myState.deviceId,
  );

  return {
    version: 1,
    senderDeviceId: myState.deviceId,
    recipientEnvelopes,
    senderEnvelope,
  };
};

export const decryptMessageForCurrentDevice = async (message, authUserId) => {
  if (!message?.encryption) {
    return {
      ...message,
      decrypted: { text: message.text || "", image: message.image || null },
    };
  }

  const myState = readDeviceState(authUserId);
  if (!myState) {
    return {
      ...message,
      decrypted: {
        text: "",
        image: null,
        decryptError: "Missing local E2EE keys",
      },
    };
  }

  try {
    const { encryption } = message;
    const isSender = String(message.senderId) === String(authUserId);

    if (isSender && encryption.senderEnvelope) {
      const plaintext = await decryptEnvelope(
        encryption.senderEnvelope,
        myState.identityPrivateKey,
      );

      return { ...message, decrypted: plaintext };
    }

    const envelope = (encryption.recipientEnvelopes || []).find(
      (item) => item.recipientDeviceId === myState.deviceId,
    );

    if (!envelope) {
      return {
        ...message,
        decrypted: {
          text: "",
          image: null,
          decryptError: "No envelope for this device",
        },
      };
    }

    let plaintext;
    if (envelope.keyType === "identity") {
      plaintext = await decryptEnvelope(envelope, myState.identityPrivateKey);
    } else {
      const preKey = (myState.preKeys || []).find(
        (item) => item.keyId === envelope.preKeyId,
      );
      if (!preKey) {
        return {
          ...message,
          decrypted: {
            text: "",
            image: null,
            decryptError: "Missing local prekey",
          },
        };
      }

      plaintext = await decryptEnvelope(envelope, preKey.privateKey);

      // Consume one-time prekey locally and on server once successfully used.
      myState.preKeys = myState.preKeys.filter(
        (item) => item.keyId !== envelope.preKeyId,
      );
      writeDeviceState(authUserId, myState);

      axiosInstance
        .post("/e2ee/consume-prekey", {
          deviceId: myState.deviceId,
          preKeyId: envelope.preKeyId,
        })
        .catch(() => {});
    }

    return { ...message, decrypted: plaintext };
  } catch {
    return {
      ...message,
      decrypted: {
        text: "",
        image: null,
        decryptError: "Unable to decrypt message",
      },
    };
  }
};
