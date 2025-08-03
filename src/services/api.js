// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method for making requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Network error' };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const healthURL = `${this.baseURL.replace('/api', '')}/health`;
      console.log('Health check URL:', healthURL);
      const response = await fetch(healthURL);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      console.log('Health check response:', data);
      return data;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async getAllUsers() {
    return this.request('/auth/users');
  }

  async getUserById(userId) {
    return this.request(`/auth/user/${userId}`);
  }

  async updateUser(userId, userData) {
    return this.request(`/auth/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId) {
    return this.request(`/auth/user/${userId}`, {
      method: 'DELETE'
    });
  }

  // Menu methods
  async getMenuItems() {
    return this.request('/menu');
  }

  async getMenuItemById(itemId) {
    return this.request(`/menu/${itemId}`);
  }

  async createMenuItem(itemData) {
    return this.request('/menu', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  }

  async updateMenuItem(itemId, itemData) {
    return this.request(`/menu/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
  }

  async updateMenuItemStock(itemId, stockChange) {
    return this.request(`/menu/${itemId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stockChange })
    });
  }

  async toggleItemAvailability(itemId) {
    return this.request(`/menu/${itemId}/toggle-availability`, {
      method: 'PATCH'
    });
  }

  async deleteMenuItem(itemId) {
    return this.request(`/menu/${itemId}`, {
      method: 'DELETE'
    });
  }

  async getVendorMenu(vendorId) {
    return this.request(`/menu/vendor/${vendorId}`);
  }

  // Order methods
  async getOrders(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/orders${queryParams ? `?${queryParams}` : ''}`);
  }

  async getOrderById(orderId) {
    return this.request(`/orders/${orderId}`);
  }

  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async updateOrderStatus(orderId, statusData) {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData)
    });
  }

  async addOrderRating(orderId, ratingData) {
    return this.request(`/orders/${orderId}/rating`, {
      method: 'POST',
      body: JSON.stringify(ratingData)
    });
  }

  async getCustomerOrders(customerId) {
    return this.request(`/orders/customer/${customerId}`);
  }

  async getVendorOrders(vendorId) {
    return this.request(`/orders/vendor/${vendorId}`);
  }

  async getVendorAnalytics(vendorId) {
    return this.request(`/orders/vendor/${vendorId}/analytics`);
  }

  async cancelOrder(orderId, cancellationData = {}) {
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(cancellationData)
    });
  }

  async deleteOrder(orderId) {
    return this.request(`/orders/${orderId}`, {
      method: 'DELETE'
    });
  }

  async updateOrder(orderId, orderData) {
    return this.request(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
  }

  // Utility methods
  async checkConnection() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Database management
  async resetDatabase() {
    return this.request('/auth/reset-database', {
      method: 'POST'
    });
  }
}

// Create and export singleton instance
const apiService = new ApiService();

export default apiService;

// Export individual methods for destructuring
export const {
  // Auth methods
  login,
  register,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  
  // Menu methods
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  updateMenuItemStock,
  toggleItemAvailability,
  deleteMenuItem,
  getVendorMenu,
  
  // Order methods
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  addOrderRating,
  getCustomerOrders,
  getVendorOrders,
  getVendorAnalytics,
  cancelOrder,
  deleteOrder,
  updateOrder,
  
  // Utility methods
  healthCheck,
  checkConnection,
  resetDatabase
} = apiService;
