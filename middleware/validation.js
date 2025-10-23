/**
 * Validation middleware for authentication routes
 */

/**
 * Validate signup form data
 */
  // ...existing code...
const { SERVICE_CATEGORIES, PRICING_TYPES, SERVICE_MODES, getSubcategories, RATING_VALUES, REVIEW_TEXT_MIN_LENGTH, REVIEW_TEXT_MAX_LENGTH, PROVIDER_REPLY_MAX_LENGTH, isValidRating } = require('../utils/constants');

function validateServiceCreate(req, res, next) {
  const errors = [];
  const formData = { ...req.body };
  // Sanitize
  if (formData.title) formData.title = formData.title.trim();
  if (formData.description) formData.description = formData.description.trim();
  if (formData.city) formData.city = formData.city.trim();
  if (formData.pincode) formData.pincode = formData.pincode.trim();

  // Title
  if (!formData.title || formData.title.length < 5 || formData.title.length > 100) {
    errors.push('Title must be 5-100 characters');
  }
  // Category
  if (!formData.category || !SERVICE_CATEGORIES[formData.category]) {
    errors.push('Category is required and must be valid');
  }
  // Subcategory
  if (formData.subcategory) {
    const subs = getSubcategories(formData.category);
    if (!subs.includes(formData.subcategory)) {
      errors.push('Invalid subcategory for selected category');
    }
  }
  // Description
  if (!formData.description || formData.description.length < 50 || formData.description.length > 2000) {
    errors.push('Description must be 50-2000 characters');
  }
  // Pricing Type
  if (!formData.pricingType || !PRICING_TYPES.includes(formData.pricingType)) {
    errors.push('Pricing type is required and must be valid');
  }
  // Base Price
  if (!formData.basePrice || isNaN(formData.basePrice) || Number(formData.basePrice) < 0 || Number(formData.basePrice) > 100000) {
    errors.push('Base price must be a positive number (max 100000)');
  }
  // Packages
  if (formData.pricingType === 'Package') {
    let packages = [];
    try {
      packages = JSON.parse(formData.packages || '[]');
    } catch {
      errors.push('Invalid packages data');
    }
    if (!Array.isArray(packages) || packages.length === 0) {
      errors.push('At least one package is required');
    } else {
      for (const pkg of packages) {
        if (!pkg.name || !pkg.price || !pkg.description || !pkg.duration) {
          errors.push('Each package must have name, price, description, and duration');
          break;
        }
      }
    }
  }
  // Mode
  if (!formData.mode || !SERVICE_MODES.includes(formData.mode)) {
    errors.push('Service mode is required and must be valid');
  }
  // City
  if (!formData.city || formData.city.length < 2 || formData.city.length > 50) {
    errors.push('City must be 2-50 characters');
  }
  // Pincode
  if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
    errors.push('Pincode must be exactly 6 digits');
  }
  // Advance Percentage
  if (formData.advancePercentage && (isNaN(formData.advancePercentage) || Number(formData.advancePercentage) < 0 || Number(formData.advancePercentage) > 50)) {
    errors.push('Advance percentage must be 0-50');
  }
  // Travel Fee
  if (formData.travelFee && (isNaN(formData.travelFee) || Number(formData.travelFee) < 0 || Number(formData.travelFee) > 5000)) {
    errors.push('Travel fee must be 0-5000');
  }
  // Weekend Premium
  if (formData.weekendPremium && (isNaN(formData.weekendPremium) || Number(formData.weekendPremium) < 0 || Number(formData.weekendPremium) > 15)) {
    errors.push('Weekend premium must be 0-15');
  }
  // Weekly Schedule
  let schedule = [];
  try {
    schedule = JSON.parse(formData.weeklySchedule || '[]');
  } catch {
    errors.push('Invalid weekly schedule data');
  }
  if (!Array.isArray(schedule) || schedule.length === 0) {
    errors.push('At least one weekly schedule is required');
  }
  // Max Bookings Per Day
  if (formData.maxBookingsPerDay && (isNaN(formData.maxBookingsPerDay) || Number(formData.maxBookingsPerDay) < 1 || Number(formData.maxBookingsPerDay) > 20)) {
    errors.push('Max bookings per day must be 1-20');
  }
  // Advance Booking Limit
  if (formData.advanceBookingLimit && (isNaN(formData.advanceBookingLimit) || Number(formData.advanceBookingLimit) < 1 || Number(formData.advanceBookingLimit) > 365)) {
    errors.push('Advance booking limit must be 1-365');
  }
  // Preparation Time
  if (formData.preparationTime && (isNaN(formData.preparationTime) || Number(formData.preparationTime) < 0 || Number(formData.preparationTime) > 48)) {
    errors.push('Preparation time must be 0-48');
  }
  if (errors.length > 0) {
    return res.render('pages/services/add', {
      title: 'Add New Service',
      errors,
      formData,
      servicePage: true
    });
  }
  next();
}

