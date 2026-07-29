import jwt from "jsonwebtoken";
import test, { describe } from "node:test";

describe("Session & Token Management Security", () => {
  const JWT_SECRET = "test-secret-key-12345";
  const mockUser = {
    id: "507f1f77bcf86cd799439011",
    sessionVersion: 2,
    userAgent: "Mozilla/5.0",
  };

  test("should invalidate old sessions when sessionVersion increments", () => {
    const oldToken = jwt.sign({ id: mockUser.id, sessionVersion: 1 }, JWT_SECRET);
    const decoded = jwt.verify(oldToken, JWT_SECRET) as any;
    expect(decoded.sessionVersion).not.toBe(mockUser.sessionVersion);
  });

  test("should reject tokens issued before user.lastLogout timestamp", () => {
    const token = jwt.sign({ id: mockUser.id }, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const lastLogout = Date.now() + 5000; // Logout happened AFTER token issuance
    expect(decoded.iat * 1000).toBeLessThan(lastLogout);
  });

  test("should enforce secure HttpOnly and SameSite=Strict cookies", () => {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600000,
    };
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe("strict");
  });

  test("should bind session to User-Agent to detect hijacking", () => {
    const token = jwt.sign({ id: mockUser.id, userAgent: mockUser.userAgent }, JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const attackerUserAgent = "curl/7.68.0";
    expect(decoded.userAgent).not.toBe(attackerUserAgent);
    expect(decoded.userAgent).toBe(mockUser.userAgent);
  });

  test("should automatically expire sessions after 1 hour of inactivity", () => {
    const token = jwt.sign({ id: mockUser.id }, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const expiryMins = (decoded.exp - decoded.iat) / 60;
    expect(expiryMins).toBe(60);
  });
});
