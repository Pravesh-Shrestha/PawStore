/**
 * @file captchaMiddleware.ts
 * @description Google reCAPTCHA v3 Automated Bot Mitigation Security Middleware.
 * 
 * SECURITY ARCHITECTURE & STANDARDS MAPPING:
 * - Defense-in-Depth Model: Layer 1 (Invisible Google reCAPTCHA v3 Bot Verification).
 * - STRIDE Threat Mitigation: Blocks automated credential stuffing scripts, botnet registration,
 *   and brute-force attempt sequences before reaching database controllers.
 * - Score Thresholding: Mandates a minimum risk score of 0.5 (where 1.0 indicates human behavior and 0.0 indicates bot).
 */

import { Request, Response, NextFunction } from "express";
import https from "https";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";

/**
 * Middleware: `verifyCaptcha`
 * Validates Google reCAPTCHA v3 token supplied in HTTP request body (`req.body.captchaToken`).
 * Makes a secure HTTPS POST call to Google siteverify API endpoint.
 * Rejects requests with HTTP 403 Forbidden if captcha score is below 0.5 threshold.
 */
const verifyCaptcha = async (req: Request, res: Response, next: NextFunction) => {
  const captchaToken = req.body.captchaToken;

  if (!captchaToken) {
    res.status(400);
    return next(new Error("CAPTCHA verification required"));
  }

  try {
    const response = await verifyRecaptcha(captchaToken);

    // Layer 1 Enforcer: Reject automated bot requests failing risk score threshold (< 0.5)
    if (!response.success || response.score < 0.5) {
      res.status(403);
      return next(new Error("CAPTCHA verification failed. Suspicious activity detected."));
    }

    next();
  } catch (error: any) {
    res.status(500);
    return next(new Error("CAPTCHA verification error"));
  }
};

interface RecaptchaResponse {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  "error-codes"?: string[];
}

/**
 * Helper: `verifyRecaptcha`
 * Dispatches server-to-server TLS request to `https://www.google.com/recaptcha/api/siteverify`.
 */
function verifyRecaptcha(token: string): Promise<RecaptchaResponse> {
  return new Promise((resolve, reject) => {
    const postData = `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(token)}`;

    const options = {
      hostname: "www.google.com",
      port: 443,
      path: "/recaptcha/api/siteverify",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Failed to parse reCAPTCHA response"));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

export { verifyCaptcha };
