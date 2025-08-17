# 🚀 Production Deployment Guide - GitHub Safe Configuration

## 🔒 Environment Variables Management

### ⚠️ NEVER COMMIT TO GITHUB
```bash
# Files to NEVER push to GitHub
.env
.env.local
.env.production
.env.development
firebase-service-account.json
any-firebase-config-file.json
```

## 📁 File Structure for Production

### Frontend Configuration (Environment Safe)

**File: `src/config/firebase.config.js`** (Safe for GitHub)
```javascript
// Safe configuration file - uses environment variables
// This file CAN be committed to GitHub

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validation for production
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Check if all required environment variables are present
const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0 && import.meta.env.PROD) {
  console.error('Missing required Firebase environment variables:', missingVars);
  throw new Error('Firebase configuration incomplete. Check environment variables.');
}

export default firebaseConfig;
```

**File: `src/firebase/config.js`** (Updated for production safety)
```javascript
// Production-safe Firebase initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../config/firebase.config.js';

let app;
let auth;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Fallback for development/testing
  if (import.meta.env.DEV) {
    console.warn('Firebase not configured for development. Google auth will be disabled.');
  }
}

export { auth, googleProvider };
export default app;
```

### Backend Configuration (Production Safe)

**File: `server/config/firebase.config.js`** (Safe for GitHub)
```javascript
// Production-safe Firebase Admin configuration
const admin = require('firebase-admin');

let firebaseAdmin = null;

const initializeFirebaseAdmin = () => {
  if (firebaseAdmin) return firebaseAdmin;

  try {
    // Check if required environment variables exist
    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing Firebase Admin environment variables:', missingVars);
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Firebase Admin configuration incomplete');
      } else {
        console.warn('Firebase Admin not configured. Google auth will be disabled.');
        return null;
      }
    }

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      firebaseAdmin = admin.app();
    }

    console.log('Firebase Admin initialized successfully');
    return firebaseAdmin;

  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    
    return null;
  }
};

module.exports = {
  getFirebaseAdmin: () => firebaseAdmin || initializeFirebaseAdmin(),
  isFirebaseConfigured: () => firebaseAdmin !== null
};
```

**File: `server/routes/googleAuth.js`** (Updated with error handling)
```javascript
// Production-safe Google auth routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { getFirebaseAdmin, isFirebaseConfigured } = require('../config/firebase.config');

// Middleware to check Firebase configuration
const checkFirebaseConfig = (req, res, next) => {
  if (!isFirebaseConfigured()) {
    return res.status(503).json({ 
      message: 'Google authentication is temporarily unavailable',
      error: 'Firebase not configured'
    });
  }
  next();
};

router.post('/login', checkFirebaseConfig, async (req, res) => {
  try {
    const { email, name, photoURL, uid, idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    // Verify Firebase token
    const firebaseAdmin = getFirebaseAdmin();
    await firebaseAdmin.auth().verifyIdToken(idToken);

    // Check existing user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Update Google info for existing user
      user.googleUid = uid;
      user.photoURL = photoURL;
      user.lastLogin = new Date();
      if (!user.name && name) user.name = name;
      await user.save();
    } else {
      // Create new customer
      user = new User({
        name: name || 'Google User',
        email: email.toLowerCase(),
        role: 'customer',
        googleUid: uid,
        photoURL: photoURL,
        password: 'google-auth',
        phoneNumber: '',
        address: '',
        lastLogin: new Date()
      });
      await user.save();
    }

    res.json({
      message: user.isNew ? 'Account created successfully' : 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber || '',
        address: user.address || ''
      }
    });

  } catch (error) {
    console.error('Google authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Authentication token expired' });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ message: 'Authentication token revoked' });
    }

    res.status(500).json({ 
      message: 'Authentication failed', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    firebaseConfigured: isFirebaseConfigured(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
```

### Frontend Service (Production Safe)

