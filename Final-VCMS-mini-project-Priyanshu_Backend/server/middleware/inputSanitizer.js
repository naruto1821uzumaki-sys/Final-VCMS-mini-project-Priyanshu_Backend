const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

/**
 * Security Hardening Middleware
 * Provides comprehensive input validation and sanitization
 */

// Sanitize data against NoSQL injection
const sanitizeInput = mongoSanitize({
  replaceWith: "_", // Replace prohibited characters with underscore
  onSanitize: ({ req, key }) => {
    console.warn(`Potential injection attempt detected in field: ${key}`);
  },
});

// Clean XSS attacks from user input
const sanitizeXSS = xss();

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone format
const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ""));
};

// Validate password strength
const validatePassword = (password) => {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters`,
    };
  }
  if (!hasUppercase) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!hasLowercase) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!hasNumber) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }
  if (!hasSpecialChar) {
    return {
      valid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { valid: true, message: "Password is strong" };
};

// Validate date format (YYYY-MM-DD)
const validateDate = (date) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
};

// Validate time format (HH:MM)
const validateTime = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Sanitize string input (prevent NoSQL injection)
const sanitizeString = (str) => {
  if (typeof str !== "string") {
    return str;
  }
  // Remove dangerous characters
  return str.replace(/[\$\{\}\[\]]/g, "");
};

// Check for suspicious patterns
const checkSuspiciousInput = (obj) => {
  const suspiciousPatterns = /[\$\{\}\[\]]/g;
  
  for (const key in obj) {
    if (typeof obj[key] === "string" && suspiciousPatterns.test(obj[key])) {
      return {
        isSuspicious: true,
        field: key,
        value: obj[key],
      };
    }
  }
  
  return { isSuspicious: false };
};

module.exports = {
  sanitizeInput,
  sanitizeXSS,
  validateEmail,
  validatePhone,
  validatePassword,
  validateDate,
  validateTime,
  sanitizeString,
  checkSuspiciousInput,
};
