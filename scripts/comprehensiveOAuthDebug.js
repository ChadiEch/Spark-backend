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

// Comprehensive OAuth debugging
const comprehensiveOAuthDebug = async () => {
  try {
    await connectDB();
    
    console.log('=== COMPREHENSIVE OAUTH DEBUGGING ===\n');
    
    // 1. Check all integrations in database
    console.log('1. DATABASE INTEGRATIONS:');
    console.log('========================');
    const integrations = await Integration.find({});
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key}):`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Client ID: ${integration.clientId ? integration.clientId.substring(0, 20) + '...' : 'NOT SET'}`);
      console.log(`  Enabled: ${integration.enabled}`);
      console.log('');
    });
    
    // 2. Focus on Google Drive integration
    console.log('2. GOOGLE DRIVE INTEGRATION DETAILS:');
    console.log('====================================');
    const googleDriveIntegration = await Integration.findOne({ key: 'google-drive' });
    
    if (!googleDriveIntegration) {
      console.error('ERROR: Google Drive integration not found in database!');
      process.exit(1);
    }
    
    console.log(`Name: ${googleDriveIntegration.name}`);
    console.log(`Key: ${googleDriveIntegration.key}`);
    console.log(`ID: ${googleDriveIntegration._id}`);
    console.log(`Redirect URI: ${googleDriveIntegration.redirectUri}`);
    console.log(`Client ID: ${googleDriveIntegration.clientId ? 'SET' : 'NOT SET'}`);
    console.log(`Client Secret: ${googleDriveIntegration.clientSecret ? 'SET' : 'NOT SET'}`);
    console.log(`Scopes: ${JSON.stringify(googleDriveIntegration.scopes)}`);
    console.log(`Enabled: ${googleDriveIntegration.enabled}`);
    
    // 3. Simulate the exact OAuth flow
    console.log('\n3. SIMULATING OAUTH FLOW:');
    console.log('========================');
    
    // This is what the backend controller uses
    const redirectUriToUse = googleDriveIntegration.redirectUri || 
      'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    
    console.log(`Redirect URI to use: ${redirectUriToUse}`);
    console.log(`Matches database value: ${redirectUriToUse === googleDriveIntegration.redirectUri}`);
    
    // Generate authorization URL exactly as the controller does
    const state = JSON.stringify({ 
      integrationId: googleDriveIntegration._id.toString(),
      // In real flow, userId would be set from session
      userId: 'debug_user_id'
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleDriveIntegration.clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUriToUse)}&` +
      `scope=${encodeURIComponent(googleDriveIntegration.scopes.join(' '))}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;
      
    console.log(`\nGenerated Authorization URL:`);
    console.log(`${authUrl.split('?')[0]}?${authUrl.split('?')[1].substring(0, 150)}...`);
    
    // Extract redirect_uri parameter
    const urlParams = new URLSearchParams(authUrl.split('?')[1]);
    const encodedRedirectUri = urlParams.get('redirect_uri');
    if (encodedRedirectUri) {
      const decodedRedirectUri = decodeURIComponent(encodedRedirectUri);
      console.log(`\nDecoded redirect_uri parameter: ${decodedRedirectUri}`);
      console.log(`Exact match with database: ${decodedRedirectUri === googleDriveIntegration.redirectUri}`);
      
      // Check for common issues
      console.log('\n4. COMMON ISSUE CHECKS:');
      console.log('======================');
      
      // Check for trailing slash
      if (decodedRedirectUri.endsWith('/') && !googleDriveIntegration.redirectUri.endsWith('/')) {
        console.log('⚠️  WARNING: Decoded URI has trailing slash, database value does not');
      } else if (!decodedRedirectUri.endsWith('/') && googleDriveIntegration.redirectUri.endsWith('/')) {
        console.log('⚠️  WARNING: Database value has trailing slash, decoded URI does not');
      }
      
      // Check for protocol
      if (!decodedRedirectUri.startsWith('https://')) {
        console.log('⚠️  WARNING: Decoded URI does not start with https://');
      }
      
      // Check for exact character match
      if (decodedRedirectUri !== googleDriveIntegration.redirectUri) {
        console.log('⚠️  WARNING: Character-by-character comparison shows differences:');
        console.log(`  Decoded:  "${decodedRedirectUri}"`);
        console.log(`  Database: "${googleDriveIntegration.redirectUri}"`);
        
        // Show character codes for debugging
        for (let i = 0; i < Math.max(decodedRedirectUri.length, googleDriveIntegration.redirectUri.length); i++) {
          const char1 = decodedRedirectUri[i] || '(none)';
          const char2 = googleDriveIntegration.redirectUri[i] || '(none)';
          if (char1 !== char2) {
            console.log(`  Position ${i}: '${char1}' (${char1.charCodeAt(0)}) vs '${char2}' (${char2.charCodeAt(0)})`);
          }
        }
      }
    }
    
    // 5. Check environment variables
    console.log('\n5. ENVIRONMENT VARIABLES:');
    console.log('========================');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    console.log(`MONGO_URI: ${process.env.MONGO_URI ? 'SET' : 'NOT SET'}`);
    console.log(`GOOGLE_DRIVE_CLIENT_ID: ${process.env.GOOGLE_DRIVE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET: ${process.env.GOOGLE_DRIVE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
    
    // 6. Recommendations
    console.log('\n6. RECOMMENDATIONS:');
    console.log('==================');
    console.log('If you\'re still having issues:');
    console.log('1. Double-check that the exact URI is registered in Google OAuth Console:');
    console.log(`   ${googleDriveIntegration.redirectUri}`);
    console.log('2. Make sure there are no extra spaces or characters in the Google Console');
    console.log('3. Try removing and re-adding the URI in Google Console');
    console.log('4. Check that your Google Drive Client ID and Secret are correct');
    console.log('5. Make sure you\'re using the correct Google Cloud project');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during comprehensive OAuth debugging:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

comprehensiveOAuthDebug();