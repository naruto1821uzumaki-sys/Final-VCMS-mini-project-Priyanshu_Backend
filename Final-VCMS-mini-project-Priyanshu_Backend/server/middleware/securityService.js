/**
 * Server-side Security Service
 *
 * Lightweight enforcement middleware that integrates existing
 * `inputSanitizer` and `auditLogger` to validate CSRF tokens
 * and scan payloads for suspicious patterns.
 */

const { checkSuspiciousInput } = require("./inputSanitizer");
const { logSuspiciousActivity } = require("./auditLogger");

// Optional Redis-backed CSRF store for multi-instance deployments
let redisClient = null;
try {
  const Redis = require('ioredis');
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on('error', (e) => console.error('Redis error', e));
  }
} catch (e) {
  // ioredis not installed or not configured — we'll use in-memory fallback
  redisClient = null;
}

// In-memory CSRF store: sessionId -> { token, issuedAt }
const csrfStore = new Map();

const config = {
  CSRF_TOKEN_LENGTH: 32,
  CSRF_EXPIRATION_MS: 30 * 60 * 1000, // 30 minutes
};

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generateCSRFToken(sessionId) {
  const token = generateRandomString(config.CSRF_TOKEN_LENGTH);
  console.debug('[securityService] generateCSRFToken called for session:', sessionId, 'redisEnabled:', Boolean(redisClient));
  if (redisClient) {
    const key = `csrf:${sessionId}`;
    // Set with expiry (seconds)
    await redisClient.set(key, token, 'EX', Math.ceil(config.CSRF_EXPIRATION_MS / 1000));
    console.debug('[securityService] stored CSRF token in Redis for', sessionId);
  } else {
    csrfStore.set(sessionId, { token, issuedAt: Date.now() });
    console.debug('[securityService] stored CSRF token in memory for', sessionId);
  }
  console.debug('[securityService] generated token:', token);
  return token;
}

async function validateCSRFToken(sessionId, token) {
  if (!sessionId) return false;
  if (redisClient) {
    try {
      const key = `csrf:${sessionId}`;
      const stored = await redisClient.get(key);
      if (!stored) return false;
      if (stored !== token) return false;
      // Single-use: delete key
      await redisClient.del(key);
      return true;
    } catch (e) {
      console.error('Redis CSRF validation error', e);
      return false;
    }
  }

  const entry = csrfStore.get(sessionId);
  if (!entry) return false;
  if (Date.now() - entry.issuedAt > config.CSRF_EXPIRATION_MS) {
    csrfStore.delete(sessionId);
    return false;
  }
  if (entry.token !== token) return false;
  // Single-use token
  csrfStore.delete(sessionId);
  return true;
}

function applySecurityHeaders(req, res, next) {
  try {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', "geolocation=(), microphone=()");
  } catch (err) {
    // Non-fatal
    console.error('applySecurityHeaders error', err);
  }
  next();
}

async function enforcementMiddleware(req, res, next) {
  try {
    // Skip enforcement for health, public, and AI/OCR endpoints (file uploads contain binary/medical text)
    if (req.path.startsWith('/api/health') || req.path.startsWith('/api/public') || req.path.startsWith('/api/ai')) {
      return next();
    }

    // CSRF protection for state-changing methods
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method.toUpperCase())) {
      const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
      const csrf = req.headers['x-csrf-token'] || req.body?.csrfToken;
      // If sessionId present, require valid CSRF token
      if (sessionId && !(await validateCSRFToken(sessionId, csrf))) {
        logSuspiciousActivity({
          activity: 'INVALID_CSRF',
          severity: 'high',
          ipAddress: req.ip,
          endpoint: req.path,
          details: { method: req.method },
        });
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }
    }

    // Scan body and query for suspicious patterns
    const payload = { ...(req.body || {}), ...(req.query || {}) };
    const suspicious = checkSuspiciousInput(payload || {});
    if (suspicious.isSuspicious) {
      logSuspiciousActivity({
        activity: 'SUSPICIOUS_PAYLOAD',
        severity: 'medium',
        ipAddress: req.ip,
        endpoint: req.path,
        details: { field: suspicious.field, value: suspicious.value },
      });
      return res.status(400).json({ error: 'Suspicious payload detected' });
    }

    next();
  } catch (err) {
    console.error('Security enforcement error', err);
    // Fail safe: allow request through but log
    next();
  }
}

function cleanup() {
  const now = Date.now();
  for (const [sid, entry] of csrfStore.entries()) {
    if (now - entry.issuedAt > config.CSRF_EXPIRATION_MS) csrfStore.delete(sid);
  }
}

setInterval(cleanup, 30 * 60 * 1000);

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  applySecurityHeaders,
  enforcementMiddleware,
};
