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

const listAllUsers = async () => {
  try {
    // Get all users
    const users = await User.find({});
    
    console.log('All users in the database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Has Password: ${!!user.password}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
};

listAllUsers();