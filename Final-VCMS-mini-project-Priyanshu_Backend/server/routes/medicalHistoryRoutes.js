const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const {
  createMedicalHistory,
  getPatientHistory,
  getMedicalHistoryById,
  updateMedicalHistory,
  deleteMedicalHistory,
  patientReportMedicalHistory,
} = require('../controllers/medicalHistoryController');

// POST / - Create medical history record (doctor only)
router.post('/', protect, createMedicalHistory);

// POST /patient/self - Patient self-reports medical history
router.post(
  '/patient/self',
  protect,
  [
    check('condition').notEmpty().withMessage('Condition is required'),
  ],
  validateRequest,
  patientReportMedicalHistory
);

// GET /patient/:patientId - Get patient's medical history
router.get('/patient/:patientId', protect, getPatientHistory);

// GET /:id - Get single record
router.get('/:id', protect, getMedicalHistoryById);

// PUT /:id - Update record (doctor only)
router.put('/:id', protect, updateMedicalHistory);

// DELETE /:id - Delete record (doctor/admin)
router.delete('/:id', protect, deleteMedicalHistory);

module.exports = router;