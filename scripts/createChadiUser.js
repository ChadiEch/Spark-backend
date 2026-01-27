const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const createChadiUser = async () => {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'chadiech18@gmail.com' });
    if (existingUser) {
      console.log('User already exists. Deleting and recreating...');
      await User.findByIdAndDelete(existingUser._id);
    }
    
    console.log('Creating user...');
    
    // Create user with plain text password (model pre-save hook will hash it)
    const user = await User.create({
      name: 'Chadi',
      email: 'chadiech18@gmail.com',
      password: 'Chadi123@',
      role: 'ADMIN'
    });
    
    console.log('User created successfully!');
    console.log(`User ID: ${user._id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`\nYou can now login with:`);
    console.log(`  Email: chadiech18@gmail.com`);
    console.log(`  Password: Chadi123@`);

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createChadiUser();
