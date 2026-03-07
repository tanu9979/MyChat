# MyChat

> A modern, production-ready real-time messaging platform with advanced chat features

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-Real--time-orange)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-purple)](https://clerk.com/)

## Overview

MyChat is a feature-rich, real-time messaging application that delivers seamless communication experiences. Built with modern web technologies, it provides instant message delivery, typing indicators, message reactions, and group chat capabilities—all wrapped in a sleek, responsive dark-themed interface.

### Key Highlights

- **Real-time Communication** - Instant message delivery powered by Convex subscriptions
- **Modern Authentication** - Secure user management with Clerk (email + OAuth)
- **Responsive Design** - Optimized for desktop and mobile devices
- **Rich Interactions** - Reactions, typing indicators, and read receipts
- **Group Messaging** - Create and manage group conversations
- **Professional UI** - Dark theme with polished user experience

## Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Convex (Real-time) |
| **Authentication** | Clerk |
| **Deployment** | Vercel |
| **Icons** | Lucide React |

## Features

### Core Messaging
- **Direct Messaging** - Private one-on-one conversations with real-time delivery
- **Group Chat** - Create and manage group conversations with multiple participants
- **Message Reactions** - Express yourself with emoji reactions (👍 ❤️ 😂 😮 😢)
- **Message Management** - Delete your own messages with soft-delete preservation
- **Smart Timestamps** - Context-aware time formatting (relative for recent, absolute for older)

### Real-time Features
- **Instant Delivery** - Messages appear immediately across all devices
- **Typing Indicators** - See when others are composing messages
- **Online Status** - Real-time presence indicators for all users
- **Unread Badges** - Track unread message counts per conversation
- **Auto-scroll** - Smart scrolling with "new messages" notification

### User Experience
- **User Discovery** - Search and find users to start conversations
- **Conversation Search** - Filter conversations by name in real-time
- **Collapsible Sidebar** - Overlay navigation that doesn't hide chat content
- **Group Member List** - View all participants with online status
- **Responsive Design** - Seamless experience on desktop and mobile
- **Dark Theme** - Professional dark UI with optimal contrast
- **Empty States** - Helpful guidance when no content is available

### Authentication & Security
- **Secure Authentication** - Powered by Clerk with multiple sign-in options
- **Email & OAuth** - Support for email and Google authentication
- **Profile Management** - User profiles with avatars and status
- **Session Management** - Secure session handling and route protection

## Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **Git** for version control

You'll also need accounts for:
- [Clerk](https://clerk.com) - Authentication (free tier available)
- [Convex](https://convex.dev) - Real-time database (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mychat.git
   cd mychat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   - Sign in or create a Convex account
   - Create a new project when prompted
   - Convex will auto-generate environment variables
   - Keep this terminal running during development

4. **Configure Clerk**
   - Visit [clerk.com](https://clerk.com) and create an account
   - Create a new application
   - Enable **Email** and **Google** authentication providers
   - Navigate to **API Keys** and copy your credentials

5. **Set environment variables**
   
   Create a `.env.local` file in the project root:
   ```env
   # Convex (auto-generated)
   CONVEX_DEPLOYMENT=your-deployment-id
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   
   # Clerk (from dashboard)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Testing

To test real-time features:
1. Create multiple test accounts
2. Open the application in different browser windows/profiles
3. Send messages and verify instant delivery
4. Test typing indicators and online status

## Project Structure

```
mychat/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Main application page
│   ├── profile/                 # User profile pages
│   └── globals.css              # Global styles and theme
│
├── components/                   # React components
│   ├── ConvexClientProvider.tsx # Convex real-time wrapper
│   ├── ChatInterface.tsx        # Main chat layout
│   ├── ChatWindow.tsx           # Message display and input
│   ├── ConversationList.tsx     # Conversation sidebar
│   ├── UserList.tsx             # User discovery
│   └── CreateGroup.tsx          # Group creation flow
│
├── convex/                       # Backend (Convex)
│   ├── schema.ts                # Database schema
│   ├── queries.ts               # Real-time queries
│   ├── mutations.ts             # Data mutations
│   └── http.ts                  # Clerk webhook handler
│
├── middleware.ts                 # Route protection
└── .env.local                   # Environment variables
```

## Architecture

### Database Schema

MyChat uses Convex as a real-time database with the following schema:

**users**
- User profiles with authentication data
- Online status and last seen timestamps
- Profile information (name, email, avatar)

**conversations**
- Metadata for direct and group chats
- Participant lists and group names
- Last message timestamps for sorting

**messages**
- Message content with sender information
- Soft delete support (preserves deleted messages)
- Read receipts tracking

**typingIndicators**
- Ephemeral typing status
- Auto-expires after 2 seconds

**reactions**
- Emoji reactions linked to messages
- User attribution for each reaction

### Key Indexes
- `by_clerk_id` - Fast user lookups
- `by_last_message` - Efficient conversation sorting
- `by_conversation` - Quick message retrieval
- `by_message` - Reaction queries
- `by_user_and_message` - Reaction toggle operations

## Deployment

### Production Deployment

**1. Deploy Convex Backend**
```bash
npx convex deploy
```
This creates a production Convex deployment and provides new URLs.

**2. Deploy to Vercel**

```bash
# Push to GitHub
git push origin main
```

Then:
- Visit [vercel.com](https://vercel.com) and import your repository
- Configure environment variables in Vercel dashboard
- Deploy automatically on push to main branch

**Required Environment Variables:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
CONVEX_DEPLOYMENT
NEXT_PUBLIC_CONVEX_URL
```

**3. Configure Clerk Webhook**
- In Clerk dashboard, add webhook endpoint: `https://your-convex-url/clerk-webhook`
- Subscribe to `user.created` and `user.updated` events
- Copy webhook secret to Convex environment variables

## Development

### Key Implementation Details

**Real-time Subscriptions**
- Leverages Convex's built-in reactive queries
- No polling required - updates push automatically
- Efficient WebSocket connections

**Typing Indicators**
- 2-second timeout with auto-clear
- Clears immediately on message send
- Ephemeral storage for performance

**Message Reactions**
- Toggle-based interaction model
- Hover tooltips with smart positioning
- Prevents overflow on screen edges

**Responsive Design**
- Mobile-first approach with Tailwind
- Breakpoint at 768px (md)
- Collapsible sidebar overlay

### Performance Optimizations

- **Database Indexes** - All frequently queried fields indexed
- **Efficient Sorting** - Conversations sorted by lastMessageTime
- **React Optimization** - Proper hooks and memoization
- **Smart Scrolling** - Prevents jarring UX during updates

### Code Quality

- **TypeScript** - Full type safety across the application
- **ESLint** - Code quality and consistency
- **Component Architecture** - Modular, reusable components
- **Error Handling** - Comprehensive error states

## Contributing

This is a portfolio project. If you'd like to suggest improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -m 'Add improvement'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Real-time backend by [Convex](https://convex.dev/)
- Authentication by [Clerk](https://clerk.com/)
- Developed with assistance from **Amazon Q Developer**

---

**Built by [Your Name]** | [GitHub](https://github.com/yourusername) | [LinkedIn](https://linkedin.com/in/yourprofile)
