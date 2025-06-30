import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, formatDate } from "../lib/utils";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
    loadMoreMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messageListRef = useRef(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Infinite scroll: load more messages when scrolled to top
  useEffect(() => {
    const handleScroll = async () => {
      if (!messageListRef.current || isLoadingMore || isMessagesLoading) return;
      if (messageListRef.current.scrollTop === 0) {
        setIsLoadingMore(true);
        const loaded = await loadMoreMessages(selectedUser._id);
        setIsLoadingMore(false);
        // Maintain scroll position after loading more
        if (loaded > 0 && messageListRef.current) {
          messageListRef.current.scrollTop = 1;
        }
      }
    };
    const ref = messageListRef.current;
    if (ref) ref.addEventListener("scroll", handleScroll);
    return () => { if (ref) ref.removeEventListener("scroll", handleScroll); };
  }, [selectedUser, isLoadingMore, isMessagesLoading, loadMoreMessages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messageListRef}>
        {isLoadingMore && (
          <div className="w-full text-center text-xs text-zinc-400 mb-2">Loading more...</div>
        )}
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${
              message.senderId === authUser._id ? "chat-end" : "chat-start"
            }`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/NoAvatar.png"
                      : selectedUser.profilePic || "/NoAvatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatDate(message.createdAt, { format: 'short' })} {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
              {message.translatedText && message.translatedTo === authUser?.preferredLanguage && (
                <div style={{ color: '#888', fontStyle: 'italic', fontSize: '0.95em', marginTop: 4 }}>
                  {message.translatedText}
                  <div style={{ fontSize: '0.8em', color: '#aaa' }}>
                    {authUser?.preferredLanguage === 'ar' ? 'مترجم بواسطة الذكاء الاصطناعي' : 
                     authUser?.preferredLanguage === 'fr' ? 'Traduit par IA' :
                     authUser?.preferredLanguage === 'es' ? 'Traducido por IA' :
                     'Translated by AI'}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Typing indicator */}
      {selectedUser && typingUsers[selectedUser._id] && (
        <div className="px-4 pb-2 mt-3 text-base text-zinc-500 animate-pulse" style={{ fontWeight: 500 }}>
          {selectedUser.fullName} is typing...
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
