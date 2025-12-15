// Script to completely purge all integration data from the database
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

// Purge all integrations
const purgeIntegrations = async () => {
  try {
    await connectDB();
    
    console.log('=== PURGING ALL INTEGRATION DATA ===\n');
    
    // Count existing integrations
    const count = await Integration.countDocuments();
    console.log(`Found ${count} existing integrations.`);
    
    if (count > 0) {
      console.log('Deleting all integrations...');
      const result = await Integration.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} integrations.`);
    } else {
      console.log('✅ No integrations found to delete.');
    }
    
    // Verify deletion
    const remainingCount = await Integration.countDocuments();
    console.log(`\nRemaining integrations: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('✅ All integrations successfully purged from database!');
    } else {
      console.log('❌ Warning: Some integrations may still remain.');
    }
    
    console.log('\n=== DATABASE PURGE COMPLETE ===');
    
    process.exit(0);
  } catch (error) {
    console.error('Error purging integrations:', error.message);
    process.exit(1);
  }
};

purgeIntegrations();