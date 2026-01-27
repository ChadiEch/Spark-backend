/**
 * This script updates all integration redirect URIs to match the current backend server port.
 * It should be run after the server starts to ensure OAuth flows work correctly.
 */

const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Update redirect URIs for all integrations to use the current server port
const updateIntegrationRedirectUrisForCurrentPort = async (currentPort) => {
  try {
    await connectDB();
    
    if (!currentPort) {
      console.error('Current port is required as an argument');
      console.log('Usage: node updateIntegrationRedirectUrisForCurrentPort.js 5002');
      process.exit(1);
    }
    
    const backendHost = process.env.NODE_ENV === 'production' 
      ? process.env.BACKEND_URL || `https://${require('os').hostname()}`
      : `http://localhost:${currentPort}`;
      
    const redirectUri = `${backendHost}/api/integrations/callback`;
    
    // Update all integrations to use the current backend URL
    const result = await Integration.updateMany(
      {}, 
      { 
        $set: { 
          redirectUri: redirectUri
        } 
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} integrations with current backend redirect URI: ${redirectUri}`);
    
    // List all integrations to verify
    const integrations = await Integration.find({}, 'name key redirectUri');
    console.log('\n📋 Updated integrations:');
    integrations.forEach(integration => {
      console.log(`   • ${integration.name} (${integration.key}): ${integration.redirectUri}`);
    });
    
    return redirectUri;
  } catch (error) {
    console.error('❌ Error updating redirect URIs:', error.message);
    throw error;
  }
};

// Get current port from command line arguments
const currentPort = process.argv[2];

if (require.main === module) {
  updateIntegrationRedirectUrisForCurrentPort(currentPort)
    .then(() => {
      console.log('\n✅ Integration redirect URIs updated successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Failed to update integration redirect URIs:', error.message);
      process.exit(1);
    });
}

module.exports = updateIntegrationRedirectUrisForCurrentPort;