# MyChat Implementation Study Guide

## Feature 1: Authentication with Clerk

### Overview
Users can sign up, log in, and log out using Clerk. User profiles are synced to Convex database.

### Implementation Steps

#### 1.1 Setup Clerk
**File:** `.env.local`
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### 1.2 Wrap App with Clerk Provider
**File:** `app/layout.tsx`
```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Key Points:**
- ClerkProvider wraps entire app
- Provides authentication context to all components
- Must be outside ConvexClientProvider

#### 1.3 Create Sign In/Out UI
**File:** `app/page.tsx`
```typescript
import { SignInButton, Show } from "@clerk/nextjs";

export default function Home() {
  return (
    <Show when="signed-out">
      <SignInButton mode="modal">
        <button>Sign In to Start Chatting</button>
      </SignInButton>
    </Show>
    <Show when="signed-in">
      <ChatInterface />
    </Show>
  );
}
```

**Key Points:**
- `Show` component conditionally renders based on auth state
- `SignInButton` opens Clerk's modal for authentication
- Supports email and social login (Google, GitHub, etc.)

#### 1.4 Sync User to Convex Database
**File:** `convex/mutations.ts`
```typescript
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
```

**Key Points:**
- Checks if user exists by `clerkId`
- Updates existing user or creates new one
- Stores user profile in Convex for discovery

#### 1.5 Call syncUser on Login
**File:** `components/ChatInterface.tsx`
```typescript
const { user } = useUser(); // Clerk hook
const syncUser = useMutation(api.mutations.syncUser);

useEffect(() => {
  if (user && !currentUser) {
    syncUser({
      clerkId: user.id,
      name: user.fullName || user.firstName || "User",
      email: user.primaryEmailAddress?.emailAddress || "",
      imageUrl: user.imageUrl,
    });
  }
}, [user, currentUser, syncUser]);
```

**Key Points:**
- `useUser()` hook provides Clerk user data
- Syncs to Convex when user logs in
- Only syncs once (checks `!currentUser`)

#### 1.6 Display User Profile
**File:** `components/ChatInterface.tsx`
```typescript
<div className="text-center">
  {currentUser.imageUrl ? (
    <img src={currentUser.imageUrl} alt={currentUser.name} className="w-24 h-24 rounded-full" />
  ) : (
    <div className="w-24 h-24 rounded-full bg-blue-600 text-white text-3xl">
      {currentUser.name[0]}
    </div>
  )}
  <h2>{currentUser.name}</h2>
  <p>{currentUser.email}</p>
  <UserButton /> {/* Clerk's built-in profile/logout button */}
</div>
```

**Key Points:**
- Shows avatar or initials
- Displays name and email
- `UserButton` provides logout functionality

---

## Feature 2: User List & Search

### Overview
Show all users with search functionality. Clicking a user starts a conversation.

### Implementation Steps

#### 2.1 Create User Query
**File:** `convex/queries.ts`
```typescript
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
```

**Key Points:**
- Fetches all users from database
- Excludes current user
- Filters by name (case-insensitive)

#### 2.2 Create UserList Component
**File:** `components/UserList.tsx`
```typescript
export function UserList({ currentUserId, onSelectUser }) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  const users = useQuery(
    api.queries.searchUsers,
    user?.id ? { query: searchQuery, excludeClerkId: user.id } : "skip"
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {users?.map((user) => (
        <button key={user._id} onClick={() => onSelectUser(user._id)}>
          <img src={user.imageUrl} alt={user.name} />
          <div>{user.name}</div>
          <div>{user.isOnline ? "Online" : "Offline"}</div>
        </button>
      ))}
    </div>
  );
}
```

**Key Points:**
- `useQuery` automatically re-runs when `searchQuery` changes
- Real-time filtering as user types
- Shows online status with green dot

#### 2.3 Handle User Selection
**File:** `components/ChatInterface.tsx`
```typescript
<UserList
  currentUserId={currentUser._id}
  onSelectUser={async (otherUserId) => {
    // Check if conversation already exists
    const existing = allConversations?.find(
      (conv) =>
        !conv.isGroup &&
        conv.participants.length === 2 &&
        conv.participants.includes(otherUserId)
    );
    
    if (existing) {
      setSelectedConversationId(existing._id);
    } else {
      // Create new conversation
      const conv = await createConversation({
        participantIds: [currentUser._id, otherUserId],
      });
      setSelectedConversationId(conv);
    }
    setView("conversations");
  }}
