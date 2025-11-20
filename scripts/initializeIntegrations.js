#!/usr/bin/env node

// Script to initialize the integrations collection in MongoDB
// This script can be run directly to populate the database with default integrations

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env' });

// Import models
const Integration = require('../models/Integration');

// Define the default integrations
const defaultIntegrations = [
  {
    name: 'Instagram',
    description: 'Connect your Instagram Business account',
    key: 'instagram',
    icon: 'instagram',
    category: 'social',
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
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
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
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
    clientId: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
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
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
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
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    scopes: [
      'https://www.googleapis.com/auth/drive'
    ],
    enabled: true
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI environment variable is not set');
      process.exit(1);
    }
    
    console.log(`MONGO_URI: ${process.env.MONGO_URI.substring(0, 30)}...`); // Log first 30 chars for debugging
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 10000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Initialize integrations
const initializeIntegrations = async () => {
  try {
    console.log('Starting integration initialization...');
    // Connect to database
    await connectDB();
    
    console.log('Removing existing integrations...');
    // Remove existing integrations
    await Integration.deleteMany({});
    console.log('Existing integrations removed');
    
    console.log('Inserting default integrations...');
    // Insert the default integrations
    const integrations = await Integration.insertMany(defaultIntegrations);
    console.log(`Successfully initialized ${integrations.length} integrations:`);
    
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key})`);
    });
    
    console.log('Closing database connection...');
    // Close the connection
    mongoose.connection.close();
    console.log('Database connection closed');
    
    console.log('Initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing integrations:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Run the initialization
initializeIntegrations();