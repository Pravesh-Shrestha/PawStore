import { Request, Response, NextFunction } from "express";
import https from "https";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";

const verifyCaptcha = async (req: Request, res: Response, next: NextFunction) => {
  const captchaToken = req.body.captchaToken;

  if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY === "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe") {
    return next();
  }

  if (!captchaToken) {
    res.status(400);
    return next(new Error("CAPTCHA verification required"));
  }

  try {
    const response = await verifyRecaptcha(captchaToken);

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
