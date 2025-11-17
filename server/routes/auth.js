import express from 'express';
import bcrypt from 'bcryptjs';
import { User, MenuItem } from '../models/index.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      name, 
      role, 
      phone,
      // Address can be sent either as a flat string (address)
      // or as individual fields (street, city, state, zipCode)
      address,
      street,
      city,
      state,
      zipCode
    } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const userData = {
      email,
      password,
      name,
      role: role || 'customer'
    };

    if (phone) userData.phone = phone;

    // Normalize address into nested structure if provided
    if (address || street || city || state || zipCode) {
      const addrObject = typeof address === 'object' && address !== null
        ? address
        : {
            street: street || (typeof address === 'string' ? address : undefined),
            city,
            state,
            zipCode,
          };

      userData.address = {
        street: addrObject.street,
        city: addrObject.city,
        state: addrObject.state,
        zipCode: addrObject.zipCode,
      };
    }

    // Set approval status based on role
    // Vendors need approval, customers and admins are auto-approved
    userData.isApproved = (role !== 'vendor');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Registration userData:', { ...userData, password: '[HIDDEN]' });
      console.log('Role:', role, 'isApproved:', userData.isApproved);
    }

    const user = new User(userData);
    await user.save();
    
    console.log('Saved user:', { 
      id: user._id, 
      email: user.email, 
      role: user.role, 
      isApproved: user.isApproved 
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email not found. Please check your email or register for a new account.',
        errorType: 'EMAIL_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if vendor is approved (only for vendors)
    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt - User role:', user.role, 'isApproved:', user.isApproved);
    }
    if (user.role === 'vendor' && !user.isApproved) {
      console.log('Vendor login blocked - pending approval');
      return res.status(403).json({
        success: false,
        message: 'Your vendor account is pending approval. Please wait for admin approval.',
        errorType: 'VENDOR_PENDING_APPROVAL'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
// @access  Public (should be protected in production)
router.get('/users', async (req, res) => {
  try {
    const { role, active } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (active !== undefined) query.isActive = active === 'true';

    const users = await User.find(query)
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/auth/user/:id
// @desc    Get user by ID
// @access  Public (should be protected in production)
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/auth/user/:id
// @desc    Update user profile
// @access  Public (should be protected in production)
router.put('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Handle password update if provided
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    // Remove MongoDB internal fields
    delete updates._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/auth/user/:id/password
// @desc    Change user password
// @access  Public (should be protected in production)
router.put('/user/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/auth/user/:id
// @desc    Deactivate user account (and remove vendor menu items if applicable)
// @access  Public (should be protected in production)
router.delete('/user/:id', async (req, res) => {
  try {
    // First, find the user so we can determine if it's a vendor
    const existingUser = await User.findById(req.params.id).select('-password');

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If the user is a vendor, remove all of their menu items as well
    let deletedMenuItemsCount = 0;
    if (existingUser.role === 'vendor') {
      const deleteResult = await MenuItem.deleteMany({ vendor: existingUser._id });
      deletedMenuItemsCount = deleteResult.deletedCount || 0;
    }

    existingUser.isActive = false;
    await existingUser.save();

    res.json({
      success: true,
      message: 'User account deactivated successfully',
      user: existingUser,
      deletedMenuItemsCount
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/reset-database
// @desc    Reset entire database (admin only)
// @access  Public (should be protected in production)
router.post('/reset-database', async (req, res) => {
  try {
    const { User, MenuItem, Order } = await import('../models/index.js');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting database reset...');
    }
    
    // Delete all collections
    await Promise.all([
      User.deleteMany({}),
      MenuItem.deleteMany({}),
      Order.deleteMany({})
    ]);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('All data deleted. Recreating ONLY admin user...');
    }
    
    // Create ONLY admin user - no other users
    const adminUser = new User({
      username: 'admin',
      email: 'admin@khana-lineup.com',
      password: 'admin_2026', // Will be hashed by the pre-save middleware
      role: 'admin',
      name: 'Admin User',
      phone: '1234567890',
      isActive: true,
      preferences: {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        dietary: {
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          spicyFood: true
        }
      }
    });
    
    await adminUser.save();
    if (process.env.NODE_ENV === 'development') {
      console.log('Default admin user created');
    }
    
    res.json({
      success: true,
      message: 'Database reset successfully. Default admin user created.',
      adminUser: {
        id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('Database reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/auth/pending-vendors
// @desc    Get all pending vendor approvals
// @access  Admin only
router.get('/pending-vendors', async (req, res) => {
  try {
    const pendingVendors = await User.find({
      role: 'vendor',
      isActive: true,
      isApproved: false
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingVendors.length,
      vendors: pendingVendors
    });

  } catch (error) {
    console.error('Get pending vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending vendors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/auth/approve-vendor/:id
// @desc    Approve a vendor account
// @access  Admin only
router.put('/approve-vendor/:id', async (req, res) => {
  try {
    const { adminId } = req.body;

    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        approvedBy: adminId,
        approvedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    res.json({
      success: true,
      message: 'Vendor approved successfully',
      vendor
    });

  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving vendor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/auth/reject-vendor/:id
// @desc    Reject a vendor account (delete from database and remove its menu items)
// @access  Admin only
router.delete('/reject-vendor/:id', async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    // Delete all menu items belonging to this vendor
    const deleteResult = await MenuItem.deleteMany({ vendor: vendor._id });
    const deletedMenuItemsCount = deleteResult.deletedCount || 0;

    // Delete the vendor from database completely
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Vendor rejected and removed from database',
      deletedVendorId: req.params.id,
      deletedMenuItemsCount
    });

  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting vendor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
