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
  conversation,
  onBack,
}: {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
  conversation?: any;
  onBack?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<Id<"messages"> | null>(null);
  const [menuOpen, setMenuOpen] = useState<Id<"messages"> | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const messages = useQuery(api.queries.getMessages, { conversationId, userId: currentUserId });
  const typingUsers = useQuery(api.queries.getTypingUsers, {
    conversationId,
    excludeUserId: currentUserId,
  });

  const sendMessage = useMutation(api.mutations.sendMessage);
  const setTyping = useMutation(api.mutations.setTyping);
  const markConversationAsRead = useMutation(api.mutations.markConversationAsRead);
  const deleteMessage = useMutation(api.mutations.deleteMessage);
  const hideMessage = useMutation(api.mutations.hideMessage);
  const editMessage = useMutation(api.mutations.editMessage);
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
      <div className="p-4 border-b flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {conversation?.otherUser && (
          <>
            {conversation.otherUser.imageUrl ? (
              <img
                src={conversation.otherUser.imageUrl}
                alt={conversation.otherUser.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {conversation.otherUser.name[0]}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{conversation.otherUser.name}</h2>
              <p className="text-xs text-gray-500">
                {conversation.otherUser.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </>
        )}
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
            const reactions = msg.reactions || [];

            return (
              <div
                key={msg._id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwn ? "items-end" : "items-start"} flex flex-col relative`}>
                  <div className="flex items-center gap-2 mb-1">
                    {!isOwn && msg.sender && (
                      <span className="text-xs text-gray-600 font-medium">{msg.sender.name}</span>
                    )}
                  </div>
                  <div className="relative group">
                    {editingMessageId === msg._id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            await editMessage({ messageId: msg._id, userId: currentUserId, content: editContent });
                            setEditingMessageId(null);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              isOwn
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-900"
                            } ${msg.isDeleted ? "italic" : ""}`}
                          >
                            {msg.isDeleted ? "This message was deleted" : msg.content}
                            {msg.isEdited && !msg.isDeleted && (
                              <span className="text-xs opacity-70 ml-2">(edited)</span>
                            )}
                          </div>
                          
                          {!msg.isDeleted && hoveredMessageId === msg._id && (
                            <button
                              onClick={() => setMenuOpen(menuOpen === msg._id ? null : msg._id)}
                              className={`absolute -top-2 w-6 h-6 flex items-center justify-center hover:bg-gray-300 rounded-full shadow-lg ${
                                isOwn ? "-right-2 text-white bg-blue-700" : "-left-2 text-gray-700 bg-gray-200"
                              }`}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                <circle cx="8" cy="2" r="1.5"/>
                                <circle cx="8" cy="8" r="1.5"/>
                                <circle cx="8" cy="14" r="1.5"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        {menuOpen === msg._id && isOwn && (
                          <div className="absolute right-0 top-12 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-20 min-w-[140px]">
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b flex items-center gap-2 text-gray-700"
                            >
                              <span className="text-lg">😊</span>
                              React
                            </button>
                            {menuOpen === msg._id && (
                              <div className="px-2 py-2 flex gap-1 border-b">
                                {REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      toggleReaction({ messageId: msg._id, userId: currentUserId, emoji });
                                      setMenuOpen(null);
                                    }}
                                    className="hover:bg-gray-100 p-1 rounded text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setEditContent(msg.content);
                                setEditingMessageId(msg._id);
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                await deleteMessage({ messageId: msg._id, userId: currentUserId });
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                        
                        {menuOpen === msg._id && !isOwn && (
                          <div className="absolute left-0 top-12 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-20 min-w-[140px]">
                            <button
                              onClick={async () => {
                                await hideMessage({ messageId: msg._id, userId: currentUserId });
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete for me
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>



                  {reactions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {reactions.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          onClick={() => toggleReaction({ messageId: msg._id, userId: currentUserId, emoji: reaction.emoji })}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            reaction.userIds.includes(currentUserId as string)
                              ? "bg-blue-100 border-blue-300"
                              : "bg-gray-100 border-gray-300"
                          }`}
                        >
                          {reaction.emoji} {reaction.userIds.length}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const msgDate = new Date(msg.timestamp);
                      const today = new Date();
                      const isToday = msgDate.toDateString() === today.toDateString();
                      const isSameYear = msgDate.getFullYear() === today.getFullYear();
                      
                      console.log('Message:', msg.content.substring(0, 20), 'Year:', msgDate.getFullYear(), 'Today Year:', today.getFullYear(), 'Same Year:', isSameYear);

                      if (isToday) {
                        return msgDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                      } else if (isSameYear) {
                        const time = msgDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        const date = msgDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                        return `${date}, ${time}`;
                      } else {
                        const time = msgDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        const date = msgDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        return `${date} ${time}`;
                      }
                    })()}
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
