import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, MenuItem, Order } from './models/index.js';

// Load environment variables
dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB Atlas connection...\n');
    
    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not configured in environment variables');
    }
    
    console.log('📝 Environment check: ✅ MONGODB_URI is configured');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌍 Host: ${mongoose.connection.host}`);
    
    // Test collections
    console.log('\n🧪 Testing database operations...');
    
    // Test user collection
    const userCount = await User.countDocuments();
    console.log(`👥 Users collection: ${userCount} documents`);
    
    // Test menu items collection
    const menuCount = await MenuItem.countDocuments();
    console.log(`🍽️  Menu items collection: ${menuCount} documents`);
    
    // Test orders collection
    const orderCount = await Order.countDocuments();
    console.log(`📋 Orders collection: ${orderCount} documents`);
    
    // Test write operation
    console.log('\n✍️  Testing write operation...');
    const testUser = new User({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword',
      name: 'Test User',
      role: 'customer'
    });
    
    await testUser.save();
    console.log('✅ Write operation successful');
    
    // Clean up test data
    await User.findByIdAndDelete(testUser._id);
    console.log('🧹 Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Your MongoDB Atlas integration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    
    if (error.message.includes('MONGODB_URI')) {
      console.log('\n💡 Setup instructions:');
      console.log('1. Copy .env.example to .env');
      console.log('2. Replace placeholder values with your MongoDB Atlas credentials');
      console.log('3. Ensure your IP address is whitelisted in MongoDB Atlas');
    }
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Authentication issue:');
      console.log('1. Check your username and password in the MongoDB URI');
      console.log('2. Ensure the database user has proper permissions');
    }
    
    if (error.message.includes('network')) {
      console.log('\n💡 Network issue:');
      console.log('1. Check your internet connection');
      console.log('2. Verify your IP is whitelisted in MongoDB Atlas Network Access');
      console.log('3. Check if your firewall is blocking the connection');
    }
    
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    process.exit(0);
  }
}

// Run the test
testConnection();
