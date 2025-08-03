import React, { useState, useEffect } from 'react';
import { User, ShoppingCart, Clock, CheckCircle, Package, Plus, Minus, Edit, Trash2, Bell, History, Store, Users, Settings, Search, Filter, Eye, EyeOff, UserPlus, LogIn, TrendingUp, TrendingDown, BarChart3, Database, AlertTriangle, X } from 'lucide-react';
import { useUsers, useMenuItems, useOrders, useSettings, useAnalytics, useDatabase, useVendorApprovals } from './database/hooks.js';
import apiService from './services/api.js';

const KhanaLineupApp = () => {
  // Database hooks
  const { users, addUser, updateUser, deleteUser, getUserByCredentials, getUserByEmail, refreshUsers } = useUsers();
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem, loading, refreshMenuItems } = useMenuItems();
  const { orders, addOrder, updateOrder, updateOrderStatus, cancelOrder, deleteOrder, deleteMultipleOrders, deleteOrdersByDateRange, getOrdersByCustomer, refreshOrders } = useOrders();
  const { settings, updateSettings } = useSettings();
  const analytics = useAnalytics();
  const database = useDatabase();
  const { pendingVendors, approveVendor, rejectVendor, refreshPendingVendors } = useVendorApprovals();

  // Debug: Log users on app load
  useEffect(() => {
    console.log('App loaded, users available:', users);
    console.log('Admin user check:', users.admin1);
  }, [users]);

  // Debug: Add global debug function
  useEffect(() => {
    window.debugVendorApprovals = {
      pendingVendors,
      refreshPendingVendors,
      testAPI: async () => {
        try {
          console.log('🧪 Testing API directly...');
          const response = await fetch('http://localhost:5000/api/auth/pending-vendors');
          const data = await response.json();
          console.log('🧪 Direct API response:', data);
          return data;
        } catch (error) {
          console.error('🧪 Direct API error:', error);
          return error;
        }
      }
    };
  }, [pendingVendors, refreshPendingVendors]);

  // State management
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Authentication persistence - check for saved login on app load
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const savedAuth = localStorage.getItem('khanaLineupAuth');
        
        if (savedAuth) {
          const { userId, userRole } = JSON.parse(savedAuth);
          
          // Wait a bit for users data to load if it's empty
          if (Object.keys(users).length === 0) {
            // Wait up to 2 seconds for users to load
            for (let i = 0; i < 20; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              if (Object.keys(users).length > 0 || !isMounted) break;
            }
          }
          
          if (!isMounted) return;
          
          // Find the user in current users data
          const allUsers = Object.values(users);
          const user = allUsers.find(u => u.id === userId);
          
          if (user) {
            setCurrentUser(user);
            setCurrentRole(userRole);
            setActiveTab(userRole === 'customer' ? 'menu' : userRole === 'vendor' ? 'orders' : 'dashboard');
          } else {
            // User not found, clear invalid auth
            localStorage.removeItem('khanaLineupAuth');
            setActiveTab('login');
          }
        } else {
          // No saved auth, show login
          setActiveTab('login');
        }
      } catch (error) {
        console.error('Error parsing saved auth:', error);
        localStorage.removeItem('khanaLineupAuth');
        setActiveTab('login');
      }
      
      if (isMounted) {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [users]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState(''); // Initialize as empty, will be set by useEffect
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [orderFilter, setOrderFilter] = useState('7days');
  const [isRegistering, setIsRegistering] = useState(false);
  const [estimatedTimes, setEstimatedTimes] = useState({}); // Local state for estimated time inputs
  
  // Admin order management state
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Profile dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Legacy support for existing code
  const registeredUsers = Object.values(users);
  const defaultUsers = {};

  // Token counter from settings
  const tokenCounter = settings.tokenCounter || 1;
  const setTokenCounter = (newValue) => {
    updateSettings({ tokenCounter: newValue });
  };

  // Authentication Form Component
  const AuthForm = () => {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      name: '',
      role: 'customer'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
      const newErrors = {};
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.password) newErrors.password = 'Password is required';
      if (isRegistering && !formData.name) newErrors.name = 'Name is required';
      if (isRegistering && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleRegister = () => {
      try {
        if (!validateForm()) return;
        
        const existingUser = getUserByEmail(formData.email);
        
        if (existingUser) {
          setErrors({ email: 'Email already registered' });
          return;
        }
        
        const newUser = {
          email: formData.email.toLowerCase(), // Store email in lowercase
          password: formData.password,
          name: formData.name,
          role: formData.role,
          status: 'active'
        };
        
        const result = addUser(newUser);
        
        if (result) {
          const registeredEmail = newUser.email;
          setIsRegistering(false);
          setFormData({ email: registeredEmail, password: '', name: '', role: 'customer' });
          setErrors({});
          alert(`🎉 Registration Successful! Welcome ${newUser.name}! You can now login with your credentials as a ${newUser.role}.`);
        } else {
          setErrors({ general: 'Registration failed. Please try again.' });
        }
      } catch (error) {
        console.error('Registration error:', error);
        setErrors({ general: 'Registration failed due to an error. Please try again.' });
      }
    };

    const handleLogin = async () => {
      if (!validateForm()) return;

      try {
        console.log('Attempting login with:', formData.email, formData.password);
        console.log('Available users:', Object.values(users));
        
        const user = await getUserByCredentials(formData.email, formData.password);
        console.log('Found user:', user);

        if (user) {
          setCurrentUser(user);
          setCurrentRole(user.role);
          setActiveTab(user.role === 'customer' ? 'menu' : user.role === 'vendor' ? 'orders' : 'dashboard');
          setFormData({ email: '', password: '', name: '', role: 'customer' });
          
          // Save authentication to localStorage for persistence
          localStorage.setItem('khanaLineupAuth', JSON.stringify({
            userId: user.id,
            userRole: user.role
          }));
        } else {
          console.log('Login failed - user not found');
          setErrors({ email: 'Invalid email or password' });
        }
      } catch (error) {
        console.error('Login error:', error);
        console.error('Error errorType:', error.errorType);
        console.error('Error status:', error.status);
        console.error('Error data:', error.data);
        
        // Check if it's an email not found error
        if (error.errorType === 'email_not_found' || 
            (error.message && error.message.includes('Email not found')) ||
            (error.status === 404 && error.data && error.data.errorType === 'email_not_found')) {
          setErrors({ 
            email: 'Email not found. Would you like to register instead?' 
          });
        } else if (error.errorType === 'VENDOR_PENDING_APPROVAL' || 
                   (error.status === 403 && error.data && error.data.errorType === 'VENDOR_PENDING_APPROVAL') ||
                   (error.message && error.message.includes('pending approval'))) {
          setErrors({ 
            email: 'Your vendor account is pending approval. Please wait for admin approval to login.' 
          });
        } else {
          setErrors({ email: 'Invalid email or password' });
        }
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
              Khana Line-up
            </h1>
            <p className="text-gray-600 text-lg">Order ahead, skip the wait</p>
          </div>
          
          <div className="flex mb-6">
            <button
              onClick={() => setIsRegistering(false)}
              className={`flex-1 py-2 rounded-l-lg transition-all duration-300 ${
                !isRegistering 
                  ? 'bg-orange-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LogIn className="inline mr-2" size={18} />
              Login
            </button>
            <button
              onClick={() => setIsRegistering(true)}
              className={`flex-1 py-2 rounded-r-lg transition-all duration-300 ${
                isRegistering 
                  ? 'bg-orange-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UserPlus className="inline mr-2" size={18} />
              Register
            </button>
          </div>

          <div className="space-y-4">
            {isRegistering && (
              <div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
            )}
            
            <div>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <div className="mt-1">
                  <p className="text-red-500 text-sm">{errors.email}</p>
                  {errors.email.includes('Email not found') && (
                    <p className="text-blue-600 text-sm mt-1">
                      Don't have an account? 
                      <button 
                        onClick={() => setIsRegistering(true)}
                        className="ml-1 underline hover:text-blue-800 font-medium"
                      >
                        Register here
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 pr-12 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {isRegistering && (
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
              </select>
            )}
          </div>

          {errors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-4">
              <p className="text-sm">{errors.general}</p>
            </div>
          )}

          <button
            onClick={isRegistering ? handleRegister : handleLogin}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 text-lg font-semibold mt-6 transform hover:scale-105 shadow-lg"
          >
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    setActiveTab('login');
    setCart([]);
    setShowProfileDropdown(false);
    
    // Clear authentication from localStorage
    localStorage.removeItem('khanaLineupAuth');
  };

  // Handle profile view
  const handleProfile = () => {
    setActiveTab('profile');
    setShowProfileDropdown(false);
  };

  // Global order deletion handler
  const handleOrderDelete = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        // Ensure we have a valid order ID
        const actualOrderId = orderId._id || orderId.id || orderId;
        
        await deleteOrder(actualOrderId);
        // Update selected orders state if the deleted order was selected
        setSelectedOrders(prev => prev.filter(id => id !== actualOrderId));
        // Show success notification
        setNotifications([...notifications, {
          id: Date.now(),
          message: 'Order deleted successfully!',
          type: 'success',
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order. Please try again.');
      }
    }
  };

  // Navigation Component
  const Navigation = () => {
    const navItems = {
      customer: [
        { id: 'menu', label: 'Menu', icon: Package },
        { id: 'cart', label: 'Cart', icon: ShoppingCart },
        { id: 'orders', label: 'My Orders', icon: History }
      ],
      vendor: [
        { id: 'orders', label: 'Order Queue', icon: Clock },
        { id: 'menu-manage', label: 'Manage Menu', icon: Edit },
        { id: 'completed', label: 'Completed', icon: CheckCircle },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 }
      ],
      admin: [
        { id: 'dashboard', label: 'Dashboard', icon: Settings },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'vendor-approvals', label: 'Vendor Approvals', icon: UserPlus },
        { id: 'orders', label: 'Order Management', icon: Package }
      ]
    };

    return (
      <nav className="bg-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl">
                <Store className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  Khana Line-up
                </h1>
                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs capitalize font-medium">
                  {currentRole}
                </span>
              </div>
            </div>
            
            <div className="hidden md:flex space-x-2">
              {navItems[currentRole]?.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      activeTab === item.id 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="hidden lg:block">{item.label}</span>
                    {item.id === 'cart' && cart.length > 0 && (
                      <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs animate-pulse">
                        {cart.length}
                      </span>
                    )}
                    {item.id === 'vendor-approvals' && pendingVendors.length > 0 && (
                      <span className="bg-orange-500 text-white rounded-full px-2 py-1 text-xs animate-pulse">
                        {pendingVendors.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 flex items-center gap-2"
              >
                <User size={20} />
                <span className="hidden sm:block text-sm font-medium">{currentUser?.name}</span>
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleProfile}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <User size={16} />
                    Profile
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogIn size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  };

  // Customer Menu View
  const MenuView = () => {
    const [selectedCategory, setSelectedCategory] = useState('all');

    const addToCart = (item) => {
      const existingItem = cart.find(cartItem => cartItem.id === item.id);

      if (existingItem) {
        setCart(cart.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ));
      } else {
        setCart([...cart, { ...item, quantity: 1 }]);
      }
      
      setShowCart(true);
      setTimeout(() => setShowCart(false), 3000);
    };

    const filteredItems = menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory; // Show all items, let button handle availability
    });

    const categories = ['all', ...new Set(menuItems.map(item => item.category))];

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Our Menu</h2>
          
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'All Items' : category}
            </button>
          ))}
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No items found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group ${!item.available ? 'opacity-75' : ''}`}>
                <div className="bg-gradient-to-br from-orange-100 to-red-100 h-32 flex items-center justify-center">
                  <Package size={40} className="text-orange-500" />
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-semibold mb-2 group-hover:text-orange-600 transition-colors">
                    {item.name}
                    {!item.available && <span className="text-red-500 text-sm ml-2">(Currently Unavailable)</span>}
                  </h4>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500">{item.category}</p>
                    <p className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-full">
                      {item.vendor?.restaurantName || item.vendor?.name || item.vendorName || 'Unknown Vendor'}
                    </p>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 mb-2">{item.description}</p>
                  )}
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-2xl font-bold text-orange-600">₹{item.price}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.available}
                    className={`w-full py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 shadow-lg ${
                      item.available 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={20} />
                    {item.available ? 'Add to Cart' : 'Unavailable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <button
            onClick={() => setActiveTab('cart')}
            className={`fixed bottom-6 right-6 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-full shadow-2xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-110 z-50 ${
              showCart ? 'animate-bounce' : ''
            }`}
          >
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs animate-pulse">
              {cart.length}
            </span>
          </button>
        )}
      </div>
    );
  };

  // Cart View
  const CartView = () => {
    const updateQuantity = (id, newQuantity) => {
      if (newQuantity === 0) {
        setCart(cart.filter(item => item.id !== id));
      } else {
        setCart(cart.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        ));
      }
    };

    const totalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    const placeOrder = async () => {
      if (cart.length === 0) return;

      // Group cart items by vendor since backend expects one vendor per order
      const itemsByVendor = cart.reduce((acc, item) => {
        const vendorId = item.vendor?._id || item.vendorId;
        if (!vendorId) {
          console.error('Item missing vendor information:', item);
          return acc;
        }
        
        if (!acc[vendorId]) {
          acc[vendorId] = {
            vendor: item.vendor,
            items: []
          };
        }
        
        acc[vendorId].items.push({
          menuItem: item._id || item.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        });
        
        return acc;
      }, {});

      try {
        // Create separate orders for each vendor
        const orderPromises = Object.entries(itemsByVendor).map(async ([vendorId, data]) => {
          const newOrder = {
            customer: currentUser.id,
            vendor: vendorId,
            items: data.items,
            status: 'ordered'
          };

          return await addOrder(newOrder);
        });

        const results = await Promise.all(orderPromises);
        setCart([]);
        setActiveTab('orders');
        
        // Add notifications for each order
        results.forEach((result, index) => {
          if (result) {
            setNotifications(prev => [...prev, {
              id: Date.now() + index,
              message: `New Order Placed - Token #${result.tokenId}`,
              type: 'order',
              timestamp: new Date().toISOString()
            }]);
          }
        });

      } catch (error) {
        console.error('Error placing order:', error);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: 'Failed to place order. Please try again.',
          type: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
    };

    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Your Cart</h2>
        
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-4">Your cart is empty</p>
            <button
              onClick={() => setActiveTab('menu')}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {cart.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-xl transition-all duration-300">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">{item.name}</h4>
                  <p className="text-gray-600">₹{item.price} each</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="bg-white p-2 rounded-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-sm"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-lg font-semibold px-4">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="bg-white p-2 rounded-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="text-lg font-bold text-orange-600 min-w-20 text-right">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              </div>
            ))}
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-semibold">Total Amount:</span>
                <span className="text-3xl font-bold text-orange-600">₹{totalAmount}</span>
              </div>
              <button
                onClick={placeOrder}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 text-lg font-semibold transform hover:scale-105 shadow-lg"
              >
                Place Order
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Customer Orders View
  const CustomerOrdersView = () => {
    const customerOrders = getOrdersByCustomer(currentUser.id);
    const [showHistory, setShowHistory] = useState(false);
    
    const activeOrders = customerOrders.filter(order => order.status !== 'completed' && order.status !== 'cancelled');
    const completedOrders = customerOrders.filter(order => order.status === 'completed' || order.status === 'cancelled');

    const getStatusColor = (status) => {
      switch (status) {
        case 'ordered': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'preparing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'ready': return 'bg-green-100 text-green-800 border-green-200';
        case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const handleCancelOrder = async (orderId) => {
      const reason = prompt('Please provide a reason for cancellation (optional):');
      if (reason !== null) { // User didn't press cancel
        try {
          await cancelOrder(orderId, reason || 'Cancelled by customer', 'customer');
          setNotifications([...notifications, {
            id: Date.now(),
            message: 'Order cancelled successfully!',
            type: 'success',
            timestamp: new Date().toISOString()
          }]);
        } catch (error) {
          console.error('Error cancelling order:', error);
          alert('Failed to cancel order. Please try again.');
        }
      }
    };

    const ordersToShow = showHistory ? completedOrders : activeOrders;

    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-800">My Orders</h2>
          <div className="flex gap-2">
            <button
              onClick={() => refreshOrders()}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300"
            >
              Refresh Orders
            </button>
            <button
              onClick={() => setShowHistory(false)}
              className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                !showHistory 
                  ? 'bg-orange-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Active Orders
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                showHistory 
                  ? 'bg-orange-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Order History
            </button>
          </div>
        </div>
        
        {ordersToShow.length === 0 ? (
          <div className="text-center py-12">
            <History size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-4">
              {showHistory ? 'No order history found' : 'No active orders found'}
            </p>
            {!showHistory && (
              <button
                onClick={() => setActiveTab('menu')}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105"
              >
                Order Now
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {ordersToShow.map(order => (
              <div key={order._id || order.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-orange-600">Token #{order.tokenId}</h3>
                    <p className="text-gray-600">{new Date(order.createdAt || order.timestamp).toLocaleString()}</p>
                    {order.items && order.items.length > 0 && (order.items[0].vendor?.name || order.items[0].vendorName) && (
                      <p className="text-sm text-orange-600 font-medium">Vendor: {order.items[0].vendor?.name || order.items[0].vendorName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {order.status === 'ready' && (
                      <div className="animate-pulse">
                        <Bell className="text-green-500" size={20} />
                      </div>
                    )}
                    {/* Cancel button for orders that can be cancelled */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'ready' && (
                      <button
                        onClick={() => handleCancelOrder(order._id || order.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        title="Cancel Order"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Debug info for estimated time - only visible in console */}
                {(() => {
                  console.log('Order debug:', {
                    tokenId: order.tokenId,
                    estimatedTime: order.estimatedTime,
                    estimatedTimeType: typeof order.estimatedTime,
                    status: order.status,
                    statusLower: order.status?.toLowerCase(),
                    shouldShow: (order.estimatedTime !== undefined && order.estimatedTime !== null && Number(order.estimatedTime) > 0) && !['completed', 'cancelled'].includes(order.status?.toLowerCase())
                  });
                  return null;
                })()}
                
                {/* Show estimated time for active orders */}
                {(order.estimatedTime !== undefined && order.estimatedTime !== null && 
                  (
                    (typeof order.estimatedTime === 'string' && order.estimatedTime.trim() !== '') ||
                    (typeof order.estimatedTime === 'number' && order.estimatedTime > 0) ||
                    (!isNaN(Number(order.estimatedTime)) && Number(order.estimatedTime) > 0)
                  )
                ) && 
                 !['completed', 'cancelled'].includes(order.status?.toLowerCase()) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-orange-600" />
                      <span className="text-orange-800 font-medium">
                        Estimated Time: {typeof order.estimatedTime === 'number' ? `${order.estimatedTime} minutes` : order.estimatedTime}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Fallback: Show message for ready orders without estimated time */}
                {order.status?.toLowerCase() === 'ready' && 
                 (order.estimatedTime === undefined || order.estimatedTime === null || 
                  (typeof order.estimatedTime === 'string' && order.estimatedTime.trim() === '') ||
                  (typeof order.estimatedTime === 'number' && order.estimatedTime <= 0) ||
                  (isNaN(Number(order.estimatedTime)) && typeof order.estimatedTime !== 'string')
                 ) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-blue-600" />
                      <span className="text-blue-800 font-medium">
                        Your order is ready for pickup!
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-700">{item.name} x {item.quantity}</span>
                        <span className="font-semibold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-4 pt-4 flex justify-between items-center">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-xl font-bold text-orange-600">₹{order.totalAmount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Vendor Orders View
  const VendorOrdersView = () => {
    // Filter orders for current vendor only
    const vendorOrders = orders.filter(order => {
      const orderVendorId = typeof order.vendor === 'object' 
        ? order.vendor._id || order.vendor.id 
        : order.vendor;
      return orderVendorId === currentUser.id;
    });
    
    const queueOrders = vendorOrders.filter(order => order.status !== 'completed' && order.status !== 'cancelled');

    const handleOrderStatusUpdate = async (orderId, newStatus) => {
      try {
        // Get the estimated time for this order from local state
        const estimatedTime = estimatedTimes[orderId];
        const statusData = { status: newStatus };
        
        // Include estimated time if it exists
        if (estimatedTime !== undefined && estimatedTime !== '' && estimatedTime !== null) {
          statusData.estimatedTime = parseInt(estimatedTime) || 0;
        }
        
        console.log('Updating order status with data:', statusData);
        await updateOrderStatus(orderId, statusData);

        if (newStatus === 'ready') {
          const order = orders.find(o => (o._id || o.id) === orderId);
          setNotifications([...notifications, {
            id: Date.now(),
            message: `Order #${order?.tokenId} is ready for pickup!`,
            type: 'ready',
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (error) {
        console.error('Error updating order status:', error);
        setNotifications([...notifications, {
          id: Date.now(),
          message: 'Failed to update order status. Please try again.',
          type: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
    };

    const updateEstimatedTime = async (orderId, time) => {
      try {
        const numericTime = parseInt(time) || 0;
        const updatedOrder = await updateOrder(orderId, { estimatedTime: numericTime });

        // Clear local state for this order since it's now updated in the database
        setEstimatedTimes(prev => {
          const newState = { ...prev };
          delete newState[orderId];
          return newState;
        });

        // Notify customer about estimated time
        if (numericTime > 0) {
          const order = orders.find(o => (o._id || o.id) === orderId);
          setNotifications([...notifications, {
            id: Date.now(),
            message: `Order #${order?.tokenId} estimated time: ${numericTime} minutes`,
            type: 'time',
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (error) {
        console.error('Error updating estimated time:', error);
        setNotifications([...notifications, {
          id: Date.now(),
          message: 'Failed to update estimated time. Please try again.',
          type: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
    };

    // Handle estimated time input change (only update local state)
    const handleEstimatedTimeChange = (orderId, value) => {
      setEstimatedTimes(prev => ({
        ...prev,
        [orderId]: value
      }));
    };

    // Handle estimated time blur or enter (update database)
    const handleEstimatedTimeSubmit = (orderId) => {
      const time = estimatedTimes[orderId];
      if (time !== undefined && time !== '') {
        updateEstimatedTime(orderId, time);
      }
    };

    // Get current estimated time value (from local state or order data)
    const getEstimatedTimeValue = (order) => {
      const orderId = order._id || order.id;
      return estimatedTimes[orderId] !== undefined 
        ? estimatedTimes[orderId] 
        : order.estimatedTime || '';
    };

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Order Queue</h2>
          <div className="bg-gradient-to-r from-orange-100 to-red-100 px-6 py-3 rounded-xl border border-orange-200">
            <span className="text-orange-800 font-semibold">{queueOrders.length} orders in queue</span>
          </div>
        </div>
        
        {queueOrders.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No orders in queue</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {queueOrders.map(order => (
              <div key={order._id || order.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-orange-600">Token #{order.tokenId}</h3>
                    <p className="text-gray-600 font-medium">{order.customer?.name || order.customerName || 'Unknown Customer'}</p>
                    <p className="text-sm text-gray-500">{new Date(order.createdAt || order.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    order.status === 'ordered' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span className="font-medium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-orange-600">₹{order.totalAmount}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Est. time (mins)"
                      min="1"
                      max="120"
                      autoComplete="off"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      onChange={(e) => handleEstimatedTimeChange(order._id || order.id, e.target.value)}
                      onBlur={() => handleEstimatedTimeSubmit(order._id || order.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur(); // This will trigger onBlur
                        }
                      }}
                      value={getEstimatedTimeValue(order)}
                    />
                    <span className="px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg">mins</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {order.status === 'ordered' && (
                      <button
                        onClick={() => handleOrderStatusUpdate(order._id || order.id, 'preparing')}
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 font-medium"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleOrderStatusUpdate(order._id || order.id, 'ready')}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 font-medium"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleOrderStatusUpdate(order._id || order.id, 'completed')}
                        className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 font-medium"
                      >
                        Complete Order
                      </button>
                    )}
                  </div>
                  
                  {/* Cancel button - always available for non-completed orders */}
                  <button
                    onClick={() => handleOrderStatusUpdate(order._id || order.id, 'cancelled')}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 font-medium mt-2"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Vendor Menu Management
  const MenuManageView = () => {
    // Admin should not access menu management
    if (currentUser?.role === 'admin') {
      return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">Access Restricted</h2>
            <p className="text-yellow-700">
              Admin users can only supervise. Menu management is restricted to vendors only.
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Please use the Dashboard or Users section for administrative tasks.
            </p>
          </div>
        </div>
      );
    }

    const [editingItem, setEditingItem] = useState(null);
    const [editData, setEditData] = useState({});
    const [newItem, setNewItem] = useState({ name: '', price: '', category: '', available: true, description: '' });

    const filteredMenuItems = menuItems.filter(item => {
      // Only show items belonging to current vendor
      const belongsToVendor = item.vendor?._id === currentUser?.id || item.vendorId === currentUser?.id;
      const matchesSearch = item.name.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
                           item.category.toLowerCase().includes(vendorSearchQuery.toLowerCase());
      return belongsToVendor && matchesSearch;
    });

    const addItem = async () => {
      if (newItem.name && newItem.price && newItem.category) {
        const item = {
          name: newItem.name,
          price: parseInt(newItem.price),
          category: newItem.category,
          description: newItem.description,
          available: true,
          vendor: currentUser.id, // Use 'vendor' instead of 'vendorId'
          stock: 10 // Add default stock value
        };
        
        try {
          await addMenuItem(item);
          setNewItem({ name: '', price: '', category: '', available: true, description: '' });
          alert('Menu item added successfully!');
        } catch (error) {
          console.error('Error adding menu item:', error);
          alert('Error adding menu item: ' + error.message);
        }
      } else {
        alert('Please fill in all required fields (Name, Price, and Category)');
      }
    };

    const startEdit = (item) => {
      setEditingItem(item.id);
      setEditData({ ...item });
    };

    const saveEdit = () => {
      updateMenuItem(editingItem, { ...editData, price: parseInt(editData.price) });
      setEditingItem(null);
      setEditData({});
    };

    const cancelEdit = () => {
      setEditingItem(null);
      setEditData({});
    };

    const deleteItem = (id) => {
      if (window.confirm('Are you sure you want to delete this item?')) {
        deleteMenuItem(id);
      }
    };

    const toggleAvailability = (id) => {
      const item = menuItems.find(item => item.id === id);
      if (item) {
        updateMenuItem(id, { ...item, available: !item.available });
      }
    };

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Manage Menu</h2>
          
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search menu items..."
              value={vendorSearchQuery}
              onChange={(e) => setVendorSearchQuery(e.target.value)}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Add New Item</h3>
          <div className="mb-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">
              Menu Items Status: {loading ? 'Loading...' : `${menuItems.length} items loaded`} | 
              Filtered: {filteredMenuItems.length} items | 
              Current User: {currentUser?.name || 'None'} ({currentUser?.id || 'No ID'})
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Item Name*"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            />
            <input
              type="number"
              placeholder="Price*"
              value={newItem.price}
              onChange={(e) => setNewItem({...newItem, price: e.target.value})}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            />
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({...newItem, category: e.target.value})}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            >
              <option value="">Select Category*</option>
              <option value="Main Course">Main Course</option>
              <option value="Bread">Bread</option>
              <option value="Rice">Rice</option>
              <option value="Beverage">Beverage</option>
              <option value="Dessert">Dessert</option>
            </select>
            <input
              type="text"
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({...newItem, description: e.target.value})}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            />
            <button
              onClick={addItem}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 font-medium"
            >
              <Plus size={20} />
              Add Item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMenuItems.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl ${!item.available ? 'opacity-75' : ''}`}>
              {editingItem === item.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                    placeholder="Item name"
                  />
                  <input
                    type="number"
                    value={editData.price || ''}
                    onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                    placeholder="Price"
                  />
                  <select
                    value={editData.category || ''}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="Main Course">Main Course</option>
                    <option value="Bread">Bread</option>
                    <option value="Rice">Rice</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold mb-1">{item.name}</h4>
                      <p className="text-gray-600 text-sm mb-1">{item.category}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 mb-2">{item.description}</p>
                      )}
                      <p className="text-2xl font-bold text-orange-600">₹{item.price}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                        item.available 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleAvailability(item.id)}
                      className={`py-2 rounded-lg text-white text-sm font-medium transition-all duration-300 ${
                        item.available 
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      }`}
                    >
                      {item.available ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="col-span-2 bg-gradient-to-r from-red-500 to-pink-500 text-white py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simple Analytics View
  const VendorAnalyticsView = () => {
    const getFilteredOrders = () => {
      const now = new Date();
      const filterDate = new Date();
      
      switch (orderFilter) {
        case '7days':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '1month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        default:
          filterDate.setDate(now.getDate() - 7);
      }
      
      // Filter orders for current vendor
      const vendorOrders = orders.filter(order => {
        // Handle both populated and non-populated vendor fields
        let orderVendorId = null;
        
        if (order.vendor) {
          if (typeof order.vendor === 'object') {
            orderVendorId = order.vendor._id || order.vendor.id;
          } else {
            orderVendorId = order.vendor;
          }
        }
        
        const currentUserId = currentUser?.id || currentUser?._id;
        const matches = orderVendorId === currentUserId;
        
        return matches;
      });
      
      return vendorOrders.filter(order => {
        const orderDate = new Date(order.createdAt || order.timestamp);
        const isInDateRange = orderDate >= filterDate;
        return isInDateRange;
      });
    };

    const filteredOrders = getFilteredOrders();
    const completedOrders = filteredOrders.filter(order => order.status === 'completed');
    const cancelledOrders = filteredOrders.filter(order => order.status === 'cancelled');
    const completedAndCancelledOrders = filteredOrders.filter(order => order.status === 'completed' || order.status === 'cancelled');
    
    const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = completedOrders.length;
    const totalCancelled = cancelledOrders.length;

    const itemCounts = {};
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });

    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const maxItem = sortedItems[0] || ['No items', 0];
    const minItem = sortedItems[sortedItems.length - 1] || ['No items', 0];

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Analytics & Reports</h2>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            >
              <option value="7days">Last 7 Days</option>
              <option value="1month">Last Month</option>
              <option value="3months">Last 3 Months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Sales</p>
                <p className="text-3xl font-bold">₹{totalSales}</p>
              </div>
              <TrendingUp size={32} className="text-blue-300" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed Orders</p>
                <p className="text-3xl font-bold">{totalOrders}</p>
              </div>
              <Package size={32} className="text-green-300" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Cancelled Orders</p>
                <p className="text-3xl font-bold">{totalCancelled}</p>
              </div>
              <X size={32} className="text-red-300" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Most Ordered</p>
                <p className="text-lg font-bold">{maxItem[0]}</p>
                <p className="text-orange-200 text-sm">{maxItem[1]} times</p>
              </div>
              <TrendingUp size={32} className="text-orange-300" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Least Ordered</p>
                <p className="text-lg font-bold">{minItem[0]}</p>
                <p className="text-purple-200 text-sm">{minItem[1]} times</p>
              </div>
              <TrendingDown size={32} className="text-purple-300" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Completed & Cancelled Orders</h3>
            <span className="text-sm text-gray-500">
              {completedAndCancelledOrders.length} order{completedAndCancelledOrders.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {completedAndCancelledOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No completed or cancelled orders in selected period</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {completedAndCancelledOrders.map((order) => (
                <div key={order._id || order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className={`font-bold w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                        order.status === 'completed' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        #{order.tokenId}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.customer?.name || order.customerName || 'Unknown Customer'}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {order.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </span>
                          {order.status === 'cancelled' && order.notes?.customer && (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              By customer
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(() => {
                            const date = order.status === 'completed' 
                              ? (order.timestamps?.completed || order.completedAt || order.updatedAt)
                              : (order.timestamps?.cancelled || order.cancelledAt || order.updatedAt);
                            if (!date) return 'Unknown date';
                            try {
                              return new Date(date).toLocaleString();
                            } catch {
                              return 'Invalid date';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-orange-600 font-semibold">₹{order.totalAmount}</span>
                    <button
                      onClick={async () => {
                        await handleOrderDelete(order._id || order.id);
                      }}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Completed Orders View
  const CompletedOrdersView = () => {
    const [dateFilter, setDateFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDateRange, setShowDateRange] = useState(false);

    // Filter orders for current vendor only and completed/cancelled status
    const vendorCompletedOrders = orders.filter(order => {
      // Check if order belongs to current vendor
      let orderVendorId = null;
      if (order.vendor) {
        if (typeof order.vendor === 'object') {
          orderVendorId = order.vendor._id || order.vendor.id;
        } else {
          orderVendorId = order.vendor;
        }
      }
      
      const currentUserId = currentUser?.id || currentUser?._id;
      const isVendorOrder = orderVendorId === currentUserId;
      const isCompletedOrCancelled = order.status === 'completed' || order.status === 'cancelled';
      
      return isVendorOrder && isCompletedOrCancelled;
    });

    // Apply date filtering
    const filteredOrders = vendorCompletedOrders.filter(order => {
      if (dateFilter === 'all') return true;
      
      const orderDate = new Date(order.createdAt || order.timestamp);
      const now = new Date();
      
      switch (dateFilter) {
        case '7days':
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return orderDate >= weekAgo;
        case '30days':
          const monthAgo = new Date();
          monthAgo.setDate(now.getDate() - 30);
          return orderDate >= monthAgo;
        case 'custom':
          if (!startDate || !endDate) return true;
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Include the entire end date
          return orderDate >= start && orderDate <= end;
        default:
          return true;
      }
    });

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString();
      } catch (error) {
        return 'Invalid Date';
      }
    };

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Completed & Cancelled Orders</h2>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'custom') {
                  setShowDateRange(false);
                } else {
                  setShowDateRange(true);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {showDateRange && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No completed or cancelled orders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map(order => (
              <div key={order._id || order.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-600">Token #{order.tokenId}</h3>
                    <p className="text-gray-600 font-medium">
                      {order.customer?.name || order.customerName || 'Unknown Customer'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Completed: {formatDate(order.timestamps?.completed || order.completedAt || order.updatedAt)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Ordered: {formatDate(order.createdAt || order.timestamp)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {order.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </span>
                    {order.status === 'cancelled' && order.notes?.customer && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        Cancelled by customer
                      </span>
                    )}
                    <button
                      onClick={() => handleOrderDelete(order._id || order.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <div className="space-y-1 text-sm">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span className="font-medium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-orange-600">₹{order.totalAmount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Admin order management functions
  const handleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const handleDeleteSelectedOrders = () => {
    if (selectedOrders.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedOrders.length} selected orders?`)) {
      deleteMultipleOrders(selectedOrders);
      setSelectedOrders([]);
      setNotifications([...notifications, {
        id: Date.now(),
        message: `${selectedOrders.length} orders deleted successfully`,
        type: 'success',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleDeleteByDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    if (start > end) {
      alert('Start date cannot be after end date');
      return;
    }

    const ordersInRange = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      return orderDate >= start && orderDate <= end;
    }).length;

    if (ordersInRange === 0) {
      alert('No orders found in the selected date range');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${ordersInRange} orders from ${dateRange.startDate} to ${dateRange.endDate}?`)) {
      deleteOrdersByDateRange(dateRange.startDate, dateRange.endDate);
      setSelectedOrders([]);
      setShowDatePicker(false);
      setDateRange({ startDate: '', endDate: '' });
      setNotifications([...notifications, {
        id: Date.now(),
        message: `${ordersInRange} orders deleted from date range`,
        type: 'success',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // Profile Component
  const ProfileView = () => {
    const [profileData, setProfileData] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      restaurantName: currentUser?.restaurantName || ''
    });
    const [isEditing, setIsEditing] = useState(false);

    const handleSaveProfile = () => {
      updateUser(currentUser.id, profileData);
      setCurrentUser({ ...currentUser, ...profileData });
      setIsEditing(false);
      setNotifications([...notifications, {
        id: Date.now(),
        message: 'Profile updated successfully',
        type: 'success',
        timestamp: new Date().toISOString()
      }]);
    };

    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Profile</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg">{profileData.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg">{profileData.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg">{profileData.phone || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg">{profileData.address || 'Not provided'}</p>
                )}
              </div>
              
              {currentRole === 'vendor' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.restaurantName}
                      onChange={(e) => setProfileData({ ...profileData, restaurantName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-lg">{profileData.restaurantName || 'Not provided'}</p>
                  )}
                </div>
              )}
            </div>
            
            {isEditing && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <User size={24} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Account Information</h3>
                <p className="text-sm text-gray-600">Role: {currentRole}</p>
                <p className="text-sm text-gray-600">Member since: {new Date(currentUser?.createdAt || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin Order Management - Only shows order table
  const AdminOrderManagement = () => {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl font-semibold">Order Management</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSelectAllOrders}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  {selectedOrders.length === orders.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleDeleteSelectedOrders}
                  disabled={selectedOrders.length === 0}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedOrders.length})
                </button>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                >
                  Delete by Date Range
                </button>
              </div>
            </div>
            
            {showDatePicker && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleDeleteByDateRange}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete Range
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAllOrders}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Token</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Vendor</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Items</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order._id || order.id} className={`hover:bg-gray-50 transition-colors ${selectedOrders.includes(order._id || order.id) ? 'bg-blue-50' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id || order.id)}
                        onChange={() => handleOrderSelection(order._id || order.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-6 font-medium">#{order.tokenId}</td>
                    <td className="py-4 px-6">
                      {order.customer?.name || order.customerName || 'Unknown Customer'}
                    </td>
                    <td className="py-4 px-6">
                      {order.vendor?.name || order.vendorName || 'Unknown Vendor'}
                    </td>
                    <td className="py-4 px-6">{order.items.length} items</td>
                    <td className="py-4 px-6 font-semibold text-orange-600">₹{order.totalAmount}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {(() => {
                        const date = order.createdAt || order.timestamps?.ordered || order.timestamp;
                        if (!date) return 'Unknown Date';
                        try {
                          return new Date(date).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          });
                        } catch (error) {
                          return 'Invalid Date';
                        }
                      })()}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleOrderDelete(order._id || order.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {orders.length === 0 && (
              <div className="text-center py-12">
                <Package size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">No orders found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Admin Dashboard
  const AdminDashboard = () => {
    const totalOrders = orders.length;
    const activeOrders = orders.filter(order => order.status !== 'completed').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const totalRevenue = orders.filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.totalAmount, 0);

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Orders</p>
                <p className="text-3xl font-bold">{totalOrders}</p>
              </div>
              <Package size={32} className="text-blue-300" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Active Orders</p>
                <p className="text-3xl font-bold">{activeOrders}</p>
              </div>
              <Clock size={32} className="text-orange-300" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed</p>
                <p className="text-3xl font-bold">{completedOrders}</p>
              </div>
              <CheckCircle size={32} className="text-green-300" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Revenue</p>
                <p className="text-3xl font-bold">₹{totalRevenue}</p>
              </div>
              <TrendingUp size={32} className="text-purple-300" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Vendors Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Store size={24} className="text-orange-600" />
                All Vendors
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.values(users).filter(user => user.role === 'vendor').map(vendor => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-gray-800">{vendor.restaurantName || vendor.name}</h4>
                      <p className="text-sm text-gray-600">Owner: {vendor.name}</p>
                      <p className="text-xs text-gray-500">{vendor.email}</p>
                      {vendor.phone && (
                        <p className="text-xs text-gray-500">{vendor.phone}</p>
                      )}
                      {vendor.address && (
                        <p className="text-xs text-gray-400">{vendor.address}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {vendor.status || 'Active'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {menuItems.filter(item => item.vendor?._id === vendor.id || item.vendorId === vendor.id).length} items
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Stats */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 size={24} className="text-purple-600" />
                System Statistics
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-800 font-medium">Total Users</span>
                  <span className="text-blue-600 font-bold">{Object.keys(users).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-800 font-medium">Vendors</span>
                  <span className="text-green-600 font-bold">{Object.values(users).filter(u => u.role === 'vendor').length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-orange-800 font-medium">Customers</span>
                  <span className="text-orange-600 font-bold">{Object.values(users).filter(u => u.role === 'customer').length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-800 font-medium">Menu Items</span>
                  <span className="text-purple-600 font-bold">{menuItems.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Database Management */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Database size={24} className="text-red-600" />
              Database Management
            </h3>
          </div>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-2">Reset Database</h4>
                  <p className="text-red-700 text-sm mb-4">
                    This will permanently delete all data including users, orders, and menu items. This action cannot be undone.
                  </p>
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you absolutely sure you want to reset the entire database? This will delete ALL data and cannot be undone!')) {
                        try {
                          const response = await apiService.resetDatabase();
                          if (response.success) {
                            alert('Database reset successfully! All data has been cleared and default admin user created.');
                            // Clear any local authentication and reload
                            localStorage.clear();
                            window.location.reload();
                          } else {
                            alert('Failed to reset database: ' + response.message);
                          }
                        } catch (error) {
                          console.error('Database reset error:', error);
                          alert('Failed to reset database. Please check server connection.');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Reset Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vendor Approval Handlers
  const handleApproveVendor = async (vendorId) => {
    try {
      const success = await approveVendor(vendorId, currentUser.id);
      if (success) {
        alert('Vendor approved successfully!');
        // Refresh user list and pending vendors
        refreshUsers();
        refreshPendingVendors();
      } else {
        alert('Failed to approve vendor.');
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      alert('Failed to approve vendor. Please try again.');
    }
  };

  const handleRejectVendor = async (vendorId) => {
    const vendor = pendingVendors.find(v => v._id === vendorId);
    if (confirm(`Are you sure you want to reject vendor: ${vendor?.name}? This will permanently delete their account from the database.`)) {
      try {
        const success = await rejectVendor(vendorId);
        if (success) {
          alert('Vendor rejected and permanently deleted!');
          // Refresh user list and pending vendors
          refreshUsers();
          refreshPendingVendors();
        } else {
          alert('Failed to reject vendor.');
        }
      } catch (error) {
        console.error('Error rejecting vendor:', error);
        alert('Failed to reject vendor. Please try again.');
      }
    }
  };

  // Users Management View
  const UsersView = () => {
    const [editingUser, setEditingUser] = useState(null);
    const [editUserData, setEditUserData] = useState({});
    const [showPassword, setShowPassword] = useState({});
    
    const allUsers = [...Object.values(defaultUsers), ...registeredUsers];
    console.log('allUsers structure:', allUsers);

    const startEditUser = (user) => {
      console.log('startEditUser called with user:', user);
      setEditingUser(user.id);
      setEditUserData({ ...user });
    };

    const saveUserEdit = async () => {
      console.log('saveUserEdit called:', { editingUser, editUserData });
      
      // Only allow editing of registered users, not default users
      if (!Object.values(defaultUsers).find(u => u.id === editingUser)) {
        try {
          console.log('Calling updateUser with:', editingUser, editUserData);
          // Update user in database
          await updateUser(editingUser, editUserData);
          
          setNotifications([...notifications, {
            id: Date.now(),
            message: 'User updated successfully!',
            type: 'success',
            timestamp: new Date().toISOString()
          }]);
        } catch (error) {
          console.error('Error updating user:', error);
          setNotifications([...notifications, {
            id: Date.now(),
            message: 'Failed to update user: ' + error.message,
            type: 'error',
            timestamp: new Date().toISOString()
          }]);
        }
      } else {
        console.log('Cannot edit default user');
        setNotifications([...notifications, {
          id: Date.now(),
          message: 'Cannot edit default users',
          type: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
      setEditingUser(null);
      setEditUserData({});
    };

    const handleDeleteUser = async (userId) => {
      const user = allUsers.find(u => u.id === userId);
      
      if (confirm(`Are you sure you want to delete user: ${user.name}?`)) {
        try {
          if (user.role === 'admin') {
            alert('Admin user deleted! You may need to reset the database to recreate the admin account.');
          }
          // Use the deleteUser function from hooks (it's async)
          const result = await deleteUser(userId);
          if (result) {
            alert('User deleted successfully!');
          } else {
            alert('Failed to delete user.');
          }
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Failed to delete user. Please try again.');
        }
      }
    };

    const togglePasswordVisibility = (userId) => {
      setShowPassword(prev => ({
        ...prev,
        [userId]: !prev[userId]
      }));
    };

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">User Management</h2>
        
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold">Registered Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Password</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {editingUser === user.id ? (
                      <>
                        <td className="py-4 px-6">
                          <input
                            type="text"
                            value={editUserData.name || ''}
                            onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="email"
                            value={editUserData.email || ''}
                            onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="text"
                            value={editUserData.password || ''}
                            onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <select
                            value={editUserData.role || ''}
                            onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="customer">Customer</option>
                            <option value="vendor">Vendor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'Registered'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <button
                              onClick={saveUserEdit}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-6 font-medium">{user.name}</td>
                        <td className="py-4 px-6">{user.email}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {showPassword[user.id] ? user.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {showPassword[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'vendor' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'Registered'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditUser(user)}
                              className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Vendor Approvals View Component
  const VendorApprovalsView = () => {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Vendor Approval Requests</h2>
          <button
            onClick={() => {
              console.log('🔄 Manual refresh clicked');
              refreshPendingVendors();
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Settings size={16} />
            Refresh
          </button>
        </div>
        
        {pendingVendors.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <UserPlus size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Pending Requests</h3>
            <p className="text-gray-500">All vendor applications have been processed.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Pending Vendor Registrations ({pendingVendors.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Email</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Restaurant Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Phone</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Registration Date</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingVendors.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{vendor.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-gray-600">{vendor.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-gray-600">{vendor.restaurantName || 'Not specified'}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-gray-600">{vendor.phone || 'Not provided'}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-gray-600">
                          {new Date(vendor.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveVendor(vendor._id)}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <CheckCircle size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectVendor(vendor._id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main render logic
  if (!currentUser) {
    // Show loading screen while checking authentication
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
              Khana Line-up
            </h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }
    return (
      <div>
        <AuthForm />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'menu':
        return <MenuView />;
      case 'cart':
        return <CartView />;
      case 'orders':
        return currentRole === 'customer' ? <CustomerOrdersView /> : 
               currentRole === 'vendor' ? <VendorOrdersView /> : <AdminOrderManagement />;
      case 'menu-manage':
        return <MenuManageView />;
      case 'completed':
        return <CompletedOrdersView />;
      case 'analytics':
        return <VendorAnalyticsView />;
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UsersView />;
      case 'vendor-approvals':
        return <VendorApprovalsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <MenuView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      <Navigation />
      
      {/* Notifications */}
      {notifications.length > 0 && currentRole === 'customer' && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <Bell size={20} />
              </div>
              <p className="font-medium">{notifications[notifications.length - 1].message}</p>
            </div>
            <button
              onClick={() => setNotifications([])}
              className="text-white hover:text-green-100 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {renderContent()}
    </div>
  );
};

export default KhanaLineupApp;


