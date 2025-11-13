const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const fixUsers = async () => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users in the database.`);
    
    for (const user of users) {
      console.log(`\nProcessing user: ${user.name} (${user.email})`);
      
      // Check if user has a password
      if (!user.password) {
        console.log(`  User has no password. Setting default password...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        console.log(`  Password set for ${user.name}`);
      } else {
        console.log(`  User already has a password.`);
      }
    }
    
    console.log('\nAll users processed successfully!');
    
    // Test creating a new user
    console.log('\nTesting user creation...');
    try {
      const existingUser = await User.findOne({ email: 'testuser@example.com' });
      if (existingUser) {
        console.log('Test user already exists. Deleting...');
        await User.deleteOne({ email: 'testuser@example.com' });
      }
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      const newUser = await User.create({
        name: 'Test User Registration',
        email: 'testuser@example.com',
        password: hashedPassword,
        role: 'CONTRIBUTOR'
      });
      
      console.log('Test user created successfully!');
      console.log(`Name: ${newUser.name}`);
      console.log(`Email: ${newUser.email}`);
      console.log(`Role: ${newUser.role}`);
    } catch (error) {
      console.error('Error creating test user:', error.message);
    }

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixUsers();