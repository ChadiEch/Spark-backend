const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['POST', 'AD', 'AMBASSADOR_TASK'],
    required: [true, 'Please specify an activity type']
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  ambassador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambassador'
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  metrics: {
    reach: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    spendCents: {
      type: Number,
      default: 0
    },
    revenueCents: {
      type: Number,
      default: 0
    }
  },
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
ActivitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Activity', ActivitySchema);