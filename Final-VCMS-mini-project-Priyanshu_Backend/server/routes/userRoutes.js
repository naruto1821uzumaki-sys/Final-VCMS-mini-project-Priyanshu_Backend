const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  getDoctors,
  getPatients,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
} = require('../controllers/userController');

// GET / - Get all users (admin only)
router.get('/', protect, getAllUsers);

// GET /doctors -  Get all doctors (public)
router.get('/doctors', getDoctors);

// GET /patients - Get all patients (doctor/admin only)
router.get('/patients', protect, getPatients);

// GET /:id - Get user by ID
router.get('/:id', protect, getUserById);

// PUT /:id - Update user (admin only)
router.put('/:id', protect, updateUser);

// PUT /:id/toggle-status - Toggle user status (admin only)
router.put('/:id/toggle-status', protect, toggleUserStatus);

// DELETE /:id - Delete user (admin only)
router.delete('/:id', protect, deleteUser);

module.exports = router;