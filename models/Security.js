const mongoose = require('mongoose');

// Define the security schema
const securitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [{
      code: String,
      used: {
        type: Boolean,
        default: false
      }
    }],
    lastVerified: Date
  },
  sessions: [{
    id: String,
    userAgent: String,
    ip: String,
    location: String,
    createdAt: Date,
    lastActive: Date,
    current: {
      type: Boolean,
      default: false
    }
  }],
  passwordHistory: [{
    password: String,
    changedAt: Date
  }],
  lastPasswordChange: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
securitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Security', securitySchema);