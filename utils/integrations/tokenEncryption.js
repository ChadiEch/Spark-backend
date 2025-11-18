const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Generate a proper 32-byte key for AES-256-CBC encryption
// In production, this should come from environment variables
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY 
  ? Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'base64') // If provided as base64
  : crypto.randomBytes(32); // Generate a random 32-byte key for development

const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt a token
 * @param {string} token - The token to encrypt
 * @returns {string} - The encrypted token (base64 encoded)
 */
const encryptToken = (token) => {
  try {
    if (!token) return token; // Don't encrypt null/undefined values
    
    const iv = crypto.randomBytes(IV_LENGTH);
    // Use createCipheriv instead of createCipher (which is deprecated)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString('base64');
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw new Error(`Error encrypting token: ${error.message}`);
  }
};

/**
 * Decrypt a token
 * @param {string} encryptedToken - The encrypted token (base64 encoded)
 * @returns {string} - The decrypted token
 */
const decryptToken = (encryptedToken) => {
  try {
    if (!encryptedToken) return encryptedToken; // Don't decrypt null/undefined values
    
    const buffer = Buffer.from(encryptedToken, 'base64');
    const iv = buffer.slice(0, IV_LENGTH);
    const encrypted = buffer.slice(IV_LENGTH);
    // Use createDecipheriv instead of createDecipher (which is deprecated)
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw new Error(`Error decrypting token: ${error.message}`);
  }
};

/**
 * Hash a client secret for secure storage
 * @param {string} secret - The client secret to hash
 * @returns {string} - The hashed secret
 */
const hashClientSecret = (secret) => {
  try {
    if (!secret) return secret; // Don't hash null/undefined values
    
    const saltRounds = 12;
    // Use sync version for mongoose setters
    return bcrypt.hashSync(secret, saltRounds);
  } catch (error) {
    console.error('Error hashing client secret:', error);
    throw new Error(`Error hashing client secret: ${error.message}`);
  }
};

/**
 * Compare a client secret with its hash
 * @param {string} secret - The client secret to compare
 * @param {string} hash - The hashed secret
 * @returns {Promise<boolean>} - Whether they match
 */
const compareClientSecret = async (secret, hash) => {
  try {
    if (!secret || !hash) return false; // Can't compare if either is missing
    return await bcrypt.compare(secret, hash);
  } catch (error) {
    console.error('Error comparing client secret:', error);
    throw new Error(`Error comparing client secret: ${error.message}`);
  }
};

module.exports = {
  encryptToken,
  decryptToken,
  hashClientSecret,
  compareClientSecret
};