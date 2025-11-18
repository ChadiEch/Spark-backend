#!/usr/bin/env node

/**
 * Script to test integration connections
 * Usage: node testIntegrations.js
 */

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

// Test integrations
const testIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('\n=== INTEGRATIONS ===');
    const integrations = await Integration.find({});
    console.log(`Found ${integrations.length} integrations:`);
    
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key})`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Client ID: ${integration.clientId ? 'SET' : 'MISSING'}`);
      console.log(`  Client Secret: ${integration.clientSecret ? 'SET (HASHED)' : 'MISSING'}`);
      console.log(`  Enabled: ${integration.enabled}`);
      console.log('');
    });
    
    console.log('\n=== INTEGRATION CONNECTIONS ===');
    // Use lean() to avoid getters and virtuals
    const connections = await IntegrationConnection.find({}).lean();
    console.log(`Found ${connections.length} connections:`);
    
    connections.forEach(connection => {
      console.log(`- User ID: ${connection.userId}`);
      console.log(`  Integration ID: ${connection.integrationId}`);
      // Don't access encrypted fields directly to avoid decryption attempts
      console.log(`  Access Token: ${connection.accessToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Refresh Token: ${connection.refreshToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Expires: ${connection.expiresAt ? new Date(connection.expiresAt).toISOString() : 'NEVER'}`);
      console.log(`  Status: ${connection.status || 'UNKNOWN'}`);
      console.log(`  Created: ${connection.createdAt ? new Date(connection.createdAt).toISOString() : 'UNKNOWN'}`);
      console.log('');
    });
    
    console.log('\n=== SECURITY CHECK ===');
    // Check for any plaintext secrets
    const integrationsWithPlaintext = await Integration.find({
      $or: [
        { clientId: { $regex: '^[0-9]{10,}' } }, // Looks like a client ID
        { clientSecret: { $regex: '[a-zA-Z0-9]{20,}' } } // Looks like a secret
      ]
    });
    
    if (integrationsWithPlaintext.length > 0) {
      console.warn('⚠️  Warning: Some integrations may have plaintext credentials stored');
      integrationsWithPlaintext.forEach(integration => {
        console.warn(`  - ${integration.name} (${integration.key})`);
      });
    } else {
      console.log('✅ No plaintext credentials found in integrations');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing integrations:', error.message);
    process.exit(1);
  }
};

testIntegrations();