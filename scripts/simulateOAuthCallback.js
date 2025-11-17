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

const logger = new Logger('simulate-oauth-callback');

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

// Simulate the OAuth callback process
const simulateOAuthCallback = async () => {
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
    
    // Simulate the token exchange with mock data
    const mockTokenData = {
      access_token: 'test_access_token_12345',
      refresh_token: 'test_refresh_token_67890',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'read,write'
    };
    
    console.log('Simulating token exchange with mock data...');
    
    // Import the createOrUpdateConnection function
    const { createOrUpdateConnection } = require('../utils/integrations/oauthUtils');
    
    // Simulate creating a connection with a real user ID (this would come from the auth context)
    const userId = '69184f9941fbede3df957baa'; // This should be a real user ID
    
    console.log('Creating connection with mock token data for user:', userId);
    
    // Test creating a connection
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
    console.log('Testing retrieval of user connections...');
    const userConnections = await IntegrationConnection.find({ userId: userId }).populate('integrationId');
    console.log(`Found ${userConnections.length} connections for user ${userId}:`);
    
    userConnections.forEach(conn => {
      console.log(`- ${conn.integrationId?.name || 'Unknown'} integration`);
      console.log(`  Access Token: ${conn.accessToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
      console.log(`  Refresh Token: ${conn.refreshToken ? 'PRESENT (ENCRYPTED)' : 'MISSING'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error simulating OAuth callback:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

simulateOAuthCallback();