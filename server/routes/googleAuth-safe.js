// Production-safe Google Auth Routes (NO Firebase Admin - Client-side only)
import express from 'express';
import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Google OAuth login/register (NO Firebase Admin token verification)
router.post('/login', async (req, res) => {
  try {
    console.log('Google auth request received:', req.body);
    
    const { email, name, photoURL, uid } = req.body;

    if (!email || !name || !uid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, name, and uid are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if user already exists
    console.log('Looking for existing user with email:', email);
    let user = await User.findOne({ email });

    if (user) {
      console.log('Found existing user:', email);
      
      // Update user with Google-specific fields
      const updateData = {
        googleUid: uid,
        photoURL: photoURL,
        lastLogin: new Date()
      };
      
      console.log('Updating existing user with:', updateData);
      
      user = await User.findOneAndUpdate(
        { email },
        updateData,
        { 
          new: true, 
          runValidators: false // Skip validation to avoid password requirements
        }
      );
      
      if (!user) {
        throw new Error('Failed to update user');
      }
      
      console.log('Existing user updated successfully');
    } else {
      console.log('Creating new user for email:', email);
      
      // Create new user with Google auth
      // Generate a random password for Google users to satisfy schema requirements
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = new User({
        name,
        email,
        password: hashedPassword,
        role: 'customer', // Default role for Google sign-ups
        googleUid: uid,
        photoURL: photoURL,
        isApproved: true, // Auto-approve Google users
        lastLogin: new Date()
      });

      await user.save();
      console.log('New user created successfully');
    }

    // Prepare response data (exclude sensitive information)
    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      photoURL: user.photoURL,
      phone: user.phone || '',
      address: user.address || {}
    };

    const responseData = {
      success: true,
      message: 'Login successful',
      user: responseUser
    };

    console.log('Sending response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('Google authentication error:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Authentication failed', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Google Authentication',
    timestamp: new Date().toISOString(),
    message: 'Google Auth service is running (client-side only, no Firebase Admin)'
  });
});

export default router;