**File: `src/services/googleAuthService.js`** (Updated with error handling)
```javascript
// Production-safe Google auth service
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class GoogleAuthService {
  async signInWithGoogle() {
    // Check if Firebase is configured
    if (!auth || !googleProvider) {
      throw new Error('Google authentication is not configured');
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/google-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          idToken: idToken
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Google authentication failed');
      }
      
      const userData = await response.json();
      localStorage.setItem('user', JSON.stringify(userData.user));
      return userData.user;

    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled');
      }
      
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked. Please allow pop-ups for this site');
      }
      
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection');
      }

      throw error;
    }
  }

  // Check if Google auth is available
  isGoogleAuthAvailable() {
    return !!(auth && googleProvider);
  }
}

export default new GoogleAuthService();
```

### Updated Google Login Button (Production Safe)

**File: `src/components/GoogleLoginButton.jsx`** (Updated)
```javascript
// Production-safe Google login button
import React, { useState, useEffect } from 'react';
import googleAuthService from '../services/googleAuthService';

const GoogleLoginButton = ({ onSuccess, onError, className = '' }) => {
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if Google auth is configured
    setIsAvailable(googleAuthService.isGoogleAuthAvailable());
  }, []);

  const handleGoogleLogin = async () => {
    if (!isAvailable) {
      onError?.('Google authentication is not available');
      return;
    }

    setLoading(true);
    try {
      const user = await googleAuthService.signInWithGoogle();
      onSuccess?.(user);
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if Google auth is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`google-auth-btn ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 0.2s'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  );
};

export default GoogleLoginButton;
```

## 📋 .gitignore Configuration

**File: `.gitignore`** (Add these lines)
```bash
# Environment files - NEVER commit these
.env
.env.local
.env.development
.env.production
.env.test

# Firebase service account files
firebase-service-account*.json
serviceAccountKey.json
firebase-adminsdk*.json

# Firebase config files with secrets
firebase-config.json
firebase-private-key.json

# Local environment backups
*.env.backup
.env.*

# IDE and OS files
.vscode/settings.json
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
/build
/dist
```

## 🌐 Production Deployment Platforms

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (will prompt for environment variables)
vercel

# Add environment variables in Vercel dashboard:
# Project Settings > Environment Variables
```

### Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard:
# Site Settings > Environment Variables
```

### Heroku Deployment
```bash
# Install Heroku CLI and login
heroku login

# Create Heroku app
heroku create khana-lineup-app

# Add environment variables
heroku config:set VITE_FIREBASE_API_KEY=your-key
heroku config:set FIREBASE_PROJECT_ID=your-project-id
# ... add all variables

# Deploy
git push heroku main
```

### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up

# Add environment variables in Railway dashboard
```

## 🔧 Environment Variables Templates

### Frontend Environment Variables (Platform Settings)
```bash
# Add these in your deployment platform dashboard
VITE_API_URL=https://your-api-domain.com/api
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Backend Environment Variables (Platform Settings)
```bash
# Add these in your backend deployment platform
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/khana-lineup?retryWrites=true&w=majority
DB_NAME=khana-lineup
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Content\n-----END PRIVATE KEY-----"
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] All sensitive data in environment variables
- [ ] .gitignore updated with security files
- [ ] Firebase project configured with production domains
- [ ] MongoDB Atlas IP whitelist updated for production
- [ ] Environment variable templates ready

### Frontend Deployment
- [ ] Build command: `npm run build`
- [ ] All VITE_ environment variables set
- [ ] VITE_API_URL points to production backend
- [ ] Firebase authorized domains include production domain

### Backend Deployment
- [ ] All environment variables configured
- [ ] Firebase Admin SDK properly initialized
- [ ] MongoDB connection string updated for production
- [ ] CORS configured for production frontend domain

### Firebase Configuration
- [ ] Production domain added to authorized domains
- [ ] OAuth redirect URIs configured
- [ ] Firebase quotas sufficient for production load

### Testing Production
- [ ] Frontend loads correctly
- [ ] Regular email/password login works
- [ ] Google authentication works
- [ ] All user roles function correctly
- [ ] Database operations work
- [ ] Error handling graceful

This setup ensures your application works perfectly in production without exposing any sensitive information to GitHub!