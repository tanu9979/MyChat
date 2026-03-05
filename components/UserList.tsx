"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export function UserList({
  currentUserId,
  onSelectUser,
}: {
  currentUserId: Id<"users">;
  onSelectUser: (userId: Id<"users">) => void;
}) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  const users = useQuery(
    api.queries.searchUsers,
    user?.id ? { query: searchQuery, excludeClerkId: user.id } : "skip"
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {!users ? (
          <div className="p-4 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? "No users found" : "No other users yet"}
          </div>
        ) : (
          <div className="divide-y">
            {users.map((user) => (
              <button
                key={user._id}
                onClick={() => onSelectUser(user._id)}
                className="w-full p-4 hover:bg-gray-50 flex items-center gap-3 transition"
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
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-sm text-gray-500">
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
