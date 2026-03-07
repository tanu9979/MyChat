import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process scheduled messages every minute
crons.interval(
  "process scheduled messages",
  { minutes: 1 },
  internal.crons.processScheduledMessages,
);

export default crons;

// Internal mutation for processing scheduled messages
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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