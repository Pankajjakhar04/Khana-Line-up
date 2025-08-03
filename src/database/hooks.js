import { useState, useEffect } from 'react';
import apiService from '../services/api.js';

// Custom hook for users
export const useUsers = () => {
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useUsers hook mounted, loading users...');
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Attempting to load users from API...');
      console.log('API Service:', apiService);
      console.log('API Base URL:', apiService.baseURL);
      
      const response = await apiService.getAllUsers();
      console.log('API Response:', response);
      
      // Convert array to object with user IDs as keys
      const usersObj = {};
      response.users.forEach(user => {
        usersObj[user._id] = {
          ...user,
          id: user._id // Add id field for compatibility
        };
      });
      
      console.log('Loaded users from API:', usersObj);
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
      console.log('Attempting to register user via API:', user);
      const response = await apiService.register(user);
      console.log('Registration API response:', response);
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
      console.log('Updating user via API:', userId, updates);
      const response = await apiService.updateUser(userId, updates);
      console.log('User updated via API:', response);
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
      console.log('Deleting user via API:', userId);
      await apiService.deleteUser(userId);
      console.log('User deleted via API');
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
      console.log('Attempting to login via API:', email);
      const response = await apiService.login({ email, password });
      console.log('Login API response:', response);
      const user = {
        ...response.user,
        id: response.user._id
      };
      
      // Update users state with authenticated user
      setUsers(prev => ({ ...prev, [user.id]: user }));
      return user;
    } catch (error) {
      console.error('Error authenticating user via API:', error);
      // No fallback - only use MongoDB
      console.error('Login failed. API connection required.');
      throw new Error('Authentication failed. Please check server connection.');
    }
  };

  const getUserByEmail = (email) => {
    // Only check in current users state from API
    const user = Object.values(users).find(u => u.email === email);
    return user || null;
  };

  const refreshUsers = async () => {
    console.log('Force refreshing users from API...');
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

// Custom hook for menu items
export const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      console.log('Loading menu items from API...');
      console.log('API Service base URL:', apiService.baseURL);
      const response = await apiService.getMenuItems();
      console.log('Menu items API response:', response);
      console.log('Menu items count:', response.items?.length || 0);
      setMenuItems(response.items || []);
    } catch (error) {
      console.error('Error loading menu items from API:', error);
      console.error('Error details:', error.message);
      // No fallback - only use MongoDB
      console.error('API connection required. Please check server connection.');
      setMenuItems([]);
    } finally {
      setLoading(false);
      console.log('Menu items loading completed');
    }
  };

  const addMenuItem = async (item) => {
    try {
      console.log('Adding menu item via API:', item);
      const response = await apiService.createMenuItem(item);
      console.log('Menu item added via API:', response);
      setMenuItems(prev => [...prev, response.item]);
      return response.item;
    } catch (error) {
      console.error('Error adding menu item via API:', error);
      throw new Error('Failed to add menu item. Please check server connection.');
    }
  };

  const updateMenuItem = async (itemId, updates) => {
    try {
      console.log('Updating menu item via API:', itemId, updates);
      const response = await apiService.updateMenuItem(itemId, updates);
      console.log('Menu item updated via API:', response);
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
      console.log('Deleting menu item via API:', itemId);
      await apiService.deleteMenuItem(itemId);
      console.log('Menu item deleted via API');
      setMenuItems(prev => prev.filter(item => item._id !== itemId));
      return true;
    } catch (error) {
      console.error('Error deleting menu item via API:', error);
      throw new Error('Failed to delete menu item. Please check server connection.');
    }
  };

  const updateStock = async (itemId, stockChange) => {
    try {
      console.log('Updating stock via API:', itemId, stockChange);
      const response = await apiService.updateMenuItemStock(itemId, stockChange);
      console.log('Stock updated via API:', response);
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
    console.log('Force refreshing menu items from API...');
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
export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    
    // Set up periodic refresh every 30 seconds to ensure real-time updates
    const interval = setInterval(() => {
      loadOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('Loading orders from API...');
      const response = await apiService.getOrders();
      console.log('Orders loaded from API:', response);
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
      console.log('Creating order via API:', order);
      const response = await apiService.createOrder(order);
      console.log('Order created via API:', response);
      setOrders(prev => [response.order, ...prev]);
      return response.order;
    } catch (error) {
      console.error('Error creating order via API:', error);
      throw new Error('Failed to create order. Please check server connection.');
    }
  };

  const updateOrder = async (orderId, updates) => {
    try {
      console.log('Updating order via API:', orderId, updates);
      const response = await apiService.updateOrder(orderId, updates);
      console.log('Order updated via API:', response);
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
      console.log('Updating order status via API:', orderId, statusOrData);
      
      // Handle both old format (just status string) and new format (data object)
      const statusData = typeof statusOrData === 'string' 
        ? { status: statusOrData } 
        : statusOrData;
      
      const response = await apiService.updateOrderStatus(orderId, statusData);
      console.log('Order status updated via API:', response);
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
      console.log('Cancelling order via API:', orderId, 'by:', cancelledBy);
      const cancellationData = { reason, cancelledBy };
      
      const response = await apiService.cancelOrder(orderId, cancellationData);
      console.log('Order cancelled via API:', response);
      
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
      console.log('Deleting order via API:', orderId);
      await apiService.deleteOrder(orderId);
      console.log('Order deleted via API');
      setOrders(prev => prev.filter(order => order._id !== orderId));
      return true;
    } catch (error) {
      console.error('Error deleting order via API:', error);
      throw new Error('Failed to delete order. Please check server connection.');
    }
  };

  const deleteMultipleOrders = async (orderIds) => {
    try {
      console.log('Deleting multiple orders via API:', orderIds);
      // Since there's no bulk delete endpoint, delete one by one
      await Promise.all(orderIds.map(id => apiService.deleteOrder(id)));
      console.log('Multiple orders deleted via API');
      setOrders(prev => prev.filter(order => !orderIds.includes(order._id)));
      return true;
    } catch (error) {
      console.error('Error deleting multiple orders via API:', error);
      throw new Error('Failed to delete orders. Please check server connection.');
    }
  };

  const deleteOrdersByDateRange = async (startDate, endDate) => {
    try {
      console.log('Deleting orders by date range via API:', startDate, endDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Filter orders in the date range
      const ordersToDelete = orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.timestamp);
        return orderDate >= start && orderDate <= end;
      });
      
      // Delete them via API
      await Promise.all(ordersToDelete.map(order => apiService.deleteOrder(order._id)));
      console.log('Orders deleted by date range via API');
      
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
    console.log('Force refreshing orders from API...');
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
      console.log('Settings updated locally (API not implemented yet):', newSettings);
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
    console.log('Analytics not implemented yet - using local data');
    return [];
  };

  const getSalesData = (days = 7) => {
    // TODO: Implement analytics API
    console.log('Sales data analytics not implemented yet');
    return {
      totalOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };
  };

  const getDailySales = (days = 30) => {
    // TODO: Implement analytics API
    console.log('Daily sales analytics not implemented yet');
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
      console.log('Data export not implemented yet');
      return null;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  };

  const importData = async (jsonData) => {
    try {
      // TODO: Implement import API
      console.log('Data import not implemented yet');
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  };

  const createBackup = async () => {
    try {
      // TODO: Implement backup API
      console.log('Backup creation not implemented yet');
      return null;
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  };

  const getBackups = async () => {
    try {
      // TODO: Implement backup listing API
      console.log('Backup listing not implemented yet');
      return [];
    } catch (error) {
      console.error('Error getting backups:', error);
      return [];
    }
  };

  const restoreBackup = async (backupIndex) => {
    try {
      // TODO: Implement backup restore API
      console.log('Backup restore not implemented yet');
      return false;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  };

  const clearDatabase = async () => {
    try {
      console.log('Clearing database via API...');
      const response = await apiService.resetDatabase();
      console.log('Database cleared via API:', response);
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
