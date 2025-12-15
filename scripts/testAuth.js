// Script to test authentication flow
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to database
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Test authentication
const testAuth = async () => {
  try {
    await connectDB();
    
    console.log('=== TESTING AUTHENTICATION ===\n');
    
    // Check if there are any users in the database
    const userCount = await User.countDocuments();
    console.log(`Found ${userCount} users in database`);
    
    if (userCount === 0) {
      console.log('No users found. Creating a test user...');
      
      // Create a test user
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'ADMIN'
      });
      
      await user.save();
      console.log('✅ Created test user');
    }
    
    // Find a user to test with
    const testUser = await User.findOne({});
    console.log(`\nTesting with user: ${testUser.email}`);
    
    // Generate a JWT token
    const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });
    
    console.log(`\nGenerated JWT token: ${token.substring(0, 20)}...`);
    
    // Verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verification successful');
      console.log(`Decoded user ID: ${decoded.id}`);
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
    }
    
    console.log('\n=== AUTHENTICATION TEST COMPLETE ===');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during authentication test:', error.message);
    process.exit(1);
  }
};

testAuth();