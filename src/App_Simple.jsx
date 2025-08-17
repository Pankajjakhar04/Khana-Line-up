import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Plus, 
  Minus, 
  Trash2, 
  User,
  Clock,
  Star,
  Search,
  Eye,
  Filter,
  ChefHat,
  CheckCircle,
  XCircle,
  BarChart,
  Home,
  Package,
  TrendingUp,
  IndianRupee
} from 'lucide-react';
import ConnectionStatus from './components/ConnectionStatus';

function App() {
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    phone: '', 
    role: 'customer' 
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [customerOrderHistory, setCustomerOrderHistory] = useState([]);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    available: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Search states - using separate refs for each search to maintain focus
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const customerSearchRef = useRef(null);
  const vendorSearchRef = useRef(null);

  // Form submission refs to prevent auto-refresh
  const loginFormRef = useRef(null);
  const registerFormRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchMenuItems();
      if (user.role === 'vendor') {
        fetchVendorOrders();
      } else if (user.role === 'customer') {
        fetchCustomerOrders();
      } else if (user.role === 'admin') {
        fetchAllOrders();
      }
    }
  }, [user]);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu');
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
    }
  };

  const fetchVendorOrders = async () => {
    try {
      const response = await fetch('/api/orders/vendor', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch vendor orders:', error);
    }
  };

  const fetchCustomerOrders = async () => {
    try {
      const response = await fetch('/api/orders/customer', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomerOrderHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch customer orders:', error);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch all orders:', error);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setError('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();
        setError('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCart([]);
    setOrders([]);
    setCustomerOrderHistory([]);
    setActiveTab('home');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await login(loginForm.email, loginForm.password);
      setSuccess('Login successful!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await register(registerForm);
      setSuccess('Registration successful! Please log in.');
      setIsRegistering(false);
      setRegisterForm({ email: '', password: '', name: '', phone: '', role: 'customer' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem._id === item._id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
    setShowCart(true);
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId, change) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item._id === itemId) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const getFilteredMenuItems = (searchTerm) => {
    if (!searchTerm) return menuItems;
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Check for existing login on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user info
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Token invalid');
        }
      })
      .then(data => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('token');
      });
    }
  }, []);

  // If not authenticated, show login/register forms
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <ConnectionStatus />
        
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all duration-300 hover:scale-105">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <ChefHat className="w-16 h-16 text-orange-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Khana Line-up</h1>
              <p className="text-gray-600">Your favorite food, delivered fast</p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 text-center">
                {success}
              </div>
            )}

            {!isRegistering ? (
              <form onSubmit={handleLogin} ref={loginFormRef} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="Enter your password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="w-full text-orange-600 hover:text-orange-700 transition-colors duration-300 font-medium"
                >
                  Don't have an account? Sign Up
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} ref={registerFormRef} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                    placeholder="Enter your password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({...registerForm, role: e.target.value})}
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="w-full text-orange-600 hover:text-orange-700 transition-colors duration-300 font-medium"
                >
                  Already have an account? Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main app content for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <ConnectionStatus />
      
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ChefHat className="w-8 h-8 text-orange-500 mr-3" />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Khana Line-up
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-sm sm:text-base text-gray-600 hidden sm:block">
                Welcome, {user.name}
              </span>
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                user.role === 'vendor' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
              <button
                onClick={logout}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-red-600 transition-colors duration-300 p-2 rounded-lg hover:bg-red-50"
              >
                <LogOut size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-sm sm:text-base">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-8 overflow-x-auto py-2">
            {user.role === 'customer' && (
              <>
                <button
                  onClick={() => setActiveTab('home')}
                  className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'home'
                      ? 'bg-orange-100 text-orange-700 shadow-md'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  <Home size={16} className="sm:w-5 sm:h-5" />
                  <span>Menu</span>
                </button>
                <button
                  onClick={() => setActiveTab('cart')}
                  className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm sm:text-base relative ${
                    activeTab === 'cart'
                      ? 'bg-orange-100 text-orange-700 shadow-md'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  <ShoppingCart size={16} className="sm:w-5 sm:h-5" />
                  <span>Cart</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs min-w-[18px] text-center">
                      {getCartItemCount()}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'orders'
                      ? 'bg-orange-100 text-orange-700 shadow-md'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  <Clock size={16} className="sm:w-5 sm:h-5" />
                  <span>My Orders</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Success/Error Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Customer Menu View */}
        {user.role === 'customer' && activeTab === 'home' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Our Menu</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={customerSearchRef}
                  type="text"
                  placeholder="Search dishes..."
                  className="pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full sm:w-80 text-base"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {getFilteredMenuItems(customerSearchTerm).length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No dishes found</h3>
                <p className="text-gray-500">Try searching with different keywords</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {getFilteredMenuItems(customerSearchTerm).map((item) => (
                  <div key={item._id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100">
                    <div className="p-4 sm:p-6">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-32 sm:h-40 object-cover rounded-lg mb-4"
                        />
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex-1">{item.name}</h3>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          item.available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      {item.category && (
                        <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full mb-2">
                          {item.category}
                        </span>
                      )}
                      {item.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <p className="text-xl sm:text-2xl font-bold text-orange-600">₹{item.price}</p>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!item.available}
                          className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-sm sm:text-base ${
                            item.available 
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transform hover:scale-105'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus size={16} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cart View */}
        {user.role === 'customer' && activeTab === 'cart' && (
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Your Cart</h2>
            
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-6">Add some delicious items to get started!</p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1 mb-3 sm:mb-0">
                          <h4 className="font-semibold text-gray-800 text-base sm:text-lg">{item.name}</h4>
                          <p className="text-gray-600 text-sm sm:text-base">₹{item.price} each</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-4">
                          <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(item._id, -1)}
                              className="p-1 sm:p-2 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="font-semibold text-gray-800 min-w-[2rem] text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item._id, 1)}
                              className="p-1 sm:p-2 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-800 text-base sm:text-lg">₹{item.price * item.quantity}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-200 mt-6 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xl font-bold text-gray-800">Total:</span>
                      <span className="text-2xl font-bold text-orange-600">₹{getCartTotal()}</span>
                    </div>
                    <button
                      onClick={() => alert('Order functionality will be implemented!')}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 font-semibold text-base sm:text-lg"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Orders View */}
        {user.role === 'customer' && activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">My Orders</h2>
            
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders yet</h3>
              <p className="text-gray-500 mb-6">Place your first order to see it here!</p>
              <button
                onClick={() => setActiveTab('home')}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300"
              >
                Browse Menu
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Cart Button for Mobile */}
      {user.role === 'customer' && cart.length > 0 && activeTab !== 'cart' && (
        <button
          onClick={() => setActiveTab('cart')}
          className="fixed bottom-4 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-full shadow-2xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-110 z-50 lg:hidden"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs animate-pulse min-w-[24px] text-center">
            {getCartItemCount()}
          </span>
        </button>
      )}
    </div>
  );
}

export default App;
