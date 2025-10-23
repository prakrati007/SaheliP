/**
 * Authentication middleware
 */
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

/**
 * Check if user is authenticated
 * Redirects to login page if not authenticated
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  
  // Store intended URL for redirect after login
  req.session.returnTo = req.originalUrl;
  
  res.redirect('/auth/login?error=Please log in to continue');
}

/**
 * Check if user is guest (not authenticated)
 * Redirects authenticated users to dashboard
 */
function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    return res.redirect(`/dashboard?role=${role}`);
  }
  
  next();
}

/**
 * Require specific role
 * @param {string} role - Required role ('saheli' or 'customer')
 * @returns {Function} - Middleware function
 */
function requireRole(role) {
  return function (req, res, next) {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login?error=Please log in to continue');
    }
    
    if (req.session.user.role !== role) {
      const userRole = req.session.user.role;
      return res.status(403).render('errors/403', {
        title: 'Access Denied',
        message: `This page is only accessible to ${role}s`,
        redirectUrl: `/dashboard?role=${userRole}`,
      });
    }
    
    next();
  };
}

/**
 * Set res.locals.user from session
 * Makes session user available to all EJS templates
 */
function setLocals(req, res, next) {
  res.locals.user = req.session.user || null;
  // Make helpers available in all EJS views
  try {
    res.locals.helpers = require('../utils/helpers');
  } catch (e) {
    // no-op
  }
  next();
}

/**
 * Ensure the authenticated user owns the targeted service
 */
async function ensureServiceOwner(req, res, next) {
  try {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).render('pages/services/my-services', {
        title: 'My Services',
        errors: ['Service not found'],
        services: [],
        servicePage: true,
      });
    }
    if (!req.session || !req.session.user || String(service.providerId) !== String(req.session.user.id)) {
      return res.status(403).render('pages/services/my-services', {
        title: 'My Services',
        errors: ['You can only manage your own services'],
        services: [],
        servicePage: true,
      });
    }
    req.service = service;
    next();
  } catch (err) {
    return res.status(500).render('pages/services/my-services', {
      title: 'My Services',
      errors: ['Error verifying service ownership'],
      services: [],
      servicePage: true,
    });
  }
}

module.exports = {
  isAuthenticated,
  isGuest,
  requireRole,
  setLocals,
  ensureServiceOwner,
  // Ensure the authenticated provider owns the booking
  ensureBookingProvider: async function(req, res, next) {
    try {
      const bookingId = req.params.id;
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
      if (!req.session || !req.session.user || String(booking.providerId) !== String(req.session.user.id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      req.booking = booking;
      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error verifying booking ownership' });
    }
  },
  // Ensure the authenticated customer owns the review and can still edit/delete (within 24h)
  ensureReviewOwner: async function(req, res, next) {
    try {
      const reviewId = req.params.id;
      const review = await Review.findById(reviewId);
      if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
      const userId = req.session?.user?.id;
      if (!userId || String(review.customerId) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'You can only edit/delete your own reviews' });
      }
      // Check editable window
      if (!review.editableUntil || new Date() > review.editableUntil) {
        return res.status(403).json({ success: false, message: 'Review can only be edited within 24 hours of posting' });
      }
      req.review = review;
      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error verifying review ownership' });
    }
  },
  // Ensure the authenticated provider owns the service associated with the review
  ensureReviewProvider: async function(req, res, next) {
    try {
      const reviewId = req.params.id;
      const review = await Review.findById(reviewId);
      if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
      const userId = req.session?.user?.id;
      if (!userId || String(review.providerId) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'You can only reply to reviews on your services' });
      }
      req.review = review;
      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error verifying review provider ownership' });
    }
  }
};
