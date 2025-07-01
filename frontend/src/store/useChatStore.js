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
  typingUsers: {},
  messagesByUser: {},

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
    const { messagesByUser } = get();
    if (messagesByUser[userId]) {
      set({ messages: messagesByUser[userId], isMessagesLoading: false });
      return;
    }
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}?limit=15&skip=0`);
      set((state) => ({
        messages: res.data,
        messagesByUser: { ...state.messagesByUser, [userId]: res.data },
      }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  loadMoreMessages: async (userId) => {
    const { messagesByUser } = get();
    const currentMessages = messagesByUser[userId] || [];
    try {
      const res = await axiosInstance.get(`/messages/${userId}?limit=15&skip=${currentMessages.length}`);
      if (res.data.length > 0) {
        set((state) => ({
          messages: [...res.data, ...state.messages],
          messagesByUser: {
            ...state.messagesByUser,
            [userId]: [...res.data, ...(state.messagesByUser[userId] || [])],
          },
        }));
      }
      return res.data.length;
    } catch (error) {
      toast.error(error.response.data.message);
      return 0;
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, messagesByUser } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set((state) => {
        const alreadyExists = state.messages.some(msg => msg._id === res.data._id);
        if (alreadyExists) return state;
        return {
          messages: [...state.messages, res.data],
          messagesByUser: {
            ...state.messagesByUser,
            [selectedUser._id]: [...(state.messagesByUser[selectedUser._id] || []), res.data],
          },
        };
      });
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
      const { selectedUser, messages, messagesByUser } = get();
      const alreadyExists = messages.some(msg => msg._id === newMessage._id);
      if (alreadyExists) return;
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set((state) => ({
          messages: [...state.messages, newMessage],
          messagesByUser: {
            ...state.messagesByUser,
            [selectedUser._id]: [...(state.messagesByUser[selectedUser._id] || []), newMessage],
          },
        }));
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

  setTyping: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    if (socket && receiverId && authUser) {
      socket.emit("typing", { receiverId });
    }
  },
  setStopTyping: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    if (socket && receiverId && authUser) {
      socket.emit("stopTyping", { receiverId });
    }
  },

  initSocketListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage"); // Prevent duplicate listeners
    socket.off("messageUpdated"); // Prevent duplicate listeners
    socket.off("typing");
    socket.off("stopTyping");

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, messagesByUser } = get();
      const alreadyExists = messages.some(msg => msg._id === newMessage._id);
      if (alreadyExists) return;
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set((state) => ({
          messages: [...state.messages, newMessage],
          messagesByUser: {
            ...state.messagesByUser,
            [selectedUser._id]: [...(state.messagesByUser[selectedUser._id] || []), newMessage],
          },
        }));
      } else {
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [newMessage.senderId]: (state.unreadMessages[newMessage.senderId] || 0) + 1,
          },
        }));
      }
    });

    socket.on("messageUpdated", (updatedMessage) => {
      const { selectedUser, messages, messagesByUser } = get();
      if (selectedUser && updatedMessage.senderId === selectedUser._id) {
        set((state) => ({
          messages: state.messages.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg),
          messagesByUser: {
            ...state.messagesByUser,
            [selectedUser._id]: (state.messagesByUser[selectedUser._id] || []).map(msg => msg._id === updatedMessage._id ? updatedMessage : msg),
          },
        }));
      } else {
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [updatedMessage.senderId]: (state.unreadMessages[updatedMessage.senderId] || 0) + 1,
          },
        }));
      }
    });

    socket.on("typing", ({ senderId }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: true },
      }));
    });

    socket.on("stopTyping", ({ senderId }) => {
      set((state) => {
        const updated = { ...state.typingUsers };
        delete updated[senderId];
        return { typingUsers: updated };
      });
    });
  },
}));
