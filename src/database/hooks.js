import { useState, useEffect } from 'react';
import apiService from '../services/api.js';
import socket, { on as onSocket, off as offSocket } from '../services/socket.js';

// Custom hook for users
export const useUsers = () => {
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('useUsers hook mounted, loading users...');
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      if (import.meta.env.DEV) {
        console.log('Attempting to load users from API...');
        console.log('API Service:', apiService);
        console.log('API Base URL:', apiService.baseURL);
      }
      
      const response = await apiService.getAllUsers();
      if (import.meta.env.DEV) {
        console.log('API Response:', response);
      }
      
      // Convert array to object with user IDs as keys
      const usersObj = {};
      response.users.forEach(user => {
        usersObj[user._id] = {
          ...user,
          id: user._id // Add id field for compatibility
        };
      });
      
      if (import.meta.env.DEV) {
        console.log('Loaded users from API:', usersObj);
      }
      setUsers(usersObj);
    } catch (error) {
      console.error('Error loading users from API:', error);
      console.error('Error details:', error.message);
      // No fallback - only use MongoDB
      console.error('API connection required. Please check server connection.');
      setUsers({});
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (user) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Attempting to register user via API:', user);
      }
      const response = await apiService.register(user);
      if (import.meta.env.DEV) {
        console.log('Registration API response:', response);
      }
      const newUser = {
        ...response.user,
        id: response.user._id
      };
      
      setUsers(prev => ({ ...prev, [newUser.id]: newUser }));
      return newUser;
    } catch (error) {
      console.error('Error adding user via API:', error);
      // No fallback - only use MongoDB
      console.error('User registration failed. API connection required.');
      throw new Error('Failed to register user. Please check server connection.');
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Updating user via API:', userId, updates);
      }
      const response = await apiService.updateUser(userId, updates);
      if (import.meta.env.DEV) {
        console.log('User updated via API:', response);
      }
      const updatedUser = {
        ...response.user,
        id: response.user._id
      };
      setUsers(prev => ({ ...prev, [userId]: updatedUser }));
      return updatedUser;
    } catch (error) {
      console.error('Error updating user via API:', error);
      throw new Error('Failed to update user. Please check server connection.');
    }
  };

  const deleteUser = async (userId) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Deleting user via API:', userId);
      }
      await apiService.deleteUser(userId);
      if (import.meta.env.DEV) {
        console.log('User deleted via API');
      }
      setUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[userId];
        return newUsers;
      });
      return true;
    } catch (error) {
      console.error('Error deleting user via API:', error);
      throw new Error('Failed to delete user. Please check server connection.');
    }
  };

  const getUserByCredentials = async (email, password) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Attempting to login via API:', email);
      }
      const response = await apiService.login({ email, password });
      if (import.meta.env.DEV) {
        console.log('Login API response:', response);
      }
      const user = {
        ...response.user,
        id: response.user._id
      };
      
      // Update users state with authenticated user
      setUsers(prev => ({ ...prev, [user.id]: user }));
      return user;
    } catch (error) {
      console.error('Error authenticating user via API:', error);
      // Re-throw the error with additional details for the frontend to handle
      throw error;
    }
  };

  const getUserByEmail = (email) => {
    // Only check in current users state from API
    const user = Object.values(users).find(u => u.email === email);
    return user || null;
  };

  const refreshUsers = async () => {
    if (import.meta.env.DEV) {
      console.log('Force refreshing users from API...');
    }
    setUsers({}); // Clear current state
    await loadUsers();
  };

  return {
    users,
    loading,
    addUser,
    updateUser,
    deleteUser,
    getUserByCredentials,
    getUserByEmail,
    refreshUsers
  };
};

