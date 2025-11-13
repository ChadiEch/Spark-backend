const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  url: {
    type: String,
    required: [true, 'Please add a URL']
  },
  mimeType: {
    type: String,
    required: [true, 'Please add a MIME type']
  },
  size: {
    type: Number,
    required: [true, 'Please add a file size']
  },
  tags: [{
    type: String
  }],
  kind: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'DOC', 'TEMPLATE', 'GUIDELINE'],
    required: [true, 'Please specify an asset kind']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
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
AssetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Asset', AssetSchema);