import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    return Buffer.from(key, "hex");
  }
  return crypto.scryptSync(process.env.JWT_SECRET || "fallback", "pawstore-salt", KEY_LENGTH);
}

function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag]);
  return `${combined.toString("base64")}:${ciphertext}`;
}

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
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.includes(":");
}

export { encrypt, decrypt, isEncrypted };
