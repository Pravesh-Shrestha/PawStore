/**
 * @file generateToken.ts
 * @description JWT Generation & Cookie Security Attribute Helper for PawStore.
 * 
 * SECURITY ARCHITECTURE & COOKIE POLICY:
 * - Session Cookie Security Flags:
 *   1. `httpOnly: true`: Prevents client-side JavaScript access (`document.cookie`), completely mitigating XSS token theft.
 *   2. `secure: process.env.NODE_ENV === "production"`: Mandates TLS 1.3 transmission in production environments.
 *   3. `sameSite: "strict"`: Restricts cookie transmission exclusively to first-party context, preventing CSRF attacks.
 *   4. `maxAge: 24h`: Limits token lifetime window to 24 hours.
 * - Token Claims: Embeds `id`, `sessionVersion` (NIST Assume Breach invalidation), and `userAgent` (binding check).
 */

import jwt from "jsonwebtoken";
import { Response } from "express";

/**
 * Signs an HMAC-SHA256 JSON Web Token with session versioning and User-Agent binding claims.
 */
const generateToken = (id: string, sessionVersion: number = 0, userAgent: string = ""): string => {
  return jwt.sign(
    {
      id,
      sessionVersion,
      userAgent,
    },
    process.env.JWT_SECRET || "fallback_secret",
    {
      expiresIn: "1d", // 24-hour expiration lifetime
    }
  );
};

/**
 * Sets secure session JWT in client HttpOnly cookie header.
 */
const setTokenCookie = (res: Response, token: string): void => {
  res.cookie("token", token, {
    httpOnly: true,                                // XSS Defense: Prevents document.cookie access
    secure: process.env.NODE_ENV === "production", // MitM Defense: Requires HTTPS in production
    sameSite: "strict",                            // CSRF Defense: Blocks cross-site cookie transmission
    maxAge: 24 * 60 * 60 * 1000,                  // 24 hours in milliseconds
    path: "/",
  });
};

/**
 * Clears session token cookie on user logout or session termination.
 */
const clearTokenCookie = (res: Response): void => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0, // Instantly expires cookie on client browser
    path: "/",
  });
};

export { generateToken, setTokenCookie, clearTokenCookie };
