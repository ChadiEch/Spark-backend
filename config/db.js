const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGO_URI is defined
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not defined in environment variables');
      console.log('Please ensure you have a .env file in the server directory with MONGO_URI configured');
      return Promise.resolve(null);
    }
    
    // Connection options for MongoDB (without deprecated options)
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('Please ensure MongoDB is running on your system.');
    console.log('You can download MongoDB from: https://www.mongodb.com/try/download/community');
    console.log('Or use a cloud MongoDB service like MongoDB Atlas.');
    console.log('To use MongoDB Atlas, update your MONGO_URI in the .env file with your connection string.');
    
    // Return a resolved promise instead of exiting to prevent app crash
    return Promise.resolve(null);
  }
};

module.exports = connectDB;