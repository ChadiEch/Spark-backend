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

// Integration data
const integrations = [
  {
    name: 'Instagram',
    description: 'Connect your Instagram Business account',
    key: 'instagram',
    icon: 'instagram',
    category: 'social',
    clientId: 'YOUR_INSTAGRAM_CLIENT_ID',
    clientSecret: 'YOUR_INSTAGRAM_CLIENT_SECRET',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['pages_show_list', 'instagram_basic', 'instagram_content_publish', 'pages_manage_posts'],
    enabled: true
  },
  {
    name: 'Facebook',
    description: 'Manage Facebook Pages and ads',
    key: 'facebook',
    icon: 'facebook',
    category: 'social',
    clientId: 'YOUR_FACEBOOK_CLIENT_ID',
    clientSecret: 'YOUR_FACEBOOK_CLIENT_SECRET',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'],
    enabled: true
  },
  {
    name: 'TikTok',
    description: 'Schedule and publish TikTok videos',
    key: 'tiktok',
    icon: 'tiktok',
    category: 'social',
    clientId: 'YOUR_TIKTOK_CLIENT_KEY',
    clientSecret: 'YOUR_TIKTOK_CLIENT_SECRET',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['user.info.basic', 'video.list', 'video.upload'],
    enabled: true
  },
  {
    name: 'YouTube',
    description: 'Upload and manage YouTube content',
    key: 'youtube',
    icon: 'youtube',
    category: 'social',
    clientId: 'YOUR_YOUTUBE_CLIENT_ID',
    clientSecret: 'YOUR_YOUTUBE_CLIENT_SECRET',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'],
    enabled: true
  },
  {
    name: 'Google Drive',
    description: 'Connect your Google Drive for file storage and sharing',
    key: 'google-drive',
    icon: 'google-drive',
    category: 'storage',
    clientId: 'YOUR_GOOGLE_DRIVE_CLIENT_ID',
    clientSecret: 'YOUR_GOOGLE_DRIVE_CLIENT_SECRET',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    enabled: true
  }
];

// Initialize integrations
const initializeIntegrations = async () => {
  try {
    await connectDB();
    
    // Check if integrations already exist
    const existingIntegrations = await Integration.find({});
    
    if (existingIntegrations.length > 0) {
      console.log('Integrations already exist in the database');
      process.exit(0);
    }
    
    // Create integrations
    await Integration.create(integrations);
    console.log('Integrations initialized successfully');
    
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

initializeIntegrations();