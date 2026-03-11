"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

/**
 * Smart timestamp formatter for conversation list
 * - Today: Shows time only (e.g., "2:30 PM")
 * - This week: Shows day name (e.g., "Mon")
 * - This year: Shows month and day (e.g., "Jan 15")
 * - Older: Shows full date (e.g., "Jan 15, 2023")
 */
function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } else if (days < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
}

/**
 * ConversationList component - Displays all user conversations
 * Features: Real-time updates, search filter, unread badges, online status
 */
export function ConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}: {
  currentUserId: Id<"users">;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}) {
  // Real-time query - automatically updates when conversations change
  const conversations = useQuery(api.queries.getUserConversations, { userId: currentUserId });
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col transition-colors">
      <div className="p-4 border-b border-gray-border">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-card text-foreground border border-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple placeholder-muted-foreground transition-shadow"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
      {!conversations ? (
        <div className="p-4 text-center text-gray-400">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No conversations yet</p>
          <p className="text-sm mt-2">Click &quot;New Chat&quot; to start messaging</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-border">
          {conversations
            .filter((conv) => {
              const displayName = conv.isGroup
                ? conv.groupName || "Group Chat"
                : conv.otherUser?.name || "Unknown User";
              return displayName.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .map((conv) => {
            const isSelected = conv._id === selectedConversationId;
            const displayName = conv.isGroup
              ? conv.groupName || "Group Chat"
              : conv.otherUser?.name || "Unknown User";
            const displayImage = conv.isGroup ? null : conv.otherUser?.imageUrl;
            const isOnline = conv.isGroup ? false : conv.otherUser?.isOnline;

            return (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv._id)}
                className={`w-full p-4 hover:bg-gray-card/50 flex items-center gap-3 transition ${
                  isSelected ? "bg-gray-card border-l-4 border-brand-purple shadow-inner" : "border-l-4 border-transparent"
                }`}
              >
                <div className="relative flex-shrink-0">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={displayName}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate flex-1 text-foreground transition-colors">{displayName}</div>
                      {conv.lastMessage && (
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {formatTimestamp(conv.lastMessage.timestamp)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage
                          ? conv.lastMessage.isDeleted
                            ? "This message was deleted"
                            : conv.lastMessage.content
                          : "No messages yet"}
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="ml-2 bg-brand-blue text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-blue/20">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
              </button>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