/>
```

**Key Points:**
- Checks for existing conversation first
- Creates new conversation if none exists
- Switches to conversation view

---

## Feature 3: One-on-One Direct Messages

### Overview
Private conversations with real-time updates using Convex subscriptions.

### Implementation Steps

#### 3.1 Database Schema
**File:** `convex/schema.ts`
```typescript
export default defineSchema({
  conversations: defineTable({
    participants: v.array(v.id("users")),
    isGroup: v.boolean(),
    lastMessageTime: v.optional(v.number()),
  }).index("by_last_message", ["lastMessageTime"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    timestamp: v.number(),
    readBy: v.array(v.id("users")),
    isDeleted: v.boolean(),
  }).index("by_conversation", ["conversationId"]),
});
```

**Key Points:**
- `conversations` table stores chat metadata
- `messages` table stores actual messages
- Indexes for efficient queries

#### 3.2 Send Message Mutation
**File:** `convex/mutations.ts`
```typescript
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
```

**Key Points:**
- Inserts message into database
- Updates conversation's `lastMessageTime`
- Marks as read by sender

#### 3.3 Get Messages Query
**File:** `convex/queries.ts`
```typescript
export const getMessages = query({
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

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return { ...msg, sender };
      })
    );

    return enriched.sort((a, b) => a.timestamp - b.timestamp);
  },
});
```

**Key Points:**
- Fetches messages for a conversation
- Enriches with sender information
- Sorts by timestamp (oldest first)

#### 3.4 Real-Time Message Display
**File:** `components/ChatWindow.tsx`
```typescript
export function ChatWindow({ conversationId, currentUserId }) {
  const [message, setMessage] = useState("");
  
  // Real-time subscription - automatically updates when new messages arrive
  const messages = useQuery(api.queries.getMessages, { 
    conversationId, 
    userId: currentUserId 
  });
  
  const sendMessage = useMutation(api.mutations.sendMessage);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    await sendMessage({
      conversationId,
      senderId: currentUserId,
      content: message.trim(),
    });
    setMessage("");
  };

  return (
    <div>
      <div className="messages">
        {messages?.map((msg) => (
          <div key={msg._id} className={msg.senderId === currentUserId ? "own" : "other"}>
            <div>{msg.content}</div>
            <div>{formatTime(msg.timestamp)}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

**Key Points:**
- `useQuery` creates real-time subscription
- Component re-renders when new messages arrive
- No polling or manual refresh needed
- Messages appear instantly for both users

#### 3.5 Conversation List with Preview
**File:** `convex/queries.ts`
```typescript
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
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        const lastMessage = messages.sort((a, b) => b.timestamp - a.timestamp)[0];
        const unreadCount = messages.filter(
          (msg) => !msg.readBy.includes(args.userId)
        ).length;

        const otherUserId = conv.participants.find((id) => id !== args.userId);
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        return { ...conv, lastMessage, unreadCount, otherUser };
      })
    );

    return enriched.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  },
});
```

**Key Points:**
- Fetches all user's conversations
- Includes last message preview
- Calculates unread count
- Gets other user's info
- Sorts by most recent activity

---

## Feature 4: Message Timestamps

### Overview
Smart timestamp formatting based on message age.

### Implementation Steps

#### 4.1 Timestamp Formatting Logic
**File:** `components/ChatWindow.tsx`
```typescript
const formatTimestamp = (timestamp: number) => {
  const msgDate = new Date(timestamp);
  const today = new Date();
  const isToday = msgDate.toDateString() === today.toDateString();
  const isSameYear = msgDate.getFullYear() === today.getFullYear();

  if (isToday) {
    // Today: "2:34 PM"
    return msgDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (isSameYear) {
    // This year: "Feb 15, 2:34 PM"
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
    // Different year: "Feb 15, 2023 2:34 PM"
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
};
```

**Key Points:**
- Compares message date with today
- Three different formats based on age
- Uses JavaScript's built-in date formatting

#### 4.2 Display Timestamps
**File:** `components/ChatWindow.tsx`
```typescript
<div className="text-xs text-gray-500 mt-1">
  {formatTimestamp(msg.timestamp)}
</div>
```

#### 4.3 Conversation List Timestamps
**File:** `components/ConversationList.tsx`
```typescript
function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } else if (days < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" }); // "Mon"
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // "Feb 15"
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
}
```

**Key Points:**
- Sidebar shows abbreviated format
- Today: time only
- This week: day name
- This year: month and day
- Older: includes year

---

## Feature 5: Empty States

### Overview
Helpful messages when there's no data to display.

### Implementation Steps

#### 5.1 No Conversations
**File:** `components/ConversationList.tsx`
```typescript
{!conversations ? (
  <div className="p-4 text-center text-gray-500">
    Loading conversations...
  </div>
) : conversations.length === 0 ? (
  <div className="p-8 text-center text-gray-500">
    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300">
      {/* Chat icon */}
    </svg>
    <p>No conversations yet</p>
    <p className="text-sm mt-2">Click "New Chat" to start messaging</p>
  </div>
) : (
  // Show conversations
)}
```

**Key Points:**
- Three states: loading, empty, and data
- Loading shows spinner
- Empty shows helpful message with icon
- Guides user on what to do next

#### 5.2 No Messages in Conversation
**File:** `components/ChatWindow.tsx`
```typescript
{!messages ? (
  <div className="text-center text-gray-500">
    Loading messages...
  </div>
) : messages.length === 0 ? (
  <div className="text-center text-gray-500 mt-8">
    <p>No messages yet</p>
    <p className="text-sm mt-2">Send a message to start the conversation</p>
  </div>
) : (
  // Show messages
)}
```

#### 5.3 No Search Results
**File:** `components/UserList.tsx`
```typescript
{!users ? (
  <div className="p-4 text-center text-gray-500">
    Loading users...
  </div>
) : users.length === 0 ? (
  <div className="p-4 text-center text-gray-500">
    {searchQuery ? "No users found" : "No other users yet"}
  </div>
) : (
  // Show users
)}
```

**Key Points:**
- Different messages for search vs no users
- Always provides context
- Never shows blank screen

#### 5.4 No Conversation Selected (Desktop)
**File:** `components/ChatInterface.tsx`
```typescript
{!isMobile && !showChat && (
  <div className="flex-1 flex items-center justify-center text-gray-500">
    <div className="text-center">
      <svg className="w-24 h-24 mx-auto mb-4 text-gray-300">
        {/* Chat icon */}
      </svg>
      <p className="text-lg">Select a conversation to start chatting</p>
    </div>
  </div>
)}
```

---

## Key Concepts Summary

### 1. Convex Real-Time Subscriptions
- `useQuery` creates live subscription
- Component automatically re-renders when data changes
- No polling or manual refresh needed
- Works across all connected clients

### 2. Clerk Authentication Flow
1. User clicks sign in
2. Clerk modal opens
3. User authenticates
4. Clerk provides user data
5. App syncs to Convex database
6. User can now chat

### 3. Data Flow
```
User Action → Mutation → Database → Query → UI Update
```

Example: Sending a message
1. User types and clicks send
2. `sendMessage` mutation called
3. Message inserted into database
4. `getMessages` query detects change
5. All subscribed components re-render
6. Both users see new message instantly

### 4. Component Structure
```
ChatInterface (main container)
├── Sidebar
│   ├── ConversationList (shows all chats)
│   └── UserList (shows all users)
└── ChatWindow (shows messages)
```

### 5. Database Relationships
```
users ←→ conversations ←→ messages
  ↓
reactions, typingIndicators
```

---

## Testing the Features

### Feature 1: Authentication
1. Open app → See sign in button
2. Click sign in → Clerk modal opens
3. Sign up with email or Google
4. Redirected to chat interface
5. See your name and avatar in profile

### Feature 2: User List & Search
1. Click "New Chat" in sidebar
2. See list of all users
3. Type in search box
4. List filters in real-time
5. Click user → Opens conversation

### Feature 3: Direct Messages
1. Open conversation with user
2. Type message and send
3. Open same conversation in another browser/device
4. See message appear instantly
5. Reply from other device
6. See reply appear in first device

### Feature 4: Timestamps
1. Send message today → Shows "2:34 PM"
2. Check old message from this year → Shows "Feb 15, 2:34 PM"
3. Check message from last year → Shows "Feb 15, 2023 2:34 PM"

### Feature 5: Empty States
1. New user with no conversations → See "No conversations yet"
2. Open conversation with no messages → See "No messages yet"
3. Search for non-existent user → See "No users found"
4. Desktop with no conversation selected → See "Select a conversation"

---

## Common Patterns Used

### Pattern 1: Conditional Rendering
```typescript
{!data ? (
  <Loading />
) : data.length === 0 ? (
  <EmptyState />
) : (
  <DataDisplay />
)}
```

### Pattern 2: Real-Time Query
```typescript
const data = useQuery(api.queries.getData, { id });
// Automatically updates when database changes
```

### Pattern 3: Mutation with Optimistic UI
```typescript
const mutate = useMutation(api.mutations.doSomething);
await mutate({ args });
// UI updates after mutation completes
```

### Pattern 4: User Filtering
```typescript
const users = allUsers?.filter(u => 
  u.clerkId !== currentUser.clerkId &&
  u.name.toLowerCase().includes(search.toLowerCase())
);
```

---

## Performance Optimizations

1. **Indexes**: All frequently queried fields have indexes
2. **Filtering**: Filter in query, not in component
3. **Sorting**: Sort in query for efficiency
4. **Enrichment**: Fetch related data in single query
5. **Subscriptions**: Only subscribe to needed data

---

## Debugging Tips

1. **Check Convex Dashboard**: See all database operations in real-time
2. **Console Logs**: Add logs to see data flow
3. **React DevTools**: Inspect component state
4. **Network Tab**: See Convex WebSocket connections
5. **Clerk Dashboard**: Check authentication logs

---

This implementation provides a solid foundation for a real-time chat application with all core features working seamlessly together!


---

## Feature 6: Responsive Layout

### Overview
Desktop shows sidebar + chat side by side. Mobile shows conversation list by default, full-screen chat with back button when conversation is selected.

### Implementation Steps

#### 6.1 Detect Mobile vs Desktop
**File:** `components/ChatInterface.tsx`
```typescript
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768);
  checkMobile();
  window.addEventListener("resize", checkMobile);
  return () => window.removeEventListener("resize", checkMobile);
}, []);
```

**Key Points:**
- Uses 768px breakpoint (Tailwind's `md` breakpoint)
- Listens for window resize
- Updates state when screen size changes

#### 6.2 Conditional Layout Logic
**File:** `components/ChatInterface.tsx`
```typescript
const showChat = selectedConversationId && (!isMobile || view === "conversations");
const showSidebar = !isMobile || !selectedConversationId;
```

**Key Points:**
- Desktop: Both sidebar and chat visible
- Mobile: Only one visible at a time
- `showSidebar` is true when no conversation selected on mobile

#### 6.3 Responsive Sidebar Width
**File:** `components/ChatInterface.tsx`
```typescript
<div className={`${isMobile ? "w-full" : "w-80"} bg-white border-r flex flex-col`}>
  {/* Sidebar content */}
</div>
```

**Key Points:**
- Desktop: Fixed 320px width (`w-80`)
- Mobile: Full width (`w-full`)
- Uses Tailwind utility classes

#### 6.4 Left Navigation Sidebar
**File:** `components/ChatInterface.tsx`
```typescript
<div className={`${
  isMobile 
    ? sidebarOpen ? "fixed left-0 top-0 bottom-0 w-64 z-40" : "hidden"
    : "w-16"
} bg-gray-900 flex flex-col py-4 gap-4`}>
  {/* Navigation buttons */}
</div>
```

**Key Points:**
- Desktop: Always visible, 64px wide
- Mobile: Hidden by default, opens as overlay
- Uses `fixed` positioning on mobile for overlay effect

#### 6.5 Back Button in Chat
**File:** `components/ChatWindow.tsx`
```typescript
export function ChatWindow({ conversationId, currentUserId, conversation, onBack }) {
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
        {/* Rest of header */}
      </div>
    </div>
  );
}
```

**Key Points:**
- `onBack` prop only passed on mobile
- Shows back arrow button
- Returns to conversation list

#### 6.6 Pass Back Handler
**File:** `components/ChatInterface.tsx`
```typescript
<ChatWindow
  conversationId={selectedConversationId}
  currentUserId={currentUser._id}
  conversation={selectedConversation}
  onBack={isMobile ? () => setSelectedConversationId(null) : undefined}
/>
```

**Key Points:**
- Only provides `onBack` on mobile
- Clears selected conversation to show list
- Desktop doesn't need back button

---

## Feature 7: Online/Offline Status

### Overview
Green dot indicator shows who's currently online. Updates in real-time.

### Implementation Steps

#### 7.1 Database Schema
**File:** `convex/schema.ts`
```typescript
users: defineTable({
  clerkId: v.string(),
  name: v.string(),
  email: v.string(),
  imageUrl: v.optional(v.string()),
  isOnline: v.boolean(),
  lastSeen: v.number(),
}).index("by_clerk_id", ["clerkId"]),
```

**Key Points:**
- `isOnline` boolean field
- `lastSeen` timestamp for activity tracking
- Index on `clerkId` for fast lookups

#### 7.2 Set User Online
**File:** `convex/mutations.ts`
```typescript
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
```

#### 7.3 Heartbeat System
**File:** `components/ChatInterface.tsx`
```typescript
useEffect(() => {
  if (!user?.id) return;

  setUserOnline({ clerkId: user.id });

  const heartbeat = setInterval(() => {
    setUserOnline({ clerkId: user.id });
  }, 30000); // Every 30 seconds

  const cleanup = setInterval(() => {
    updateUserActivity({});
  }, 15000); // Check inactive users every 15 seconds

  const handleBeforeUnload = () => {
    setUserOffline({ clerkId: user.id });
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    clearInterval(heartbeat);
    clearInterval(cleanup);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    setUserOffline({ clerkId: user.id });
  };
}, [user?.id, setUserOnline, setUserOffline, updateUserActivity]);
```

**Key Points:**
- Sends heartbeat every 30 seconds
- Checks for inactive users every 15 seconds
- Sets offline on page close
- Cleans up on component unmount

#### 7.4 Auto-Offline Detection
**File:** `convex/mutations.ts`
```typescript
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
```

**Key Points:**
- Runs periodically from client
- Marks users offline if no heartbeat for 1 minute
- Catches users who close app without triggering `beforeunload`

#### 7.5 Display Online Indicator
**File:** `components/ConversationList.tsx`
```typescript
{isOnline && (
  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
)}
```

**Key Points:**
- Green dot positioned on avatar
- Only shows for 1-on-1 chats (not groups)
- Updates automatically via Convex subscription

---

## Feature 8: Typing Indicator

### Overview
Shows "Alex is typing..." when other user is typing. Disappears after 2 seconds of inactivity.

### Implementation Steps

#### 8.1 Database Schema
**File:** `convex/schema.ts`
```typescript
typingIndicators: defineTable({
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  isTyping: v.boolean(),
  lastUpdated: v.number(),
}).index("by_conversation", ["conversationId"]),
```

**Key Points:**
- Ephemeral data (can be cleared periodically)
- Tracks who's typing in which conversation
- `lastUpdated` for timeout detection

#### 8.2 Set Typing Status
**File:** `convex/mutations.ts`
```typescript
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
```

#### 8.3 Handle Typing in Input
**File:** `components/ChatWindow.tsx`
```typescript
const typingTimeoutRef = useRef<NodeJS.Timeout>();

const handleTyping = (value: string) => {
  setMessage(value);

  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  if (value.trim()) {
    setTyping({ conversationId, userId: currentUserId, isTyping: true });
    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ conversationId, userId: currentUserId, isTyping: false });
    }, 2000); // Clear after 2 seconds
  } else {
    setTyping({ conversationId, userId: currentUserId, isTyping: false });
  }
};
```

**Key Points:**
- Sets typing to true when user types
- Clears previous timeout
- Auto-clears after 2 seconds of inactivity
- Clears immediately if input is empty

#### 8.4 Clear on Send
**File:** `components/ChatWindow.tsx`
```typescript
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
};
```

**Key Points:**
- Clears typing indicator when message sent
- Prevents "typing..." from lingering

#### 8.5 Query Typing Users
**File:** `convex/queries.ts`
```typescript
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
        now - ind.lastUpdated < 3000 // 3 second timeout
    );

    return await Promise.all(
      activeTyping.map(async (ind) => await ctx.db.get(ind.userId))
    );
  },
});
```

**Key Points:**
- Excludes current user
- Filters by `isTyping` flag
- Checks `lastUpdated` for timeout
- Returns user objects for display

#### 8.6 Display Typing Indicator
**File:** `components/ChatWindow.tsx`
```typescript
const typingUsers = useQuery(api.queries.getTypingUsers, {
  conversationId,
  excludeUserId: currentUserId,
});

// In render:
{typingUsers && typingUsers.length > 0 && (
  <div className="px-4 py-2 text-sm text-gray-500">
    {typingUsers.map((u) => u?.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
  </div>
)}
```

**Key Points:**
- Real-time subscription
- Shows names of typing users
- Handles singular/plural grammar
- Positioned above input field

---

## Feature 9: Unread Message Count

### Overview
Badge shows number of unread messages per conversation. Clears when conversation is opened.

### Implementation Steps

#### 9.1 Track Read Status
**File:** `convex/schema.ts`
```typescript
messages: defineTable({
  conversationId: v.id("conversations"),
  senderId: v.id("users"),
  content: v.string(),
  timestamp: v.number(),
  readBy: v.array(v.id("users")), // Array of user IDs who read the message
  isDeleted: v.boolean(),
}).index("by_conversation", ["conversationId"]),
```

**Key Points:**
- `readBy` array tracks who read each message
- Sender automatically added to `readBy`
- Empty array means unread by everyone except sender

#### 9.2 Calculate Unread Count
**File:** `convex/queries.ts`
```typescript
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
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        const unreadCount = messages.filter(
          (msg) => !msg.readBy.includes(args.userId)
        ).length;

        return { ...conv, unreadCount };
      })
    );

    return enriched;
  },
});
```

**Key Points:**
- Counts messages where user ID not in `readBy`
- Calculated per conversation
- Updates in real-time via subscription

#### 9.3 Display Unread Badge
**File:** `components/ConversationList.tsx`
```typescript
{conv.unreadCount > 0 && (
  <div className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
    {conv.unreadCount}
  </div>
)}
```

**Key Points:**
- Only shows if count > 0
- Blue badge with white text
- Positioned next to last message preview

#### 9.4 Mark as Read on Open
**File:** `components/ChatWindow.tsx`
```typescript
const markConversationAsRead = useMutation(api.mutations.markConversationAsRead);

useEffect(() => {
  if (messages && messages.length > 0) {
    markConversationAsRead({ conversationId, userId: currentUserId });
  }
}, [conversationId, currentUserId, messages, markConversationAsRead]);
```

**Key Points:**
- Runs when conversation opens
- Runs when new messages arrive
- Marks all messages as read

#### 9.5 Mark Conversation as Read Mutation
**File:** `convex/mutations.ts`
```typescript
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
```

**Key Points:**
- Adds user ID to `readBy` array
- Only updates unread messages
- Batch operation for efficiency

---

## Feature 10: Smart Auto-Scroll

### Overview
Auto-scrolls to new messages when at bottom. Shows "↓ New messages" button when scrolled up.

### Implementation Steps

#### 10.1 Track Scroll Position
**File:** `components/ChatWindow.tsx`
```typescript
const [showScrollButton, setShowScrollButton] = useState(false);
const messagesContainerRef = useRef<HTMLDivElement>(null);

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
```

**Key Points:**
- Detects if user is near bottom (within 100px)
- Shows button when scrolled up
- Hides button when at bottom

#### 10.2 Conditional Auto-Scroll
**File:** `components/ChatWindow.tsx`
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!showScrollButton) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, [messages?.length]);
```

**Key Points:**
- Only scrolls if `showScrollButton` is false
- Triggers when new messages arrive
- Smooth scroll animation

#### 10.3 Scroll to Bottom Function
**File:** `components/ChatWindow.tsx`
```typescript
const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  setShowScrollButton(false);
};
```

**Key Points:**
- Manually scrolls to bottom
- Hides the button
- Called by button click

#### 10.4 Display Scroll Button
**File:** `components/ChatWindow.tsx`
```typescript
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
```

**Key Points:**
- Only shows when scrolled up
- Full-width button
- Positioned above input field

#### 10.5 Scroll Anchor
**File:** `components/ChatWindow.tsx`
```typescript
<div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
  {messages?.map((msg) => (
    // Message display
  ))}
  <div ref={messagesEndRef} /> {/* Scroll anchor */}
</div>
```

**Key Points:**
- Empty div at end of messages
- Used as scroll target
- Invisible to user

---

## Advanced Patterns

### Pattern 1: Responsive Conditional Rendering
```typescript
const isMobile = useMediaQuery("(max-width: 768px)");
const showComponent = isMobile ? mobileVersion : desktopVersion;
```

### Pattern 2: Heartbeat System
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    sendHeartbeat();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

### Pattern 3: Debounced Input
```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

const handleInput = (value: string) => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  
  timeoutRef.current = setTimeout(() => {
    performAction(value);
  }, 2000);
};
```

### Pattern 4: Scroll Detection
```typescript
const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = container;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
  setShowButton(!isAtBottom);
};
```

### Pattern 5: Conditional Mutation
```typescript
useEffect(() => {
  if (condition) {
    mutation({ args });
  }
}, [condition, mutation]);
```

---

## Testing Features 6-10

### Feature 6: Responsive Layout
1. Open on desktop → See sidebar + chat side by side
2. Resize to mobile → See conversation list only
3. Select conversation → See full-screen chat with back button
4. Click back → Return to conversation list
5. Resize to desktop → See both panels again

### Feature 7: Online/Offline Status
1. Open app → See green dot next to your name
2. Open in another browser → See green dot appear
3. Close second browser → Wait 1 minute → Green dot disappears
4. Check conversation list → Online users have green dot

### Feature 8: Typing Indicator
1. Open conversation in two browsers
2. Start typing in browser 1
3. See "User is typing..." in browser 2
4. Stop typing → Indicator disappears after 2 seconds
5. Send message → Indicator disappears immediately

### Feature 9: Unread Count
1. Send message from browser 1
2. See unread badge (1) in browser 2's sidebar
3. Open conversation in browser 2
4. Badge disappears
5. Send another message → Badge shows (1) again

### Feature 10: Smart Auto-Scroll
1. Open conversation with many messages
2. Scroll to bottom → New message arrives → Auto-scrolls
3. Scroll up to read old messages
4. New message arrives → See "↓ New messages" button
5. Click button → Scrolls to bottom

---

## Performance Considerations

### 1. Efficient Queries
- Use indexes for all frequent queries
- Filter in database, not in component
- Limit data fetched (pagination if needed)

### 2. Debouncing
- Typing indicator uses 2-second debounce
- Search uses real-time filtering (fast enough)
- Heartbeat uses 30-second interval

### 3. Cleanup
- Clear intervals on unmount
- Remove event listeners
- Cancel pending timeouts

### 4. Conditional Rendering
- Only render visible components
- Use `&&` for conditional display
- Lazy load heavy components

### 5. Optimistic Updates
- Update UI immediately
- Sync with database in background
- Revert on error

---

## Common Issues & Solutions

### Issue 1: Typing indicator doesn't clear
**Solution:** Check timeout is being cleared properly
```typescript
if (timeoutRef.current) clearTimeout(timeoutRef.current);
```

### Issue 2: Unread count not updating
**Solution:** Ensure `markConversationAsRead` is called
```typescript
useEffect(() => {
  if (messages) markConversationAsRead({ conversationId, userId });
}, [conversationId, messages]);
```

### Issue 3: Auto-scroll not working
**Solution:** Check scroll detection threshold
```typescript
const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
```

### Issue 4: Online status stuck
**Solution:** Verify heartbeat and cleanup intervals
```typescript
const heartbeat = setInterval(() => setUserOnline(), 30000);
const cleanup = setInterval(() => updateUserActivity(), 15000);
```

### Issue 5: Mobile layout broken
**Solution:** Check breakpoint and conditional logic
```typescript
const isMobile = window.innerWidth < 768;
const showSidebar = !isMobile || !selectedConversationId;
```

---

## Summary

All 10 core features are now fully implemented:

1. ✅ Authentication with Clerk
2. ✅ User List & Search
3. ✅ Direct Messages
4. ✅ Message Timestamps
5. ✅ Empty States
6. ✅ Responsive Layout
7. ✅ Online/Offline Status
8. ✅ Typing Indicator
9. ✅ Unread Count
10. ✅ Smart Auto-Scroll

The application provides a complete, production-ready chat experience with real-time updates, responsive design, and excellent user experience!


---

## Feature 11: Delete Own Messages

### Overview
Users can delete their own messages. Shows "This message was deleted" for all users. Uses soft delete (record remains in database).

### Implementation Steps

#### 11.1 Database Schema
**File:** `convex/schema.ts`
```typescript
messages: defineTable({
  conversationId: v.id("conversations"),
  senderId: v.id("users"),
  content: v.string(),
  timestamp: v.number(),
  readBy: v.array(v.id("users")),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
}).index("by_conversation", ["conversationId"]),
```

**Key Points:**
- `isDeleted` flag for soft delete
- `deletedAt` timestamp for audit trail
- Record stays in database

#### 11.2 Delete Message Mutation
**File:** `convex/mutations.ts`
```typescript
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
```

**Key Points:**
- Verifies user is the sender
- Sets `isDeleted` to true
- Records deletion timestamp
- Doesn't actually delete record

#### 11.3 Display Deleted Message
**File:** `components/ChatWindow.tsx`
```typescript
<div className={`px-4 py-2 rounded-lg ${
  isOwn ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
} ${msg.isDeleted ? "italic" : ""}`}>
  {msg.isDeleted ? "This message was deleted" : msg.content}
