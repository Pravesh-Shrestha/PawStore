import asyncHandler from "express-async-handler";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { Request, Response } from "express";
import User, { IUser } from "../models/userModel";
import { generateToken, setTokenCookie, clearTokenCookie } from "../utils/generateToken";
import { writeLog, logLevels } from "../utils/activityLogger";
import { trackFailedAttempt } from "../middleware/ipFilter";

// Helper to safely get user ID as string
const getUserId = (user: any): string => user?._id?.toString() || "unknown";

/**
 * Validate password meets policy requirements.
 */
export function validatePasswordPolicy(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }
  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  return errors;
}

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    writeLog(logLevels.WARN, "LOGIN_MISSING_FIELDS", "anonymous", { email }, req);
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    trackFailedAttempt(req.ip || "unknown");
    writeLog(logLevels.WARN, "LOGIN_FAILED_USER_NOT_FOUND", "anonymous", { email }, req);
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (user.isLocked) {
    const lockTimeLeft = user.lockUntil
      ? Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 1000 / 60)
      : 30;
    trackFailedAttempt(req.ip || "unknown");
    writeLog(logLevels.WARN, "LOGIN_LOCKED_ACCOUNT", getUserId(user), {
      lockTimeLeft: `${lockTimeLeft} minutes`,
    }, req);
    res.status(423);
    throw new Error(
      `Account is locked due to too many failed attempts. Please try again in ${lockTimeLeft} minutes.`
    );
  }

  if (!user.isActive) {
    trackFailedAttempt(req.ip || "unknown");
    writeLog(logLevels.WARN, "LOGIN_INACTIVE_ACCOUNT", getUserId(user), {}, req);
    res.status(401);
    throw new Error("Account has been deactivated");
  }

  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    await user.incrementLoginAttempts();
    const ipResult = trackFailedAttempt(req.ip || "unknown");
    writeLog(logLevels.WARN, "LOGIN_FAILED_WRONG_PASSWORD", getUserId(user), {
      attemptCount: user.loginAttempts + 1,
      autoBlocked: ipResult.blocked,
      blockReason: ipResult.reason,
    }, req);
    res.status(401);
    throw new Error("Invalid email or password");
  }

  user.resetLoginAttempts();

  // Check if password has expired (90 days)
  if (user.isPasswordExpired()) {
    writeLog(logLevels.WARN, "LOGIN_PASSWORD_EXPIRED", getUserId(user), {}, req);
    // Allow login but flag that password needs changing - send a special flag
    user.lastLogin = new Date() as any;
    user.lastLoginIP = req.ip || null;
    await user.save();

    const token = generateToken((user as any)._id.toString(), user.sessionVersion, req.headers["user-agent"]);
    setTokenCookie(res, token);

    writeLog(logLevels.INFO, "LOGIN_SUCCESS_PASSWORD_EXPIRED", getUserId(user), {
      ip: req.ip,
    }, req);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
      passwordExpired: true,
      requiresMFA: user.mfaEnabled,
      mfaVerified: false,
    });
    return;
  }

  // Update login metadata
  user.lastLogin = new Date() as any;
  user.lastLoginIP = req.ip || null;
  await user.save();

  // Generate token with session version and user agent binding
  const token = generateToken((user as any)._id.toString(), user.sessionVersion, req.headers["user-agent"]);
  setTokenCookie(res, token);

  writeLog(logLevels.INFO, "LOGIN_SUCCESS", getUserId(user), {
    ip: req.ip,
    mfaEnabled: user.mfaEnabled,
  }, req);

  // If MFA is enabled, require MFA verification
  if (user.mfaEnabled) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
      requiresMFA: true,
      mfaVerified: false,
    });
  } else {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
      requiresMFA: false,
      mfaVerified: false,
    });
  }
});

