import { v } from "convex/values";
import { query } from "./_generated/server";

// User Queries
export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getAllUsers = query({
  args: { excludeClerkId: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((user) => user.clerkId !== args.excludeClerkId);
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
    excludeClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    return users.filter(
      (user) =>
        user.clerkId !== args.excludeClerkId &&
        user.name.toLowerCase().includes(args.query.toLowerCase())
    );
  },
});

// Conversation Queries
export const getConversation = query({
  args: { participantIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();
    return conversations.find((conv) => {
      if (conv.isGroup) return false;
      if (conv.participants.length !== args.participantIds.length) return false;
      return args.participantIds.every((id) => conv.participants.includes(id));
    });
  },
});

export const getUserConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();
    const userConversations = conversations.filter((conv) =>
      conv.participants.includes(args.userId)
    );

    const enriched = await Promise.all(
      userConversations.map(async (conv) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .collect();

        const lastMessage = messages.sort((a, b) => b.timestamp - a.timestamp)[0];
        const unreadCount = messages.filter(
          (msg) => !msg.readBy.includes(args.userId)
        ).length;

        if (conv.isGroup) {
          return {
            ...conv,
            lastMessage,
            unreadCount,
            otherUser: null,
          };
        }

        const otherUserId = conv.participants.find((id) => id !== args.userId);
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        return {
          ...conv,
          lastMessage,
          unreadCount,
          otherUser,
        };
      })
    );

    return enriched.sort(
      (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
    );
  },
});

// Message Queries
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        const reactionGroups = reactions.reduce((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
          }
          acc[reaction.emoji].push(reaction.userId as string);
          return acc;
        }, {} as Record<string, string[]>);

        return {
          ...msg,
          sender,
          reactions: reactionGroups,
        };
      })
    );

    return enriched.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Typing Indicators
export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    excludeUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const now = Date.now();
    const activeTyping = indicators.filter(
      (ind) =>
        ind.isTyping &&
        ind.userId !== args.excludeUserId &&
        now - ind.lastUpdated < 3000
    );

    return await Promise.all(
      activeTyping.map(async (ind) => await ctx.db.get(ind.userId))
    );
  },
});

// Reactions
export const getMessageReactions = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push(reaction.userId);
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: string[] }>);

    return Object.values(grouped);
  },
});
