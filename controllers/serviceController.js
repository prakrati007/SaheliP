const Service = require('../models/Service');
const User = require('../models/User');
const { SERVICE_CATEGORIES, PRICING_TYPES, SERVICE_MODES, DAYS_OF_WEEK } = require('../utils/constants');
const fs = require('fs').promises;
const path = require('path');

// Helper: Delete service images from filesystem
async function deleteServiceImages(imagePaths) {
  for (const img of imagePaths) {
    try {
      const fullPath = path.join(__dirname, '../public', img.startsWith('/') ? img : '/' + img);
      await fs.unlink(fullPath);
    } catch (err) {
      // Ignore if file doesn't exist
    }
  }
}

// GET /services/add
async function renderAddService(req, res) {
  res.render('pages/services/add', {
    title: 'Add New Service',
    categories: SERVICE_CATEGORIES,
    pricingTypes: PRICING_TYPES,
    modes: SERVICE_MODES,
    daysOfWeek: DAYS_OF_WEEK,
    errors: [],
    formData: {},
    servicePage: true
  });
}

// GET /services/my
async function renderMyServices(req, res) {
  try {
    const userId = req.session.user.id;
    const services = await Service.findByProvider(userId, true);
    res.render('pages/services/my-services', {
      title: 'My Services',
      services,
      servicePage: true
    });
  } catch (err) {
    res.render('pages/services/my-services', {
      title: 'My Services',
      services: [],
      errors: ['Failed to load services'],
      servicePage: true
    });
  }
}

// GET /services/:id/edit
async function renderEditService(req, res) {
  res.render('pages/services/edit', {
    title: 'Edit Service',
    service: req.service,
    categories: SERVICE_CATEGORIES,
    pricingTypes: PRICING_TYPES,
    modes: SERVICE_MODES,
    daysOfWeek: DAYS_OF_WEEK,
    errors: [],
    servicePage: true
  });
}

// POST /services
async function createService(req, res) {
  try {
    const {
      title, category, subcategory, description, pricingType, basePrice, packages,
      advancePercentage, travelFee, weekendPremium, mode, city, pincode,
      weeklySchedule, unavailableDates, maxBookingsPerDay, advanceBookingLimit, preparationTime,
      languages, experienceYears, certifications, cancellationPolicy
    } = req.body;
    const providerId = req.session.user.id;
    const images = (req.files || []).map(f => '/uploads/services/' + f.filename);

    // Parse complex fields with friendly error handling
    let parsedPackages = [];
    let parsedWeeklySchedule = [];
    try {
      parsedPackages = pricingType === 'Package' ? JSON.parse(packages || '[]') : undefined;
    } catch (e) {
      throw new Error('Invalid packages data. Please re-add your packages.');
    }
    try {
      parsedWeeklySchedule = JSON.parse(weeklySchedule || '[]');
    } catch (e) {
      throw new Error('Invalid availability schedule data. Please set your weekly schedule again.');
    }

    const service = new Service({
      providerId,
      title,
      category,
      subcategory,
      description,
      pricingType,
      basePrice: Number(basePrice),
      packages: parsedPackages,
      advancePercentage: advancePercentage ? Number(advancePercentage) : undefined,
      travelFee: travelFee ? Number(travelFee) : undefined,
      weekendPremium: weekendPremium ? Number(weekendPremium) : undefined,
      mode,
      city,
      pincode,
      weeklySchedule: parsedWeeklySchedule,
      unavailableDates: unavailableDates ? (Array.isArray(unavailableDates) ? unavailableDates : [unavailableDates]) : [],
      maxBookingsPerDay: maxBookingsPerDay ? Number(maxBookingsPerDay) : undefined,
      advanceBookingLimit: advanceBookingLimit ? Number(advanceBookingLimit) : undefined,
      preparationTime: preparationTime ? Number(preparationTime) : undefined,
      images,
      languages: languages ? (Array.isArray(languages) ? languages : languages.split(',').map(l => l.trim())) : [],
      experienceYears: experienceYears ? Number(experienceYears) : undefined,
      certifications: certifications ? (Array.isArray(certifications) ? certifications : certifications.split(',').map(c => c.trim())) : [],
      cancellationPolicy
    });
    await service.save();
    res.redirect('/services/my?message=Service created successfully');
  } catch (err) {
    if (req.files) await deleteServiceImages(req.files.map(f => '/uploads/services/' + f.filename));
    // Build friendly error messages
    let errorMessages = [];
    if (err && err.name === 'ValidationError') {
      errorMessages = Object.values(err.errors).map(e => e.message);
    } else if (err && err.message) {
      errorMessages = [err.message];
    } else {
      errorMessages = ['Failed to create service'];
    }
    res.render('pages/services/add', {
      title: 'Add New Service',
      categories: SERVICE_CATEGORIES,
      pricingTypes: PRICING_TYPES,
      modes: SERVICE_MODES,
      daysOfWeek: DAYS_OF_WEEK,
      errors: errorMessages,
      formData: req.body,
      servicePage: true
    });
  }
}

