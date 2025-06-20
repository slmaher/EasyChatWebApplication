import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import BlockedUser from "../models/blockedUser.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io, userSocketMap } from "../lib/socket.js";
import { detectLanguage, translateText } from "../lib/utils.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Get blocked users
    const blockedUsers = await BlockedUser.find({ userId: loggedInUserId })
      .select("blockedUserId");
    const blockedUserIds = blockedUsers.map(block => block.blockedUserId);

    // Get all users except the logged-in user
    const users = await User.find({
      _id: { $ne: loggedInUserId }
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
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      })
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

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log("=== MESSAGE SEND DEBUG ===");
    console.log("Sender ID:", senderId);
    console.log("Receiver ID:", receiverId);
    console.log("Message text:", text);
    console.log("Message length:", text?.length || 0);
    console.log("All connected users:", Object.keys(userSocketMap));

    // Check if either user has blocked the other
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { userId: senderId, blockedUserId: receiverId },
        { userId: receiverId, blockedUserId: senderId }
      ]
    });

    if (isBlocked) {
      console.log("Message blocked - users are blocked");
      return res.status(403).json({ error: "Cannot send message to blocked user" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create and save message first (without translation)
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();
    console.log("Message saved with ID:", newMessage._id);

    // Send message via socket immediately
    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    console.log("=== SOCKET DEBUG ===");
    console.log("Receiver Socket ID:", receiverSocketId);
    console.log("Sender Socket ID:", senderSocketId);

    if (receiverSocketId) {
      console.log("✅ Emitting to receiver:", receiverSocketId);
      try {
        io.to(receiverSocketId).emit("newMessage", newMessage);
        console.log("✅ Message emitted to receiver successfully");
      } catch (emitError) {
        console.error("❌ Error emitting to receiver:", emitError);
      }
    } else {
      console.log("❌ Receiver not online:", receiverId);
    }

    if (senderSocketId) {
      console.log("✅ Emitting to sender:", senderSocketId);
      try {
        io.to(senderSocketId).emit("newMessage", newMessage);
        console.log("✅ Message emitted to sender successfully");
      } catch (emitError) {
        console.error("❌ Error emitting to sender:", emitError);
      }
    } else {
      console.log("❌ Sender not online:", senderId);
    }

    // Now handle translation in the background (non-blocking)
    if (text) {
      setTimeout(async () => {
        try {
          console.log("Starting translation for message:", newMessage._id);
          const detectedLanguage = await detectLanguage(text);
          const receiver = await User.findById(receiverId);
          const preferredLanguage = receiver?.preferredLanguage || "en";
          
          if (detectedLanguage !== preferredLanguage) {
            const translatedText = await translateText(text, preferredLanguage);
            
            // Update the message with translation
            const updatedMessage = await Message.findByIdAndUpdate(
              newMessage._id,
              {
                detectedLanguage,
                translatedText,
                translatedTo: preferredLanguage,
              },
              { new: true }
            );

            // Emit updated message to both users
            if (receiverSocketId) {
              io.to(receiverSocketId).emit("messageUpdated", updatedMessage);
            }
            if (senderSocketId) {
              io.to(senderSocketId).emit("messageUpdated", updatedMessage);
            }
          }
        } catch (error) {
          console.error("Translation failed for message:", newMessage._id, error);
        }
      }, 100); // Small delay to ensure message is sent first
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