function validateServiceUpdate(req, res, next) {
  const errors = [];
  const formData = { ...req.body };
  // Only validate provided fields
  if (formData.title && (formData.title.length < 5 || formData.title.length > 100)) {
    errors.push('Title must be 5-100 characters');
  }
  if (formData.category && !SERVICE_CATEGORIES[formData.category]) {
    errors.push('Category must be valid');
  }
  if (formData.subcategory && formData.category) {
    const subs = getSubcategories(formData.category);
    if (!subs.includes(formData.subcategory)) {
      errors.push('Invalid subcategory for selected category');
    }
  }
  if (formData.description && (formData.description.length < 50 || formData.description.length > 2000)) {
    errors.push('Description must be 50-2000 characters');
  }
  if (formData.pricingType && !PRICING_TYPES.includes(formData.pricingType)) {
    errors.push('Pricing type must be valid');
  }
  if (formData.basePrice && (isNaN(formData.basePrice) || Number(formData.basePrice) < 0 || Number(formData.basePrice) > 100000)) {
    errors.push('Base price must be a positive number (max 100000)');
  }
  if (formData.pricingType === 'Package') {
    let packages = [];
    try {
      packages = JSON.parse(formData.packages || '[]');
    } catch {
      errors.push('Invalid packages data');
    }
    if (!Array.isArray(packages) || packages.length === 0) {
      errors.push('At least one package is required');
    } else {
      for (const pkg of packages) {
        if (!pkg.name || !pkg.price || !pkg.description || !pkg.duration) {
          errors.push('Each package must have name, price, description, and duration');
          break;
        }
      }
    }
  }
  if (formData.mode && !SERVICE_MODES.includes(formData.mode)) {
    errors.push('Service mode must be valid');
  }
  if (formData.city && (formData.city.length < 2 || formData.city.length > 50)) {
    errors.push('City must be 2-50 characters');
  }
  if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
    errors.push('Pincode must be exactly 6 digits');
  }
  if (formData.advancePercentage && (isNaN(formData.advancePercentage) || Number(formData.advancePercentage) < 0 || Number(formData.advancePercentage) > 50)) {
    errors.push('Advance percentage must be 0-50');
  }
  if (formData.travelFee && (isNaN(formData.travelFee) || Number(formData.travelFee) < 0 || Number(formData.travelFee) > 5000)) {
    errors.push('Travel fee must be 0-5000');
  }
  if (formData.weekendPremium && (isNaN(formData.weekendPremium) || Number(formData.weekendPremium) < 0 || Number(formData.weekendPremium) > 15)) {
    errors.push('Weekend premium must be 0-15');
  }
  if (formData.weeklySchedule) {
    let schedule = [];
    try {
      schedule = JSON.parse(formData.weeklySchedule || '[]');
    } catch {
      errors.push('Invalid weekly schedule data');
    }
    if (!Array.isArray(schedule) || schedule.length === 0) {
      errors.push('At least one weekly schedule is required');
    }
  }
  if (formData.maxBookingsPerDay && (isNaN(formData.maxBookingsPerDay) || Number(formData.maxBookingsPerDay) < 1 || Number(formData.maxBookingsPerDay) > 20)) {
    errors.push('Max bookings per day must be 1-20');
  }
  if (formData.advanceBookingLimit && (isNaN(formData.advanceBookingLimit) || Number(formData.advanceBookingLimit) < 1 || Number(formData.advanceBookingLimit) > 365)) {
    errors.push('Advance booking limit must be 1-365');
  }
  if (formData.preparationTime && (isNaN(formData.preparationTime) || Number(formData.preparationTime) < 0 || Number(formData.preparationTime) > 48)) {
    errors.push('Preparation time must be 0-48');
  }
  if (errors.length > 0) {
    return res.render('pages/services/edit', {
      title: 'Edit Service',
      errors,
      service: req.service,
      servicePage: true
    });
  }
  next();
}