</div>
```

**Key Points:**
- Checks `isDeleted` flag
- Shows placeholder text in italics
- Maintains message bubble styling

#### 11.4 Delete Button UI
**File:** `components/ChatWindow.tsx`
```typescript
{!msg.isDeleted && hoveredMessageId === msg._id && (
  <button onClick={() => setMenuOpen(msg._id)}>
    {/* Three dots menu */}
  </button>
)}

{menuOpen === msg._id && isOwn && (
  <div className="menu">
    <button onClick={async () => {
      await deleteMessage({ messageId: msg._id, userId: currentUserId });
      setMenuOpen(null);
    }}>
      Delete
    </button>
  </div>
)}
```

**Key Points:**
- Only shows for own messages
- Hidden for already deleted messages
- Appears on hover
- Closes menu after delete

---

## Feature 12: Message Reactions

### Overview
Users can react with 5 emojis (👍 ❤️ 😂 😮 😢). Toggle on/off. Shows count below message.

### Implementation Steps

#### 12.1 Database Schema
**File:** `convex/schema.ts`
```typescript
reactions: defineTable({
  messageId: v.id("messages"),
  userId: v.id("users"),
  emoji: v.string(),
  timestamp: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_user_and_message", ["userId", "messageId"]),
```

**Key Points:**
- Separate table for reactions
- Links to message and user
- Indexes for efficient queries

#### 12.2 Toggle Reaction Mutation
**File:** `convex/mutations.ts`
```typescript
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
      await ctx.db.delete(existing._id); // Remove reaction
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
```

**Key Points:**
- Checks if reaction exists
- Deletes if exists (toggle off)
- Inserts if doesn't exist (toggle on)
- One reaction per user per emoji per message

#### 12.3 Get Reactions in Query
**File:** `convex/queries.ts`
```typescript
export const getMessages = query({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        // Group reactions by emoji
        const reactionGroups = reactions.reduce((acc, reaction) => {
          const key = `reaction_${reaction.emoji.codePointAt(0)}`;
          if (!acc[key]) {
            acc[key] = { emoji: reaction.emoji, userIds: [] };
          }
          acc[key].userIds.push(reaction.userId as string);
          return acc;
        }, {} as Record<string, { emoji: string; userIds: string[] }>);

        return {
          ...msg,
          sender,
          reactions: Object.values(reactionGroups),
        };
      })
    );

    return enriched.sort((a, b) => a.timestamp - b.timestamp);
  },
});
```

**Key Points:**
- Fetches reactions for each message
- Groups by emoji
- Includes user IDs for each reaction
- Returns count and list

#### 12.4 Display Reactions
**File:** `components/ChatWindow.tsx`
```typescript
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

