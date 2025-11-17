const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const Integration = require('../models/Integration');

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

// Check Google Drive integration details
const checkGoogleDriveIntegration = async () => {
  try {
    await connectDB();
    
    // Find the Google Drive integration
    const integration = await Integration.findOne({ key: 'google-drive' });
    
    if (!integration) {
      console.error('Google Drive integration not found');
      process.exit(1);
    }
    
    console.log('Google Drive Integration Details:');
    console.log('=================================');
    console.log('ID:', integration._id);
    console.log('Name:', integration.name);
    console.log('Key:', integration.key);
    console.log('Client ID:', integration.clientId);
    console.log('Redirect URI:', integration.redirectUri);
    console.log('Scopes:', integration.scopes);
    console.log('Enabled:', integration.enabled);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking Google Drive integration:', error.message);
    process.exit(1);
  }
};

checkGoogleDriveIntegration();