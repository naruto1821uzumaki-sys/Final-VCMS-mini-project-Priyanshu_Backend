const mongoose = require("mongoose");

const medicalHistorySchema = new mongoose.Schema(
  {
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
    },
    condition: {
      type: String,
      required: true,
    },
    description: String,
    diagnosis: String,
    treatment: String,
    date: {
      type: Date,
      default: Date.now,
    },
    attachments: [String],
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indices for common queries
medicalHistorySchema.index({ patientId: 1, date: -1 });
medicalHistorySchema.index({ doctorId: 1, createdAt: -1 });
medicalHistorySchema.index({ patientId: 1, condition: 1 });
medicalHistorySchema.index({ appointmentId: 1, patientId: 1 });

module.exports = mongoose.model("MedicalHistory", medicalHistorySchema);
