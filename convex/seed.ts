import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedOldMessages = mutation({
  args: {},
  handler: async (ctx) => {
    // Find users by email/name
    const users = await ctx.db.query("users").collect();
    const tanima = users.find(u => u.name === "Tanima 2");
    const swarnim = users.find(u => u.name === "Swarnim 2");

    if (!tanima || !swarnim) {
      throw new Error(`Users not found. Found: ${users.map(u => u.name).join(", ")}`);
    }

    // Find or create conversation
    const existingConv = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("isGroup"), false))
      .collect();
    
    let conversation = existingConv.find(c => 
      c.participants.includes(tanima._id) && c.participants.includes(swarnim._id)
    );

    if (!conversation) {
      const convId = await ctx.db.insert("conversations", {
        participants: [tanima._id, swarnim._id],
        isGroup: false,
        lastMessageTime: Date.now(),
      });
      const newConv = await ctx.db.get(convId);
      if (!newConv) throw new Error("Failed to create conversation");
      conversation = newConv;
    }

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Messages from different time periods
    const messages = [
      // 2 years ago (force 2023)
      { content: "Remember this from 2 years ago?", timestamp: new Date('2023-01-15T14:30:00').getTime(), sender: tanima._id },
      { content: "Wow, time flies!", timestamp: new Date('2023-01-15T14:31:00').getTime(), sender: swarnim._id },
      
      // 1 year ago
      { content: "Hey! Long time no see", timestamp: now - 365 * oneDay, sender: tanima._id },
      { content: "Yeah! How have you been?", timestamp: now - 365 * oneDay + 60000, sender: swarnim._id },
      
      // 6 months ago
      { content: "Happy New Year!", timestamp: now - 180 * oneDay, sender: swarnim._id },
      { content: "Same to you! 🎉", timestamp: now - 180 * oneDay + 30000, sender: tanima._id },
      
      // 1 month ago
      { content: "Did you see the game last night?", timestamp: now - 30 * oneDay, sender: tanima._id },
      { content: "Yes! It was amazing!", timestamp: now - 30 * oneDay + 120000, sender: swarnim._id },
      
      // Last week (Monday)
      { content: "Starting the week strong 💪", timestamp: now - 7 * oneDay, sender: swarnim._id },
      
      // 3 days ago
      { content: "Want to grab coffee?", timestamp: now - 3 * oneDay, sender: tanima._id },
      { content: "Sure! When?", timestamp: now - 3 * oneDay + 60000, sender: swarnim._id },
      
      // Yesterday
      { content: "See you tomorrow!", timestamp: now - oneDay, sender: tanima._id },
      
      // Today
      { content: "Good morning!", timestamp: now - 3 * 60 * 60 * 1000, sender: swarnim._id },
      { content: "Morning! Ready for today?", timestamp: now - 2 * 60 * 60 * 1000, sender: tanima._id },
    ];

    // Insert all messages
    for (const msg of messages) {
      await ctx.db.insert("messages", {
        conversationId: conversation._id,
        senderId: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
        readBy: [tanima._id, swarnim._id],
        isDeleted: false,
      });
    }

    // Update conversation last message time
    await ctx.db.patch(conversation._id, {
      lastMessageTime: now - 2 * 60 * 60 * 1000,
    });

    return { success: true, messageCount: messages.length };
  },
});

export const clearOldMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const tanima = users.find(u => u.name === "Tanima 2");
    const swarnim = users.find(u => u.name === "Swarnim 2");

    if (!tanima || !swarnim) {
      return { success: false, message: "Users not found" };
    }

    const conversations = await ctx.db.query("conversations").collect();
    const conversation = conversations.find(c => 
      c.participants.includes(tanima._id) && c.participants.includes(swarnim._id)
    );

    if (!conversation) {
      return { success: false, message: "Conversation not found" };
    }

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("conversationId"), conversation._id))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    return { success: true, deletedCount: messages.length };
  },
});
