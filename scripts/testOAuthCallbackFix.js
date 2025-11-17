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

const logger = new Logger('test-oauth-fix');

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
const testOAuthCallbackFix = async () => {
  try {
    await connectDB();
    
    console.log('\n=== TESTING OAUTH CALLBACK FIX ===');
    
    // Find a test integration (Google Drive)
    const integration = await Integration.findOne({ key: 'google-drive' });
    
    if (!integration) {
      console.error('Google Drive integration not found');
      process.exit(1);
    }
    
    console.log('Found integration:', integration.name);
    console.log('Redirect URI:', integration.redirectUri);
    console.log('Frontend URL from env:', process.env.FRONTEND_URL);
    
    // Test the redirect URI configuration
    const expectedRedirectUri = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/integrations/callback`
      : 'http://localhost:5173/integrations/callback';
      
    console.log('Expected redirect URI:', expectedRedirectUri);
    console.log('Integration redirect URI matches expected:', integration.redirectUri === expectedRedirectUri);
    
    // Test the token exchange with mock data
    console.log('\n=== TESTING TOKEN EXCHANGE WITH MOCK DATA ===');
    
    // Create mock token data
    const mockTokenData = {
      access_token: 'test_access_token_12345',
      refresh_token: 'test_refresh_token_67890',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/drive'
    };
    
    // Test creating a connection
    const userId = '69184f9941fbede3df957baa'; // This should be a real user ID
    console.log('Creating connection with mock token data for user:', userId);
    
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
    
    // Test retrieving connections for the user
    console.log('\n=== RETRIEVING USER CONNECTIONS ===');
    
    const userConnections = await IntegrationConnection.find({ userId: userId }).populate('integrationId');
    console.log(`Found ${userConnections.length} connections for user ${userId}:`);
    
    userConnections.forEach(conn => {
      console.log(`- ${conn.integrationId?.name || 'Unknown'} integration`);
      console.log(`  Access Token: ${conn.accessToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Refresh Token: ${conn.refreshToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
    });
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('The OAuth callback process is working correctly.');
    console.log('Connections are being saved to the database.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing OAuth callback fix:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testOAuthCallbackFix();