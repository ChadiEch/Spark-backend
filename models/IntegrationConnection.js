const mongoose = require('mongoose');
const { encryptToken, decryptToken } = require('../utils/integrations/tokenEncryption');

const IntegrationConnectionSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessToken: {
    type: String,
    required: true,
    set: encryptToken, // Encrypt when setting
    get: decryptToken  // Decrypt when getting
  },
  refreshToken: {
    type: String,
    set: encryptToken, // Encrypt when setting
    get: decryptToken  // Decrypt when getting
  },
  expiresAt: {
    type: Date
  },
  scope: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { getters: true }, // Ensure getters are applied when converting to JSON
  toObject: { getters: true } // Ensure getters are applied when converting to object
});

// Add indexes for better query performance
IntegrationConnectionSchema.index({ userId: 1 });
IntegrationConnectionSchema.index({ integrationId: 1 });
IntegrationConnectionSchema.index({ userId: 1, integrationId: 1 }, { unique: true });

module.exports = mongoose.model('IntegrationConnection', IntegrationConnectionSchema);