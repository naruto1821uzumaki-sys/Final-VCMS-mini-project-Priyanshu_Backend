const Prescription = require("../models/Prescription");
const Appointment = require("../models/Appointment");
const MedicalHistory = require("../models/MedicalHistory");
const Notification = require("../models/Notification");
const socketHandler = require('../utils/socketHandler');

// Create prescription (draft status - doctor only)
const createPrescription = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can create prescriptions" });
    }

    const { appointmentId, medicalHistoryId, medications, diagnosis, clinicalNotes, treatmentPlan, followUpDate, followUpRecommendations, validUntil, attachments } = req.body;

    // Validation
    if (!appointmentId || !medications || !Array.isArray(medications) || medications.length === 0 || !diagnosis) {
      return res.status(400).json({ message: "appointmentId, medications (array), and diagnosis are required" });
    }

    if (!validUntil) {
      return res.status(400).json({ message: "validUntil date is required" });
    }

    // Verify appointment and authorization
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized for this appointment" });
    }

    // Validate validUntil is in future
    const validDate = new Date(validUntil);
    if (validDate <= new Date()) {
      return res.status(400).json({ message: "validUntil must be a future date" });
    }

    const prescription = await Prescription.create({
      appointmentId,
      medicalHistoryId,
      patientId: appointment.patientId,
      doctorId: req.user._id,
      medications: medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || '',
        quantity: m.quantity || 0,
        refills: m.refills || 0,
        sideEffects: Array.isArray(m.sideEffects) ? m.sideEffects : [],
      })),
      diagnosis,
      clinicalNotes: clinicalNotes || '',
      treatmentPlan: treatmentPlan || '',
      followUpDate,
      followUpRecommendations: followUpRecommendations || '',
      status: 'draft',
      validFrom: new Date(),
      validUntil: validDate,
      isActive: true,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    const populatedRx = await Prescription.findById(prescription._id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Prescription created (draft status)',
      prescription: populatedRx,
    });
  } catch (error) {
    console.error('createPrescription error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Issue prescription (change from draft to issued - doctor only)
const issuePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can issue prescriptions" });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Verify authorization (doctor who created it)
    if (prescription.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (prescription.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft prescriptions can be issued' });
    }

    prescription.status = 'issued';
    prescription.issuedAt = new Date();
    prescription.lastModifiedBy = req.user._id;
    prescription.lastModifiedAt = new Date();

    await prescription.save();

    // Notify patient
    try {
      const notif = await Notification.create({
        userId: prescription.patientId,
        title: 'Prescription Issued',
        message: `Dr. ${req.user.name} has issued a new prescription`,
        type: 'system',
        from: req.user._id,
        link: `/prescriptions/${prescription._id}`,
      });
      socketHandler.emitToUser(prescription.patientId.toString(), 'notification', notif);
      socketHandler.emitToUser(prescription.patientId.toString(), 'prescription:issued', {
        prescriptionId: prescription._id,
        status: 'issued',
      });
    } catch (nErr) {
      console.error("Notification creation error:", nErr);
    }

    const updated = await Prescription.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
    ]);

    res.json({
      success: true,
      message: 'Prescription issued',
      prescription: updated,
    });
  } catch (error) {
    console.error('issuePrescription error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// View prescription (patient marks as viewed)
const viewPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check authorization
    if (req.user._id.toString() !== prescription.patientId.toString() && req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (prescription.status === 'issued' && !prescription.viewedAt) {
      prescription.status = 'viewed';
      prescription.viewedAt = new Date();
      prescription.lastModifiedBy = req.user._id;
      prescription.lastModifiedAt = new Date();
      await prescription.save();
    }

    const updated = await Prescription.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
    ]);

    res.json({
      success: true,
      message: 'Prescription marked as viewed',
      prescription: updated,
    });
  } catch (error) {
    console.error('viewPrescription error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark prescription as picked up (patient or pharmacist)
const pickupPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { dispensedBy, pharmacyNotes } = req.body;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check authorization
    if (req.user._id.toString() !== prescription.patientId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!['issued', 'viewed'].includes(prescription.status)) {
      return res.status(400).json({ message: 'Prescription must be issued or viewed to pickup' });
    }

    prescription.status = 'picked_up';
    prescription.pickedUpAt = new Date();
    prescription.dispensedBy = dispensedBy || null;
    prescription.pharmacyNotes = pharmacyNotes || '';
    prescription.lastModifiedBy = req.user._id;
    prescription.lastModifiedAt = new Date();

    await prescription.save();

    // Notify doctor
    try {
      const notif = await Notification.create({
        userId: prescription.doctorId,
        title: 'Prescription Picked Up',
        message: `Patient has picked up the prescription you issued`,
        type: 'system',
        from: prescription.patientId,
        link: `/prescriptions/${prescription._id}`,
      });
      socketHandler.emitToUser(prescription.doctorId.toString(), 'notification', notif);
      socketHandler.emitToUser(prescription.doctorId.toString(), 'prescription:picked-up', {
        prescriptionId: prescription._id,
        status: 'picked_up',
      });
    } catch (nErr) {
      console.error("Notification creation error:", nErr);
    }

    const updated = await Prescription.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
      { path: 'dispensedBy', select: '-password' },
    ]);

    res.json({
      success: true,
      message: 'Prescription marked as picked up',
      prescription: updated,
    });
  } catch (error) {
    console.error('pickupPrescription error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Cancel prescription (doctor only)
const cancelPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelledReason } = req.body;

    if (!req.user || req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can cancel prescriptions" });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (prescription.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (prescription.status === 'cancelled') {
      return res.status(400).json({ message: 'Prescription already cancelled' });
    }

    prescription.status = 'cancelled';
    prescription.isActive = false;
    prescription.cancelledAt = new Date();
    prescription.cancelledReason = cancelledReason || 'No reason provided';
    prescription.lastModifiedBy = req.user._id;
    prescription.lastModifiedAt = new Date();

    await prescription.save();

    // Notify patient
    try {
      const notif = await Notification.create({
        userId: prescription.patientId,
        title: 'Prescription Cancelled',
        message: `Dr. ${req.user.name} cancelled your prescription: ${prescription.cancelledReason}`,
        type: 'system',
        from: req.user._id,
        link: `/prescriptions/${prescription._id}`,
      });
      socketHandler.emitToUser(prescription.patientId.toString(), 'notification', notif);
      socketHandler.emitToUser(prescription.patientId.toString(), 'prescription:cancelled', {
        prescriptionId: prescription._id,
        status: 'cancelled',
      });
    } catch (nErr) {
      console.error("Notification creation error:", nErr);
    }

    const updated = await Prescription.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
    ]);

    res.json({
      success: true,
      message: 'Prescription cancelled',
      prescription: updated,
    });
  } catch (error) {
    console.error('cancelPrescription error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all prescriptions for a patient
const getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10, status, activeOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check authorization
    if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const filter = { patientId };
    if (status) {
      filter.status = status;
    }
    if (activeOnly === 'true') {
      filter.isActive = true;
      filter.validUntil = { $gt: new Date() };
    }

    const total = await Prescription.countDocuments(filter);
    const prescriptions = await Prescription.find(filter)
      .populate([
        { path: 'patientId', select: '-password' },
        { path: 'doctorId', select: '-password' },
        { path: 'appointmentId' },
        { path: 'medicalHistoryId' },
      ])
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      prescriptions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getPatientPrescriptions error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get prescriptions by appointment
const getPrescriptionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const prescription = await Prescription.findOne({ appointmentId }).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
    ]);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.json({
      success: true,
      prescription,
    });
  } catch (error) {
    console.error('getPrescriptionByAppointment error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single prescription by ID
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
      { path: 'dispensedBy', select: '-password' },
    ]);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check authorization
    if (req.user.role === 'patient' && req.user._id.toString() !== prescription.patientId._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({
      success: true,
      prescription,
    });
  } catch (error) {
    console.error('getPrescriptionById error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get active prescriptions for a patient
const getActivePrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const prescriptions = await Prescription.find({
      patientId,
      isActive: true,
      status: { $in: ['issued', 'viewed', 'picked_up'] },
      validUntil: { $gt: new Date() },
    })
      .populate([
        { path: 'patientId', select: '-password' },
        { path: 'doctorId', select: '-password' },
        { path: 'appointmentId' },
        { path: 'medicalHistoryId' },
      ])
      .sort({ validUntil: 1 });

    res.json({
      success: true,
      prescriptions,
    });
  } catch (error) {
    console.error('getActivePrescriptions error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update prescription (doctor only, draft status only)
const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { medications, diagnosis, clinicalNotes, treatmentPlan, followUpDate, followUpRecommendations, validUntil, attachments } = req.body;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Doctor only' });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (prescription.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (prescription.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft prescriptions can be updated' });
    }

    if (medications && Array.isArray(medications)) {
      prescription.medications = medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || '',
        quantity: m.quantity || 0,
        refills: m.refills || 0,
        sideEffects: Array.isArray(m.sideEffects) ? m.sideEffects : [],
      }));
    }
    if (diagnosis !== undefined) {
      prescription.diagnosis = diagnosis;
    }
    if (clinicalNotes !== undefined) {
      prescription.clinicalNotes = clinicalNotes;
    }
    if (treatmentPlan !== undefined) {
      prescription.treatmentPlan = treatmentPlan;
    }
    if (followUpDate !== undefined) {
      prescription.followUpDate = followUpDate;
    }
    if (followUpRecommendations !== undefined) {
      prescription.followUpRecommendations = followUpRecommendations;
    }
    if (validUntil !== undefined) {
      prescription.validUntil = new Date(validUntil);
    }
    if (attachments) {
      prescription.attachments = Array.isArray(attachments) ? attachments : [];
    }

    prescription.lastModifiedBy = req.user._id;
    prescription.lastModifiedAt = new Date();

    await prescription.save();

    const updated = await Prescription.findById(id).populate([
      { path: 'patientId', select: '-password' },
      { path: 'doctorId', select: '-password' },
      { path: 'appointmentId' },
      { path: 'medicalHistoryId' },
    ]);

    res.json({
      success: true,
      message: 'Prescription updated',
      prescription: updated,
    });
  } catch (error) {
    console.error('updatePrescription error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all prescriptions (role-based filtering)
const getAllPrescriptions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctorId = req.user._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (status) {
      filter.status = status;
    }

    const total = await Prescription.countDocuments(filter);
    const prescriptions = await Prescription.find(filter)
      .populate([
        { path: 'patientId', select: '-password' },
        { path: 'doctorId', select: '-password' },
        { path: 'appointmentId' },
      ])
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      prescriptions,
      data: prescriptions, // For backwards compatibility
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getAllPrescriptions error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
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
};
