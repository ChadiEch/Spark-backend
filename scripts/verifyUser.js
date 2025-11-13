const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const verifyUser = async (email, password) => {
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
    const user = await User.findOne({ email: email });
    if (!user) {
      console.log(`User with email ${email} not found.`);
      // List all users
      const users = await User.find({});
      console.log('\nExisting users in the database:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
      });
      process.exit(1);
    }

    console.log(`\nUser found:`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Password field exists: ${!!user.password}`);
    console.log(`Full user object:`, JSON.stringify(user, null, 2));

    // If password doesn't exist, set one
    if (!user.password) {
      console.log('\nUser has no password. Setting password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });
      console.log('Password has been set successfully!');
    } else {
      // Test password
      console.log('\nTesting password...');
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        console.log('Password is correct!');
      } else {
        console.log('Password is incorrect!');
        
        // Let's reset the password to be sure
        console.log('\nResetting password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        console.log('Password has been reset successfully!');
      }
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
  console.log('Usage: node verifyUser.js <email> <password>');
  console.log('Example: node verifyUser.js admin@test.com password123');
  process.exit(1);
}

verifyUser(email, password);