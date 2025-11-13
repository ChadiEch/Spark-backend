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

const createFreshUser = async () => {
  try {
    console.log('Creating a fresh user...');
    
    // Delete existing user if exists
    await User.deleteOne({ email: 'chadi@winnerforce.com' });
    console.log('Deleted existing user if any');
    
    // Create new user with plain text password
    // The User model's pre-save hook should hash this automatically
    const newUser = new User({
      name: 'Chadi Admin',
      email: 'chadi@winnerforce.com',
      password: '123456', // Plain text - should be hashed by pre-save hook
      role: 'ADMIN'
    });
    
    console.log('Saving user with plain text password...');
    await newUser.save();
    console.log('User saved successfully');
    
    // Now retrieve the user and check the password
    const savedUser = await User.findOne({ email: 'chadi@winnerforce.com' }).select('+password');
    
    if (savedUser && savedUser.password) {
      console.log('Saved user password:', savedUser.password);
      
      // Test validation
      const isMatch = await bcrypt.compare('123456', savedUser.password);
      console.log('Password validation result:', isMatch);
      
      if (isMatch) {
        console.log('SUCCESS: User created with properly hashed password!');
      } else {
        console.log('ERROR: Password validation failed even after saving');
      }
    } else {
      console.log('ERROR: User saved but no password found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating fresh user:', error);
    process.exit(1);
  }
};

createFreshUser();