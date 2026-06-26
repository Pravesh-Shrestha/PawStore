import rateLimit from "express-rate-limit";

// Generous rate limiter for public read-only endpoints (breeds, blogs, accessories)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    message: "Too many requests, please slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter for all /api routes (catch-all)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    message: "Too many requests, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many authentication attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Very strict rate limiter for MFA verification
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many verification attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for password change
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    message: "Too many password change attempts, please try again after 1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for profile updates
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
