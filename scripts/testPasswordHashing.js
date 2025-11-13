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

const testPasswordHashing = async () => {
  try {
    console.log('Testing password hashing manually...');
    
    // Hash a password manually
    const plainPassword = '123456';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    console.log('Plain password:', plainPassword);
    console.log('Generated salt:', salt);
    console.log('Hashed password:', hashedPassword);
    
    // Test validation
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('Manual validation result:', isMatch);
    
    // Now test with a user from the database
    console.log('\n--- Testing with database user ---');
    const user = await User.findOne({ email: 'chadi@winnerforce.com' }).select('+password');
    
    if (user && user.password) {
      console.log('Database user password:', user.password);
      
      // Test with the database password
      const dbMatch = await bcrypt.compare(plainPassword, user.password);
      console.log('Database password validation:', dbMatch);
      
      // Let's also check the password length
      console.log('Database password length:', user.password.length);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing password hashing:', error);
    process.exit(1);
  }
};

testPasswordHashing();