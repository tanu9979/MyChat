"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { UserList } from "./UserList";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { UserButton } from "@clerk/nextjs";
import { CreateGroup } from "./CreateGroup";
import { ThemeToggle } from "./ThemeToggle";

/**
 * ChatInterface component - Main application layout
 * Manages: Navigation, user sync, online status, responsive design
 * Layout: Left sidebar (64px) + Conversation list (320px) + Chat window
 */
export function ChatInterface() {
  const { user } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [view, setView] = useState<"conversations" | "newchat" | "creategroup" | "profile">("conversations");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mutations for user and conversation management
  const syncUser = useMutation(api.mutations.syncUser);
  const setUserOnline = useMutation(api.mutations.setUserOnline);
  const setUserOffline = useMutation(api.mutations.setUserOffline);
  const updateUserActivity = useMutation(api.mutations.updateUserActivity);
  const createConversation = useMutation(api.mutations.createConversation);
  const createGroupConversation = useMutation(api.mutations.createGroupConversation);
  const unhideConversation = useMutation(api.mutations.unhideConversation);
  
  // Real-time queries
  const currentUser = useQuery(
    api.queries.getCurrentUser,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const conversations = useQuery(
    api.queries.getUserConversations,
    currentUser ? { userId: currentUser._id } : "skip"
  );
  const allConversations = useQuery(
    api.queries.getAllConversations,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  // Sync Clerk user data to Convex database on first load
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

  // Detect mobile viewport (breakpoint: 768px)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Online status management with heartbeat
  // - Sets user online on mount
  // - Heartbeat every 30 seconds to maintain online status
  // - Cleanup check every 15 seconds to mark inactive users offline
  // - Sets user offline on unmount/page close
  useEffect(() => {
    if (!user?.id) return;

    setUserOnline({ clerkId: user.id });

    const heartbeat = setInterval(() => {
      setUserOnline({ clerkId: user.id });
    }, 30000); // Update every 30 seconds

    const cleanup = setInterval(() => {
      updateUserActivity({});
    }, 15000); // Check for inactive users every 15 seconds

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

  const selectedConversation = conversations?.find(c => c._id === selectedConversationId);
  const showChat = selectedConversationId && (!isMobile || view === "conversations");
  const showSidebar = !isMobile || !selectedConversationId;

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      {/* Left Sidebar - Desktop: Always visible, Mobile: Overlay */}
      <div className={`${
        isMobile 
          ? sidebarOpen ? "fixed left-0 top-0 bottom-0 w-64 z-40" : "hidden"
          : "w-16"
      } bg-background border-r border-gray-border flex flex-col py-4 gap-4 transition-colors duration-300`}>
        {isMobile && (
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-white font-semibold text-lg">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <button
          onClick={() => { setView("conversations"); setSelectedConversationId(null); if(isMobile) setSidebarOpen(false); }}
          className={`${isMobile ? "w-full px-4 py-3 justify-start" : "w-12 h-12 mx-auto"} rounded-lg flex items-center ${isMobile ? "gap-3" : "justify-center"} transition ${
            view === "conversations" ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : isMobile ? "text-muted-foreground hover:bg-muted" : "bg-gray-card text-muted-foreground hover:bg-gray-border"
          }`}
          title="Conversations"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {isMobile && <span className="font-medium">Conversations</span>}
        </button>
        <button
          onClick={() => { setView("newchat"); setSelectedConversationId(null); if(isMobile) setSidebarOpen(false); }}
          className={`${isMobile ? "w-full px-4 py-3 justify-start" : "w-12 h-12 mx-auto"} rounded-lg flex items-center ${isMobile ? "gap-3" : "justify-center"} transition ${
            view === "newchat" ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20" : isMobile ? "text-muted-foreground hover:bg-muted" : "bg-gray-card text-muted-foreground hover:bg-gray-border"
          }`}
          title="New Chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isMobile && <span className="font-medium">New Chat</span>}
        </button>
        <button
          onClick={() => { setView("creategroup"); setSelectedConversationId(null); if(isMobile) setSidebarOpen(false); }}
          className={`${isMobile ? "w-full px-4 py-3 justify-start" : "w-12 h-12 mx-auto"} rounded-lg flex items-center ${isMobile ? "gap-3" : "justify-center"} transition ${
            view === "creategroup" ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20" : isMobile ? "text-muted-foreground hover:bg-muted" : "bg-gray-card text-muted-foreground hover:bg-gray-border"
          }`}
          title="Create Group"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {isMobile && <span className="font-medium">Create Group</span>}
        </button>
        <div className="flex-1"></div>
        <button
          onClick={() => { setView("profile"); setSelectedConversationId(null); if(isMobile) setSidebarOpen(false); }}
          className={`${isMobile ? "w-full px-4 py-3 justify-start" : "w-12 h-12 mx-auto"} rounded-lg flex items-center ${isMobile ? "gap-3" : "justify-center"} transition ${
            view === "profile" ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : isMobile ? "text-muted-foreground hover:bg-muted" : "bg-gray-card text-muted-foreground hover:bg-gray-border"
          }`}
          title="Profile"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {isMobile && <span className="font-medium">Profile</span>}
        </button>
        <div className="flex flex-col items-center gap-4 mt-auto">
          {!isMobile && <ThemeToggle />}
          {isMobile && (
            <div className="px-4 py-3 w-full border-t border-gray-border flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      {showSidebar && (
        <div className={`${isMobile ? "w-full" : "w-80"} bg-gray-card border-r border-gray-border flex flex-col transition-colors duration-300`}>
          <div className="p-4 border-b border-gray-border flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"
                title="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-bold flex-1 text-foreground transition-colors">
              {view === "conversations" && "Conversations"}
              {view === "newchat" && "New Chat"}
              {view === "creategroup" && "Create Group"}
              {view === "profile" && "Profile"}
            </h1>
          </div>
          {view === "conversations" && (
            <ConversationList
              currentUserId={currentUser._id}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
            />
          )}
          {view === "newchat" && (
            <UserList
              currentUserId={currentUser._id}
              onSelectUser={async (otherUserId) => {
                const existing = allConversations?.find(
                  (conv) =>
                    !conv.isGroup &&
                    conv.participants.length === 2 &&
                    conv.participants.includes(otherUserId)
                );
                
                if (existing) {
                  await unhideConversation({ conversationId: existing._id, userId: currentUser._id });
                  setSelectedConversationId(existing._id);
                } else {
                  const conv = await createConversation({
                    participantIds: [currentUser._id, otherUserId],
                  });
                  setSelectedConversationId(conv);
                }
                setView("conversations");
              }}
            />
          )}
          {view === "creategroup" && (
            <CreateGroup
              currentUserId={currentUser._id}
              onCreateGroup={async (participantIds, groupName) => {
                const conv = await createGroupConversation({
                  participantIds,
                  groupName,
                });
                setSelectedConversationId(conv);
                setView("conversations");
              }}
            />
          )}
          {view === "profile" && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                  {currentUser.imageUrl ? (
                    <img
                      src={currentUser.imageUrl}
                      alt={currentUser.name}
                      className="w-32 h-32 rounded-full border-4 border-brand-purple"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white text-5xl font-semibold border-4 border-[#1a1a1a]">
                      {currentUser.name[0]}
                    </div>
                  )}
                </div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2 text-foreground">{currentUser.name}</h2>
                  <p className="text-muted-foreground text-lg">{currentUser.email}</p>
                </div>
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-foreground font-semibold">Account Settings</p>
                        <p className="text-muted-foreground text-sm">Manage your account</p>
                      </div>
                    </div>
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-10 h-10",
                        },
                      }}
                    />
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-foreground font-semibold">Status</p>
                        <p className="text-green-500 text-sm">Online</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showChat ? (
        <ChatWindow
          conversationId={selectedConversationId}
          currentUserId={currentUser._id}
          conversation={selectedConversation}
          onBack={isMobile ? () => setSelectedConversationId(null) : undefined}
        />
      ) : (
        !isMobile && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background transition-colors">
            {view === "conversations" ? (
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg">Select a conversation to start chatting</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg">Use the sidebar to navigate</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
