const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Profile image storage
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/profiles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const uploadProfilePic = multer({
  storage: profileStorage,
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('profilePic');

// Service image storage
const serviceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/services');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const uploadServiceImages = multer({
  storage: serviceStorage,
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }
});

// Review image storage
const reviewStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/reviews');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const uploadReviewImage = multer({
  storage: reviewStorage,
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('reviewImage');

function validateImageFile(req, res, next) {
  // Profile picture is optional - only validate if a file is uploaded
  if (!req.file) {
    return next();
  }
  
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    fs.unlinkSync(req.file.path);
    return res.render('pages/profile/edit', {
      title: 'Edit Profile',
      errors: ['Invalid image file type. Please use JPG, PNG, or WebP.'],
      formData: req.body,
      profilePage: true
    });
  }
  next();
}

function validateServiceImages(req, res, next) {
  if (!req.files || !Array.isArray(req.files)) return next();
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  let invalid = false;
  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      invalid = true;
      break;
    }
  }
  if (invalid) {
    for (const file of req.files) {
      if (file.path) fs.unlinkSync(file.path);
    }
    return res.render('pages/services/add', {
      title: 'Add New Service',
      errors: ['Invalid image file type'],
      formData: req.body,
      servicePage: true
    });
  }
  next();
}

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    let msg = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = 'Image file too large (max 5MB)';
    }
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    return res.render('pages/profile/edit', {
      title: 'Edit Profile',
      errors: [msg],
      formData: req.body,
      profilePage: true
    });
  }
  next(err);
}

function handleServiceMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    let msg = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = 'Image file too large (max 5MB)';
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      msg = 'Maximum 5 images allowed';
    }
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.path) fs.unlinkSync(file.path);
      }
    }
    // Context-aware rendering
    if (req.params && req.params.id && req.service) {
      return res.render('pages/services/edit', {
        title: 'Edit Service',
        service: req.service,
        errors: [msg],
        servicePage: true,
        formData: req.body
      });
    } else {
      return res.render('pages/services/add', {
        title: 'Add New Service',
        errors: [msg],
        formData: req.body,
        servicePage: true
      });
    }
  }
  next(err);
}

// Review image validation (AJAX JSON responses)
function validateReviewImage(req, res, next) {
  if (!req.file) return next(); // optional
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'Invalid image file type' });
  }
  next();
}

function handleReviewMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError || err?.message?.includes('Only JPG')) {
    let msg = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = 'Image file too large (max 5MB)';
    }
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return res.status(400).json({ success: false, message: msg });
  }
  next(err);
}

module.exports = {
  uploadProfilePic,
  validateImageFile,
  handleMulterError,
  uploadServiceImages,
  validateServiceImages,
  handleServiceMulterError,
  uploadReviewImage,
  validateReviewImage,
  handleReviewMulterError
};

