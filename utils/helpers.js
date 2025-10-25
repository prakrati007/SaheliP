/**
 * Utility helper functions for controllers
 */

const { REVIEW_EDIT_WINDOW_HOURS } = require('./constants');
let ReviewModel = null;
try {
  // Lazy-require to avoid circular deps in certain call sites
  ReviewModel = require('../models/Review');
} catch (e) {
  // Ignore if model is not available yet in some contexts
}

/**
 * Calculate pagination metadata
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} totalItems - Total number of items
 * @param {number} pageSize - Items per page (default 12)
 * @returns {Object} Pagination metadata
 */
function calculatePagination(currentPage, totalItems, pageSize = 12) {
  const page = Math.max(1, parseInt(currentPage) || 1);
  const total = Math.max(0, parseInt(totalItems) || 0);
  const size = Math.max(1, parseInt(pageSize) || 12);
  
  const totalPages = Math.ceil(total / size);
  const skip = (page - 1) * size;
  const limit = size;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  // Generate pages array with ellipsis logic
  const pages = [];
  const showPages = 5; // Show current ± 2 pages
  
  if (totalPages <= 7) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    let startPage = Math.max(2, page - 2);
    let endPage = Math.min(totalPages - 1, page + 2);
    
    // Add ellipsis if needed
    if (startPage > 2) {
      pages.push('...');
    }
    
    // Add pages around current
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      pages.push('...');
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  }
  
  return {
    currentPage: page,
    totalPages,
    pageSize: size,
    totalItems: total,
    skip,
    limit,
    hasNext,
    hasPrev,
    pages
  };
}

/**
 * Get minimum price for a service
 * @param {Object} service - Service document
 * @returns {number} Minimum price
 */
function getServiceMinPrice(service) {
  if (!service) return 0;
  
  if (service.pricingType === 'Package' && service.packages && service.packages.length > 0) {
    return Math.min(...service.packages.map(p => p.price || 0));
  }
  
  return service.basePrice || 0;
}

/**
 * Check if service is available on a specific date
 * @param {Object} service - Service document
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {boolean} True if available
 */
