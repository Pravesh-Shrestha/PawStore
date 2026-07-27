/**
 * @file errorMiddleware.ts
 * @description Centralized Error Handling & Exception Sanitization Middleware for PawStore.
 * 
 * SECURITY ARCHITECTURE & VULNERABILITY REMEDIATION:
 * - Pipeline Architecture: Step 11 (Centralized Exception Catch & Response Formatting).
 * - Vulnerability Remediation: Remediates VULN-02 (Verbose Error Messages) & Information Disclosure by suppressing
 *   raw server stack traces (`err.stack`) in production mode (`process.env.NODE_ENV === "production"`).
 * - Standardized Error Contracts: Returns sanitized JSON error responses preventing sensitive internal server leaks.
 */

import { Request, Response, NextFunction } from "express";

/**
 * 404 Route Not Found Middleware
 * Intercepts requests pointing to unmapped API paths and forwards to centralized error handler.
 */
const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized Error Handler Middleware
 * Formats API errors into sanitized JSON responses.
 * Suppresses internal code line stack traces when running in production environment.
 */
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack, // Suppresses stack trace leaks in prod
  });
};

export { notFound, errorHandler };
