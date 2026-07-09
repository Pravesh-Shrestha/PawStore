import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import AuditLog from "../models/auditLogModel";

// @desc    Get audit logs with pagination, filtering, and search
// @route   GET /api/audit-logs
// @access  Private/Admin
const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};

  if (req.query.level) {
    filter.level = req.query.level;
  }

  if (req.query.action) {
    filter.action = { $regex: req.query.action as string, $options: "i" };
  }

  if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  if (req.query.search) {
    const searchRegex = { $regex: req.query.search as string, $options: "i" };
    filter.$or = [
      { action: searchRegex },
      { userName: searchRegex },
      { userEmail: searchRegex },
      { ip: searchRegex },
      { url: searchRegex },
    ];
  }

  // Date range filtering
  if (req.query.startDate || req.query.endDate) {
    filter.timestamp = {};
    if (req.query.startDate) {
      filter.timestamp.$gte = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filter.timestamp.$lte = new Date(req.query.endDate as string);
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
