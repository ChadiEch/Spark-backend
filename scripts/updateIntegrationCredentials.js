// Script to update integration credentials
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const Integration = require('../models/Integration');

// Create interface for reading user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// Function to ask user for input
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Update integration credentials
const updateCredentials = async () => {
  try {
    await connectDB();
    
    console.log('=== UPDATE INTEGRATION CREDENTIALS ===\n');
    
    // Get all integrations
    const integrations = await Integration.find({});
    
    if (integrations.length === 0) {
      console.log('No integrations found. Please run the resetAndRebuildIntegrations.js script first.');
      process.exit(1);
    }
    
    console.log('Found the following integrations:');
    integrations.forEach((integration, index) => {
      console.log(`${index + 1}. ${integration.name} (${integration.key})`);
    });
    
    console.log('\n=== UPDATING CREDENTIALS ===');
    
    for (const integration of integrations) {
      console.log(`\n--- Updating ${integration.name} ---`);
      
      // Skip if this is a local/test environment and user doesn't have real credentials
      const skip = await askQuestion(`Do you have real credentials for ${integration.name}? (y/n): `);
      
      if (skip.toLowerCase() !== 'y') {
        console.log(`Skipping ${integration.name}...`);
        continue;
      }
      
      // Ask for client ID and secret
      const clientId = await askQuestion(`Enter Client ID for ${integration.name}: `);
      const clientSecret = await askQuestion(`Enter Client Secret for ${integration.name}: `);
      
      // Update the integration
      const updatedIntegration = await Integration.findByIdAndUpdate(
        integration._id,
        {
          clientId: clientId,
          clientSecret: clientSecret,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      console.log(`✅ Updated ${updatedIntegration.name} with new credentials`);
    }
    
    console.log('\n=== VERIFICATION ===');
    const updatedIntegrations = await Integration.find({});
    updatedIntegrations.forEach(integration => {
      console.log(`${integration.name}:`);
      console.log(`  Client ID: ${integration.clientId ? integration.clientId.substring(0, 10) + '...' : 'NOT SET'}`);
      console.log(`  Client Secret: ${integration.clientSecret ? 'SET (hidden)' : 'NOT SET'}\n`);
    });
    
    console.log('=== CREDENTIAL UPDATE COMPLETE ===');
    console.log('All integrations have been updated with your credentials.');
    console.log('Remember to restart your backend server to load the new configurations.');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('Error updating credentials:', error.message);
    rl.close();
    process.exit(1);
  }
};

updateCredentials();