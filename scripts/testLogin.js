const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const testLogin = async (email, password) => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`\nUser found:`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Password field exists: ${!!user.password}`);
    
    if (!user.password) {
      console.log('ERROR: User has no password set!');
      process.exit(1);
    }

    // Test password
    console.log('\nTesting password...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      console.log('SUCCESS: Password is correct!');
    } else {
      console.log('ERROR: Password is incorrect!');
      
      // Let's check what the stored password looks like
      console.log(`Stored password hash: ${user.password}`);
      console.log(`Password length: ${user.password.length}`);
    }

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node testLogin.js <email> <password>');
  console.log('Example: node testLogin.js admin@company.com AdminPass123!');
  process.exit(1);
}

testLogin(email, password);