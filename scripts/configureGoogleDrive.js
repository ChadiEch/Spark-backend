// Script to properly configure Google Drive integration
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

// Configure Google Drive with proper credentials
const configureGoogleDrive = async () => {
  try {
    await connectDB();
    
    console.log('=== CONFIGURING GOOGLE DRIVE INTEGRATION ===\n');
    
    // Find Google Drive integration
    const integration = await Integration.findOne({ key: 'google-drive' });
    
    if (!integration) {
      console.log('❌ Google Drive integration not found!');
      console.log('Run resetAndRebuildIntegrations.js first to create integrations.');
      process.exit(1);
    }
    
    console.log('Found Google Drive integration:');
    console.log(`Name: ${integration.name}`);
    console.log(`Key: ${integration.key}`);
    console.log(`Current Redirect URI: ${integration.redirectUri}`);
    console.log(`Current Client ID: ${integration.clientId ? `${integration.clientId.substring(0, 20)}...` : 'Not set'}`);
    console.log(`Current Client Secret: ${integration.clientSecret ? 'Set (hidden)' : 'Not set'}`);
    
    // Check if we have real credentials in environment variables
    const googleClientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    
    if (!googleClientId || !googleClientSecret) {
      console.log('\n⚠️  Google Drive credentials not found in environment variables.');
      console.log('Please add the following to your .env file:');
      console.log('GOOGLE_DRIVE_CLIENT_ID=your_actual_client_id');
      console.log('GOOGLE_DRIVE_CLIENT_SECRET=your_actual_client_secret');
      console.log('\nOr run updateIntegrationCredentials.js to enter them manually.');
      process.exit(0);
    }
    
    // Update with real credentials
    console.log('\n=== UPDATING WITH REAL CREDENTIALS ===');
    console.log('Updating Google Drive integration with real credentials...');
    
    const updatedIntegration = await Integration.findByIdAndUpdate(
      integration._id,
      {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        isActive: true,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log('\n✅ Google Drive integration updated successfully!');
    console.log(`Name: ${updatedIntegration.name}`);
    console.log(`Active: ${updatedIntegration.isActive}`);
    console.log(`Redirect URI: ${updatedIntegration.redirectUri}`);
    console.log(`Client ID: ${updatedIntegration.clientId ? `${updatedIntegration.clientId.substring(0, 20)}...` : 'Not set'}`);
    console.log('Client Secret: Set (hidden for security)');
    
    // Verify redirect URI is correct
    const expectedRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    if (updatedIntegration.redirectUri === expectedRedirectUri) {
      console.log('✅ Redirect URI is correctly configured');
    } else {
      console.log('❌ Redirect URI mismatch!');
      console.log(`Expected: ${expectedRedirectUri}`);
      console.log(`Actual: ${updatedIntegration.redirectUri}`);
    }
    
    // Generate a sample OAuth URL for testing
    console.log('\n=== SAMPLE OAUTH URL FOR TESTING ===');
    const state = JSON.stringify({ 
      integrationId: updatedIntegration._id.toString(),
      userId: 'sample_user_id_for_testing'
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${updatedIntegration.clientId}&` +
      `redirect_uri=${encodeURIComponent(updatedIntegration.redirectUri)}&` +
      `scope=${encodeURIComponent(updatedIntegration.scopes.join(' '))}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;
      
    console.log('Use this URL to test Google Drive OAuth:');
    console.log('(Copy and paste this into your browser)');
    console.log('--------------------------------------------------');
    console.log(authUrl);
    console.log('--------------------------------------------------');
    
    // Instructions for Google Cloud Console
    console.log('\n=== GOOGLE CLOUD CONSOLE VERIFICATION ===');
    console.log('Ensure your Google OAuth client is configured with:');
    console.log('1. Authorized redirect URI:');
    console.log(`   ${expectedRedirectUri}`);
    console.log('2. APIs enabled:');
    console.log('   - Google Drive API');
    console.log('3. OAuth consent screen configured with scopes:');
    console.log('   - https://www.googleapis.com/auth/drive');
    console.log('4. If in testing mode, add your email as a test user');
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Restart your backend server');
    console.log('2. Test the Google Drive connection in your app');
    console.log('3. Check logs for any OAuth-related errors');
    
    console.log('\n✅ Google Drive integration is ready for use!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error configuring Google Drive:', error.message);
    process.exit(1);
  }
};

configureGoogleDrive();