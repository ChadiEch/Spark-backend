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

// Check redirect URIs for all integrations
const checkRedirectUris = async () => {
  try {
    await connectDB();
    
    // Get all integrations
    const integrations = await Integration.find({});
    
    console.log('\n=== CURRENT INTEGRATION REDIRECT URIS ===');
    integrations.forEach(integration => {
      console.log(`\n${integration.name} (${integration.key}):`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Client ID: ${integration.clientId ? `${integration.clientId.substring(0, 20)}...` : 'MISSING'}`);
    });
    
    console.log('\n=== VERIFICATION AGAINST EXPECTED URI ===');
    const expectedRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    
    integrations.forEach(integration => {
      const matches = integration.redirectUri === expectedRedirectUri;
      console.log(`\n${integration.name} (${integration.key}):`);
      console.log(`  Matches expected: ${matches ? 'YES' : 'NO'}`);
      if (!matches) {
        console.log(`  Current:  ${integration.redirectUri}`);
        console.log(`  Expected: ${expectedRedirectUri}`);
      }
    });
    
    console.log('\nCheck completed');
    process.exit(0);
  } catch (error) {
    console.error('Error checking redirect URIs:', error);
    process.exit(1);
  }
};

// Run the check function
checkRedirectUris();