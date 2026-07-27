/**
 * @file authMiddleware.ts
 * @description Authentication & Authorization Security Middleware for PawStore API.
 * 
 * SECURITY ARCHITECTURE & STANDARDS MAPPING:
 * - NIST Zero-Trust Principles: Enforces "Verify Explicitly" (every request must carry a valid token)
 *   and "Assume Breach" (session versioning & User-Agent binding).
 * - OWASP WSTG Mapping: WSTG-SESS-06 (Logout & Session Invalidation), WSTG-ATHZ-02 (RBAC Validation).
 * - Defense-in-Depth Model: Layer 7 (Session Binding, Revocation & RBAC Checks).
 * - Vulnerability Remediation: Remediates VULN-05 (Post-Logout JWT Token Revocation Gap) by comparing
 *   token issuance time (`iat`) against `user.lastLogout`.
 */

import jwt, { JwtPayload } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/userModel";
import { writeLog, logLevels } from "../utils/activityLogger";

// Extend Express Request interface to attach authenticated user entity
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * Interface representing decoded JWT payload fields.
 * Includes security claims for session versioning and client browser binding.
 */
interface DecodedToken extends JwtPayload {
  id: string;             // User MongoDB ObjectId
  sessionVersion?: number; // Incremented on password change to invalidate older sessions
  userAgent?: string;      // User-Agent string captured during authentication
}

/**
 * Protect Middleware (`protect`)
 * Validates JWT token from HttpOnly cookie or Authorization Bearer header.
 * Performs multi-stage security validation:
 * 1. Token extraction & cryptographic signature verification (HMAC-SHA256)
 * 2. User existence, account activation, and lockout checks
 * 3. 90-day password expiration policy validation
 * 4. VULN-05 Remediation: Token revocation check against user.lastLogout timestamp
 * 5. Session Versioning check: invalidates token if password was reset
 * 6. User-Agent Binding check: prevents stolen token replay across different client environments
 */
const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Step 1: Extract token from HttpOnly cookie (preferred secure channel) or Authorization header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Reject unauthenticated requests lacking a token
  if (!token) {
    writeLog(logLevels.WARN, "AUTH_NO_TOKEN", "anonymous", {
      ip: req.ip,
      url: req.originalUrl,
    }, req);
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    // Step 2: Verify JWT cryptographic signature using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as DecodedToken;

    // Step 3: Fetch active user record from database
    const user = await User.findById(decoded.id);

    if (!user) {
      writeLog(logLevels.WARN, "AUTH_USER_NOT_FOUND", decoded.id, {}, req);
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    // Step 4: Verify Account Status (Active Check)
    if (!user.isActive) {
      writeLog(logLevels.WARN, "AUTH_INACTIVE_ACCOUNT", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Account has been deactivated");
    }

    // Step 5: Verify Account Lockout Status (5 failed attempts trigger 30-min lock)
    if (user.isLocked) {
      writeLog(logLevels.WARN, "AUTH_LOCKED_ACCOUNT", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Account is locked due to too many failed attempts. Try again later.");
    }

    // Step 6: Enforce 90-Day Password Expiration Policy (NIST SP 800-63B continuous validation)
    if (user.isPasswordExpired()) {
      writeLog(logLevels.WARN, "AUTH_PASSWORD_EXPIRED", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Password has expired. Please change your password.");
    }

    // Step 7: [VULN-05 Remediation] Post-Logout Token Revocation Validation
    // Rejects replay of tokens issued prior to user's most recent explicit logout event.
    if (user.lastLogout && decoded.iat) {
      const tokenIssuedAt = decoded.iat * 1000; // Convert seconds to milliseconds
      const lastLogoutTime = new Date(user.lastLogout).getTime();
      if (tokenIssuedAt < lastLogoutTime) {
        writeLog(logLevels.WARN, "AUTH_TOKEN_REVOKED", (user as any)._id.toString(), {}, req);
        res.status(401);
        throw new Error("Token has been revoked. Please log in again.");
      }
    }

    // Step 8: Session Versioning Validation
    // Invalidates existing JWT sessions immediately whenever a user changes password or updates security credentials.
    if (decoded.sessionVersion !== undefined && decoded.sessionVersion !== user.sessionVersion) {
      writeLog(logLevels.WARN, "AUTH_SESSION_INVALIDATED", (user as any)._id.toString(), {
        tokenVersion: decoded.sessionVersion,
        userVersion: user.sessionVersion,
      }, req);
      res.status(401);
      throw new Error("Session has been invalidated. Please log in again.");
    }

    // Step 9: User-Agent Session Binding Check
    // Detects token hijacking by comparing current request's User-Agent header with token's claim.
    if (decoded.userAgent && decoded.userAgent !== req.headers["user-agent"]) {
      writeLog(logLevels.WARN, "AUTH_SESSION_USER_AGENT_MISMATCH", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Session binding mismatch. Please log in again.");
    }

    // Attach authenticated user to request context and proceed
    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      writeLog(logLevels.WARN, "AUTH_INVALID_TOKEN", "anonymous", {
        error: error.message,
      }, req);
      res.status(401);
      throw new Error("Not authorized, invalid token");
    }
    if (error.name === "TokenExpiredError") {
      writeLog(logLevels.WARN, "AUTH_EXPIRED_TOKEN", "anonymous", {}, req);
      res.status(401);
      throw new Error("Not authorized, token expired");
    }
    if (error.message.includes("password") || 
        error.message.includes("account") || 
        error.message.includes("Session")) {
      throw error;
    }
    console.error(error);
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});

/**
 * Admin Access Control Middleware (`admin`)
 * Enforces Role-Based Access Control (RBAC) according to least-privilege principles.
 * Restricts sensitive administrative API endpoints (`/api/admin/*`) exclusively to admin users.
 */
const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    writeLog(logLevels.WARN, "AUTH_UNAUTHORIZED_ADMIN", req.user?._id?.toString() || "anonymous", {
      attemptedUrl: req.originalUrl,
    }, req);
    res.status(401);
    throw new Error("Not authorized as an admin");
  }
};

export { protect, admin };