// @desc    Verify MFA token during login
// @route   POST /api/users/mfa/verify
// @access  Private
const verifyMFALogin = asyncHandler(async (req, res) => {
  const { mfaToken } = req.body;

  if (!mfaToken) {
    res.status(400);
    throw new Error("MFA token is required");
  }

  const user = await User.findById((req.user as any)._id);

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    res.status(400);
    throw new Error("MFA is not enabled for this account");
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: mfaToken,
    window: 1, // Allow 1 step before/after for time drift
  });

  if (!verified) {
    writeLog(logLevels.WARN, "MFA_VERIFY_FAILED", getUserId(user), {}, req);
    res.status(401);
    throw new Error("Invalid MFA token");
  }

  // Mark MFA as verified for this session
  user.mfaVerified = true;
  await user.save();

  writeLog(logLevels.INFO, "MFA_VERIFY_SUCCESS", getUserId(user), {}, req);

  const token = generateToken((user as any)._id.toString(), user.sessionVersion, req.headers["user-agent"]);
  setTokenCookie(res, token);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token,
    requiresMFA: false,
    mfaVerified: true,
  });
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
  }

  // Validate password policy
  const passwordErrors = validatePasswordPolicy(password);
  if (passwordErrors.length > 0) {
    writeLog(logLevels.WARN, "REGISTER_WEAK_PASSWORD", "anonymous", {
      errors: passwordErrors,
    }, req);
    res.status(400);
    throw new Error(passwordErrors.join("; "));
  }

  // Check if user already exists
  const userExists = await User.findOne({ email: email.toLowerCase().trim() });

  if (userExists) {
    writeLog(logLevels.WARN, "REGISTER_USER_EXISTS", "anonymous", { email }, req);
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
  });

  if (user) {
    // Add password to history
    await user.addToPasswordHistory(password);

    const token = generateToken((user as any)._id.toString(), user.sessionVersion, req.headers["user-agent"]);
    setTokenCookie(res, token);

    writeLog(logLevels.INFO, "REGISTER_SUCCESS", getUserId(user), {
      email: user.email,
    }, req);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById((req.user as any)._id).select(
    "-password -passwordHistory -mfaSecret"
  );

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById((req.user as any)._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Update name if provided
  if (req.body.name) {
    user.name = req.body.name.trim();
  }

  // Update email if provided
  if (req.body.email) {
    // Check if email is already taken
    const emailExists = await User.findOne({
      email: req.body.email.toLowerCase().trim(),
      _id: { $ne: user._id },
    });
    if (emailExists) {
      res.status(400);
      throw new Error("Email already in use");
    }
    user.email = req.body.email.toLowerCase().trim();
  }

  // Update password if provided
  if (req.body.password) {
    // Validate password policy
    const passwordErrors = validatePasswordPolicy(req.body.password);
    if (passwordErrors.length > 0) {
      res.status(400);
      throw new Error(passwordErrors.join("; "));
    }

    // Check password reuse (last 5 passwords)
    const isReused = await user.isPasswordReused(req.body.password);
    if (isReused) {
      writeLog(logLevels.WARN, "PASSWORD_REUSE_DENIED", getUserId(user), {}, req);
      res.status(400);
      throw new Error("Cannot reuse any of your last 5 passwords");
    }

    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  // Add new password to history if password was changed
  if (req.body.password) {
    await updatedUser.addToPasswordHistory(req.body.password);
    // Increment session version to invalidate other sessions
    updatedUser.sessionVersion += 1;
    await updatedUser.save();
    writeLog(logLevels.SECURITY, "PASSWORD_CHANGED", getUserId(user), {}, req);
  }

  writeLog(logLevels.INFO, "PROFILE_UPDATED", getUserId(user), {}, req);

  const token = generateToken(
    (updatedUser as any)._id.toString(),
    updatedUser.sessionVersion,
    req.headers["user-agent"]
  );
  setTokenCookie(res, token);

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    token,
  });
});

// @desc    Setup MFA (generate secret and QR code)
// @route   POST /api/users/mfa/setup
// @access  Private
const setupMFA = asyncHandler(async (req, res) => {
  const user = await User.findById((req.user as any)._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `PawStore:${user.email}`,
    issuer: "PawStore",
  });

  // Store secret temporarily (not enabled until verified)
  user.mfaSecret = secret.base32;
  await user.save();

  // Generate QR code
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url as string);

  writeLog(logLevels.SECURITY, "MFA_SETUP_INITIATED", getUserId(user), {}, req);

  res.json({
    secret: secret.base32,
    qrCode: qrCodeUrl,
    message: "Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy)",
  });
});

// @desc    Verify and enable MFA
// @route   POST /api/users/mfa/enable
// @access  Private
const enableMFA = asyncHandler(async (req, res) => {
  const { mfaToken } = req.body;

  if (!mfaToken) {
    res.status(400);
    throw new Error("MFA verification token is required");
  }

  const user = await User.findById((req.user as any)._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.mfaSecret) {
    res.status(400);
    throw new Error("MFA setup not initiated. Please call setup first.");
  }

  // Verify the token
  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: mfaToken,
    window: 1,
  });

  if (!verified) {
    writeLog(logLevels.WARN, "MFA_ENABLE_FAILED", getUserId(user), {}, req);
    res.status(401);
    throw new Error("Invalid MFA token. Please try again.");
  }

  // Enable MFA
  user.mfaEnabled = true;
  user.mfaMethod = "app";
  await user.save();

  writeLog(logLevels.SECURITY, "MFA_ENABLED", getUserId(user), {}, req);

  res.json({
    message: "MFA has been enabled successfully",
    mfaEnabled: true,
  });
});