// In message menu:
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

// Below message:
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
```

**Key Points:**
- Fixed set of 5 emojis
- Shows in message menu
- Displays count below message
- Highlights if current user reacted
- Click to toggle on/off

---

## Feature 13: Loading & Error States

### Overview
Show loading spinners while data loads. Handle errors gracefully. Convex provides automatic retry.

### Implementation Steps

#### 13.1 Loading States
**File:** `components/ChatWindow.tsx`
```typescript
const messages = useQuery(api.queries.getMessages, { conversationId, userId: currentUserId });

return (
  <div>
    {!messages ? (
      <div className="text-center text-gray-500">Loading messages...</div>
    ) : messages.length === 0 ? (
      <div className="text-center text-gray-500 mt-8">
        <p>No messages yet</p>
        <p className="text-sm mt-2">Send a message to start the conversation</p>
      </div>
    ) : (
      messages.map((msg) => (
        // Display message
      ))
    )}
  </div>
);
```

**Key Points:**
- Three states: loading, empty, data
- `undefined` means loading
- Empty array means no data
- Array with items means data loaded

#### 13.2 Loading Spinner Component
**File:** `components/ChatInterface.tsx`
```typescript
if (!currentUser) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

**Key Points:**
- Tailwind's `animate-spin` utility
- Centered on screen
- Shows while user data loads

