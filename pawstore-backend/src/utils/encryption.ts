/**
 * @file encryption.ts
 * @description AES-256-GCM Symmetric Encryption Utility for PawStore.
 * 
 * SECURITY ARCHITECTURE & CRYPTOGRAPHIC DESIGN:
 * - Cipher Algorithm: AES-256-GCM (Galois/Counter Mode).
 * - Key Length: 256-bit (32 bytes) derived from host `ENCRYPTION_KEY` or key derivation function (`scryptSync`).
 * - Initialization Vector (IV): 96-bit (12 bytes) cryptographically secure random IV (`crypto.randomBytes(12)`).
 * - Authentication Tag: 128-bit (16 bytes) GCM auth tag providing Authenticated Encryption with Associated Data (AEAD).
 * - Purpose: Protects Multi-Factor Authentication (TOTP) secrets at rest in MongoDB against data breaches and
 *   unauthorized database inspection (STRIDE: Information Disclosure Mitigation).
 * - Security Advantage: GCM mode guarantees both confidentiality and ciphertext integrity, preventing padding oracle attacks.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96 bits (NIST SP 800-38D recommended IV size for GCM)
const TAG_LENGTH = 16;  // 128 bits authentication tag
const KEY_LENGTH = 32;  // 256 bits symmetric key length

/**
 * Derives or retrieves the 256-bit encryption key.
 * Converts hex-encoded `process.env.ENCRYPTION_KEY` to Buffer, or uses scrypt KDF as fallback.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    return Buffer.from(key, "hex");
  }
  return crypto.scryptSync(process.env.JWT_SECRET || "fallback", "pawstore-salt", KEY_LENGTH);
}

/**
 * Encrypts cleartext using AES-256-GCM.
 * Generates a unique 96-bit IV per encryption operation.
 * Returns payload formatted as `<base64(IV + AuthTag)>:<base64(Ciphertext)>`.
 * 
 * @param plaintext Unencrypted sensitive string (e.g. TOTP secret)
 * @returns Encrypted string composite
 */
function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH); // Generate fresh 96-bit IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag(); // Extract 128-bit authentication tag

  // Pack IV and AuthTag into single buffer for storage
  const combined = Buffer.concat([iv, authTag]);
  return `${combined.toString("base64")}:${ciphertext}`;
}

/**
 * Decrypts AES-256-GCM ciphertext payload and validates authentication tag.
 * Throws an exception if ciphertext or authentication tag has been tampered with.
 * 
 * @param encrypted Formatted ciphertext string `<base64(IV + Tag)>:<base64(Ciphertext)>`
 * @returns Original cleartext string
 */
function decrypt(encrypted: string): string {
  if (!encrypted) return encrypted;

  if (!encrypted.includes(":")) {
    return encrypted;
  }

  const key = getEncryptionKey();
  const [combinedStr, ciphertext] = encrypted.split(":");

  const combined = Buffer.from(combinedStr, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag); // Set auth tag to verify integrity before decryption

  let plaintext = decipher.update(ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8"); // Validates auth tag during finalization

  return plaintext;
}

/**
 * Helper function to verify if a given string is in AES-256-GCM encrypted format.
 */
function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.includes(":");
}

export { encrypt, decrypt, isEncrypted };
