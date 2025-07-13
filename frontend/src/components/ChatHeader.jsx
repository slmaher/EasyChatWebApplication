import React from "react";
import { X, Ban } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useBlockStore } from "../store/useBlockStore";
import toast from "react-hot-toast";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { blockUser, unblockUser, isUserBlocked, isBlocking } = useBlockStore();

  const handleBlockUser = async () => {
    if (!selectedUser) return;

    try {
      if (isUserBlocked(selectedUser._id)) {
        await unblockUser(selectedUser._id);
      } else {
        await blockUser(selectedUser._id);
        setSelectedUser(null); // Close the chat when blocking
      }
    } catch (error) {
      console.error("Error handling block:", error);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-base-300">
      <div className="flex items-center gap-3">
        <img
          src={selectedUser?.profilePic || "/NoAvatar.png"}
          alt={selectedUser?.fullName}
          className="size-10 object-cover rounded-full"
        />
        <div>
          <h2 className="font-medium">{selectedUser?.fullName}</h2>
          <p className="text-sm text-zinc-400">
            {onlineUsers.includes(selectedUser?._id) ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleBlockUser}
          disabled={isBlocking}
          className={`btn btn-sm ${
            isUserBlocked(selectedUser?._id) 
              ? "btn-error text-white" 
              : "btn-ghost"
          }`}
          title={isUserBlocked(selectedUser?._id) ? "Unblock user" : "Block user"}
        >
          {isUserBlocked(selectedUser?._id) ? "Unblock" : "Block"}
        </button>
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-sm"
          aria-label="Close chat"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
