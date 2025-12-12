// Script to capture the exact authorization URL that would be generated
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

// Capture authorization URL
const captureAuthUrl = async () => {
  try {
    await connectDB();
    
    console.log('=== CAPTURING AUTHORIZATION URL ===\n');
    
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
    console.log(`Client ID: ${integration.clientId ? integration.clientId.substring(0, 30) + '...' : 'NOT SET'}`);
    console.log(`Scopes: ${integration.scopes.join(', ')}`);
    
    // Generate authorization URL exactly as the backend would
    console.log('\n=== GENERATING AUTHORIZATION URL ===');
    
    // This is what the backend uses for redirect URI resolution
    const defaultRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    const finalRedirectUri = integration.redirectUri || defaultRedirectUri;
    
    console.log(`Final redirect URI: ${finalRedirectUri}`);
    
    // Mock user ID for testing (this would be a real user ID in the app)
    const userId = '6920032786df291bc118aa1f'; // Using a realistic user ID
    
    // Generate state parameter exactly as the backend would
    const state = JSON.stringify({ 
      integrationId: integration._id.toString(),
      userId: userId
    });
    
    console.log(`\nState parameter: ${state}`);
    
    // Generate the authorization URL exactly as the backend controller would
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${integration.clientId}&` +
      `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
      `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;
      
    console.log('\nGenerated Authorization URL:');
    console.log('================================');
    console.log(authUrl);
    
    // Parse and verify the redirect_uri parameter
    const url = new URL(authUrl);
    const redirectUriParam = url.searchParams.get('redirect_uri');
    
    if (redirectUriParam) {
      const decodedRedirectUri = decodeURIComponent(redirectUriParam);
      console.log('\nDecoded redirect_uri parameter:');
      console.log('================================');
      console.log(decodedRedirectUri);
      console.log(`\nMatches database value: ${decodedRedirectUri === integration.redirectUri}`);
      
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
    console.log(`Matches final URI: ${finalRedirectUri === googleConsoleUri}`);
    
    if (finalRedirectUri === googleConsoleUri) {
      console.log('✅ SUCCESS: Redirect URI matches Google Console registration');
    } else {
      console.log('❌ ERROR: Redirect URI does not match Google Console registration');
    }
    
    // Show what Google receives
    console.log('\n=== WHAT GOOGLE RECEIVES ===');
    console.log('When a user visits the authorization URL, Google parses these parameters:');
    for (const [key, value] of url.searchParams) {
      if (key === 'redirect_uri') {
        console.log(`  ${key}: ${decodeURIComponent(value)}`);
      } else if (key === 'state') {
        console.log(`  ${key}: ${decodeURIComponent(value)}`);
      } else if (key === 'scope') {
        console.log(`  ${key}: ${decodeURIComponent(value)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    // Show character-by-character comparison if there might be hidden characters
    console.log('\n=== CHARACTER-BY-CHARACTER COMPARISON ===');
    const dbUri = integration.redirectUri;
    const googleUri = googleConsoleUri;
    
    if (dbUri !== googleUri) {
      console.log('Character differences found:');
      for (let i = 0; i < Math.max(dbUri.length, googleUri.length); i++) {
        const dbChar = dbUri[i] || '(none)';
        const googleChar = googleUri[i] || '(none)';
        if (dbChar !== googleChar) {
          console.log(`  Position ${i}: DB='${dbChar}' (${dbChar.charCodeAt(0)}) vs Google='${googleChar}' (${googleChar.charCodeAt(0)})`);
        }
      }
    } else {
      console.log('No character differences found between database and Google Console URIs.');
    }
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Copy the Generated Authorization URL above');
    console.log('2. Paste it directly in your browser');
    console.log('3. See if you get the same redirect_uri_mismatch error');
    console.log('4. If you do, the issue is definitely with Google OAuth configuration');
    console.log('5. If you don\'t, the issue is with how the frontend calls the backend');
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating authorization URL:', error.message);
    process.exit(1);
  }
};

captureAuthUrl();