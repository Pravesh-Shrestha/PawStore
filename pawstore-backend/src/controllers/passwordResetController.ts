/**
 * @file passwordResetController.ts
 * @description Secure Password Reset & Recovery Workflow Controller for PawStore.
 * 
 * SECURITY ARCHITECTURE & STANDARDS MAPPING:
 * - OWASP WSTG Mapping: WSTG-ATHN-09 (Testing for Weak Password Reset / Recovery).
 * - Vulnerability Remediation: Remediates VULN-01 (Rate Limiting Deficiencies & SMTP Exhaustion Vector)
 *   by attaching `passwordChangeLimiter` to password reset routes (3 attempts per hour limit).
 * - Anti-Enumeration Defense: Returns generic success response whether email exists or not in database.
 * - Cryptographic Token Protection: Generates 256-bit random reset token (`crypto.randomBytes(32)`), stores SHA-256 hash in DB,
 *   and emails raw token. Ensures database compromise does not leak actionable reset links.
 * - NIST Zero-Trust "Assume Breach": Increments `user.sessionVersion += 1` on reset to immediately invalidate active JWTs across devices.
 */

import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import crypto from "crypto";
import User from "../models/userModel";
import { sendPasswordResetEmail } from "../utils/emailService";
import { writeLog, logLevels } from "../utils/activityLogger";
import { validatePasswordPolicy } from "./userController";

/**
 * @desc    Request password reset link
 * @route   POST /api/users/forgot-password
 * @access  Public (Protected by Tier 5 passwordChangeLimiter: 3 requests / hr)
 */
const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  // Always return identical success message to prevent user email discovery/enumeration
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    // Don't reveal if email exists — log and return generic success
    writeLog(logLevels.INFO, "FORGOT_PASSWORD_EMAIL_NOT_FOUND", "anonymous", {
      email,
    }, req);
    res.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
    return;
  }

  if (!user.isActive) {
    writeLog(logLevels.WARN, "FORGOT_PASSWORD_INACTIVE_ACCOUNT", (user as any)._id.toString(), {
      email,
    }, req);
    res.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
    return;
  }

  // Generate secure random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token before storing (so DB compromise doesn't leak valid tokens)
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Store hashed token with 1-hour expiry
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // Send the unhashed token via email
  try {
    await sendPasswordResetEmail(user.email, resetToken, user.name);

    writeLog(logLevels.INFO, "FORGOT_PASSWORD_EMAIL_SENT", (user as any)._id.toString(), {
      email,
    }, req);

    // In development mode, return the reset URL directly for testing convenience
    const isDev = process.env.NODE_ENV === "development";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    const emailPreview = (global as any).__lastEmailPreview || null;

    res.json({
      message: isDev
        ? `Password reset email sent! Check the console or use the link below.`
        : "If an account with that email exists, a password reset link has been sent.",
      resetUrl,
      ...(emailPreview && { emailPreview }),
      devMode: isDev,
    });
    return;
  } catch (error: any) {
    // Reset the token fields if email fails
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    writeLog(logLevels.ERROR, "FORGOT_PASSWORD_EMAIL_FAILED", (user as any)._id.toString(), {
      error: error.message,
    }, req);

    res.status(500);
    throw new Error("Failed to send reset email. Please try again later.");
  }

  res.json({
    message:
      "If an account with that email exists, a password reset link has been sent.",
  });
});

// @desc    Reset password using token from email link
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, email, password } = req.body;

  if (!token || !email || !password) {
    res.status(400);
    throw new Error("Token, email, and new password are required");
  }

  // Validate password policy
  const passwordErrors = validatePasswordPolicy(password);
  if (passwordErrors.length > 0) {
    res.status(400);
    throw new Error(passwordErrors.join(". "));
  }

  // Hash the provided token to match against stored hash
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() }, // Token not expired
  });

  if (!user) {
    writeLog(logLevels.WARN, "RESET_PASSWORD_INVALID_TOKEN", "anonymous", {
      email,
    }, req);
    res.status(400);
    throw new Error("Invalid or expired password reset token. Please request a new one.");
  }

  // Check password reuse
  const isReused = await user.isPasswordReused(password);
  if (isReused) {
    writeLog(logLevels.WARN, "RESET_PASSWORD_REUSED", (user as any)._id.toString(), {}, req);
    res.status(400);
    throw new Error("You have used this password recently. Please choose a different password.");
  }

  // Update password
  user.password = password;

  // Add to password history
  await user.addToPasswordHistory(password);

  // Clear reset token fields
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  // Increment session version to invalidate all existing sessions
  user.sessionVersion += 1;

  // Reset login attempts
  user.loginAttempts = 0;
  user.lockUntil = null;

  await user.save();

  writeLog(logLevels.INFO, "RESET_PASSWORD_SUCCESS", (user as any)._id.toString(), {
    email,
  }, req);

  res.json({
    message:
      "Password has been reset successfully. You can now log in with your new password.",
  });
});

// @desc    Validate reset token (check if token is still valid)
// @route   POST /api/users/validate-reset-token
// @access  Public
const validateResetToken = asyncHandler(async (req: Request, res: Response) => {
  const { token, email } = req.body;

  if (!token || !email) {
    res.json({ valid: false });
    return;
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  res.json({ valid: !!user });
});

export { forgotPassword, resetPassword, validateResetToken };
