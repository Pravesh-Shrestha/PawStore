import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import User from "../models/userModel";
import { generateToken, setTokenCookie, clearTokenCookie } from "../utils/generateToken";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
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

export { registerUser, authUser, logoutUser };