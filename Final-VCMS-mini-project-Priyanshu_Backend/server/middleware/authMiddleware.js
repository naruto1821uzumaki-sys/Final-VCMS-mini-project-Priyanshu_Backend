const jwt = require("jsonwebtoken");
const User = require("../models/User");
const tokenManager = require("../utils/tokenManager");

/**
 * Enhanced authentication middleware
 * Supports both old tokens (localStorage) and new refresh token system
 * Backward compatible with existing user sessions
 */

// 🔐 Protect Route (Enhanced)
exports.protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Fallback: Check for token in cookies (new refresh token system)
  if (!token && req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Verify access token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    req.user = await User.findById(decoded.userId || decoded.id).select(
      "-password"
    );

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if account is locked
    if (req.user.accountStatus === "locked") {
      return res.status(401).json({
        message: "Account is locked. Please contact support.",
        locked: true,
      });
    }

    // Check if account is suspended
    if (req.user.accountStatus === "suspended") {
      return res.status(403).json({
        message: "Account has been suspended.",
        suspended: true,
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        expired: true,
        error: error.message,
      });
    }

    return res.status(401).json({
      message: "Not authorized, token failed",
      error: error.message,
    });
  }
};

// 🔐 Role Based Access
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied for role: ${req.user.role}`,
      });
    }

    next();
  };
};

// 🔐 Admin Only
exports.ensureAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin role required.",
    });
  }

  next();
};

// 🔐 Doctor or Admin
exports.isDoctorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!["doctor", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Access denied. Doctor or Admin role required.",
    });
  }

  next();
};

// 🔐 Check Doctor Approval Status
exports.isDoctorApproved = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (req.user.role !== "doctor") {
    return res.status(403).json({
      message: "This endpoint is for doctors only.",
    });
  }

  // Refresh user data from database
  const user = await User.findById(req.user._id).select("-password");

  if (user.approvalStatus !== "approved") {
    return res.status(403).json({
      message: "Your account has not been approved yet.",
      status: user.approvalStatus,
    });
  }

  req.user = user; // Update with fresh data
  next();
};

// 🔐 Optional Authentication
// Uses if available, continues if not
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token && req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId || decoded.id).select(
      "-password"
    );
  } catch (error) {
    req.user = null;
  }

  next();
};