#### 13.3 Convex Error Handling
**Convex automatically handles:**
- Network errors → Automatic retry with exponential backoff
- Connection loss → Reconnects automatically
- Failed mutations → Retries up to 3 times
- Query failures → Shows last known data

**No additional code needed!**

#### 13.4 Manual Error Handling (Optional)
**File:** `components/ChatWindow.tsx`
```typescript
const [error, setError] = useState<string | null>(null);

const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!message.trim()) return;

  try {
    await sendMessage({
      conversationId,
      senderId: currentUserId,
      content: message.trim(),
    });
    setMessage("");
    setError(null);
  } catch (err) {
    setError("Failed to send message. Please try again.");
    console.error(err);
  }
};

// Display error:
{error && (
  <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
    {error}
    <button onClick={() => setError(null)} className="ml-2 underline">
      Dismiss
    </button>
  </div>
)}
```

**Key Points:**
- Try-catch for mutations
- Display error message
- Allow dismissal
- Convex usually handles this automatically

---

## Feature 14: Group Chat

### Overview
Create groups with multiple members and custom names. All members see messages in real-time.

### Implementation Steps

#### 14.1 Database Schema
**File:** `convex/schema.ts`
```typescript
conversations: defineTable({
  participants: v.array(v.id("users")),
  isGroup: v.boolean(),
  groupName: v.optional(v.string()),
  lastMessageTime: v.optional(v.number()),
}).index("by_last_message", ["lastMessageTime"]),
```

