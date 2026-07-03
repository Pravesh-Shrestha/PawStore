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
  
  // Methods
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
    mfaSecret: {
      type: String,
      default: null,
      // Encrypt MFA secrets at rest using AES-256-GCM
      set: function (val: string) {
        if (!val || val === null) return val;
        return encrypt(val);
      },
      get: function (val: string) {
        if (!val || val === null) return val;
        try {
          return isEncrypted(val) ? decrypt(val) : val;
        } catch {
          return val; // Return as-is if decryption fails
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

// Virtual for checking if account is locked
userSchema.virtual("isLocked").get(function (this: IUser) {
  if (this.lockUntil && new Date(this.lockUntil).getTime() > Date.now()) {
    return true;
  }
  return this.accountLocked;
});

// Method to check if entered password matches the hashed password
userSchema.methods.matchPassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if password has expired (90 days)
userSchema.methods.isPasswordExpired = function (this: IUser): boolean {
  if (!this.passwordExpiresAt) return false;
  return Date.now() > new Date(this.passwordExpiresAt).getTime();
};

// Method to check if password was previously used (last 5)
userSchema.methods.isPasswordReused = async function (this: IUser, newPassword: string): Promise<boolean> {
  for (const entry of this.passwordHistory) {
    if (entry.password && (await bcrypt.compare(newPassword, entry.password))) {
      return true;
    }
  }
  return false;
};

// Method to increment failed login attempts and lock if needed
userSchema.methods.incrementLoginAttempts = async function (this: IUser): Promise<IUser> {
  if (this.lockUntil && new Date(this.lockUntil).getTime() < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
    this.lastFailedLogin = new Date();
    return this.save();
  }

  this.loginAttempts += 1;
  this.lastFailedLogin = new Date();

  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    this.accountLocked = true;
  }

  return this.save();
};

// Method to reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function (this: IUser): void {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.accountLocked = false;
};

// Method to add password to history (keep last 5)
userSchema.methods.addToPasswordHistory = async function (this: IUser, password: string): Promise<void> {
  this.passwordHistory.push({
    password,
    changedAt: new Date(),
  });

  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }
};

// Method to generate MFA secret
userSchema.methods.generateMFASecret = function (): string {
  return crypto.randomBytes(20).toString("hex");
};

// Middleware to hash password before saving
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  this.passwordExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  next();
});

const User = mongoose.model<IUser>("User", userSchema);

export default User;
