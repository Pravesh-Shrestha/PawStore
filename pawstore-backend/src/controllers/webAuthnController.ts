/**
 * @file webAuthnController.ts
 * @description WebAuthn / FIDO2 Passkey Passwordless Authentication Controller for PawStore.
 * 
 * SECURITY ARCHITECTURE & EMERGING TECH DESIGN:
 * - Technology Standard: FIDO2 WebAuthn standard powered by `@simplewebauthn/server`.
 * - Public-Key Cryptography: Operates via asymmetric key pairs (ECC P-256 / RSA) generated inside client-side hardware Secure Enclaves.
 *   Completely eliminates shared secrets and passwords stored on backend servers.
 * - Phishing-Resistant Protection: Enforces strict origin and Relying Party ID binding (`RP_ID`, `RP_ORIGIN`), preventing credential capture on spoofed domains.
 * - Anti-Replay Counter: Validates signature counters on every passkey authentication ceremony to detect cloned authenticators.
 */

import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import User from "../models/userModel";
import WebAuthnCredential from "../models/webAuthnModel";
import { generateToken, setTokenCookie, clearTokenCookie } from "../utils/generateToken";
import { writeLog, logLevels } from "../utils/activityLogger";
import { trackFailedAttempt } from "../middleware/ipFilter";

// Relying Party (RP) Domain and Origin Configuration
const RP_NAME = "PawStore";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const RP_ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";

// In-memory challenge store (5-minute TTL challenge buffer for registration and authentication ceremonies)
const challengeStore: Map<string, any> = new Map();

// Helper to safely get user ID as string
const getUserId = (user: any): string => user?._id?.toString() || "unknown";

// @desc    Generate WebAuthn registration options (start passkey enrolment)
// @route   POST /api/users/webauthn/register/begin
// @access  Private
const beginRegistration = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Get existing credentials for this user to exclude them
  const existingCredentials = await WebAuthnCredential.find({ userId });
  const excludeCredentials = existingCredentials.map((cred) => ({
    id: cred.credentialId,
    type: "public-key" as const,
    transports: cred.transports as AuthenticatorTransportFuture[],
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Store challenge for verification later
  challengeStore.set(`register:${userId}`, {
    challenge: options.challenge,
    userId,
  });

  // Clean up old challenges periodically
  setTimeout(() => {
    challengeStore.delete(`register:${userId}`);
  }, 5 * 60 * 1000); // 5 minute expiry

  writeLog(logLevels.INFO, "WEBAUTHN_REGISTRATION_STARTED", userId, {
    existingPasskeys: existingCredentials.length,
  }, req);

  res.json(options);
});

// @desc    Verify WebAuthn registration (complete passkey enrolment)
// @route   POST /api/users/webauthn/register/complete
// @access  Private
const completeRegistration = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const { credential, deviceName } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error("Credential data is required");
  }

  // Retrieve the stored challenge
  const storedState = challengeStore.get(`register:${userId}`);
  if (!storedState) {
    res.status(400);
    throw new Error("Registration session expired. Please try again.");
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: storedState.challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      writeLog(logLevels.WARN, "WEBAUTHN_REGISTRATION_FAILED", userId, {
        error: "Verification failed",
      }, req);
      res.status(400);
      throw new Error("Passkey registration verification failed");
    }

    const regInfo = verification.registrationInfo;
    const { credential: webauthnCred } = regInfo;

    // Check for duplicate credential ID
    const existing = await WebAuthnCredential.findOne({
      credentialId: webauthnCred.id,
    });

    if (existing) {
      // This shouldn't happen with excludeCredentials, but just in case
      res.status(400);
      throw new Error("This passkey has already been registered");
    }

    // Store the credential
    const newCredential = new WebAuthnCredential({
      userId,
      credentialId: webauthnCred.id,
      publicKey: Buffer.from(webauthnCred.publicKey).toString("base64url"),
      counter: webauthnCred.counter,
      transports: credential.response?.transports || [],
      deviceName: deviceName || `Passkey ${new Date().toLocaleDateString()}`,
      userAgent: req.headers["user-agent"] || "",
      lastUsedAt: new Date(),
    });

    await newCredential.save();

    // Clean up the challenge
    challengeStore.delete(`register:${userId}`);

    writeLog(logLevels.INFO, "WEBAUTHN_REGISTRATION_COMPLETE", userId, {
      credentialId: webauthnCred.id.slice(-8),
      deviceName: deviceName || "Unknown Device",
    }, req);

    res.json({
      verified: true,
      credentialId: newCredential._id,
      deviceName: newCredential.deviceName,
    });
  } catch (error: any) {
    writeLog(logLevels.ERROR, "WEBAUTHN_REGISTRATION_ERROR", userId, {
      error: error.message,
    }, req);
    res.status(400);
    throw new Error(`Passkey registration failed: ${error.message}`);
  }
});

