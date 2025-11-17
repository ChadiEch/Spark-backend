const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const Integration = require('../models/Integration');
const IntegrationConnection = require('../models/IntegrationConnection');

// Import utilities
const Logger = require('../utils/logger');
const { exchangeCodeForTokens, createOrUpdateConnection } = require('../utils/integrations/oauthUtils');

const logger = new Logger('comprehensive-oauth-debug');

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

// Comprehensive OAuth debug
const comprehensiveOAuthDebug = async () => {
  try {
    await connectDB();
    
    console.log('=== COMPREHENSIVE OAUTH DEBUG ===\n');
    
    // 1. Check all integrations
    console.log('1. Checking all integrations in database:');
    const integrations = await Integration.find({});
    console.log(`Found ${integrations.length} integrations:`);
    integrations.forEach((integration, index) => {
      console.log(`  ${index + 1}. ${integration.name} (${integration.key})`);
      console.log(`     ID: ${integration._id}`);
      console.log(`     Client ID: ${integration.clientId ? `${integration.clientId.substring(0, 20)}...` : 'MISSING'}`);
      console.log(`     Redirect URI: ${integration.redirectUri}`);
      console.log(`     Scopes: ${integration.scopes ? integration.scopes.join(', ') : 'NONE'}`);
      console.log(`     Enabled: ${integration.enabled}`);
      console.log('');
    });
    
    // 2. Check Google Drive integration specifically
    console.log('2. Checking Google Drive integration specifically:');
    const googleDriveIntegration = await Integration.findOne({ key: 'google-drive' });
    if (!googleDriveIntegration) {
      console.error('ERROR: Google Drive integration not found!');
      process.exit(1);
    }
    
    console.log(`Google Drive Integration Details:`);
    console.log(`  ID: ${googleDriveIntegration._id}`);
    console.log(`  Name: ${googleDriveIntegration.name}`);
    console.log(`  Key: ${googleDriveIntegration.key}`);
    console.log(`  Client ID: ${googleDriveIntegration.clientId}`);
    console.log(`  Redirect URI: ${googleDriveIntegration.redirectUri}`);
    console.log(`  Scopes: ${JSON.stringify(googleDriveIntegration.scopes)}`);
    console.log(`  Enabled: ${googleDriveIntegration.enabled}`);
    console.log('');
    
    // 3. Check if there are existing connections
    console.log('3. Checking existing connections:');
    const connections = await IntegrationConnection.find({}).populate('integrationId');
    console.log(`Found ${connections.length} connections:`);
    connections.forEach((connection, index) => {
      console.log(`  ${index + 1}. ${connection.integrationId?.name || 'Unknown'} connection`);
      console.log(`     Connection ID: ${connection._id}`);
      console.log(`     User ID: ${connection.userId}`);
      console.log(`     Access Token: ${connection.accessToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`     Refresh Token: ${connection.refreshToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`     Expires: ${connection.expiresAt || 'NEVER'}`);
      console.log('');
    });
    
    // 4. Test OAuth flow with mock data
    console.log('4. Testing OAuth flow with mock data:');
    try {
      // Create mock token data
      const mockTokenData = {
        access_token: 'mock_access_token_12345',
        refresh_token: 'mock_refresh_token_67890',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/drive'
      };
      
      // Test creating a connection
      const testUserId = '6916ede023a4625ca577da28'; // Test user ID
      console.log(`Creating connection for user ${testUserId}...`);
      
      const connection = await createOrUpdateConnection(googleDriveIntegration, testUserId, mockTokenData);
      console.log('SUCCESS: Connection created/updated successfully');
      console.log(`  Connection ID: ${connection._id}`);
      console.log(`  Has Access Token: ${!!connection.accessToken}`);
      console.log(`  Has Refresh Token: ${!!connection.refreshToken}`);
      console.log('');
      
      // Verify the connection was saved
      const savedConnection = await IntegrationConnection.findById(connection._id);
      console.log('5. Verifying connection was saved to database:');
      console.log(`  Connection exists in DB: ${!!savedConnection}`);
      console.log(`  Access Token encrypted: ${!!savedConnection?.accessToken}`);
      console.log(`  Refresh Token encrypted: ${!!savedConnection?.refreshToken}`);
      console.log('');
      
      // Clean up test connection
      await IntegrationConnection.deleteOne({ _id: connection._id });
      console.log('Test connection cleaned up.');
      
    } catch (error) {
      console.error('ERROR during connection test:', error.message);
      console.error('Stack:', error.stack);
    }
    
    console.log('=== DEBUG COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('Error during comprehensive OAuth debug:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

comprehensiveOAuthDebug();