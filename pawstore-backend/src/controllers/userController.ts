import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import User from "../models/userModel";
import { generateToken, setTokenCookie, clearTokenCookie } from "../utils/generateToken";

export function validatePasswordPolicy(password: string): string[] {
  const errors = [];
  if (password.length < 12) errors.push("Password must be at least 12 characters long");
  if (password.length > 128) errors.push("Password must not exceed 128 characters");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
  if (password.replace(/[a-zA-Z0-9]/g, "").length === 0) errors.push("Password must contain at least one special character");
  return errors;
}

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
  }
  const passwordErrors = validatePasswordPolicy(password);
  if (passwordErrors.length > 0) {
    res.status(400);
    throw new Error(passwordErrors.join("; "));
  }
  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
  });
  if (user) {
    await user.addToPasswordHistory(password);
    await user.save();
    const token = generateToken(user._id.toString());
    setTokenCookie(res, token);
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

const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id.toString());
    setTokenCookie(res, token);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  clearTokenCookie(res);
  res.json({ message: "Logged out successfully" });
});

const getUserProfile = asyncHandler(async (req, res) => {  const user = await User.findById((req.user as any)._id).select("-password");
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById((req.user as any)._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      const passwordErrors = validatePasswordPolicy(req.body.password);
      if (passwordErrors.length > 0) {
        res.status(400);
        throw new Error(passwordErrors.join("; "));
      }
      if (await user.isPasswordReused(req.body.password)) {
        res.status(400);
        throw new Error("Cannot reuse any of your last 5 passwords");
      }
      await user.addToPasswordHistory(req.body.password);
      user.password = req.body.password;
    }
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    if (user.isAdmin) {
      res.status(400);
      throw new Error("Cannot delete admin user");
    }
    await user.deleteOne();
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const unlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    if (typeof user.resetLoginAttempts === "function") {
      user.resetLoginAttempts();
      await user.save();
    }
    res.json({ message: "User account unlocked successfully" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export { registerUser, authUser, logoutUser, getUserProfile, updateUserProfile, getUsers, deleteUser, unlockUser };