const mongoose = require('mongoose');
const { SERVICE_CATEGORIES, PRICING_TYPES, SERVICE_MODES, DAYS_OF_WEEK, getSubcategories, isValidCategorySubcategory, TIME_SLOT_REGEX } = require('../utils/constants');
const { v4: uuidv4 } = require('uuid');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  price: { type: Number, required: true, min: 0, max: 100000 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  duration: { type: String, required: true, trim: true, maxlength: 50 }
}, { _id: false });

const timeSlotSchema = new mongoose.Schema({
  start: { type: String, required: true, match: TIME_SLOT_REGEX },
  end: { type: String, required: true, match: TIME_SLOT_REGEX }
}, { _id: false });

const dayScheduleSchema = new mongoose.Schema({
  day: { type: String, required: true, enum: DAYS_OF_WEEK },
  slots: { type: [timeSlotSchema], required: true, validate: v => v.length > 0 }
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100, index: 'text' },
  category: { type: String, required: true, enum: Object.keys(SERVICE_CATEGORIES), index: true },
  subcategory: { type: String, validate: {
    validator: function(val) {
      if (!val) return true;
      return isValidCategorySubcategory(this.category, val);
    },
    message: 'Invalid subcategory for selected category.'
  } },
  description: { type: String, required: true, trim: true, minlength: 50, maxlength: 2000, index: 'text' },
  pricingType: { type: String, required: true, enum: PRICING_TYPES },
  basePrice: { type: Number, required: true, min: 0, max: 100000 },
  packages: { type: [packageSchema], default: undefined },
  advancePercentage: { type: Number, default: 20, min: 0, max: 50 },
  travelFee: { type: Number, default: 0, min: 0, max: 5000 },
  weekendPremium: { type: Number, default: 0, min: 0, max: 15 },
  mode: { type: String, required: true, enum: SERVICE_MODES },
  city: { type: String, required: true, trim: true, minlength: 2, maxlength: 50, index: true },
  pincode: { type: String, required: true, match: /^\d{6}$/ },
  serviceRadius: { type: Number, min: 0, max: 100 },
  weeklySchedule: { type: [dayScheduleSchema], required: true, validate: v => v.length > 0 },
  unavailableDates: { type: [Date], default: [] },
  maxBookingsPerDay: { type: Number, default: 5, min: 1, max: 20 },
  advanceBookingLimit: { type: Number, default: 30, min: 1, max: 365 },
  preparationTime: { type: Number, default: 0, min: 0, max: 48 },
  images: { type: [String], default: [], validate: v => v.length <= 5 },
  languages: { type: [String], default: [] },
  experienceYears: { type: Number, min: 0, max: 50 },
  certifications: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  cancellationPolicy: { type: String, maxlength: 500 },
}, { timestamps: true });

serviceSchema.index({ providerId: 1, isActive: 1 });
serviceSchema.index({ category: 1, city: 1, isActive: 1 });
serviceSchema.index({ title: 'text', description: 'text' });

serviceSchema.virtual('primaryImage').get(function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

serviceSchema.virtual('isAvailable').get(function() {
  return this.isActive && !this.isPaused;
});

serviceSchema.methods.toggleStatus = function() {
  this.isPaused = !this.isPaused;
  return this.save();
};

serviceSchema.methods.incrementViewCount = function() {
  return this.updateOne({ $inc: { viewCount: 1 } });
};

serviceSchema.methods.addImage = function(imagePath) {
  if (this.images.length < 5) {
    this.images.push(imagePath);
    return this.save();
  }
  throw new Error('Maximum 5 images allowed');
};

serviceSchema.methods.removeImage = function(imagePath) {
  this.images = this.images.filter(img => img !== imagePath);
  return this.save();
};

serviceSchema.statics.findByProvider = function(providerId, includeInactive = false) {
  const query = { providerId };
  if (!includeInactive) query.isActive = true;
  return this.find(query).sort({ createdAt: -1 });
};

serviceSchema.statics.findActiveByCategory = function(category, city) {
  return this.find({ category, city, isActive: true, isPaused: false });
};

serviceSchema.statics.validateAvailability = function(weeklySchedule) {
  if (!Array.isArray(weeklySchedule) || weeklySchedule.length === 0) return false;
  for (const day of weeklySchedule) {
    if (!DAYS_OF_WEEK.includes(day.day)) return false;
    if (!Array.isArray(day.slots) || day.slots.length === 0) return false;
    for (const slot of day.slots) {
      if (!TIME_SLOT_REGEX.test(slot.start) || !TIME_SLOT_REGEX.test(slot.end)) return false;
      if (slot.start >= slot.end) return false;
    }
  }
  return true;
};

serviceSchema.pre('save', function(next) {
  if (this.pricingType === 'Package') {
    if (!Array.isArray(this.packages) || this.packages.length === 0) {
      return next(new Error('At least one package is required for Package pricing type'));
    }
  }
  if ((this.mode === 'Onsite' || this.mode === 'Hybrid') && (this.serviceRadius == null)) {
    return next(new Error('Service radius is required for Onsite/Hybrid mode'));
  }
  if (!this.weeklySchedule || this.weeklySchedule.length === 0) {
    return next(new Error('At least one weekly schedule is required'));
  }
  next();
});

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
