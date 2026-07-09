import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { monitorEvent } from "./monitoring";
import AuditLog from "../models/auditLogModel";

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Activity logging system for auditing and security review.
 * Logs meaningful user actions without exposing sensitive data.
 * 
 * Log levels:
 * - INFO: General user actions (login, logout, profile update)
 * - WARN: Suspicious activity (failed login, rate limit hit)
 * - ERROR: System errors
 * - SECURITY: Security-sensitive events (MFA changes, password changes)
 */

const logLevels = {
  INFO: "INFO" as const,
  WARN: "WARN" as const,
  ERROR: "ERROR" as const,
  SECURITY: "SECURITY" as const,
};

type LogLevel = typeof logLevels[keyof typeof logLevels];

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  userId: string;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
}

/**
 * Sanitize log data to remove sensitive information
 */
function sanitizeData(data: Record<string, any>): Record<string, any> {
  if (!data) return {};
  const sanitized = { ...data };
  const sensitiveFields = [
    "password", "token", "authorization", "cookie",
    "mfaSecret", "mfaToken", "secret", "jwt",
  ];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  if (sanitized.headers) {
    sanitized.headers = "[REDACTED]";
  }
  return sanitized;
}

/**
 * Write a log entry to the audit log file
 */
function writeLog(
  level: LogLevel,
  action: string,
  userId: string,
  details: Record<string, any> = {},
  req: any = null
): void {
  const timestamp = new Date().toISOString();
  const logEntry: LogEntry = {
    timestamp,
    level,
    action,
    userId: userId || "anonymous",
    ip: req?.ip || req?.connection?.remoteAddress || "unknown",
    userAgent: req?.headers?.["user-agent"] || "unknown",
    details: sanitizeData(details),
  };

  const logLine = JSON.stringify(logEntry) + "\n";
  const dateStr = new Date().toISOString().split("T")[0];
  const logFile = path.join(logsDir, `audit-${dateStr}.log`);

  try {
    fs.appendFileSync(logFile, logLine, "utf8");
  } catch (err: any) {
    console.error("Failed to write audit log:", err.message);
  }

  const consoleMsg = `[${timestamp}] [${level}] [${action}] User: ${logEntry.userId} IP: ${logEntry.ip}`;
  
  if (level === logLevels.ERROR || level === logLevels.SECURITY) {
    console.error(`🔴 ${consoleMsg}`, details);
  } else if (level === logLevels.WARN) {
    console.warn(`🟡 ${consoleMsg}`, details);
  } else {
    console.log(`🟢 ${consoleMsg}`);
  }

  // Feed critical events into the real-time monitoring system
  monitorEvent(action, logEntry.userId, logEntry.ip, level, details);

  // Also persist to MongoDB for the admin audit log dashboard (fire-and-forget)
  try {
    const auditEntry = new AuditLog({
      timestamp: new Date(timestamp),
      level,
      action,
      userId: logEntry.userId,
      userName: details?.userName || "",
      userEmail: details?.userEmail || "",
      ip: logEntry.ip,
      userAgent: logEntry.userAgent,
      method: details?.method || "",
      url: details?.url || "",
      statusCode: details?.statusCode || 0,
      duration: details?.duration || "",
      details: sanitizeData(details),
    });
    auditEntry.save().catch((err: any) => {
      // Silently fail - file logging is the fallback
      if (process.env.NODE_ENV === "development") {
        console.error("MongoDB audit log failed:", err.message);
      }
    });
  } catch {
    // Ignore MongoDB write errors - file logging is sufficient
  }
}

/**
 * Activity logger middleware - logs all incoming requests for full audit trail
 * Reads user info at response time (after auth middleware has run) for accuracy
 */
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  const startTime = Date.now();

  res.send = function (body: any): Response {
    const duration = Date.now() - startTime;
    const user = (req as any).user;
    const userId = user?._id?.toString() || "anonymous";
    const userName = user?.name || "";
    const userEmail = user?.email || "";

    const logDetails = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userName,
      userEmail,
    };

    const isError = res.statusCode >= 500;
    const isWarning = res.statusCode >= 400;
    const level: LogLevel = isError
      ? logLevels.ERROR
      : isWarning
      ? logLevels.WARN
      : logLevels.INFO;

    // Log all requests for complete audit trail
    writeLog(level, `${req.method} ${req.originalUrl}`, userId, logDetails, req);

    return originalSend.call(this, body) as Response;
  };

  next();
};

export {
  logLevels,
  writeLog,
  requestLogger,
};
export type { LogLevel };
