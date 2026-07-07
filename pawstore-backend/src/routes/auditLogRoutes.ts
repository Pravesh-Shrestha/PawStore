import express from "express";
const router = express.Router();

import {
  getAuditLogs,
  getAuditLogActions,
  getAuditLogSummary,
  deleteOldAuditLogs,
} from "../controllers/auditLogController";
import { protect, admin } from "../middleware/authMiddleware";

// All audit log routes require admin access
router.get("/", protect, admin, getAuditLogs);
router.get("/actions", protect, admin, getAuditLogActions);
router.get("/summary", protect, admin, getAuditLogSummary);
router.delete("/", protect, admin, deleteOldAuditLogs);

export default router;
