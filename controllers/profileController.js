const User = require('../models/User');
const path = require('path');
const fs = require('fs/promises');

// GET /profile/view
async function renderViewProfile(req, res) {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    if (!user) {
      // Render with safe stub
      return res.status(404).render('pages/profile/view', {
        title: 'My Profile',
        user: { name: '', city: '', pincode: '', role: '', bio: '', languages: [], experienceYears: null, certifications: [], profilePic: null, completedBookingsCount: 0 },
        errors: ['User not found'],
        profilePage: true
      });
    }
    res.render('pages/profile/view', { title: 'My Profile', user, profilePage: true });
  } catch (err) {
    res.status(500).render('pages/profile/view', {
      title: 'My Profile',
      user: { name: '', city: '', pincode: '', role: '', bio: '', languages: [], experienceYears: null, certifications: [], profilePic: null, completedBookingsCount: 0 },
      errors: ['Error loading profile'],
      profilePage: true
    });
  }
}

// GET /profile/edit
async function renderEditProfile(req, res) {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).render('pages/profile/edit', {
        title: 'Edit Profile',
        user: { name: '', city: '', pincode: '', role: '', bio: '', languages: [], experienceYears: null, certifications: [], profilePic: null, completedBookingsCount: 0 },
        errors: ['User not found'],
        profilePage: true
      });
    }
    res.render('pages/profile/edit', { title: 'Edit Profile', user, profilePage: true });
  } catch (err) {
    res.status(500).render('pages/profile/edit', {
      title: 'Edit Profile',
      user: { name: '', city: '', pincode: '', role: '', bio: '', languages: [], experienceYears: null, certifications: [], profilePic: null, completedBookingsCount: 0 },
      errors: ['Error loading profile'],
      profilePage: true
    });
  }
}

// POST /profile/edit
async function updateProfile(req, res) {
  try {
    const userId = req.session.user.id;
    let { bio, languages, experienceYears, certifications, city, pincode, name } = req.body;
    // Parse languages/certifications
    if (languages) languages = languages.split(',').map(l => l.trim()).filter(Boolean);
    if (certifications) certifications = certifications.split(',').map(c => c.trim()).filter(Boolean);
    if (experienceYears) experienceYears = Number(experienceYears);
    // Validate
    const errors = [];
    if (bio && bio.length > 500) errors.push('Bio must be 500 characters or less');
    if (experienceYears && (experienceYears < 0 || experienceYears > 50)) errors.push('Experience years must be between 0 and 50');
    if (city && (city.length < 2 || city.length > 50)) errors.push('City must be 2-50 characters');
    if (pincode && !/^\d{6}$/.test(pincode)) errors.push('Pincode must be exactly 6 digits');
    if (name && (name.length < 2 || name.length > 50)) errors.push('Name must be 2-50 characters');
    // Handle profile picture
    let profilePic;
    if (req.file) {
      profilePic = `/uploads/profiles/${req.file.filename}`;
      // Delete old picture if exists
      const user = await User.findById(userId);
      if (user && user.profilePic && !user.profilePic.includes('default') && user.profilePic) {
        const relative = user.profilePic.replace(/^\//, '');
        const oldPath = path.join(__dirname, '../public', relative);
        try { await fs.unlink(oldPath); } catch {}
      }
    }
    if (errors.length) {
      // Construct safe formData for re-render
      const formData = { name, bio, languages, experienceYears, certifications, city, pincode, profilePic };
      return res.status(400).render('pages/profile/edit', {
        title: 'Edit Profile',
        errors,
        formData,
        user: await User.findById(userId),
        profilePage: true
      });
    }
    // Update profile
    const updates = { bio, languages, experienceYears, certifications, city, pincode, name };
    if (profilePic) updates.profilePic = profilePic;
    const updatedUser = await User.updateProfileFields(userId, updates);
    // Update session
    req.session.user.name = updatedUser.name;
    req.session.user.profilePic = updatedUser.profilePic;
    res.redirect('/profile/view?message=Profile updated');
  } catch (err) {
    // On error, render with safe stub and error
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    const safeUser = user || { name: '', city: '', pincode: '', role: '', bio: '', languages: [], experienceYears: null, certifications: [], profilePic: null, completedBookingsCount: 0 };
    res.status(400).render('pages/profile/edit', {
      title: 'Edit Profile',
      errors: [err.message],
      user: safeUser,
      profilePage: true
    });
  }
}

// POST /profile/delete-picture
async function deleteProfilePic(req, res) {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    if (user && user.profilePic) {
      const relative = user.profilePic.replace(/^\//, '');
      const picPath = path.join(__dirname, '../public', relative);
      try { await fs.unlink(picPath); } catch {}
      user.profilePic = null;
      await user.save();
      req.session.user.profilePic = null;
    }
    res.redirect('/profile/edit?message=Picture removed');
  } catch (err) {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    const safeUser = user || { name: '', city: '', pincode: '', role: '', bio: '', languages: [], experienceYears: null, certifications: [], profilePic: null, completedBookingsCount: 0 };
    res.status(500).render('pages/profile/edit', {
      title: 'Edit Profile',
      errors: ['Error removing picture'],
      user: safeUser,
      profilePage: true
    });
  }
}

module.exports = { renderViewProfile, renderEditProfile, updateProfile, deleteProfilePic };