function validateSignup(req, res, next) {
  const errors = [];
  const { name, email, password, city, pincode, role } = req.body;

  // Sanitize inputs
  if (name) req.body.name = name.trim();
  if (email) req.body.email = email.toLowerCase().trim();
  if (city) req.body.city = city.trim();
  if (pincode) req.body.pincode = pincode.trim();

  // Name validation
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (name && name.trim().length > 50) {
    errors.push('Name must not exceed 50 characters');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length > 72) {
    errors.push('Password must not exceed 72 characters');
  }

  // Password confirmation validation
  const confirmPassword = req.body.confirmPassword;
  if (password && password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  // City validation
  if (!city || city.trim().length < 2) {
    errors.push('City must be at least 2 characters long');
  }
  if (city && city.trim().length > 50) {
    errors.push('City must not exceed 50 characters');
  }

  // Pincode validation
  const pincodeRegex = /^\d{6}$/;
  if (!pincode || !pincodeRegex.test(pincode)) {
    errors.push('Pincode must be exactly 6 digits');
  }

  // Role validation
  if (!role || !['saheli', 'customer'].includes(role)) {
    errors.push('Invalid role selected');
  }

  if (errors.length > 0) {
    return res.status(400).render(`pages/auth/signup-${role || 'saheli'}`, {
      title: `Sign Up as ${role === 'saheli' ? 'Saheli' : 'Customer'}`,
      errors,
      formData: req.body,
      authPage: true,
    });
  }

  next();
}

/**
 * Validate login form data
 */
function validateLogin(req, res, next) {
  const errors = [];
  const { email, password, role } = req.body;

  // Sanitize email
  if (email) req.body.email = email.toLowerCase().trim();

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }

  // Role validation
  if (!role || !['saheli', 'customer'].includes(role)) {
    errors.push('Please select your role (Customer or Saheli)');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).render('pages/auth/login', {
      title: 'Log In - Saheli Plus',
      errors,
      formData: req.body,
      authPage: true,
    });
  }

  next();
}

/**
 * Validate OTP verification data
 */
function validateOtp(req, res, next) {
  const errors = [];
  const { email, otp, token } = req.body;

  // Sanitize email
  if (email) req.body.email = email.toLowerCase().trim();

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }

  // OTP validation
  const otpRegex = /^\d{6}$/;
  if (!otp || !otpRegex.test(otp)) {
    errors.push('OTP must be exactly 6 digits');
  }

  // Token validation
  if (!token || token.length < 32) {
    errors.push('Invalid verification token');
  }

  if (errors.length > 0) {
    return res.status(400).render('pages/auth/verify-otp', {
      title: 'Verify OTP - Saheli Plus',
      errors,
      email: email || '',
      token: token || '',
      authPage: true,
    });
  }

  next();
}

/**
 * Validate booking creation data
 */
