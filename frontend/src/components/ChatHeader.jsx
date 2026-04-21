import React from "react";
import { Settings, ShieldCheck, ShieldOff, Users, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useBlockStore } from "../store/useBlockStore";
import ManageGroupMembersModal from "./ManageGroupMembersModal";

const ChatHeader = () => {
  const { selectedUser, selectedGroup, setSelectedUser, setSelectedGroup } =
    useChatStore();
  const { onlineUsers } = useAuthStore();
  const { blockUser, unblockUser, isUserBlocked, isBlocking } = useBlockStore();
  const [isManageMembersOpen, setIsManageMembersOpen] = React.useState(false);

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

  if (selectedGroup) {
    const activeMemberCount = (selectedGroup.members || []).filter(
      (member) => !member.leftAt,
    ).length;

    return (
      <>
        <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-100/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-medium">{selectedGroup.name}</h2>
              <p className="text-sm text-zinc-400 font-mono uppercase tracking-[0.12em] text-[11px]">
                {activeMemberCount} members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsManageMembersOpen(true)}
              className="btn btn-sm btn-outline"
              title="Manage group members"
            >
              <Settings className="size-4" />
              Manage
            </button>
            <button
              onClick={() => setSelectedGroup(null)}
              className="btn btn-ghost btn-sm"
              aria-label="Close group chat"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <ManageGroupMembersModal
          isOpen={isManageMembersOpen}
          onClose={() => setIsManageMembersOpen(false)}
          group={selectedGroup}
        />
      </>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-100/40 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <img
          src={selectedUser?.profilePic || "/NoAvatar.png"}
          alt={selectedUser?.fullName}
          className="size-10 object-cover rounded-full"
        />
        <div>
          <h2 className="font-medium">{selectedUser?.fullName}</h2>
          <p className="text-sm text-zinc-400 font-mono uppercase tracking-[0.12em] text-[11px]">
            {onlineUsers.includes(selectedUser?._id) ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleBlockUser}
          disabled={isBlocking}
          className={`btn btn-sm btn-outline ${
            isUserBlocked(selectedUser?._id)
              ? "btn-error text-white"
              : "btn-ghost"
          }`}
          title={
            isUserBlocked(selectedUser?._id) ? "Unblock user" : "Block user"
          }
        >
          {isUserBlocked(selectedUser?._id) ? (
            <ShieldCheck className="size-4" />
          ) : (
            <ShieldOff className="size-4" />
          )}
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
