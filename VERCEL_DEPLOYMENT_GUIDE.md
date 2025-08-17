# 🚀 Vercel Deployment Guide - Production Ready

## 📋 Pre-Deployment Checklist

### ✅ Code is GitHub-Safe
- [x] No hardcoded API keys in source code
- [x] Firebase config uses environment variables
- [x] All sensitive data in .env files (ignored by git)
- [x] Production-safe error handling
- [x] No Firebase Admin dependency

### ✅ Environment Variables Ready
All sensitive configuration is handled via environment variables that you'll add in Vercel dashboard.

## 🔧 Step 1: Prepare Your Repository

1. **Commit all changes to your local repository:**
   ```bash
   git add .
   git commit -m "Production-ready: Remove hardcoded keys, add env vars"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

## 🌐 Step 2: Deploy to Vercel

### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel --prod
```

### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure as follows:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

## 🔐 Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

### Frontend Variables
```bash
VITE_API_URL=https://your-project-name.vercel.app/api

# Firebase Configuration (get these from Firebase Console)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### Backend Variables
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/khana-lineup
JWT_SECRET=your-super-secure-jwt-secret-for-production
CORS_ORIGIN=https://your-project-name.vercel.app
```

## 🔥 Step 4: Firebase Setup

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. **Create a new project** (if you haven't already)
3. **Enable Authentication:**
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Add your Vercel domain to authorized domains:
     - `your-project-name.vercel.app`
     - `localhost` (for development)

4. **Get your Firebase config:**
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Click on Web app or create one
   - Copy the config values to your Vercel environment variables

## 📊 Step 5: Database Setup (MongoDB Atlas)

1. **Go to [MongoDB Atlas](https://cloud.mongodb.com)**
2. **Create a cluster** (if you haven't already)
3. **Create a database user:**
   - Go to Database Access
   - Add a new database user with readWrite permissions
4. **Whitelist IP addresses:**
   - Go to Network Access
   - Add IP Address: `0.0.0.0/0` (for Vercel serverless functions)
5. **Get connection string:**
   - Go to Database > Connect
   - Choose "Connect your application"
   - Copy the connection string and add it to Vercel environment variables

## 🏗️ Step 6: Redeploy with Environment Variables

After adding all environment variables:

1. **Trigger a new deployment:**
   - In Vercel dashboard, go to Deployments
   - Click "Redeploy" on the latest deployment
   - OR push a new commit to trigger automatic deployment

## ✅ Step 7: Test Your Production Deployment

1. **Visit your deployed app:** `https://your-project-name.vercel.app`

2. **Test core functionality:**
   - ✅ App loads correctly
   - ✅ Email/password login works
   - ✅ User registration works
   - ✅ Google authentication works (if configured)
   - ✅ Database operations work
   - ✅ All user roles function correctly

3. **Check browser console for errors**

4. **Test on mobile devices**

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Firebase not configured" error
- Check that all `VITE_FIREBASE_*` environment variables are set in Vercel
- Ensure there are no typos in variable names
- Redeploy after adding environment variables

#### 2. Database connection errors
- Verify MongoDB connection string is correct
- Check that IP whitelist includes `0.0.0.0/0`
- Ensure database user has proper permissions

#### 3. CORS errors
- Make sure `CORS_ORIGIN` environment variable matches your exact Vercel URL
- Include `https://` in the URL

#### 4. API routes not found
- Verify `vercel.json` is properly configured
- Check that `api/index.js` exists and exports your Express app

### View Logs:
```bash
# View function logs
vercel logs https://your-project-name.vercel.app

# View deployment logs
vercel logs --since=1h
```

## 🔄 Step 8: Set Up Automatic Deployments

Vercel automatically deploys when you push to your main branch. To customize:

1. **Go to Project Settings > Git**
2. **Configure:**
   - Production Branch: `main`
   - Deploy Hooks: Set up if needed
   - Ignored Build Step: Configure if needed

## 🎉 You're Live!

Your Khana Line-up application is now live and production-ready! 

### Next Steps:
- Set up custom domain (optional)
- Configure analytics
- Set up monitoring
- Plan for scaling

### URLs to bookmark:
- **Live App:** `https://your-project-name.vercel.app`
- **Vercel Dashboard:** `https://vercel.com/dashboard`
- **Firebase Console:** `https://console.firebase.google.com`
- **MongoDB Atlas:** `https://cloud.mongodb.com`

## 📝 Production Maintenance

### Regular Tasks:
- Monitor error logs in Vercel dashboard
- Update dependencies regularly
- Backup database periodically
- Monitor Firebase usage quotas
- Review and rotate JWT secrets

Your app is now production-ready and safe for GitHub! 🚀
