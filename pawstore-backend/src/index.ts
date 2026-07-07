import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dbConnect from "./database/db";
import { notFound, errorHandler } from "./middleware/errorMiddleware";
import { apiLimiter, publicLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./utils/activityLogger";

const PORT = process.env.PORT || 5000;
const app = express();

// Connect to database
dbConnect();

// TLS/SSL Enforcement: Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === "production") {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    if (proto !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security Headers (helmet)
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS Configuration - restrict to frontend origin
const allowedOrigins: (string | undefined)[] = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Cookie parser for secure HttpOnly cookies
app.use(cookieParser());

// Body parsers
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Trust proxy for rate limiting behind reverse proxy (e.g., Render, Nginx)
app.set("trust proxy", 1);

// IP-based access control (allow/block lists + automatic blocking)
import { ipFilterMiddleware } from "./middleware/ipFilter";
app.use(ipFilterMiddleware);

// Apply relaxed rate limiting to public read routes
app.use("/api/breeds", publicLimiter);
app.use("/api/accessories", publicLimiter);
app.use("/api/blogs", publicLimiter);

// Apply standard rate limiting to sensitive/mutation API routes
app.use("/api/contact", apiLimiter);
app.use("/api/newsletter", apiLimiter);
app.use("/api/users", apiLimiter);
app.use("/api/orders", apiLimiter);
app.use("/api/cart", apiLimiter);
app.use("/api/payments", apiLimiter);

// Activity logging middleware
app.use(requestLogger);

// Routes
import breedRoutes from "./routes/breedRoutes";
import accessoryRoutes from "./routes/accessoryRoutes";
import blogRoutes from "./routes/blogRoutes";
import contactRoutes from "./routes/contactRoutes";
import newsletterRoutes from "./routes/newsletterRoutes";
import userRoutes from "./routes/userRoutes";
import orderRoutes from "./routes/orderRoutes";
import cartRoutes from "./routes/cartRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import monitoringRoutes from "./routes/monitoringRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";
import ipFilterRoutes from "./routes/ipFilterRoutes";
import webAuthnRoutes from "./routes/webAuthnRoutes";

app.use("/api/breeds", breedRoutes);
app.use("/api/accessories", accessoryRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/admin/ip-lists", ipFilterRoutes);
app.use("/api/users/webauthn", webAuthnRoutes);

// Base route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to Pawstore API",
    version: "2.0.0",
    security: {
      mfa: true,
      rateLimiting: true,
      helmet: true,
      sessionManagement: true,
      activityLogging: true,
      captcha: true,
      realTimeMonitoring: true,
      dataImport: true,
      ipFiltering: true,
      webauthn: true,
      tlsEnforced: process.env.NODE_ENV === "production",
    },
  });
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  console.log("Security features enabled:");
  console.log("  - Helmet (security headers + HSTS)");
  console.log("  - Rate Limiting (API, Auth, MFA, Password Change)");
  console.log("  - Activity Logging & Real-Time Monitoring");
  console.log("  - Secure Cookie Sessions (HttpOnly, Secure, SameSite=Strict)");
  console.log("  - Session Versioning & User-Agent Binding");
  console.log("  - MFA (TOTP via Authenticator Apps)");
  console.log("  - CAPTCHA (reCAPTCHA v3 on Login & Register)");
  console.log("  - Password Policy (12+ chars, complexity, expiry, reuse prevention)");
  console.log("  - Brute-Force Protection (account lockout + rate limiting)");
  console.log("  - AES-256-GCM Encryption at Rest (MFA secrets)");
  console.log("  - TLS Enforcement (HTTPS redirect in production)");
  console.log("  - IDOR Protection (order ownership verification)");
  console.log("  - Data Portability (GDPR export & import)");
  console.log("  - IP Filtering (allow/block lists + auto-blocking)");
  console.log("  - WebAuthn Passkey Authentication (password-less login)");
});

export default app;
