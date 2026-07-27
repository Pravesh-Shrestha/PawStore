/**
 * @file userModel.ts
 * @description Mongoose User Schema & Core Security Domain Logic for PawStore.
 * 
 * SECURITY ARCHITECTURE & STANDARDS MAPPING:
 * - NIST SP 800-63B Guidelines: Adaptive password hashing with bcrypt (12 salt rounds), 90-day password expiration,
 *   and password history tracking (prevents reusing recent 5 passwords).
 * - Defense-in-Depth Model: Layer 3 (Account Lockout: 5 failed attempts trigger 30-minute lock).
 * - Data-at-Rest Protection: Automatic AES-256-GCM getter/setter hooks on `mfaSecret` field.
 * - Session Management: `sessionVersion` counter for invalidating stale JWTs and `lastLogout` timestamp for VULN-05 token revocation.
 */

import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { encrypt, decrypt, isEncrypted } from "../utils/encryption";

export interface IPasswordHistory {
  password: string;
  changedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  mfaMethod: "app" | "none";
  mfaVerified: boolean;
  passwordHistory: IPasswordHistory[];
  passwordChangedAt: Date | null;
  passwordExpiresAt: Date | null;
  loginAttempts: number;
  lockUntil: Date | null;
  sessionVersion: number;
  lastLogin: Date | null;
  lastLoginIP: string | null;
  lastLogout: Date | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  isActive: boolean;
  accountLocked: boolean;
  lastFailedLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isLocked: boolean;
  
  // Instance Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  isPasswordExpired(): boolean;
  isPasswordReused(newPassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<IUser>;
  resetLoginAttempts(): void;
  addToPasswordHistory(password: string): Promise<void>;
  generateMFASecret(): string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    /**
     * MFA Secret Storage (AES-256-GCM Encrypted at Rest)
     * Automatically encrypts TOTP secret before saving to MongoDB using Mongoose setter,
     * and decrypts automatically on property access via Mongoose getter.
     */
    mfaSecret: {
      type: String,
      default: null,
      set: function (val: string) {
        if (!val || val === null) return val;
        return encrypt(val);
      },
      get: function (val: string) {
        if (!val || val === null) return val;
        try {
          return isEncrypted(val) ? decrypt(val) : val;
        } catch {
          return val;
        }
      },
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaMethod: {
      type: String,
      enum: ["app", "none"],
      default: "none",
    },
    mfaVerified: {
      type: Boolean,
      default: false,
    },
    // Historical hashed passwords to enforce non-reuse rules
    passwordHistory: [
      {
        password: { type: String },
        changedAt: { type: Date },
      },
    ],
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    passwordExpiresAt: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    sessionVersion: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
    lastLoginIP: {
      type: String,
    },
    lastLogout: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accountLocked: {
      type: Boolean,
      default: false,
    },
    lastFailedLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

/**
 * Virtual property `isLocked`
 * Computes whether account is currently locked out based on failed login attempt counter and expiration timestamp.
 */
userSchema.virtual("isLocked").get(function (this: IUser) {
  if (this.lockUntil && new Date(this.lockUntil).getTime() > Date.now()) {
    return true;
  }
  return this.accountLocked;
});

/**
 * Compares plain text password input against stored bcrypt hash.
 */
userSchema.methods.matchPassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Evaluates whether current password exceeds the 90-day maximum lifetime policy (NIST SP 800-63B).
 */
userSchema.methods.isPasswordExpired = function (this: IUser): boolean {
  if (!this.passwordExpiresAt) return false;
  return Date.now() > new Date(this.passwordExpiresAt).getTime();
};

/**
 * Checks if new password matches any of the last 5 previously used passwords stored in passwordHistory.
 */
userSchema.methods.isPasswordReused = async function (this: IUser, newPassword: string): Promise<boolean> {
  for (const entry of this.passwordHistory) {
    if (entry.password && (await bcrypt.compare(newPassword, entry.password))) {
      return true;
    }
  }
  return false;
};

/**
 * Layer 3 Account Lockout Handler (`incrementLoginAttempts`)
 * Increments failed attempt counter on incorrect password.
 * When counter reaches 5, triggers a 30-minute account lockout (`lockUntil = Date.now() + 30m`).
 */
userSchema.methods.incrementLoginAttempts = async function (this: IUser): Promise<IUser> {
  // If lock period has expired, reset attempt counter
  if (this.lockUntil && new Date(this.lockUntil).getTime() < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
    this.lastFailedLogin = new Date();
    return this.save();
  }

  this.loginAttempts += 1;
  this.lastFailedLogin = new Date();

  // Enforce 5-attempt threshold -> 30 minute lock duration
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    this.accountLocked = true;
  }

  return this.save();
};

/**
 * Resets failed login counter upon successful authentication.
 */
userSchema.methods.resetLoginAttempts = function (this: IUser): void {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.accountLocked = false;
};

/**
 * Appends previous password hash to passwordHistory array (retains max 5 entries).
 */
userSchema.methods.addToPasswordHistory = async function (this: IUser, password: string): Promise<void> {
  this.passwordHistory.push({
    password,
    changedAt: new Date(),
  });

  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }
};

/**
 * Generates cryptographically secure random bytes for TOTP secret initialization.
 */
userSchema.methods.generateMFASecret = function (): string {
  return crypto.randomBytes(20).toString("hex");
};

/**
 * Pre-Save Middleware: Password Hashing & Expiration Date Calculation
 * Uses `bcrypt` with adaptive 12 salt rounds (~250ms computation time) to satisfy NIST SP 800-63B recommendations.
 * Automatically computes `passwordExpiresAt` set to 90 days from change date.
 */
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(12); // 12 rounds provides strong brute-force resistance
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  this.passwordExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days expiration window
  next();
});

const User = mongoose.model<IUser>("User", userSchema);

export default User;
