const MedicalHistory = require('../models/MedicalHistory');
const Notification = require('../models/Notification');
const socketHandler = require('../utils/socketHandler');

// Create medical history record (doctor only)
const createMedicalHistory = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Doctor only' });
    }

    const { patientId, condition, description, diagnosis, treatment, date, attachments, appointmentId, prescriptionId } = req.body;

    if (!patientId || !condition) {
      return res.status(400).json({ message: 'patientId and condition are required' });
    }

    const entry = await MedicalHistory.create({
      patientId,
      doctorId: req.user._id,
      appointmentId,
      prescriptionId,
      condition,
      description: description || '',
      diagnosis: diagnosis || '',
      treatment: treatment || '',
      date: date || new Date(),
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    const populated = await MedicalHistory.findById(entry._id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'prescriptionId' },
    ]);

    // Notify patient
    try {
      const notif = await Notification.create({
        userId: patientId,
        title: 'Medical Record Added',
        message: `Dr. ${req.user.name} added a new medical record: ${condition}`,
        type: 'system',
        from: req.user._id,
        link: `/medical-history`,
      });
      socketHandler.emitToUser(patientId.toString(), 'notification', notif);
      socketHandler.emitToUser(patientId.toString(), 'medical-history:created', {
        entryId: entry._id,
        condition,
      });
    } catch (nErr) {
      console.error("Notification creation error:", nErr);
    }

    res.status(201).json({
      success: true,
      message: 'Medical history record created',
      entry: populated,
    });
  } catch (err) {
    console.error('createMedicalHistory error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get patient's medical history
const getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Allow patient themselves, doctors, or admins
    if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const filter = { patientId };
    if (search) {
      filter.$or = [
        { condition: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await MedicalHistory.countDocuments(filter);
    const entries = await MedicalHistory.find(filter)
      .populate([
        { path: 'patientId', select: '-password' },
        { path: 'doctorId', select: '-password' },
        { path: 'appointmentId' },
        { path: 'prescriptionId' },
      ])
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      entries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('getPatientHistory error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get single medical history record
const getMedicalHistoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await MedicalHistory.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'prescriptionId' },
    ]);

    if (!entry) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check authorization
    if (req.user.role === 'patient' && req.user._id.toString() !== entry.patientId._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({
      success: true,
      entry,
    });
  } catch (err) {
    console.error('getMedicalHistoryById error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update medical history record (doctor only)
const updateMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition, description, diagnosis, treatment, attachments } = req.body;

    if (!req.user || req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Doctor only' });
    }

    const entry = await MedicalHistory.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Doctor can only update their own records
    if (entry.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (condition) entry.condition = condition;
    if (description !== undefined) entry.description = description;
    if (diagnosis !== undefined) entry.diagnosis = diagnosis;
    if (treatment !== undefined) entry.treatment = treatment;
    if (attachments) entry.attachments = Array.isArray(attachments) ? attachments : [];

    await entry.save();

    // Notify patient of update
    try {
      const notif = await Notification.create({
        userId: entry.patientId,
        title: 'Medical Record Updated',
        message: `Dr. ${req.user.name} updated your medical record`,
        type: 'system',
        from: req.user._id,
        link: `/medical-history`,
      });
      socketHandler.emitToUser(entry.patientId.toString(), 'notification', notif);
    } catch (nErr) {
      console.error("Notification creation error:", nErr);
    }

    const updated = await MedicalHistory.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'prescriptionId' },
    ]);

    res.json({
      success: true,
      message: 'Record updated',
      entry: updated,
    });
  } catch (err) {
    console.error('updateMedicalHistory error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete medical history record (admin only)
const deleteMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const entry = await MedicalHistory.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.json({
      success: true,
      message: 'Record deleted',
    });
  } catch (err) {
    console.error('deleteMedicalHistory error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Patient self-reports medical history
const patientReportMedicalHistory = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Patients only' });
    }

    const { condition, description, diagnosis, treatment, attachments } = req.body;

    if (!condition || !condition.trim()) {
      return res.status(400).json({ message: 'Condition is required' });
    }

    const entry = await MedicalHistory.create({
      patientId: req.user._id,
      condition: condition.trim(),
      description: description ? description.trim() : '',
      diagnosis: diagnosis ? diagnosis.trim() : '',
      treatment: treatment ? treatment.trim() : '',
      date: new Date(),
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    const populated = await MedicalHistory.findById(entry._id).populate([
      { path: 'patientId', select: '-password' },
    ]);

    // Notify patient's doctors
    try {
      const Notification = require('../models/Notification');
      const socketHandler = require('../utils/socketHandler');
      
      // This is for the patient's own reference
      const notif = await Notification.create({
        userId: req.user._id,
        title: 'Medical History Recorded',
        message: `You have recorded: ${condition}`,
        type: 'medical-history',
        link: `/medical-history`,
      });
      socketHandler.emitToUser(req.user._id.toString(), 'notification', notif);
    } catch (nErr) {
      console.error("Notification creation error:", nErr);
    }

    res.status(201).json({
      success: true,
      message: 'Medical history recorded',
      entry: populated,
    });
  } catch (err) {
    console.error('patientReportMedicalHistory error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createMedicalHistory,
  getPatientHistory,
  getMedicalHistoryById,
  updateMedicalHistory,
  deleteMedicalHistory,
  patientReportMedicalHistory,
};
