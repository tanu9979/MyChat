"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export function CreateGroup({
  currentUserId,
  onCreateGroup,
}: {
  currentUserId: Id<"users">;
  onCreateGroup: (participantIds: Id<"users">[], groupName: string) => void;
}) {
  const { user } = useUser();
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allUsers = useQuery(
    api.queries.getAllUsers,
    user?.id ? { excludeClerkId: user.id } : "skip"
  );

  const filteredUsers = allUsers?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: Id<"users">) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (groupName.trim()) {
      onCreateGroup([currentUserId, ...selectedUsers], groupName.trim());
      setSelectedUsers([]);
      setGroupName("");
      setSearchQuery("");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        />
      </div>

      {selectedUsers.length > 0 && (
        <div className="p-4 border-b border-gray-700 bg-gray-750">
          <p className="text-sm text-gray-300 mb-2">
            Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((userId) => {
              const user = allUsers?.find((u) => u._id === userId);
              return user ? (
                <span
                  key={userId}
                  className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm flex items-center gap-2"
                >
                  {user.name}
                  <button
                    onClick={() => toggleUser(userId)}
                    className="hover:bg-blue-700 rounded-full"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!filteredUsers ? (
          <div className="p-4 text-center text-gray-400">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-400">No users found</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => toggleUser(user._id)}
                className="w-full p-4 hover:bg-gray-700 flex items-center gap-3 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user._id)}
                  onChange={() => {}}
                  className="w-5 h-5"
                />
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {user.name[0]}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">{user.name}</div>
                  <div className="text-sm text-gray-400">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name"
          className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 mb-3"
        />
        <button
          onClick={handleCreate}
          disabled={!groupName.trim()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
        >
          Create Group ({selectedUsers.length + 1} member{selectedUsers.length + 1 !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
