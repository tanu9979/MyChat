import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Database Schema for MyChat Application
 * 
 * Architecture:
 * - users: User profiles with online status tracking
 * - conversations: Chat metadata (1-on-1 and group chats)
 * - messages: All messages with soft-delete and read receipts
 * - typingIndicators: Ephemeral typing status (auto-expires)
 * - reactions: Emoji reactions on messages
 */

export default defineSchema({
  // User profiles synced from Clerk authentication
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeen: v.number(), // Timestamp for online status tracking
  }).index("by_clerk_id", ["clerkId"]), // Fast lookup by Clerk ID

  // Conversations (both direct messages and group chats)
  conversations: defineTable({
    participants: v.array(v.id("users")),
    isGroup: v.boolean(),
    groupName: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
    hiddenFor: v.optional(v.array(v.id("users"))), // Soft delete for users
  }).index("by_last_message", ["lastMessageTime"]), // Sort by most recent

  // Messages with soft delete and edit support
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    timestamp: v.number(),
    readBy: v.array(v.id("users")), // Track who has read the message
    isDeleted: v.boolean(), // Soft delete - preserves message
    deletedAt: v.optional(v.number()),
    isEdited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    hiddenFor: v.optional(v.array(v.id("users"))),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),

  // Typing indicators (ephemeral, auto-cleared after 2 seconds)
  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
    lastUpdated: v.number(), // For auto-cleanup of stale indicators
  }).index("by_conversation", ["conversationId"]),

  // Message reactions (toggle-based: add/remove)
  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
    timestamp: v.number(),
  })
    .index("by_message", ["messageId"]) // Get all reactions for a message
    .index("by_user_and_message", ["userId", "messageId"]), // Toggle reactions
});
