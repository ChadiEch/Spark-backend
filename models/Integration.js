const mongoose = require('mongoose');
const { hashClientSecret, compareClientSecret } = require('../utils/integrations/tokenEncryption');

const IntegrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  key: {
    type: String,
    required: [true, 'Please add a key'],
    unique: true,
    trim: true
  },
  icon: {
    type: String,
    required: [true, 'Please add an icon']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['social', 'storage', 'analytics', 'communication', 'other']
  },
  clientId: {
    type: String,
    required: [true, 'Please add a client ID']
  },
  clientSecret: {
    type: String,
    required: [true, 'Please add a client secret'],
    set: hashClientSecret // Hash when setting
  },
  redirectUri: {
    type: String,
    required: [true, 'Please add a redirect URI']
  },
  scopes: {
    type: [String],
    default: []
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true }, // Ensure getters are applied when converting to JSON
  toObject: { getters: true } // Ensure getters are applied when converting to object
});

// Add a method to compare client secrets
IntegrationSchema.methods.compareClientSecret = function(secret) {
  return compareClientSecret(secret, this.clientSecret);
};

module.exports = mongoose.model('Integration', IntegrationSchema);