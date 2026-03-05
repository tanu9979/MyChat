"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { UserList } from "./UserList";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";

export function ChatInterface() {
  const { user } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const syncUser = useMutation(api.mutations.syncUser);
  const createConversation = useMutation(api.mutations.createConversation);
  const currentUser = useQuery(
    api.queries.getCurrentUser,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const existingConversation = useQuery(
    api.queries.getConversation,
    selectedConversationId === null && showUserList === false
      ? "skip"
      : { participantIds: [] }
  );

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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const showChat = selectedConversationId && (!isMobile || !showUserList);
  const showSidebar = !isMobile || !selectedConversationId;

  return (
    <div className="flex h-screen bg-gray-100">
      {showSidebar && (
        <div className={`${isMobile ? "w-full" : "w-80"} bg-white border-r flex flex-col`}>
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold">MyChat</h1>
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              {showUserList ? "Conversations" : "New Chat"}
            </button>
          </div>
          {showUserList ? (
            <UserList
              currentUserId={currentUser._id}
              onSelectUser={async (otherUserId) => {
                const conv = await createConversation({
                  participantIds: [currentUser._id, otherUserId],
                });
                setSelectedConversationId(conv);
                setShowUserList(false);
              }}
            />
          ) : (
            <ConversationList
              currentUserId={currentUser._id}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
            />
          )}
        </div>
      )}
      {showChat ? (
        <ChatWindow
          conversationId={selectedConversationId}
          currentUserId={currentUser._id}
          onBack={isMobile ? () => setSelectedConversationId(null) : undefined}
        />
      ) : (
        !isMobile && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">Select a conversation to start chatting</p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
