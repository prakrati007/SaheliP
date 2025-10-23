const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { isAuthenticated } = require('../middleware/auth');
const { uploadProfilePic, validateImageFile, handleMulterError } = require('../middleware/upload');

router.get('/view', isAuthenticated, profileController.renderViewProfile);
router.get('/edit', isAuthenticated, profileController.renderEditProfile);
router.post('/edit', isAuthenticated, uploadProfilePic, validateImageFile, handleMulterError, profileController.updateProfile);
router.post('/delete-picture', isAuthenticated, profileController.deleteProfilePic);

module.exports = router;
