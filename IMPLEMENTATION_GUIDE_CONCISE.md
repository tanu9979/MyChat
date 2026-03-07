# MyChat - Complete Implementation Guide

## Overview
A production-ready real-time chat application with 14 features built using Next.js, Convex, and Clerk.

**Tech Stack:**
- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Backend: Convex (real-time database)
- Authentication: Clerk
- Deployment: Vercel

---

## Feature 1: Authentication

### What It Does
Users sign up/login with email or social providers. Profile synced to Convex database.

### Implementation
- **Setup:** Clerk provides authentication, wrapped app with `ClerkProvider` in `app/layout.tsx`
- **UI:** `SignInButton` component shows modal, `Show` component conditionally renders based on auth state
- **Sync:** `syncUser` mutation in `convex/mutations.ts` creates/updates user in database on login
- **Trigger:** `useEffect` in `ChatInterface.tsx` calls `syncUser` when user logs in
- **Display:** `UserButton` component shows profile/logout, avatar displayed from `currentUser.imageUrl`

### Files
- `app/layout.tsx` - ClerkProvider wrapper
- `app/page.tsx` - SignInButton and conditional rendering
- `convex/mutations.ts` - syncUser mutation
- `components/ChatInterface.tsx` - Sync trigger and profile display

---

## Feature 2: User List & Search

### What It Does
Shows all users with real-time search filtering. Click user to start conversation.

### Implementation
- **Query:** `searchUsers` in `convex/queries.ts` fetches all users, filters by name, excludes current user
- **Component:** `UserList.tsx` has search input with `onChange` updating state
- **Real-time:** `useQuery` hook automatically re-runs when search query changes
- **Selection:** Clicking user checks for existing conversation, creates new if none exists
- **Display:** Shows avatar, name, email, and online status (green dot)

### Files
- `convex/queries.ts` - searchUsers query
- `components/UserList.tsx` - Search input and user list
- `components/ChatInterface.tsx` - User selection handler

---

## Feature 3: One-on-One Direct Messages

### What It Does
Private conversations with real-time message updates for both users.

### Implementation
- **Schema:** `conversations` table with participants array, `messages` table with conversationId
- **Send:** `sendMessage` mutation inserts message, updates conversation's lastMessageTime
- **Receive:** `getMessages` query fetches messages, `useQuery` creates real-time subscription
- **Display:** Messages sorted by timestamp, sender info enriched in query
- **Sidebar:** `getUserConversations` query shows all chats with last message preview and unread count

### Files
- `convex/schema.ts` - conversations and messages tables
- `convex/mutations.ts` - sendMessage mutation
- `convex/queries.ts` - getMessages and getUserConversations queries
- `components/ChatWindow.tsx` - Message display and input
- `components/ConversationList.tsx` - Sidebar with previews

---

## Feature 4: Message Timestamps

### What It Does
Smart timestamp formatting: today shows time, this year shows date+time, older shows year.

### Implementation
- **Logic:** Compare message date with today's date and year
- **Today:** `toLocaleTimeString()` - shows "2:34 PM"
- **This Year:** `toLocaleDateString()` + time - shows "Feb 15, 2:34 PM"
- **Different Year:** Full date + time - shows "Feb 15, 2023 2:34 PM"
- **Location:** Inline function in ChatWindow.tsx, separate function in ConversationList.tsx

### Files
- `components/ChatWindow.tsx` - Message timestamp formatting
- `components/ConversationList.tsx` - Sidebar timestamp formatting

---

## Feature 5: Empty States

### What It Does
Shows helpful messages when no data exists. Never blank screens.

### Implementation
- **Pattern:** Three-state rendering: `{!data ? <Loading /> : data.length === 0 ? <Empty /> : <Display />}`
- **Conversations:** "No conversations yet" with icon and "Click 'New Chat'" guidance
- **Messages:** "No messages yet" with "Send a message to start" guidance
- **Users:** "No users found" when searching, "No other users yet" when empty
- **Desktop:** "Select a conversation to start chatting" when none selected

### Files
- `components/ConversationList.tsx` - Empty conversations state
- `components/ChatWindow.tsx` - Empty messages state
- `components/UserList.tsx` - Empty users state
- `components/ChatInterface.tsx` - No selection state

---

## Feature 6: Responsive Layout

### What It Does
Desktop: sidebar + chat side-by-side. Mobile: list or chat full-screen with back button.

### Implementation
- **Detection:** `useState` + `useEffect` with resize listener, breakpoint at 768px
- **Logic:** `showSidebar = !isMobile || !selectedConversationId`, `showChat = selectedConversationId && (!isMobile || view === "conversations")`
- **Sidebar:** Desktop: `w-80` (320px), Mobile: `w-full`
- **Navigation:** Desktop: always visible 64px sidebar, Mobile: overlay with hamburger menu
- **Back Button:** Only rendered on mobile, passed as `onBack` prop to ChatWindow

### Files
- `components/ChatInterface.tsx` - Mobile detection and conditional logic
- `components/ChatWindow.tsx` - Back button rendering

