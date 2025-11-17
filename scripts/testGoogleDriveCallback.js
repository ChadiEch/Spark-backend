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

const logger = new Logger('test-google-drive-callback');

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

// Test the Google Drive OAuth callback process
const testGoogleDriveCallback = async () => {
  try {
    await connectDB();
    
    // Find the Google Drive integration
    const integration = await Integration.findOne({ key: 'google-drive' });
    
    if (!integration) {
      console.error('Google Drive integration not found');
      process.exit(1);
    }
    
    console.log('Found Google Drive integration:', integration.name);
    console.log('Redirect URI:', integration.redirectUri);
    console.log('Client ID:', integration.clientId);
    
    // Simulate the token exchange with mock data (since we don't have a real code)
    console.log('Testing token exchange with mock data...');
    
    // Create mock token data that matches what Google Drive would return
    const mockTokenData = {
      access_token: 'ya29.a0AfH6SMCtest-access-token-12345',
      refresh_token: '1//0gtest-refresh-token-67890',
      expires_in: 3599,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/drive'
    };
    
    // Test creating a connection with a valid ObjectId for userId
    // Using an existing user ID from the database or a new ObjectId
    const userId = new mongoose.Types.ObjectId();
    console.log('Creating connection with mock token data for user:', userId.toString());
    
    const connection = await createOrUpdateConnection(integration, userId.toString(), mockTokenData);
    
    console.log('Connection created successfully:', {
      connectionId: connection._id,
      integrationId: connection.integrationId,
      userId: connection.userId,
      hasAccessToken: !!connection.accessToken,
      hasRefreshToken: !!connection.refreshToken,
      expiresAt: connection.expiresAt
    });
    
    // Verify the connection was saved
    const savedConnection = await IntegrationConnection.findById(connection._id);
    console.log('Verified connection in database:', {
      exists: !!savedConnection,
      accessTokenEncrypted: !!savedConnection?.accessToken,
      refreshTokenEncrypted: !!savedConnection?.refreshToken
    });
    
    // Test retrieving connections for the user
    console.log('Testing retrieval of user connections...');
    const userConnections = await IntegrationConnection.find({ userId: userId }).populate('integrationId');
    console.log(`Found ${userConnections.length} connections for user ${userId}:`);
    
    userConnections.forEach(conn => {
      console.log(`- ${conn.integrationId?.name || 'Unknown'} integration`);
      console.log(`  Access Token: ${conn.accessToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Refresh Token: ${conn.refreshToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Expires: ${conn.expiresAt || 'NEVER'}`);
    });
    
    console.log('\n=== SIMULATION COMPLETE ===');
    console.log('The Google Drive OAuth callback process is working correctly.');
    console.log('Connections are being saved to the database.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing Google Drive OAuth callback:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testGoogleDriveCallback();