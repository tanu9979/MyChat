# MyChat

> A professional, real-time messaging platform enhanced with AI capabilities and a premium dark-themed interface.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-Real--time-orange?style=flat-square)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-purple?style=flat-square&logo=clerk)](https://clerk.com/)
[![Gemini](https://img.shields.io/badge/Gemini-AI--Enhanced-blue?style=flat-square&logo=google-gemini)](https://deepmind.google/technologies/gemini/)

## 🚀 Live Experience

**Explore the App:** [my-chat-sepia-beta.vercel.app](https://my-chat-sepia-beta.vercel.app/)

---

## 🌟 Overview

MyChat is a sophisticated, real-time communication platform designed for seamless interaction. It merges the speed of a modern messaging engine with powerful AI-driven enhancements, providing a premium user experience that is both intuitive and highly functional.

### Core Value Propositions

- **AI-Powered Communication** - Refine your messages using Google's Gemini AI for perfect grammar, tone, and clarity.
- **Dynamic Theme Engine** - A professional interface with an immersive dark mode and crisp light mode, designed for optimal readability.
- **True Real-time Engine** - Instantaneous message delivery and state synchronization powered by Convex's reactive database.
- **Enterprise-Grade Auth** - Secure, scalable user management integrated with Clerk.

---

## ✨ Features

### 🤖 AI Enhancement (Powered by Gemini)
Elevate your communication with integrated AI assistance. Before sending, you can enhance your messages with multiple styles:
- **Professional**: Polishes tone for business contexts.
- **Casual**: Makes messages more friendly and approachable.
- **Grammar & Clarity**: Fixes errors and improves readability instantly.
- **Concise**: Streamlines your thoughts for better impact.

### 🌗 Premium Theme Engine
- **Dark Mode (Default)**: A sleek, low-light interface designed for developers and long-term use.
- **Light Mode**: A clean, high-contrast alternative for bright environments.
- **Smooth Transitions**: Fluid animations when switching between modes.
- **System Synchronization**: Automatically respects your OS appearance settings.

### 💬 Advanced Messaging
- **Real-time Delivery**: Zero-latency messaging via WebSocket subscriptions.
- **Group Collaboration**: Create and manage group chats with shared workspaces.
- **Message Interactions**: Express yourself with curated emoji reactions.
- **Typing Indicators**: Live presence detection for smoother conversations.
- **Message Management**: Fully featured edit and soft-delete capabilities.

### 🔍 Discovery & Profiles
- **User Discovery**: Global search to find and connect with people instantly.
- **Rich Profiles**: Personalized user avatars and status management via Clerk profiles.
- **Conversation Search**: Quick filtering of your chat history.

---

## 🛠️ Technical Stack

| Category | Technology |
|----------|------------|
| **Core Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **Real-time DB** | Convex |
| **Authentication** | Clerk |
| **AI Integration** | Google Gemini API (gemini-flash-latest) |
| **Styling** | Tailwind CSS 4.0 |
| **Deployment** | Vercel |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Accounts for **Clerk**, **Convex**, and **Google AI Studio** (for Gemini API)

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/yourusername/mychat.git
   cd mychat
   npm install
   ```

2. **Initialize Backend**
   ```bash
   npx convex dev
   ```

3. **Configure Environment Variables**  
   Create a `.env.local` file:
   ```env
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   
   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Convex (auto-synced)
   CONVEX_DEPLOYMENT=...
   NEXT_PUBLIC_CONVEX_URL=...
   ```

4. **Launch**
   ```bash
   npm run dev
   ```

---

## 📂 Project Architecture

```bash
mychat/
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── api/              # AI Enhancement Routes
│   └── globals.css       # Theme tokens and base styles
├── components/           # Reusable UI Components
│   ├── ChatWindow.tsx    # AI feature integration & messaging logic
│   └── ThemeToggle.tsx   # Dynamic theme switching
├── convex/               # Real-time Schema & Backend Functions
└── public/               # Static assets
```

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with ❤️**  

