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

const logger = new Logger('debug-oauth-callback');

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

// Test the OAuth callback process with detailed error handling
const debugOAuthCallback = async () => {
  try {
    await connectDB();
    
    console.log('\n=== DEBUGGING OAUTH CALLBACK PROCESS ===');
    
    // Find a test integration (Google Drive)
    const integration = await Integration.findOne({ key: 'google-drive' });
    
    if (!integration) {
      console.error('Google Drive integration not found');
      process.exit(1);
    }
    
    console.log('Found integration:', integration.name);
    console.log('Redirect URI:', integration.redirectUri);
    console.log('Client ID:', integration.clientId);
    
    // Test with a mock code (this would normally come from the OAuth provider)
    const mockCode = '4/0Ab32j90_tyoRg-fgDf3p9WxZ_RX-6lksOLbfZENRYTpB7TLxwWZdaV5oNOSF-gPS791IQA';
    const redirectUri = integration.redirectUri;
    const userId = new mongoose.Types.ObjectId().toString();
    
    console.log('\n=== EXCHANGING CODE FOR TOKENS ===');
    console.log('Using code:', mockCode);
    console.log('Using redirect URI:', redirectUri);
    
    try {
      // This will fail because we're using a mock code, but we want to see the error handling
      const tokenData = await exchangeCodeForTokens(integration.key, mockCode, redirectUri);
      console.log('Token exchange successful:', Object.keys(tokenData));
      
      console.log('\n=== CREATING CONNECTION ===');
      const connection = await createOrUpdateConnection(integration, userId, tokenData);
      console.log('Connection created:', connection._id);
      
    } catch (error) {
      console.log('Expected error during token exchange (mock code):', error.message);
      
      // Test the connection creation with mock token data
      console.log('\n=== TESTING CONNECTION CREATION WITH MOCK DATA ===');
      const mockTokenData = {
        access_token: 'mock_access_token_12345',
        refresh_token: 'mock_refresh_token_67890',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/drive'
      };
      
      try {
        const connection = await createOrUpdateConnection(integration, userId, mockTokenData);
        console.log('Connection created successfully with mock data:', {
          connectionId: connection._id,
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
      } catch (connectionError) {
        console.error('Error creating connection with mock data:', connectionError.message);
        console.error('Stack:', connectionError.stack);
      }
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('Error in debugOAuthCallback:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

debugOAuthCallback();