---

## Feature 7: Online/Offline Status

### What It Does
Green dot shows who's online. Updates in real-time.

### Implementation
- **Schema:** `isOnline` boolean and `lastSeen` timestamp in users table
- **Heartbeat:** `setInterval` calls `setUserOnline` every 30 seconds
- **Cleanup:** `setInterval` calls `updateUserActivity` every 15 seconds to mark inactive users offline
- **Detection:** If `lastSeen` > 1 minute ago, set `isOnline: false`
- **Display:** Green dot positioned on avatar, only for 1-on-1 chats

### Files
- `convex/schema.ts` - isOnline and lastSeen fields
- `convex/mutations.ts` - setUserOnline, setUserOffline, updateUserActivity
- `components/ChatInterface.tsx` - Heartbeat intervals
- `components/ConversationList.tsx` - Green dot display

---

## Feature 8: Typing Indicator

### What It Does
Shows "User is typing..." when other user types. Disappears after 2 seconds.

### Implementation
- **Schema:** `typingIndicators` table with conversationId, userId, isTyping, lastUpdated
- **Trigger:** `onChange` in input calls `setTyping` mutation with `isTyping: true`
- **Debounce:** `setTimeout` clears typing after 2 seconds of inactivity
- **Clear:** Set `isTyping: false` on message send or empty input
- **Query:** `getTypingUsers` filters by `isTyping: true` and `lastUpdated < 3 seconds`
- **Display:** Shows names below messages, above input field

### Files
- `convex/schema.ts` - typingIndicators table
- `convex/mutations.ts` - setTyping mutation
- `convex/queries.ts` - getTypingUsers query
- `components/ChatWindow.tsx` - Input handler and display

---

## Feature 9: Unread Message Count

### What It Does
Badge shows unread count per conversation. Clears when opened.

### Implementation
- **Schema:** `readBy` array in messages table stores user IDs who read the message
- **Count:** Filter messages where current userId NOT in readBy array
- **Calculate:** Done in `getUserConversations` query for each conversation
- **Mark Read:** `markConversationAsRead` mutation adds userId to readBy array for all messages
- **Trigger:** `useEffect` calls markConversationAsRead when conversation opens
- **Display:** Blue badge with count, only shows if count > 0

### Files
- `convex/schema.ts` - readBy field in messages
- `convex/mutations.ts` - markConversationAsRead mutation
- `convex/queries.ts` - Unread count calculation
- `components/ChatWindow.tsx` - Mark as read trigger
- `components/ConversationList.tsx` - Badge display

---

## Feature 10: Smart Auto-Scroll

### What It Does
Auto-scrolls to new messages when at bottom. Shows button when scrolled up.

### Implementation
- **Detection:** `onScroll` event checks if `scrollHeight - scrollTop - clientHeight < 100`
- **State:** `showScrollButton` set to true when scrolled up, false when at bottom
- **Auto-Scroll:** `useEffect` on `messages?.length` scrolls if `!showScrollButton`
- **Manual:** Button calls `scrollIntoView` and sets `showScrollButton: false`
- **Anchor:** Empty div at end of messages used as scroll target

### Files
- `components/ChatWindow.tsx` - Scroll detection, auto-scroll logic, button display

---

## Feature 11: Delete Own Messages

### What It Does
Users delete their messages. Shows "This message was deleted" in italics. Soft delete.

### Implementation
- **Schema:** `isDeleted` boolean and `deletedAt` timestamp in messages table
- **Mutation:** `deleteMessage` checks if userId === senderId, sets `isDeleted: true`
- **UI:** Three-dot menu on hover shows "Delete" option for own messages
- **Display:** Conditional rendering: `{msg.isDeleted ? "This message was deleted" : msg.content}`
- **Style:** Italic class applied when deleted
- **Why Soft:** Preserves conversation history, allows audit, maintains integrity

### Files
- `convex/schema.ts` - isDeleted and deletedAt fields
- `convex/mutations.ts` - deleteMessage mutation
- `components/ChatWindow.tsx` - Menu and display logic

---

## Feature 12: Message Reactions

### What It Does
React with 5 emojis (👍 ❤️ 😂 😮 😢). Click again to remove. Shows count.

### Implementation
- **Schema:** Separate `reactions` table with messageId, userId, emoji, timestamp
- **Indexes:** `by_message` and `by_user_and_message` for fast lookups
- **Toggle:** `toggleReaction` mutation checks if exists, deletes if yes, inserts if no
- **UI:** Three-dot menu shows emoji picker with 5 fixed emojis
- **Fetch:** `getMessages` query enriches messages with reactions, groups by emoji
- **Display:** Shows below message, emoji + count, highlights if current user reacted

### Files
- `convex/schema.ts` - reactions table
- `convex/mutations.ts` - toggleReaction mutation
- `convex/queries.ts` - Reaction enrichment in getMessages
- `components/ChatWindow.tsx` - Emoji picker and display

---

