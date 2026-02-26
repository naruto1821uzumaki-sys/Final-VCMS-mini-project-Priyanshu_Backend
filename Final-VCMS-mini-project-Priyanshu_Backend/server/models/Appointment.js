const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
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
			required: true,
			index: true,
		},
		date: {
			type: Date,
			required: true,
			index: true,
		},
		time: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "confirmed", "completed", "cancelled", "in-progress", "rejected"],
			default: "pending",
		},
		type: {
			type: String,
			enum: ["video", "in-person"],
			default: "video",
		},
		symptoms: {
			type: String,
		},
		notes: {
			type: String,
		},
		roomId: {
			type: String,
			index: true,
		},
		consultationFormId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "ConsultationForm",
			index: true,
		},
		cancellationReason: String,
		cancelledBy: mongoose.Schema.Types.ObjectId,
		cancelledAt: Date,
		duration: Number, // in minutes
		actualStartTime: Date,
		actualEndTime: Date,
		isFollowUp: Boolean,
		followUpOf: mongoose.Schema.Types.ObjectId,
		nextAppointmentDate: Date,
		attachments: [{
			url: String,
			type: String,
			uploadedAt: Date,
			_id: false,
		}],
	},
	{ timestamps: true }
);

// Compound indices for common query patterns
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: -1 });
appointmentSchema.index({ status: 1, date: -1 });
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Appointment", appointmentSchema);

