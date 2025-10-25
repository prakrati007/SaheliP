/**
 * Payment Model
 * Tracks individual payment transactions for bookings
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['Advance', 'Remaining', 'Full'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Success', 'Failed', 'Refunded'],
    default: 'Pending',
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  paymentMethod: {
    type: String // e.g., 'card', 'upi', 'netbanking'
  },
  refundId: {
    type: String
  },
  refundAmount: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ providerId: 1, createdAt: -1 });
paymentSchema.index({ bookingId: 1, type: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
