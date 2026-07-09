import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { getRecentEvents, CRITICAL_ACTIONS } from "../utils/monitoring";
import fs from "fs";
import path from "path";

// @desc    Get recent security events for monitoring dashboard
// @route   GET /api/monitoring/events
// @access  Private/Admin
const getMonitoringEvents = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const events = getRecentEvents(limit);
  res.json({
    total: events.length,
    criticalActions: CRITICAL_ACTIONS,
    events,
  });
});

// @desc    Get security summary/stats for dashboard
// @route   GET /api/monitoring/summary
// @access  Private/Admin
const getMonitoringSummary = asyncHandler(async (req: Request, res: Response) => {
  const events = getRecentEvents(100);

  const summary = {
    totalEvents: events.length,
    byLevel: {
      INFO: events.filter((e) => e.level === "INFO").length,
      WARN: events.filter((e) => e.level === "WARN").length,
      ERROR: events.filter((e) => e.level === "ERROR").length,
      SECURITY: events.filter((e) => e.level === "SECURITY").length,
    },
    criticalAlerts: events.filter((e) => CRITICAL_ACTIONS.includes(e.action)).length,
    recentAlerts: events.slice(0, 10),
    topActions: getTopActions(events, 5),
  };

  res.json(summary);
});

// @desc    Get audit log files info
// @route   GET /api/monitoring/logs
// @access  Private/Admin
const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const logsDir = path.join(__dirname, "../../logs");

  if (!fs.existsSync(logsDir)) {
    res.json({ files: [] });
    return;
  }

  const files = fs.readdirSync(logsDir)
    .filter((f) => f.startsWith("audit-") && f.endsWith(".log"))
    .map((f) => {
      const filePath = path.join(logsDir, f);
      const stats = fs.statSync(filePath);
      return {
        filename: f,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    })
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());

  res.json({ files, totalSize: files.reduce((acc, f) => acc + f.size, 0) });
});

function getTopActions(events: any[], count: number): { action: string; count: number }[] {
  const actionCounts: Record<string, number> = {};
  events.forEach((e) => {
    actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
  });
  return Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([action, count]) => ({ action, count }));
}

export {
  getMonitoringEvents,
  getMonitoringSummary,
  getAuditLogs,
};
