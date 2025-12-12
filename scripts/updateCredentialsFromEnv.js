// Script to update integration credentials from environment variables
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

// Update credentials from environment variables
const updateCredentialsFromEnv = async () => {
  try {
    await connectDB();
    
    console.log('=== UPDATING INTEGRATION CREDENTIALS FROM ENVIRONMENT VARIABLES ===\n');
    
    // Define mapping of integration keys to environment variable names
    const credentialMapping = {
      'google-drive': {
        clientIdEnvVar: 'GOOGLE_DRIVE_CLIENT_ID',
        clientSecretEnvVar: 'GOOGLE_DRIVE_CLIENT_SECRET'
      },
      'youtube': {
        clientIdEnvVar: 'YOUTUBE_CLIENT_ID',
        clientSecretEnvVar: 'YOUTUBE_CLIENT_SECRET'
      },
      'facebook': {
        clientIdEnvVar: 'FACEBOOK_APP_ID',
        clientSecretEnvVar: 'FACEBOOK_APP_SECRET'
      },
      'instagram': {
        clientIdEnvVar: 'INSTAGRAM_APP_ID',
        clientSecretEnvVar: 'INSTAGRAM_APP_SECRET'
      }
    };
    
    // Update each integration
    for (const [key, envVars] of Object.entries(credentialMapping)) {
      const integration = await Integration.findOne({ key });
      
      if (!integration) {
        console.log(`⚠️  ${key} integration not found, skipping...`);
        continue;
      }
      
      const clientId = process.env[envVars.clientIdEnvVar];
      const clientSecret = process.env[envVars.clientSecretEnvVar];
      
      if (!clientId || !clientSecret) {
        console.log(`⚠️  Environment variables for ${key} not found, skipping...`);
        console.log(`   Looking for: ${envVars.clientIdEnvVar}, ${envVars.clientSecretEnvVar}`);
        continue;
      }
      
      // Update the integration
      const updatedIntegration = await Integration.findByIdAndUpdate(
        integration._id,
        {
          clientId: clientId,
          clientSecret: clientSecret,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      console.log(`✅ Updated ${updatedIntegration.name} with credentials from environment variables`);
    }
    
    console.log('\n=== VERIFICATION ===');
    const updatedIntegrations = await Integration.find({});
    updatedIntegrations.forEach(integration => {
      console.log(`${integration.name}:`);
      console.log(`  Client ID: ${integration.clientId ? integration.clientId.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log(`  Client Secret: ${integration.clientSecret ? 'SET (hidden)' : 'NOT SET'}\n`);
    });
    
    console.log('=== CREDENTIAL UPDATE COMPLETE ===');
    console.log('All integrations have been updated with credentials from environment variables.');
    console.log('Remember to restart your backend server to load the new configurations.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating credentials:', error.message);
    process.exit(1);
  }
};

updateCredentialsFromEnv();