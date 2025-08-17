import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { MenuItem } from './models/index.js';

// Load environment variables
dotenv.config();

const cleanupMenuItems = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    console.log('Deleting all menu items...');
    const result = await MenuItem.deleteMany({});
    
    console.log(`Successfully deleted ${result.deletedCount} menu items`);
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up menu items:', error);
    process.exit(1);
  }
};

cleanupMenuItems();
