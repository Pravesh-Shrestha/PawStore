import https from "https";
import http from "http";
import { writeLog, logLevels } from "./activityLogger";

interface AlertEvent {
  timestamp: string;
  level: string;
  action: string;
  message: string;
  userId: string;
  ip: string;
  metadata: Record<string, any>;
}

const recentSecurityEvents: AlertEvent[] = [];
const MAX_EVENTS = 100;

const WEBHOOK_URL = process.env.MONITORING_WEBHOOK_URL || "";
const ALERT_EMAIL = process.env.ALERT_EMAIL || "";

const CRITICAL_ACTIONS = [
  "LOGIN_LOCKED_ACCOUNT",
  "LOGIN_FAILED_WRONG_PASSWORD",
  "MFA_DISABLE_FAILED_WRONG_PASSWORD",
  "MFA_DISABLE_FAILED_WRONG_TOKEN",
  "MFA_ENABLED",
  "MFA_DISABLED",
  "PASSWORD_CHANGED",
  "ACCOUNT_DELETED",
  "ADMIN_DELETED_USER",
  "ADMIN_UNLOCKED_USER",
  "WEBHOOK_SIGNATURE_INVALID",
  "PAYMENT_INTENT_FAILED",
  "AUTH_SESSION_INVALIDATED",
  "AUTH_SESSION_USER_AGENT_MISMATCH",
  "STOCK_INSUFFICIENT_ON_PAYMENT",
  "WEBHOOK_STOCK_INSUFFICIENT",
];

function addEvent(event: AlertEvent): void {
  recentSecurityEvents.unshift(event);
  if (recentSecurityEvents.length > MAX_EVENTS) {
    recentSecurityEvents.pop();
  }
}

function sendAlert(event: AlertEvent): void {
  writeLog(
    logLevels.SECURITY,
    `ALERT_${event.action}`,
    event.userId,
    { ...event.metadata, alertMessage: event.message }
  );

  if (WEBHOOK_URL) {
    sendWebhookAlert(event).catch((err) => {
      console.error("Failed to send webhook alert:", err.message);
    });
  }

  console.error(`\n🚨 SECURITY ALERT: ${event.message}`);
  console.error(`   Action: ${event.action}`);
  console.error(`   User: ${event.userId}`);
  console.error(`   IP: ${event.ip}`);
  console.error(`   Time: ${event.timestamp}\n`);
}

async function sendWebhookAlert(event: AlertEvent): Promise<void> {
  const payload = JSON.stringify({
    text: `🚨 *PawStore Security Alert*`,
    attachments: [
      {
        color: "danger",
        title: event.message,
        fields: [
          { title: "Action", value: event.action, short: true },
          { title: "Level", value: event.level, short: true },
          { title: "User ID", value: event.userId, short: true },
          { title: "IP Address", value: event.ip, short: true },
          { title: "Timestamp", value: event.timestamp, short: false },
          { title: "Details", value: JSON.stringify(event.metadata, null, 2), short: false },
        ],
        footer: "PawStore Security Monitoring",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });

  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const client = url.protocol === "https:" ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve());
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function monitorEvent(
  action: string,
  userId: string,
  ip: string,
  level: string,
  metadata: Record<string, any> = {}
): void {
  const event: AlertEvent = {
    timestamp: new Date().toISOString(),
    level,
    action,
    message: getAlertMessage(action, metadata),
    userId: userId || "anonymous",
    ip: ip || "unknown",
    metadata,
  };

  addEvent(event);

  if (CRITICAL_ACTIONS.includes(action)) {
    sendAlert(event);
  }

  if (action === "LOGIN_FAILED_WRONG_PASSWORD") {
    const recentFailures = recentSecurityEvents.filter(
      (e) =>
        e.action === "LOGIN_FAILED_WRONG_PASSWORD" &&
        e.ip === ip &&
        Date.now() - new Date(e.timestamp).getTime() < 300000
    );
    if (recentFailures.length >= 3) {
      console.warn(`⚠️ Repeated login failures detected from IP: ${ip} (${recentFailures.length} attempts)`);
    }
  }
}

function getAlertMessage(action: string, metadata: Record<string, any>): string {
  const messages: Record<string, string> = {
    LOGIN_LOCKED_ACCOUNT: `Account locked due to too many failed login attempts${metadata.lockTimeLeft ? ` (unlocks in ${metadata.lockTimeLeft})` : ""}`,
    LOGIN_FAILED_WRONG_PASSWORD: `Failed login attempt${metadata.attemptCount ? ` (attempt #${metadata.attemptCount})` : ""}`,
    MFA_DISABLE_FAILED_WRONG_PASSWORD: "Failed attempt to disable MFA - wrong password",
    MFA_DISABLE_FAILED_WRONG_TOKEN: "Failed attempt to disable MFA - wrong token",
    MFA_ENABLED: "MFA was enabled on account",
    MFA_DISABLED: "MFA was disabled on account",
    PASSWORD_CHANGED: "Account password was changed",
    ACCOUNT_DELETED: "User account was permanently deleted",
    ADMIN_DELETED_USER: `Admin deleted user account${metadata.deletedUserEmail ? `: ${metadata.deletedUserEmail}` : ""}`,
    ADMIN_UNLOCKED_USER: "Admin unlocked a user account",
    WEBHOOK_SIGNATURE_INVALID: "Invalid Stripe webhook signature received - possible tampering",
    PAYMENT_INTENT_FAILED: `Payment processing failed: ${metadata.error || "unknown error"}`,
    AUTH_SESSION_INVALIDATED: "Session was used after invalidation - possible token theft",
    AUTH_SESSION_USER_AGENT_MISMATCH: "Session user agent mismatch - possible token theft",
    STOCK_INSUFFICIENT_ON_PAYMENT: `Stock insufficient for paid order: ${metadata.productName || "unknown product"}`,
    WEBHOOK_STOCK_INSUFFICIENT: "Webhook reported insufficient stock for paid order",
  };

  return messages[action] || `Security event: ${action}`;
}

function getRecentEvents(limit: number = 50): AlertEvent[] {
  return recentSecurityEvents.slice(0, limit);
}

export {
  monitorEvent,
  getRecentEvents,
  sendAlert,
  CRITICAL_ACTIONS,
};
export type { AlertEvent };