function validateBookingCreate(req, res, next) {
  const errors = [];
  const formData = { ...req.body };

  // Sanitize inputs
  if (formData.address) formData.address = formData.address.trim();
  if (formData.notes) formData.notes = formData.notes.trim();

  // Service ID validation
  if (!formData.serviceId || !formData.serviceId.match(/^[0-9a-fA-F]{24}$/)) {
    errors.push('Invalid service ID');
  }

  // Date validation
  if (!formData.date) {
    errors.push('Booking date is required');
  } else {
    const bookingDate = new Date(formData.date);
    if (isNaN(bookingDate.getTime())) {
      errors.push('Invalid date format');
    } else if (bookingDate < new Date().setHours(0, 0, 0, 0)) {
      errors.push('Cannot book dates in the past');
    }
  }

  // Start time validation
  if (!formData.startTime) {
    errors.push('Start time is required');
  } else if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(formData.startTime)) {
    errors.push('Start time must be in HH:MM format');
  }

  // End time validation
  if (!formData.endTime) {
    errors.push('End time is required');
  } else if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(formData.endTime)) {
    errors.push('End time must be in HH:MM format');
  }

  // Validate end time > start time
  if (formData.startTime && formData.endTime) {
    const startMinutes = parseInt(formData.startTime.split(':')[0]) * 60 + parseInt(formData.startTime.split(':')[1]);
    const endMinutes = parseInt(formData.endTime.split(':')[0]) * 60 + parseInt(formData.endTime.split(':')[1]);
    if (endMinutes <= startMinutes) {
      errors.push('End time must be after start time');
    }
  }

  // Address validation (will check service mode in controller)
  if (formData.address && formData.address.length > 500) {
    errors.push('Address cannot exceed 500 characters');
  }

  // Notes validation
  if (formData.notes && formData.notes.length > 1000) {
    errors.push('Notes cannot exceed 1000 characters');
  }

  // Selected package validation
  if (formData.selectedPackageIndex !== undefined) {
    const index = parseInt(formData.selectedPackageIndex);
    if (isNaN(index) || index < 0) {
      errors.push('Invalid package selection');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  // Update request body with sanitized data
  req.body = formData;
  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateOtp,
  validateServiceCreate,
  validateServiceUpdate,
  validateBookingCreate,
  validateReviewCreate,
  validateReviewUpdate,
  validateProviderReply,
};

// Review validation middlewares
function validateReviewCreate(req, res, next) {
  const errors = [];
  const { rating, reviewText, bookingId } = req.body;

  // Rating required and valid
  if (rating === undefined || rating === null || rating === '') {
    errors.push('Rating is required');
  } else if (!isValidRating(rating)) {
    errors.push('Rating must be an integer between 1 and 5');
  }

  // Review text required and length constraints
  const text = (reviewText || '').trim();
  if (!text) {
    errors.push('Review text is required');
  } else if (text.length < REVIEW_TEXT_MIN_LENGTH) {
    errors.push(`Review must be at least ${REVIEW_TEXT_MIN_LENGTH} characters`);
  } else if (text.length > REVIEW_TEXT_MAX_LENGTH) {
    errors.push(`Review must be at most ${REVIEW_TEXT_MAX_LENGTH} characters`);
  }

  // Booking ID required and ObjectId-like
  if (!bookingId || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
    errors.push('Valid bookingId is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  next();
}

function validateReviewUpdate(req, res, next) {
  const errors = [];
  const { rating, reviewText } = req.body;

  if (rating !== undefined && rating !== null && rating !== '') {
    if (!isValidRating(rating)) {
      errors.push('Rating must be an integer between 1 and 5');
    }
  }

  if (reviewText !== undefined) {
    const text = (reviewText || '').trim();
    if (text && text.length < REVIEW_TEXT_MIN_LENGTH) {
      errors.push(`Review must be at least ${REVIEW_TEXT_MIN_LENGTH} characters`);
    }
    if (text && text.length > REVIEW_TEXT_MAX_LENGTH) {
      errors.push(`Review must be at most ${REVIEW_TEXT_MAX_LENGTH} characters`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  next();
}

function validateProviderReply(req, res, next) {
  const text = (req.body.replyText || '').trim();
  if (!text) {
    return res.status(400).json({ success: false, message: 'Reply text is required' });
  }
  if (text.length > PROVIDER_REPLY_MAX_LENGTH) {
    return res.status(400).json({ success: false, message: `Reply must be at most ${PROVIDER_REPLY_MAX_LENGTH} characters` });
  }
  next();
}
