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

// Check required variables
requiredVars.forEach(envVar => {
  if (!process.env[envVar]) {
    missingRequired.push(envVar);
    console.error(`❌ Missing required environment variable: ${envVar}`);
  } else {
    console.log(`✅ ${envVar}: SET`);
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
console.log(`Optional variables checked: ${optionalVars.length}`);
console.log(`Missing optional variables: ${missingOptional.length}`);

if (missingRequired.length > 0) {
  console.error('\n❌ Validation failed: Missing required environment variables');
  console.error('Please set the missing variables in your .env file');
  process.exit(1);
} else {
  console.log('\n✅ Validation passed: All required environment variables are set');
  process.exit(0);
}