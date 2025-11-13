const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import User model
const User = require('./models/User');

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createAdminUser = async () => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'chadi@winnerforce.com' });
    
    if (existingUser) {
      console.log('User chadi@winnerforce.com already exists');
      console.log('Updating user to ADMIN role...');
      existingUser.role = 'ADMIN';
      await existingUser.save();
      console.log('User updated successfully');
      process.exit(0);
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    
    // Create new admin user
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

createAdminUser();