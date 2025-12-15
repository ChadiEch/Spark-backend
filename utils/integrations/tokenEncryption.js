const crypto = require('crypto');

// Use the encryption key from environment variables or fallback to a default
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'fallback-key-for-development-only-change-in-production';
const IV_LENGTH = 16; // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc';

// Ensure we have a 32-byte key for AES-256
const getKey = () => {
  // Hash the key to ensure it's the right length
  const hash = crypto.createHash('sha256');
  hash.update(ENCRYPTION_KEY);
  return hash.digest();
};

/**
 * Encrypt a token
 * @param {string} token - The token to encrypt
 * @returns {string} - The encrypted token
 */
const encryptToken = (token) => {
  if (!token) return token;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error encrypting token:', error);
    return token; // Return original token if encryption fails
  }
};

/**
 * Decrypt a token
 * @param {string} encryptedToken - The encrypted token
 * @returns {string} - The decrypted token
 */
const decryptToken = (encryptedToken) => {
  if (!encryptedToken) return encryptedToken;
  
  try {
    const textParts = encryptedToken.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting token:', error);
    return encryptedToken; // Return original encrypted token if decryption fails
  }
};

/**
 * Hash a client secret
 * @param {string} secret - The client secret to hash
 * @returns {string} - The hashed secret
 */
const hashClientSecret = (secret) => {
  if (!secret) return secret;
  
  try {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    return hash.digest('hex');
  } catch (error) {
    console.error('Error hashing client secret:', error);
    return secret; // Return original secret if hashing fails
  }
};

/**
 * Compare a client secret with a hashed secret
 * @param {string} secret - The client secret to compare
 * @param {string} hashedSecret - The hashed secret to compare against
 * @returns {boolean} - Whether the secrets match
 */
const compareClientSecret = (secret, hashedSecret) => {
  if (!secret || !hashedSecret) return false;
  
  try {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    return hash.digest('hex') === hashedSecret;
  } catch (error) {
    console.error('Error comparing client secret:', error);
    return false;
  }
};

module.exports = {
  encryptToken,
  decryptToken,
  hashClientSecret,
  compareClientSecret
};