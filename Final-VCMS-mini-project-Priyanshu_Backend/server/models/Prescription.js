const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		dosage: { type: String, required: true },
		frequency: { type: String, required: true }, // e.g., "twice daily"
		duration: { type: String, required: true }, // e.g., "7 days"
		instructions: String,
		quantity: Number,
		refills: { type: Number, default: 0 },
		sideEffects: [String],
		_id: false,
	},
	{ _id: false }
);

const prescriptionSchema = new mongoose.Schema(
	{
		appointmentId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Appointment",
			required: true,
			index: true,
		},
		medicalHistoryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "MedicalHistory",
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
			required: true,
			index: true,
		},
		// Prescription content
		medications: [medicationSchema],
		diagnosis: { type: String, required: true },
		clinicalNotes: String,
		treatmentPlan: String,
		followUpDate: Date,
		followUpRecommendations: String,

		// Status tracking
		status: {
			type: String,
			enum: ["draft", "issued", "viewed", "picked_up", "cancelled"],
			default: "draft",
			index: true,
		},
		issuedAt: Date,
		viewedAt: Date,
		pickedUpAt: Date,
		cancelledAt: Date,
		cancelledReason: String,

		// Validity
		validFrom: { type: Date, default: () => new Date() },
		validUntil: { type: Date, required: true },
		isActive: {
			type: Boolean,
			default: true,
			index: true,
		},

		// Pharmacy info (optional)
		pharmacyNotes: String,
		dispensedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Pharmacist reference
		},

		// Attachments
		attachments: [String], // URLs of images/PDFs

		// AI Analysis
		aiSummary: {
			generated: { type: Boolean, default: false },
			content: String,
			generatedAt: Date,
			disclaimerShown: { type: Boolean, default: false },
			disclaimerAgreedAt: Date,
		},

		// Audit
		lastModifiedBy: mongoose.Schema.Types.ObjectId,
		lastModifiedAt: Date,
	},
	{ timestamps: true }
);

// Index for common queries
prescriptionSchema.index({ patientId: 1, status: 1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1, validUntil: 1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);

