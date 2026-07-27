/**
 * @file ipFilter.ts
 * @description IP-Based Access Filtering & Automated Brute-Force IP Lockout Middleware for PawStore.
 * 
 * SECURITY ARCHITECTURE & STANDARDS MAPPING:
 * - Defense-in-Depth Model: Layer 4 (Automated IP Auto-Blocking Thresholds).
 * - NIST Zero-Trust Principles: Continuous traffic validation, subnet filtering, and dynamic threat isolation.
 * - STRIDE Threat Mitigation: Mitigates Account Enumeration, Distributed Denial of Service (DDoS), and High-Frequency Brute-Force Attacks.
 * - Vulnerability Remediation Support: Supports VULN-02 Remediation by automatically blocking aggressive IPs trying to enumerate user accounts.
 * - Threshold Parameters: 20 failed attempts within a 15-minute sliding window trigger an automatic 1-hour IP block (`AUTO_BLOCK_DURATION_MS = 1h`).
 */

import { Request, Response, NextFunction } from "express";
import { writeLog, logLevels } from "../utils/activityLogger";
import fs from "fs";
import path from "path";

interface IPList {
  allowed: string[];   // CIDR ranges or exact IP addresses
  blocked: string[];   // CIDR ranges or exact IP addresses
}

const IP_LIST_PATH = path.join(__dirname, "../../data/ip-lists.json");

let ipLists: IPList = { allowed: [], blocked: [] };

// Layer 4 Configuration: Automated IP Blockout Thresholds
const FAILURE_THRESHOLD = 20;             // Auto-block IP after 20 cumulative failed authentication attempts
const FAILURE_WINDOW_MS = 15 * 60 * 1000;  // 15-minute evaluation window
const AUTO_BLOCK_DURATION_MS = 60 * 60 * 1000; // IP stays in block-list for 1 hour

interface IPFailureTracker {
  [ip: string]: { count: number; firstAttempt: number; blockedUntil?: number };
}
const failureTracker: IPFailureTracker = {};

// Load existing IP lists from disk
function loadIPLists(): void {
  try {
    if (fs.existsSync(IP_LIST_PATH)) {
      const data = fs.readFileSync(IP_LIST_PATH, "utf-8");
      ipLists = JSON.parse(data);
    } else {
      // Ensure data directory exists
      const dir = path.dirname(IP_LIST_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      saveIPLists();
    }
  } catch (err) {
    console.error("Failed to load IP lists:", err);
    ipLists = { allowed: [], blocked: [] };
  }
}

// Save IP lists to disk
function saveIPLists(): void {
  try {
    const dir = path.dirname(IP_LIST_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(IP_LIST_PATH, JSON.stringify(ipLists, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save IP lists:", err);
  }
}

// Check if an IP matches a CIDR range
function ipInCIDR(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) {
    return ip === cidr; // Exact match
  }

  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);

  const ipParts = ip.split(".").map(Number);
  const rangeParts = range.split(".").map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

  const ipNum = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;
  const rangeNum = ((rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]) >>> 0;
  const mask = ~(2 ** (32 - bits) - 1) >>> 0;

  return (ipNum & mask) === (rangeNum & mask);
}

// Check if IP is in a list (supports CIDR and exact match)
function isIPInList(ip: string, list: string[]): boolean {
  return list.some((entry) => ipInCIDR(ip, entry));
}

/**
 * Middleware: Check if request IP is allowed
 * If allow-list is non-empty, only IPs in the list are permitted
 * If block-list has the IP, the request is denied
 */
function ipFilterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // Check block-list first
  if (isIPInList(ip, ipLists.blocked)) {
    writeLog(logLevels.WARN, "IP_BLOCKED_REQUEST", "system", {
      ip,
      url: req.originalUrl,
      method: req.method,
    }, req);
    res.status(403).json({ message: "Access denied. Your IP has been blocked." });
    return;
  }

  // If allow-list is configured, enforce it
  if (ipLists.allowed.length > 0 && !isIPInList(ip, ipLists.allowed)) {
    writeLog(logLevels.WARN, "IP_NOT_ALLOWED", "system", {
      ip,
      url: req.originalUrl,
      method: req.method,
    }, req);
    res.status(403).json({ message: "Access denied. IP not in allow-list." });
    return;
  }

  next();
}

/**
 * Track a failed request for automatic IP blocking
 * Call this from auth endpoints when login/verification fails
 */
function trackFailedAttempt(ip: string): { blocked: boolean; reason?: string } {
  const now = Date.now();

  if (!failureTracker[ip]) {
    failureTracker[ip] = { count: 1, firstAttempt: now };
    return { blocked: false };
  }

  const tracker = failureTracker[ip];

  // Reset if outside the window
  if (now - tracker.firstAttempt > FAILURE_WINDOW_MS) {
    tracker.count = 1;
    tracker.firstAttempt = now;
    delete tracker.blockedUntil;
    return { blocked: false };
  }

  tracker.count += 1;

  // Auto-block if threshold exceeded
  if (tracker.count >= FAILURE_THRESHOLD) {
    tracker.blockedUntil = now + AUTO_BLOCK_DURATION_MS;

    // Add to persistent block list
    if (!ipLists.blocked.includes(ip)) {
      ipLists.blocked.push(ip);
      saveIPLists();
    }

    return {
      blocked: true,
      reason: `IP automatically blocked after ${tracker.count} failed attempts`,
    };
  }

  return { blocked: false };
}

/**
 * Check if an auto-block has expired and remove it
 */
function cleanupExpiredBlocks(): void {
  const now = Date.now();
  const toRemove: string[] = [];

  for (const [ip, tracker] of Object.entries(failureTracker)) {
    if (tracker.blockedUntil && now >= tracker.blockedUntil) {
      toRemove.push(ip);
      // Remove from persistent block list
      const idx = ipLists.blocked.indexOf(ip);
      if (idx !== -1) {
        ipLists.blocked.splice(idx, 1);
      }
    }
  }

  toRemove.forEach((ip) => delete failureTracker[ip]);

  if (toRemove.length > 0) {
    saveIPLists();
    console.log(`Cleaned up ${toRemove.length} expired IP blocks`);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupExpiredBlocks, 30 * 60 * 1000);

/**
 * Admin: Get current IP lists
 */
function getIPLists(): IPList {
  return { ...ipLists, allowed: [...ipLists.allowed], blocked: [...ipLists.blocked] };
}

/**
 * Admin: Add IP/CIDR to allow-list
 */
function addToAllowList(entry: string): void {
  if (!ipLists.allowed.includes(entry)) {
    ipLists.allowed.push(entry);
    saveIPLists();
  }
}

/**
 * Admin: Remove IP/CIDR from allow-list
 */
function removeFromAllowList(entry: string): void {
  ipLists.allowed = ipLists.allowed.filter((e) => e !== entry);
  saveIPLists();
}

/**
 * Admin: Add IP/CIDR to block-list
 */
function addToBlockList(entry: string): void {
  if (!ipLists.blocked.includes(entry)) {
    ipLists.blocked.push(entry);
    saveIPLists();
  }
}

/**
 * Admin: Remove IP/CIDR from block-list
 */
function removeFromBlockList(entry: string): void {
  ipLists.blocked = ipLists.blocked.filter((e) => e !== entry);
  saveIPLists();
}

// Load existing IP lists on module initialization
loadIPLists();
cleanupExpiredBlocks();

export {
  ipFilterMiddleware,
  trackFailedAttempt,
  getIPLists,
  addToAllowList,
  removeFromAllowList,
  addToBlockList,
  removeFromBlockList,
};
