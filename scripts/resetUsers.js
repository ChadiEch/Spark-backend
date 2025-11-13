const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const resetUsers = async () => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // Delete all users
    console.log('Deleting all users...');
    const deleteResult = await User.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} users`);

    // Create new admin user
    console.log('Creating new admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('AdminPass123!', salt);
    
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN'
    });
    
    console.log('New admin user created successfully!');
    console.log(`Name: ${adminUser.name}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);

    // Also clear the rate limit store by restarting the server
    console.log('\nPlease restart the server to clear rate limiting data.');
    console.log('You can do this by stopping the current server process and starting it again.');

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetUsers();