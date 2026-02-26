const express = require("express");
const router = express.Router();
const {
  createConsultation,
  getConsultation,
  updateConsultation,
  getConsultationByAppointment,
  getConsultations,
  deleteConsultation,
} = require("../controllers/consultationController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * Consultation Form Routes
 * For managing structured medical consultation forms
 */

// Create or update consultation form
router.post("/", protect, createConsultation);

// Get all consultations (filtered by role)
router.get("/", protect, getConsultations);

// Get consultation by ID
router.get("/:consultationId", protect, getConsultation);

// Get consultation by appointment ID
router.get("/appointment/:appointmentId", protect, getConsultationByAppointment);

// Update consultation form
router.put("/:consultationId", protect, updateConsultation);

// Delete consultation form (only draft forms by patient)
router.delete("/:consultationId", protect, deleteConsultation);

module.exports = router;