**Key Points:**
- `isGroup` flag distinguishes groups from 1-on-1
- `groupName` for custom group names
- `participants` array can have 2+ users

#### 14.2 Create Group Mutation
**File:** `convex/mutations.ts`
```typescript
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
```

**Key Points:**
- Takes array of participant IDs
- Requires group name
- Sets `isGroup` to true

#### 14.3 CreateGroup Component
**File:** `components/CreateGroup.tsx`
```typescript
export function CreateGroup({ currentUserId, onCreateGroup }) {
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allUsers = useQuery(api.queries.getAllUsers, { excludeClerkId: user.id });

  const filteredUsers = allUsers?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: Id<"users">) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (groupName.trim()) {
      onCreateGroup([currentUserId, ...selectedUsers], groupName.trim());
      setSelectedUsers([]);
      setGroupName("");
    }
  };

  return (
    <div>
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group name"
      />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search users..."
      />
      
      {/* Selected users display */}
      {selectedUsers.length > 0 && (
        <div>
          Selected: {selectedUsers.length} user(s)
        </div>
      )}

      {/* User list with checkboxes */}
      {filteredUsers?.map((user) => (
        <button key={user._id} onClick={() => toggleUser(user._id)}>
          <input
            type="checkbox"
            checked={selectedUsers.includes(user._id)}
            readOnly
          />
          {user.name}
        </button>
      ))}

      <button
        onClick={handleCreate}
        disabled={!groupName.trim()}
      >
        Create Group ({selectedUsers.length + 1} members)
      </button>
    </div>
  );
}
```

**Key Points:**
- Multi-select with checkboxes
- Search to filter users
- Shows selected count
- Includes current user automatically
- Requires group name

#### 14.4 Display Group in Sidebar
**File:** `components/ConversationList.tsx`
```typescript
const displayName = conv.isGroup
  ? conv.groupName || "Group Chat"
  : conv.otherUser?.name || "Unknown User";

const displayImage = conv.isGroup ? null : conv.otherUser?.imageUrl;

return (
  <button onClick={() => onSelectConversation(conv._id)}>
    {displayImage ? (
      <img src={displayImage} alt={displayName} />
    ) : (
      <div className="w-12 h-12 rounded-full bg-blue-500 text-white">
        {displayName.charAt(0).toUpperCase()}
      </div>
    )}
    <div>
      <div>{displayName}</div>
      {conv.isGroup && (
        <div className="text-xs text-gray-500">
          {conv.participants.length} members
        </div>
      )}
    </div>
  </button>
);
```

**Key Points:**
- Shows group name or fallback
- Shows first letter as avatar for groups
- Displays member count
- Different styling from 1-on-1

#### 14.5 Group Messages Work Automatically
**No changes needed!** Messages work the same way:
- `sendMessage` mutation works for groups
- All participants see messages in real-time
- Typing indicators work in groups
- Reactions work in groups
- Everything just works!

---

## Complete Feature Summary

### Core Features (1-5)
1. ✅ Authentication with Clerk
2. ✅ User List & Search
3. ✅ Direct Messages
4. ✅ Message Timestamps
5. ✅ Empty States

### Required Features (6-10)
6. ✅ Responsive Layout
7. ✅ Online/Offline Status
8. ✅ Typing Indicator
9. ✅ Unread Count
10. ✅ Smart Auto-Scroll

### Optional Features (11-14)
11. ✅ Delete Own Messages
12. ✅ Message Reactions
13. ✅ Loading & Error States
14. ✅ Group Chat

---

## Architecture Overview

### Data Flow
```
User Action
    ↓
Component (React)
    ↓
Mutation/Query (Convex)
    ↓
Database (Convex)
    ↓
Real-time Subscription
    ↓
All Connected Clients Update
```

### Component Hierarchy
```
App
└── ChatInterface
    ├── Sidebar (Navigation)
    ├── ConversationList
    │   └── Conversation Items
    ├── UserList
    │   └── User Items
    ├── CreateGroup
    │   └── User Selection
    └── ChatWindow
        ├── Message List
        ├── Typing Indicator
        └── Message Input
```

### Database Tables
```
users
  ├── conversations (many-to-many via participants array)
  │   └── messages
  │       └── reactions
  └── typingIndicators
```

---

## Best Practices Used

### 1. Soft Delete Pattern
```typescript
// Don't delete:
await ctx.db.delete(messageId);

// Do mark as deleted:
await ctx.db.patch(messageId, { isDeleted: true, deletedAt: Date.now() });
```

### 2. Toggle Pattern
```typescript
const existing = await findExisting();
if (existing) {
  await delete(existing);
} else {
  await insert(new);
}
```

### 3. Permission Checks
```typescript
const message = await ctx.db.get(messageId);
if (message && message.senderId === userId) {
  // Allow action
}
```

### 4. Real-time Subscriptions
```typescript
const data = useQuery(api.queries.getData, { args });
// Automatically updates when database changes
```

### 5. Conditional Rendering
```typescript
{!data ? <Loading /> : data.length === 0 ? <Empty /> : <Display />}
```

---

## Testing All Features

### Feature 11: Delete Messages
1. Send a message
2. Hover over message → Click three dots
3. Click "Delete"
4. See "This message was deleted" in italics
5. Check database → Record still exists with `isDeleted: true`

### Feature 12: Reactions
1. Hover over any message
2. Click three dots → See emoji picker
3. Click 👍 → Reaction appears below message
4. Click 👍 again → Reaction disappears
5. Other user can also react → Count increases

### Feature 13: Loading States
1. Refresh page → See loading spinner
2. Open conversation → See "Loading messages..."
3. Wait for data → See messages appear
4. Open empty conversation → See "No messages yet"

### Feature 14: Group Chat
1. Click "Create Group" in sidebar
2. Enter group name
3. Select multiple users with checkboxes
4. Click "Create Group"
5. See group in sidebar with member count
6. Send message → All members see it in real-time

---

## Performance Tips

### 1. Batch Operations
```typescript
// Instead of multiple patches:
for (const item of items) {
  await ctx.db.patch(item._id, { field: value });
}

// Better: Use Promise.all for parallel execution
await Promise.all(
  items.map(item => ctx.db.patch(item._id, { field: value }))
);
```

### 2. Efficient Queries
```typescript
// Use indexes:
.withIndex("by_field", (q) => q.eq("field", value))

// Filter in database, not in component:
.filter((q) => q.eq(q.field("status"), "active"))
```

### 3. Minimize Re-renders
```typescript
// Memoize expensive computations:
const sortedData = useMemo(() => 
  data?.sort((a, b) => b.timestamp - a.timestamp),
  [data]
);
```

### 4. Lazy Loading
```typescript
// Only load what's needed:
const messages = useQuery(
  api.queries.getMessages,
  selectedConversationId ? { conversationId: selectedConversationId } : "skip"
);
```

---

## Deployment Checklist

### Before Deploying:
- [ ] All features tested locally
- [ ] Environment variables configured
- [ ] Convex schema deployed
- [ ] Clerk webhooks configured
- [ ] Error handling tested
- [ ] Mobile responsive tested
- [ ] Loading states verified
- [ ] Empty states verified

### Deployment Steps:
1. Push code to GitHub
2. Deploy Convex: `npx convex deploy`
3. Deploy to Vercel
4. Add environment variables in Vercel
5. Test production deployment
6. Monitor for errors

