const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const dotenv = require('dotenv');
const path = require('path');

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

// Update redirect URIs for all integrations to use the current backend URL
const updateCurrentBackendRedirectUri = async (backendUrl) => {
  try {
    await connectDB();
    
    if (!backendUrl) {
      console.error('Backend URL is required as an argument');
      console.log('Usage: node updateCurrentBackendRedirectUri.js http://localhost:5002');
      process.exit(1);
    }
    
    // Validate URL format
    try {
      new URL(backendUrl);
    } catch (urlError) {
      console.error('Invalid URL format:', urlError.message);
      process.exit(1);
    }
    
    const redirectUri = `${backendUrl}/api/integrations/callback`;
    
    // Update all integrations to use the provided backend URL
    const result = await Integration.updateMany(
      {}, 
      { 
        $set: { 
          redirectUri: redirectUri
        } 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} integrations with current backend redirect URI: ${redirectUri}`);
    
    // List all integrations to verify
    const integrations = await Integration.find({}, 'name key redirectUri');
    console.log('\nUpdated integrations:');
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key}): ${integration.redirectUri}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating redirect URIs:', error.message);
    process.exit(1);
  }
};

// Get backend URL from command line arguments
const backendUrl = process.argv[2];
updateCurrentBackendRedirectUri(backendUrl);