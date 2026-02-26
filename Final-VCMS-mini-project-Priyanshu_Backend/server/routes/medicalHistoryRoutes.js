const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createMedicalHistory,
  getPatientHistory,
  getMedicalHistoryById,
  updateMedicalHistory,
  deleteMedicalHistory,
  patientReportMedicalHistory,
} = require('../controllers/medicalHistoryController');

// Multer config for report uploads
const uploadDir = path.join(__dirname, '../uploads/medical-reports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `report_${Date.now()}_${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  },
});

// POST /upload-report - Upload a medical report file
router.post('/upload-report', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
  res.json({
    success: true,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    uploadedAt: new Date().toISOString(),
  });
});

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