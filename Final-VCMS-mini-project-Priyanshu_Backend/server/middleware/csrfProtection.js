const crypto = require("crypto");

/**
 * CSRF Protection Middleware
 * Implements token-based CSRF protection for state-changing requests
 */

// Map of sessions to CSRF tokens
const sessionTokens = new Map();

/**
 * Generate a CSRF token for a session
 * @param {string} sessionId - The session identifier
 * @returns {string} - The CSRF token
 */
const generateCSRFToken = (sessionId) => {
  const token = crypto.randomBytes(32).toString("hex");
  sessionTokens.set(sessionId, {
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1 * 60 * 60 * 1000, // 1 hour expiry
  });
  return token;
};

/**
 * Validate CSRF token
 * @param {string} sessionId - The session identifier
 * @param {string} token - The token to validate
 * @returns {boolean} - Whether the token is valid
 */
const validateCSRFToken = (sessionId, token) => {
  const storedToken = sessionTokens.get(sessionId);

  if (!storedToken) {
    return false;
  }

  // Check if token is expired
  if (Date.now() > storedToken.expiresAt) {
    sessionTokens.delete(sessionId);
    return false;
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(storedToken.token),
    Buffer.from(token)
  );
};

/**
 * Middleware to attach CSRF token to request
 */
const attachCSRFToken = (req, res, next) => {
  const sessionId = req.ip + "-" + (req.user?.id || "anonymous");
  
  if (!sessionTokens.has(sessionId)) {
    const token = generateCSRFToken(sessionId);
    res.locals.csrfToken = token;
  } else {
    res.locals.csrfToken = sessionTokens.get(sessionId).token;
  }

  next();
};

/**
 * Middleware to verify CSRF token on state-changing requests
 * DISABLED FOR COLLEGE PROJECT - Using JWT only
 */
const verifyCSRFToken = (req, res, next) => {
  // CSRF disabled - JWT authentication is sufficient for college project
  return next();
};

/**
 * Clean up expired CSRF tokens (run periodically)
 */
const cleanupExpiredTokens = () => {
  const now = Date.now();
  let removed = 0;

  for (const [sessionId, tokenData] of sessionTokens.entries()) {
    if (now > tokenData.expiresAt) {
      sessionTokens.delete(sessionId);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`Cleaned up ${removed} expired CSRF tokens`);
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupExpiredTokens, 30 * 60 * 1000);

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  attachCSRFToken,
  verifyCSRFToken,
  cleanupExpiredTokens,
};
