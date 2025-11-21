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

// Debug frontend redirect URI
const debugFrontendRedirectUri = async () => {
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
    console.log('Redirect URI:', integration.redirectUri);
    console.log('Scopes:', integration.scopes);
    console.log('Enabled:', integration.enabled);
    
    // Generate authorization URL with different redirect URIs to see which one works
    console.log('\n=== TESTING DIFFERENT REDIRECT URIS ===');
    
    const redirectUrisToTest = [
      'http://localhost:5173/integrations/callback', // Frontend callback
      'http://localhost:5001/api/integrations/callback', // Backend callback (dev)
      'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback', // Backend callback (prod)
      'https://spark-frontend-production.up.railway.app/integrations/callback' // Frontend callback (prod)
    ];
    
    const state = JSON.stringify({ 
      integrationId: integration._id.toString(),
      userId: 'test_user_id'
    });
    
    redirectUrisToTest.forEach(redirectUri => {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(state)}`;
        
      console.log(`\nRedirect URI: ${redirectUri}`);
      console.log(`Authorization URL: ${authUrl.split('?')[0]}?${authUrl.split('?')[1].substring(0, 100)}...`);
    });
    
    console.log('\n=== GOOGLE CONSOLE CONFIGURATION ===');
    console.log('Make sure these redirect URIs are registered in your Google OAuth app:');
    redirectUrisToTest.forEach(uri => {
      console.log(`  - ${uri}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error debugging frontend redirect URI:', error.message);
    process.exit(1);
  }
};

debugFrontendRedirectUri();