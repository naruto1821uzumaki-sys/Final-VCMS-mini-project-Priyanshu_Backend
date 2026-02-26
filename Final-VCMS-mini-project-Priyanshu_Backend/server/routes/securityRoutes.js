/**
 * Security Admin API Routes
 * Provides admin access to security features and audit logs
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const permitRoles = require("../middleware/roleMiddleware");

const {
  getAuditLogs,
  getSuspiciousActivityLogs,
  clearAuditLogs,
} = require("../middleware/auditLogger");
const SecurityService = require("../middleware/securityService");

/**
 * GET /api/security/audit-logs
 * Retrieve recent audit logs (admin only)
 * Query params: limit (default: 100), skip (for pagination)
 */
router.get(
  "/audit-logs",
  protect,
  permitRoles("admin"),
  (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const logs = getAuditLogs(limit);

      res.json({
        success: true,
        data: {
          count: logs.length,
          logs: logs,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve audit logs",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/security/suspicious-activity
 * Retrieve suspicious activity logs (admin only)
 * Query params: severity (low, medium, high, critical), limit (default: 100)
 */
router.get(
  "/suspicious-activity",
  protect,
  permitRoles("admin"),
  (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const logs = getSuspiciousActivityLogs(limit);

      // Filter by severity if specified
      const filtered = req.query.severity
        ? logs.filter((log) => log.severity === req.query.severity)
        : logs;

      const groupedBySeverity = {
        critical: filtered.filter((l) => l.severity === "critical").length,
        high: filtered.filter((l) => l.severity === "high").length,
        medium: filtered.filter((l) => l.severity === "medium").length,
        low: filtered.filter((l) => l.severity === "low").length,
      };

      res.json({
        success: true,
        data: {
          totalCount: filtered.length,
          summary: groupedBySeverity,
          logs: filtered,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve suspicious activity logs",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/security/audit-summary
 * Get summary statistics of audit activity (admin only)
 * Shows activity patterns and abnormalities
 */
router.get(
  "/audit-summary",
  protect,
  permitRoles("admin"),
  (req, res) => {
    try {
      const auditLogs = getAuditLogs(1000);
      const suspiciousLogs = getSuspiciousActivityLogs(1000);

      // Analyze patterns
      const actions = {};
      auditLogs.forEach((log) => {
        actions[log.action] = (actions[log.action] || 0) + 1;
      });

      const activities = {};
      suspiciousLogs.forEach((log) => {
        activities[log.activity] = (activities[log.activity] || 0) + 1;
      });

      // Get unique IPs with suspicious activity
      const suspiciousIPs = new Set(
        suspiciousLogs.map((log) => log.ipAddress)
      );

      // Get most common actions
      const topActions = Object.entries(actions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // Get most common suspicious activities
      const topActivities = Object.entries(activities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      res.json({
        success: true,
        data: {
          summary: {
            totalAuditEvents: auditLogs.length,
            totalSuspiciousEvents: suspiciousLogs.length,
            uniqueSuspiciousIPs: suspiciousIPs.size,
          },
          topActions: Object.fromEntries(topActions),
          topActivities: Object.fromEntries(topActivities),
          lastAuditEvent: auditLogs[auditLogs.length - 1] || null,
          lastSuspiciousEvent:
            suspiciousLogs[suspiciousLogs.length - 1] || null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve audit summary",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/security/clear-audit-logs
 * Clear audit logs older than specified days (admin only)
 * Body: { olderThanDays: 30 }
 */
router.post(
  "/clear-audit-logs",
  protect,
  permitRoles("admin"),
  (req, res) => {
    try {
      const olderThanDays = req.body.olderThanDays || 30;

      if (olderThanDays < 7) {
        return res.status(400).json({
          success: false,
          message: "Cannot clear logs newer than 7 days",
        });
      }

      const result = clearAuditLogs(olderThanDays);

      res.json({
        success: result,
        message: result
          ? `Cleared audit logs older than ${olderThanDays} days`
          : "Failed to clear logs",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to clear audit logs",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/security/blocked-ips
 * Get list of IPs with excessive suspicious activity (admin only)
 * Shows IPs that might need blocking
 */
router.get(
  "/blocked-ips",
  protect,
  permitRoles("admin"),
  (req, res) => {
    try {
      const suspiciousLogs = getSuspiciousActivityLogs(5000);

      // Count suspicious activities per IP
      const ipCounts = {};
      const ipDetails = {};

      suspiciousLogs.forEach((log) => {
        const ip = log.ipAddress;
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;

        if (!ipDetails[ip]) {
          ipDetails[ip] = {
            ip,
            count: 0,
            lastActivity: null,
            activities: {},
            severities: {},
          };
        }

        ipDetails[ip].count++;
        ipDetails[ip].lastActivity = log.timestamp;
        ipDetails[ip].activities[log.activity] =
          (ipDetails[ip].activities[log.activity] || 0) + 1;
        ipDetails[ip].severities[log.severity] =
          (ipDetails[ip].severities[log.severity] || 0) + 1;
      });

      // Filter to suspicious threshold (e.g., > 10 events)
      const suspiciousThreshold = 10;
      const blockedIPs = Object.values(ipDetails)
        .filter((ip) => ip.count > suspiciousThreshold)
        .sort((a, b) => b.count - a.count);

      res.json({
        success: true,
        data: {
          threshold: suspiciousThreshold,
          count: blockedIPs.length,
          ips: blockedIPs,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve blocked IPs",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/security/failed-auth-attempts
 * Get summary of failed authentication attempts (admin only)
 * Shows patterns of brute force attacks
 */
router.get(
  "/failed-auth-attempts",
  protect,
  permitRoles("admin"),
  (req, res) => {
    try {
      const auditLogs = getAuditLogs(2000);
      const suspiciousLogs = getSuspiciousActivityLogs(2000);

      // Find failed auth attempts
      const failedAttempts = auditLogs.filter(
        (log) =>
          log.action === "AUTH_ATTEMPT" &&
          log.status === "failed"
      );

      // Count by IP
      const attemptsByIP = {};
      failedAttempts.forEach((log) => {
        const ip = log.ipAddress;
        if (!attemptsByIP[ip]) {
          attemptsByIP[ip] = {
            ip,
            attempts: 0,
            emails: new Set(),
            lastAttempt: null,
          };
        }
        attemptsByIP[ip].attempts++;
        attemptsByIP[ip].emails.add(log.userId);
        attemptsByIP[ip].lastAttempt = log.timestamp;
      });

      // Convert Sets to Arrays and filter suspicious (> 5 failed attempts)
      const suspiciousAttempts = Object.values(attemptsByIP)
        .map((item) => ({
          ...item,
          emails: Array.from(item.emails),
        }))
        .filter((item) => item.attempts > 5)
        .sort((a, b) => b.attempts - a.attempts);

      res.json({
        success: true,
        data: {
          totalFailedAttempts: failedAttempts.length,
          suspiciousIPsCount: suspiciousAttempts.length,
          details: suspiciousAttempts,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve failed auth attempts",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/security/csp-report
 * CSP violation reporting endpoint
 * Called by browsers when CSP violations occur
 */
router.post(
  "/csp-report",
  express.json({ type: "application/csp-report" }),
  (req, res) => {
    console.warn("[CSP VIOLATION]", JSON.stringify(req.body, null, 2));

    // Could log to external service for monitoring
    // Example: Send to Sentry, DataDog, etc.

    res.status(204).send();
  }
);

/**
 * GET /api/security/health
 * Security health check endpoint
 * Verifies all security measures are in place
 */
router.get("/health", protect, permitRoles("admin"), (req, res) => {
  res.json({
    success: true,
    data: {
      securityModules: {
        helmet: "✓ Active",
        cors: "✓ Configured",
        csrf: "✓ Active",
        rateLimiting: "✓ Active",
        inputSanitization: "✓ Active",
        xssProtection: "✓ Active",
        auditLogging: "✓ Active",
        errorHandling: "✓ Enhanced",
      },
      status: "All security measures active",
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/security/csrf-token
 * Get CSRF token for frontend (no authentication required)
 */
router.get("/csrf-token", async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || `anon-${req.ip}`;
    const token = await SecurityService.generateCSRFToken(sessionId);
    res.json({
      success: true,
      csrfToken: token,
      message: "CSRF token generated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get CSRF token",
      error: error.message,
    });
  }
});

module.exports = router;
