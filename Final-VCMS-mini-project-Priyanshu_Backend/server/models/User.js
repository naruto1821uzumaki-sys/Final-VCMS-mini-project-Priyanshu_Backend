const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    // Note: username field removed per simplified requirements;
    // user identity will be handled using name/email only.
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient",
      index: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
    },
    address: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    profileImage: {
      type: String,
    },
    specialization: {
      type: String,
    },
    experience: {
      type: Number,
    },
    availability: [
      {
        day: String,
        startTime: String,
        endTime: String,
        _id: false,
      },
    ],
    // Public-facing doctor fields (previously in PublicDoctor model)
    displayName: String,
    city: String,
    state: String,
    latitude: Number,
    longitude: Number,
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    expertise_symptoms: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    bio: String,
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Approval system for doctors
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    // Doctor-specific fields
    consultationFee: {
      type: Number,
      min: 0,
    },
    location: String,
    adminWarnings: [{
      message: String,
      givenAt: { type: Date, default: Date.now },
      givenBy: mongoose.Schema.Types.ObjectId,
    }],
    
    // Authentication enhancement fields
    loginAttempts: {
      count: { type: Number, default: 0 },
      lastAttempt: Date,
      lockedUntil: Date,
    },
    accountStatus: {
      type: String,
      enum: ["active", "locked", "suspended"],
      default: "active",
      index: true,
    },
    lastLoginAt: Date,
    lastLogoutAt: Date,
    refreshTokens: [{
      token: String,
      expiresAt: Date,
      createdAt: { type: Date, default: Date.now },
      _id: false,
    }],
    
    age: Number,
    medicalHistory: String,
    symptoms: {
      type: [String],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound indices for common query patterns
userSchema.index({ role: 1, approvalStatus: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ phone: 1, isDeleted: 1 });
userSchema.index({ approvalStatus: 1, createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, deletedAt: 1 });

module.exports = mongoose.model("User", userSchema);
