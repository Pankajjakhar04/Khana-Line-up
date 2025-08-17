import React, { useEffect, useState } from 'react';
import { isFirebaseInitialized } from '../firebase/config';

const FirebaseDebug = () => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const envVars = {
      VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
      VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Missing',
      VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing',
      VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✓ Set' : '✗ Missing',
      VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✓ Set' : '✗ Missing',
      VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ? '✓ Set' : '✗ Missing',
    };

    // Show partial values for debugging (safely)
    const envValues = {
      API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? `${import.meta.env.VITE_FIREBASE_API_KEY.slice(0, 10)}...` : 'Missing',
      AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'Missing',
      PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Missing',
    };

    setDebugInfo({
      envVars,
      envValues,
      isInitialized: isFirebaseInitialized(),
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD
    });
  }, []);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-red-800 mb-2">🔍 Firebase Debug Info</h3>
      <div className="text-sm space-y-1">
        <p><strong>Mode:</strong> {debugInfo.mode} | <strong>Production:</strong> {debugInfo.prod ? 'Yes' : 'No'}</p>
        <p><strong>Firebase Initialized:</strong> {debugInfo.isInitialized ? '✓ Yes' : '✗ No'}</p>
        
        <h4 className="font-semibold mt-2 text-red-700">Environment Variables:</h4>
        {debugInfo.envVars && Object.entries(debugInfo.envVars).map(([key, value]) => (
          <p key={key} className={value.includes('✓') ? 'text-green-700' : 'text-red-700'}>
            <strong>{key}:</strong> {value}
          </p>
        ))}
        
        <h4 className="font-semibold mt-2 text-blue-700">Sample Values:</h4>
        {debugInfo.envValues && Object.entries(debugInfo.envValues).map(([key, value]) => (
          <p key={key} className="text-blue-600 text-xs">
            <strong>{key}:</strong> {value}
          </p>
        ))}
        
        <p className="text-xs text-gray-600 mt-2">
          Check browser console for Firebase initialization errors
        </p>
      </div>
    </div>
  );
};

export default FirebaseDebug;
