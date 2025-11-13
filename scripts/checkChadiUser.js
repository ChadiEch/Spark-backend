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

const checkChadiUser = async () => {
  try {
    // Check the chadi user
    const user = await User.findOne({ email: 'chadi@winnerforce.com' }).select('+password');
    
    if (user) {
      console.log('User found:');
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Role:', user.role);
      console.log('Password (hashed):', user.password);
      console.log('Has password field:', !!user.password);
    } else {
      console.log('No user found with email chadi@winnerforce.com');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking user:', error);
    process.exit(1);
  }
};

checkChadiUser();