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

// Update Google Drive with new credentials
const updateGoogleDriveWithNewCredentials = async () => {
  try {
    await connectDB();
    
    // You need to replace these with your actual new Google OAuth credentials
    const NEW_CLIENT_ID = 'YOUR_NEW_GOOGLE_CLIENT_ID_HERE';
    const NEW_CLIENT_SECRET = 'YOUR_NEW_GOOGLE_CLIENT_SECRET_HERE';
    
    // Use the production frontend URL for redirect URI
    const REDIRECT_URI = 'https://spark-frontend-production.up.railway.app/integrations/callback';
    
    console.log('=== UPDATING GOOGLE DRIVE CREDENTIALS ===');
    console.log('Current credentials will be replaced with:');
    console.log('Client ID:', NEW_CLIENT_ID);
    console.log('Client Secret:', NEW_CLIENT_SECRET ? 'PRESENT' : 'MISSING');
    console.log('Redirect URI:', REDIRECT_URI);
    console.log('');
    
    // Update the Google Drive integration with new credentials
    const result = await Integration.updateOne(
      { key: 'google-drive' },
      {
        $set: {
          clientId: NEW_CLIENT_ID,
          clientSecret: NEW_CLIENT_SECRET,
          redirectUri: REDIRECT_URI,
          scopes: ['https://www.googleapis.com/auth/drive']
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('SUCCESS: Google Drive integration updated with new credentials');
    } else {
      console.log('No changes made - check if the integration exists');
    }
    
    // Verify the update
    const integration = await Integration.findOne({ key: 'google-drive' });
    if (integration) {
      console.log('\nUpdated Google Drive Integration Details:');
      console.log('======================================');
      console.log('ID:', integration._id);
      console.log('Name:', integration.name);
      console.log('Key:', integration.key);
      console.log('Client ID:', integration.clientId);
      console.log('Redirect URI:', integration.redirectUri);
      console.log('Scopes:', integration.scopes);
      console.log('Enabled:', integration.enabled);
    }
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Make sure to add "' + REDIRECT_URI + '" as an authorized redirect URI in your Google OAuth Console');
    console.log('2. Test the OAuth flow again');
    console.log('3. If you still have issues, check that the client is not in "Testing" mode and has been published if needed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating Google Drive integration:', error.message);
    process.exit(1);
  }
};

// Check if credentials are provided as environment variables
if (process.env.NEW_GOOGLE_DRIVE_CLIENT_ID && process.env.NEW_GOOGLE_DRIVE_CLIENT_SECRET) {
  updateGoogleDriveWithNewCredentials();
} else {
  console.log('=== GOOGLE DRIVE CREDENTIALS UPDATE SCRIPT ===');
  console.log('');
  console.log('To use this script, you need to:');
  console.log('1. Create a new Google OAuth client ID in the Google Cloud Console');
  console.log('2. Set the following environment variables:');
  console.log('   NEW_GOOGLE_DRIVE_CLIENT_ID=your_new_client_id');
  console.log('   NEW_GOOGLE_DRIVE_CLIENT_SECRET=your_new_client_secret');
  console.log('3. Run the script again');
  console.log('');
  console.log('Alternatively, you can edit this script and replace the placeholder values directly.');
  console.log('');
  console.log('=== INSTRUCTIONS FOR CREATING GOOGLE OAUTH CREDENTIALS ===');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Select or create a project');
  console.log('3. Enable the Google Drive API for your project');
  console.log('4. Go to "APIs & Services" > "Credentials"');
  console.log('5. Click "Create Credentials" > "OAuth client ID"');
  console.log('6. Choose "Web application" as the application type');
  console.log('7. Add "https://spark-frontend-production.up.railway.app/integrations/callback" to "Authorized redirect URIs"');
  console.log('8. Click "Create"');
  console.log('9. Copy the Client ID and Client Secret');
  console.log('10. Use them to update the database with this script');
  
  process.exit(0);
}