const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to database
const connectDB = require('../config/db');
connectDB();

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
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
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
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
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
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: ['read', 'write'],
    enabled: true
  },
  {
    name: 'YouTube',
    description: 'Upload and manage YouTube content',
    key: 'youtube',
    icon: 'youtube',
    category: 'social',
    clientId: '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
    clientSecret: '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',
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload'
    ],
    enabled: true
  },
  {
    name: 'Google Drive',
    description: 'Connect your Google Drive for file storage and sharing',
    key: 'google-drive',
    icon: 'google-drive',
    category: 'storage',
    clientId: '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
    clientSecret: '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',
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: [
      'https://www.googleapis.com/auth/drive'
    ],
    enabled: true
  }
];

// Seed integrations
const seedIntegrations = async () => {
  try {
    // Check if database is connected
    if (!mongoose.connection.readyState) {
      console.error('Database not connected. Please ensure MongoDB is running.');
      process.exit(1);
    }
    
    console.log('Database connected successfully');
    
    // Clear existing integrations
    await Integration.deleteMany({});
    console.log('Cleared existing integrations');

    // Insert new integrations
    await Integration.insertMany(integrations);
    console.log('Inserted new integrations');

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding integrations:', error);
    process.exit(1);
  }
};

// Run the seed function
seedIntegrations();