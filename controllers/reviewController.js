const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { isValidRating, REVIEW_TEXT_MIN_LENGTH, REVIEW_TEXT_MAX_LENGTH } = require('../utils/constants');
const { recalculateServiceRating, formatReviewDate } = require('../utils/helpers');
const { 
  sendNewReviewNotification, 
  sendReviewConfirmation, 
  sendProviderReplyNotification 
} = require('../utils/emailService');

// Create a new review (customer)
exports.createReview = async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can leave reviews' });
    }

    const { bookingId, rating, reviewText } = req.body;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking' });
    }
    if (!isValidRating(rating)) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }
    const trimmedText = String(reviewText || '').trim();
    if (trimmedText.length < REVIEW_TEXT_MIN_LENGTH || trimmedText.length > REVIEW_TEXT_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `Review must be ${REVIEW_TEXT_MIN_LENGTH}-${REVIEW_TEXT_MAX_LENGTH} characters` });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (String(booking.customerId) !== String(user.id)) {
      return res.status(403).json({ success: false, message: 'You can only review your own bookings' });
    }
    if (booking.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'You can only review completed bookings' });
    }
    if (booking.isReviewed) {
      return res.status(400).json({ success: false, message: 'This booking is already reviewed' });
    }

    // Prevent duplicate review for the same booking
    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A review already exists for this booking' });
    }

    const service = await Service.findById(booking.serviceId).lean();
    const provider = await User.findById(booking.providerId).lean();
    if (!service || !provider) {
      return res.status(400).json({ success: false, message: 'Invalid booking/service/provider link' });
    }

    const reviewDoc = new Review({
      serviceId: booking.serviceId,
      providerId: booking.providerId,
      customerId: booking.customerId,
      bookingId: booking._id,
      rating: Number(rating),
      reviewText: trimmedText,
      reviewImage: req.file ? `/uploads/reviews/${req.file.filename}` : null,
    });
    await reviewDoc.save();

    // Mark booking as reviewed
    booking.markAsReviewed(reviewDoc._id);
    await booking.save();

    // Recalculate service rating
    await recalculateServiceRating(booking.serviceId);

    // Emails (best-effort)
    const customer = await User.findById(booking.customerId).lean();
    if (provider?.email) {
      sendNewReviewNotification({ to: provider.email, provider, service, review: reviewDoc.toObject(), customer });
    }
    if (customer?.email) {
      sendReviewConfirmation({ to: customer.email, customer, service, review: reviewDoc.toObject() });
    }

    return res.json({ success: true, data: { review: reviewDoc, editableUntil: reviewDoc.editableUntil, createdAt: reviewDoc.createdAt, formattedDate: formatReviewDate(reviewDoc.createdAt) } });
  } catch (err) {
    console.error('createReview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create review' });
  }
};

// Update a review (owner, within 24h, no provider reply yet)
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const userId = req.session?.user?.id;
    if (String(review.customerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own review' });
    }
    if (review.providerReply) {
      return res.status(403).json({ success: false, message: 'Cannot edit after provider has replied' });
    }
    if (!review.editableUntil || new Date() > review.editableUntil) {
      return res.status(403).json({ success: false, message: 'Edit window has expired' });
    }

    const { rating, reviewText } = req.body;
    if (rating !== undefined && !isValidRating(rating)) {
      return res.status(400).json({ success: false, message: 'Rating must be 1-5' });
    }
    if (reviewText !== undefined) {
      const trimmedText = String(reviewText).trim();
      if (trimmedText.length < REVIEW_TEXT_MIN_LENGTH || trimmedText.length > REVIEW_TEXT_MAX_LENGTH) {
        return res.status(400).json({ success: false, message: `Review must be ${REVIEW_TEXT_MIN_LENGTH}-${REVIEW_TEXT_MAX_LENGTH} characters` });
      }
      review.reviewText = trimmedText;
    }
    if (rating !== undefined) review.rating = Number(rating);
    if (req.file) review.reviewImage = `/uploads/reviews/${req.file.filename}`;
    review.isEdited = true;
    await review.save();

    await recalculateServiceRating(review.serviceId);

    return res.json({ success: true, data: { review } });
  } catch (err) {
    console.error('updateReview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update review' });
  }
};

// Delete a review (owner, within 24h)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const userId = req.session?.user?.id;
    if (String(review.customerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own review' });
    }
    if (!review.editableUntil || new Date() > review.editableUntil) {
      return res.status(403).json({ success: false, message: 'Delete window has expired' });
    }

    // Unlink booking reviewed flag
    const booking = await Booking.findById(review.bookingId);
    if (booking) {
      booking.isReviewed = false;
      booking.reviewId = undefined;
      await booking.save();
    }

    await review.remove();
    await recalculateServiceRating(review.serviceId);

    return res.json({ success: true });
  } catch (err) {
    console.error('deleteReview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};

// Provider adds a reply
exports.addProviderReply = async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user || user.role !== 'saheli') {
      return res.status(403).json({ success: false, message: 'Only providers can reply to reviews' });
    }
    const { id } = req.params;
    const { replyText } = req.body;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (String(review.providerId) !== String(user.id)) {
      return res.status(403).json({ success: false, message: 'You can only reply to reviews on your services' });
    }
    if (!replyText || String(replyText).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Reply text is required' });
    }

    review.providerReply = String(replyText).trim();
    review.repliedAt = new Date();
    await review.save();

    const service = await Service.findById(review.serviceId).lean();
    const customer = await User.findById(review.customerId).lean();
    if (customer?.email) {
      sendProviderReplyNotification({ to: customer.email, customer, service, provider: user, review: review.toObject() });
    }

    return res.json({ success: true, data: { review, repliedAtFormatted: formatReviewDate(review.repliedAt) } });
  } catch (err) {
    console.error('addProviderReply error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add reply' });
  }
};

// Public: get service reviews
exports.getServiceReviews = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));
    const sort = ['newest', 'oldest', 'highest', 'lowest'].includes(req.query.sort) ? req.query.sort : 'newest';

    const match = { serviceId };
    const total = await Review.countDocuments(match);
    const reviews = await Review.findByService(serviceId, { page, limit, sort });

    return res.json({ success: true, data: { total, page, limit, reviews } });
  } catch (err) {
    console.error('getServiceReviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// Provider: get own reviews
exports.getProviderReviews = async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user || user.role !== 'saheli') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const reviews = await Review.findByProvider(user.id, limit);
    return res.json({ success: true, data: { reviews } });
  } catch (err) {
    console.error('getProviderReviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch provider reviews' });
  }
};
