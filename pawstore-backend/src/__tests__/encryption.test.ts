import { encrypt, decrypt, isEncrypted } from "../utils/encryption";

describe("Encryption Utility (AES-256-GCM)", () => {
  const secretData = "ThisIsASecret123!";

  beforeAll(() => {
    // Set a valid 64-character (32-byte) hex key for testing
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  test("should successfully encrypt and decrypt a string", () => {
    const encrypted = encrypt(secretData);
    expect(encrypted).toBeDefined();
    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted).not.toBe(secretData);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secretData);
  });

  test("should return empty string when encrypting or decrypting falsy values", () => {
    expect(encrypt("")).toBe("");
    expect(decrypt("")).toBe("");
  });

  test("should return input string if it is not encrypted during decryption", () => {
    const unencrypted = "plaintext-without-colon";
    expect(isEncrypted(unencrypted)).toBe(false);
    expect(decrypt(unencrypted)).toBe(unencrypted);
  });

  test("should fail decryption when payload is corrupted or auth tag fails validation", () => {
    const encrypted = encrypt(secretData);
    const parts = encrypted.split(":");
    // Corrupt the ciphertext part
    const corruptedCiphertext = parts[1].substring(0, parts[1].length - 4) + "AAAA";
    const corruptedEncrypted = `${parts[0]}:${corruptedCiphertext}`;

    expect(() => {
      decrypt(corruptedEncrypted);
    }).toThrow();
  });
});
