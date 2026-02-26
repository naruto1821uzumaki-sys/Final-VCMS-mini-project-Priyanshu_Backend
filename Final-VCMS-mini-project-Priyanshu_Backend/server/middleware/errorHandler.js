/**
 * Global Error Handling Middleware
 * Provides consistent error responses and security measures
 */

const { logSuspiciousActivity } = require("./auditLogger");

const errorHandler = (err, req, res, next) => {
  // Log error details (but don't expose sensitive info to client)
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  console.error(`Stack: ${err.stack}`);

  // Determine error details
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let code = err.code || "INTERNAL_SERVER_ERROR";

  // Handle specific error types
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID format";
    code = "INVALID_ID_FORMAT";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    const messages = Object.values(err.errors).map((val) => val.message);
    message = messages.join(", ");
    code = "VALIDATION_ERROR";
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    code = "DUPLICATE_KEY";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
  } else if (err.name === "SyntaxError" && err instanceof SyntaxError) {
    // JSON parsing error
    statusCode = 400;
    message = "Invalid JSON in request body";
    code = "INVALID_JSON";
  }

  // Log suspicious activity for certain errors
  if ([401, 403].includes(statusCode)) {
    logSuspiciousActivity({
      activity: "AUTHENTICATION_ERROR",
      severity: "medium",
      userId: req.user?.id || "anonymous",
      ipAddress: req.ip,
      endpoint: req.path,
      details: {
        method: req.method,
        statusCode: statusCode,
        errorCode: code,
      },
    });
  }

  // Handle CSRF errors
  if (code === "CSRF_TOKEN_INVALID" || code === "CSRF_TOKEN_MISSING") {
    logSuspiciousActivity({
      activity: "CSRF_TOKEN_ERROR",
      severity: "high",
      userId: req.user?.id || "anonymous",
      ipAddress: req.ip,
      endpoint: req.path,
      details: {
        method: req.method,
        errorCode: code,
      },
    });
  }

  // Don't expose stack trace or internal details in production
  const response = {
    success: false,
    message: message,
    code: code,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err.details,
    }),
  };

  // Set security headers for error responses
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
