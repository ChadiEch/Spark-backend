const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const Integration = require('../models/Integration');
const IntegrationConnection = require('../models/IntegrationConnection');

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

// Debug integrations
const debugIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('\n=== INTEGRATIONS ===');
    const integrations = await Integration.find({});
    console.log(`Found ${integrations.length} integrations:`);
    
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key})`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Client ID: ${integration.clientId ? `${integration.clientId.substring(0, 10)}...` : 'MISSING'}`);
      console.log(`  Enabled: ${integration.enabled}`);
      console.log('');
    });
    
    console.log('\n=== INTEGRATION CONNECTIONS ===');
    // Don't populate user to avoid the User model issue
    const connections = await IntegrationConnection.find({}).populate('integrationId');
    console.log(`Found ${connections.length} connections:`);
    
    connections.forEach(connection => {
      console.log(`- User ID: ${connection.userId}`);
      console.log(`  Integration: ${connection.integrationId ? connection.integrationId.name : 'UNKNOWN'}`);
      console.log(`  Access Token: ${connection.accessToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Refresh Token: ${connection.refreshToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Expires: ${connection.expiresAt ? connection.expiresAt.toISOString() : 'NEVER'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error debugging integrations:', error.message);
    process.exit(1);
  }
};

debugIntegrations();