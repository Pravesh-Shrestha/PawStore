import nodemailer from "nodemailer";

/**
 * Email Service for PawStore
 *
 * Handles password reset emails and other transactional emails.
 * - Production: uses configured SMTP (Gmail, SendGrid, etc.)
 * - Development: auto-creates a free Ethereal test account and actually sends emails
 *   that can be viewed at https://ethereal.email
 *
 * No configuration needed for development — Ethereal works out of the box.
 */

let transporter: nodemailer.Transporter | null = null;
let lastEtherealUrl: string | null = null;

/**
 * Create (or reuse) the email transporter.
 * In development, automatically creates a free Ethereal test account.
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  // If SMTP credentials are configured, use them (works in both dev and production)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log(`\n📧 SMTP Configured: ${process.env.SMTP_USER}`);
    return transporter;
  }

  // Fallback: auto-create a free Ethereal email account for testing
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  lastEtherealUrl = `https://ethereal.email/login?user=${encodeURIComponent(testAccount.user)}`;
  console.log("\n📧 Ethereal Email Test Account Created");
  console.log(`   View emails at: ${lastEtherealUrl}`);
  console.log(`   Login: ${testAccount.user}`);
  console.log(`   Password: ${testAccount.pass}\n`);

  return transporter;
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "noreply@pawstore.com";
const APP_NAME = "PawStore";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Send a password reset email with a secure reset link
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #d97706; padding: 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .body { padding: 32px 24px; }
    .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #d97706; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .btn:hover { background: #b45309; }
    .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
    .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; color: #92400e; font-size: 13px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐾 ${APP_NAME}</h1>
    </div>
    <div class="body">
      <p>Hi <strong>${userName}</strong>,</p>
      <p>We received a request to reset your password for your ${APP_NAME} account. Click the button below to set a new password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <div class="warning">
        ⚠️ This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
      </div>
      <p style="color: #6b7280; font-size: 14px;">Or copy this link into your browser:<br>
      <span style="color: #d97706; word-break: break-all;">${resetUrl}</span></p>
    </div>
    <div class="footer">
      <p>${APP_NAME} — Pet Accessories E-Commerce Platform</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
    to: email,
    subject: `Reset Your ${APP_NAME} Password`,
    html,
  };

  try {
    const transport = await getTransporter();
    const info = await transport.sendMail(mailOptions);

    // Get Ethereal preview URL (works in both dev and production)
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log("\n========================================");
    console.log("  PASSWORD RESET EMAIL SENT");
    console.log("========================================");
    console.log(`  To: ${email}`);
    console.log(`  Subject: ${mailOptions.subject}`);
    console.log(`  Message ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`  📬 Preview URL: ${previewUrl}`);
    }
    console.log(`  Reset URL: ${resetUrl}`);
    console.log("========================================\n");

    // In development, attach preview info to the response so the frontend can show it
    (global as any).__lastEmailPreview = previewUrl || null;
    (global as any).__lastResetUrl = resetUrl;
  } catch (error: any) {
    console.error("Failed to send email:", error.message);
    throw new Error("Failed to send password reset email. Please try again later.");
  }
}
