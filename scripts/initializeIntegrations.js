#!/usr/bin/env node

/**
 * Script to initialize integrations collection with default integrations
 * Usage: node initializeIntegrations.js
 */

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
    console.log('MONGO_URI:', process.env.MONGO_URI);
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
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
    await connectDB();
    
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
        redirectUri: 'http://localhost:5001/api/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'Facebook',
        description: 'Manage Facebook Pages and ads',
        key: 'facebook',
        icon: 'facebook',
        category: 'social',
        clientId: process.env.FACEBOOK_CLIENT_ID || 'facebook_client_id',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || 'facebook_client_secret',
        redirectUri: 'http://localhost:5001/api/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'TikTok',
        description: 'Schedule and publish TikTok videos',
        key: 'tiktok',
        icon: 'tiktok',
        category: 'social',
        clientId: process.env.TIKTOK_CLIENT_KEY || 'tiktok_client_key',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'tiktok_client_secret',
        redirectUri: 'http://localhost:5001/api/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'YouTube',
        description: 'Upload and manage YouTube content',
        key: 'youtube',
        icon: 'youtube',
        category: 'social',
        clientId: process.env.YOUTUBE_CLIENT_ID || 'youtube_client_id',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || 'youtube_client_secret',
        redirectUri: 'http://localhost:5001/api/integrations/callback',
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
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || 'google_drive_client_id',
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'google_drive_client_secret',
        redirectUri: 'http://localhost:5001/api/integrations/callback',
        scopes: [
          'https://www.googleapis.com/auth/drive'
        ],
        enabled: true
      }
    ];
    
    // Remove existing integrations
    await Integration.deleteMany({});
    
    // Insert the default integrations
    const integrations = await Integration.insertMany(defaultIntegrations);
    
    console.log('Integrations collection initialized successfully');
    console.log(`Inserted ${integrations.length} integrations:`);
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key}): ${integration.redirectUri}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing integrations collection:', error.message);
    process.exit(1);
  }
};

initializeIntegrations();