const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		title: {
			type: String,
			required: true,
		},
		message: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			enum: ["appointment", "prescription", "system", "chat", "medical-history", "doctor-approval", "admin-warning"],
			default: "system",
			index: true,
		},
		from: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		link: String,
		data: mongoose.Schema.Types.Mixed, // For storing additional data related to notification
		
		// Read status
		isRead: {
			type: Boolean,
			default: false,
			index: true,
		},
		readAt: Date,
		
		// Priority
		priority: {
			type: String,
			enum: ["low", "normal", "high", "urgent"],
			default: "normal",
		},
		
		// Expiry
		expiresAt: Date,
		
		// Actions
		actions: [{
			label: String,
			action: String,
			color: String,
			_id: false,
		}],
	},
	{ timestamps: true }
);

// Index for common queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model("Notification", notificationSchema);

