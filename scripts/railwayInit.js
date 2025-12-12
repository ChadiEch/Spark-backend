// Railway-specific initialization script
// This script is designed to run during Railway deployment to ensure
// integrations are properly configured with environment variables

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

// Railway initialization
const railwayInit = async () => {
  try {
    console.log('=== RAILWAY DEPLOYMENT INITIALIZATION ===\n');
    
    // Only run in Railway environment
    if (!process.env.RAILWAY_ENVIRONMENT) {
      console.log('Not running in Railway environment, skipping initialization...');
      process.exit(0);
    }
    
    await connectDB();
    
    console.log('Railway environment detected, initializing integrations...\n');
    
    // Check if integrations exist
    const integrationCount = await Integration.countDocuments();
    console.log(`Found ${integrationCount} existing integrations.`);
    
    if (integrationCount === 0) {
      console.log('No integrations found, creating default configurations...');
      
      // Define clean integration templates
      const integrations = [
        {
          name: 'Google Drive',
          key: 'google-drive',
          category: 'storage',
          description: 'Connect to Google Drive for file storage and management',
          icon: 'google-drive',
          redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
          scopes: ['https://www.googleapis.com/auth/drive'],
          clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || 'your_google_drive_client_id',
          clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'your_google_drive_client_secret',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'YouTube',
          key: 'youtube',
          category: 'social',
          description: 'Connect to YouTube for video management',
          icon: 'youtube',
          redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
          scopes: ['https://www.googleapis.com/auth/youtube'],
          clientId: process.env.YOUTUBE_CLIENT_ID || 'your_youtube_client_id',
          clientSecret: process.env.YOUTUBE_CLIENT_SECRET || 'your_youtube_client_secret',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Facebook',
          key: 'facebook',
          category: 'social',
          description: 'Connect to Facebook for social media management',
          icon: 'facebook',
          redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
          scopes: ['pages_manage_posts', 'pages_read_engagement'],
          clientId: process.env.FACEBOOK_APP_ID || 'your_facebook_app_id',
          clientSecret: process.env.FACEBOOK_APP_SECRET || 'your_facebook_app_secret',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Instagram',
          key: 'instagram',
          category: 'social',
          description: 'Connect to Instagram for social media management',
          icon: 'instagram',
          redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
          scopes: ['instagram_basic', 'instagram_content_publish'],
          clientId: process.env.INSTAGRAM_APP_ID || 'your_instagram_app_id',
          clientSecret: process.env.INSTAGRAM_APP_SECRET || 'your_instagram_app_secret',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      console.log('Creating clean integration configurations...\n');
      
      for (const integrationData of integrations) {
        console.log(`Creating ${integrationData.name} integration...`);
        
        const integration = new Integration(integrationData);
        await integration.save();
        
        console.log(`✅ Created ${integration.name} with ID: ${integration._id}\n`);
      }
      
      console.log('✅ All integrations created successfully!');
    } else {
      console.log('Integrations already exist, updating with environment variables...\n');
      
      // Update existing integrations with environment variables if available
      const updates = [
        {
          key: 'google-drive',
          clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET
        },
        {
          key: 'youtube',
          clientId: process.env.YOUTUBE_CLIENT_ID,
          clientSecret: process.env.YOUTUBE_CLIENT_SECRET
        },
        {
          key: 'facebook',
          clientId: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET
        },
        {
          key: 'instagram',
          clientId: process.env.INSTAGRAM_APP_ID,
          clientSecret: process.env.INSTAGRAM_APP_SECRET
        }
      ];
      
      for (const update of updates) {
        if (update.clientId && update.clientSecret) {
          const result = await Integration.updateOne(
            { key: update.key },
            {
              clientId: update.clientId,
              clientSecret: update.clientSecret,
              updatedAt: new Date()
            }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`✅ Updated ${update.key} with environment variables`);
          }
        }
      }
    }
    
    // Verify all integrations have correct redirect URIs
    console.log('\n=== VERIFYING REDIRECT URIS ===');
    const expectedRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    
    const result = await Integration.updateMany(
      { redirectUri: { $ne: expectedRedirectUri } },
      { redirectUri: expectedRedirectUri, updatedAt: new Date() }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Updated ${result.modifiedCount} integrations with correct redirect URI`);
    } else {
      console.log('✅ All integrations already have correct redirect URIs');
    }
    
    // Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    const allIntegrations = await Integration.find({});
    allIntegrations.forEach(integration => {
      console.log(`${integration.name}:`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Has credentials: ${!!(integration.clientId && integration.clientSecret)}`);
      console.log(`  Active: ${integration.isActive}\n`);
    });
    
    console.log('=== RAILWAY INITIALIZATION COMPLETE ===');
    console.log('✅ All integrations are properly configured for Railway deployment!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during Railway initialization:', error.message);
    process.exit(1);
  }
};

railwayInit();