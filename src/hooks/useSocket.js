import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

export const useSocket = (user) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    console.log('🔌 Connecting to socket:', SOCKET_URL);
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
      
      // Register user with server
      socket.emit('register_user', {
        userId: user.id || user._id,
        role: user.role,
        name: user.name
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      
      // Re-register user after reconnection
      socket.emit('register_user', {
        userId: user.id || user._id,
        role: user.role,
        name: user.name
      });
    });

    // Notification event
    socket.on('notification', (notification) => {
      console.log('🔔 Received notification:', notification);
      addNotification(notification);
    });

    return () => {
      if (socket) {
        console.log('🔌 Cleaning up socket connection');
        socket.disconnect();
      }
    };
  }, [user]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50 notifications
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  // Socket event listeners
  const addEventListener = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const removeEventListener = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    notifications,
    unreadNotifications: notifications.filter(n => !n.read),
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    removeNotification,
    addEventListener,
    removeEventListener,
    emit
  };
};

// Hook for menu real-time updates
export const useMenuSocket = (socket, onMenuUpdate) => {
  useEffect(() => {
    if (!socket) return;

    const handleMenuUpdated = (menuItem) => {
      console.log('📡 Menu item updated:', menuItem.name);
      onMenuUpdate({ type: 'updated', menuItem });
    };

    const handleMenuItemAdded = (menuItem) => {
      console.log('📡 Menu item added:', menuItem.name);
      onMenuUpdate({ type: 'added', menuItem });
    };

    const handleMenuItemDeleted = ({ menuItemId }) => {
      console.log('📡 Menu item deleted:', menuItemId);
      onMenuUpdate({ type: 'deleted', menuItemId });
    };

    socket.on('menu_updated', handleMenuUpdated);
    socket.on('menu_item_added', handleMenuItemAdded);
    socket.on('menu_item_deleted', handleMenuItemDeleted);

    return () => {
      socket.off('menu_updated', handleMenuUpdated);
      socket.off('menu_item_added', handleMenuItemAdded);
      socket.off('menu_item_deleted', handleMenuItemDeleted);
    };
  }, [socket, onMenuUpdate]);
};

// Hook for order real-time updates
export const useOrderSocket = (socket, onOrderUpdate) => {
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (order) => {
      console.log('📡 New order received:', order.tokenId);
      onOrderUpdate({ type: 'new_order', order });
    };

    const handleOrderStatusUpdated = (order) => {
      console.log('📡 Order status updated:', order.tokenId, order.status);
      onOrderUpdate({ type: 'status_updated', order });
    };

    const handleOrderCancelled = (order) => {
      console.log('📡 Order cancelled:', order.tokenId);
      onOrderUpdate({ type: 'cancelled', order });
    };

    const handleOrderCreated = (order) => {
      console.log('📡 Order created:', order.tokenId);
      onOrderUpdate({ type: 'created', order });
    };

    const handleVendorNewOrder = (order) => {
      console.log('📡 Vendor new order:', order.tokenId);
      onOrderUpdate({ type: 'vendor_new_order', order });
    };

    const handleOrderQueueUpdated = (order) => {
      console.log('📡 Order queue updated:', order.tokenId);
      onOrderUpdate({ type: 'queue_updated', order });
    };

    // Customer events
    socket.on('order_created', handleOrderCreated);
    socket.on('order_status_updated', handleOrderStatusUpdated);
    socket.on('order_cancelled', handleOrderCancelled);

    // Vendor events
    socket.on('new_order', handleNewOrder);
    socket.on('vendor_new_order', handleVendorNewOrder);
    socket.on('order_queue_updated', handleOrderQueueUpdated);
    socket.on('vendor_order_updated', handleOrderStatusUpdated);
    socket.on('vendor_order_cancelled', handleOrderCancelled);

    return () => {
      socket.off('order_created', handleOrderCreated);
      socket.off('order_status_updated', handleOrderStatusUpdated);
      socket.off('order_cancelled', handleOrderCancelled);
      socket.off('new_order', handleNewOrder);
      socket.off('vendor_new_order', handleVendorNewOrder);
      socket.off('order_queue_updated', handleOrderQueueUpdated);
      socket.off('vendor_order_updated', handleOrderStatusUpdated);
      socket.off('vendor_order_cancelled', handleOrderCancelled);
    };
  }, [socket, onOrderUpdate]);
};

export default useSocket;
