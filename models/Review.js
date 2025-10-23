/**
 * Review Model
 * Manages customer reviews and ratings for services
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // References
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true
    },

    // Review Content
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 1000
    },
    reviewImage: {
      type: String,
      default: null
    },

    // Provider Reply
    providerReply: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
    },
    repliedAt: {
      type: Date,
      default: null
    },

    // Edit Tracking
    isEdited: {
      type: Boolean,
      default: false
    },
    editableUntil: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound Indexes for efficient queries
reviewSchema.index({ serviceId: 1, createdAt: -1 });
reviewSchema.index({ providerId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, createdAt: -1 });

// Virtuals
reviewSchema.virtual('canEdit').get(function () {
  return new Date() < this.editableUntil;
});

reviewSchema.virtual('hasReply').get(function () {
  return !!this.providerReply;
});

// Instance Methods

/**
 * Add provider reply to review
 * @param {String} replyText - Reply content
 */
reviewSchema.methods.addReply = function (replyText) {
  this.providerReply = replyText;
  this.repliedAt = new Date();
  return this;
};

/**
 * Update review content
 * @param {Number} rating - New rating
 * @param {String} reviewText - New review text
 * @param {String} reviewImage - New image path
 */
reviewSchema.methods.updateReview = function (rating, reviewText, reviewImage) {
  if (rating !== undefined) this.rating = rating;
  if (reviewText !== undefined) this.reviewText = reviewText;
  if (reviewImage !== undefined) this.reviewImage = reviewImage;
  this.isEdited = true;
  return this;
};

/**
 * Check if review can be edited by user
 * @param {String} userId - User ID to check
 * @returns {Boolean}
 */
reviewSchema.methods.canBeEditedBy = function (userId) {
  return (
    this.customerId.toString() === userId.toString() &&
    new Date() < this.editableUntil
  );
};

/**
 * Check if review can be deleted by user
 * @param {String} userId - User ID to check
 * @returns {Boolean}
 */
reviewSchema.methods.canBeDeletedBy = function (userId) {
  return (
    this.customerId.toString() === userId.toString() &&
    new Date() < this.editableUntil
  );
};

// Static Methods

/**
 * Find reviews for a service with pagination
 * @param {ObjectId} serviceId - Service ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
reviewSchema.statics.findByService = function (serviceId, options = {}) {
  const { page = 1, limit = 5, sort = 'newest' } = options;
  const skip = (page - 1) * limit;

  let sortOption = { createdAt: -1 }; // Default: newest first
  if (sort === 'oldest') sortOption = { createdAt: 1 };
  else if (sort === 'highest') sortOption = { rating: -1, createdAt: -1 };
  else if (sort === 'lowest') sortOption = { rating: 1, createdAt: -1 };

  return this.find({ serviceId })
    .sort(sortOption)
    .limit(limit)
    .skip(skip)
    .populate('customerId', 'name')
    .populate('providerId', 'name')
    .lean();
};

/**
 * Find recent reviews for provider's services
 * @param {ObjectId} providerId - Provider ID
 * @param {Number} limit - Number of reviews to fetch
 * @returns {Promise<Array>}
 */
reviewSchema.statics.findByProvider = function (providerId, limit = 10) {
  return this.find({ providerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('serviceId', 'title category')
    .populate('customerId', 'name')
    .lean();
};

/**
 * Find reviews by customer
 * @param {ObjectId} customerId - Customer ID
 * @returns {Promise<Array>}
 */
reviewSchema.statics.findByCustomer = function (customerId) {
  return this.find({ customerId })
    .sort({ createdAt: -1 })
    .populate('serviceId', 'title category images')
    .populate('providerId', 'name city')
    .lean();
};

/**
 * Check if review exists for a booking
 * @param {ObjectId} bookingId - Booking ID
 * @returns {Promise<Boolean>}
 */
reviewSchema.statics.checkExistingReview = async function (bookingId) {
  const review = await this.findOne({ bookingId });
  return !!review;
};

/**
 * Recalculate service rating based on all reviews
 * @param {ObjectId} serviceId - Service ID
 * @returns {Promise<Object>}
 */
reviewSchema.statics.recalculateServiceRating = async function (serviceId) {
  const Service = mongoose.model('Service');

  const stats = await this.aggregate([
    { $match: { serviceId: mongoose.Types.ObjectId(serviceId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  const averageRating = stats[0]?.averageRating || 0;
  const reviewCount = stats[0]?.reviewCount || 0;

  const updatedService = await Service.findByIdAndUpdate(
    serviceId,
    {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount
    },
    { new: true }
  );

  return updatedService;
};

// Pre-save Hooks
reviewSchema.pre('save', function (next) {
  // Set editableUntil on creation
  if (this.isNew) {
    this.editableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }

  // Validate rating
  if (this.rating < 1 || this.rating > 5) {
    return next(new Error('Rating must be between 1 and 5'));
  }

  // Validate reviewText length
  if (this.reviewText.length < 20 || this.reviewText.length > 1000) {
    return next(new Error('Review text must be between 20 and 1000 characters'));
  }

  next();
});

// Post-save Hook - Recalculate service rating
reviewSchema.post('save', async function (doc) {
  try {
    await mongoose.model('Review').recalculateServiceRating(doc.serviceId);
  } catch (error) {
    console.error('Error recalculating service rating after save:', error);
  }
});

// Post-remove Hook - Recalculate service rating
reviewSchema.post('remove', async function (doc) {
  try {
    await mongoose.model('Review').recalculateServiceRating(doc.serviceId);
  } catch (error) {
    console.error('Error recalculating service rating after remove:', error);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
