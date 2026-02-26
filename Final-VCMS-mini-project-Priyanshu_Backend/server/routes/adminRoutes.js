const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require("../middleware/authMiddleware");
const { adminReadLimiter } = require("../middleware/advancedRateLimiter");
const {
  getDashboardStats,
  getUsers,
  getAppointments,
  changeUserRole,
  getReports,
  getPendingDoctors,
  getPendingDoctorsList,
  getPendingPatients,
  approveDoctor,
  rejectDoctor,
  approvePatient,
  rejectPatient,
  warnUser,
  deleteUser,
} = require("../controllers/adminController");

// Apply rate limiter to all admin routes
router.use(adminReadLimiter);

// GET /dashboard-stats - Admin: Get dashboard statistics
router.get("/dashboard-stats", protect, getDashboardStats);

// GET /users - Admin: Get all users with filters
router.get("/users", protect, getUsers);

// GET /appointments - Admin: Get all appointments with filters
router.get("/appointments", protect, getAppointments);

// GET /doctors/pending - Admin: Get pending doctors for approval
router.get("/doctors/pending", protect, getPendingDoctors);

// GET /doctors/pending-list - Admin: Get pending doctors list
router.get("/doctors/pending-list", protect, getPendingDoctorsList);

// GET /patients/pending - Admin: Get pending patients list
router.get("/patients/pending", protect, getPendingPatients);

// POST /doctors/:doctorId/approve - Admin: Approve doctor registration
router.post("/doctors/:doctorId/approve", protect, approveDoctor);

// POST /doctors/:doctorId/reject - Admin: Reject doctor registration
router.post("/doctors/:doctorId/reject", protect, [
  check('reason').notEmpty().withMessage('Rejection reason is required'),
], validateRequest, rejectDoctor);

// POST /patients/:patientId/approve - Admin: Approve patient registration
router.post("/patients/:patientId/approve", protect, approvePatient);

// POST /patients/:patientId/reject - Admin: Reject patient registration
router.post("/patients/:patientId/reject", protect, [
  check('reason').notEmpty().withMessage('Rejection reason is required'),
], validateRequest, rejectPatient);

// PUT /users/:userId/role - Admin: Change user role
router.put("/users/:userId/role", protect, changeUserRole);

// PUT /users/:userId/warn - Admin: Warn user
router.put("/users/:userId/warn", protect, [
  check('message').notEmpty().withMessage('Warning message is required'),
], validateRequest, warnUser);

// DELETE /users/:userId - Admin: Delete user
router.delete("/users/:userId", protect, deleteUser);

// GET /reports - Admin: Generate reports
router.get("/reports", protect, getReports);

module.exports = router;
