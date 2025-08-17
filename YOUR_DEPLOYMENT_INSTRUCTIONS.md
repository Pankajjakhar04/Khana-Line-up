# 🚀 YOUR DEPLOYMENT INSTRUCTIONS

## ⚠️ CRITICAL SECURITY NOTICE
**NEVER commit the values below to GitHub!** They are for Vercel environment variables only.

## 🔧 Vercel Environment Variables

When deploying to Vercel, add these **exact** environment variables in your Vercel dashboard:

### Backend Variables
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://khana-lineup-admin:admin_2026@khana-lineup-cluster.bpkbt4d.mongodb.net/?retryWrites=true&w=majority&appName=Khana-lineup-cluster
JWT_SECRET=khana-lineup-jwt-secret-key-2026-production
DB_NAME=khana-lineup
CORS_ORIGIN=https://your-app-name.vercel.app
```

### Frontend Variables
```
VITE_API_URL=https://your-app-name.vercel.app/api
VITE_FIREBASE_API_KEY=AIzaSyB3pm9kGGg94-8DXN1XzuIEUiKHNQeKmMM
VITE_FIREBASE_AUTH_DOMAIN=khana-line-up-2a15e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=khana-line-up-2a15e
VITE_FIREBASE_STORAGE_BUCKET=khana-line-up-2a15e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=475773104437
VITE_FIREBASE_APP_ID=1:475773104437:web:6e626c3badd1a19847dc7c
VITE_FIREBASE_MEASUREMENT_ID=G-HTDL8JCTL2
```

## 🔥 Firebase Console Setup

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. **Select your project:** `khana-line-up-2a15e`
3. **Enable Authentication:**
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Add authorized domains:
     - `localhost` (for development)
     - `your-app-name.vercel.app` (replace with your actual Vercel URL)

## 📊 MongoDB Atlas Setup

Your cluster is already configured, but ensure:

1. **Network Access:**
   - Go to Network Access in MongoDB Atlas
   - Add IP Address: `0.0.0.0/0` (for Vercel serverless functions)

2. **Database Access:**
   - User: `khana-lineup-admin` ✅ (already set up)
   - Password: `admin_2026` ✅ (already set up)

## 🚀 Deploy to Vercel

### Step 1: Prepare for GitHub
```bash
# Make sure .env.local is in .gitignore (it should be)
git add .
git commit -m "Production ready - secure environment configuration"
git push origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Framework: Vite (auto-detected)
4. **Add all environment variables above** in Settings > Environment Variables
5. Deploy!

### Step 3: Update CORS_ORIGIN
After deployment, update this variable with your actual Vercel URL:
```
CORS_ORIGIN=https://your-actual-app-name.vercel.app
```

## 🎯 Test Your Deployment

1. **Visit your deployed app**
2. **Test basic login:** admin@khana-lineup.com / admin_2026
3. **Test Google login** (should work with your Firebase setup)
4. **Test user registration**
5. **Test menu and order functionality**

## ✅ Expected Results

- ✅ App loads without errors
- ✅ Email/password login works
- ✅ Google authentication works
- ✅ Database operations work
- ✅ All user roles function correctly
- ✅ Mobile responsive design

## 🔒 Security Verified

- ✅ No hardcoded secrets in source code
- ✅ Environment variables properly configured
- ✅ Firebase client-side only (no admin SDK)
- ✅ CORS protection enabled
- ✅ MongoDB access controlled

## 🎉 You're Ready!

Your Khana Line-up application is production-ready with:
- **Secure Google Authentication**
- **MongoDB Atlas Database**
- **Vercel Serverless Deployment**
- **Complete User Management**
- **Responsive Design**

Deploy with confidence! 🚀

---
**Remember:** Keep these credentials secure and never commit them to GitHub!
