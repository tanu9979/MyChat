"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { UserButton } from "@clerk/nextjs";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export function ChatWindow({
  conversationId,
  currentUserId,
  onBack,
}: {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
  onBack?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<Id<"messages"> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const messages = useQuery(api.queries.getMessages, { conversationId });
  const typingUsers = useQuery(api.queries.getTypingUsers, {
    conversationId,
    excludeUserId: currentUserId,
  });

  const sendMessage = useMutation(api.mutations.sendMessage);
  const setTyping = useMutation(api.mutations.setTyping);
  const markConversationAsRead = useMutation(api.mutations.markConversationAsRead);
  const deleteMessage = useMutation(api.mutations.deleteMessage);
  const toggleReaction = useMutation(api.mutations.toggleReaction);

  useEffect(() => {
    if (messages && messages.length > 0) {
      markConversationAsRead({ conversationId, userId: currentUserId });
    }
  }, [conversationId, currentUserId, messages, markConversationAsRead]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await sendMessage({
      conversationId,
      senderId: currentUserId,
      content: message.trim(),
    });
    setMessage("");
    setTyping({ conversationId, userId: currentUserId, isTyping: false });
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = (value: string) => {
    setMessage(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      setTyping({ conversationId, userId: currentUserId, isTyping: true });
      typingTimeoutRef.current = setTimeout(() => {
        setTyping({ conversationId, userId: currentUserId, isTyping: false });
      }, 2000);
    } else {
      setTyping({ conversationId, userId: currentUserId, isTyping: false });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold">Chat</h2>
        </div>
        <UserButton />
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messages ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            const reactionEntries = Object.entries(msg.reactions || {});

            return (
              <div
                key={msg._id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    {!isOwn && msg.sender && (
                      <span className="text-xs text-gray-600 font-medium">{msg.sender.name}</span>
                    )}
                  </div>
                  <div className="relative group">
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwn
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      } ${msg.isDeleted ? "italic" : ""}`}
                    >
                      {msg.isDeleted ? "This message was deleted" : msg.content}
                    </div>
                    
                    {hoveredMessageId === msg._id && !msg.isDeleted && (
                      <div className="absolute -top-8 right-0 bg-white border rounded-lg shadow-lg p-1 flex gap-1">
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction({ messageId: msg._id, userId: currentUserId, emoji })}
                            className="hover:bg-gray-100 p-1 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                        {isOwn && (
                          <button
                            onClick={() => deleteMessage({ messageId: msg._id, userId: currentUserId })}
                            className="hover:bg-red-100 p-1 rounded text-red-600"
                            title="Delete message"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {reactionEntries.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {reactionEntries.map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction({ messageId: msg._id, userId: currentUserId, emoji })}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            userIds.includes(currentUserId)
                              ? "bg-blue-100 border-blue-300"
                              : "bg-gray-100 border-gray-300"
                          }`}
                        >
                          {emoji} {userIds.length}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers && typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500">
          {typingUsers.map((u) => u?.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {showScrollButton && (
        <div className="px-4 pb-2">
          <button
            onClick={scrollToBottom}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            ↓ New messages
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
