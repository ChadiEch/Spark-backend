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
    clientId: 'instagram_client_id',
    clientSecret: 'instagram_client_secret',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['read', 'write'],
    enabled: true
  },
  {
    name: 'Facebook',
    description: 'Manage Facebook Pages and ads',
    key: 'facebook',
    icon: 'facebook',
    category: 'social',
    clientId: 'facebook_client_id',
    clientSecret: 'facebook_client_secret',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['read', 'write'],
    enabled: true
  },
  {
    name: 'TikTok',
    description: 'Schedule and publish TikTok videos',
    key: 'tiktok',
    icon: 'tiktok',
    category: 'social',
    clientId: 'tiktok_client_id',
    clientSecret: 'tiktok_client_secret',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['read', 'write'],
    enabled: true
  },
  {
    name: 'YouTube',
    description: 'Upload and manage YouTube content',
    key: 'youtube',
    icon: 'youtube',
    category: 'social',
    clientId: 'youtube_client_id',
    clientSecret: 'youtube_client_secret',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['read', 'write'],
    enabled: true
  },
  {
    name: 'Google Drive',
    description: 'Connect your Google Drive for file storage and sharing',
    key: 'google-drive',
    icon: 'google-drive',
    category: 'storage',
    clientId: 'google-drive_client_id',
    clientSecret: 'google-drive_client_secret',
    redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
    scopes: ['read', 'write'],
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