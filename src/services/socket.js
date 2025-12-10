// Socket.IO client singleton
// Will connect to VITE_SOCKET_URL if provided, otherwise derive from API URL used by the app

import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// Derive socket URL by stripping "/api" suffix if present
let defaultSocketUrl = API_BASE;
if (defaultSocketUrl.endsWith('/api')) {
  defaultSocketUrl = defaultSocketUrl.slice(0, -4);
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl || 'http://localhost:5000';

// Create a single socket instance
export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'], // websocket preferred, fallback to polling
  withCredentials: true,
  autoConnect: true,
});

// Optional: simple helpers to register/unregister listeners
export const on = (event, handler) => {
  socket.on(event, handler);
  return () => socket.off(event, handler);
};

export const once = (event, handler) => {
  socket.once(event, handler);
  return () => socket.off(event, handler);
};

export const off = (event, handler) => socket.off(event, handler);

export default socket;
