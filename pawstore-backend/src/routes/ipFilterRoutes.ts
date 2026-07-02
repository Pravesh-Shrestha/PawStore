import express from "express";
import asyncHandler from "express-async-handler";
import { protect, admin } from "../middleware/authMiddleware";
import {
  getIPLists,
  addToAllowList,
  removeFromAllowList,
  addToBlockList,
  removeFromBlockList,
} from "../middleware/ipFilter";
import { writeLog, logLevels } from "../utils/activityLogger";

const router = express.Router();

// @desc    Get current IP allow/block lists
// @route   GET /api/admin/ip-lists
// @access  Private/Admin
router.get(
  "/",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const lists = getIPLists();
    res.json(lists);
  })
);

// @desc    Add IP/CIDR to allow-list
// @route   POST /api/admin/ip-lists/allow
// @access  Private/Admin
router.post(
  "/allow",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { entry } = req.body;

    if (!entry || typeof entry !== "string") {
      res.status(400);
      throw new Error("IP address or CIDR range is required");
    }

    // Basic validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipv4Regex.test(entry)) {
      res.status(400);
      throw new Error("Invalid IP address or CIDR format");
    }

    addToAllowList(entry);

    writeLog(logLevels.INFO, "IP_ADDED_TO_ALLOW_LIST", (req.user as any)._id.toString(), {
      entry,
    }, req);

    res.json({ message: `Added ${entry} to allow-list`, entry });
  })
);

// @desc    Remove IP/CIDR from allow-list
// @route   DELETE /api/admin/ip-lists/allow/:entry
// @access  Private/Admin
router.delete(
  "/allow/:entry",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const entry = decodeURIComponent(req.params.entry as string);
    removeFromAllowList(entry);

    writeLog(logLevels.INFO, "IP_REMOVED_FROM_ALLOW_LIST", (req.user as any)._id.toString(), {
      entry,
    }, req);

    res.json({ message: `Removed ${entry} from allow-list` });
  })
);

// @desc    Add IP/CIDR to block-list
// @route   POST /api/admin/ip-lists/block
// @access  Private/Admin
router.post(
  "/block",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { entry } = req.body;

    if (!entry || typeof entry !== "string") {
      res.status(400);
      throw new Error("IP address or CIDR range is required");
    }

    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipv4Regex.test(entry)) {
      res.status(400);
      throw new Error("Invalid IP address or CIDR format");
    }

    addToBlockList(entry);

    writeLog(logLevels.INFO, "IP_ADDED_TO_BLOCK_LIST", (req.user as any)._id.toString(), {
      entry,
    }, req);

    res.json({ message: `Added ${entry} to block-list`, entry });
  })
);

// @desc    Remove IP/CIDR from block-list
// @route   DELETE /api/admin/ip-lists/block/:entry
// @access  Private/Admin
router.delete(
  "/block/:entry",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const entry = decodeURIComponent(req.params.entry as string);
    removeFromBlockList(entry);

    writeLog(logLevels.INFO, "IP_REMOVED_FROM_BLOCK_LIST", (req.user as any)._id.toString(), {
      entry,
    }, req);

    res.json({ message: `Removed ${entry} from block-list` });
  })
);

export default router;
