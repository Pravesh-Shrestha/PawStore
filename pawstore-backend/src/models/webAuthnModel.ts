import mongoose, { Document, Schema } from "mongoose";

/**
 * WebAuthn Credential Model
 *
 * Stores passkey (WebAuthn) credentials for password-less authentication.
 * Each user can have multiple passkeys (one per device/browser).
 *
 * Based on the @simplewebauthn/server credential format.
 */

export interface IWebAuthnCredential extends Document {
  userId: mongoose.Types.ObjectId;
  credentialId: string;           // Base64URL-encoded credential ID
  publicKey: string;              // Base64URL-encoded public key (COSEPublicKey)
  counter: number;                // Signature counter for replay detection
  transports: string[];
  deviceName: string;             // User-friendly name (e.g., "Windows Hello", "iPhone 15")
  userAgent: string;              // Browser/device user agent at registration
  createdAt: Date;
  lastUsedAt: Date;
}

const webAuthnSchema = new Schema<IWebAuthnCredential>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      default: 0,
    },
    transports: {
      type: [String],
      default: [],
    },
    deviceName: {
      type: String,
      default: "Unknown Device",
    },
    userAgent: {
      type: String,
      default: "",
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast user lookup
webAuthnSchema.index({ userId: 1, credentialId: 1 });

const WebAuthnCredential = mongoose.model<IWebAuthnCredential>(
  "WebAuthnCredential",
  webAuthnSchema
);

export default WebAuthnCredential;
