const ConsultationForm = require("../models/ConsultationForm");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

/**
 * Consultation Form Controller
 * Handles structured medical consultation data for appointments
 */

// ✅ NEW: Create Consultation Form
exports.createConsultation = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { appointmentId, currentProblem, symptoms, allergies, pastTreatments, familyHistory, currentMedications, uploadedReports } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment ID is required" });
    }

    // Verify appointment exists and user has access
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only patient or doctor of the appointment can create form
    if (
      req.user._id.toString() !== appointment.patientId.toString() &&
      req.user._id.toString() !== appointment.doctorId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: "You don't have access to this appointment" });
    }

    // Check if form already exists
    let consultationForm = await ConsultationForm.findOne({ appointmentId });

    if (consultationForm) {
      // Update existing form
      if (currentProblem) consultationForm.currentProblem = currentProblem;
      if (symptoms) consultationForm.symptoms = symptoms;
      if (allergies) consultationForm.allergies = allergies;
      if (pastTreatments) consultationForm.pastTreatments = pastTreatments;
      if (familyHistory) consultationForm.familyHistory = familyHistory;
      if (currentMedications) consultationForm.currentMedications = currentMedications;
      if (uploadedReports) consultationForm.uploadedReports = uploadedReports;
      
      consultationForm.status = "submitted";
      consultationForm.doctorId = appointment.doctorId;
    } else {
      // Create new form
      consultationForm = await ConsultationForm.create({
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        currentProblem,
        symptoms: symptoms || [],
        allergies: allergies || [],
        pastTreatments: pastTreatments || [],
        familyHistory,
        currentMedications: currentMedications || [],
        uploadedReports: uploadedReports || [],
        status: "submitted",
      });
    }

    await consultationForm.save();

    // Update appointment with consultationFormId
    appointment.consultationFormId = consultationForm._id;
    await appointment.save();

    res.json({
      success: true,
      message: "Consultation form submitted successfully",
      consultationForm,
    });
  } catch (error) {
    console.error("createConsultation error:", error);
    res.status(500).json({ message: "Failed to create consultation form", error: error.message });
  }
};

// ✅ NEW: Get Consultation Form
exports.getConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId) {
      return res.status(400).json({ message: "Consultation ID is required" });
    }

    const consultationForm = await ConsultationForm.findById(consultationId)
      .populate("patientId", "-password")
      .populate("doctorId", "-password")
      .populate("appointmentId");

    if (!consultationForm) {
      return res.status(404).json({ message: "Consultation form not found" });
    }

    // Verify access
    if (
      req.user._id.toString() !== consultationForm.patientId._id.toString() &&
      req.user._id.toString() !== consultationForm.doctorId._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: "You don't have access to this form" });
    }

    res.json({
      success: true,
      consultationForm,
    });
  } catch (error) {
    console.error("getConsultation error:", error);
    res.status(500).json({ message: "Failed to fetch consultation form", error: error.message });
  }
};

// ✅ NEW: Update Consultation Form
exports.updateConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { currentProblem, symptoms, allergies, pastTreatments, familyHistory, currentMedications, uploadedReports, reviewNotes, status } = req.body;

    const consultationForm = await ConsultationForm.findById(consultationId);
    if (!consultationForm) {
      return res.status(404).json({ message: "Consultation form not found" });
    }

    // Verify access
    if (
      req.user._id.toString() !== consultationForm.patientId.toString() &&
      req.user._id.toString() !== consultationForm.doctorId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: "You don't have access to this form" });
    }

    // Patient can only update if status is draft
    if (req.user.role === 'patient' && consultationForm.status !== 'draft') {
      return res.status(403).json({ message: "Can only edit draft forms" });
    }

    // Update fields
    if (currentProblem) consultationForm.currentProblem = currentProblem;
    if (symptoms) consultationForm.symptoms = symptoms;
    if (allergies) consultationForm.allergies = allergies;
    if (pastTreatments) consultationForm.pastTreatments = pastTreatments;
    if (familyHistory) consultationForm.familyHistory = familyHistory;
    if (currentMedications) consultationForm.currentMedications = currentMedications;
    if (uploadedReports) consultationForm.uploadedReports = uploadedReports;
    
    // Only doctor can add review notes
    if (reviewNotes && (req.user._id.toString() === consultationForm.doctorId.toString() || req.user.role === 'admin')) {
      consultationForm.reviewNotes = reviewNotes;
    }

    // Only doctor can change status to reviewed
    if (status && (req.user._id.toString() === consultationForm.doctorId.toString() || req.user.role === 'admin')) {
      consultationForm.status = status;
    }

    await consultationForm.save();

    res.json({
      success: true,
      message: "Consultation form updated successfully",
      consultationForm,
    });
  } catch (error) {
    console.error("updateConsultation error:", error);
    res.status(500).json({ message: "Failed to update consultation form", error: error.message });
  }
};

// ✅ NEW: Get Consultation by Appointment ID
exports.getConsultationByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment ID is required" });
    }

    // Verify appointment access
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (
      req.user._id.toString() !== appointment.patientId.toString() &&
      req.user._id.toString() !== appointment.doctorId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: "You don't have access to this appointment" });
    }

    const consultationForm = await ConsultationForm.findOne({ appointmentId })
      .populate("patientId", "-password")
      .populate("doctorId", "-password");

    if (!consultationForm) {
      return res.status(404).json({ message: "No consultation form found for this appointment" });
    }

    res.json({
      success: true,
      consultationForm,
    });
  } catch (error) {
    console.error("getConsultationByAppointment error:", error);
    res.status(500).json({ message: "Failed to fetch consultation form", error: error.message });
  }
};

// ✅ NEW: List Consultations (for patient/doctor/admin)
exports.getConsultations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};

    // Filter based on role
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctorId = req.user._id;
    }
    // Admin can see all

    if (status) {
      filter.status = status;
    }

    const total = await ConsultationForm.countDocuments(filter);
    const consultations = await ConsultationForm.find(filter)
      .populate("patientId", "name email")
      .populate("doctorId", "name email specialization")
      .populate("appointmentId", "date time type")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      consultations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getConsultations error:", error);
    res.status(500).json({ message: "Failed to fetch consultations", error: error.message });
  }
};

// ✅ NEW: Delete Consultation (patient only, if draft)
exports.deleteConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultationForm = await ConsultationForm.findById(consultationId);
    if (!consultationForm) {
      return res.status(404).json({ message: "Consultation form not found" });
    }

    // Only patient who created it can delete, and only if draft
    if (req.user._id.toString() !== consultationForm.patientId.toString() || consultationForm.status !== 'draft') {
      return res.status(403).json({ message: "Can only delete draft consultations" });
    }

    await ConsultationForm.findByIdAndDelete(consultationId);

    res.json({
      success: true,
      message: "Consultation form deleted successfully",
    });
  } catch (error) {
    console.error("deleteConsultation error:", error);
    res.status(500).json({ message: "Failed to delete consultation form", error: error.message });
  }
};
