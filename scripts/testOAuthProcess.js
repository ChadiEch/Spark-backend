const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const Integration = require('../models/Integration');
const IntegrationConnection = require('../models/IntegrationConnection');

// Import utilities
const { exchangeCodeForTokens } = require('../utils/integrations/oauthUtils');
const Logger = require('../utils/logger');

const logger = new Logger('test-oauth-process');

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

// Test the full OAuth process
const testOAuthProcess = async () => {
  try {
    await connectDB();
    
    // Find a test integration (Facebook)
    const integration = await Integration.findOne({ key: 'facebook' });
    
    if (!integration) {
      console.error('Facebook integration not found');
      process.exit(1);
    }
    
    console.log('Found integration:', integration.name);
    console.log('Redirect URI:', integration.redirectUri);
    
    // Test the token exchange with a mock code
    // This would normally be a real code from the OAuth provider
    console.log('Testing token exchange with mock code...');
    
    try {
      const tokenData = await exchangeCodeForTokens(
        integration.key, 
        'mock_code_12345', 
        integration.redirectUri
      );
      
      console.log('Token exchange result:', tokenData);
    } catch (error) {
      console.error('Token exchange failed:', error.message);
      console.error('This is expected with a mock code');
    }
    
    // Test creating a connection with mock token data
    const mockTokenData = {
      access_token: 'test_access_token_12345',
      refresh_token: 'test_refresh_token_67890',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'read,write'
    };
    
    console.log('Creating connection with mock token data...');
    
    // Import the createOrUpdateConnection function
    const { createOrUpdateConnection } = require('../utils/integrations/oauthUtils');
    
    // Test creating a connection
    const userId = 'test_user_id'; // This would be a real user ID in the app
    const connection = await createOrUpdateConnection(integration, userId, mockTokenData);
    
    console.log('Connection created successfully:', {
      connectionId: connection._id,
      integrationId: connection.integrationId,
      userId: connection.userId,
      hasAccessToken: !!connection.accessToken,
      hasRefreshToken: !!connection.refreshToken
    });
    
    // Verify the connection was saved
    const savedConnection = await IntegrationConnection.findById(connection._id);
    console.log('Verified connection in database:', {
      exists: !!savedConnection,
      accessTokenEncrypted: !!savedConnection?.accessToken,
      refreshTokenEncrypted: !!savedConnection?.refreshToken
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing OAuth process:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testOAuthProcess();