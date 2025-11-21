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
    console.log('MONGO_URI:', process.env.MONGO_URI);
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
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

// Update redirect URIs for development
const updateRedirectUrisForDevelopment = async () => {
  try {
    await connectDB();
    
    // Update all integrations to use development redirect URI
    const result = await Integration.updateMany(
      {}, 
      { 
        $set: { 
          redirectUri: 'http://localhost:5001/api/integrations/callback' 
        } 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} integrations with development redirect URI`);
    
    // List all integrations to verify
    const integrations = await Integration.find({}, 'name key redirectUri');
    console.log('\nCurrent integrations:');
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key}): ${integration.redirectUri}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating redirect URIs:', error.message);
    process.exit(1);
  }
};

updateRedirectUrisForDevelopment();