function isServiceAvailableOnDate(service, dateString) {
  if (!service || !dateString) return false;
  
  try {
    const date = new Date(dateString);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    
    // Check if day exists in weekly schedule
    const daySchedule = service.weeklySchedule?.find(d => d.day === dayName);
    if (!daySchedule || !daySchedule.slots || daySchedule.slots.length === 0) {
      return false;
    }
    
    // Check if date is not in unavailable dates
    if (service.unavailableDates && service.unavailableDates.length > 0) {
      const dateStr = date.toISOString().split('T')[0];
      const isUnavailable = service.unavailableDates.some(unavailDate => {
        const unavailStr = new Date(unavailDate).toISOString().split('T')[0];
        return unavailStr === dateStr;
      });
      if (isUnavailable) return false;
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'time')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'short') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  
  switch (format) {
    case 'short':
      return `${day}/${month}/${year}`;
    case 'long':
      return `${day} ${monthNames[d.getMonth()]} ${year}`;
    case 'time':
      return `${hours}:${minutes}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Build MongoDB query object from filter params
 * @param {Object} filters - Filter parameters
 * @returns {Object} MongoDB query object
 */
function buildServiceQuery(filters = {}) {
  const query = {
    isActive: true,
    isPaused: false
  };
  
  // Text search
  if (filters.search && filters.search.trim()) {
    query.$text = { $search: filters.search.trim() };
  }
  
  // Category filter
  if (filters.category && filters.category.trim()) {
    query.category = filters.category.trim();
  }
  
  // City filter (case-insensitive)
  if (filters.city && filters.city.trim()) {
    query.city = { $regex: new RegExp(filters.city.trim(), 'i') };
  }
  
  // Price range filter
  // For Hourly/Fixed pricing types, basePrice is used.
  // For Package pricing, we check if any package falls within the price range.
  if (filters.priceMin || filters.priceMax) {
    const priceMin = filters.priceMin ? parseFloat(filters.priceMin) : 0;
    const priceMax = filters.priceMax ? parseFloat(filters.priceMax) : Number.MAX_SAFE_INTEGER;
    
    // Build condition: service must have at least one pricing option within range
    const priceConditions = [];
    
    // Condition 1: basePrice is within range (for Hourly/Fixed pricing)
    const basePriceCondition = {
      basePrice: { $gte: priceMin, $lte: priceMax }
    };
    priceConditions.push(basePriceCondition);
    
    // Condition 2: at least one package price is within range (for Package pricing)
    const packagePriceCondition = {
      pricingType: 'Package',
      packages: {
        $elemMatch: { 
          price: { $gte: priceMin, $lte: priceMax }
        }
      }
    };
    priceConditions.push(packagePriceCondition);
    
    // Use $or to match services with either basePrice or package price in range
    query.$or = priceConditions;
  }
  
  // Minimum rating filter
  if (filters.rating) {
    const minRating = parseFloat(filters.rating);
    if (!isNaN(minRating) && minRating > 0) {
      query.averageRating = { $gte: minRating };
    }
  }
  
  // Available date filter (complex - requires checking weeklySchedule and unavailableDates)
  // This is a simplified version; full implementation would need aggregation
  if (filters.availableDate) {
    try {
      const date = new Date(filters.availableDate);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      
      // Check if day exists in schedule
      query['weeklySchedule.day'] = dayName;
      query['weeklySchedule.slots.0'] = { $exists: true };
      
      // Check date is not unavailable
      const dateStr = date.toISOString().split('T')[0];
      query.unavailableDates = { $not: { $elemMatch: { $eq: new Date(dateStr) } } };
    } catch (err) {
      // Invalid date, skip filter
    }
  }
  
  return query;
}

/**
 * Build MongoDB sort object from sort parameter
 * Note: For price sorting, basePrice is used for all pricing types.
 * For Package-type services, basePrice should be set to the minimum package price during creation.
 * This ensures consistent sorting across all pricing types.
 * @param {string} sortParam - Sort parameter ('newest', 'price-low', 'price-high', 'rating')
 * @returns {Object} MongoDB sort object
 */
function buildServiceSort(sortParam) {
  switch (sortParam) {
    case 'newest':
      return { createdAt: -1 };
    case 'price-low':
      // Sort by basePrice ascending (lowest first)
      // For Package services, basePrice represents the minimum package price
      return { basePrice: 1 };
    case 'price-high':
      // Sort by basePrice descending (highest first)
      // For Package services, basePrice represents the minimum package price
      return { basePrice: -1 };
    case 'rating':
      return { averageRating: -1, reviewCount: -1 };
    default:
      return { createdAt: -1 };
  }
}

// ===== BOOKING SYSTEM HELPERS =====

/**
 * Calculate booking price with all applicable charges
 * @param {Object} service - Service document
 * @param {Date|string} date - Booking date
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {Object} selectedPackage - Selected package (if Package pricing type)
 * @returns {Object} Pricing breakdown
 */
function calculateBookingPrice(service, date, startTime, endTime, selectedPackage = null) {
  const bookingDate = new Date(date);
  const duration = calculateDuration(startTime, endTime);
  const weekend = isWeekend(bookingDate);
  
  let baseAmount = 0;
  
  // Calculate base amount based on pricing type
  if (service.pricingType === 'Hourly') {
    baseAmount = service.basePrice * duration;
  } else if (service.pricingType === 'Fixed') {
    baseAmount = service.basePrice;
  } else if (service.pricingType === 'Package' && selectedPackage) {
    baseAmount = selectedPackage.price;
  }
  
  // Calculate weekend premium
  let weekendPremium = 0;
  if (weekend && service.weekendPremium) {
    weekendPremium = Math.round(baseAmount * (service.weekendPremium / 100));
  }
  
  // Add travel fee for onsite/hybrid services
  let travelFee = 0;
  if ((service.mode === 'Onsite' || service.mode === 'Hybrid') && service.travelFee) {
    travelFee = service.travelFee;
  }
  
  // Calculate total
  const totalAmount = baseAmount + weekendPremium + travelFee;
  
  // Calculate advance and remaining
  const advancePercentage = service.advancePercentage || 0;
  const advancePaid = Math.round(totalAmount * (advancePercentage / 100));
  const remainingAmount = totalAmount - advancePaid;
  
  return {
    baseAmount,
    travelFee,
    weekendPremium,
    totalAmount,
    advancePercentage,
    advancePaid,
    remainingAmount,
    isWeekend: weekend
  };
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
function parseTimeToMinutes(timeString) {
  if (!timeString || typeof timeString !== 'string') return 0;
  const parts = timeString.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Calculate duration in hours between two times
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {number} Duration in hours
 */
function calculateDuration(startTime, endTime) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  return (endMinutes - startMinutes) / 60;
}

/**
 * Check if two time slots overlap
 * @param {string} slot1Start - First slot start time (HH:MM)
 * @param {string} slot1End - First slot end time (HH:MM)
 * @param {string} slot2Start - Second slot start time (HH:MM)
 * @param {string} slot2End - Second slot end time (HH:MM)
 * @returns {boolean} True if slots overlap
 */
function isTimeSlotOverlap(slot1Start, slot1End, slot2Start, slot2End) {
  const start1 = parseTimeToMinutes(slot1Start);
  const end1 = parseTimeToMinutes(slot1End);
  const start2 = parseTimeToMinutes(slot2Start);
  const end2 = parseTimeToMinutes(slot2End);
  
  return (start1 < end2 && end1 > start2);
}

/**
 * Check if date is weekend (Saturday or Sunday)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if weekend
 */
function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Add minutes to a date
 * @param {Date} date - Original date
 * @param {number} minutes - Minutes to add
 * @returns {Date} New date with added minutes
 */
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Combine a date and HH:MM time string into a Date object
 * @param {Date|string} date - Base date
 * @param {string} timeString - Time in HH:MM
 * @returns {Date}
 */
function combineDateTime(date, timeString) {
  const d = new Date(date);
  if (!timeString || typeof timeString !== 'string') return d;
  const [hh, mm] = timeString.split(':').map(Number);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

/**
 * Get hours until booking start from now
 * @param {Object} booking - Booking document or plain object
 * @returns {number} - Positive hours until start, negative if already started/past
 */
function getHoursUntilBooking(booking) {
  if (!booking) return 0;
  const start = combineDateTime(booking.date, booking.startTime);
  const diffMs = start.getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Calculate refund amount based on hours until booking and cancellation policy.
 * Attempts to parse service.cancellationPolicy if present, otherwise uses multi-tier default.
 * Default tiers:
 *  - >= 48 hours before: 100% of advance
 *  - >= 24 and < 48 hours: 75% of advance
 *  - >= 12 and < 24 hours: 50% of advance
 *  - >= 6 and < 12 hours: 25% of advance
 *  - < 6 hours: 0%
 * @param {Object} service - Service document with optional cancellationPolicy string
 * @param {Object} booking - Booking document with advancePaid
 * @param {Date} [cancelledAt=new Date()] - Time of cancellation
 * @returns {{percentage:number, amount:number}}
 */
function calculateRefundAmount(service, booking, cancelledAt = new Date()) {
  const hours = getHoursUntilBooking(booking);
  let percentage = 0;
  
  // Try to parse cancellationPolicy string for common patterns
  if (service && service.cancellationPolicy && typeof service.cancellationPolicy === 'string') {
    const policy = service.cancellationPolicy.toLowerCase();
    
    // Pattern: "full refund 24 hours", "100% refund 24 hours", etc.
    const fullMatch = policy.match(/(full|100%?)\s*refund.*?(\d+)\s*hours?/i);
    if (fullMatch) {
      const threshold = parseInt(fullMatch[2], 10);
      if (hours >= threshold) {
        percentage = 100;
      }
    }
    
    // Pattern: "50% refund up to 12 hours", "50% 12 hours", etc.
    const halfMatch = policy.match(/50%?\s*.*?(\d+)\s*hours?/i);
    if (halfMatch && percentage === 0) {
      const threshold = parseInt(halfMatch[1], 10);
      if (hours >= threshold) {
        percentage = 50;
      }
    }
    
    // Pattern: "no refund", "non-refundable"
    if (policy.includes('no refund') || policy.includes('non-refundable')) {
      percentage = 0;
    }
  }
  
  // If no policy matched, use multi-tier default
  if (percentage === 0 && hours > 0) {
    if (hours >= 48) {
      percentage = 100;
    } else if (hours >= 24) {
      percentage = 75;
    } else if (hours >= 12) {
      percentage = 50;
    } else if (hours >= 6) {
      percentage = 25;
    } else {
      percentage = 0;
    }
  }

  const advance = booking.advancePaid || 0;
  const amount = Math.round((advance * percentage) / 100);
  return { percentage, amount };
}

/**
 * Format booking date and time for display
 * @param {Date|string} date - Booking date
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {string} Formatted date and time string
 */
function formatBookingDateTime(date, startTime, endTime) {
  const d = new Date(date);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  
  // Convert times to 12-hour format
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };
  
  return `${day} ${month} ${year}, ${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Validate booking slot against service availability
 * @param {Object} service - Service document
 * @param {Date|string} date - Booking date
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
function validateBookingSlot(service, date, startTime, endTime) {
  const bookingDate = new Date(date);
  const now = new Date();
  
  // Check if booking is in the past
  if (bookingDate < now.setHours(0, 0, 0, 0)) {
    return { valid: false, error: 'Cannot book dates in the past' };
  }
  
  // Check advance booking limit
  if (service.advanceBookingLimit) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + service.advanceBookingLimit);
    if (bookingDate > maxDate) {
      return { 
        valid: false, 
        error: `Bookings can only be made up to ${service.advanceBookingLimit} days in advance` 
      };
    }
  }
  
  // Check if date is in unavailable dates
  if (service.unavailableDates && service.unavailableDates.length > 0) {
    const dateStr = bookingDate.toISOString().split('T')[0];
    const isUnavailable = service.unavailableDates.some(unavailDate => {
      const unavailStr = new Date(unavailDate).toISOString().split('T')[0];
      return unavailStr === dateStr;
    });
    if (isUnavailable) {
      return { valid: false, error: 'This date is marked as unavailable by the provider' };
    }
  }
  
  // Check if day exists in weekly schedule
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[bookingDate.getDay()];
  const daySchedule = service.weeklySchedule?.find(d => d.day === dayName);
  
  if (!daySchedule || !daySchedule.slots || daySchedule.slots.length === 0) {
    return { valid: false, error: `Provider is not available on ${dayName}s` };
  }
  
  // Check if time slot falls within provider's available slots
  const bookingStartMinutes = parseTimeToMinutes(startTime);
  const bookingEndMinutes = parseTimeToMinutes(endTime);
  
  const isWithinSchedule = daySchedule.slots.some(slot => {
    // Accept both slot.start/slot.end and slot.startTime/slot.endTime
    const slotStart = slot.startTime || slot.start;
    const slotEnd = slot.endTime || slot.end;
    const slotStartMinutes = parseTimeToMinutes(slotStart);
    const slotEndMinutes = parseTimeToMinutes(slotEnd);
    return bookingStartMinutes >= slotStartMinutes && bookingEndMinutes <= slotEndMinutes;
  });
  
  if (!isWithinSchedule) {
    return { 
      valid: false, 
      error: 'Selected time is outside provider\'s available hours' 
    };
  }
  
  return { valid: true, error: null };
}

// ===== REVIEW SYSTEM HELPERS =====

/**
 * Format a review date into a human readable relative string.
 * Fallbacks to DD/MM/YYYY HH:MM when older than ~30 days.
 * @param {Date|string} date
 * @returns {string}
 */
function formatReviewDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 30) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 30) return `${diffDay}d ago`;

  // Fallback to a readable absolute format
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Check if the current user can edit a review (owner and within editable window and not replied by provider).
 * @param {Object} review - Review document
 * @param {Object} user - Current user (expects _id and role)
 * @returns {boolean}
 */
