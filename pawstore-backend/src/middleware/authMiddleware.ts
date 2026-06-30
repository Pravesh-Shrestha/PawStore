import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies.token;
  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "fallback");
      const user = await User.findById(decoded.id);
      if (!user) {
        res.status(401);
        throw new Error("Not authorized, user not found");
      }
      if (decoded.sessionVersion !== user.sessionVersion) {
        res.status(401);
        throw new Error("Session expired, please login again");
      }
      if (decoded.userAgent !== req.headers["user-agent"]) {
        res.status(401);
        throw new Error("Session binding invalid");
      }
      req.user = user as any;
      next();
    } catch (error) {
      res.status(401);
      throw new Error(error.message || "Not authorized, token failed");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user as any).isAdmin) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as an admin");
  }
};