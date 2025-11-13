const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  caption: {
    type: String,
    maxlength: [1000, 'Caption cannot be more than 1000 characters']
  },
  hashtags: [{
    type: String
  }],
  platformHashtags: {
    type: Map,
    of: [String]
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'POSTED', 'ARCHIVED'],
    default: 'DRAFT'
  },
  scheduledAt: {
    type: Date
  },
  publishedAt: {
    type: Date
  },
  platform: {
    type: String,
    enum: ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'PINTEREST', 'X', 'YOUTUBE'],
    required: [true, 'Please specify a platform']
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }],
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  metrics: {
    reach: Number,
    impressions: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    saves: Number,
    clicks: Number,
    engagementRate: Number
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  externalId: {
    type: String
  }
});

// Update the updatedAt field before saving
PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Post', PostSchema);