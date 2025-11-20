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

// Fix redirect URIs for local development
const fixRedirectUris = async () => {
  try {
    await connectDB();
    
    // Update all integrations to use localhost redirect URI for development
    const result = await Integration.updateMany(
      {}, 
      { 
        $set: { 
          redirectUri: 'http://localhost:5001/api/integrations/callback' 
        } 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} integrations with localhost redirect URI`);
    
    // List all integrations to verify
    const integrations = await Integration.find({}, 'name key redirectUri');
    console.log('\nCurrent integrations:');
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key}): ${integration.redirectUri}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing redirect URIs:', error.message);
    process.exit(1);
  }
};

fixRedirectUris();