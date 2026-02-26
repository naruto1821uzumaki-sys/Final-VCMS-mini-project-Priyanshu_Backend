const helmet = require("helmet");
const cors = require("cors");

/**
 * Enhanced Security Configuration
 * Comprehensive security headers and middleware setup
 */

// CORS configuration with restricted origins
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173", // Vite dev server
      "http://localhost:8080", // Vite dev server (production port)
      "http://localhost:8081", // Vite dev server (alt port)
      "http://localhost:5000",
      process.env.FRONTEND_URL, // Production frontend
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    // Also allow any localhost port in development
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  maxAge: 86400, // 24 hours
};

// Enhanced Helmet configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline for Vite HMR in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://"],
      fontSrc: ["'self'", "fonts.googleapis.com", "fonts.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
    reportUri: "/api/security/csp-report",
  },
  crossOriginEmbedderPolicy: false, // WebRTC requires this
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: {
    action: "deny",
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
  xssFilter: true,
};

// Get helmet middleware
const helmetMiddleware = helmet(helmetConfig);

// Get CORS middleware
const corsMiddleware = cors(corsOptions);

/**
 * Security headers middleware
 * Additional security headers beyond helmet
 */
const securityHeaders = (req, res, next) => {
  // Prevent browsers from guessing content type
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Prevent referrer leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Feature Policy / Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // Remove powered by header
  res.removeHeader("X-Powered-By");

  // Add HSTS header for HTTPS
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  next();
};

/**
 * Validate request size and ensure it's not too large
 */
const requestSizeLimiter = (maxSize = "10mb") => {
  return (req, res, next) => {
    const contentLength = req.headers["content-length"];

    if (!contentLength) {
      return next();
    }

    // Convert maxSize to bytes (e.g., "10mb" -> 10485760 bytes)
    const sizes = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    const match = maxSize.match(/^(\d+)(b|kb|mb|gb)$/i);
    if (!match) {
      return next();
    }

    const maxBytes = parseInt(match[1]) * sizes[match[2].toLowerCase()];

    if (parseInt(contentLength) > maxBytes) {
      return res.status(413).json({
        success: false,
        message: "Payload too large",
        code: "PAYLOAD_TOO_LARGE",
      });
    }

    next();
  };
};

/**
 * HTTP Parameter Pollution Protection
 * Prevents HPP attacks
 */
const parameterPollutionProtection = (req, res, next) => {
  const checkParams = (params) => {
    const seen = new Set();
    for (const key in params) {
      if (seen.has(key)) {
        return true; // Duplicate found
      }
      seen.add(key);
    }
    return false;
  };

  if (checkParams(req.query) || checkParams(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Duplicate parameter detected",
      code: "DUPLICATE_PARAMETER",
    });
  }

  next();
};

module.exports = {
  corsOptions,
  helmetConfig,
  helmetMiddleware,
  corsMiddleware,
  securityHeaders,
  requestSizeLimiter,
  parameterPollutionProtection,
};