// @desc    Generate WebAuthn authentication options (start passkey login)
// @route   POST /api/users/webauthn/login/begin
// @access  Public
const beginLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  let allowCredentials: { id: string; type: "public-key"; transports: AuthenticatorTransportFuture[] }[] | undefined;

  if (email) {
    // If email is provided, restrict to that user's passkeys
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      const credentials = await WebAuthnCredential.find({ userId: user._id });
      allowCredentials = credentials.map((cred) => ({
        id: cred.credentialId,
        type: "public-key" as const,
        transports: cred.transports as AuthenticatorTransportFuture[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: allowCredentials && allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  // Store challenge for verification
  const challengeKey = `login:${options.challenge.slice(0, 16)}`;
  challengeStore.set(challengeKey, {
    challenge: options.challenge,
    email: email ? email.toLowerCase().trim() : undefined,
  });

  // Clean up after 5 minutes
  setTimeout(() => {
    challengeStore.delete(challengeKey);
  }, 5 * 60 * 1000);

  res.json(options);
});

// @desc    Verify WebAuthn authentication (complete passkey login)
// @route   POST /api/users/webauthn/login/complete
// @access  Public
const completeLogin = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential || !credential.id) {
    res.status(400);
    throw new Error("Credential data is required");
  }

  // Find the credential in our database
  const savedCredential = await WebAuthnCredential.findOne({
    credentialId: credential.id,
  });

  if (!savedCredential) {
    trackFailedAttempt(req.ip || "unknown");
    writeLog(logLevels.WARN, "WEBAUTHN_LOGIN_CREDENTIAL_NOT_FOUND", "anonymous", {
      credentialId: credential.id.slice(-8),
    }, req);
    res.status(401);
    throw new Error("Passkey not recognized. Please try another method.");
  }

  // Find the user
  const user = await User.findById(savedCredential.userId);
  if (!user || !user.isActive) {
    trackFailedAttempt(req.ip || "unknown");
    res.status(401);
    throw new Error("Account not found or has been deactivated");
  }

  if (user.isLocked) {
    trackFailedAttempt(req.ip || "unknown");
    writeLog(logLevels.WARN, "WEBAUTHN_LOGIN_LOCKED_ACCOUNT", getUserId(user), {}, req);
    res.status(423);
    throw new Error("Account is locked due to too many failed attempts");
  }

  // Find the matching challenge
  const challengeKey = `login:${credential.response?.clientDataJSON?.slice(0, 16) || "unknown"}`;
  let storedState: any;

  // Try to find the challenge by scanning recent entries
  for (const [key, value] of challengeStore.entries()) {
    if (key.startsWith("login:")) {
      storedState = value;
      break;
    }
  }

  if (!storedState) {
    res.status(400);
    throw new Error("Login session expired. Please try again.");
  }

  try {
    const publicKeyBytes = Buffer.from(savedCredential.publicKey, "base64url");

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: storedState.challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: savedCredential.credentialId,
        publicKey: new Uint8Array(publicKeyBytes),
        counter: savedCredential.counter,
        transports: savedCredential.transports as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) {
      trackFailedAttempt(req.ip || "unknown");
      writeLog(logLevels.WARN, "WEBAUTHN_LOGIN_VERIFICATION_FAILED", getUserId(user), {
        credentialId: savedCredential.credentialId.slice(-8),
      }, req);
      res.status(401);
      throw new Error("Passkey verification failed");
    }

    // Update counter and last used
    savedCredential.counter = verification.authenticationInfo.newCounter;
    savedCredential.lastUsedAt = new Date();
    await savedCredential.save();

    // Reset login attempts on successful login
    user.resetLoginAttempts();
    user.lastLogin = new Date() as any;
    user.lastLoginIP = req.ip || null;
    await user.save();

    // Clean up challenge
    challengeStore.delete(storedState.challenge.slice(0, 16));

    // Generate JWT
    const token = generateToken(
      (user as any)._id.toString(),
      user.sessionVersion,
      req.headers["user-agent"]
    );
    setTokenCookie(res, token);

    writeLog(logLevels.INFO, "WEBAUTHN_LOGIN_SUCCESS", getUserId(user), {
      credentialId: savedCredential.credentialId.slice(-8),
      deviceName: savedCredential.deviceName,
    }, req);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
      webauthnLogin: true,
    });
  } catch (error: any) {
    trackFailedAttempt(req.ip || "unknown");
    writeLog(logLevels.ERROR, "WEBAUTHN_LOGIN_ERROR", "anonymous", {
      error: error.message,
    }, req);
    res.status(401);
    throw new Error(`Passkey login failed: ${error.message}`);
  }
});

