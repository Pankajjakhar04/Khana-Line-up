import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { MenuItem } from './models/index.js';

// Load environment variables
dotenv.config();

const cleanupMenuItems = async () => {
  try {
    if (process.env.CONFIRM_MENU_CLEANUP !== 'YES_I_WANT_TO_DELETE_ALL_MENU_ITEMS') {
      console.error('Refusing to delete menu items: set CONFIRM_MENU_CLEANUP=YES_I_WANT_TO_DELETE_ALL_MENU_ITEMS to run intentionally.');
      process.exit(1);
    }

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
