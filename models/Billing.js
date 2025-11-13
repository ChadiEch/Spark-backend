const mongoose = require('mongoose');

// Define the billing schema
const billingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'unpaid'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    price: {
      amount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      }
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'paypal', 'bank_transfer'],
      default: 'card'
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  invoices: [{
    id: String,
    date: Date,
    amount: {
      value: Number,
      currency: String
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'refunded']
    },
    pdfUrl: String
  }],
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
billingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Billing', billingSchema);