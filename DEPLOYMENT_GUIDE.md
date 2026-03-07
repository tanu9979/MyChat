# MyChat - Vercel Deployment Guide

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ GitHub account with your code pushed
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ Clerk account with API keys
- ✅ Convex account with production deployment

---

## 🚀 Step-by-Step Deployment

### **Step 1: Deploy Convex Backend to Production**

1. **Open terminal in your project directory**
   ```bash
   cd /Users/swarnimbalpande/Desktop/tars_project/MyChat
   ```

2. **Deploy Convex to production**
   ```bash
   npx convex deploy
   ```

3. **Copy the production URLs**
   - After deployment, Convex will show:
     - `CONVEX_DEPLOYMENT` (e.g., `prod:your-project-123`)
     - `NEXT_PUBLIC_CONVEX_URL` (e.g., `https://your-project.convex.cloud`)
   - **Save these values** - you'll need them for Vercel

---

### **Step 2: Push Code to GitHub**

1. **Ensure all changes are committed**
   ```bash
   git status
   git add -A
   git commit -m "chore: prepare for production deployment"
   git push origin main
   ```

2. **Verify on GitHub**
   - Go to https://github.com/tanu9979/MyChat
   - Ensure all files are pushed

---

### **Step 3: Deploy to Vercel**

#### **Option A: Deploy via Vercel Dashboard (Recommended)**

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click "Sign Up" or "Log In"
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Find and select `tanu9979/MyChat`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)

4. **Add Environment Variables**
   Click "Environment Variables" and add these:

   ```env
   # Convex (from Step 1)
   CONVEX_DEPLOYMENT=prod:your-deployment-id
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

   # Clerk (from Clerk dashboard)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
   CLERK_SECRET_KEY=sk_live_xxxxx
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like: `https://my-chat-xyz.vercel.app`

#### **Option B: Deploy via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? mychat (or your choice)
# - Directory? ./ (press Enter)
# - Override settings? No

# Add environment variables
vercel env add CONVEX_DEPLOYMENT
vercel env add NEXT_PUBLIC_CONVEX_URL
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL

# Deploy to production
vercel --prod
```

---

### **Step 4: Configure Clerk for Production**

1. **Go to Clerk Dashboard**
   - Visit [dashboard.clerk.com](https://dashboard.clerk.com)
   - Select your application

2. **Update Allowed Origins**
   - Go to "API Keys" → "Advanced"
   - Add your Vercel URL: `https://your-app.vercel.app`

3. **Set up Webhook (Important!)**
   - Go to "Webhooks" in Clerk dashboard
   - Click "Add Endpoint"
   - **Endpoint URL**: `https://your-convex-url.convex.site/clerk-webhook`
     (Use your Convex production URL from Step 1)
   - **Subscribe to events**:
     - ✅ `user.created`
     - ✅ `user.updated`
   - Click "Create"
   - **Copy the Signing Secret**

4. **Add Webhook Secret to Convex**
   ```bash
   npx convex env set CLERK_WEBHOOK_SECRET your_webhook_secret_here
   ```

---

### **Step 5: Verify Deployment**

1. **Visit your Vercel URL**
   - Open `https://your-app.vercel.app`

2. **Test Authentication**
   - Click "Sign In"
   - Create a test account
   - Verify you can log in

3. **Test Real-time Features**
   - Open app in two different browsers
   - Send messages between accounts
   - Verify typing indicators work
   - Test reactions and online status

4. **Check Logs (if issues)**
   - Vercel: Dashboard → Your Project → Deployments → View Function Logs
   - Convex: Dashboard → Logs

---

## 🔧 Environment Variables Reference

### **Required Variables**

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `CONVEX_DEPLOYMENT` | `npx convex deploy` output | `prod:my-project-123` |
| `NEXT_PUBLIC_CONVEX_URL` | `npx convex deploy` output | `https://my-project.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | `pk_live_xxxxx` |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys | `sk_live_xxxxx` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Static value | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Static value | `/sign-up` |

### **Convex Environment Variables**

Set in Convex dashboard or via CLI:

```bash
npx convex env set CLERK_WEBHOOK_SECRET wh_xxxxx
```

---

## 🎯 Post-Deployment Checklist

- [ ] App loads at Vercel URL
- [ ] Sign up/Sign in works
- [ ] User profile syncs to Convex
- [ ] Can send messages
- [ ] Messages appear in real-time
- [ ] Typing indicators work
- [ ] Reactions work
- [ ] Group chat works
- [ ] Online status updates
- [ ] Mobile responsive design works

---

## 🐛 Troubleshooting

### **Issue: "Clerk is not defined" error**
**Solution**: Check that all Clerk environment variables are set in Vercel

### **Issue: Messages not appearing**
**Solution**: 
- Verify Convex production URL is correct
- Check Convex logs for errors
- Ensure webhook is configured

### **Issue: Users not syncing**
**Solution**:
- Verify Clerk webhook is set up correctly
- Check webhook signing secret in Convex
- Test webhook in Clerk dashboard

### **Issue: Build fails on Vercel**
**Solution**:
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript has no errors locally

### **Issue: Environment variables not working**
**Solution**:
- Redeploy after adding variables
- Check variable names (case-sensitive)
- Ensure `NEXT_PUBLIC_` prefix for client-side variables

---

## 🔄 Updating Your Deployment

### **For Code Changes**
```bash
git add -A
git commit -m "your changes"
git push origin main
```
Vercel auto-deploys on push to main branch.

### **For Environment Variable Changes**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update the variable
3. Redeploy: Deployments → Latest → "Redeploy"

### **For Convex Schema Changes**
```bash
npx convex deploy
```
No need to redeploy Vercel unless you changed frontend code.

---

## 📊 Monitoring

### **Vercel Analytics**
- Dashboard → Your Project → Analytics
- View page views, performance, errors

### **Convex Logs**
- Convex Dashboard → Logs
- Monitor database queries and mutations

### **Clerk Analytics**
- Clerk Dashboard → Analytics
- Track user signups and authentication

---

## 🎉 Success!

Your MyChat application is now live at:
**https://your-app.vercel.app**

Share this URL in your internship application!

---

## 📝 Notes

- **Free Tier Limits**:
  - Vercel: 100GB bandwidth/month
  - Convex: 1M function calls/month
  - Clerk: 10,000 MAU (Monthly Active Users)

- **Custom Domain** (Optional):
  - Vercel Dashboard → Your Project → Settings → Domains
  - Add your custom domain and follow DNS instructions

- **Production Best Practices**:
  - Enable Vercel Analytics
  - Set up error monitoring (Sentry)
  - Configure CORS if needed
  - Add rate limiting for production

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Convex Docs: https://docs.convex.dev
- Clerk Docs: https://clerk.com/docs
