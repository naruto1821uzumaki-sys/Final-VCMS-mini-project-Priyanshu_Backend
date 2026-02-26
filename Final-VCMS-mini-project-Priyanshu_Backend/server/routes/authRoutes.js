const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  updateProfile,
  getProfile,
  changePassword,
  sendOtp,
  verifyOtp,
  resetPassword,
  // ✅ NEW: Import enhanced auth endpoints
  refreshAccessToken,
  logoutUser,
  logoutFromAllDevices,
  getAuthStatus,
  unlockAccount,
} = require("../controllers/authController");
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { protect, ensureAdmin } = require("../middleware/authMiddleware");

// Register - with comprehensive validation
router.post(
  "/register",
  [
    check('firstName')
      .notEmpty()
      .withMessage('First name is required')
      .matches(/^[A-Za-z0-9 _\-.'À-ÖØ-öø-ÿ]+$/)
      .withMessage('First name contains invalid characters')
      .custom((val) => {
        if (!/[A-Za-z]/.test(val)) throw new Error('First name must include at least one letter');
        return true;
      }),
    check('lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .matches(/^[A-Za-z0-9 _\-.'À-ÖØ-öø-ÿ]+$/)
      .withMessage('Last name contains invalid characters')
      .custom((val) => {
        if (!/[A-Za-z]/.test(val)) throw new Error('Last name must include at least one letter');
        return true;
      }),
    check('email')
      .isEmail()
      .normalizeEmail()
      .custom((val) => {
        const domain = (val || '').toLowerCase().split('@')[1] || '';
        if (domain !== 'gmail.com') throw new Error('Registration requires a Gmail address');
        return true;
      })
      .withMessage('Valid Gmail address is required (example@gmail.com)'),
    check('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must have 1 uppercase, 1 number, and 1 special character'),
    check('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    check('phone')
      .custom((value) => {
        const cleanPhone = value?.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length !== 10) {
          throw new Error('Phone must be 10 digits');
        }
        return true;
      }),
    check('role')
      .isIn(['patient', 'doctor', 'admin'])
      .withMessage('Invalid role'),
    // doctor-specific fields
    check('specialization')
      .if((value, { req }) => req.body.role === 'doctor')
      .notEmpty()
      .withMessage('Specialization is required for doctors'),
    check('experience')
      .if((value, { req }) => req.body.role === 'doctor')
      .notEmpty()
      .withMessage('Experience is required for doctors')
      .isInt({ min: 0 })
      .withMessage('Experience must be a non-negative integer'),
    // ensure patients supply a date of birth so controller can calculate age
    check('dateOfBirth')
      .if((value, { req }) => req.body.role === 'patient')
      .notEmpty()
      .withMessage('Date of birth is required for patients')
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    // Patient age and medical history are validated in the controller.
    // Frontend supplies dateOfBirth instead of age and medicalHistory is optional.
    // Removing strict route checks so registration requests from UI succeed.

  ],
  validateRequest,
  registerUser
);

// Login
router.post(
  "/login",
  [
    check('email')
      .isEmail()
      .custom((val) => {
        const domain = (val || '').toLowerCase().split('@')[1] || '';
        if (domain !== 'gmail.com') throw new Error('Login requires a Gmail address');
        return true;
      })
      .withMessage('Valid Gmail address is required (example@gmail.com)'),
    check('password')
      .exists()
      .withMessage('Password is required'),
  ],
  validateRequest,
  loginUser
);

// GET /me - return current authenticated user
router.get('/me', protect, getProfile);

// Update profile (authenticated)
router.put("/update-profile", protect, updateProfile);

// Change password (authenticated)
router.put("/change-password", protect, changePassword);

// OTP Routes
router.post(
  "/send-otp",
  [
    check('phone')
      .custom((value) => {
        const cleanPhone = value?.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length !== 10) {
          throw new Error('Phone must be 10 digits');
        }
        return true;
      }),
  ],
  validateRequest,
  sendOtp
);

router.post(
  "/verify-otp",
  [
    check('phone')
      .custom((value) => {
        const cleanPhone = value?.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length !== 10) {
          throw new Error('Phone must be 10 digits');
        }
        return true;
      }),
    check('code')
      .notEmpty()
      .withMessage('OTP code is required'),
  ],
  validateRequest,
  verifyOtp
);

router.post(
  "/reset-password",
  [
    check('phone')
      .custom((value) => {
        const cleanPhone = value?.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length !== 10) {
          throw new Error('Phone must be 10 digits');
        }
        return true;
      }),
    check('code')
      .notEmpty()
      .withMessage('OTP code is required'),
    check('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must have 1 uppercase, 1 number, and 1 special character'),
    check('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],
  validateRequest,
  resetPassword
);

// ✅ NEW: Refresh Token Endpoint
router.post(
  "/refresh-token",
  [
    check('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  validateRequest,
  refreshAccessToken
);

// ✅ NEW: Get Authentication Status
router.get("/auth-status", protect, getAuthStatus);

// ✅ NEW: Logout User
router.post("/logout", protect, logoutUser);

// ✅ NEW: Logout From All Devices
router.post("/logout-all", protect, logoutFromAllDevices);

// ✅ NEW: Admin - Unlock Account (for locked accounts)
router.post(
  "/unlock-account/:userId",
  protect,
  ensureAdmin,
  unlockAccount
);

module.exports = router;