// @desc    Get user's registered passkeys
// @route   GET /api/users/webauthn/passkeys
// @access  Private
const getPasskeys = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const credentials = await WebAuthnCredential.find({ userId }).sort({ createdAt: -1 });

  const passkeys = credentials.map((cred) => ({
    id: cred._id,
    credentialId: cred.credentialId,
    deviceName: cred.deviceName,
    createdAt: cred.createdAt,
    lastUsedAt: cred.lastUsedAt,
    counter: cred.counter,
  }));

  res.json(passkeys);
});

// @desc    Remove a passkey
// @route   DELETE /api/users/webauthn/passkeys/:id
// @access  Private
const removePasskey = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const credential = await WebAuthnCredential.findById(req.params.id);

  if (!credential) {
    res.status(404);
    throw new Error("Passkey not found");
  }

  if (credential.userId.toString() !== userId) {
    res.status(403);
    throw new Error("Not authorized to remove this passkey");
  }

  await WebAuthnCredential.findByIdAndDelete(req.params.id);

  writeLog(logLevels.INFO, "WEBAUTHN_PASSKEY_REMOVED", userId, {
    credentialId: credential.credentialId.slice(-8),
    deviceName: credential.deviceName,
  }, req);

  res.json({ message: "Passkey removed successfully" });
});

// @desc    Rename a passkey
// @route   PUT /api/users/webauthn/passkeys/:id
// @access  Private
const renamePasskey = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const { deviceName } = req.body;

  if (!deviceName || typeof deviceName !== "string") {
    res.status(400);
    throw new Error("Device name is required");
  }

  const credential = await WebAuthnCredential.findById(req.params.id);

  if (!credential) {
    res.status(404);
    throw new Error("Passkey not found");
  }

  if (credential.userId.toString() !== userId) {
    res.status(403);
    throw new Error("Not authorized to rename this passkey");
  }

  credential.deviceName = deviceName.trim().slice(0, 64);
  await credential.save();

  res.json({
    message: "Passkey renamed",
    deviceName: credential.deviceName,
  });
});

export {
  beginRegistration,
  completeRegistration,
  beginLogin,
  completeLogin,
  getPasskeys,
  removePasskey,
  renamePasskey,
};
