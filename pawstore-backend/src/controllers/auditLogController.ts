/**
 * @file auditLogController.ts
 * @description Administrative Audit Log Management & Security Analytics Controller.
 * 
 * SECURITY ARCHITECTURE & VULNERABILITY REMEDIATION:
 * - OWASP WSTG Mapping: WSTG-INPV-05 (Testing for NoSQL Injection).
 * - Vulnerability Remediation: Remediates VULN-04 (NoSQL Operator Injection in Administrative Audit Log Filters).
 *   Enforces strict string type checking and 24-character hexadecimal ObjectId regex validation (`/^[0-9a-fA-F]{24}$/`)
 *   to prevent attackers from passing object query operators like `{$gt: ''}` or `{$ne: null}`.
 * - Access Control: Protected via `protect` and `admin` middleware (RBAC).
 */

import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import AuditLog from "../models/auditLogModel";

/**
 * Helper to escape special regex characters from user input to mitigate ReDoS & NoSQL regex injection.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @desc    Get audit logs with pagination, filtering, and search
 * @route   GET /api/audit-logs
 * @access  Private/Admin
 * 
 * SECURITY CONTROL (VULN-04 Defense):
 * Validates `userId` query parameter to prevent NoSQL query operator injection.
 * Rejects non-string inputs or invalid MongoDB ObjectId patterns with HTTP 400 Bad Request.
 */
const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  // Strict Query Parameter Allowlist
  const allowedParams = ["page", "limit", "level", "action", "search", "userId", "startDate", "endDate"];
  for (const param of Object.keys(req.query)) {
    if (!allowedParams.includes(param)) {
      res.status(400);
      throw new Error(`Invalid or unrecognized query parameter: ${param}`);
    }
  }

  const filter: any = {};

  if (req.query.level && typeof req.query.level === "string") {
    filter.level = req.query.level;
  }

  if (req.query.action && typeof req.query.action === "string") {
    const safeAction = escapeRegex(req.query.action);
    filter.action = { $regex: safeAction, $options: "i" };
  }

  // ✅ FIX: NoSQL Injection Protection for userId
  if (req.query.userId) {
    // 🚨 Detect object-based injection attempts
    if (typeof req.query.userId === "object") {
      res.status(400);
      throw new Error("Invalid userId parameter format");
    }

    // ✅ Validate string format
    if (typeof req.query.userId === "string" && /^[0-9a-fA-F]{24}$/.test(req.query.userId)) {
      filter.userId = req.query.userId;
    } else {
      res.status(400);
      throw new Error("Invalid ObjectId format for userId parameter");
    }
  }

  if (req.query.search && typeof req.query.search === "string") {
    const safeSearch = escapeRegex(req.query.search);
    const searchRegex = { $regex: safeSearch, $options: "i" };
    filter.$or = [
      { action: searchRegex },
      { userName: searchRegex },
      { userEmail: searchRegex },
      { ip: searchRegex },
      { url: searchRegex },
    ];
  }

  // Date range filtering with sanitized Date parsing
  if (req.query.startDate || req.query.endDate) {
    filter.timestamp = {};
    if (req.query.startDate && typeof req.query.startDate === "string") {
      filter.timestamp.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate && typeof req.query.endDate === "string") {
      filter.timestamp.$lte = new Date(req.query.endDate);
    }
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    filters: {
      levels: ["INFO", "WARN", "ERROR", "SECURITY"],
    },
  });
});

// @desc    Get distinct audit log actions (for filter dropdown)
// @route   GET /api/audit-logs/actions
// @access  Private/Admin
const getAuditLogActions = asyncHandler(async (req: Request, res: Response) => {
  const actions = await AuditLog.distinct("action");
  res.json({ actions: actions.sort() });
});

// @desc    Get audit log summary/stats
// @route   GET /api/audit-logs/summary
// @access  Private/Admin
const getAuditLogSummary = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalLogs, todayCount, weekCount, levelCounts, topActions] =
    await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ timestamp: { $gte: todayStart } }),
      AuditLog.countDocuments({ timestamp: { $gte: weekAgo } }),
      AuditLog.aggregate([
        { $group: { _id: "$level", count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

  const byLevel: Record<string, number> = { INFO: 0, WARN: 0, ERROR: 0, SECURITY: 0 };
  levelCounts.forEach((item: any) => {
    byLevel[item._id] = item.count;
  });

  res.json({
    totalLogs,
    todayCount,
    weekCount,
    byLevel,
    topActions,
  });
});

// @desc    Delete old audit logs (admin cleanup)
// @route   DELETE /api/audit-logs
// @access  Private/Admin
const deleteOldAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await AuditLog.deleteMany({ timestamp: { $lt: cutoff } });

  res.json({
    message: `Deleted ${result.deletedCount} audit logs older than ${days} days`,
    deletedCount: result.deletedCount,
  });
});

export {
  getAuditLogs,
  getAuditLogActions,
  getAuditLogSummary,
  deleteOldAuditLogs,
};
