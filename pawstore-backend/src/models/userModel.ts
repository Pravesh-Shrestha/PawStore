import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IPasswordHistory {
  password: string;
  changedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  passwordChangedAt: Date | null;
  passwordExpiresAt: Date | null;
  passwordHistory: IPasswordHistory[];
  loginAttempts: number;
  lockUntil: Date | null;
  accountLocked: boolean;
  lastFailedLogin: Date | null;
  isLocked: boolean;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  mfaMethod: "app" | "none";
  mfaVerified: boolean;
  sessionVersion: number;
  matchPassword(enteredPassword: string): Promise<boolean>;
  isPasswordExpired(): boolean;
  isPasswordReused(newPassword: string): Promise<boolean>;
  addToPasswordHistory(password: string): Promise<void>;
  incrementLoginAttempts(): Promise<IUser>;
  resetLoginAttempts(): void;
  generateMFASecret(): string;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    passwordChangedAt: { type: Date, default: null },
    passwordExpiresAt: { type: Date, default: null },
    passwordHistory: [
      {
        password: { type: String },
        changedAt: { type: Date },
      },
    ],
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    accountLocked: { type: Boolean, default: false },
    lastFailedLogin: { type: Date },
    mfaSecret: { type: String, default: null },
    mfaEnabled: { type: Boolean, default: false },
    mfaMethod: { type: String, enum: ["app", "none"], default: "none" },
    mfaVerified: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.virtual("isLocked").get(function (this: IUser) {
  if (this.lockUntil && new Date(this.lockUntil).getTime() > Date.now()) {
    return true;
  }
  return this.accountLocked;
});

userSchema.methods.matchPassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isPasswordExpired = function (this: IUser): boolean {
  if (!this.passwordExpiresAt) return false;
  return Date.now() > new Date(this.passwordExpiresAt).getTime();
};

userSchema.methods.isPasswordReused = async function (this: IUser, newPassword: string): Promise<boolean> {
  for (const entry of this.passwordHistory) {
    if (entry.password && (await bcrypt.compare(newPassword, entry.password))) {
      return true;
    }
  }
  return false;
};

userSchema.methods.addToPasswordHistory = async function (this: IUser, password: string): Promise<void> {
  this.passwordHistory.push({
    password,
    changedAt: new Date(),
  });
  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }
};

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

userSchema.methods.resetLoginAttempts = function (this: IUser) {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.accountLocked = false;
};

userSchema.methods.generateMFASecret = function (this: IUser) {
  return crypto.randomBytes(20).toString("hex");
};

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