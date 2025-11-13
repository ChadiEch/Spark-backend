const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import User model
const User = require('../models/User');

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createProperAdminUser = async () => {
  try {
    // Delete existing users
    await User.deleteMany({});
    console.log('Deleted existing users');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    
    // Create new admin user with proper password
    const newUser = new User({
      name: 'Chadi Admin',
      email: 'chadi@winnerforce.com',
      password: hashedPassword,
      role: 'ADMIN'
    });
    
    await newUser.save();
    
    console.log('Admin user created successfully!');
    console.log('Email: chadi@winnerforce.com');
    console.log('Password: 123456');
    console.log('Role: ADMIN');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createProperAdminUser();