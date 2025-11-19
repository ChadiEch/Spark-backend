#!/usr/bin/env node

/**
 * Script to validate that all required environment variables are set
 * Usage: node validateEnv.js
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Required environment variables
const requiredVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'INSTAGRAM_CLIENT_ID',
  'INSTAGRAM_CLIENT_SECRET',
  'TIKTOK_CLIENT_KEY',
  'TIKTOK_CLIENT_SECRET',
  'GOOGLE_DRIVE_CLIENT_ID',
  'GOOGLE_DRIVE_CLIENT_SECRET',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'TOKEN_ENCRYPTION_KEY'
];

// Optional environment variables (warn if missing)
const optionalVars = [
  'NODE_ENV',
  'PORT',
  'SERVE_FRONTEND',
  'FRONTEND_URL'
];

console.log('Validating environment variables...\n');

let missingRequired = [];
let missingOptional = [];
let invalidVars = [];

// Check required variables
requiredVars.forEach(envVar => {
  if (!process.env[envVar]) {
    missingRequired.push(envVar);
    console.error(`❌ Missing required environment variable: ${envVar}`);
  } else {
    // Additional validation for specific variables
    if (envVar === 'JWT_SECRET' && process.env[envVar].length < 32) {
      invalidVars.push(envVar);
      console.error(`❌ Invalid ${envVar}: JWT_SECRET should be at least 32 characters long`);
    } else if (envVar === 'TOKEN_ENCRYPTION_KEY') {
      try {
        // Try to decode the encryption key
        const keyBuffer = Buffer.from(process.env[envVar], 'base64');
        if (keyBuffer.length !== 32) {
          invalidVars.push(envVar);
          console.error(`❌ Invalid ${envVar}: TOKEN_ENCRYPTION_KEY should be a base64-encoded 32-byte key`);
        } else {
          console.log(`✅ ${envVar}: VALID (32-byte base64 key)`);
        }
      } catch (e) {
        invalidVars.push(envVar);
        console.error(`❌ Invalid ${envVar}: TOKEN_ENCRYPTION_KEY should be a base64-encoded string`);
      }
    } else {
      console.log(`✅ ${envVar}: SET`);
    }
  }
});

// Check optional variables
optionalVars.forEach(envVar => {
  if (!process.env[envVar]) {
    missingOptional.push(envVar);
    console.warn(`⚠️  Missing optional environment variable: ${envVar}`);
  } else {
    console.log(`✅ ${envVar}: SET`);
  }
});

console.log('\n--- Validation Summary ---');
console.log(`Required variables checked: ${requiredVars.length}`);
console.log(`Missing required variables: ${missingRequired.length}`);
console.log(`Invalid required variables: ${invalidVars.length}`);
console.log(`Optional variables checked: ${optionalVars.length}`);
console.log(`Missing optional variables: ${missingOptional.length}`);

if (missingRequired.length > 0 || invalidVars.length > 0) {
  console.error('\n❌ Validation failed: Issues found with environment variables');
  if (missingRequired.length > 0) {
    console.error('Please set the missing variables in your .env file');
  }
  if (invalidVars.length > 0) {
    console.error('Please fix the invalid variables in your .env file');
  }
  process.exit(1);
} else {
  console.log('\n✅ Validation passed: All required environment variables are set and valid');
  process.exit(0);
}