// PUT /services/:id
async function updateService(req, res) {
  try {
    const service = req.service;
    const {
      title, category, subcategory, description, pricingType, basePrice, packages,
      advancePercentage, travelFee, weekendPremium, mode, city, pincode,
      weeklySchedule, unavailableDates, maxBookingsPerDay, advanceBookingLimit, preparationTime,
      languages, experienceYears, certifications, cancellationPolicy, deleteImages
    } = req.body;
    // Update fields if provided
    if (title) service.title = title;
    if (category) service.category = category;
    if (subcategory) service.subcategory = subcategory;
    if (description) service.description = description;
    if (pricingType) {
      service.pricingType = pricingType;
      // Clear packages if switching away from Package pricing
      if (pricingType !== 'Package') {
        service.packages = undefined;
      }
    }
    if (basePrice) service.basePrice = Number(basePrice);
    if (pricingType === 'Package' && packages) service.packages = JSON.parse(packages);
    if (advancePercentage) service.advancePercentage = Number(advancePercentage);
    if (travelFee) service.travelFee = Number(travelFee);
    if (weekendPremium) service.weekendPremium = Number(weekendPremium);
    if (mode) service.mode = mode;
    if (city) service.city = city;
    if (pincode) service.pincode = pincode;
    if (weeklySchedule) service.weeklySchedule = JSON.parse(weeklySchedule);
    if (unavailableDates) service.unavailableDates = Array.isArray(unavailableDates) ? unavailableDates : [unavailableDates];
    if (maxBookingsPerDay) service.maxBookingsPerDay = Number(maxBookingsPerDay);
    if (advanceBookingLimit) service.advanceBookingLimit = Number(advanceBookingLimit);
    if (preparationTime) service.preparationTime = Number(preparationTime);
    if (languages) service.languages = Array.isArray(languages) ? languages : languages.split(',').map(l => l.trim());
    if (experienceYears) service.experienceYears = Number(experienceYears);
    if (certifications) service.certifications = Array.isArray(certifications) ? certifications : certifications.split(',').map(c => c.trim());
    if (cancellationPolicy) service.cancellationPolicy = cancellationPolicy;
    // Handle new images
    if (req.files && req.files.length > 0) {
      if (service.images.length + req.files.length > 5) {
        await deleteServiceImages(req.files.map(f => '/uploads/services/' + f.filename));
        return res.render('pages/services/edit', {
          title: 'Edit Service',
          service,
          categories: SERVICE_CATEGORIES,
          pricingTypes: PRICING_TYPES,
          modes: SERVICE_MODES,
          daysOfWeek: DAYS_OF_WEEK,
          errors: ['Maximum 5 images allowed'],
          servicePage: true
        });
      }
      service.images.push(...req.files.map(f => '/uploads/services/' + f.filename));
    }
    // Handle image deletion
    if (deleteImages) {
      const indices = deleteImages.split(',').map(i => parseInt(i)).filter(i => !isNaN(i));
      const toDelete = indices.map(i => service.images[i]).filter(Boolean);
      service.images = service.images.filter((img, idx) => !indices.includes(idx));
      await deleteServiceImages(toDelete);
    }
    await service.save();
    res.redirect('/services/my?message=Service updated successfully');
  } catch (err) {
    if (req.files) await deleteServiceImages(req.files.map(f => '/uploads/services/' + f.filename));
    // Build friendly error messages
    let errorMessages = [];
    if (err && err.name === 'ValidationError') {
      errorMessages = Object.values(err.errors).map(e => e.message);
    } else if (err && err.message) {
      errorMessages = [err.message];
    } else {
      errorMessages = ['Failed to update service'];
    }
    res.render('pages/services/edit', {
      title: 'Edit Service',
      service: req.service,
      categories: SERVICE_CATEGORIES,
      pricingTypes: PRICING_TYPES,
      modes: SERVICE_MODES,
      daysOfWeek: DAYS_OF_WEEK,
      errors: errorMessages,
      servicePage: true
    });
  }
}

// DELETE /services/:id
async function deleteService(req, res) {
  try {
    const service = req.service;
    await deleteServiceImages(service.images);
    await service.deleteOne();
    res.redirect('/services/my?message=Service deleted successfully');
  } catch (err) {
    res.render('pages/services/my-services', {
      title: 'My Services',
      services: [],
      errors: ['Failed to delete service'],
      servicePage: true
    });
  }
}

// PATCH /services/:id/toggle
async function toggleServiceStatus(req, res) {
  try {
    const service = req.service;
    await service.toggleStatus();
    res.json({ success: true, isPaused: service.isPaused, message: service.isPaused ? 'Service paused' : 'Service activated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle status' });
  }
}

// GET /services/:id
async function getServiceById(req, res) {
  try {
    const service = await Service.findById(req.params.id).populate('providerId', 'name email');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
}

module.exports = {
  renderAddService,
  renderMyServices,
  renderEditService,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  getServiceById
};
