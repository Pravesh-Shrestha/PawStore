import jwt from "jsonwebtoken";
import { protect, admin } from "../middleware/authMiddleware";
import User from "../models/userModel";
import { writeLog } from "../utils/activityLogger";
import { Request, Response, NextFunction } from "express";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../models/userModel");
jest.mock("../utils/activityLogger");

describe("Authentication Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
      headers: {},
      ip: "127.0.0.1",
      originalUrl: "/api/test",
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe("protect middleware", () => {
    test("should fail if no token is provided in cookies or headers", async () => {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(writeLog).toHaveBeenCalledWith("WARN", "AUTH_NO_TOKEN", "anonymous", expect.any(Object), expect.any(Object));
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Not authorized, no token");
    });

    test("should pass valid token from headers, find user, and call next()", async () => {
      mockRequest.headers = { authorization: "Bearer valid-token" };
      
      const mockUser = {
        _id: "user-id-123",
        isActive: true,
        isLocked: false,
        isPasswordExpired: jest.fn().mockReturnValue(false),
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user-id-123" });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(jwt.verify).toHaveBeenCalledWith("valid-token", expect.any(String));
      expect(User.findById).toHaveBeenCalledWith("user-id-123");
      expect(mockRequest.user).toBe(mockUser);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    test("should fail if user is not found in database", async () => {
      mockRequest.cookies = { token: "valid-token" };
      
      (jwt.verify as jest.Mock).mockReturnValue({ id: "non-existent-id" });
      (User.findById as jest.Mock).mockResolvedValue(null);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Not authorized, token failed");
    });

    test("should fail if user account is deactivated (isActive is false)", async () => {
      mockRequest.cookies = { token: "valid-token" };
      
      const mockUser = {
        _id: "user-id-123",
        isActive: false,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user-id-123" });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Not authorized, token failed");
    });

    test("should fail if user account is locked (isLocked is true)", async () => {
      mockRequest.cookies = { token: "valid-token" };
      
      const mockUser = {
        _id: "user-id-123",
        isActive: true,
        isLocked: true,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user-id-123" });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Not authorized, token failed");
    });

    test("should fail if user password has expired", async () => {
      mockRequest.cookies = { token: "valid-token" };
      
      const mockUser = {
        _id: "user-id-123",
        isActive: true,
        isLocked: false,
        isPasswordExpired: jest.fn().mockReturnValue(true),
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user-id-123" });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Password has expired. Please change your password.");
    });

    test("should fail if token was issued before user last logout (token revoked)", async () => {
      mockRequest.cookies = { token: "valid-token" };
      
      const mockUser = {
        _id: "user-id-123",
        isActive: true,
        isLocked: false,
        isPasswordExpired: jest.fn().mockReturnValue(false),
        lastLogout: new Date("2026-07-16T12:00:00Z"),
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        id: "user-id-123",
        iat: Math.floor(new Date("2026-07-16T11:00:00Z").getTime() / 1000),
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Not authorized, token failed");
    });

    test("should fail if session version in token is mismatch", async () => {
      mockRequest.cookies = { token: "valid-token" };
      
      const mockUser = {
        _id: "user-id-123",
        isActive: true,
        isLocked: false,
        isPasswordExpired: jest.fn().mockReturnValue(false),
        sessionVersion: 2,
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        id: "user-id-123",
        sessionVersion: 1,
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Session has been invalidated. Please log in again.");
    });

    test("should fail if User-Agent binding is mismatch", async () => {
      mockRequest.cookies = { token: "valid-token" };
      mockRequest.headers = { "user-agent": "Chrome" };
      
      const mockUser = {
        _id: "user-id-123",
        isActive: true,
        isLocked: false,
        isPasswordExpired: jest.fn().mockReturnValue(false),
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        id: "user-id-123",
        userAgent: "Firefox",
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await protect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      const err = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(err.message).toBe("Session binding mismatch. Please log in again.");
    });
  });

  describe("admin middleware", () => {
    test("should call next() if user is an admin", () => {
      mockRequest.user = { isAdmin: true } as any;

      admin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(writeLog).not.toHaveBeenCalled();
    });

    test("should fail with 401 if user is not an admin", () => {
      mockRequest.user = { _id: "user-123", isAdmin: false } as any;

      expect(() => {
        admin(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow("Not authorized as an admin");

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(writeLog).toHaveBeenCalledWith("WARN", "AUTH_UNAUTHORIZED_ADMIN", "user-123", expect.any(Object), expect.any(Object));
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
