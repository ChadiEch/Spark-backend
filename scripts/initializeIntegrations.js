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
    clientId: process.env.INSTAGRAM_CLIENT_ID || 'instagram_client_id',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'instagram_client_secret',
    redirectUri: 'http://localhost:5173/integrations/callback',
    scopes: ['read', 'write'],
    enabled: true
  },
  {
    name: 'Facebook',
    description: 'Manage Facebook Pages and ads',
    key: 'facebook',
    icon: 'facebook',
    category: 'social',
    clientId: process.env.FACEBOOK_CLIENT_ID || '2302564490171864',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '46f1bebd6df4f4f8a3171e36e81c8981',
    redirectUri: 'http://localhost:5173/integrations/callback',
    scopes: ['read', 'write'],
    enabled: true
  },
  {
    name: 'TikTok',
    description: 'Schedule and publish TikTok videos',
    key: 'tiktok',
    icon: 'tiktok',
    category: 'social',
    clientId: process.env.TIKTOK_CLIENT_KEY || 'tiktok_client_id',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'tiktok_client_secret',
    redirectUri: 'http://localhost:5173/integrations/callback',
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
    redirectUri: 'http://localhost:8080/integrations/callback',
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
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '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',
    redirectUri: 'http://localhost:8080/integrations/callback',
    scopes: [
      'https://www.googleapis.com/auth/drive'
    ],
    enabled: true
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
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

// Initialize integrations
const initializeIntegrations = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Remove existing integrations
    await Integration.deleteMany({});
    console.log('Existing integrations removed');
    
    // Insert the default integrations
    const integrations = await Integration.insertMany(defaultIntegrations);
    console.log(`Successfully initialized ${integrations.length} integrations:`);
    
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key})`);
    });
    
    // Close the connection
    mongoose.connection.close();
    console.log('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing integrations:', error.message);
    process.exit(1);
  }
};

// Run the initialization
initializeIntegrations();