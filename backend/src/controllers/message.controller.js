import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import BlockedUser from "../models/blockedUser.model.js";

import { getReceiverSocketId, io, userSocketMap } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get blocked users
    const blockedUsers = await BlockedUser.find({
      userId: loggedInUserId,
    }).select("blockedUserId");
    const blockedUserIds = blockedUsers.map((block) => block.blockedUserId);

    // Get all users except the logged-in user
    const users = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    // For each user, get the latest message between them and the logged-in user
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...user.toObject(),
          isBlocked: blockedUserIds.includes(user._id.toString()),
          lastMessage: lastMessage
            ? {
                text: lastMessage.encryption
                  ? "Encrypted message"
                  : lastMessage.text,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      }),
    );

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const limit = parseInt(req.query.limit) || 15;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { encryption } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log("=== MESSAGE SEND DEBUG ===");
    console.log("Sender ID:", senderId);
    console.log("Receiver ID:", receiverId);
    console.log("Encryption payload present:", Boolean(encryption));
    console.log("All connected users:", Object.keys(userSocketMap));

    if (
      !encryption ||
      !Array.isArray(encryption.recipientEnvelopes) ||
      !encryption.recipientEnvelopes.length ||
      !encryption.senderEnvelope ||
      !encryption.senderDeviceId
    ) {
      return res.status(400).json({ error: "Invalid encrypted payload" });
    }

    // Check if either user has blocked the other
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { userId: senderId, blockedUserId: receiverId },
        { userId: receiverId, blockedUserId: senderId },
      ],
    });

    if (isBlocked) {
      console.log("Message blocked - users are blocked");
      return res
        .status(403)
        .json({ error: "Cannot send message to blocked user" });
    }

    // Store encrypted envelopes only. Server must not receive plaintext.
    const newMessage = new Message({
      senderId,
      receiverId,
      encryption,
    });

    await newMessage.save();
    console.log("Message saved with ID:", newMessage._id);

    // Send message via socket immediately
    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    console.log("=== SOCKET DEBUG ===");
    console.log("Receiver Socket ID:", receiverSocketId);
    console.log("Sender Socket ID:", senderSocketId);

    const targetSocketIds = Array.from(
      new Set([receiverSocketId, senderSocketId].filter(Boolean)),
    );

    if (!receiverSocketId) {
      console.log("❌ Receiver not online:", receiverId);
    }

    if (!senderSocketId) {
      console.log("❌ Sender not online:", senderId);
    }

    targetSocketIds.forEach((socketId) => {
      console.log("✅ Emitting to socket:", socketId);
      try {
        io.to(socketId).emit("newMessage", newMessage);
        console.log("✅ Message emitted successfully");
      } catch (emitError) {
        console.error("❌ Error emitting message:", emitError);
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
