const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load env vars from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

// Mock the login controller logic to see what's happening
const deepDebugLogin = async (email, password) => {
  try {
    console.log('=== DEEP BACKEND DEBUG ===');
    console.log('Input email:', email);
    console.log('Input password length:', password.length);
    
    // Connect to database
    console.log('Connecting to MongoDB...');
    const conn = await connectDB();
    if (!conn) {
      console.log('Failed to connect to MongoDB');
      process.exit(1);
    }
    console.log('Successfully connected to MongoDB');

    // Find user by email
    console.log('Searching for user by email...');
    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('ERROR: User not found in database');
      process.exit(1);
    }

    console.log(`User details:`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Password field exists: ${!!user.password}`);
    console.log(`  Password length: ${user.password ? user.password.length : 'N/A'}`);
    
    if (!user.password) {
      console.log('ERROR: User has no password set!');
      process.exit(1);
    }

    // Test password comparison
    console.log('\nTesting password comparison...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('ERROR: Password does not match!');
      // Let's check what the stored password looks like
      console.log(`Stored password hash: ${user.password}`);
      console.log(`Password length: ${user.password.length}`);
      process.exit(1);
    }

    // Generate tokens (mimicking what the controller does)
    console.log('\nGenerating tokens...');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'FOUND' : 'MISSING');
    console.log('REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET ? 'FOUND' : 'MISSING');
    
    // If REFRESH_TOKEN_SECRET is missing, use JWT_SECRET as fallback
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    
    const payload = {
      id: user.id
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    const refreshToken = jwt.sign(payload, refreshTokenSecret, { expiresIn: '60d' });
    
    console.log('Token generated:', token ? 'SUCCESS' : 'FAILED');
    console.log('Refresh token generated:', refreshToken ? 'SUCCESS' : 'FAILED');
    console.log('Token length:', token.length);
    console.log('Refresh token length:', refreshToken.length);
    
    // Create user response object
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    console.log('User response object:', userResponse);
    
    // Final response structure
    const finalResponse = {
      success: true,
      token,
      refreshToken,
      user: userResponse
    };
    
    console.log('Final response structure:');
    console.log(JSON.stringify(finalResponse, null, 2));
    
    console.log('\n=== BACKEND DEBUG COMPLETE ===');
    console.log('If you see this, the backend logic is working correctly.');
    console.log('The issue must be in the frontend handling of this response.');
    
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
  console.log('Usage: node deepDebugBackend.js <email> <password>');
  console.log('Example: node deepDebugBackend.js admin@company.com AdminPass123!');
  process.exit(1);
}

deepDebugLogin(email, password);