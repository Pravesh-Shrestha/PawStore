import express from "express";
const router = express.Router();

import {
  getMonitoringEvents,
  getMonitoringSummary,
  getAuditLogs,
} from "../controllers/monitoringController";
import { protect, admin } from "../middleware/authMiddleware";

// All monitoring routes require admin access
router.get("/events", protect, admin, getMonitoringEvents);
router.get("/summary", protect, admin, getMonitoringSummary);
router.get("/logs", protect, admin, getAuditLogs);

export default router;
