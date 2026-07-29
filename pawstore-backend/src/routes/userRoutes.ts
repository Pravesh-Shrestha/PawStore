import express from 'express';
const router = express.Router();


import {
  authUser,
  verifyMFALogin,
  registerUser,
  getUserProfile,
  updateUserProfile,
  setupMFA,
  enableMFA,
  disableMFA,
  exportUserData,
  importUserData,
  deleteOwnAccount,
  getUsers,
  deleteUser,
  unlockUser,
  logoutUser,
  getPasswordExpiry,
} from "../controllers/userController";
import {
  forgotPassword,
  resetPassword,
  validateResetToken,
} from "../controllers/passwordResetController";
import { protect, admin } from "../middleware/authMiddleware";
import {
  authLimiter,
  mfaLimiter,
  passwordChangeLimiter,
  profileUpdateLimiter,
} from "../middleware/rateLimiter";
import { verifyCaptcha } from "../middleware/captchaMiddleware";

// Public routes (with rate limiting and CAPTCHA protection)
router.route("/").post(authLimiter, verifyCaptcha, registerUser).get(protect, admin, getUsers);
router.post("/login", authLimiter, verifyCaptcha, authUser);

// Auth routes
router.post("/logout", protect, logoutUser);
router.post("/mfa/verify", protect, mfaLimiter, verifyMFALogin);

// Profile routes
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, profileUpdateLimiter, updateUserProfile);

// MFA management routes (with rate limiting to prevent brute force)
router.post("/mfa/setup", protect, mfaLimiter, setupMFA);
router.post("/mfa/enable", protect, mfaLimiter, enableMFA);
router.post("/mfa/disable", protect, mfaLimiter, disableMFA);

// Password management
router.get("/password-expiry", protect, getPasswordExpiry);

// Password reset (forgot password flow)
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/validate-reset-token", validateResetToken);

// Data management (GDPR / data portability)
router.get("/export-data", protect, exportUserData);
router.post("/import-data", protect, importUserData);
router.delete("/delete-account", protect, deleteOwnAccount);

// Admin routes
router.route("/:id").delete(protect, admin, deleteUser);
router.route("/:id/unlock").put(protect, admin, unlockUser);

export default router;



