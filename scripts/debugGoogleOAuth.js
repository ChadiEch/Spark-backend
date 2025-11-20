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

// Debug Google OAuth flow
const debugGoogleOAuth = async () => {
  try {
    await connectDB();
    
    console.log('\n=== DEBUGGING GOOGLE OAUTH FLOW ===');
    
    // Find Google Drive integration
    const googleDriveIntegration = await Integration.findOne({ key: 'google-drive' });
    if (googleDriveIntegration) {
      console.log('\nGoogle Drive Integration:');
      console.log('  ID:', googleDriveIntegration._id.toString());
      console.log('  Name:', googleDriveIntegration.name);
      console.log('  Key:', googleDriveIntegration.key);
      console.log('  Redirect URI:', googleDriveIntegration.redirectUri);
      console.log('  Client ID:', googleDriveIntegration.clientId);
      
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
        
      console.log('\nAuthorization URL:');
      console.log(authUrl);
      
      // Parse the redirect_uri from the URL
      const urlParams = new URLSearchParams(authUrl.split('?')[1]);
      const encodedRedirectUri = urlParams.get('redirect_uri');
      if (encodedRedirectUri) {
        const decodedRedirectUri = decodeURIComponent(encodedRedirectUri);
        console.log('\nDecoded redirect_uri from auth URL:');
        console.log(decodedRedirectUri);
        console.log('\nDoes it match database value?', decodedRedirectUri === googleDriveIntegration.redirectUri);
      }
    }
    
    console.log('\n=== VERIFICATION AGAINST GOOGLE CONSOLE ===');
    console.log('Make sure this redirect URI is registered in your Google OAuth app:');
    console.log('  https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
    
    process.exit(0);
  } catch (error) {
    console.error('Error debugging Google OAuth flow:', error);
    process.exit(1);
  }
};

// Run the debug function
debugGoogleOAuth();