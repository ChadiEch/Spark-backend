const mongoose = require('mongoose');

const AmbassadorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  handle: {
    type: String,
    required: [true, 'Please add a handle'],
    trim: true,
    maxlength: [100, 'Handle cannot be more than 100 characters']
  },
  platforms: [{
    type: String,
    enum: ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'PINTEREST', 'X', 'YOUTUBE']
  }],
  email: {
    type: String,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String
  },
  tags: [{
    type: String
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  avatar: {
    type: String
  },
  metrics: {
    totalPosts: {
      type: Number,
      default: 0
    },
    totalReach: {
      type: Number,
      default: 0
    },
    totalEngagement: {
      type: Number,
      default: 0
    },
    averageEngagementRate: {
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
AmbassadorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Ambassador', AmbassadorSchema);