const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const verifyUserPasswords = async () => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // List all users and check their password fields
    const users = await User.find({});
    console.log('\nUser verification:');
    for (const user of users) {
      console.log(`\nUser: ${user.name} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Password field exists: ${!!user.password}`);
      console.log(`  Password length: ${user.password ? user.password.length : 'N/A'}`);
      
      // If user has no password, set one
      if (!user.password) {
        console.log(`  Setting default password for ${user.name}...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('AdminPass123!', salt);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        console.log(`  Password set successfully!`);
      } else if (user.password.length < 20) {
        // If password looks like plaintext, hash it
        console.log(`  Password appears to be plaintext, hashing it...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        console.log(`  Password hashed successfully!`);
      }
    }

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyUserPasswords();