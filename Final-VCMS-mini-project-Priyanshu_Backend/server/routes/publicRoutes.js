const express = require("express");
const router = express.Router();
const {
  getPublicDoctors,
  getPublicDoctorProfile,
  getSpecializations,
  getCities,
  searchDoctorsBySymptoms,
  submitInquiry,
  getAvailableSlots,
} = require("../controllers/publicController");
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

/**
 * Public Routes
 * These routes do NOT require authentication
 * Allows guests to browse doctors and submit inquiries
 */

// Get all public doctors with filters
router.get("/doctors", getPublicDoctors);

// Get single doctor public profile
router.get("/doctors/:doctorId", getPublicDoctorProfile);

// Get all specializations (for filtering)
router.get("/specializations", getSpecializations);

// Get all available cities (for filtering)
router.get("/cities", getCities);

// Search doctors by symptoms
router.get("/search/symptoms", searchDoctorsBySymptoms);

// Get available appointment slots for a doctor
router.get("/slots/available", getAvailableSlots);

// Submit inquiry form (public)
router.post(
  "/inquiry",
  [
    check('name')
      .notEmpty()
      .withMessage('Name is required')
      .trim()
      .escape(),
    check('email')
      .isEmail()
      .normalizeEmail()
      .custom((val) => {
        const domain = (val || '').toLowerCase().split('@')[1] || '';
        if (domain !== 'gmail.com') throw new Error('Only Gmail addresses are accepted');
        return true;
      })
      .withMessage('Valid Gmail address is required (example@gmail.com)'),
    check('phone')
      .custom((value) => {
        const cleanPhone = value?.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length !== 10) {
          throw new Error('Phone must be 10 digits');
        }
        return true;
      }),
    check('message')
      .notEmpty()
      .withMessage('Message is required')
      .trim()
      .escape(),
    check('subject')
      .optional()
      .trim()
      .escape(),
  ],
  validateRequest,
  submitInquiry
);

module.exports = router;