function canEditReview(review, user) {
  if (!review || !user) return false;
  const isOwner = String(review.customerId) === String(user._id);
  if (!isOwner) return false;

  // If provider has replied, lock editing to preserve conversation context
  if (review.providerReply) return false;

  // Respect editable window (uses review.editableUntil if present, else calculate from createdAt)
  const now = new Date();
  const editableUntil = review.editableUntil
    ? new Date(review.editableUntil)
    : new Date(new Date(review.createdAt).getTime() + (REVIEW_EDIT_WINDOW_HOURS || 24) * 60 * 60 * 1000);
  return now <= editableUntil;
}

/**
 * Render a 5-star rating as HTML spans that can be styled via CSS.
 * Adds classes: star, filled, half, empty
 * @param {number|string} rating - 0..5, supports halves
 * @param {Object} [options]
 * @param {boolean} [options.interactive=false] - If true, include data-value for each star (1..5)
 * @param {string} [options.size='md'] - Size modifier class
 * @returns {string}
 */
function getStarRatingHTML(rating, options = {}) {
  const { interactive = false, size = 'md' } = options;
  let r = parseFloat(rating);
  if (isNaN(r)) r = 0;
  r = Math.max(0, Math.min(5, r));
  // Round to nearest half
  r = Math.round(r * 2) / 2;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = r - i;
    let cls = 'empty';
    if (diff >= 0) cls = 'filled';
    else if (diff === -0.5) cls = 'half';
    const attrs = [
      `class="star ${cls} ${size}"`,
      interactive ? `data-value="${i}"` : null
    ].filter(Boolean).join(' ');
    stars.push(`<span ${attrs} aria-hidden="true"></span>`);
  }
  const srText = `${r} out of 5`;
  return `<span class="stars" data-rating="${r}" role="img" aria-label="${srText}">${stars.join('')}<span class="sr-only">${srText}</span></span>`;
}

/**
 * Wrapper to trigger service rating recalculation for a given serviceId.
 * Uses Review.recalculateServiceRating if available.
 * @param {string|import('mongoose').Types.ObjectId} serviceId
 */
async function recalculateServiceRating(serviceId) {
  if (!ReviewModel || !serviceId) return;
  try {
    await ReviewModel.recalculateServiceRating(serviceId);
  } catch (err) {
    // Swallow to avoid breaking user flows; controller can log if needed
  }
}

module.exports = {
  calculatePagination,
  getServiceMinPrice,
  isServiceAvailableOnDate,
  formatDate,
  buildServiceQuery,
  buildServiceSort,
  calculateBookingPrice,
  parseTimeToMinutes,
  calculateDuration,
  isTimeSlotOverlap,
  isWeekend,
  addMinutes,
  formatBookingDateTime,
  validateBookingSlot,
  combineDateTime,
  getHoursUntilBooking,
  calculateRefundAmount,
  // Review helpers
  formatReviewDate,
  canEditReview,
  getStarRatingHTML,
  recalculateServiceRating
};

