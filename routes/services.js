const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { isAuthenticated, requireRole, ensureServiceOwner } = require('../middleware/auth');
const { validateServiceCreate, validateServiceUpdate } = require('../middleware/validation');
const { uploadServiceImages, validateServiceImages, handleServiceMulterError } = require('../middleware/upload');

// GET routes
router.get('/add', isAuthenticated, requireRole('saheli'), serviceController.renderAddService);
router.get('/my', isAuthenticated, requireRole('saheli'), serviceController.renderMyServices);
router.get('/:id/edit', isAuthenticated, requireRole('saheli'), ensureServiceOwner, serviceController.renderEditService);
router.get('/:id', isAuthenticated, requireRole('saheli'), serviceController.getServiceById);

// POST create
router.post('/', isAuthenticated, requireRole('saheli'), uploadServiceImages.array('serviceImages', 5), validateServiceImages, handleServiceMulterError, validateServiceCreate, serviceController.createService);

// PUT update
router.put('/:id', isAuthenticated, requireRole('saheli'), ensureServiceOwner, uploadServiceImages.array('serviceImages', 5), validateServiceImages, handleServiceMulterError, validateServiceUpdate, serviceController.updateService);

// DELETE
router.delete('/:id', isAuthenticated, requireRole('saheli'), ensureServiceOwner, serviceController.deleteService);

// PATCH toggle status
router.patch('/:id/toggle', isAuthenticated, requireRole('saheli'), ensureServiceOwner, serviceController.toggleServiceStatus);

module.exports = router;
