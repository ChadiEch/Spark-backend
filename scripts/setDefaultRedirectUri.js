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
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'MISSING');
    
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
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Set default redirect URI for all integrations
const setDefaultRedirectUri = async () => {
  try {
    await connectDB();
    
    // The default redirect URI we want to use
    const defaultRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    
    // Update all integrations to use the default redirect URI
    const result = await Integration.updateMany(
      {}, 
      { 
        $set: { 
          redirectUri: defaultRedirectUri
        } 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} integrations with default redirect URI: ${defaultRedirectUri}`);
    
    // Verify the updates
    console.log('\n=== VERIFICATION ===');
    const integrations = await Integration.find({});
    
    integrations.forEach(integration => {
      console.log(`\n${integration.name} (${integration.key}):`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Matches default: ${integration.redirectUri === defaultRedirectUri}`);
    });
    
    console.log('\nDefault redirect URI update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating default redirect URIs:', error);
    process.exit(1);
  }
};

// Run the update function
setDefaultRedirectUri();