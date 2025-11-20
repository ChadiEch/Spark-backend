const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to database
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'MISSING');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Debug OAuth flow for Google integrations
const debugOAuthFlow = async () => {
  try {
    await connectDB();
    
    console.log('\n=== DEBUGGING OAUTH FLOW ===');
    
    // Find Google Drive integration
    const googleDriveIntegration = await Integration.findOne({ key: 'google-drive' });
    if (googleDriveIntegration) {
      console.log('\nGoogle Drive Integration:');
      console.log('  ID:', googleDriveIntegration._id.toString());
      console.log('  Name:', googleDriveIntegration.name);
      console.log('  Key:', googleDriveIntegration.key);
      console.log('  Redirect URI:', googleDriveIntegration.redirectUri);
      console.log('  Client ID:', googleDriveIntegration.clientId ? `${googleDriveIntegration.clientId.substring(0, 30)}...` : 'MISSING');
      
      // Generate authorization URL
      const redirectUri = googleDriveIntegration.redirectUri;
      const state = JSON.stringify({ 
        integrationId: googleDriveIntegration._id.toString(),
        userId: 'debug_user_id'
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleDriveIntegration.clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${encodeURIComponent(state)}`;
        
      console.log('\nAuthorization URL would be:');
      console.log(authUrl);
      
      // Parse the redirect_uri from the URL
      const urlParams = new URLSearchParams(authUrl.split('?')[1]);
      const encodedRedirectUri = urlParams.get('redirect_uri');
      if (encodedRedirectUri) {
        const decodedRedirectUri = decodeURIComponent(encodedRedirectUri);
        console.log('\nDecoded redirect_uri from auth URL:');
        console.log(decodedRedirectUri);
      }
    }
    
    // Find YouTube integration
    const youtubeIntegration = await Integration.findOne({ key: 'youtube' });
    if (youtubeIntegration) {
      console.log('\nYouTube Integration:');
      console.log('  ID:', youtubeIntegration._id.toString());
      console.log('  Name:', youtubeIntegration.name);
      console.log('  Key:', youtubeIntegration.key);
      console.log('  Redirect URI:', youtubeIntegration.redirectUri);
      console.log('  Client ID:', youtubeIntegration.clientId ? `${youtubeIntegration.clientId.substring(0, 30)}...` : 'MISSING');
      
      // Generate authorization URL
      const redirectUri = youtubeIntegration.redirectUri;
      const state = JSON.stringify({ 
        integrationId: youtubeIntegration._id.toString(),
        userId: 'debug_user_id'
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${youtubeIntegration.clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube')}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${encodeURIComponent(state)}`;
        
      console.log('\nAuthorization URL would be:');
      console.log(authUrl);
      
      // Parse the redirect_uri from the URL
      const urlParams = new URLSearchParams(authUrl.split('?')[1]);
      const encodedRedirectUri = urlParams.get('redirect_uri');
      if (encodedRedirectUri) {
        const decodedRedirectUri = decodeURIComponent(encodedRedirectUri);
        console.log('\nDecoded redirect_uri from auth URL:');
        console.log(decodedRedirectUri);
      }
    }
    
    console.log('\n=== VERIFICATION AGAINST GOOGLE CONSOLE ===');
    console.log('Make sure these redirect URIs are registered in your Google OAuth app:');
    console.log('  1. http://localhost:5001/api/integrations/callback');
    console.log('  2. https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
    
    process.exit(0);
  } catch (error) {
    console.error('Error debugging OAuth flow:', error);
    process.exit(1);
  }
};

// Run the debug function
debugOAuthFlow();