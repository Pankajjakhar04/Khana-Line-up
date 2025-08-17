// Production-safe Firebase configuration using environment variables
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration - uses environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if all required environment variables are present
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

// Initialize Firebase with comprehensive error handling
let app, auth, googleProvider;

try {
  // Check for missing environment variables
  if (missingVars.length > 0) {
    console.warn('Missing Firebase environment variables:', missingVars);
    
    if (import.meta.env.PROD) {
      console.error('Firebase configuration incomplete for production');
      throw new Error('Firebase configuration incomplete. Check environment variables.');
    } else {
      console.warn('Firebase not configured for development. Google auth will be disabled.');
      app = null;
      auth = null;
      googleProvider = null;
    }
  } else {
    console.log('Initializing Firebase...');
    
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    // Initialize Firebase Authentication
    auth = getAuth(app);
    console.log('Firebase auth initialized successfully');
    
    // Configure Google provider with production-ready settings
    googleProvider = new GoogleAuthProvider();
    
    // Add OAuth scopes for user information
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    // Set custom parameters for better UX
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      include_granted_scopes: 'true',
      access_type: 'online'
    });
    
    console.log('Firebase and Google Auth Provider initialized successfully');
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.error('Error details:', {
    code: error.code,
    message: error.message
  });
  
  // Set to null if initialization fails to prevent further errors
  app = null;
  auth = null;
  googleProvider = null;
}

// Helper functions for better Firebase integration
export const isFirebaseInitialized = () => {
  return !!(app && auth && googleProvider);
};

export const getCurrentUser = () => {
  if (!auth) return null;
  return auth.currentUser;
};

export const onAuthStateChanged = (callback) => {
  if (!auth) {
    console.warn('Firebase auth not initialized, cannot listen to auth state changes');
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
};

export { auth, googleProvider };
export default app;
