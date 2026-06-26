import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  beginRegistration,
  completeRegistration,
  beginLogin,
  completeLogin,
  getPasskeys,
  removePasskey,
  renamePasskey,
} from "../controllers/webAuthnController";
import { mfaLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Public routes (passkey login - no auth required)
router.post("/login/begin", beginLogin);
router.post("/login/complete", mfaLimiter, completeLogin);

// Protected routes (passkey management - auth required)
router.post("/register/begin", protect, beginRegistration);
router.post("/register/complete", protect, completeRegistration);
router.get("/passkeys", protect, getPasskeys);
router.put("/passkeys/:id", protect, renamePasskey);
router.delete("/passkeys/:id", protect, removePasskey);

export default router;
