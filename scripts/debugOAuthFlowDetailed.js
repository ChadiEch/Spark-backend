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

// Debug OAuth flow in detail
const debugOAuthFlowDetailed = async () => {
  try {
    await connectDB();
    
    // Find Google Drive integration
    const integration = await Integration.findOne({ key: 'google-drive' });
    
    if (!integration) {
      console.error('Google Drive integration not found');
      process.exit(1);
    }
    
    console.log('Google Drive Integration Details:');
    console.log('=================================');
    console.log('ID:', integration._id);
    console.log('Name:', integration.name);
    console.log('Key:', integration.key);
    console.log('Client ID:', integration.clientId);
    console.log('Redirect URI (from DB):', integration.redirectUri);
    console.log('Scopes:', integration.scopes);
    console.log('Enabled:', integration.enabled);
    
    // Simulate what happens in the connectIntegration controller function
    console.log('\n=== SIMULATING BACKEND CONNECT INTEGRATION FUNCTION ===');
    
    // This is what the backend uses as the final redirect URI
    const defaultRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    const finalRedirectUri = integration.redirectUri || defaultRedirectUri;
    
    console.log('Integration redirectUri:', integration.redirectUri);
    console.log('Default redirectUri:', defaultRedirectUri);
    console.log('Final redirectUri (used in auth URL):', finalRedirectUri);
    
    // Generate the authorization URL exactly as the backend does
    const state = JSON.stringify({ 
      integrationId: integration._id.toString(),
      userId: 'test_user_id'
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${integration.clientId}&` +
      `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
      `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;
      
    console.log('\nGenerated Authorization URL:');
    console.log(authUrl);
    
    // Extract and decode the redirect_uri parameter
    const urlParams = new URLSearchParams(authUrl.split('?')[1]);
    const encodedRedirectUri = urlParams.get('redirect_uri');
    if (encodedRedirectUri) {
      const decodedRedirectUri = decodeURIComponent(encodedRedirectUri);
      console.log('\nDecoded redirect_uri from auth URL:');
      console.log(decodedRedirectUri);
      console.log('\nDoes it match database value?', decodedRedirectUri === integration.redirectUri);
    }
    
    // Check what redirect URIs should be registered in Google Console
    console.log('\n=== GOOGLE CONSOLE CONFIGURATION ===');
    console.log('Make sure these redirect URIs are registered in your Google OAuth app:');
    console.log('  1. (Database value):', integration.redirectUri);
    console.log('  2. (Default value):', defaultRedirectUri);
    
    // Check frontend environment variables
    console.log('\n=== FRONTEND ENVIRONMENT VARIABLES ===');
    console.log('These are the values that should be in your frontend .env file:');
    console.log('  VITE_API_URL=https://spark-backend-production.up.railway.app/api');
    console.log('  This would generate redirect URI:', 'https://spark-backend-production.up.railway.app/api/integrations/callback');
    
    process.exit(0);
  } catch (error) {
    console.error('Error debugging OAuth flow:', error.message);
    process.exit(1);
  }
};

debugOAuthFlowDetailed();