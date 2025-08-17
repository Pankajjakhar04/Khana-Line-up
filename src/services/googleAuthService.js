// Production-safe Google Auth Service (Client-only, no Firebase Admin)
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseInitialized } from '../firebase/config';

// API Configuration - matches the main API service
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

class GoogleAuthService {
  // Check if Google authentication is available
  isGoogleAuthAvailable() {
    return isFirebaseInitialized();
  }

  async signInWithGoogle() {
    // Check if Firebase is properly configured
    if (!this.isGoogleAuthAvailable()) {
      throw new Error('Google authentication is not configured. Please check environment variables.');
    }

    try {
      console.log('Starting Google sign-in process...');
      
      // Perform Firebase Google sign-in
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log('Google sign-in successful, user:', {
        email: user.email,
        name: user.displayName,
        uid: user.uid
      });

      // Prepare user data to send to backend (NO Firebase Admin token verification)
      const userData = {
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      };
      
      console.log('Sending user data to backend:', userData);
      console.log('API URL:', `${API_URL}/google-auth/login`);
      
      // Send user data to backend for authentication/user creation
      const response = await fetch(`${API_URL}/google-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      console.log('Backend response status:', response.status);
      const data = await response.json();
      console.log('Backend response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      
      return data;
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // Provide more specific error messages based on Firebase error codes
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked. Please allow pop-ups for this site and try again.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.message.includes('not configured')) {
        throw new Error('Google authentication is not configured for this environment.');
      }
      
      // For other errors, throw the original message
      throw error;
    }
  }
}

// Export both class instance and standalone function for compatibility
const googleAuthService = new GoogleAuthService();

export const signInWithGoogle = () => googleAuthService.signInWithGoogle();
export default googleAuthService;
