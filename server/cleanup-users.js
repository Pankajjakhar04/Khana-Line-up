import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const cleanupUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    // Find all users except admin
    const usersToDelete = await User.find({
      email: { $nin: ['admin_super'] }
    });

    console.log(`Found ${usersToDelete.length} non-admin users to delete`);

    if (usersToDelete.length > 0) {
      // Delete all non-admin users
      const result = await User.deleteMany({
        email: { $nin: ['admin_super'] }
      });

      console.log(`Deleted ${result.deletedCount} users`);
    }

    // Verify only admin exists
    const remainingUsers = await User.find({});
    console.log('Remaining users:');
    remainingUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

cleanupUsers();
