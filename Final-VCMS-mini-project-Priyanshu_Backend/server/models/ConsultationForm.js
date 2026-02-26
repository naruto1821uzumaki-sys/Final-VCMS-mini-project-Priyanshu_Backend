const mongoose = require("mongoose");

const symptomsSchema = new mongoose.Schema(
  {
    symptom: String,
    duration: String,
    severity: {
      type: String,
      enum: ["mild", "moderate", "severe"],
    },
    _id: false,
  },
  { _id: false }
);

const pastTreatmentSchema = new mongoose.Schema(
  {
    treatment: String,
    year: Number,
    _id: false,
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    url: String,
    type: String,
    uploadedAt: { type: Date, default: Date.now },
    _id: false,
  },
  { _id: false }
);

const aiAnalysisSchema = new mongoose.Schema(
  {
    generated: { type: Boolean, default: false },
    summary: String,
    risks: [String],
    generatedAt: Date,
    disclaimerShown: { type: Boolean, default: false },
    disclaimerAgreedAt: Date,
    _id: false,
  },
  { _id: false }
);

const consultationFormSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Current problem
    currentProblem: String,
    symptoms: [symptomsSchema],
    sinceDate: Date,

    // Medical background
    pastTreatments: [pastTreatmentSchema],
    allergies: [String],
    familyHistory: String,
    currentMedications: [String],

    // Documents
    uploadedReports: [reportSchema],

    // AI analysis
    aiAnalysis: aiAnalysisSchema,

    // Status
    status: {
      type: String,
      enum: ["draft", "submitted", "reviewed", "completed"],
      default: "draft",
      index: true,
    },

    reviewNotes: String,
  },
  { timestamps: true }
);

// Compound indices for common query patterns
consultationFormSchema.index({ appointmentId: 1, patientId: 1 });
consultationFormSchema.index({ appointmentId: 1, status: 1 });

module.exports = mongoose.model("ConsultationForm", consultationFormSchema);
