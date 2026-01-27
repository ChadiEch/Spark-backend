const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const testLogin = async () => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // Find user
    const user = await User.findOne({ email: 'chadiech18@gmail.com' }).select('+password');
    if (!user) {
      console.log('User not found!');
      process.exit(1);
    }

    console.log('User found:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Password hash: ${user.password.substring(0, 20)}...`);

    // Test password
    const testPassword = 'Chadi123@';
    console.log(`\nTesting password: ${testPassword}`);
    
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Password match: ${isMatch}`);

    if (!isMatch) {
      console.log('\n❌ Password does not match!');
    } else {
      console.log('\n✅ Password matches successfully!');
    }

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testLogin();
