import request from "supertest";
import express from "express";
import helmet from "helmet";

describe("API HTTP Security Headers (Helmet)", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://www.google.com/recaptcha/"],
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        },
        strictTransportSecurity: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        xFrameOptions: { action: "deny" },
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      })
    );
    app.get("/test", (req, res) => res.json({ ok: true }));
  });

  test("should enforce strict Content-Security-Policy (CSP) headers", async () => {
    const res = await request(app).get("/test");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["content-security-policy"]).toContain("script-src 'self' https://www.google.com/recaptcha/");
  });

  test("should enforce HSTS with max-age=31536000 and includeSubDomains", async () => {
    const res = await request(app).get("/test");
    expect(res.headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains; preload");
  });

  test("should set X-Frame-Options to DENY to prevent clickjacking", async () => {
    const res = await request(app).get("/test");
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  test("should set X-Content-Type-Options to nosniff to prevent MIME sniffing", async () => {
    const res = await request(app).get("/test");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  test("should set Referrer-Policy to strict-origin-when-cross-origin", async () => {
    const res = await request(app).get("/test");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("should securely disable X-Powered-By header to prevent fingerprinting", async () => {
    const res = await request(app).get("/test");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
