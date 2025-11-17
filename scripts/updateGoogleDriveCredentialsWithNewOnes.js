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
// Replace the placeholders with your actual new credentials
const updateGoogleDriveCredentials = async () => {
  try {
    await connectDB();
    
    // IMPORTANT: Replace these with your actual new Google OAuth credentials
    const NEW_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || 'REPLACE_WITH_YOUR_NEW_CLIENT_ID';
    const NEW_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'REPLACE_WITH_YOUR_NEW_CLIENT_SECRET';
    
    console.log('=== UPDATING GOOGLE DRIVE CREDENTIALS ===');
    console.log('Current credentials will be replaced with:');
    console.log('Client ID:', NEW_CLIENT_ID);
    console.log('Client Secret:', NEW_CLIENT_SECRET ? 'PRESENT' : 'MISSING');
    console.log('');
    
    // Update the Google Drive integration with new credentials
    const result = await Integration.updateOne(
      { key: 'google-drive' },
      {
        $set: {
          clientId: NEW_CLIENT_ID,
          clientSecret: NEW_CLIENT_SECRET,
          redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
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
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating Google Drive integration:', error.message);
    process.exit(1);
  }
};

updateGoogleDriveCredentials();