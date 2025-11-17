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

// Update Google Drive integration with correct credentials
const updateGoogleDriveCredentials = async () => {
  try {
    await connectDB();
    
    // Update the Google Drive integration with correct credentials
    // You should replace these with your actual Google OAuth credentials
    const result = await Integration.updateOne(
      { key: 'google-drive' },
      {
        $set: {
          clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
          clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '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',
          redirectUri: 'http://localhost:5173/integrations/callback',
          scopes: ['https://www.googleapis.com/auth/drive']
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('Google Drive integration updated successfully');
    } else {
      console.log('No changes made to Google Drive integration');
    }
    
    // Verify the update
    const integration = await Integration.findOne({ key: 'google-drive' });
    console.log('\nUpdated Google Drive Integration Details:');
    console.log('======================================');
    console.log('ID:', integration._id);
    console.log('Name:', integration.name);
    console.log('Key:', integration.key);
    console.log('Client ID:', integration.clientId);
    console.log('Redirect URI:', integration.redirectUri);
    console.log('Scopes:', integration.scopes);
    console.log('Enabled:', integration.enabled);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating Google Drive integration:', error.message);
    process.exit(1);
  }
};

updateGoogleDriveCredentials();