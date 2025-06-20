import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadMessages: {},

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error(`Cannot send message: ${selectedUser.fullName} is blocked`);
      } else {
        toast.error(error.response?.data?.message || "Failed to send message");
      }
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages } = get();
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set({ messages: [...messages, newMessage] });
      } else {
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [newMessage.senderId]: (state.unreadMessages[newMessage.senderId] || 0) + 1,
          },
        }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => {
    set((state) => {
      // If we're closing the chat (selectedUser is null), keep the unread messages
      if (!selectedUser) {
        return { selectedUser: null };
      }
      
      // If we're opening a chat, reset that user's unread count
      return {
        selectedUser,
        unreadMessages: {
          ...state.unreadMessages,
          [selectedUser._id]: 0,
        },
      };
    });
  },

  initSocketListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage"); // Prevent duplicate listeners
    socket.off("messageUpdated"); // Prevent duplicate listeners

    socket.on("newMessage", (newMessage) => {
      console.log("=== FRONTEND MESSAGE RECEIVED ===");
      console.log("Received new message:", newMessage);
      console.log("Message text:", newMessage.text);
      console.log("Message length:", newMessage.text?.length || 0);
      console.log("Current selectedUser:", selectedUser);
      console.log("Message senderId:", newMessage.senderId);
      console.log("SelectedUser _id:", selectedUser?._id);
      
      const { selectedUser, messages } = get();
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        console.log("✅ Adding message to current chat");
        set({
          messages: [...messages, newMessage],
        });
      } else {
        console.log("✅ Adding to unread messages for:", newMessage.senderId);
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [newMessage.senderId]: (state.unreadMessages[newMessage.senderId] || 0) + 1,
          },
        }));
      }
    });

    socket.on("messageUpdated", (updatedMessage) => {
      console.log("Message updated with translation:", updatedMessage);
      const { selectedUser, messages } = get();
      if (selectedUser && updatedMessage.senderId === selectedUser._id) {
        set({
          messages: messages.map(msg => 
            msg._id === updatedMessage._id ? updatedMessage : msg
          ),
        });
      } else {
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [updatedMessage.senderId]: (state.unreadMessages[updatedMessage.senderId] || 0) + 1,
          },
        }));
      }
    });
  },
}));
