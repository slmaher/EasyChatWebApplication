import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {
  decryptMessageForCurrentDevice,
  encryptGroupMessage,
  encryptPayloadForUser,
} from "../lib/e2ee";
import { attachTranslation } from "../lib/translation";

const withDisplayFields = (message) => ({
  ...message,
  text: message?.decrypted?.text || "",
  image: message?.decrypted?.image || null,
});

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  selectedGroup: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadMessages: {},
  unreadGroupMessages: {},
  typingUsers: {},
  messagesByUser: {},
  groupMessagesById: {},
  groups: [],
  groupAuditEventsById: {},

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

  getMessages: async (userId, { forceRefresh = false } = {}) => {
    const { messagesByUser } = get();
    if (messagesByUser[userId] && !forceRefresh) {
      set({ messages: messagesByUser[userId], isMessagesLoading: false });
      return;
    }
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(
        `/messages/${userId}?limit=15&skip=0`,
      );
      const { authUser } = useAuthStore.getState();
      const decryptedMessages = await Promise.all(
        res.data.map(async (message) =>
          attachTranslation(
            withDisplayFields(
              await decryptMessageForCurrentDevice(message, authUser._id),
            ),
            authUser?.preferredLanguage || "en",
          ),
        ),
      );
      set((state) => ({
        messages: decryptedMessages,
        messagesByUser: {
          ...state.messagesByUser,
          [userId]: decryptedMessages,
        },
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
      const res = await axiosInstance.get(
        `/messages/${userId}?limit=15&skip=${currentMessages.length}`,
      );
      const { authUser } = useAuthStore.getState();
      const decryptedMessages = await Promise.all(
        res.data.map(async (message) =>
          attachTranslation(
            withDisplayFields(
              await decryptMessageForCurrentDevice(message, authUser._id),
            ),
            authUser?.preferredLanguage || "en",
          ),
        ),
      );
      if (decryptedMessages.length > 0) {
        set((state) => ({
          messages: [...decryptedMessages, ...state.messages],
          messagesByUser: {
            ...state.messagesByUser,
            [userId]: [
              ...decryptedMessages,
              ...(state.messagesByUser[userId] || []),
            ],
          },
        }));
      }
      return decryptedMessages.length;
    } catch (error) {
      toast.error(error.response.data.message);
      return 0;
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, messagesByUser } = get();
    try {
      const { authUser } = useAuthStore.getState();
      const encryption = await encryptPayloadForUser(
        selectedUser._id,
        {
          text: messageData?.text || "",
          image: messageData?.image || null,
        },
        authUser._id,
      );

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        { encryption },
      );

      const decryptedMessage = withDisplayFields(
        await decryptMessageForCurrentDevice(res.data, authUser._id),
      );
      const translatedMessage = await attachTranslation(
        decryptedMessage,
        authUser?.preferredLanguage || "en",
      );

      set((state) => {
        const alreadyExists = state.messages.some(
          (msg) => msg._id === translatedMessage._id,
        );
        if (alreadyExists) return state;
        return {
          messages: [...state.messages, translatedMessage],
          messagesByUser: {
            ...state.messagesByUser,
            [selectedUser._id]: [
              ...(state.messagesByUser[selectedUser._id] || []),
              translatedMessage,
            ],
          },
        };
      });
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error(`Cannot send message: ${selectedUser.fullName} is blocked`);
      } else if (
        error.response?.status === 404 &&
        error.config?.url?.includes("/e2ee/prekey-bundle/")
      ) {
        toast.error(
          `${selectedUser.fullName} has not set up encrypted chat yet. Ask them to log in once, then try again.`,
        );
      } else {
        toast.error(error.response?.data?.message || "Failed to send message");
      }
    }
  },

  createGroup: async ({ name, description = "", memberIds = [] }) => {
    try {
      const res = await axiosInstance.post("/groups", {
        name,
        description,
        memberIds,
      });

      set((state) => ({ groups: [res.data, ...(state.groups || [])] }));
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      throw error;
    }
  },

  getGroups: async () => {
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data || [] });
      return res.data || [];
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
      throw error;
    }
  },

  addGroupMembers: async (groupId, memberIds = []) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, {
        memberIds,
      });

      const updatedGroup = res.data?.group;
      if (updatedGroup?._id) {
        set((state) => ({
          groups: (state.groups || []).map((group) =>
            group._id === updatedGroup._id ? updatedGroup : group,
          ),
        }));
      }

      return res.data;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to add group members",
      );
      throw error;
    }
  },

  removeGroupMember: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(
        `/groups/${groupId}/members/${memberId}`,
      );
      const updatedGroup = res.data?.group;
      if (updatedGroup?._id) {
        set((state) => ({
          groups: (state.groups || []).map((group) =>
            group._id === updatedGroup._id ? updatedGroup : group,
          ),
          selectedGroup:
            state.selectedGroup?._id === updatedGroup._id
              ? updatedGroup
              : state.selectedGroup,
        }));
      }
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      throw error;
    }
  },

  updateGroupMemberRole: async (groupId, memberId, role) => {
    try {
      const res = await axiosInstance.patch(
        `/groups/${groupId}/members/${memberId}/role`,
        { role },
      );
      const updatedGroup = res.data?.group;
      if (updatedGroup?._id) {
        set((state) => ({
          groups: (state.groups || []).map((group) =>
            group._id === updatedGroup._id ? updatedGroup : group,
          ),
          selectedGroup:
            state.selectedGroup?._id === updatedGroup._id
              ? updatedGroup
              : state.selectedGroup,
        }));
      }
      return res.data;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update member role",
      );
      throw error;
    }
  },

  getGroupAuditEvents: async (groupId, limit = 50) => {
    try {
      const res = await axiosInstance.get(
        `/groups/${groupId}/audit-events?limit=${limit}`,
      );
      set((state) => ({
        groupAuditEventsById: {
          ...state.groupAuditEventsById,
          [groupId]: res.data || [],
        },
      }));
      return res.data || [];
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch group audit events",
      );
      throw error;
    }
  },

  getGroupMessages: async (groupId, { limit = 30, skip = 0, forceRefresh = false } = {}) => {
    try {
      if (!skip && !forceRefresh) {
        const cachedMessages = get().groupMessagesById[groupId];
        if (cachedMessages) {
          return cachedMessages;
        }
      }

      const res = await axiosInstance.get(
        `/groups/${groupId}/messages?limit=${limit}&skip=${skip}`,
      );
      const { authUser } = useAuthStore.getState();
      const decryptedMessages = await Promise.all(
        (res.data || []).map(async (message) =>
          attachTranslation(
            withDisplayFields(
              await decryptMessageForCurrentDevice(message, authUser._id),
            ),
            authUser?.preferredLanguage || "en",
          ),
        ),
      );

      set((state) => ({
        groupMessagesById: {
          ...state.groupMessagesById,
          [groupId]: skip
            ? [
                ...decryptedMessages,
                ...(state.groupMessagesById[groupId] || []),
              ]
            : decryptedMessages,
        },
      }));

      return decryptedMessages;
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to fetch encrypted group messages",
      );
      throw error;
    }
  },

  sendGroupMessage: async (groupId, messageData) => {
    const { authUser } = useAuthStore.getState();

    try {
      const encryption = await encryptGroupMessage(
        groupId,
        {
          text: messageData?.text || "",
          image: messageData?.image || null,
        },
        authUser._id,
      );

      const res = await axiosInstance.post(`/groups/${groupId}/messages`, {
        encryption,
      });

      const decryptedMessage = withDisplayFields(
        await decryptMessageForCurrentDevice(res.data, authUser._id),
      );
      const translatedMessage = await attachTranslation(
        decryptedMessage,
        authUser?.preferredLanguage || "en",
      );

      set((state) => {
        const existing = state.groupMessagesById[groupId] || [];
        const alreadyExists = existing.some(
          (msg) => msg._id === translatedMessage._id,
        );
        if (alreadyExists) return state;

        return {
          groupMessagesById: {
            ...state.groupMessagesById,
            [groupId]: [...existing, translatedMessage],
          },
        };
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to send encrypted group message",
      );
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { authUser } = useAuthStore.getState();
      const { selectedUser, messages, messagesByUser } = get();
      const alreadyExists = messages.some((msg) => msg._id === newMessage._id);
      if (alreadyExists) return;
      decryptMessageForCurrentDevice(newMessage, authUser._id).then(
        (decrypted) => {
          const displayMessage = withDisplayFields(decrypted);
          attachTranslation(displayMessage, authUser?.preferredLanguage || "en").then((translatedMessage) => {
            if (selectedUser && newMessage.senderId === selectedUser._id) {
              set((state) => ({
                messages: [...state.messages, translatedMessage],
                messagesByUser: {
                  ...state.messagesByUser,
                  [selectedUser._id]: [
                    ...(state.messagesByUser[selectedUser._id] || []),
                    translatedMessage,
                  ],
                },
              }));
            } else {
              set((state) => ({
                unreadMessages: {
                  ...state.unreadMessages,
                  [newMessage.senderId]:
                    (state.unreadMessages[newMessage.senderId] || 0) + 1,
                },
              }));
            }
          });
        },
      );
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
        selectedGroup: null,
        unreadMessages: {
          ...state.unreadMessages,
          [selectedUser._id]: 0,
        },
      };
    });
  },

  setSelectedGroup: (selectedGroup) => {
    set((state) => {
      if (!selectedGroup) {
        return { selectedGroup: null };
      }

      return {
        selectedGroup,
        selectedUser: null,
        unreadGroupMessages: {
          ...state.unreadGroupMessages,
          [selectedGroup._id]: 0,
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
    socket.off("newGroupMessage");
    socket.off("messageUpdated"); // Prevent duplicate listeners
    socket.off("typing");
    socket.off("stopTyping");

    socket.on("newMessage", (newMessage) => {
      const { authUser } = useAuthStore.getState();
      const { selectedUser, messages, messagesByUser } = get();
      const alreadyExists = messages.some((msg) => msg._id === newMessage._id);
      if (alreadyExists) return;
      decryptMessageForCurrentDevice(newMessage, authUser._id).then(
        (decrypted) => {
          const displayMessage = withDisplayFields(decrypted);
          attachTranslation(displayMessage, authUser?.preferredLanguage || "en").then(
            (translatedMessage) => {
              if (selectedUser && newMessage.senderId === selectedUser._id) {
                set((state) => ({
                  messages: [...state.messages, translatedMessage],
                  messagesByUser: {
                    ...state.messagesByUser,
                    [selectedUser._id]: [
                      ...(state.messagesByUser[selectedUser._id] || []),
                      translatedMessage,
                    ],
                  },
                }));
              } else {
                set((state) => ({
                  unreadMessages: {
                    ...state.unreadMessages,
                    [newMessage.senderId]:
                      (state.unreadMessages[newMessage.senderId] || 0) + 1,
                  },
                }));
              }
            },
          );
        },
      );
    });

    socket.on("messageUpdated", (updatedMessage) => {
      const { selectedUser, messages, messagesByUser } = get();
      if (selectedUser && updatedMessage.senderId === selectedUser._id) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg,
          ),
          messagesByUser: {
            ...state.messagesByUser,
            [selectedUser._id]: (
              state.messagesByUser[selectedUser._id] || []
            ).map((msg) =>
              msg._id === updatedMessage._id ? updatedMessage : msg,
            ),
          },
        }));
      } else {
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [updatedMessage.senderId]:
              (state.unreadMessages[updatedMessage.senderId] || 0) + 1,
          },
        }));
      }
    });

    socket.on("newGroupMessage", (newGroupMessage) => {
      const { authUser } = useAuthStore.getState();
      decryptMessageForCurrentDevice(newGroupMessage, authUser._id).then(
        (decrypted) => {
          const displayMessage = withDisplayFields(decrypted);
          const groupId = newGroupMessage.groupId;
          if (!groupId) return;

          attachTranslation(displayMessage, authUser?.preferredLanguage || "en").then(
            (translatedMessage) => {
              set((state) => {
                const existing = state.groupMessagesById[groupId] || [];
                const alreadyExists = existing.some(
                  (msg) => msg._id === translatedMessage._id,
                );
                if (alreadyExists) return state;

                const isSelectedGroupOpen =
                  state.selectedGroup?._id &&
                  String(state.selectedGroup._id) === String(groupId);
                const isOwnMessage =
                  String(newGroupMessage.senderId) === String(authUser._id);

                return {
                  groupMessagesById: {
                    ...state.groupMessagesById,
                    [groupId]: [...existing, translatedMessage],
                  },
                  unreadGroupMessages: {
                    ...state.unreadGroupMessages,
                    [groupId]:
                      isSelectedGroupOpen || isOwnMessage
                        ? state.unreadGroupMessages[groupId] || 0
                        : (state.unreadGroupMessages[groupId] || 0) + 1,
                  },
                };
              });
            },
          );
        },
      );
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