---

## Congratulations! 🎉

You now have a fully functional, production-ready real-time chat application with:

- **14 complete features**
- **Real-time updates** via Convex
- **Secure authentication** via Clerk
- **Responsive design** for mobile and desktop
- **Professional UI/UX** with Tailwind CSS
- **Scalable architecture** ready for growth

This implementation demonstrates modern web development best practices and can serve as a foundation for more complex applications!


---

## Feature 11: Delete Own Messages

### Overview
Users can delete their own messages. Shows "This message was deleted" in italics. Uses soft delete (record stays in database).

### How It's Implemented

#### Database Schema
- **File:** `convex/schema.ts`
- Added `isDeleted: v.boolean()` field to messages table
- Added `deletedAt: v.optional(v.number())` to track when deleted
- Message record stays in database, just flagged as deleted

#### Delete Mutation
- **File:** `convex/mutations.ts` - `deleteMessage` mutation
- Checks if user is the sender before allowing delete
- Sets `isDeleted: true` and `deletedAt: Date.now()`
- Does NOT remove record from database (soft delete)

#### UI Implementation
- **File:** `components/ChatWindow.tsx`
- Three-dot menu button appears on hover over own messages
- Menu shows "Delete" option
- Calls `deleteMessage` mutation with messageId and userId
- Verifies ownership on backend before deleting

#### Display Deleted Messages
- **File:** `components/ChatWindow.tsx`
- Checks `msg.isDeleted` flag
- If true, shows "This message was deleted" in italic style
- Uses conditional rendering: `{msg.isDeleted ? "This message was deleted" : msg.content}`
- Applies italic class: `${msg.isDeleted ? "italic" : ""}`

#### Why Soft Delete?
- Maintains conversation history integrity
- Allows for potential recovery/audit
- Keeps message count accurate
- Preserves conversation flow

---

## Feature 12: Message Reactions

### Overview
Users can react with 5 emojis (👍 ❤️ 😂 😮 😢). Click again to remove. Shows count below message.

### How It's Implemented

#### Database Schema
- **File:** `convex/schema.ts`
- Separate `reactions` table with fields:
  - `messageId: v.id("messages")`
  - `userId: v.id("users")`
  - `emoji: v.string()`
  - `timestamp: v.number()`
- Indexes: `by_message` and `by_user_and_message` for fast queries

#### Toggle Reaction Mutation
- **File:** `convex/mutations.ts` - `toggleReaction` mutation
- Checks if user already reacted with that emoji
- If exists: deletes the reaction (remove)
- If not exists: inserts new reaction (add)
- Toggle behavior: click once to add, click again to remove

#### Reaction UI
- **File:** `components/ChatWindow.tsx`
- Fixed emoji set: `const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"]`
- Three-dot menu shows "React" option
- Clicking opens emoji picker with 5 options
- Each emoji is a clickable button

#### Fetching Reactions
- **File:** `convex/queries.ts` - `getMessages` query
- Enriches each message with reactions
- Groups reactions by emoji
- Counts how many users reacted with each emoji
- Returns array like: `[{emoji: "👍", userIds: ["id1", "id2"]}]`

#### Display Reactions
- **File:** `components/ChatWindow.tsx`
- Shows below message content
- Each reaction shows emoji + count
- Highlights if current user reacted (blue background)
- Clicking reaction calls `toggleReaction` to add/remove

---

## Feature 13: Loading & Error States

### Overview
Shows spinners while loading. Handles errors gracefully. Convex provides built-in retry logic.

### How It's Implemented

#### Loading States
- **All Query Components** use pattern:
  ```
  {!data ? <Loading /> : data.length === 0 ? <Empty /> : <Display />}
  ```
- Three states: undefined (loading), empty array, data present

#### Specific Loading Implementations

**ChatWindow Messages:**
- **File:** `components/ChatWindow.tsx`
- Shows "Loading messages..." when `messages` is undefined
- Shows "No messages yet" when array is empty
- Shows messages when data exists

**ConversationList:**
- **File:** `components/ConversationList.tsx`
- Shows "Loading conversations..." spinner
- Shows empty state with icon when no conversations
- Shows list when data exists

**UserList:**
- **File:** `components/UserList.tsx`
- Shows "Loading users..." when fetching
- Shows "No users found" or "No other users yet"
- Shows user list when data exists

**ChatInterface:**
- **File:** `components/ChatInterface.tsx`
- Shows loading spinner while `currentUser` is undefined
- Prevents rendering until user data loaded
- Displays "Loading..." with animated spinner

#### Error Handling
- **Convex Built-in:** Mutations automatically retry on failure
- **Network Errors:** Convex handles reconnection automatically
- **Exponential Backoff:** Failed requests retry with increasing delays
- **No Manual Error Handling Needed:** Convex manages this internally

#### Why No Explicit Error UI?
- Convex provides automatic retry mechanism
- WebSocket reconnects automatically on network issues
- Mutations queue and retry when connection restored
- Queries re-fetch when connection re-established
- User sees loading state during retry, not error

---

## Feature 14: Group Chat

### Overview
Create groups with multiple members and custom name. All members see messages in real-time. Shows group name and member count.

### How It's Implemented

#### Database Schema
- **File:** `convex/schema.ts`
- `conversations` table has:
  - `isGroup: v.boolean()` - distinguishes group from 1-on-1
  - `groupName: v.optional(v.string())` - custom group name
  - `participants: v.array(v.id("users"))` - array of member IDs
- Same messages table works for both 1-on-1 and groups

#### Create Group Mutation
- **File:** `convex/mutations.ts` - `createGroupConversation` mutation
- Takes `participantIds` array and `groupName` string
- Creates conversation with `isGroup: true`
- Stores all member IDs in participants array

#### CreateGroup Component
- **File:** `components/CreateGroup.tsx`
- Shows all users with checkboxes
- Input field for group name
- Search bar to filter users
- Selected users shown as chips with X to remove
- "Create Group" button shows member count
- Calls `createGroupConversation` with selected IDs + current user

#### Group Display in Sidebar
- **File:** `components/ConversationList.tsx`
- Checks `conv.isGroup` flag
- If group: shows `groupName` or "Group Chat" fallback
- If 1-on-1: shows other user's name
- Group icon shows first letter of group name
- No online status for groups (only for 1-on-1)

#### Group Messages
- **File:** `components/ChatWindow.tsx`
- Works exactly like 1-on-1 messages
- All participants see messages in real-time
- Sender name shown for each message
- Typing indicators work for groups
- Reactions work for groups

#### Navigation to Create Group
- **File:** `components/ChatInterface.tsx`
- Left sidebar has "Create Group" button
- Clicking opens CreateGroup component
- After creation, switches to conversation view
- New group appears in conversation list

#### Member Count Display
- **File:** `components/CreateGroup.tsx`
- Button text: "Create Group (3 members)"
- Updates dynamically as users selected/deselected
- Includes current user in count

---

## Features 11-14 Summary

### Feature 11: Delete Messages
- **Database:** Soft delete with `isDeleted` flag
- **UI:** Three-dot menu → Delete option
- **Display:** "This message was deleted" in italics
- **Security:** Backend verifies user is sender

