const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Generate a key for encryption (in production, this should come from environment variables)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'this-is-a-very-long-key-for-encryption-32-bytes!';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt a token
 * @param {string} token - The token to encrypt
 * @returns {string} - The encrypted token (base64 encoded)
 */
const encryptToken = (token) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString('base64');
  } catch (error) {
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
    const buffer = Buffer.from(encryptedToken, 'base64');
    const iv = buffer.slice(0, IV_LENGTH);
    const encrypted = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Error decrypting token: ${error.message}`);
  }
};

/**
 * Hash a client secret for secure storage
 * @param {string} secret - The client secret to hash
 * @returns {Promise<string>} - The hashed secret
 */
const hashClientSecret = async (secret) => {
  try {
    const saltRounds = 12;
    return await bcrypt.hash(secret, saltRounds);
  } catch (error) {
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
    return await bcrypt.compare(secret, hash);
  } catch (error) {
    throw new Error(`Error comparing client secret: ${error.message}`);
  }
};

module.exports = {
  encryptToken,
  decryptToken,
  hashClientSecret,
  compareClientSecret
};