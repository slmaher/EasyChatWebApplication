import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { PlusCircle, ShieldCheck, Users } from "lucide-react";
import React from "react";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const {
    getUsers,
    users,
    groups,
    getGroups,
    selectedUser,
    selectedGroup,
    setSelectedUser,
    setSelectedGroup,
    isUsersLoading,
    unreadMessages,
    unreadGroupMessages,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([getUsers(), getGroups()]);
      } catch (error) {
        console.error("Error fetching sidebar data:", error);
      }
    };
    fetchData();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Sort users by latest message time (descending)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt
      ? new Date(a.lastMessage.createdAt).getTime()
      : 0;
    const bTime = b.lastMessage?.createdAt
      ? new Date(b.lastMessage.createdAt).getTime()
      : 0;
    return bTime - aTime;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside className="h-full w-20 lg:w-80 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100/70 backdrop-blur-xl">
        <div className="border-b border-base-300 w-full p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            <span className="font-medium hidden lg:block">Secure contacts</span>
            <button
              className="btn btn-xs btn-outline ml-auto hidden lg:flex"
              onClick={() => setIsCreateGroupOpen(true)}
              title="Create group"
            >
              <PlusCircle className="size-3" />
              Group
            </button>
          </div>
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500 font-mono">
              ({Math.max(onlineUsers.length - 1, 0)} online)
            </span>
          </div>
        </div>

        <div className="border-b border-base-300 w-full p-3 hidden lg:block">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] text-base-content/70">
              <Users className="size-4" />
              Groups
            </div>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setIsCreateGroupOpen(true)}
              title="Create secure group"
            >
              <PlusCircle className="size-4" />
            </button>
          </div>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  selectedGroup?._id === group._id
                    ? "bg-primary/10 ring-1 ring-primary/25"
                    : "hover:bg-base-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">{group.name}</span>
                  {unreadGroupMessages[group._id] > 0 && (
                    <span className="badge badge-error badge-sm text-white">
                      {unreadGroupMessages[group._id]}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {!groups.length && (
              <div className="text-xs text-base-content/60">
                No groups yet. Create your first encrypted group.
              </div>
            )}
          </div>
        </div>

        <div className="overflow-y-auto w-full py-3">
          {sortedUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${
                selectedUser?._id === user._id
                  ? "bg-primary/10 ring-1 ring-primary/25"
                  : ""
              }
            `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/NoAvatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {unreadMessages[user._id] > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-xs text-white">
                    {unreadMessages[user._id]}
                  </span>
                )}
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-secondary 
                  rounded-full ring-2 ring-base-100"
                  />
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {user.fullName}
                  {user.isBlocked && (
                    <span className="text-xs text-red-500">(Blocked)</span>
                  )}
                </div>
                <div className="text-sm text-zinc-400 font-mono uppercase tracking-[0.12em] text-[11px]">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))}

          {sortedUsers.length === 0 && (
            <div className="text-center text-zinc-500 py-4 font-mono text-xs uppercase tracking-[0.18em]">
              No online users
            </div>
          )}
        </div>
      </aside>

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />
    </>
  );
};

export default Sidebar;
