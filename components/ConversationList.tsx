"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";

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

export function ConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}: {
  currentUserId: Id<"users">;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}) {
  const conversations = useQuery(api.queries.getUserConversations, { userId: currentUserId });
  const hideConversation = useMutation(api.mutations.hideConversation);
  const [menuOpen, setMenuOpen] = useState<Id<"conversations"> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-800">
      {!conversations ? (
        <div className="p-4 text-center text-gray-400">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No conversations yet</p>
          <p className="text-sm mt-2">Click "New Chat" to start messaging</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700">
          {conversations.map((conv) => {
            const isSelected = conv._id === selectedConversationId;
            const displayName = conv.isGroup
              ? conv.groupName || "Group Chat"
              : conv.otherUser?.name || "Unknown User";
            const displayImage = conv.isGroup ? null : conv.otherUser?.imageUrl;
            const isOnline = conv.isGroup ? false : conv.otherUser?.isOnline;

            return (
              <div key={conv._id} className="relative" ref={menuOpen === conv._id ? menuRef : null}>
                <button
                  onClick={() => onSelectConversation(conv._id)}
                  className={`w-full p-4 hover:bg-gray-700 flex items-center gap-3 transition ${
                    isSelected ? "bg-gray-700" : ""
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
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left pr-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate flex-1 text-white">{displayName}</div>
                      {conv.lastMessage && (
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {formatTimestamp(conv.lastMessage.timestamp)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400 truncate">
                        {conv.lastMessage
                          ? conv.lastMessage.isDeleted
                            ? "This message was deleted"
                            : conv.lastMessage.content
                          : "No messages yet"}
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === conv._id ? null : conv._id);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded-full text-gray-400 hover:text-gray-200 transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="2" r="1.5"/>
                    <circle cx="8" cy="8" r="1.5"/>
                    <circle cx="8" cy="14" r="1.5"/>
                  </svg>
                </button>
                {menuOpen === conv._id && (
                  <div className="absolute right-4 top-16 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-20 min-w-[150px]">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await hideConversation({ conversationId: conv._id, userId: currentUserId });
                        setMenuOpen(null);
                        if (selectedConversationId === conv._id) {
                          onSelectConversation(null as any);
                        }
                      }}
                      className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium"
                    >
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
