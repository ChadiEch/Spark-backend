const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const resetPassword = async (email, newPassword) => {
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
      process.exit(1);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });
    
    console.log(`Password for user ${user.name} (${user.email}) has been reset successfully!`);
    console.log('New password:', newPassword);

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3] || 'password123';

if (!email) {
  console.log('Usage: node resetPassword.js <email> [newPassword]');
  console.log('Example: node resetPassword.js admin@test.com myNewPassword123');
  process.exit(1);
}

resetPassword(email, newPassword);