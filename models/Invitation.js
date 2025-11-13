const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  role: {
    type: String,
    enum: ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'],
    default: 'CONTRIBUTOR'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  accepted: {
    type: Boolean,
    default: false
  },
  acceptedAt: {
    type: Date
  }
});

// Index for expiration
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invitation', InvitationSchema);