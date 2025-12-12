// Script to check for duplicate integration records
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

// Check for duplicate integrations
const checkForDuplicateIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('=== CHECKING FOR DUPLICATE INTEGRATIONS ===\n');
    
    // Find all Google Drive integrations
    const googleDriveIntegrations = await Integration.find({ key: 'google-drive' });
    
    console.log(`Found ${googleDriveIntegrations.length} Google Drive integration(s):`);
    
    googleDriveIntegrations.forEach((integration, index) => {
      console.log(`\n${index + 1}. Integration:`);
      console.log(`   ID: ${integration._id}`);
      console.log(`   Name: ${integration.name}`);
      console.log(`   Key: ${integration.key}`);
      console.log(`   Redirect URI: ${integration.redirectUri}`);
      console.log(`   Client ID: ${integration.clientId ? 'SET' : 'NOT SET'}`);
      console.log(`   Enabled: ${integration.enabled}`);
    });
    
    if (googleDriveIntegrations.length > 1) {
      console.log('\n⚠️  WARNING: Multiple Google Drive integrations found!');
      console.log('This could cause issues if the wrong one is being used.');
    } else if (googleDriveIntegrations.length === 0) {
      console.log('\n❌ ERROR: No Google Drive integration found!');
    } else {
      console.log('\n✅ Only one Google Drive integration found.');
      
      // Check if redirect URI is correct
      const integration = googleDriveIntegrations[0];
      const expectedRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
      
      if (integration.redirectUri === expectedRedirectUri) {
        console.log('✅ Redirect URI is correct.');
      } else {
        console.log('❌ Redirect URI is incorrect!');
        console.log(`   Expected: ${expectedRedirectUri}`);
        console.log(`   Actual:   ${integration.redirectUri}`);
      }
    }
    
    // Check all integrations for redirect URI consistency
    console.log('\n=== CHECKING ALL INTEGRATIONS FOR REDIRECT URI CONSISTENCY ===');
    const allIntegrations = await Integration.find({});
    
    const redirectUris = {};
    allIntegrations.forEach(integration => {
      if (!redirectUris[integration.redirectUri]) {
        redirectUris[integration.redirectUri] = [];
      }
      redirectUris[integration.redirectUri].push(integration.name);
    });
    
    console.log('\nRedirect URI groups:');
    Object.keys(redirectUris).forEach(uri => {
      console.log(`  ${uri}:`);
      redirectUris[uri].forEach(name => {
        console.log(`    - ${name}`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking for duplicate integrations:', error.message);
    process.exit(1);
  }
};

checkForDuplicateIntegrations();