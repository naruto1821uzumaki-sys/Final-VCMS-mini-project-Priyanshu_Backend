/**
 * Audit Logging Middleware
 * Logs all critical operations for security and compliance
 */

const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const auditLogFile = path.join(logsDir, "audit.log");
const suspiciousActivityFile = path.join(logsDir, "suspicious-activity.log");

/**
 * Log audit event
 * @param {object} event - Event object with action, userId, details, etc.
 */
const logAuditEvent = (event) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: event.action,
    userId: event.userId || "anonymous",
    ipAddress: event.ipAddress || "unknown",
    endpoint: event.endpoint || "unknown",
    method: event.method || "unknown",
    status: event.status || "success",
    details: event.details || {},
  };

  const logLine = JSON.stringify(logEntry) + "\n";
  fs.appendFileSync(auditLogFile, logLine, "utf8");

  console.log(`[AUDIT] ${event.action} - User: ${event.userId}, IP: ${event.ipAddress}`);
};

/**
 * Log suspicious activity
 * @param {object} event - Event object with activity details
 */
const logSuspiciousActivity = (event) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    activity: event.activity,
    severity: event.severity || "medium", // low, medium, high, critical
    userId: event.userId || "anonymous",
    ipAddress: event.ipAddress || "unknown",
    endpoint: event.endpoint || "unknown",
    details: event.details || {},
  };

  const logLine = JSON.stringify(logEntry) + "\n";
  fs.appendFileSync(suspiciousActivityFile, logLine, "utf8");

  console.warn(`[SUSPICIOUS] ${event.activity} (${event.severity}) - IP: ${event.ipAddress}`);
};

/**
 * Middleware to track authentication attempts
 */
const trackAuthAttempt = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    try {
      const response = typeof data === "string" ? JSON.parse(data) : data;

      if (req.path.includes("/auth/") || req.path.includes("/login")) {
        const event = {
          action: "AUTH_ATTEMPT",
          userId: req.body?.email || "unknown",
          ipAddress: req.ip,
          endpoint: req.path,
          method: req.method,
          status: res.statusCode === 200 ? "success" : "failed",
          details: {
            statusCode: res.statusCode,
            endpoint: req.path,
          },
        };

        if (res.statusCode === 200) {
          logAuditEvent(event);
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          event.severity = "medium";
          logSuspiciousActivity({
            activity: "AUTH_FAILURE",
            severity: event.severity,
            userId: req.body?.email || "unknown",
            ipAddress: req.ip,
            endpoint: req.path,
            details: { attempts: 1 },
          });
        }
      }
    } catch (err) {
      console.error("Error logging auth attempt:", err);
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware to track data modifications
 */
const trackDataModification = (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const originalSend = res.send;

    res.send = function (data) {
      try {
        const response = typeof data === "string" ? JSON.parse(data) : data;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          logAuditEvent({
            action: `DATA_${req.method}`,
            userId: req.user?.id || "anonymous",
            ipAddress: req.ip,
            endpoint: req.path,
            method: req.method,
            status: "success",
            details: {
              statusCode: res.statusCode,
              dataSize: JSON.stringify(req.body).length,
            },
          });
        }
      } catch (err) {
        console.error("Error logging data modification:", err);
      }

      return originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Middleware to track unauthorized access attempts
 */
const trackUnauthorizedAccess = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSuspiciousActivity({
        activity: "UNAUTHORIZED_ACCESS_ATTEMPT",
        severity: "high",
        userId: req.user?.id || "anonymous",
        ipAddress: req.ip,
        endpoint: req.path,
        details: {
          method: req.method,
          statusCode: res.statusCode,
        },
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware to track data access by role
 */
const trackDataAccess = (req, res, next) => {
  if (req.method === "GET" && req.user) {
    const sensitiveEndpoints = [
      "/users",
      "/admin",
      "/medical-history",
      "/prescription",
    ];

    const isSensitive = sensitiveEndpoints.some((endpoint) =>
      req.path.includes(endpoint)
    );

    if (isSensitive) {
      logAuditEvent({
        action: "DATA_ACCESS",
        userId: req.user.id,
        ipAddress: req.ip,
        endpoint: req.path,
        method: "GET",
        status: "success",
        details: {
          role: req.user.role,
          endpointType: "sensitive",
        },
      });
    }
  }

  next();
};

/**
 * Get audit logs (admin only)
 * @param {number} limit - Number of logs to retrieve
 * @returns {array} - Array of audit log entries
 */
const getAuditLogs = (limit = 100) => {
  try {
    const logs = fs.readFileSync(auditLogFile, "utf8").split("\n");
    return logs
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .slice(-limit);
  } catch (err) {
    console.error("Error reading audit logs:", err);
    return [];
  }
};

/**
 * Get suspicious activity logs (admin only)
 * @param {number} limit - Number of logs to retrieve
 * @returns {array} - Array of suspicious activity log entries
 */
const getSuspiciousActivityLogs = (limit = 100) => {
  try {
    const logs = fs.readFileSync(suspiciousActivityFile, "utf8").split("\n");
    return logs
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .slice(-limit);
  } catch (err) {
    console.error("Error reading suspicious activity logs:", err);
    return [];
  }
};

/**
 * Clear audit logs (admin only, with confirmation)
 * @param {string} password - Admin confirmation password
 * @returns {boolean} - Whether logs were cleared
 */
const clearAuditLogs = (olderThanDays = 30) => {
  try {
    const logs = fs.readFileSync(auditLogFile, "utf8").split("\n");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const recentLogs = logs
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .filter((log) => new Date(log.timestamp) > cutoffDate);

    fs.writeFileSync(
      auditLogFile,
      recentLogs.map((log) => JSON.stringify(log)).join("\n") + "\n",
      "utf8"
    );

    console.log(`Cleared logs older than ${olderThanDays} days`);
    return true;
  } catch (err) {
    console.error("Error clearing audit logs:", err);
    return false;
  }
};

module.exports = {
  logAuditEvent,
  logSuspiciousActivity,
  trackAuthAttempt,
  trackDataModification,
  trackUnauthorizedAccess,
  trackDataAccess,
  getAuditLogs,
  getSuspiciousActivityLogs,
  clearAuditLogs,
};
