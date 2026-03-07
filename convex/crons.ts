import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process scheduled messages every minute
crons.interval(
  "process scheduled messages",
  { minutes: 1 },
  internal.mutations.processScheduledMessages,
);

export default crons;