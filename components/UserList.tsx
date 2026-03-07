"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

/**
 * UserList component - Displays all users for starting new conversations
 * Features: Real-time user search, online status indicators
 */
export function UserList({
  currentUserId,
  onSelectUser,
}: {
  currentUserId: Id<"users">;
  onSelectUser: (userId: Id<"users">) => void;
}) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time query - automatically updates when users change
  const users = useQuery(
    api.queries.searchUsers,
    user?.id ? { query: searchQuery, excludeClerkId: user.id } : "skip"
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {!users ? (
          <div className="p-4 text-center text-gray-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchQuery ? "No users found" : "No other users yet"}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {users.map((user) => (
              <button
                key={user._id}
                onClick={() => onSelectUser(user._id)}
                className="w-full p-4 hover:bg-gray-700 flex items-center gap-3 transition"
              >
                <div className="relative">
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">{user.name}</div>
                  <div className="text-sm text-gray-400">
                    {user.isOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
