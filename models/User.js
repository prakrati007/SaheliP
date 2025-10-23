const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['saheli', 'customer'],
      required: [true, 'Role is required'],
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      validate: {
        validator: function (v) {
          return /^\d{6}$/.test(v);
        },
        message: 'Pincode must be exactly 6 digits',
      },
    },
    profilePic: {
      type: String,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio must not exceed 500 characters'],
      default: '',
    },
    languages: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience must be at least 0 years'],
      max: [50, 'Experience must not exceed 50 years'],
      default: null,
    },
    certifications: {
      type: [String],
      default: [],
    },
    completedBookingsCount: {
      type: Number,
      min: [0, 'Completed bookings cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - same email can have different roles (saheli and customer)
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Virtual field for verification status

userSchema.virtual('isVerified').get(function () {
  return this.verified;
});

userSchema.virtual('hasVerificationBadge').get(function () {
  return this.role === 'saheli' && this.completedBookingsCount >= 3;
});

/**
 * Instance method to compare password with hash
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if password matches
 */

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Instance method to increment completedBookingsCount atomically
 */
userSchema.methods.incrementCompletedBookings = async function () {
  await this.constructor.updateOne(
    { _id: this._id },
    { $inc: { completedBookingsCount: 1 } }
  );
  await this.reload();
};

/**
 * Static method to safely update allowed profile fields
 * @param {string} userId - User ID
 * @param {object} updates - Allowed fields to update
 * @returns {Promise<User>} - Updated user document
 */
userSchema.statics.updateProfileFields = async function (userId, updates) {
  const allowed = [
    'name',
    'bio',
    'languages',
    'experienceYears',
    'certifications',
    'city',
    'pincode',
    'profilePic',
  ];
  const safeUpdates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      safeUpdates[key] = updates[key];
    }
  }
  return await this.findByIdAndUpdate(userId, safeUpdates, {
    new: true,
    runValidators: true,
  });
};

/**
 * Static method to find user by email and optionally by role
 * @param {string} email - User email
 * @param {string} role - Optional user role (saheli or customer)
 * @returns {Promise<User|null>} - User document or null
 */
userSchema.statics.findByEmail = function (email, role = null) {
  const query = { email: email.toLowerCase().trim() };
  if (role) {
    query.role = role;
  }
  return this.findOne(query);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