// @desc    Disable MFA
// @route   POST /api/users/mfa/disable
// @access  Private
const disableMFA = asyncHandler(async (req, res) => {
  const { mfaToken, password } = req.body;

  if (!mfaToken || !password) {
    res.status(400);
    throw new Error("MFA token and password are required to disable MFA");
  }

  const user = await User.findById((req.user as any)._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Verify password before disabling MFA
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    writeLog(logLevels.WARN, "MFA_DISABLE_FAILED_WRONG_PASSWORD", getUserId(user), {}, req);
    res.status(401);
    throw new Error("Invalid password");
  }

  // Verify MFA token
  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret!,
    encoding: "base32",
    token: mfaToken,
    window: 1,
  });

  if (!verified) {
    writeLog(logLevels.WARN, "MFA_DISABLE_FAILED_WRONG_TOKEN", getUserId(user), {}, req);
    res.status(401);
    throw new Error("Invalid MFA token");
  }

  // Disable MFA
  user.mfaEnabled = false;
  user.mfaMethod = "none";
  user.mfaSecret = null;
  await user.save();

  writeLog(logLevels.SECURITY, "MFA_DISABLED", getUserId(user), {}, req);

  res.json({
    message: "MFA has been disabled successfully",
    mfaEnabled: false,
  });
});

// @desc    Export user data (GDPR compliance)
// @route   GET /api/users/export-data
// @access  Private
const exportUserData = asyncHandler(async (req, res) => {
  const user = await User.findById((req.user as any)._id)
    .select("-password -passwordHistory -mfaSecret -loginAttempts -lockUntil");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  writeLog(logLevels.INFO, "DATA_EXPORT", getUserId(user), {}, req);

  const userData = {
    accountInfo: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
    },
    exportDate: new Date().toISOString(),
    exportFormat: "json",
  };

  res.json(userData);
});

// @desc    Import user data (GDPR compliance - data portability)
// @route   POST /api/users/import-data
// @access  Private
const importUserData = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findById((req.user as any)._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Only allow importing non-sensitive fields to prevent privilege escalation
  if (name && typeof name === "string" && name.trim().length > 0) {
    user.name = name.trim();
  }

  if (email && typeof email === "string") {
    const normalizedEmail = email.toLowerCase().trim();
    // Check if email is already taken by another user
    const emailExists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });
    if (emailExists) {
      res.status(400);
      throw new Error("Email already in use");
    }
    user.email = normalizedEmail;
  }

  await user.save();

  writeLog(logLevels.INFO, "DATA_IMPORT", getUserId(user), {
    fields: Object.keys(req.body),
  }, req);

  res.json({
    message: "Profile data imported successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      mfaEnabled: user.mfaEnabled,
    },
  });
});

// @desc    Delete user account (GDPR compliance - right to be forgotten)
// @route   DELETE /api/users/delete-account
// @access  Private
const deleteOwnAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error("Password is required to delete your account");
  }

  const user = await User.findById((req.user as any)._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Verify password
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    writeLog(logLevels.WARN, "ACCOUNT_DELETE_FAILED", getUserId(user), {}, req);
    res.status(401);
    throw new Error("Invalid password");
  }

  writeLog(logLevels.SECURITY, "ACCOUNT_DELETED", getUserId(user), {}, req);

  await User.deleteOne({ _id: user._id });
  clearTokenCookie(res);

  res.json({ message: "Your account has been permanently deleted" });
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select(
    "-password -passwordHistory -mfaSecret"
  );
  res.json(users);
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    writeLog(logLevels.SECURITY, "ADMIN_DELETED_USER", (req.user as any)._id.toString(), {
      deletedUserId: getUserId(user),
      deletedUserEmail: user.email,
    }, req);
    await User.deleteOne({ _id: user._id });
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Admin unlock user account
// @route   PUT /api/users/:id/unlock
// @access  Private/Admin
const unlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.accountLocked = false;
  await user.save();

  writeLog(logLevels.INFO, "ADMIN_UNLOCKED_USER", (req.user as any)._id.toString(), {
    unlockedUserId: getUserId(user),
  }, req);

  res.json({ message: "User account has been unlocked" });
});

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  // Update lastLogout to revoke all tokens issued before this time
  const user = await User.findById((req.user as any)._id);
  if (user) {
    user.lastLogout = new Date();
    await user.save();
  }
  writeLog(logLevels.INFO, "LOGOUT", (req.user as any)._id.toString(), {}, req);
  clearTokenCookie(res);
  res.json({ message: "Logged out successfully" });
});

// @desc    Check password expiry status
// @route   GET /api/users/password-expiry
// @access  Private
const getPasswordExpiry = asyncHandler(async (req, res) => {
  const user = await User.findById((req.user as any)._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const expired = user.isPasswordExpired();
  const daysUntilExpiry = user.passwordExpiresAt
    ? Math.ceil((new Date(user.passwordExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 90;

  res.json({
    expired,
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    passwordChangedAt: user.passwordChangedAt,
    passwordExpiresAt: user.passwordExpiresAt,
  });
});

export {
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
};


