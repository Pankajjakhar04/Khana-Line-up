import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple test routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Khana Line-up API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/google-auth/login', (req, res) => {
  console.log('Google auth request received:', req.body);
  res.json({
    success: true,
    message: 'Google auth endpoint is working',
    received: req.body
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    availableRoutes: ['/api', '/api/test', '/api/google-auth/login']
  });
});

export default app;
