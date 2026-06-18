import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  passwordChangedAt: Date | null;
  passwordExpiresAt: Date | null;
  matchPassword(enteredPassword: string): Promise<boolean>;
  isPasswordExpired(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    passwordChangedAt: { type: Date, default: null },
    passwordExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isPasswordExpired = function (this: IUser): boolean {
  if (!this.passwordExpiresAt) return false;
  return Date.now() > new Date(this.passwordExpiresAt).getTime();
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