// Custom hook for vendor approvals
export const useVendorApprovals = () => {
  const [pendingVendors, setPendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingVendors();
  }, []);

  const loadPendingVendors = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingVendors();
      
      if (response.success) {
        setPendingVendors(response.vendors || []);
      } else {
        console.error('Failed to load pending vendors:', response.message);
        setPendingVendors([]);
      }
    } catch (error) {
      console.error('Error loading pending vendors:', error);
      setPendingVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const approveVendor = async (vendorId, adminId) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Approving vendor:', vendorId, 'by admin:', adminId);
      }
      const response = await apiService.approveVendor(vendorId, adminId);
      if (import.meta.env.DEV) {
        console.log('Approve vendor response:', response);
      }
      
      if (response.success) {
        // Remove from pending list
        setPendingVendors(prev => prev.filter(vendor => vendor._id !== vendorId));
        return true;
      } else {
        console.error('Failed to approve vendor:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      return false;
    }
  };

  const rejectVendor = async (vendorId) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Rejecting vendor:', vendorId);
      }
      const response = await apiService.rejectVendor(vendorId);
      if (import.meta.env.DEV) {
        console.log('Reject vendor response:', response);
      }
      
      if (response.success) {
        // Remove from pending list
        setPendingVendors(prev => prev.filter(vendor => vendor._id !== vendorId));
        return true;
      } else {
        console.error('Failed to reject vendor:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      return false;
    }
  };

  const refreshPendingVendors = async () => {
    if (import.meta.env.DEV) {
      console.log('Force refreshing pending vendors...');
    }
    await loadPendingVendors();
  };

  return {
    pendingVendors,
    loading,
    approveVendor,
    rejectVendor,
    refreshPendingVendors
  };
};

// Custom hook for menu items
export const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenuItems();

    // Realtime menu updates
    const unsubscribes = [];

    unsubscribes.push(onSocket('menu:created', (doc) => {
      // Keep list consistent with initial query (only available, isActive, stock>0)
      if (doc?.available && doc?.isActive !== false && (doc?.stock ?? 0) > 0) {
        setMenuItems((prev) => {
          // avoid duplicates
          if (prev.find((i) => i._id === doc._id)) return prev;
          return [doc, ...prev];
        });
      }
    }));

    unsubscribes.push(onSocket('menu:updated', (doc) => {
      setMenuItems((prev) => {
        // If updated doc no longer matches list criteria, remove it
        const stillMatches = doc?.available && doc?.isActive !== false && (doc?.stock ?? 0) > 0;
        if (!stillMatches) return prev.filter((i) => i._id !== doc._id);
        // else replace
        const idx = prev.findIndex((i) => i._id === doc._id);
        if (idx === -1) return [doc, ...prev];
        const next = [...prev];
        next[idx] = doc;
        return next;
      });
    }));

    unsubscribes.push(onSocket('menu:deleted', ({ _id }) => {
      setMenuItems((prev) => prev.filter((i) => i._id !== _id));
    }));

    return () => unsubscribes.forEach((u) => u && u());
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      if (import.meta.env.DEV) {
        console.log('Loading menu items from API...');
        console.log('API Service base URL:', apiService.baseURL);
      }
      const response = await apiService.getMenuItems();
      if (import.meta.env.DEV) {
        console.log('Menu items API response:', response);
        console.log('Menu items count:', response.items?.length || 0);
      }
      setMenuItems(response.items || []);
    } catch (error) {
      console.error('Error loading menu items from API:', error);
      console.error('Error details:', error.message);
      // No fallback - only use MongoDB
      console.error('API connection required. Please check server connection.');
      setMenuItems([]);
    } finally {
      setLoading(false);
      if (import.meta.env.DEV) {
        console.log('Menu items loading completed');
      }
    }
  };

  const addMenuItem = async (item) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Adding menu item via API:', item);
      }
      const response = await apiService.createMenuItem(item);
      if (import.meta.env.DEV) {
        console.log('Menu item added via API:', response);
      }
      setMenuItems(prev => [...prev, response.item]);
      return response.item;
    } catch (error) {
      console.error('Error adding menu item via API:', error);
      throw new Error('Failed to add menu item. Please check server connection.');
    }
  };

  const updateMenuItem = async (itemId, updates) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Updating menu item via API:', itemId, updates);
      }
      const response = await apiService.updateMenuItem(itemId, updates);
      if (import.meta.env.DEV) {
        console.log('Menu item updated via API:', response);
      }
      setMenuItems(prev => prev.map(item => 
        item._id === itemId ? response.item : item
      ));
      return response.item;
    } catch (error) {
      console.error('Error updating menu item via API:', error);
      throw new Error('Failed to update menu item. Please check server connection.');
    }
  };

  const deleteMenuItem = async (itemId) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Deleting menu item via API:', itemId);
      }
      await apiService.deleteMenuItem(itemId);
      if (import.meta.env.DEV) {
        console.log('Menu item deleted via API');
      }
      setMenuItems(prev => prev.filter(item => item._id !== itemId));
      return true;
    } catch (error) {
      console.error('Error deleting menu item via API:', error);
      throw new Error('Failed to delete menu item. Please check server connection.');
    }
  };

  const updateStock = async (itemId, stockChange) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Updating stock via API:', itemId, stockChange);
      }
      const response = await apiService.updateMenuItemStock(itemId, stockChange);
      if (import.meta.env.DEV) {
        console.log('Stock updated via API:', response);
      }
      setMenuItems(prev => prev.map(item => 
        item._id === itemId ? response.item : item
      ));
      return response.item;
    } catch (error) {
      console.error('Error updating stock via API:', error);
      throw new Error('Failed to update stock. Please check server connection.');
    }
  };

  const getLowStockItems = (threshold = 5) => {
    return menuItems.filter(item => item.stock <= threshold);
  };

  const refreshMenuItems = async () => {
    if (import.meta.env.DEV) {
      console.log('Force refreshing menu items from API...');
    }
    setMenuItems([]); // Clear current state
    await loadMenuItems();
  };

  return {
    menuItems,
    loading,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateStock,
    getLowStockItems,
    refreshMenuItems
  };
};

