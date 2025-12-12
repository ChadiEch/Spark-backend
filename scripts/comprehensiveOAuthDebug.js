// Comprehensive OAuth debugging script
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

// Comprehensive OAuth debugging
const comprehensiveOAuthDebug = async () => {
  try {
    await connectDB();
    
    console.log('\n=== DATABASE INTEGRATIONS ===');
    const integrations = await Integration.find({});
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key}):`);
      console.log(`  Redirect URI: ${integration.redirectUri}`);
      console.log(`  Client ID: ${integration.clientId ? 'SET' : 'NOT SET'}`);
      console.log(`  Enabled: ${integration.enabled}`);
      console.log('');
    });
    
    console.log('=== GOOGLE DRIVE INTEGRATION DETAILS ===');
    const googleDriveIntegration = await Integration.findOne({ key: 'google-drive' });
    
    if (!googleDriveIntegration) {
      console.error('Google Drive integration not found!');
      process.exit(1);
    }
    
    console.log(`Name: ${googleDriveIntegration.name}`);
    console.log(`Key: ${googleDriveIntegration.key}`);
    console.log(`Redirect URI: ${googleDriveIntegration.redirectUri}`);
    console.log(`Client ID: ${googleDriveIntegration.clientId ? 'SET' : 'NOT SET'}`);
    
    // Check environment variables
    console.log('\n=== ENVIRONMENT VARIABLES ===');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    console.log(`MONGO_URI: ${process.env.MONGO_URI ? 'SET' : 'NOT SET'}`);
    console.log(`GOOGLE_DRIVE_CLIENT_ID: ${process.env.GOOGLE_DRIVE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET: ${process.env.GOOGLE_DRIVE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
    
    // Verify redirect URI matches Google Console
    const expectedRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
    console.log(`\n=== REDIRECT URI VERIFICATION ===`);
    console.log(`Database redirect URI: ${googleDriveIntegration.redirectUri}`);
    console.log(`Expected redirect URI: ${expectedRedirectUri}`);
    console.log(`Match: ${googleDriveIntegration.redirectUri === expectedRedirectUri}`);
    
    if (googleDriveIntegration.redirectUri !== expectedRedirectUri) {
      console.log('\nWARNING: Redirect URI mismatch detected!');
      console.log('This could cause OAuth errors.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error during comprehensive OAuth debugging:', error.message);
    process.exit(1);
  }
};

comprehensiveOAuthDebug();