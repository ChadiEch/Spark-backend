// Test script to verify initialization process
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const Integration = require('../models/Integration');

console.log('=== TESTING INITIALIZATION PROCESS ===\n');

// Test database connection
const testDBConnection = async () => {
  try {
    console.log('Testing database connection...');
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ Database Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    return null;
  }
};

// Test integration count
const testIntegrationCount = async () => {
  try {
    console.log('\nChecking integration count...');
    const count = await Integration.countDocuments({});
    console.log(`✅ Found ${count} integrations`);
    return count;
  } catch (error) {
    console.error('❌ Error counting integrations:', error.message);
    return -1;
  }
};

// Main test function
const runTests = async () => {
  try {
    // Test database connection
    const conn = await testDBConnection();
    if (!conn) {
      console.log('\n❌ Cannot proceed with tests without database connection');
      process.exit(1);
    }
    
    // Test integration count
    const count = await testIntegrationCount();
    
    if (count === 0) {
      console.log('\n⚠️  No integrations found - initialization needed');
    } else if (count > 0) {
      console.log('\n✅ Integrations already exist');
      
      // Show sample integration
      const sampleIntegration = await Integration.findOne({});
      console.log(`\nSample integration: ${sampleIntegration.name} (${sampleIntegration.key})`);
      console.log(`Redirect URI: ${sampleIntegration.redirectUri}`);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

runTests();