// Custom hook for orders
export const useOrders = (currentUser, currentRole) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();

    // Realtime order updates
    const unsubscribes = [];
    unsubscribes.push(onSocket('order:created', (doc) => {
      setOrders((prev) => {
        if (!doc || !doc._id) return prev;
        if (prev.find((o) => o._id === doc._id)) return prev;
        return [doc, ...prev];
      });
    }));
    unsubscribes.push(onSocket('order:updated', (doc) => {
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o._id === doc._id);
        if (idx === -1) return [doc, ...prev];
        const next = [...prev];
        next[idx] = doc;
        return next;
      });
    }));
    unsubscribes.push(onSocket('order:deleted', ({ _id }) => {
      setOrders((prev) => prev.filter((o) => o._id !== _id));
    }));
    
    // Set up periodic refresh (every 20 seconds) as a fallback in case realtime fails,
    // but only if we're not on the login/registration page
    // Check if there's any user authenticated to prevent refresh during login
    const interval = setInterval(() => {
      // Only auto-refresh if user is likely logged in (check localStorage)
      const savedAuth = localStorage.getItem('khanaLineupAuth');
      // Also check if we're not currently in a login/registration process
      const authForms = document.querySelectorAll('#login-email, #registration-name');
      const isInAuthFlow = authForms.length > 0 && Array.from(authForms).some(form => document.activeElement === form);
      
      if (savedAuth && !isInAuthFlow) {
        loadOrders();
      }
    }, 20000);

    return () => {
      clearInterval(interval);
      unsubscribes.forEach(u => u && u());
    };
  }, [currentUser, currentRole]);

  const loadOrders = async (user = currentUser, role = currentRole) => {
    try {
      // If no authenticated user/role, avoid unnecessary load under traffic
      if (!user || !role) {
        setOrders([]);
        return;
      }

      setLoading(true);
      if (import.meta.env.DEV) {
        console.log('Loading orders from API for role:', role, 'user:', user?.id || user?._id);
      }

      const userId = user?.id || user?._id;
      let response;

      if (role === 'customer' && userId) {
        response = await apiService.getCustomerOrders(userId);
      } else if (role === 'vendor' && userId) {
        response = await apiService.getVendorOrders(userId);
      } else {
        // Admin or unknown role -> full list with default filters
        response = await apiService.getOrders();
      }

      if (import.meta.env.DEV) {
        console.log('Orders loaded from API:', response);
      }

      setOrders(response.orders || []);
    } catch (error) {
      console.error('Error loading orders from API:', error);
      console.error('API connection required. Please check server connection.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const addOrder = async (order) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Creating order via API:', order);
      }
      const response = await apiService.createOrder(order);
      if (import.meta.env.DEV) {
        console.log('Order created via API:', response);
      }
      setOrders(prev => [response.order, ...prev]);
      return response.order;
    } catch (error) {
      console.error('Error creating order via API:', error);

      // Preserve specific backend errors like multi-vendor validation
      if (error?.errorType === 'MULTI_VENDOR_NOT_ALLOWED' || error?.data?.errorType === 'MULTI_VENDOR_NOT_ALLOWED') {
        throw error;
      }

      throw new Error('Failed to create order. Please check server connection.');
    }
  };

  const updateOrder = async (orderId, updates) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Updating order via API:', orderId, updates);
      }
      const response = await apiService.updateOrder(orderId, updates);
      if (import.meta.env.DEV) {
        console.log('Order updated via API:', response);
      }
      setOrders(prev => prev.map(order => {
        const orderIdMatch = order._id === orderId || order.id === orderId;
        return orderIdMatch ? response.order : order;
      }));
      return response.order;
    } catch (error) {
      console.error('Error updating order via API:', error);
      throw new Error('Failed to update order. Please check server connection.');
    }
  };

  const updateOrderStatus = async (orderId, statusOrData) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Updating order status via API:', orderId, statusOrData);
      }
      
      // Handle both old format (just status string) and new format (data object)
      const statusData = typeof statusOrData === 'string' 
        ? { status: statusOrData } 
        : statusOrData;
      
      const response = await apiService.updateOrderStatus(orderId, statusData);
      if (import.meta.env.DEV) {
        console.log('Order status updated via API:', response);
      }
      setOrders(prev => prev.map(order => {
        const orderIdMatch = order._id === orderId || order.id === orderId;
        if (orderIdMatch) {
          // Use the full updated order from the API response to preserve all fields including estimatedTime
          return response.order || { ...order, ...statusData };
        }
        return order;
      }));
      return true;
    } catch (error) {
      console.error('Error updating order status via API:', error);
      throw new Error('Failed to update order status. Please check server connection.');
    }
  };

  const cancelOrder = async (orderId, reason = '', cancelledBy = 'customer') => {
    try {
      if (import.meta.env.DEV) {
        console.log('Cancelling order via API:', orderId, 'by:', cancelledBy);
      }
      const cancellationData = { reason, cancelledBy };
      
      const response = await apiService.cancelOrder(orderId, cancellationData);
      if (import.meta.env.DEV) {
        console.log('Order cancelled via API:', response);
      }
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order._id === orderId 
          ? { ...order, status: 'cancelled', timestamps: { ...order.timestamps, cancelled: new Date() } }
          : order
      ));
      return true;
    } catch (error) {
      console.error('Error cancelling order via API:', error);
      throw new Error('Failed to cancel order. Please check server connection.');
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Deleting order via API:', orderId);
      }
      await apiService.deleteOrder(orderId);
      if (import.meta.env.DEV) {
        console.log('Order deleted via API');
      }
      setOrders(prev => prev.filter(order => order._id !== orderId));
      return true;
    } catch (error) {
      console.error('Error deleting order via API:', error);
      throw new Error('Failed to delete order. Please check server connection.');
    }
  };

  const deleteMultipleOrders = async (orderIds) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Deleting multiple orders via API:', orderIds);
      }
      // Since there's no bulk delete endpoint, delete one by one
      await Promise.all(orderIds.map(id => apiService.deleteOrder(id)));
      if (import.meta.env.DEV) {
        console.log('Multiple orders deleted via API');
      }
      setOrders(prev => prev.filter(order => !orderIds.includes(order._id)));
      return true;
    } catch (error) {
      console.error('Error deleting multiple orders via API:', error);
      throw new Error('Failed to delete orders. Please check server connection.');
    }
  };

  const deleteOrdersByDateRange = async (startDate, endDate) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Deleting orders by date range via API:', startDate, endDate);
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Filter orders in the date range
      const ordersToDelete = orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.timestamp);
        return orderDate >= start && orderDate <= end;
      });
      
      // Delete them via API
      await Promise.all(ordersToDelete.map(order => apiService.deleteOrder(order._id)));
      if (import.meta.env.DEV) {
        console.log('Orders deleted by date range via API');
      }
      
      setOrders(prev => prev.filter(order => {
        const orderDate = new Date(order.createdAt || order.timestamp);
        return orderDate < start || orderDate > end;
      }));
      return true;
    } catch (error) {
      console.error('Error deleting orders by date range via API:', error);
      throw new Error('Failed to delete orders by date range. Please check server connection.');
    }
  };

  const getOrdersByCustomer = (customerId) => {
    return orders.filter(order => {
      // Handle both string ID and object customer
      const orderCustomerId = typeof order.customer === 'object' 
        ? order.customer._id || order.customer.id 
        : order.customer;
      return orderCustomerId === customerId;
    });
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  const getOrdersByDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt || order.timestamp);
      return orderDate >= start && orderDate <= end;
    });
  };

  const refreshOrders = async () => {
    if (import.meta.env.DEV) {
      console.log('Force refreshing orders from API...');
    }
    setOrders([]); // Clear current state
    await loadOrders();
  };

  return {
    orders,
    loading,
    addOrder,
    updateOrder,
    updateOrderStatus,
    cancelOrder,
    deleteOrder,
    deleteMultipleOrders,
    deleteOrdersByDateRange,
    getOrdersByCustomer,
    getOrdersByStatus,
    getOrdersByDateRange,
    refreshOrders
  };
};

