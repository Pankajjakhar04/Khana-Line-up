import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, AlertCircle, CheckCircle } from 'lucide-react';
import apiService from '../services/api.js';

const ConnectionStatus = () => {
  const [status, setStatus] = useState({ isOnline: false, mode: 'Connecting...' });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        console.log('ConnectionStatus: Checking API health...');
        await apiService.healthCheck();
        console.log('ConnectionStatus: API health check successful');
        setStatus({ isOnline: true, mode: 'MongoDB Atlas' });
      } catch (error) {
        console.error('ConnectionStatus: API connection failed:', error);
        setStatus({ isOnline: false, mode: 'Connection Failed' });
      }
    };

    // Wait a bit before first check to allow backend to start
    const initialDelay = setTimeout(() => {
      checkStatus();
    }, 2000);

    // Check status every 10 seconds (more frequent for debugging)
    const interval = setInterval(checkStatus, 10000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  const handleRetryConnection = async () => {
    try {
      console.log('ConnectionStatus: Manual retry triggered...');
      await apiService.healthCheck();
      console.log('ConnectionStatus: Manual retry successful');
      setStatus({ isOnline: true, mode: 'MongoDB Atlas' });
      
      // Auto-hide after successful connection
      setTimeout(() => setIsVisible(false), 3000);
    } catch (error) {
      console.error('ConnectionStatus: Failed to retry connection:', error);
      setStatus({ isOnline: false, mode: 'Connection Failed' });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border-l-4 ${
      status.isOnline ? 'border-green-500' : 'border-red-500'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {status.isOnline ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={16} />
                <Database size={16} />
                <span className="text-sm font-medium">Cloud Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle size={16} />
                <WifiOff size={16} />
                <span className="text-sm font-medium">Connection Failed</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          {status.isOnline 
            ? 'Data is synced with MongoDB Atlas cloud database'
            : 'Cannot connect to MongoDB Atlas. Please check your internet connection and try again.'
          }
        </p>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            status.isOnline 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {status.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {status.mode}
          </div>
          
          {!status.isOnline && (
            <button
              onClick={handleRetryConnection}
              className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
