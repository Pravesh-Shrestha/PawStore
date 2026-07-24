import jwt from "jsonwebtoken";
import { Response } from "express";

const generateToken = (id: string, sessionVersion: number = 0, userAgent: string = ""): string => {
  return jwt.sign(
    {
      id,
      sessionVersion,
      userAgent,
    },
    process.env.JWT_SECRET || "fallback_secret",
    {
      expiresIn: "1d",
    }
  );
};

const setTokenCookie = (res: Response, token: string): void => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const clearTokenCookie = (res: Response): void => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
};

export { generateToken, setTokenCookie, clearTokenCookie };