// Custom hook for settings
export const useSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // For now, use default settings since we don't have a settings API yet
    setSettings({
      notifications: true,
      autoRefresh: true,
      theme: 'light'
    });
    setLoading(false);
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      // TODO: Implement settings API
      if (import.meta.env.DEV) {
        console.log('Settings updated locally (API not implemented yet):', newSettings);
      }
      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  return {
    settings,
    loading,
    updateSettings
  };
};

// Custom hook for analytics
export const useAnalytics = () => {
  const getPopularItems = (limit = 10) => {
    // TODO: Implement analytics API
    if (import.meta.env.DEV) {
      console.log('Analytics not implemented yet - using local data');
    }
    return [];
  };

  const getSalesData = (days = 7) => {
    // TODO: Implement analytics API
    if (import.meta.env.DEV) {
      console.log('Sales data analytics not implemented yet');
    }
    return {
      totalOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };
  };

  const getDailySales = (days = 30) => {
    // TODO: Implement analytics API
    if (import.meta.env.DEV) {
      console.log('Daily sales analytics not implemented yet');
    }
    return {};
  };

  return {
    getPopularItems,
    getSalesData,
    getDailySales
  };
};

// Custom hook for database operations
export const useDatabase = () => {
  const exportData = async () => {
    try {
      // TODO: Implement export API
      if (import.meta.env.DEV) {
        console.log('Data export not implemented yet');
      }
      return null;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  };

  const importData = async (jsonData) => {
    try {
      // TODO: Implement import API
      if (import.meta.env.DEV) {
        console.log('Data import not implemented yet');
      }
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  };

  const createBackup = async () => {
    try {
      // TODO: Implement backup API
      if (import.meta.env.DEV) {
        console.log('Backup creation not implemented yet');
      }
      return null;
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  };

  const getBackups = async () => {
    try {
      // TODO: Implement backup listing API
      if (import.meta.env.DEV) {
        console.log('Backup listing not implemented yet');
      }
      return [];
    } catch (error) {
      console.error('Error getting backups:', error);
      return [];
    }
  };

  const restoreBackup = async (backupIndex) => {
    try {
      // TODO: Implement backup restore API
      if (import.meta.env.DEV) {
        console.log('Backup restore not implemented yet');
      }
      return false;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  };

  const clearDatabase = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('Clearing database via API...');
      }
      const response = await apiService.resetDatabase();
      if (import.meta.env.DEV) {
        console.log('Database cleared via API:', response);
      }
      return response.success;
    } catch (error) {
      console.error('Error clearing database via API:', error);
      throw new Error('Failed to clear database. Please check server connection.');
    }
  };

  return {
    exportData,
    importData,
    createBackup,
    getBackups,
    restoreBackup,
    clearDatabase
  };
};
