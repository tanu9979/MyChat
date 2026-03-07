"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";

// Fixed set of reaction emojis available for messages
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

/**
 * ChatWindow component - Main messaging interface
 * Features: Real-time messages, typing indicators, reactions, edit/delete, auto-scroll
 */
export function ChatWindow({
  conversationId,
  currentUserId,
  conversation,
  onBack,
}: {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
  conversation?: {
    isGroup?: boolean;
    groupName?: string;
    participants?: string[];
    otherUser?: {
      name: string;
      imageUrl?: string;
      isOnline: boolean;
      email: string;
    } | null;
    allParticipants?: Array<{
      _id: string;
      name: string;
      email: string;
      imageUrl?: string;
      isOnline: boolean;
    }>;
  };
  onBack?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<Id<"messages"> | null>(null);
  const [menuOpen, setMenuOpen] = useState<Id<"messages"> | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [reactionTooltip, setReactionTooltip] = useState<{messageId: Id<"messages">, emoji: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Real-time queries - automatically update when data changes
  const messages = useQuery(api.queries.getMessages, { conversationId, userId: currentUserId });
  const typingUsers = useQuery(api.queries.getTypingUsers, {
    conversationId,
    excludeUserId: currentUserId,
  });

  // Mutations for database operations
  const sendMessage = useMutation(api.mutations.sendMessage);
  const setTyping = useMutation(api.mutations.setTyping);
  const markConversationAsRead = useMutation(api.mutations.markConversationAsRead);
  const deleteMessage = useMutation(api.mutations.deleteMessage);
  const editMessage = useMutation(api.mutations.editMessage);
  const toggleReaction = useMutation(api.mutations.toggleReaction);

  // Mark conversation as read when messages are loaded
  useEffect(() => {
    if (messages && messages.length > 0) {
      markConversationAsRead({ conversationId, userId: currentUserId });
    }
  }, [conversationId, currentUserId, messages, markConversationAsRead]);

  // Smart scroll button - show when user scrolls up from bottom
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

  // Auto-scroll to bottom when new messages arrive (if already at bottom)
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

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      // Set typing indicator - this updates lastUpdated timestamp
      setTyping({ conversationId, userId: currentUserId, isTyping: true });
      
      // Auto-clear after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        setTyping({ conversationId, userId: currentUserId, isTyping: false });
      }, 2000);
    } else {
      // Clear immediately when input is empty
      setTyping({ conversationId, userId: currentUserId, isTyping: false });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-850 relative">
      <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-gray-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {conversation?.isGroup ? (
          <>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">{conversation.groupName || "Group Chat"}</h2>
              <p className="text-xs text-gray-400">{conversation.participants?.length || 0} members</p>
            </div>
            <button
              onClick={() => setShowGroupMembers(!showGroupMembers)}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </>
        ) : conversation?.otherUser ? (
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
              <h2 className="text-lg font-semibold text-white">{conversation.otherUser.name}</h2>
              <p className="text-xs text-gray-400">
                {conversation.otherUser.isOnline ? "Online" : "Offline"}
              </p>
            </div>
            <button
              onClick={() => setShowUserProfile(!showUserProfile)}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </>
        ) : null}
      </div>

      {/* Group Members Modal */}
      {showGroupMembers && conversation?.isGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowGroupMembers(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Group Members</h3>
              <button onClick={() => setShowGroupMembers(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {conversation.allParticipants?.map((participant: {
                _id: string;
                name: string;
                email: string;
                imageUrl?: string;
                isOnline: boolean;
              }) => (
                <div key={participant._id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  {participant.imageUrl ? (
                    <img src={participant.imageUrl} alt={participant.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {participant.name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-white">{participant.name}</div>
                    <div className="text-sm text-gray-400">{participant.email}</div>
                  </div>
                  {participant.isOnline && (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfile && conversation?.otherUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowUserProfile(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Profile Info</h3>
              <button onClick={() => setShowUserProfile(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center">
              {conversation.otherUser.imageUrl ? (
                <img src={conversation.otherUser.imageUrl} alt={conversation.otherUser.name} className="w-24 h-24 rounded-full mb-4" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-3xl mb-4">
                  {conversation.otherUser.name[0]}
                </div>
              )}
              <div className="w-full space-y-3">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Name</div>
                  <div className="text-white font-semibold">{conversation.otherUser.name}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Email</div>
                  <div className="text-white">{conversation.otherUser.email}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${conversation.otherUser.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <div className="text-white">{conversation.otherUser.isOnline ? 'Online' : 'Offline'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {!messages ? (
          <div className="text-center text-gray-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
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
                      <span className="text-xs text-gray-400 font-medium">{msg.sender.name}</span>
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
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-blue-600 text-white"
                                : "bg-gray-800 text-gray-100"
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
                            <div className="px-2 py-2 flex gap-1">
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
                          </div>
                        )}
                      </>
                    )}
                  </div>



                  {reactions.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {reactions.map((reaction, index) => {
                        // Get unique user names for this specific reaction on this message
                        const reactedUsers = reaction.userIds
                          .map(userId => {
                            // Find user from all messages' senders
                            const allSenders = messages?.map(m => m.sender).filter(Boolean) || [];
                            const user = allSenders.find(s => s?._id === userId);
                            return user?.name || 'Unknown';
                          })
                          .filter((name, idx, self) => self.indexOf(name) === idx); // Remove duplicates
                        
                        const isFirstReaction = index === 0;
                        const isLastReaction = index === reactions.length - 1;
                        
                        return (
                          <div key={reaction.emoji} className="relative">
                            <button
                              onClick={() => toggleReaction({ messageId: msg._id, userId: currentUserId, emoji: reaction.emoji })}
                              onMouseEnter={() => setReactionTooltip({messageId: msg._id, emoji: reaction.emoji})}
                              onMouseLeave={() => setReactionTooltip(null)}
                              className={`text-sm px-2 py-1 rounded-full border ${
                                reaction.userIds.includes(currentUserId as string)
                                  ? "bg-blue-100 border-blue-300 text-blue-800"
                                  : "bg-gray-700 border-gray-600 text-gray-200"
                              }`}
                            >
                              {reaction.emoji} {reaction.userIds.length}
                            </button>
                            {reactionTooltip?.messageId === msg._id && reactionTooltip?.emoji === reaction.emoji && (
                              <div className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-30 max-w-xs ${
                                isOwn 
                                  ? (isLastReaction ? 'right-0' : isFirstReaction ? 'left-0' : 'left-1/2 -translate-x-1/2')
                                  : (isFirstReaction ? 'left-0' : isLastReaction ? 'right-0' : 'left-1/2 -translate-x-1/2')
                              }`}>
                                <div className="max-w-[200px] overflow-hidden text-ellipsis">
                                  {reactedUsers?.join(', ')}
                                </div>
                                <div className={`absolute top-full -mt-1 border-4 border-transparent border-t-gray-900 ${
                                  isOwn
                                    ? (isLastReaction ? 'right-2' : isFirstReaction ? 'left-2' : 'left-1/2 -translate-x-1/2')
                                    : (isFirstReaction ? 'left-2' : isLastReaction ? 'right-2' : 'left-1/2 -translate-x-1/2')
                                }`}></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-1">
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

      {/* Typing Indicator - Always visible at bottom of messages */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-400 bg-gray-800 border-t border-gray-700">
          <span className="italic">
            {typingUsers.map((u) => u?.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      )}

      {showScrollButton && (
        <div className="px-4 pb-2 flex justify-center">
          <button
            onClick={scrollToBottom}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-xs font-medium shadow-lg"
          >
            ↓ New messages
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
