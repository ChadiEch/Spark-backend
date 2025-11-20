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

// Update client credentials for all integrations
const updateClientCredentials = async () => {
  try {
    await connectDB();
    
    console.log('\n=== CURRENT ENVIRONMENT VARIABLES ===');
    console.log('INSTAGRAM_CLIENT_ID:', process.env.INSTAGRAM_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('INSTAGRAM_CLIENT_SECRET:', process.env.INSTAGRAM_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('FACEBOOK_CLIENT_ID:', process.env.FACEBOOK_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('FACEBOOK_CLIENT_SECRET:', process.env.FACEBOOK_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('TIKTOK_CLIENT_KEY:', process.env.TIKTOK_CLIENT_KEY ? 'SET' : 'MISSING');
    console.log('TIKTOK_CLIENT_SECRET:', process.env.TIKTOK_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('GOOGLE_DRIVE_CLIENT_ID:', process.env.GOOGLE_DRIVE_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('GOOGLE_DRIVE_CLIENT_SECRET:', process.env.GOOGLE_DRIVE_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET ? 'SET' : 'MISSING');
    
    // Update Instagram integration
    if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
      const instagramResult = await Integration.updateOne(
        { key: 'instagram' },
        { 
          $set: { 
            clientId: process.env.INSTAGRAM_CLIENT_ID,
            clientSecret: process.env.INSTAGRAM_CLIENT_SECRET
          }
        }
      );
      console.log(`\nInstagram integration updated: ${instagramResult.modifiedCount} document(s) modified`);
    }
    
    // Update Facebook integration
    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      const facebookResult = await Integration.updateOne(
        { key: 'facebook' },
        { 
          $set: { 
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET
          }
        }
      );
      console.log(`Facebook integration updated: ${facebookResult.modifiedCount} document(s) modified`);
    }
    
    // Update TikTok integration
    if (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET) {
      const tiktokResult = await Integration.updateOne(
        { key: 'tiktok' },
        { 
          $set: { 
            clientId: process.env.TIKTOK_CLIENT_KEY,
            clientSecret: process.env.TIKTOK_CLIENT_SECRET
          }
        }
      );
      console.log(`TikTok integration updated: ${tiktokResult.modifiedCount} document(s) modified`);
    }
    
    // Update YouTube integration
    if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET) {
      const youtubeResult = await Integration.updateOne(
        { key: 'youtube' },
        { 
          $set: { 
            clientId: process.env.YOUTUBE_CLIENT_ID,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET
          }
        }
      );
      console.log(`YouTube integration updated: ${youtubeResult.modifiedCount} document(s) modified`);
    }
    
    // Update Google Drive integration
    if (process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
      const googleDriveResult = await Integration.updateOne(
        { key: 'google-drive' },
        { 
          $set: { 
            clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET
          }
        }
      );
      console.log(`Google Drive integration updated: ${googleDriveResult.modifiedCount} document(s) modified`);
    }
    
    // Verify the updates
    console.log('\n=== VERIFICATION ===');
    const integrations = await Integration.find({});
    
    integrations.forEach(integration => {
      console.log(`\n${integration.name} (${integration.key}):`);
      console.log(`  Client ID: ${integration.clientId ? `${integration.clientId.substring(0, 30)}...` : 'MISSING'}`);
      console.log(`  Client Secret Hashed: ${integration.clientSecret ? integration.clientSecret.startsWith('$2a$') : 'MISSING'}`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
    });
    
    console.log('\nClient credentials update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating client credentials:', error);
    process.exit(1);
  }
};

// Run the update function
updateClientCredentials();