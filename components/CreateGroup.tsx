"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * CreateGroup component - Multi-select interface for creating group chats
 * Features: User search, checkbox selection, group name input at bottom
 */
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

  // Get all users except current user
  const allUsers = useQuery(
    api.queries.getAllUsers,
    user?.id ? { excludeClerkId: user.id } : "skip"
  );

  // Filter users based on search query
  const filteredUsers = allUsers?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle user selection (add/remove from group)
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
    <div className="flex-1 flex flex-col bg-background transition-colors">
      <div className="p-4 border-b border-gray-border">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full px-4 py-2 bg-gray-card text-foreground border border-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple placeholder-muted-foreground"
        />
      </div>

      {selectedUsers.length > 0 && (
        <div className="p-4 border-b border-gray-border bg-gray-card/50">
          <p className="text-sm text-muted-foreground mb-2">
            Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((userId) => {
              const user = allUsers?.find((u) => u._id === userId);
              return user ? (
                <span
                  key={userId}
                  className="px-3 py-1 bg-brand-blue text-white rounded-full text-sm flex items-center gap-2 shadow-sm shadow-brand-blue/20"
                >
                  {user.name}
                  <button
                    onClick={() => toggleUser(userId)}
                    className="hover:bg-blue-600 rounded-full"
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
          <div className="p-4 text-center text-muted-foreground">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No users found</div>
        ) : (
          <div className="divide-y divide-gray-border">
            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => toggleUser(user._id)}
                className="w-full p-4 hover:bg-gray-card/50 flex items-center gap-3 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user._id)}
                  onChange={() => {}}
                  className="w-5 h-5 accent-brand-purple"
                />
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-semibold">
                    {user.name[0]}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-foreground">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-border bg-gray-card/50">
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name"
          className="w-full px-4 py-2 bg-gray-card text-foreground border border-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple placeholder-muted-foreground mb-3"
        />
        <button
          onClick={handleCreate}
          disabled={!groupName.trim()}
          className="w-full py-3 bg-brand-blue text-white rounded-lg hover:bg-blue-500 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-semibold shadow-lg shadow-brand-blue/20 transition-all font-semibold"
        >
          Create Group ({selectedUsers.length + 1} member{selectedUsers.length + 1 !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
