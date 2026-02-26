const mongoose = require("mongoose");

const videoSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
    startTime: Date,
    endTime: Date,
  },
  { timestamps: true }
);

// Compound indices for common queries
videoSessionSchema.index({ appointmentId: 1, createdAt: -1 });
videoSessionSchema.index({ doctorId: 1, status: 1 });
videoSessionSchema.index({ patientId: 1, status: 1 });
videoSessionSchema.index({ status: 1, createdAt: -1 });
videoSessionSchema.index({ roomId: 1, status: 1 });

module.exports = mongoose.model("VideoSession", videoSessionSchema);
