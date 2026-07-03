import crypto from "crypto";

/**
 * AES-256-GCM encryption utility for sensitive data at rest.
 * 
 * Justification for AES-256-GCM:
 * - AES-256: Industry-standard symmetric encryption with 256-bit keys (NIST approved)
 * - GCM mode: Provides authenticated encryption (both confidentiality AND integrity)
 * - No padding oracle vulnerabilities (unlike CBC mode)
 * - Widely supported in hardware (AES-NI instructions) for performance
 * 
 * Key management:
 * - Encryption key is stored as ENCRYPTION_KEY environment variable (64 hex chars = 256 bits)
 * - Each encryption operation uses a unique random 96-bit IV (initialization vector)
 * - Auth tag (16 bytes) ensures data integrity and prevents tampering
 * - The IV and auth tag are prepended to the ciphertext for storage
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment or generate a deterministic one.
 * In production, this MUST be set via ENCRYPTION_KEY environment variable.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    // Key should be 64 hex characters (32 bytes)
    return Buffer.from(key, "hex");
  }
  // Fallback: derive from JWT_SECRET (not ideal but ensures backward compatibility)
  return crypto.scryptSync(process.env.JWT_SECRET || "fallback", "pawstore-salt", KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV + Auth Tag + Ciphertext
 */
function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  // Store: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext (base64)
  const combined = Buffer.concat([iv, authTag]);
  return `${combined.toString("base64")}:${ciphertext}`;
}

/**
 * Decrypt a string that was encrypted with encrypt().
 * Expects format: base64(IV + AuthTag):base64(Ciphertext)
 */
function decrypt(encrypted: string): string {
  if (!encrypted) return encrypted;

  // Check if the string is already in plaintext (not encrypted)
  // Encrypted strings always contain ":"
  if (!encrypted.includes(":")) {
    return encrypted;
  }

  const key = getEncryptionKey();
  const [combinedStr, ciphertext] = encrypted.split(":");

  const combined = Buffer.from(combinedStr, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

/**
 * Check if a string is encrypted (contains the encryption delimiter)
 */
function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.includes(":");
}

export { encrypt, decrypt, isEncrypted };
