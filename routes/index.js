const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');

/**
 * GET /
 * Homepage route - Public
 */
router.get('/', publicController.renderHomepage);

/**
 * GET /services
 * Service listing with filters - Public
 */
router.get('/services', publicController.searchServices);

/**
 * GET /service/:id
 * Service detail page - Public
 */
router.get('/service/:id', publicController.viewServiceDetail);

/**
 * GET /dashboard
 * Role-based dashboard - Requires authentication
 */
router.get('/dashboard', isAuthenticated, dashboardController.renderDashboard);

module.exports = router;
