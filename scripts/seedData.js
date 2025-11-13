const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Post = require('../models/Post');
const Campaign = require('../models/Campaign');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Asset = require('../models/Asset');
const connectDB = require('../config/db');

// Connect to database with better error handling
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to MongoDB (attempt ${i + 1}/${retries})...`);
      const conn = await connectDB();
      if (conn) {
        console.log('Successfully connected to MongoDB');
        // Wait a bit for the connection to fully establish
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      } else {
        throw new Error('Connection returned null');
      }
    } catch (error) {
      console.error(`Connection attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('Failed to connect to MongoDB after all retries');
  return false;
};

// Sample data
const users = [
  {
    name: 'Sarah Johnson',
    email: 'sarah@winnerforce.com',
    password: '123456',
    role: 'ADMIN'
  },
  {
    name: 'Mike Chen',
    email: 'mike@winnerforce.com',
    password: '123456',
    role: 'MANAGER'
  }
];

const seedData = async () => {
  try {
    // Connect to database
    const isConnected = await connectWithRetry();
    if (!isConnected) {
      console.log('No database connection. Exiting.');
      process.exit(0);
    }

    // Hash passwords
    const usersWithHashedPasswords = await Promise.all(users.map(async (user) => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      return {
        ...user,
        password: hashedPassword
      };
    }));

    // Clear existing data
    await User.deleteMany();
    await Post.deleteMany();
    await Campaign.deleteMany();
    await Task.deleteMany();
    await Goal.deleteMany();
    await Asset.deleteMany();

    // Insert sample data
    await User.insertMany(usersWithHashedPasswords);

    console.log('Data seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  // Delete data
  const deleteData = async () => {
    try {
      const isConnected = await connectWithRetry();
      if (!isConnected) {
        console.log('No database connection. Exiting.');
        process.exit(0);
      }
      
      await User.deleteMany();
      await Post.deleteMany();
      await Campaign.deleteMany();
      await Task.deleteMany();
      await Goal.deleteMany();
      await Asset.deleteMany();

      console.log('All data deleted successfully!');
      process.exit();
    } catch (error) {
      console.error('Error deleting data:', error);
      process.exit(1);
    }
  };

  deleteData();
} else {
  seedData();
}