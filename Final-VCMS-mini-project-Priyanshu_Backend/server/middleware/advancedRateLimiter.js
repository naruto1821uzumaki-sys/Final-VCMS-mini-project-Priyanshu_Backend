const rateLimit = require("express-rate-limit");

/**
 * Advanced Rate Limiting Configuration
 * Different limits for different endpoints based on sensitivity
 */

// Global rate limiter (all requests)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development - 1000 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === "/health";
  },
});

// Authentication endpoints - strict limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes (increased from 5 for development)
  message: {
    success: false,
    message: "Too many login attempts, please try again later",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration endpoint - moderate limits
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  message: {
    success: false,
    message: "Too many registration attempts, please try again later",
    code: "REGISTER_RATE_LIMIT_EXCEEDED",
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset - strict limits
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    success: false,
    message: "Too many password reset attempts, please try again later",
    code: "PASSWORD_RESET_RATE_LIMIT_EXCEEDED",
  },
  skipFailedRequests: true, // Only count failed requests
  standardHeaders: true,
  legacyHeaders: false,
});

// API operations - moderate limits
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 API requests per 15 minutes
  message: {
    success: false,
    message: "API rate limit exceeded, please try again later",
    code: "API_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Critical operations - very strict limits
const criticalOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 critical operations per hour
  message: {
    success: false,
    message: "Critical operation rate limit exceeded",
    code: "CRITICAL_OP_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin operations - high limits, skip all GET reads entirely
const adminReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // very high ceiling for development
  message: {
    success: false,
    message: "Admin panel rate limit exceeded",
    code: "ADMIN_RATE_LIMIT_EXCEEDED",
  },
  skip: () => true, // Skip rate limiting for admin panel entirely (dev mode)
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload operations - strict limits
const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 file uploads per hour
  message: {
    success: false,
    message: "File upload rate limit exceeded",
    code: "FILE_UPLOAD_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  criticalOperationLimiter,
  adminReadLimiter,
  fileUploadLimiter,
};
