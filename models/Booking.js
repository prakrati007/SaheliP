const mongoose = require('mongoose');

const TIME_SLOT_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

const bookingSchema = new mongoose.Schema({
  // Core References
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required'],
    index: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider is required'],
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required'],
    index: true
  },

  // Booking Details
  date: {
    type: Date,
    required: [true, 'Booking date is required'],
    index: true
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [TIME_SLOT_REGEX, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [TIME_SLOT_REGEX, 'End time must be in HH:MM format']
  },
  duration: {
    type: Number,
    required: true,
    min: [0, 'Duration cannot be negative']
  },
  serviceType: {
    type: String,
    enum: {
      values: ['Online', 'Onsite', 'Hybrid'],
      message: 'Service type must be Online, Onsite, or Hybrid'
    },
    required: [true, 'Service type is required']
  },
  address: {
    type: String,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },

  // Pricing & Payment
  pricingType: {
    type: String,
    enum: {
      values: ['Hourly', 'Fixed', 'Package'],
      message: 'Pricing type must be Hourly, Fixed, or Package'
    },
    required: true
  },
  selectedPackage: {
    name: String,
    price: Number,
    description: String,
    duration: Number
  },
  baseAmount: {
    type: Number,
    required: [true, 'Base amount is required'],
    min: [0, 'Base amount cannot be negative']
  },
  travelFee: {
    type: Number,
    default: 0,
    min: [0, 'Travel fee cannot be negative']
  },
  weekendPremium: {
    type: Number,
    default: 0,
    min: [0, 'Weekend premium cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  advancePercentage: {
    type: Number,
    required: [true, 'Advance percentage is required'],
    min: [0, 'Advance percentage cannot be negative'],
    max: [50, 'Advance percentage cannot exceed 50%']
  },
  advancePaid: {
    type: Number,
    required: [true, 'Advance paid amount is required'],
    min: [0, 'Advance paid cannot be negative']
  },
  remainingAmount: {
    type: Number,
    required: [true, 'Remaining amount is required'],
    min: [0, 'Remaining amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['Pending', 'AdvancePaid', 'FullyPaid', 'Refunded'],
      message: 'Invalid payment status'
    },
    default: 'Pending',
    index: true
  },

  // Payment Gateway Integration
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  razorpaySignature: String,
  paymentMethod: String,

  // Status & Lifecycle
  status: {
    type: String,
    enum: {
      values: ['Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'],
      message: 'Invalid booking status'
    },
    default: 'Pending',
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  cancelledBy: {
    type: String,
    enum: ['customer', 'provider', 'system']
  },
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancelledAt: Date,

  // Execution tracking
  actualStartTime: Date,
  actualEndTime: Date,
  startedBy: { type: String, enum: ['provider', 'system'] },
  completedBy: { type: String, enum: ['provider', 'system'] },
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: Date,

  // Refund tracking
  refundAmount: { type: Number, default: 0, min: 0 },
  refundPercentage: { type: Number, min: 0, max: 100 },
  refundReason: { type: String, maxlength: 500 },
  refundedAt: Date,
  refundId: String,

  // Remaining payment tracking
  remainingPaidAt: Date,
  remainingRazorpayOrderId: { type: String, sparse: true },
   remainingRazorpayPaymentId: { type: String, sparse: true },

    // Review tracking
    isReviewed: { type: Boolean, default: false, index: true },
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' }
}, {
  timestamps: true
});

// Compound Indexes for Performance
bookingSchema.index({ serviceId: 1, date: 1, startTime: 1 });
bookingSchema.index({ customerId: 1, status: 1, date: -1 });
bookingSchema.index({ providerId: 1, status: 1, date: -1 });
bookingSchema.index({ status: 1, paymentStatus: 1 });
bookingSchema.index({ status: 1, date: 1, startTime: 1, actualStartTime: 1 });
  bookingSchema.index({ customerId: 1, status: 1, isReviewed: 1 });

// Virtuals
bookingSchema.virtual('isExpired').get(function() {
  return this.status === 'Pending' && this.expiresAt && new Date() > this.expiresAt;
});

bookingSchema.virtual('isPaid').get(function() {
  return this.paymentStatus === 'AdvancePaid' || this.paymentStatus === 'FullyPaid';
});

bookingSchema.virtual('isFullyPaid').get(function() {
  return this.paymentStatus === 'FullyPaid';
});

bookingSchema.virtual('hasRemainingBalance').get(function() {
  return this.remainingAmount > 0 && this.paymentStatus !== 'FullyPaid';
});

bookingSchema.virtual('canBeReviewed').get(function() {
  return this.status === 'Completed' && !this.isReviewed;
});

// Instance Methods
bookingSchema.methods.calculatePricing = function(service, isWeekend) {
  // Calculate base amount based on pricing type
  if (this.pricingType === 'Hourly') {
    this.baseAmount = service.basePrice * this.duration;
  } else if (this.pricingType === 'Fixed') {
    this.baseAmount = service.basePrice;
  } else if (this.pricingType === 'Package' && this.selectedPackage) {
    this.baseAmount = this.selectedPackage.price;
  }

  // Calculate weekend premium
  if (isWeekend && service.weekendPremium) {
    this.weekendPremium = this.baseAmount * (service.weekendPremium / 100);
  } else {
    this.weekendPremium = 0;
  }

  // Add travel fee for onsite/hybrid services
  if ((service.mode === 'Onsite' || service.mode === 'Hybrid') && service.travelFee) {
    this.travelFee = service.travelFee;
  } else {
    this.travelFee = 0;
  }

  // Calculate total
  this.totalAmount = this.baseAmount + this.weekendPremium + this.travelFee;

  // Calculate advance and remaining
  this.advancePercentage = service.advancePercentage || 0;
  this.advancePaid = Math.round(this.totalAmount * (this.advancePercentage / 100));
  this.remainingAmount = this.totalAmount - this.advancePaid;
};

bookingSchema.methods.markAsPaid = function(paymentDetails) {
  this.status = 'Confirmed';
  this.paymentStatus = 'AdvancePaid';
  this.razorpayPaymentId = paymentDetails.paymentId;
  this.razorpaySignature = paymentDetails.signature;
  this.paymentMethod = paymentDetails.method;
};

bookingSchema.methods.cancel = function(cancelledBy, reason) {
  this.status = 'Cancelled';
  this.cancelledBy = cancelledBy;
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
};

bookingSchema.methods.startService = function(startedBy = 'provider') {
  if (this.status !== 'Confirmed') {
    throw new Error('Service can only be started when booking is Confirmed');
  }
  this.status = 'InProgress';
  this.actualStartTime = new Date();
  this.startedBy = startedBy;
  return this;
};

bookingSchema.methods.completeService = function(completedBy = 'provider') {
  if (this.status !== 'InProgress') {
    throw new Error('Service can only be completed when InProgress');
  }
  this.status = 'Completed';
  this.actualEndTime = new Date();
  this.completedBy = completedBy;
  return this;
};

bookingSchema.methods.markRemainingAsPaid = function(paymentDetails = {}) {
  this.paymentStatus = 'FullyPaid';
  this.remainingPaidAt = new Date();
  if (paymentDetails.paymentId) this.remainingRazorpayPaymentId = paymentDetails.paymentId;
  return this;
};

bookingSchema.methods.markAsReviewed = function(reviewId) {
  this.isReviewed = true;
  this.reviewId = reviewId;
  return this;
};

bookingSchema.methods.processRefund = function({ amount, percentage, reason, refundId }) {
  this.refundAmount = (this.refundAmount || 0) + (amount || 0);
  if (percentage !== undefined) this.refundPercentage = percentage;
  if (reason) this.refundReason = reason;
  this.refundedAt = new Date();
  if (refundId) this.refundId = refundId;
  if (this.refundAmount >= this.advancePaid) {
    this.paymentStatus = 'Refunded';
  }
  return this;
};

bookingSchema.methods.canAutoStart = function() {
  if (this.status !== 'Confirmed' || this.actualStartTime) return false;
  const { combineDateTime, addMinutes } = require('../utils/helpers');
  const start = combineDateTime(this.date, this.startTime);
  const grace = addMinutes(start, 15);
  return new Date() >= grace;
};

bookingSchema.methods.canAutoComplete = function() {
  if (this.status !== 'InProgress' || this.actualEndTime) return false;
  const { combineDateTime, addMinutes } = require('../utils/helpers');
  const end = combineDateTime(this.date, this.endTime);
  const grace = addMinutes(end, 30);
  return new Date() >= grace;
};

bookingSchema.methods.needsReminder = function() {
  if (this.status !== 'Confirmed' || this.reminderSent) return false;
  const { combineDateTime, addMinutes } = require('../utils/helpers');
  const start = combineDateTime(this.date, this.startTime);
  const oneHourBefore = addMinutes(start, -60);
  const now = new Date();
  return now >= oneHourBefore && now < start;
};

// Static Methods
bookingSchema.statics.checkSlotAvailability = async function(serviceId, date, startTime, endTime, excludeBookingId = null) {
  const query = {
    serviceId,
    date: new Date(date),
    status: { $in: ['Pending', 'Confirmed'] },
    $or: [
      // New booking starts during existing booking
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      // New booking ends during existing booking
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      // New booking completely encompasses existing booking
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await this.findOne(query);
  return !conflictingBooking;
};

bookingSchema.statics.reserveSlot = async function(bookingData) {
  // Atomic operation using MongoDB transaction to prevent double-booking
  const session = await this.db.startSession();
  
  try {
    let booking;
    
    await session.withTransaction(async () => {
      // Re-check slot availability inside transaction
      const isAvailable = await this.checkSlotAvailability(
        bookingData.serviceId,
        bookingData.date,
        bookingData.startTime,
        bookingData.endTime
      );

      if (!isAvailable) {
        throw new Error('This time slot is no longer available');
      }

      // Create and save booking within transaction
      booking = new this(bookingData);
      await booking.save({ session });
    });

    return booking;
  } finally {
    session.endSession();
  }
};

bookingSchema.statics.findExpiredBookings = function() {
  return this.find({
    status: 'Pending',
    expiresAt: { $lt: new Date() }
  });
};

bookingSchema.statics.findBookingsForAutoStart = function() {
  return this.find({ status: 'Confirmed', actualStartTime: null });
};

bookingSchema.statics.findBookingsForAutoComplete = function() {
  return this.find({ status: 'InProgress', actualEndTime: null });
};

bookingSchema.statics.findBookingsForReminder = function() {
  return this.find({ status: 'Confirmed', reminderSent: false });
};

bookingSchema.statics.findByCustomer = function(customerId, filters = {}) {
  const query = { customerId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.startDate && filters.endDate) {
    query.date = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
  }

  return this.find(query)
    .populate('serviceId', 'title category images basePrice pricingType')
    .populate('providerId', 'name email city')
    .sort({ date: -1, createdAt: -1 });
};

bookingSchema.statics.findByProvider = function(providerId, filters = {}) {
  const query = { providerId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.startDate && filters.endDate) {
    query.date = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
  }

  return this.find(query)
    .populate('serviceId', 'title category images basePrice pricingType')
    .populate('customerId', 'name email city')
    .sort({ date: -1, createdAt: -1 });
};

// Pre-validate Hooks
bookingSchema.pre('validate', function(next) {
  // Calculate duration from start and end time
  if (this.startTime && this.endTime) {
    const startMinutes = parseInt(this.startTime.split(':')[0]) * 60 + parseInt(this.startTime.split(':')[1]);
    const endMinutes = parseInt(this.endTime.split(':')[0]) * 60 + parseInt(this.endTime.split(':')[1]);
    this.duration = (endMinutes - startMinutes) / 60;

    // Validate that endTime > startTime
    if (this.duration <= 0) {
      return next(new Error('End time must be after start time'));
    }
  }

  // Enforce address requirement for Onsite and Hybrid services
  if ((this.serviceType === 'Onsite' || this.serviceType === 'Hybrid') && !this.address) {
    return next(new Error('Address is required for Onsite and Hybrid services'));
  }

  next();
});

// Pre-save Hooks
bookingSchema.pre('save', function(next) {
  // Set expiresAt to 15 minutes from creation if status is Pending
  if (this.isNew && this.status === 'Pending') {
    this.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  }

  next();
});

bookingSchema.statics.findReviewableByCustomer = function(customerId) {
  return this.find({
    customerId,
    status: 'Completed',
    isReviewed: false
  })
    .populate('serviceId', 'title category images')
    .populate('providerId', 'name email city hasVerificationBadge')
    .sort({ date: -1 });
};

// Enable virtuals in JSON
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
