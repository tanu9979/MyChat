import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// User Management
export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        isOnline: true,
        lastSeen: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

export const setUserOnline = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: true,
        lastSeen: Date.now(),
      });
    }
  },
});

export const updateUserActivity = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    const timeout = 60000; // 1 minute

    for (const user of users) {
      if (user.isOnline && now - user.lastSeen > timeout) {
        await ctx.db.patch(user._id, {
          isOnline: false,
        });
      }
    }
  },
});

export const setUserOffline = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: false,
        lastSeen: Date.now(),
      });
    }
  },
});

// Conversation Management
export const createConversation = mutation({
  args: { participantIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      participants: args.participantIds,
      isGroup: false,
      lastMessageTime: Date.now(),
      hiddenFor: [],
    });
  },
});

export const createGroupConversation = mutation({
  args: {
    participantIds: v.array(v.id("users")),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      participants: args.participantIds,
      isGroup: true,
      groupName: args.groupName,
      lastMessageTime: Date.now(),
      hiddenFor: [],
    });
  },
});

export const updateGroupName = mutation({
  args: {
    conversationId: v.id("conversations"),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      groupName: args.groupName,
    });
  },
});

// Messaging
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      timestamp: Date.now(),
      readBy: [args.senderId],
      isDeleted: false,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageTime: Date.now(),
    });

    return messageId;
  },
});

export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message && !message.readBy.includes(args.userId)) {
      await ctx.db.patch(args.messageId, {
        readBy: [...message.readBy, args.userId],
      });
    }
  },
});

export const markConversationAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      if (!message.readBy.includes(args.userId)) {
        await ctx.db.patch(message._id, {
          readBy: [...message.readBy, args.userId],
        });
      }
    }
  },
});

// Typing Indicators
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isTyping: args.isTyping,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: args.userId,
        isTyping: args.isTyping,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Message Management
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message && message.senderId === args.userId) {
      await ctx.db.patch(args.messageId, {
        isDeleted: true,
        deletedAt: Date.now(),
      });
    }
  },
});

export const hideMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;
    
    const hiddenFor = message.hiddenFor || [];
    if (!hiddenFor.includes(args.userId)) {
      await ctx.db.patch(args.messageId, {
        hiddenFor: [...hiddenFor, args.userId],
      });
    }
  },
});

// Reactions
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", args.userId).eq("messageId", args.messageId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: args.userId,
        emoji: args.emoji,
        timestamp: Date.now(),
      });
    }
  },
});

// Admin/Testing - Clear all conversations
export const clearAllConversations = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all messages
    const messages = await ctx.db.query("messages").collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete all reactions
    const reactions = await ctx.db.query("reactions").collect();
    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id);
    }

    // Delete all typing indicators
    const indicators = await ctx.db.query("typingIndicators").collect();
    for (const indicator of indicators) {
      await ctx.db.delete(indicator._id);
    }

    // Delete all conversations
    const conversations = await ctx.db.query("conversations").collect();
    for (const conv of conversations) {
      await ctx.db.delete(conv._id);
    }

    return { deleted: { conversations: conversations.length, messages: messages.length } };
  },
});

// Hide conversation (soft delete for user)
export const hideConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    // Hide all messages in this conversation for the user
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    
    for (const msg of messages) {
      const hiddenFor = msg.hiddenFor || [];
      if (!hiddenFor.includes(args.userId)) {
        await ctx.db.patch(msg._id, {
          hiddenFor: [...hiddenFor, args.userId],
        });
      }
    }

    // Hide the conversation
    const convHiddenFor = conversation.hiddenFor || [];
    if (!convHiddenFor.includes(args.userId)) {
      await ctx.db.patch(args.conversationId, {
        hiddenFor: [...convHiddenFor, args.userId],
      });
    }
  },
});

// Fix old conversations without hiddenFor field
export const fixOldConversations = mutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    for (const conv of conversations) {
      if (conv.hiddenFor === undefined) {
        await ctx.db.patch(conv._id, { hiddenFor: [] });
      }
    }
  },
});

// Unhide conversation
export const unhideConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    // Unhide the conversation
    const hiddenFor = conversation.hiddenFor || [];
    const newHiddenFor = hiddenFor.filter((id) => id !== args.userId);
    
    await ctx.db.patch(args.conversationId, {
      hiddenFor: newHiddenFor,
    });

    // Unhide all messages in this conversation for the user
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    
    for (const msg of messages) {
      const msgHiddenFor = msg.hiddenFor || [];
      if (msgHiddenFor.includes(args.userId)) {
        await ctx.db.patch(msg._id, {
          hiddenFor: msgHiddenFor.filter((id) => id !== args.userId),
        });
      }
    }
  },
});

// Edit message
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message && message.senderId === args.userId && !message.isDeleted) {
      await ctx.db.patch(args.messageId, {
        content: args.content,
        isEdited: true,
        editedAt: Date.now(),
      });
    }
  },
});

// Schedule message
export const scheduleMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scheduledMessages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      scheduledFor: args.scheduledFor,
      createdAt: Date.now(),
      isSent: false,
    });
  },
});

// Process scheduled messages (called by cron job)
export const processScheduledMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pendingMessages = await ctx.db
      .query("scheduledMessages")
      .withIndex("by_scheduled_time")
      .filter((q) => q.and(
        q.lte(q.field("scheduledFor"), now),
        q.eq(q.field("isSent"), false)
      ))
      .collect();

    for (const scheduledMsg of pendingMessages) {
      // Send the message
      await ctx.db.insert("messages", {
        conversationId: scheduledMsg.conversationId,
        senderId: scheduledMsg.senderId,
        content: scheduledMsg.content,
        timestamp: now,
        readBy: [scheduledMsg.senderId],
        isDeleted: false,
      });

      // Update conversation timestamp
      await ctx.db.patch(scheduledMsg.conversationId, {
        lastMessageTime: now,
      });

      // Mark as sent
      await ctx.db.patch(scheduledMsg._id, {
        isSent: true,
        sentAt: now,
      });
    }

    return { processed: pendingMessages.length };
  },
});

// Cancel scheduled message
export const cancelScheduledMessage = mutation({
  args: {
    messageId: v.id("scheduledMessages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const scheduledMsg = await ctx.db.get(args.messageId);
    if (scheduledMsg && scheduledMsg.senderId === args.userId && !scheduledMsg.isSent) {
      await ctx.db.delete(args.messageId);
    }
  },
});
