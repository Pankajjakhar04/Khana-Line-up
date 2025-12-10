import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authRoutes, menuRoutes, orderRoutes, googleAuthRoutes } from './routes/index.js';
import { User, MenuItem, Order } from './models/index.js';

// Load environment variables from multiple sources
dotenv.config(); // Load .env
dotenv.config({ path: '.env.local' }); // Load .env.local (for development)

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO
const httpServer = http.createServer(app);

// Socket.IO setup with CORS matching Express
const io = new SocketIOServer(httpServer, {
  // Relaxed ping timings to avoid false timeouts during local tests
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'https://khana-line-up-git-testing-pankajjakhar04.vercel.app',
      'https://khana-line-up-pankajjakhar04.vercel.app',
      /https:\/\/.*\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Make io accessible
app.set('io', io);

// MongoDB connection for serverless
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Middleware to ensure database connection
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:5173',
    'https://khana-line-up-git-testing-pankajjakhar04.vercel.app',
    'https://khana-line-up-pankajjakhar04.vercel.app',
    /https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route with database test
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        host: mongoose.connection.host || 'Unknown'
      },
      env_check: {
        mongodb_uri: !!process.env.MONGODB_URI,
        jwt_secret: !!process.env.JWT_SECRET
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test database route
app.get('/api/test-db', async (req, res) => {
  try {
    await connectToDatabase();
    const userCount = await User.countDocuments();
    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        userCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/google-auth', googleAuthRoutes);
app.use('/api/google-auth', googleAuthRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Khana Line-up API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      menu: '/api/menu',
      orders: '/api/orders',
      googleAuth: '/api/google-auth',
      health: '/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default server error
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize default data
const initializeDefaultData = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Initializing default data...');
    }
    
    // Create default admin user only
    await User.createDefaultUsers();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Default data initialization completed');
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
};

// Helper: ensure MongoDB indexes are compatible with current schema
// In particular, older deployments may still have a UNIQUE index on `tokenId`,
// but tokens are only unique per day, so that unique constraint must be removed.
const ensureOrderIndexes = async () => {
  try {
    const indexes = await Order.collection.indexes();
    const tokenIndex = indexes.find((idx) => idx.name === 'tokenId_1');

    if (tokenIndex && tokenIndex.unique) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🛠  Dropping legacy UNIQUE index on orders.tokenId...');
      }
      await Order.collection.dropIndex('tokenId_1');
      await Order.collection.createIndex({ tokenId: 1 });
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Recreated NON-UNIQUE index on orders.tokenId');
      }
    }
  } catch (err) {
    console.error('Error ensuring Order indexes:', err);
  }
};

// Helper: setup MongoDB change streams and Socket.IO events
const setupRealtime = async () => {
  try {
    await connectToDatabase();
    await ensureOrderIndexes();

    // Socket.IO connection handlers
    io.on('connection', (socket) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Socket connected: ${socket.id}`);
      }

      socket.on('disconnect', (reason) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Socket disconnected: ${socket.id} (${reason})`);
        }
      });
    });

    // Orders change stream
    const orderStream = Order.watch([], { fullDocument: 'updateLookup' });
    orderStream.on('change', (change) => {
      try {
        const { operationType, fullDocument, documentKey, updateDescription } = change;
        if (operationType === 'insert') {
          io.emit('order:created', fullDocument);
        } else if (operationType === 'update' || operationType === 'replace') {
          io.emit('order:updated', fullDocument);
        } else if (operationType === 'delete') {
          io.emit('order:deleted', { _id: documentKey._id });
        }
      } catch (e) {
        console.error('Error processing order change stream event:', e);
      }
    });

    orderStream.on('error', (err) => {
      console.error('Order change stream error:', err);
    });

    // Menu items change stream
    const menuStream = MenuItem.watch([], { fullDocument: 'updateLookup' });
    menuStream.on('change', (change) => {
      try {
        const { operationType, fullDocument, documentKey } = change;
        if (operationType === 'insert') {
          io.emit('menu:created', fullDocument);
        } else if (operationType === 'update' || operationType === 'replace') {
          io.emit('menu:updated', fullDocument);
        } else if (operationType === 'delete') {
          io.emit('menu:deleted', { _id: documentKey._id });
        }
      } catch (e) {
        console.error('Error processing menu change stream event:', e);
      }
    });

    menuStream.on('error', (err) => {
      console.error('Menu change stream error:', err);
    });

    // Cleanup on shutdown
    const cleanup = async () => {
      try {
        await orderStream.close();
      } catch {}
      try {
        await menuStream.close();
      } catch {}
      io.close();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  } catch (err) {
    console.error('Failed to setup realtime layer:', err);
  }
};

// Only start server if not in serverless environment (like Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // Start server
  httpServer.listen(PORT, async () => {
    console.log(`
🚀 Khana Line-up Server is running!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
📚 API Base: http://localhost:${PORT}/api
    `);

    // Initialize default data after server starts
    setTimeout(initializeDefaultData, 2000);

    // Setup realtime after server is up
    await setupRealtime();
  });
} else {
  // For serverless environments, just initialize data
  console.log('Running in serverless environment');
  initializeDefaultData();
}

export default app;
