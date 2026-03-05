import { SignInButton, Show } from "@clerk/nextjs";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <div className="h-screen">
      <Show when="signed-out">
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center space-y-6 p-8">
            <h1 className="text-4xl font-bold text-gray-900">Welcome to MyChat</h1>
            <p className="text-lg text-gray-600">Real-time messaging made simple</p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Sign In to Start Chatting
              </button>
            </SignInButton>
          </div>
        </div>
      </Show>
      <Show when="signed-in">
        <ChatInterface />
      </Show>
    </div>
  );
}
