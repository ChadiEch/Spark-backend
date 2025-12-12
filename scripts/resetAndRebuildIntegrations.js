// Script to completely reset and rebuild all integrations from scratch
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

// Reset all integrations
const resetIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('=== RESET AND REBUILD INTEGRATIONS ===\n');
    
    // Count existing integrations
    const count = await Integration.countDocuments();
    console.log(`Found ${count} existing integrations.`);
    
    if (count > 0) {
      console.log('Deleting all existing integrations...');
      const result = await Integration.deleteMany({});
      console.log(`Deleted ${result.deletedCount} integrations.`);
    } else {
      console.log('No existing integrations found.');
    }
    
    console.log('\n=== CREATING CLEAN INTEGRATION CONFIGURATIONS ===');
    
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
        clientId: 'your_google_drive_client_id',
        clientSecret: 'your_google_drive_client_secret',
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
        clientId: 'your_youtube_client_id',
        clientSecret: 'your_youtube_client_secret',
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
        clientId: 'your_facebook_app_id',
        clientSecret: 'your_facebook_app_secret',
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
        clientId: 'your_instagram_app_id',
        clientSecret: 'your_instagram_app_secret',
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
      
      console.log(`✅ Created ${integration.name} with ID: ${integration._id}`);
      console.log(`   Redirect URI: ${integration.redirectUri}`);
      console.log(`   Scopes: ${integration.scopes.join(', ')}\n`);
    }
    
    // Verify the creations
    const totalCount = await Integration.countDocuments();
    console.log(`\n=== VERIFICATION ===`);
    console.log(`Total integrations in database: ${totalCount}`);
    
    if (totalCount === integrations.length) {
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
      console.log(`  Active: ${integration.isActive}\n`);
    });
    
    console.log('=== RESET COMPLETE ===');
    console.log('All integrations have been reset and rebuilt with clean configurations.');
    
    // Provide next steps
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Update each integration with your actual OAuth credentials:');
    console.log('   - Google Drive: Add your Google OAuth Client ID and Secret');
    console.log('   - YouTube: Add your Google OAuth Client ID and Secret');
    console.log('   - Facebook: Add your Facebook App ID and Secret');
    console.log('   - Instagram: Add your Facebook App ID and Secret (Instagram uses Facebook Login)');
    
    console.log('\n2. For Google integrations, ensure your OAuth client is configured with:');
    console.log('   Authorized redirect URI: https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
    
    console.log('\n3. For Facebook/Instagram integrations, ensure your Facebook App is configured with:');
    console.log('   Valid OAuth Redirect URIs: https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
    
    console.log('\n4. Restart your backend server to load the new configurations');
    
    console.log('\n✅ Integration reset and rebuild completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting integrations:', error.message);
    process.exit(1);
  }
};

resetIntegrations();