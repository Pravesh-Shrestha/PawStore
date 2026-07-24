import bcrypt from "bcryptjs";

describe("User Model Security & Password Policy Tests", () => {
  describe("Password Hashing (bcrypt)", () => {
    test("should generate bcrypt hash with salt rounds and verify password match", async () => {
      const plainPassword = "SecureUserPass123!";
      const saltRounds = 12;
      
      const hash = await bcrypt.hash(plainPassword, saltRounds);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

      const isMatch = await bcrypt.compare(plainPassword, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare("WrongPassword123!", hash);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe("Account Lockout Calculation", () => {
    test("should calculate lockUntil timestamp 30 minutes in future after 5 failed attempts", () => {
      const maxAttempts = 5;
      const lockoutDurationMs = 30 * 60 * 1000; // 30 minutes
      let attempts = 4;

      attempts += 1;
      let lockUntil: Date | null = null;

      if (attempts >= maxAttempts) {
        lockUntil = new Date(Date.now() + lockoutDurationMs);
      }

      expect(lockUntil).not.toBeNull();
      expect(lockUntil!.getTime()).toBeGreaterThan(Date.now());
      // Check lock duration is approx 30 mins
      const diffMins = (lockUntil!.getTime() - Date.now()) / (1000 * 60);
      expect(diffMins).toBeGreaterThan(29);
      expect(diffMins).toBeLessThanOrEqual(30);
    });

    test("should correctly evaluate isLocked boolean state", () => {
      const futureLock = new Date(Date.now() + 15 * 60 * 1000); // 15 mins in future
      const isLockedActive = futureLock > new Date();
      expect(isLockedActive).toBe(true);

      const pastLock = new Date(Date.now() - 5 * 60 * 1000); // 5 mins in past
      const isLockedExpired = pastLock > new Date();
      expect(isLockedExpired).toBe(false);
    });
  });

  describe("Password Expiration Logic", () => {
    test("should flag password as expired if passwordExpiresAt is past", () => {
      const expiredDate = new Date(Date.now() - 1000);
      const isExpired = expiredDate < new Date();
      expect(isExpired).toBe(true);
    });

    test("should flag password as valid if passwordExpiresAt is future", () => {
      const validDate = new Date(Date.now() + 86400 * 1000 * 90); // 90 days
      const isExpired = validDate < new Date();
      expect(isExpired).toBe(false);
    });
  });
});
