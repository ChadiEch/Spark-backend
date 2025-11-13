const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const createTestUser = async () => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Test user already exists. Updating password...');
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Update user password
      await User.findByIdAndUpdate(existingUser._id, { password: hashedPassword });
      console.log('Test user password updated successfully!');
    } else {
      console.log('Creating new test user...');
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Create user
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'ADMIN'
      });
      
      console.log('Test user created successfully!');
      console.log(`User ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
    }

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createTestUser();