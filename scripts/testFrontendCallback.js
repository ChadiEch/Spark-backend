const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import utilities
const Logger = require('../utils/logger');
const { exchangeCodeForTokens, createOrUpdateConnection } = require('../utils/integrations/oauthUtils');

const logger = new Logger('test-frontend-callback');

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

// Test the frontend callback process
const testFrontendCallback = async () => {
  try {
    await connectDB();
    
    // Simulate the data that would be sent from the frontend
    const integrationId = '69184f9a41fbede3df957bad'; // Google Drive integration ID
    const userId = '6916ede023a4625ca577da28'; // User ID
    // Note: We can't use the OAuth code from your callback URL because OAuth codes are single-use and expire quickly
    // In a real scenario, the frontend would receive a fresh code from the OAuth provider
    const code = 'VALID_OAUTH_CODE_HERE'; // This needs to be a valid, fresh OAuth code
    const redirectUri = 'http://localhost:5173/integrations/callback'; // Local redirect URI
    
    console.log('Testing frontend callback process with data:', {
      integrationId,
      userId,
      code: code ? 'present' : 'missing',
      redirectUri
    });
    
    // Make a request to the backend API endpoint that the frontend would call
    const apiUrl = 'http://localhost:5001/api/integrations/exchange';
    console.log(`Making request to: ${apiUrl}`);
    
    try {
      const response = await axios.post(apiUrl, {
        integrationId,
        code,
        redirectUri,
        userId // Include userId in the request body
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API response:', {
        status: response.status,
        data: response.data
      });
      
      console.log('SUCCESS: The frontend callback process is working correctly!');
      console.log('Connection should be saved to the database.');
      
    } catch (apiError) {
      console.error('API Error:', {
        message: apiError.message,
        status: apiError.response?.status,
        data: apiError.response?.data
      });
      
      // If it's a 500 error, let's try to get more details
      if (apiError.response?.status === 500) {
        console.log('\n=== DETAILED ERROR ANALYSIS ===');
        console.log('This suggests there might be an issue with the backend processing.');
        console.log('Possible causes:');
        console.log('1. Invalid OAuth code (expired or already used) - THIS IS MOST LIKELY');
        console.log('2. Mismatched redirect URI between frontend and backend');
        console.log('3. Invalid client credentials in the database');
        console.log('4. Network issues with the OAuth provider');
        console.log('\nTo test this properly, you need to:');
        console.log('1. Initiate a fresh OAuth flow from the frontend');
        console.log('2. Copy the code from the callback URL immediately');
        console.log('3. Run this test script with that fresh code');
      }
    }
    
    console.log('\n=== RECOMMENDATION ===');
    console.log('For testing OAuth integration, it\'s better to:');
    console.log('1. Use the actual frontend to initiate the OAuth flow');
    console.log('2. Make sure the redirect URI in Google OAuth console matches exactly:');
    console.log('   http://localhost:5173/integrations/callback');
    console.log('3. Make sure the client credentials in the database match your Google OAuth app');
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing frontend callback:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testFrontendCallback();