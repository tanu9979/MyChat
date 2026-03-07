# MyChat - Video Presentation Script (5 Minutes)

## 🎬 SETUP CHECKLIST
- [ ] Camera ON and positioned properly
- [ ] Browser with MyChat running (localhost:3000)
- [ ] VS Code open with key files ready
- [ ] Two browser windows for real-time demo
- [ ] Practice 2-3 times before recording

---

## 📝 SCRIPT

### **[0:00 - 0:30] INTRODUCTION (30 seconds)**

**[Look at camera, smile]**

"Hello! My name is [YOUR NAME], and I'm excited to share MyChat with you - a production-ready real-time messaging application I built for this internship application.

I'm a [YOUR BACKGROUND - e.g., final year computer science student / full-stack developer] passionate about building scalable web applications. 

MyChat is a feature-rich chat platform built with Next.js 15, TypeScript, Convex for real-time database, and Clerk for authentication. It supports direct messaging, group chats, message reactions, typing indicators, and real-time online status - all wrapped in a professional dark-themed interface.

Let me show you how it works and walk through the code."

---

### **[0:30 - 1:30] LIVE DEMO (60 seconds)**

**[Switch to browser - MyChat running]**

"First, let me demonstrate the key features in action.

**[Show the interface]**
Here's the main interface - we have a left navigation sidebar, conversation list, and the chat window. The design is fully responsive with a mobile-first approach.

**[Click on a conversation]**
When I select a conversation, messages load instantly. Notice the clean message bubbles, timestamps, and online status indicators.

**[Hover over a message]**
When I hover over any message, I get a three-dot menu. 

**[Click the menu]**
I can react with emojis, edit my own messages, or delete them. Let me add a reaction...

**[Add a reaction, hover over it]**
And when I hover over the reaction, it shows who reacted - with smart positioning to prevent overflow.

**[Open second browser window side-by-side]**
Now here's the real magic - let me open this in another browser window as a different user.

**[Type in first window]**
Watch what happens when I start typing... the other user immediately sees 'User is typing...' 

**[Send message]**
And when I send the message, it appears instantly in both windows - no refresh needed. That's the power of Convex's real-time subscriptions.

**[Show group chat]**
I can also create group chats with multiple members, and there's a member list showing everyone's online status.

**[Click info icon]**
And this info icon shows the user's profile with their name, email, and current status."

---

### **[1:30 - 3:30] CODE WALKTHROUGH (2 minutes)**

**[Switch to VS Code]**

"Now let me walk you through the code architecture that makes this work.

**[Open schema.ts]**
First, here's our database schema. I designed five tables:

- **Users** - stores profiles synced from Clerk with online status tracking
- **Conversations** - handles both direct messages and group chats
- **Messages** - with soft delete support, so deleted messages are preserved but marked as deleted
- **Typing Indicators** - ephemeral data that auto-expires after 2 seconds
- **Reactions** - toggle-based emoji reactions

Notice the indexes - 'by_clerk_id' for fast user lookups, 'by_last_message' for sorting conversations, and 'by_conversation' for efficient message retrieval.

**[Open ChatWindow.tsx - scroll to top]**
Now let's look at the ChatWindow component - this is where the magic happens.

**[Point to useQuery]**
Here I'm using Convex's useQuery hook. This is crucial - it creates a real-time subscription. Whenever messages change in the database, this component automatically re-renders with the new data. No polling, no manual refreshes - it's truly reactive.

**[Scroll to handleTyping function]**
Here's the typing indicator logic. When a user types, I set their typing status to true and start a 2-second timeout. If they keep typing, the timeout resets. If they stop, it auto-clears after 2 seconds. This prevents stale typing indicators.

**[Scroll to reaction tooltip code]**
And here's something I'm particularly proud of - the reaction tooltip positioning. I implemented smart positioning logic that checks if the reaction is first, last, or in the middle, and adjusts the tooltip alignment accordingly. This prevents names from being cut off at screen edges.

**[Open ChatInterface.tsx - scroll to online status effect]**
In the ChatInterface, I manage online status with a heartbeat system. Every 30 seconds, I ping the server to say 'I'm still here'. There's also a cleanup interval every 15 seconds that marks inactive users as offline. And when the user closes the tab, the beforeunload event sets them offline immediately.

