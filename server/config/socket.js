import { Server } from 'socket.io';

let io;
const connectedUsers = new Map(); // Store user connections

export const initializeSocket = (server) => {
  io = new Server(server, {
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
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Handle user registration with their ID and role
    socket.on('register_user', (userData) => {
      const { userId, role, name } = userData;
      console.log(`👤 User registered: ${name} (${role}) - ${userId}`);
      
      connectedUsers.set(socket.id, {
        userId,
        role,
        name,
        socketId: socket.id
      });

      // Join role-specific rooms
      socket.join(role);
      
      // Join user-specific room
      socket.join(`user_${userId}`);
      
      // If vendor, also join vendor-specific room
      if (role === 'vendor') {
        socket.join(`vendor_${userId}`);
      }
      
      console.log(`📍 User ${name} joined rooms: [${role}, user_${userId}]`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`👋 User disconnected: ${user.name} (${user.role})`);
        connectedUsers.delete(socket.id);
      } else {
        console.log('👋 Unknown user disconnected:', socket.id);
      }
    });

    // Handle typing indicators for chat (future feature)
    socket.on('typing', (data) => {
      socket.broadcast.emit('user_typing', data);
    });

    socket.on('stop_typing', (data) => {
      socket.broadcast.emit('user_stop_typing', data);
    });
  });

  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Utility functions for emitting events
export const socketEvents = {
  // Menu-related events
  menuUpdated: (menuItem) => {
    if (!io) return;
    console.log('📡 Broadcasting menu update:', menuItem.name);
    io.emit('menu_updated', menuItem);
  },

  menuItemAdded: (menuItem) => {
    if (!io) return;
    console.log('📡 Broadcasting new menu item:', menuItem.name);
    io.emit('menu_item_added', menuItem);
  },

  menuItemDeleted: (menuItemId) => {
    if (!io) return;
    console.log('📡 Broadcasting menu item deletion:', menuItemId);
    io.emit('menu_item_deleted', { menuItemId });
  },

  // Order-related events
  orderCreated: (order) => {
    if (!io) return;
    console.log('📡 Broadcasting new order:', order.tokenId);
    
    // Notify all vendors
    io.to('vendor').emit('new_order', order);
    
    // Notify specific vendor if assigned
    if (order.vendor) {
      io.to(`vendor_${order.vendor}`).emit('vendor_new_order', order);
      
      // Send notification to specific vendor
      io.to(`vendor_${order.vendor}`).emit('notification', {
        title: '🎉 New Order!',
        message: `Order #${order.tokenId} received`,
        type: 'success'
      });
    } else {
      // Send notification to all vendors if no specific vendor
      io.to('vendor').emit('notification', {
        title: '🎉 New Order!',
        message: `Order #${order.tokenId} received`,
        type: 'success'
      });
    }
    
    // Notify the customer
    io.to(`user_${order.customer}`).emit('order_created', order);
    
    // Send notification to customer
    io.to(`user_${order.customer}`).emit('notification', {
      title: '✅ Order Placed!',
      message: `Your order #${order.tokenId} has been placed successfully`,
      type: 'success'
    });
  },

  orderStatusUpdated: (order) => {
    if (!io) return;
    console.log('📡 Broadcasting order status update:', order.tokenId, order.status);
    console.log('📡 Customer ID:', order.customer);
    console.log('📡 Vendor ID:', order.vendor);
    
    // Notify the customer
    io.to(`user_${order.customer}`).emit('order_status_updated', order);
    
    // Notify all vendors (for queue management)
    io.to('vendor').emit('order_queue_updated', order);
    
    // Notify the specific vendor
    if (order.vendor) {
      io.to(`vendor_${order.vendor}`).emit('vendor_order_updated', order);
    }

    // Send additional direct notifications
    const statusMessages = {
      confirmed: 'Order confirmed!',
      preparing: 'Your order is being prepared',
      ready: 'Your order is ready for pickup!',
      completed: 'Order completed. Enjoy your meal!'
    };

    if (statusMessages[order.status]) {
      io.to(`user_${order.customer}`).emit('notification', {
        title: '📦 Order Status Update',
        message: `Order #${order.tokenId}: ${statusMessages[order.status]}`,
        type: order.status === 'ready' ? 'success' : 'info'
      });
    }
  },

  orderCancelled: (order) => {
    if (!io) return;
    console.log('📡 Broadcasting order cancellation:', order.tokenId);
    
    // Notify the customer
    io.to(`user_${order.customer}`).emit('order_cancelled', order);
    
    // Notify all vendors
    io.to('vendor').emit('order_cancelled', order);
    
    // Notify the specific vendor
    if (order.vendor) {
      io.to(`vendor_${order.vendor}`).emit('vendor_order_cancelled', order);
    }
  },

  // Notification events
  sendNotification: (userId, notification) => {
    if (!io) return;
    console.log('📡 Sending notification to user:', userId, notification.title);
    io.to(`user_${userId}`).emit('notification', notification);
  },

  broadcastNotification: (role, notification) => {
    if (!io) return;
    console.log('📡 Broadcasting notification to role:', role, notification.title);
    io.to(role).emit('notification', notification);
  },

  // Real-time stats for admin
  statsUpdated: (stats) => {
    if (!io) return;
    console.log('📡 Broadcasting stats update');
    io.to('admin').emit('stats_updated', stats);
  }
};

export default socketEvents;
