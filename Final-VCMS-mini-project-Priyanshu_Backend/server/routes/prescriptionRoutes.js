const express = require("express");
const router = express.Router();
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const { protect } = require("../middleware/authMiddleware");
const {
  getAllPrescriptions,
  createPrescription,
  issuePrescription,
  viewPrescription,
  pickupPrescription,
  cancelPrescription,
  getPatientPrescriptions,
  getPrescriptionByAppointment,
  getPrescriptionById,
  getActivePrescriptions,
  updatePrescription,
} = require("../controllers/prescriptionController");

// GET / - Get all prescriptions (role-based filtering)
router.get("/", protect, getAllPrescriptions);

// POST / - Create prescription in draft (doctor only)
router.post(
  "/",
  protect,
  [
    check('appointmentId').notEmpty().withMessage('appointmentId is required'),
    check('medications').isArray({ min: 1 }).withMessage('medications must be an array'),
    check('diagnosis').notEmpty().withMessage('diagnosis is required'),
    check('validUntil').notEmpty().withMessage('validUntil date is required'),
  ],
  validateRequest,
  createPrescription
);

// POST /:id/issue - Issue prescription (doctor only)
router.post("/:id/issue", protect, issuePrescription);

// POST /:id/view - Mark prescription as viewed
router.post("/:id/view", protect, viewPrescription);

// POST /:id/pickup - Mark prescription as picked up
router.post("/:id/pickup", protect, pickupPrescription);

// POST /:id/cancel - Cancel prescription (doctor only)
router.post(
  "/:id/cancel",
  protect,
  [
    check('cancelledReason').optional().isString(),
  ],
  validateRequest,
  cancelPrescription
);

// GET /patient/:patientId - Get all prescriptions for a patient
router.get("/patient/:patientId", protect, getPatientPrescriptions);

// GET /patient/:patientId/active - Get active prescriptions for a patient
router.get("/patient/:patientId/active", protect, getActivePrescriptions);

// GET /appointment/:appointmentId - Get prescription by appointment ID
router.get("/appointment/:appointmentId", protect, getPrescriptionByAppointment);

// GET /:id - Get single prescription
router.get("/:id", protect, getPrescriptionById);

// PUT /:id - Update prescription (doctor only, draft status only)
router.put(
  "/:id",
  protect,
  [
    check('medications').optional().isArray({ min: 1 }).withMessage('medications must be an array'),
  ],
  validateRequest,
  updatePrescription
);

module.exports = router;
