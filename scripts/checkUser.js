const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const checkUser = async () => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // List all users
    const users = await User.find({});
    console.log('\nExisting users in the database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    if (users.length === 0) {
      console.log('No users found in the database.');
    }

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUser();