const jwt = require('jsonwebtoken');

/**
 * Token Manager Utility
 * Handles JWT token generation, verification, and validation
 * Supports both access tokens (short-lived) and refresh tokens (long-lived)
 */

const tokenManager = {
  /**
   * Generate Access Token (short-lived - 15 minutes)
   * Used for API requests
   */
  generateAccessToken(userId, email, role) {
    return jwt.sign(
      { userId, email, role, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  },

  /**
   * Generate Refresh Token (long-lived - 7 days)
   * Used to obtain new access tokens
   */
  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  },

  /**
   * Generate both access and refresh tokens
   * Returns an object with both tokens
   */
  generateTokenPair(userId, email, role) {
    return {
      accessToken: this.generateAccessToken(userId, email, role),
      refreshToken: this.generateRefreshToken(userId),
      expiresIn: 900, // 15 minutes in seconds
    };
  },

  /**
   * Verify Access Token
   * Returns decoded token or null if invalid
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'access') {
        return null;
      }
      return decoded;
    } catch (err) {
      return null;
    }
  },

  /**
   * Verify Refresh Token
   * Returns decoded token or null if invalid
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
      if (decoded.type !== 'refresh') {
        return null;
      }
      return decoded;
    } catch (err) {
      return null;
    }
  },

  /**
   * Extract token from Authorization header
   * Expected format: "Bearer <token>"
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    return parts[1];
  },

  /**
   * Validate token format and expiry without throwing
   * Returns { valid: boolean, error?: string }
   */
  validateToken(token) {
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return { valid: true };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired', isExpired: true };
      } else if (err.name === 'JsonWebTokenError') {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: 'Token validation failed' };
    }
  },
};

module.exports = tokenManager;
