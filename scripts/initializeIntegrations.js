// Script to initialize default integrations
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

// Initialize default integrations
const initializeIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('=== INITIALIZING DEFAULT INTEGRATIONS ===\n');
    
    // Define default integrations
    const defaultIntegrations = [
      {
        name: 'Google Drive',
        key: 'google-drive',
        category: 'storage',
        description: 'Connect to Google Drive for file storage and management',
        icon: 'google-drive',
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || 'your_google_drive_client_id',
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'your_google_drive_client_secret',
        redirectUri: process.env.FRONTEND_URL ? 
          `${process.env.FRONTEND_URL.replace('/api', '')}/api/integrations/callback` : 
          'http://localhost:5001/api/integrations/callback',
        scopes: ['https://www.googleapis.com/auth/drive'],
        enabled: true
      },
      {
        name: 'YouTube',
        key: 'youtube',
        category: 'social',
        description: 'Connect to YouTube for video management',
        icon: 'youtube',
        clientId: process.env.YOUTUBE_CLIENT_ID || 'your_youtube_client_id',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || 'your_youtube_client_secret',
        redirectUri: process.env.FRONTEND_URL ? 
          `${process.env.FRONTEND_URL.replace('/api', '')}/api/integrations/callback` : 
          'http://localhost:5001/api/integrations/callback',
        scopes: ['https://www.googleapis.com/auth/youtube'],
        enabled: true
      },
      {
        name: 'Facebook',
        key: 'facebook',
        category: 'social',
        description: 'Connect to Facebook for social media management',
        icon: 'facebook',
        clientId: process.env.FACEBOOK_APP_ID || 'your_facebook_app_id',
        clientSecret: process.env.FACEBOOK_APP_SECRET || 'your_facebook_app_secret',
        redirectUri: process.env.FRONTEND_URL ? 
          `${process.env.FRONTEND_URL.replace('/api', '')}/api/integrations/callback` : 
          'http://localhost:5001/api/integrations/callback',
        scopes: ['pages_manage_posts', 'pages_read_engagement'],
        enabled: true
      },
      {
        name: 'Instagram',
        key: 'instagram',
        category: 'social',
        description: 'Connect to Instagram for social media management',
        icon: 'instagram',
        clientId: process.env.INSTAGRAM_APP_ID || 'your_instagram_app_id',
        clientSecret: process.env.INSTAGRAM_APP_SECRET || 'your_instagram_app_secret',
        redirectUri: process.env.FRONTEND_URL ? 
          `${process.env.FRONTEND_URL.replace('/api', '')}/api/integrations/callback` : 
          'http://localhost:5001/api/integrations/callback',
        scopes: ['instagram_basic', 'instagram_content_publish'],
        enabled: true
      }
    ];
    
    // Check if integrations already exist
    const existingCount = await Integration.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing integrations. Skipping initialization.`);
      process.exit(0);
    }
    
    console.log('Creating default integrations...\n');
    
    // Create integrations
    for (const integrationData of defaultIntegrations) {
      console.log(`Creating ${integrationData.name} integration...`);
      
      const integration = new Integration(integrationData);
      await integration.save();
      
      console.log(`✅ Created ${integration.name} with ID: ${integration._id}`);
      console.log(`   Redirect URI: ${integration.redirectUri}`);
      console.log(`   Scopes: ${integration.scopes.join(', ')}\n`);
    }
    
    // Verify creation
    const totalCount = await Integration.countDocuments();
    console.log(`\n=== VERIFICATION ===`);
    console.log(`Total integrations in database: ${totalCount}`);
    
    if (totalCount === defaultIntegrations.length) {
      console.log('✅ All integrations created successfully');
    } else {
      console.log('❌ Warning: Integration count mismatch');
    }
    
    // Display all created integrations
    const allIntegrations = await Integration.find({}, { clientId: 0, clientSecret: 0 }); // Exclude sensitive fields
    console.log('\n=== CREATED INTEGRATIONS ===');
    allIntegrations.forEach(integration => {
      console.log(`${integration.name} (${integration.key})`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Scopes: ${integration.scopes.join(', ')}`);
      console.log(`  Active: ${integration.enabled}\n`);
    });
    
    console.log('=== INITIALIZATION COMPLETE ===');
    console.log('Default integrations have been initialized.');
    console.log('\nNext steps:');
    console.log('1. Update each integration with your actual OAuth credentials');
    console.log('2. Restart your backend server to load the new configurations');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing integrations:', error.message);
    process.exit(1);
  }
};

initializeIntegrations();