import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { ChatInterface } from "@/components/ChatInterface";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="h-screen">
      <Show when="signed-out">
        <div className="flex flex-col h-full bg-background transition-colors duration-300">
          {/* Header */}
          <header className="border-b border-gray-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-blue to-brand-purple rounded-lg flex items-center justify-center shadow-lg shadow-brand-blue/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-foreground">MyChat</span>
              </div>
              <div className="flex gap-3 items-center">
                <ThemeToggle />
                <div className="h-6 w-px bg-gray-border mx-2" />
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-muted-foreground hover:text-foreground transition">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-6 py-2 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-md shadow-brand-purple/20">
                    Get Started
                  </button>
                </SignUpButton>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
                  Real-Time Messaging
                  <span className="block bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">Made Simple</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Connect instantly with friends and teams. Experience seamless communication with typing indicators, reactions, and group chats.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <SignUpButton mode="modal">
                  <button className="px-8 py-4 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-lg hover:opacity-90 transition-all font-semibold text-lg shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                    Start Chatting Free
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="px-8 py-4 bg-gray-card text-foreground rounded-lg hover:bg-gray-border transition font-semibold text-lg border border-border transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-center">
                <div className="bg-gray-card backdrop-blur-sm border border-border rounded-xl p-6 hover:border-brand-purple/50 transition-all group shadow-sm">
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Instant Delivery</h3>
                  <p className="text-muted-foreground text-sm">Messages appear in real-time across all devices with zero delay</p>
                </div>

                <div className="bg-gray-card backdrop-blur-sm border border-border rounded-xl p-6 hover:border-brand-purple/50 transition-all group shadow-sm">
                  <div className="w-12 h-12 bg-brand-purple/10 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Group Chats</h3>
                  <p className="text-muted-foreground text-sm">Create groups and chat with multiple people simultaneously</p>
                </div>

                <div className="bg-gray-card backdrop-blur-sm border border-border rounded-xl p-6 hover:border-brand-purple/50 transition-all group shadow-sm">
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Rich Reactions</h3>
                  <p className="text-muted-foreground text-sm">Express yourself with emoji reactions and typing indicators</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-border bg-background py-6 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
              <p>Built with Next.js, Convex, and Clerk</p>
            </div>
          </footer>
        </div>
      </Show>
      <Show when="signed-in">
        <ChatInterface />
      </Show>
    </div>
  );
}
