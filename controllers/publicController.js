/**
 * Public Controller - Public-facing service discovery features
 */

const Service = require('../models/Service');
const User = require('../models/User');
const { SERVICE_CATEGORIES } = require('../utils/constants');
const { 
  calculatePagination, 
  buildServiceQuery, 
  buildServiceSort 
} = require('../utils/helpers');

/**
 * Render homepage with search bar, categories, and featured services
 * GET /
 */
async function renderHomepage(req, res) {
  try {
    // Fetch featured services (top 6 by rating, fallback to newest)
    let featuredServices = await Service.find({
      isActive: true,
      isPaused: false,
      reviewCount: { $gt: 0 }
    })
    .sort({ averageRating: -1, reviewCount: -1 })
    .limit(6)
    .populate('providerId', 'name city profilePic hasVerificationBadge');
    
    // Fallback to newest if no rated services
    if (!featuredServices || featuredServices.length === 0) {
      featuredServices = await Service.find({
        isActive: true,
        isPaused: false
      })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('providerId', 'name city profilePic hasVerificationBadge');
    }
    
    res.render('pages/index', {
      title: 'Saheli Plus - Empowering Women Service Providers',
      categories: SERVICE_CATEGORIES,
      featuredServices,
      homePage: true
    });
  } catch (err) {
    console.error('Error rendering homepage:', err);
    res.render('pages/index', {
      title: 'Saheli Plus - Empowering Women Service Providers',
      categories: SERVICE_CATEGORIES,
      featuredServices: [],
      homePage: true
    });
  }
}

/**
 * Search and list services with filters
 * GET /services
 */
async function searchServices(req, res) {
  try {
    // Extract query parameters
    const filters = {
      search: req.query.search || '',
      category: req.query.category || '',
      city: req.query.city || '',
      priceMin: req.query.priceMin || '',
      priceMax: req.query.priceMax || '',
      rating: req.query.rating || '',
      availableDate: req.query.availableDate || '',
      sort: req.query.sort || 'newest',
      page: req.query.page || 1
    };
    
    // Build query using helper
    const query = buildServiceQuery(filters);
    
    // Build sort using helper
    const sort = buildServiceSort(filters.sort);
    
    // Debug logging for price filters
    if (filters.priceMin || filters.priceMax) {
      console.log(`[PRICE FILTER] Min: ${filters.priceMin}, Max: ${filters.priceMax}`);
      console.log(`[PRICE FILTER] Query: ${JSON.stringify(query.$or || query.basePrice)}`);
    }
    
    // Count total matching services
    const totalCount = await Service.countDocuments(query);
    
    // Calculate pagination
    const pagination = calculatePagination(filters.page, totalCount, 12);
    
    // Fetch services with pagination
    const services = await Service.find(query)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('providerId', 'name city profilePic experienceYears hasVerificationBadge');
    
    // Debug logging
    console.log(`[SEARCH] Found ${services.length} services`);
    console.log(`[SEARCH] Query: ${JSON.stringify(query)}`);
    console.log(`[SEARCH] Total count: ${totalCount}`);
    
    res.render('pages/services/search', {
      title: 'Browse Services',
      services,
      filters,
      categories: SERVICE_CATEGORIES,
      pagination,
      searchPage: true
    });
  } catch (err) {
    console.error('Error searching services:', err);
    res.render('pages/services/search', {
      title: 'Browse Services',
      services: [],
      filters: req.query,
      categories: SERVICE_CATEGORIES,
      pagination: { currentPage: 1, totalPages: 0, pages: [], hasNext: false, hasPrev: false },
      searchPage: true,
      errors: ['Failed to load services. Please try again.']
    });
  }
}

/**
 * View service detail page
 * GET /service/:id
 */
async function viewServiceDetail(req, res) {
  try {
    const serviceId = req.params.id;
    
    // Find service with full provider details
    const service = await Service.findById(serviceId)
      .populate('providerId', 'name email city profilePic bio languages experienceYears certifications completedBookingsCount hasVerificationBadge');
    
    // Return 404 if not found or not active
    if (!service || !service.isActive) {
      return res.status(404).render('errors/404', {
        title: 'Service Not Found',
        message: 'The service you are looking for does not exist or is no longer available.'
      });
    }
    
    // Increment view count
    await service.incrementViewCount();
    
    // Fetch related services (same category, same city, exclude current, limit 4)
    const relatedServices = await Service.find({
      _id: { $ne: serviceId },
      category: service.category,
      city: service.city,
      isActive: true,
      isPaused: false
    })
    .sort({ averageRating: -1, reviewCount: -1 })
    .limit(4)
    .populate('providerId', 'name city profilePic hasVerificationBadge');
    
    // Build availability map from weeklySchedule
    const availabilityMap = {};
    if (service.weeklySchedule && service.weeklySchedule.length > 0) {
      service.weeklySchedule.forEach(daySchedule => {
        availabilityMap[daySchedule.day] = daySchedule.slots || [];
      });
    }
    
    res.render('pages/services/detail', {
      title: service.title,
      service,
      provider: service.providerId,
      relatedServices,
      availabilityMap,
      detailPage: true
    });
  } catch (err) {
    console.error('Error loading service detail:', err);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load service details. Please try again later.'
    });
  }
}

module.exports = {
  renderHomepage,
  searchServices,
  viewServiceDetail
};