## Feature 13: Loading & Error States

### What It Does
Shows spinners while loading. Handles errors gracefully with automatic retry.

### Implementation
- **Pattern:** `{!data ? <Loading /> : data.length === 0 ? <Empty /> : <Display />}`
- **Locations:** All components using `useQuery` (ChatWindow, ConversationList, UserList, ChatInterface)
- **Loading:** Shows "Loading..." text or spinner when data is undefined
- **Empty:** Shows helpful message when data is empty array
- **Errors:** Convex handles automatically with exponential backoff retry
- **Network:** WebSocket reconnects automatically, queued mutations retry

### Files
- All query components implement three-state pattern
- No explicit error handling needed (Convex built-in)

---

## Feature 14: Group Chat

### What It Does
Create groups with multiple members and custom name. Real-time messages for all.

### Implementation
- **Schema:** `isGroup` boolean and `groupName` string in conversations table
- **Create:** `createGroupConversation` mutation takes participantIds array and groupName
- **UI:** `CreateGroup.tsx` shows user checkboxes, name input, selected chips
- **Display:** Sidebar checks `isGroup` flag, shows groupName or "Group Chat" fallback
- **Icon:** First letter of group name in colored circle
- **Messages:** Work exactly like 1-on-1, all participants see in real-time
- **Count:** Button shows "(3 members)" dynamically

### Files
- `convex/schema.ts` - isGroup and groupName fields
- `convex/mutations.ts` - createGroupConversation mutation
- `components/CreateGroup.tsx` - Group creation UI
- `components/ConversationList.tsx` - Group display logic

---

## Architecture Summary

### Data Flow
```
User Action → Component → Mutation → Database → Query → Subscription → All Clients Update
```

### Database Tables
1. **users** - Profiles with online status
2. **conversations** - 1-on-1 and group metadata
3. **messages** - All messages with soft delete
4. **typingIndicators** - Ephemeral typing status
5. **reactions** - Message reactions

### Key Patterns

**Real-Time Subscription:**
```typescript
const data = useQuery(api.queries.getData, { args });
// Auto-updates when database changes
```

**Soft Delete:**
```typescript
await ctx.db.patch(id, { isDeleted: true, deletedAt: Date.now() });
// Don't use: await ctx.db.delete(id);
```

**Toggle Pattern:**
```typescript
const existing = await find();
if (existing) await delete(existing);
else await insert(new);
```

**Three-State Rendering:**
```typescript
{!data ? <Loading /> : data.length === 0 ? <Empty /> : <Display />}
```

**Permission Check:**
```typescript
if (message.senderId === userId) {
  // Allow action
}
```

---

## Testing Checklist

### Quick Test (All 14 Features)
1. ✅ Sign up/login with email or Google
2. ✅ Search users by name, click to chat
3. ✅ Send message, see in real-time on other device
4. ✅ Check timestamps: today, this year, last year
5. ✅ Verify empty states: no conversations, no messages, no users
6. ✅ Resize window: desktop shows both panels, mobile shows one
7. ✅ Open app in two browsers: see green dot appear/disappear
8. ✅ Type in one browser: see "typing..." in other
9. ✅ Send message: see unread badge, open to clear
10. ✅ Scroll up: see "↓ New messages" button
11. ✅ Delete own message: see "This message was deleted"
12. ✅ React to message: click 👍, click again to remove
13. ✅ Refresh page: see loading states, then data
14. ✅ Create group: select users, name it, send message

---

## Performance Tips

1. **Use Indexes:** All frequently queried fields indexed
2. **Filter in Query:** Don't filter in component
3. **Batch Operations:** Use `Promise.all` for parallel mutations
4. **Debounce Input:** Typing indicator uses 2-second debounce
5. **Conditional Subscriptions:** Only subscribe to needed data

---

## Deployment Steps

1. **Convex:** Run `npx convex deploy`
2. **Vercel:** Connect GitHub repo, add env variables
3. **Clerk:** Configure production domain and OAuth
4. **Test:** Verify all features work in production

---

## Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CONVEX_DEPLOYMENT=prod:...
NEXT_PUBLIC_CONVEX_URL=https://....convex.cloud
```

---

## Troubleshooting

**Messages not appearing?**
→ Check Convex WebSocket in Network tab

**User not syncing?**
→ Verify syncUser is called on login

**Typing indicator stuck?**
→ Check timeout is clearing properly

**Unread count wrong?**
→ Ensure markConversationAsRead is called

**Reactions not toggling?**
→ Verify compound index exists

**Mobile layout broken?**
→ Check breakpoint: `window.innerWidth < 768`

---

## Conclusion

**14/14 Features Implemented ✅**

This MyChat application demonstrates:
- Real-time updates via Convex subscriptions
- Secure authentication with Clerk
- Responsive design for all devices
- Professional UI/UX with Tailwind
- Production-ready architecture
- Scalable database design

All features work seamlessly together to provide a modern chat experience comparable to professional messaging applications like WhatsApp or Slack!
