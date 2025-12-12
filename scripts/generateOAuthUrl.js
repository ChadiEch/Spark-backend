// Script to generate the exact OAuth URL that would be used
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

// Generate OAuth URL
const generateOAuthUrl = async () => {
  try {
    await connectDB();
    
    console.log('=== GENERATING OAUTH URL ===\n');
    
    // Find Google Drive integration
    const integration = await Integration.findOne({ key: 'google-drive' });
    
    if (!integration) {
      console.error('Google Drive integration not found!');
      process.exit(1);
    }
    
    console.log('Integration details:');
    console.log(`Name: ${integration.name}`);
    console.log(`Key: ${integration.key}`);
    console.log(`Redirect URI: ${integration.redirectUri}`);
    console.log(`Client ID: ${integration.clientId ? 'SET' : 'NOT SET'}`);
    console.log(`Scopes: ${integration.scopes.join(', ')}`);
    
    // Generate authorization URL exactly as the backend would
    console.log('\n=== GENERATING AUTHORIZATION URL ===');
    
    // This is what the backend uses for redirect URI resolution
    const defaultRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    const finalRedirectUri = integration.redirectUri || defaultRedirectUri;
    
    console.log(`Final redirect URI: ${finalRedirectUri}`);
    
    // Mock user ID for testing
    const userId = 'test_user_id';
    
    // Generate state parameter
    const state = JSON.stringify({ 
      integrationId: integration._id.toString(),
      userId: userId
    });
    
    console.log(`State parameter: ${state}`);
    
    // Generate the authorization URL
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
    
    // Parse and verify the redirect_uri parameter
    const url = new URL(authUrl);
    const redirectUriParam = url.searchParams.get('redirect_uri');
    
    if (redirectUriParam) {
      const decodedRedirectUri = decodeURIComponent(redirectUriParam);
      console.log('\nDecoded redirect_uri parameter:');
      console.log(decodedRedirectUri);
      console.log(`Matches database value: ${decodedRedirectUri === integration.redirectUri}`);
      
      // Verify character by character
      if (decodedRedirectUri === integration.redirectUri) {
        console.log('✅ SUCCESS: Redirect URI matches database value exactly');
      } else {
        console.log('❌ ERROR: Redirect URI does not match database value');
        console.log('Database value:', integration.redirectUri);
        console.log('URL value:   ', decodedRedirectUri);
      }
    }
    
    // Verify this matches what's in Google Console
    const googleConsoleUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    console.log(`\nGoogle Console URI: ${googleConsoleUri}`);
    console.log(`Matches: ${finalRedirectUri === googleConsoleUri}`);
    
    if (finalRedirectUri === googleConsoleUri) {
      console.log('✅ SUCCESS: Redirect URI matches Google Console registration');
    } else {
      console.log('❌ ERROR: Redirect URI does not match Google Console registration');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating OAuth URL:', error.message);
    process.exit(1);
  }
};

generateOAuthUrl();