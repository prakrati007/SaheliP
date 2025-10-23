const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../middleware/auth');
const { ensureReviewOwner, ensureReviewProvider } = require('../middleware/auth');
const { validateReviewCreate, validateReviewUpdate, validateProviderReply } = require('../middleware/validation');
const { uploadReviewImage, validateReviewImage, handleReviewMulterError } = require('../middleware/upload');
const reviewController = require('../controllers/reviewController');

// Create review (customer)
router.post(
  '/',
  isAuthenticated,
  uploadReviewImage,
  handleReviewMulterError,
  validateReviewImage,
  validateReviewCreate,
  reviewController.createReview
);

// Alias: POST /reviews/add -> same as POST /
router.post(
  '/add',
  isAuthenticated,
  uploadReviewImage,
  handleReviewMulterError,
  validateReviewImage,
  validateReviewCreate,
  reviewController.createReview
);

// Update review (owner within 24h, if no provider reply)
router.put(
  '/:id',
  isAuthenticated,
  ensureReviewOwner,
  uploadReviewImage,
  handleReviewMulterError,
  validateReviewImage,
  validateReviewUpdate,
  reviewController.updateReview
);

// Delete review (owner within 24h)
router.delete(
  '/:id',
  isAuthenticated,
  ensureReviewOwner,
  reviewController.deleteReview
);

// Provider reply
router.patch(
  '/:id/reply',
  isAuthenticated,
  ensureReviewProvider,
  validateProviderReply,
  reviewController.addProviderReply
);

// Alias: PATCH /reviews/reply/:reviewId -> same as PATCH /:id/reply
router.patch(
  '/reply/:reviewId',
  isAuthenticated,
  (req, res, next) => {
    // Map reviewId param to id for downstream middleware
    req.params.id = req.params.reviewId;
    next();
  },
  ensureReviewProvider,
  validateProviderReply,
  reviewController.addProviderReply
);

// Public: service reviews
router.get('/service/:serviceId', reviewController.getServiceReviews);

// Provider: own reviews
router.get('/provider', isAuthenticated, reviewController.getProviderReviews);

module.exports = router;
