import React, { useMemo, useState } from "react";
import { ShieldPlus, Users, X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { users, createGroup } = useChatStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users],
  );

  const toggleMember = (userId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedMemberIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createGroup({
        name: name.trim(),
        description: description.trim(),
        memberIds: selectedMemberIds,
      });
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldPlus className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Create Secure Group</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="form-control w-full">
            <span className="mb-1 text-xs font-mono uppercase tracking-[0.16em] text-base-content/70">
              Group name
            </span>
            <input
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Security Team"
              required
            />
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-xs font-mono uppercase tracking-[0.16em] text-base-content/70">
              Description
            </span>
            <textarea
              className="textarea textarea-bordered w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context"
              rows={3}
            />
          </label>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-base-content/70">
              <Users className="size-4" />
              Members ({selectedMemberIds.length} selected)
            </div>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-base-300 p-2">
              {sortedUsers.map((user) => (
                <label
                  key={user._id}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-base-200"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={user.profilePic || "/NoAvatar.png"}
                      alt={user.fullName}
                      className="size-8 rounded-full object-cover"
                    />
                    <span className="text-sm">{user.fullName}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedMemberIds.includes(user._id)}
                    onChange={() => toggleMember(user._id)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