### Feature 12: Reactions
- **Database:** Separate reactions table
- **Emojis:** Fixed set of 5 emojis
- **Toggle:** Click to add, click again to remove
- **Display:** Shows emoji + count below message

### Feature 13: Loading States
- **Pattern:** `!data ? Loading : empty ? Empty : Display`
- **Locations:** All query components
- **Errors:** Handled automatically by Convex
- **Retry:** Built-in exponential backoff

### Feature 14: Group Chat
- **Database:** `isGroup` flag + `groupName` field
- **Creation:** Multi-select users + name input
- **Display:** Group name + member count
- **Messages:** Same as 1-on-1, works for all members

---

## Complete Feature List (14/14 Implemented)

### Core Features (1-5)
1. ✅ Authentication with Clerk
2. ✅ User List & Search
3. ✅ One-on-One Direct Messages
4. ✅ Message Timestamps
5. ✅ Empty States

### Advanced Features (6-10)
6. ✅ Responsive Layout
7. ✅ Online/Offline Status
8. ✅ Typing Indicator
9. ✅ Unread Message Count
10. ✅ Smart Auto-Scroll

### Optional Features (11-14)
11. ✅ Delete Own Messages
12. ✅ Message Reactions
13. ✅ Loading & Error States
14. ✅ Group Chat

---

## Architecture Overview

### Tech Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Convex (real-time database)
- **Authentication:** Clerk
- **Deployment:** Vercel

### Database Tables
1. **users** - User profiles with online status
2. **conversations** - 1-on-1 and group chat metadata
3. **messages** - All messages with soft delete
4. **typingIndicators** - Real-time typing status
5. **reactions** - Message reactions

### Key Technologies

**Convex Real-Time:**
- WebSocket-based subscriptions
- Automatic re-renders on data changes
- No polling or manual refresh
- Built-in retry and error handling

**Clerk Authentication:**
- Email and social login
- User management
- Session handling
- Profile data

**Tailwind CSS:**
- Responsive breakpoints (md: 768px)
- Utility-first styling
- Mobile-first approach
- Dark mode support

### Data Flow Pattern
```
User Action → Component → Mutation → Database
                ↓
Database → Query → Subscription → Component → UI Update
```

### Component Hierarchy
```
App (Clerk + Convex Providers)
└── ChatInterface (Main Container)
    ├── Left Sidebar (Navigation)
    ├── Middle Panel (Conversations/Users/Groups)
    └── Right Panel (Chat Window)
        ├── Header (User info, back button)
        ├── Messages (Scrollable list)
        ├── Typing Indicator
        └── Input (Send message)
```

---

## Testing All Features

### Quick Test Checklist

**Authentication (1):**
- [ ] Sign up with email
- [ ] Sign in with Google
- [ ] See profile with avatar
- [ ] Sign out

**User Discovery (2):**
- [ ] See all users
- [ ] Search by name
- [ ] Click user to chat

**Messaging (3):**
- [ ] Send message
- [ ] Receive in real-time
- [ ] See in conversation list

**Timestamps (4):**
- [ ] Today shows time only
- [ ] This year shows date + time
- [ ] Last year shows year

**Empty States (5):**
- [ ] No conversations message
- [ ] No messages message
- [ ] No search results

**Responsive (6):**
- [ ] Desktop: sidebar + chat
- [ ] Mobile: list or chat
- [ ] Back button on mobile

**Online Status (7):**
- [ ] Green dot when online
- [ ] Disappears when offline
- [ ] Updates in real-time

**Typing (8):**
- [ ] Shows "typing..."
- [ ] Clears after 2 seconds
- [ ] Clears on send

**Unread Count (9):**
- [ ] Badge shows count
- [ ] Clears when opened
- [ ] Updates in real-time

**Auto-Scroll (10):**
- [ ] Scrolls to new messages
- [ ] Shows button when scrolled up
- [ ] Button scrolls to bottom

**Delete Messages (11):**
- [ ] Delete own message
- [ ] Shows "deleted" text
- [ ] Can't delete others' messages

**Reactions (12):**
- [ ] Add reaction
- [ ] Remove reaction
- [ ] See count

**Loading States (13):**
- [ ] Spinners while loading
- [ ] Empty state messages
- [ ] No blank screens

**Group Chat (14):**
- [ ] Create group
- [ ] Name group
- [ ] Add members
- [ ] See messages in real-time

---

## Performance Best Practices

### Database Optimization
- **Indexes:** All frequently queried fields indexed
- **Filtering:** Done in queries, not components
- **Sorting:** Server-side for efficiency
- **Pagination:** Ready for large datasets

### Frontend Optimization
- **Conditional Rendering:** Only render visible components
- **Debouncing:** Typing indicator uses 2s debounce
- **Memoization:** React hooks prevent unnecessary re-renders
- **Lazy Loading:** Components load on demand

### Real-Time Optimization
- **Selective Subscriptions:** Only subscribe to needed data
- **Efficient Queries:** Fetch related data in single query
- **Heartbeat Intervals:** 30s for online status
- **Cleanup Intervals:** 15s for inactive users

---

## Common Troubleshooting

### Issue: Messages not appearing
**Check:** Convex WebSocket connection in Network tab
**Solution:** Ensure `NEXT_PUBLIC_CONVEX_URL` is correct

### Issue: User not syncing
**Check:** Clerk user ID in database
**Solution:** Verify `syncUser` is called on login

### Issue: Typing indicator stuck
**Check:** Timeout is clearing properly
**Solution:** Clear timeout on unmount

### Issue: Unread count wrong
**Check:** `markConversationAsRead` is called
**Solution:** Call when conversation opens

### Issue: Reactions not toggling
**Check:** User ID and message ID match
**Solution:** Verify compound index exists

### Issue: Group not showing
**Check:** `isGroup` flag is true
**Solution:** Use `createGroupConversation` mutation

### Issue: Mobile layout broken
**Check:** Breakpoint detection
**Solution:** Verify `window.innerWidth < 768`

### Issue: Online status not updating
**Check:** Heartbeat and cleanup intervals
**Solution:** Ensure intervals are running

---

## Deployment Checklist

### Environment Variables
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CONVEX_DEPLOYMENT`
- [ ] `NEXT_PUBLIC_CONVEX_URL`

### Convex Setup
- [ ] Run `npx convex deploy`
- [ ] Verify schema is deployed
- [ ] Check indexes are created
- [ ] Test mutations and queries

### Clerk Setup
- [ ] Configure production domain
- [ ] Enable OAuth providers
- [ ] Set redirect URLs
- [ ] Test authentication flow

### Vercel Deployment
- [ ] Connect GitHub repository
- [ ] Add environment variables
- [ ] Deploy to production
- [ ] Test all features live

---

## Conclusion

This MyChat application demonstrates a complete, production-ready real-time messaging system with:

- **14 Core Features** fully implemented
- **Real-time updates** via Convex subscriptions
- **Responsive design** for mobile and desktop
- **Secure authentication** with Clerk
- **Optimized performance** with proper indexing
- **Error handling** with automatic retry
- **Clean architecture** with separation of concerns

The implementation follows best practices for:
- Database design
- Component structure
- State management
- Real-time synchronization
- User experience
- Performance optimization

All features work seamlessly together to provide a smooth, modern chat experience comparable to professional messaging applications.
