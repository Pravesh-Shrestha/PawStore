/**
 * @file rateLimiter.ts
 * @description 6-Tier API Rate Limiting Architecture for PawStore.
 * 
 * SECURITY ARCHITECTURE & STANDARDS MAPPING:
 * - WSTG Mapping: WSTG-ATHN-04 (Testing for Bypassing Authentication Schema / Brute Force Prevention).
 * - Defense-in-Depth Model: Layer 2 (IP-based Request Throttling).
 * - STRIDE Threat Mitigation: Mitigates Denial of Service (DoS), Credential Stuffing, and Resource Exhaustion.
 * - Vulnerability Remediation: Remediates VULN-01 (Rate Limiting Deficiencies & SMTP Exhaustion Vector)
 *   by enforcing strict rate limits (`passwordChangeLimiter`) on password reset and update routes.
 */

import rateLimit from "express-rate-limit";

/**
 * Tier 1: Public Read-Only Endpoints Limiter (`publicLimiter`)
 * Applied to high-traffic public catalog routes (/api/accessories, /api/breeds, /api/blogs).
 * Limit: 300 requests per 15-minute window per IP.
 */
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 300,                  // Maximum 300 requests per window
  message: {
    message: "Too many requests, please slow down",
  },
  standardHeaders: true,      // Return standard `RateLimit-*` headers
  legacyHeaders: false,       // Disable `X-RateLimit-*` headers
});

/**
 * Tier 2: General API Catch-All Limiter (`apiLimiter`)
 * Default safety net applied across all general `/api/*` routes to prevent endpoint flooding.
 * Limit: 200 requests per 15-minute window per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    message: "Too many requests, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tier 3: Authentication Endpoint Limiter (`authLimiter`)
 * Protects credential endpoints (/api/users/login, /api/users/register) against brute-force attacks.
 * Skips counting successful requests so legitimate users are not penalized.
 * Limit: 10 failed login/registration requests per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many authentication attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts towards rate limit
});

/**
 * Tier 4: Multi-Factor Authentication Limiter (`mfaLimiter`)
 * Highly restrictive limiter on TOTP / Passkey verification endpoints (/api/users/mfa/verify).
 * Prevents automated 6-digit TOTP pin brute-forcing (1 million potential combinations).
 * Limit: 5 verification attempts per 15-minute window per IP.
 */
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many verification attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tier 5: Password Reset & Change Limiter (`passwordChangeLimiter`)
 * [VULN-01 Remediation] Specifically protects /api/users/forgotpassword and password modification routes.
 * Prevents attackers from abusing SMTP services for email bombing or conducting automated token enumeration.
 * Limit: 3 attempts per 1-hour window per IP (Triggers HTTP 429 Too Many Requests on 4th attempt).
 */
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3,                   // Maximum 3 attempts per hour
  message: {
    message: "Too many password change attempts, please try again after 1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tier 6: Profile Update Limiter (`profileUpdateLimiter`)
 * Protects user account modification endpoints (/api/users/profile) against rapid parameter tampering.
 * Limit: 10 updates per 1-hour window per IP.
 */
const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many profile update attempts, please try again after 1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export {
  publicLimiter,
  apiLimiter,
  authLimiter,
  mfaLimiter,
  passwordChangeLimiter,
  profileUpdateLimiter,
};
