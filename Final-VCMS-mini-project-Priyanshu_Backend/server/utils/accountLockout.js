/**
 * Account Lockout Utility
 * Manages login attempts and account locking
 * Implements account lockout after 5 failed attempts for 30 minutes
 */

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

const accountLockout = {
  /**
   * Check if account is locked
   * @param {Object} user - User document from database
   * @returns {boolean} - true if account is locked
   */
  isAccountLocked(user) {
    if (!user.loginAttempts || !user.loginAttempts.lockedUntil) {
      return false;
    }

    const now = new Date();
    const lockedUntil = new Date(user.loginAttempts.lockedUntil);

    if (now >= lockedUntil) {
      // Lock period has expired, account is no longer locked
      return false;
    }

    return true;
  },

  /**
   * Get lockout status information
   * @param {Object} user - User document from database
   * @returns {Object} - Status object with locked state and remaining time
   */
  getLockoutStatus(user) {
    if (!user.loginAttempts) {
      return { locked: false, attempts: 0 };
    }

    const now = new Date();
    const lockedUntil = user.loginAttempts.lockedUntil
      ? new Date(user.loginAttempts.lockedUntil)
      : null;

    if (lockedUntil && now < lockedUntil) {
      const remainingMs = lockedUntil - now;
      const remainingMin = Math.ceil(remainingMs / 60000);
      return {
        locked: true,
        attempts: user.loginAttempts.count,
        remainingMinutes: remainingMin,
        unlocksAt: lockedUntil,
      };
    }

    return {
      locked: false,
      attempts: user.loginAttempts.count || 0,
    };
  },

  /**
   * Record a failed login attempt
   * Increments attempt counter and locks account if limit reached
   * @param {Object} user - User document
   * @returns {Object} - Updated loginAttempts object
   */
  recordFailedAttempt(user) {
    if (!user.loginAttempts) {
      user.loginAttempts = {
        count: 0,
        lastAttempt: null,
        lockedUntil: null,
      };
    }

    user.loginAttempts.count += 1;
    user.loginAttempts.lastAttempt = new Date();

    // Lock account if max attempts reached
    if (user.loginAttempts.count >= LOCKOUT_ATTEMPTS) {
      user.loginAttempts.lockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION
      );
      user.accountStatus = 'locked';
    }

    return user.loginAttempts;
  },

  /**
   * Clear login attempts (call after successful login)
   * @param {Object} user - User document
   * @returns {Object} - Reset loginAttempts object
   */
  clearAttempts(user) {
    user.loginAttempts = {
      count: 0,
      lastAttempt: null,
      lockedUntil: null,
    };

    // Clear account lock status if not suspended
    if (user.accountStatus === 'locked') {
      user.accountStatus = 'active';
    }

    user.lastLoginAt = new Date();

    return user.loginAttempts;
  },

  /**
   * Manually unlock an account (for admin use)
   * @param {Object} user - User document
   * @returns {Object} - Reset loginAttempts object
   */
  unlockAccount(user) {
    user.loginAttempts = {
      count: 0,
      lastAttempt: null,
      lockedUntil: null,
    };

    if (user.accountStatus === 'locked') {
      user.accountStatus = 'active';
    }

    return user.loginAttempts;
  },

  /**
   * Get formatted error message for locked account
   * @param {Object} user - User document
   * @returns {string} - Error message to return to client
   */
  getLockedAccountMessage(user) {
    const status = this.getLockoutStatus(user);

    if (status.locked) {
      return `Account locked due to too many failed login attempts. Try again in ${status.remainingMinutes} minute(s).`;
    }

    return 'Account is locked';
  },
};

module.exports = accountLockout;
