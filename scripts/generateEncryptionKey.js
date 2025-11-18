#!/usr/bin/env node

/**
 * Script to generate a secure encryption key for TOKEN_ENCRYPTION_KEY environment variable
 * Usage: node generateEncryptionKey.js
 */

const crypto = require('crypto');

// Generate a random 32-byte key for AES-256 encryption
const encryptionKey = crypto.randomBytes(32);

// Convert to base64 for environment variable storage
const base64Key = encryptionKey.toString('base64');

console.log('Generated Encryption Key (Base64):');
console.log(base64Key);
console.log('');
console.log('Add this to your .env file:');
console.log(`TOKEN_ENCRYPTION_KEY=${base64Key}`);