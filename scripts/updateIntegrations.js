const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Integration data with actual credentials - REPLACE THESE WITH YOUR ACTUAL CREDENTIALS
const integrationUpdates = [
  {
    key: 'instagram',
    clientId: process.env.INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'YOUR_INSTAGRAM_CLIENT_SECRET',
    scopes: ['pages_show_list', 'instagram_basic', 'instagram_content_publish', 'pages_manage_posts']
  },
  {
    key: 'facebook',
    clientId: process.env.FACEBOOK_CLIENT_ID || '2302564490171864',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || 'YOUR_FACEBOOK_CLIENT_SECRET',
    scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement']
  },
  {
    key: 'tiktok',
    clientId: process.env.TIKTOK_CLIENT_KEY || 'YOUR_TIKTOK_CLIENT_KEY',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'YOUR_TIKTOK_CLIENT_SECRET',
    scopes: ['user.info.basic', 'video.list', 'video.upload']
  },
  {
    key: 'youtube',
    clientId: process.env.YOUTUBE_CLIENT_ID || '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || 'YOUR_YOUTUBE_CLIENT_SECRET',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube']
  },
  {
    key: 'google-drive',
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'YOUR_GOOGLE_DRIVE_CLIENT_SECRET',
    scopes: ['https://www.googleapis.com/auth/drive.file']
  }
];

// Update integrations
const updateIntegrations = async () => {
  try {
    await connectDB();
    
    for (const update of integrationUpdates) {
      const integration = await Integration.findOne({ key: update.key });
      
      if (integration) {
        // Update the integration with new credentials
        integration.clientId = update.clientId;
        integration.clientSecret = update.clientSecret;
        integration.scopes = update.scopes;
        
        await integration.save();
        console.log(`Updated ${update.key} integration`);
      } else {
        console.log(`Integration with key ${update.key} not found`);
      }
    }
    
    console.log('Integration updates completed');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

updateIntegrations();