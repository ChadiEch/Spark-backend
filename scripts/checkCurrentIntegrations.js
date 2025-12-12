// Script to check current integration configurations
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

// Check current integrations
const checkIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('=== CURRENT INTEGRATION CONFIGURATIONS ===\n');
    
    // Get all integrations
    const integrations = await Integration.find({});
    
    if (integrations.length === 0) {
      console.log('No integrations found in the database.');
      console.log('Run the resetAndRebuildIntegrations.js script to create integrations.');
      process.exit(0);
    }
    
    console.log(`Found ${integrations.length} integrations:\n`);
    
    integrations.forEach((integration, index) => {
      console.log(`${index + 1}. ${integration.name} (${integration.key})`);
      console.log(`   Description: ${integration.description}`);
      console.log(`   Category: ${integration.category || 'Not set'}`);
      console.log(`   Redirect URI: ${integration.redirectUri}`);
      console.log(`   Scopes: ${integration.scopes ? integration.scopes.join(', ') : 'None'}`);
      console.log(`   Client ID: ${integration.clientId ? `${integration.clientId.substring(0, 20)}...` : 'Not set'}`);
      console.log(`   Client Secret: ${integration.clientSecret ? 'Set (hidden for security)' : 'Not set'}`);
      console.log(`   Active: ${integration.isActive ? 'Yes' : 'No'}`);
      console.log(`   Created: ${integration.createdAt ? integration.createdAt.toISOString() : 'Unknown'}`);
      console.log(`   Updated: ${integration.updatedAt ? integration.updatedAt.toISOString() : 'Unknown'}`);
      console.log('');
    });
    
    console.log('=== REDIRECT URI VERIFICATION ===');
    const expectedRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    
    let allMatch = true;
    integrations.forEach(integration => {
      if (integration.redirectUri === expectedRedirectUri) {
        console.log(`✅ ${integration.name}: Redirect URI matches expected value`);
      } else {
        console.log(`❌ ${integration.name}: Redirect URI mismatch!`);
        console.log(`   Expected: ${expectedRedirectUri}`);
        console.log(`   Actual:   ${integration.redirectUri}`);
        allMatch = false;
      }
    });
    
    if (allMatch) {
      console.log('\n✅ All integrations have correct redirect URIs');
    } else {
      console.log('\n❌ Some integrations have incorrect redirect URIs');
      console.log('Run resetAndRebuildIntegrations.js to fix this issue');
    }
    
    console.log('\n=== CREDENTIAL STATUS ===');
    integrations.forEach(integration => {
      const hasCredentials = integration.clientId && integration.clientSecret;
      console.log(`${hasCredentials ? '✅' : '⚠️'} ${integration.name}: ${hasCredentials ? 'Has credentials' : 'Missing credentials'}`);
    });
    
    console.log('\n=== RECOMMENDATIONS ===');
    if (!allMatch) {
      console.log('1. Run resetAndRebuildIntegrations.js to fix redirect URI issues');
    }
    
    const integrationsWithoutCredentials = integrations.filter(i => !i.clientId || !i.clientSecret);
    if (integrationsWithoutCredentials.length > 0) {
      console.log('2. Update credentials for:');
      integrationsWithoutCredentials.forEach(i => console.log(`   - ${i.name}`));
      console.log('   Use updateIntegrationCredentials.js or updateCredentialsFromEnv.js');
    }
    
    if (allMatch && integrationsWithoutCredentials.length === 0) {
      console.log('✅ All integrations are properly configured!');
      console.log('Restart your backend server to apply changes.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking integrations:', error.message);
    process.exit(1);
  }
};

checkIntegrations();