import jwt, { JwtPayload } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/userModel";
import { writeLog, logLevels } from "../utils/activityLogger";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface DecodedToken extends JwtPayload {
  id: string;
  sessionVersion?: number;
  userAgent?: string;
}

const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    writeLog(logLevels.WARN, "AUTH_NO_TOKEN", "anonymous", {
      ip: req.ip,
      url: req.originalUrl,
    }, req);
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as DecodedToken;

    const user = await User.findById(decoded.id);

    if (!user) {
      writeLog(logLevels.WARN, "AUTH_USER_NOT_FOUND", decoded.id, {}, req);
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    if (!user.isActive) {
      writeLog(logLevels.WARN, "AUTH_INACTIVE_ACCOUNT", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Account has been deactivated");
    }

    if (user.isLocked) {
      writeLog(logLevels.WARN, "AUTH_LOCKED_ACCOUNT", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Account is locked due to too many failed attempts. Try again later.");
    }

    if (user.isPasswordExpired()) {
      writeLog(logLevels.WARN, "AUTH_PASSWORD_EXPIRED", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Password has expired. Please change your password.");
    }

    if (user.lastLogout && decoded.iat) {
      const tokenIssuedAt = decoded.iat * 1000;
      const lastLogoutTime = new Date(user.lastLogout).getTime();
      if (tokenIssuedAt < lastLogoutTime) {
        writeLog(logLevels.WARN, "AUTH_TOKEN_REVOKED", (user as any)._id.toString(), {}, req);
        res.status(401);
        throw new Error("Token has been revoked. Please log in again.");
      }
    }

    if (decoded.sessionVersion !== undefined && decoded.sessionVersion !== user.sessionVersion) {
      writeLog(logLevels.WARN, "AUTH_SESSION_INVALIDATED", (user as any)._id.toString(), {
        tokenVersion: decoded.sessionVersion,
        userVersion: user.sessionVersion,
      }, req);
      res.status(401);
      throw new Error("Session has been invalidated. Please log in again.");
    }

    if (decoded.userAgent && decoded.userAgent !== req.headers["user-agent"]) {
      writeLog(logLevels.WARN, "AUTH_SESSION_USER_AGENT_MISMATCH", (user as any)._id.toString(), {}, req);
      res.status(401);
      throw new Error("Session binding mismatch. Please log in again.");
    }

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
