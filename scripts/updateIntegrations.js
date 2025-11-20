const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const dotenv = require('dotenv');

// Load environment variables - in Railway, environment variables are already set
// But we'll try to load .env as fallback for local development
try {
  dotenv.config({ path: '.env' });
} catch (e) {
  // Ignore if .env file doesn't exist
}

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
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: ['pages_show_list', 'instagram_basic', 'instagram_content_publish', 'pages_manage_posts']
  },
  {
    key: 'facebook',
    clientId: process.env.FACEBOOK_CLIENT_ID || 'YOUR_FACEBOOK_CLIENT_ID',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || 'YOUR_FACEBOOK_CLIENT_SECRET',
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement']
  },
  {
    key: 'tiktok',
    clientId: process.env.TIKTOK_CLIENT_KEY || 'YOUR_TIKTOK_CLIENT_KEY',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'YOUR_TIKTOK_CLIENT_SECRET',
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: ['user.info.basic', 'video.list', 'video.upload']
  },
  {
    key: 'youtube',
    clientId: process.env.YOUTUBE_CLIENT_ID || 'YOUR_YOUTUBE_CLIENT_ID',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || 'YOUR_YOUTUBE_CLIENT_SECRET',
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube']
  },
  {
    key: 'google-drive',
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || 'YOUR_GOOGLE_DRIVE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'YOUR_GOOGLE_DRIVE_CLIENT_SECRET',
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: ['https://www.googleapis.com/auth/drive.file']
  }
];

// Update integrations
const updateIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('\nEnvironment variables check:');
    console.log('GOOGLE_DRIVE_CLIENT_ID:', process.env.GOOGLE_DRIVE_CLIENT_ID ? `${process.env.GOOGLE_DRIVE_CLIENT_ID.substring(0, 30)}...` : 'MISSING');
    console.log('GOOGLE_DRIVE_CLIENT_SECRET:', process.env.GOOGLE_DRIVE_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID ? `${process.env.YOUTUBE_CLIENT_ID.substring(0, 30)}...` : 'MISSING');
    console.log('YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('FACEBOOK_CLIENT_ID:', process.env.FACEBOOK_CLIENT_ID ? `${process.env.FACEBOOK_CLIENT_ID.substring(0, 30)}...` : 'MISSING');
    console.log('FACEBOOK_CLIENT_SECRET:', process.env.FACEBOOK_CLIENT_SECRET ? 'SET' : 'MISSING');
    
    for (const update of integrationUpdates) {
      const integration = await Integration.findOne({ key: update.key });
      
      if (integration) {
        // Update the integration with new credentials
        integration.clientId = update.clientId;
        integration.clientSecret = update.clientSecret;
        integration.redirectUri = update.redirectUri;
        integration.scopes = update.scopes;
        
        await integration.save();
        console.log(`Updated ${integration.name} integration`);
      } else {
        console.log(`Integration with key ${update.key} not found`);
      }
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
    
    console.log('\nIntegration update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating integrations:', error);
    process.exit(1);
  }
};

// Run the update function
updateIntegrations();