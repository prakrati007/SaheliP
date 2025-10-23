// Service categories, pricing types, modes, and helpers
const SERVICE_CATEGORIES = {
  'Beauty & Personal Care': {
    label: 'Beauty & Personal Care',
    subcategories: [
      'Bridal Makeup',
      'Party Makeup',
      'Hair Styling & Colour',
      'Manicure/Pedicure',
      'Skincare & Facials',
      'Mehendi/Henna',
      'Threading/Waxing'
    ]
  },
  'Tutoring & Skill Classes': {
    label: 'Tutoring & Skill Classes',
    subcategories: [
      'Academic Tutoring',
      'Language Classes',
      'Dance',
      'Arts & Crafts',
      'Music Lessons',
      'Hobby Workshops'
    ]
  },
  'Tailoring & Fashion': {
    label: 'Tailoring & Fashion',
    subcategories: [
      'Custom Stitching',
      'Alterations/Repairs',
      'Dress Designing',
      'Personal Styling/Consulting'
    ]
  },
  'Event & Occasion Services': {
    label: 'Event & Occasion Services',
    subcategories: [
      'Mehendi Artist for Events',
      'Event Makeup',
      'Decoration Assistant',
      'Body Art'
    ]
  }
};

const PRICING_TYPES = ['Hourly', 'Fixed', 'Package'];
const SERVICE_MODES = ['Onsite', 'Online', 'Hybrid'];
const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];
const TIME_SLOT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Review & Rating constants
const RATING_VALUES = [1, 2, 3, 4, 5];
const REVIEW_TEXT_MIN_LENGTH = 20;
const REVIEW_TEXT_MAX_LENGTH = 1000;
const REVIEW_EDIT_WINDOW_HOURS = 24;
const PROVIDER_REPLY_MAX_LENGTH = 500;

function isValidRating(rating) {
  return Number.isInteger(Number(rating)) && RATING_VALUES.includes(Number(rating));
}

function getCategoryList() {
  return Object.keys(SERVICE_CATEGORIES);
}

function getSubcategories(category) {
  return SERVICE_CATEGORIES[category]?.subcategories || [];
}

function isValidCategorySubcategory(category, subcategory) {
  return getSubcategories(category).includes(subcategory);
}

module.exports = {
  SERVICE_CATEGORIES,
  PRICING_TYPES,
  SERVICE_MODES,
  DAYS_OF_WEEK,
  TIME_SLOT_REGEX,
  RATING_VALUES,
  REVIEW_TEXT_MIN_LENGTH,
  REVIEW_TEXT_MAX_LENGTH,
  REVIEW_EDIT_WINDOW_HOURS,
  PROVIDER_REPLY_MAX_LENGTH,
  isValidRating,
  getCategoryList,
  getSubcategories,
  isValidCategorySubcategory
};