**[Open ConversationList.tsx - show formatTimestamp]**
Here's a nice UX touch - smart timestamp formatting. Messages from today show just the time, messages from this week show the day name, and older messages show the full date. It's context-aware and makes the interface feel more natural."

---

### **[3:30 - 4:30] LIVE CODE CHANGE (60 seconds)**

**[Stay in VS Code]**

"Now let me make a live code change to demonstrate my understanding of the codebase.

**[Open ChatWindow.tsx, find REACTIONS constant]**
Here's where I define the available reaction emojis. Currently, we have thumbs up, heart, laughing, surprised, and sad.

**[Make the change]**
Let me change this to something more fun - I'll replace thumbs up with a fire emoji, and heart with a hundred emoji.

**[Type the change]**
```typescript
const REACTIONS = ["🔥", "💯", "😂", "😮", "😢"];
```

**[Save file]**
Saved. Now let's see it in action.

**[Switch to browser]**
**[Wait 2-3 seconds for hot reload]**
And there we go - Next.js hot reload kicks in...

**[Hover over a message, click three dots]**
Now when I open the reaction menu, you can see the new emojis - fire and hundred instead of thumbs up and heart.

**[Add a reaction]**
Let me add the fire emoji... and it works perfectly! The change is reflected immediately.

This demonstrates how the component architecture is modular and easy to modify. The REACTIONS constant is used throughout the component for rendering, toggling, and displaying reactions."

---

### **[4:30 - 5:00] CLOSING (30 seconds)**

**[Switch back to camera]**

"So that's MyChat - a production-ready real-time messaging platform with:
- Instant message delivery using Convex subscriptions
- Typing indicators and online status tracking
- Message reactions with smart tooltip positioning
- Group chat support
- Fully responsive design
- And clean, maintainable TypeScript code

The entire application is deployed and ready to use. I built this with a focus on user experience, performance, and code quality.

I'm excited about the opportunity to bring these skills to your team and continue building amazing products. Thank you for watching, and I look forward to discussing this project further!"

**[Smile and wave]**

---

## 🎯 TIMING BREAKDOWN
- Introduction: 30 seconds
- Live Demo: 60 seconds  
- Code Walkthrough: 120 seconds
- Live Code Change: 60 seconds
- Closing: 30 seconds
- **Total: 5 minutes**

---

## 💡 TIPS FOR RECORDING

### DO:
✅ Speak clearly and at a moderate pace
✅ Show enthusiasm and confidence
✅ Make eye contact with camera during intro/outro
✅ Use your mouse to point at code while explaining
✅ Pause briefly between sections
✅ Smile and be yourself

### DON'T:
❌ Rush through the script
❌ Read word-for-word (sound natural)
❌ Apologize for anything
❌ Say "um" or "uh" too much (pause instead)
❌ Forget to show your face during intro/outro

---

## 🔧 TECHNICAL SETUP

### Files to Have Open:
1. `convex/schema.ts` - Database schema
2. `components/ChatWindow.tsx` - Main chat component
3. `components/ChatInterface.tsx` - Layout and online status
4. `components/ConversationList.tsx` - Timestamp formatting

### Browser Setup:
- Tab 1: MyChat logged in as User 1
- Tab 2: MyChat logged in as User 2 (incognito/different profile)
- Both visible side-by-side for real-time demo

### Code Change to Make:
```typescript
// Before:
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

// After:
const REACTIONS = ["🔥", "💯", "😂", "😮", "😢"];
```

---

## 📋 PRE-RECORDING CHECKLIST

- [ ] Practice the script 2-3 times
- [ ] Time yourself (should be 4:30-5:00)
- [ ] Test screen recording quality
- [ ] Check audio levels
- [ ] Ensure good lighting on your face
- [ ] Close unnecessary tabs/applications
- [ ] Turn off notifications
- [ ] Have water nearby
- [ ] Take a deep breath and smile!

---

## 🎬 ALTERNATIVE SECTIONS (If Time Permits)

### If Running Short (Add 15-30 seconds):
- Mention AWS deployment readiness
- Discuss scalability considerations
- Highlight security features (Clerk authentication)
- Show mobile responsive design

### If Running Long (Cut 15-30 seconds):
- Shorten the live demo
- Skip one code file walkthrough
- Make code change explanation more concise

---

**Good luck with your recording! You've built something impressive - now show it off with confidence! 🚀**
