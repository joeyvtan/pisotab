/**
 * Email service using Nodemailer.
 * Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.
 * If any of those are missing, all send functions silently no-op.
 */
const nodemailer = require('nodemailer');

const SMTP_CONFIGURED =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jjtpisotab.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function send(to, subject, html) {
  if (!transporter || !to) return;
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('[mailer] Failed to send email to', to, err.message);
  }
}

function wrap(body) {
  return `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#DC2626;padding:16px 24px;border-radius:8px 8px 0 0;text-align:center">
      <span style="color:#fff;font-size:20px;font-weight:bold">🪙 JJT PisoTab</span>
    </div>
    <div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
      ${body}
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">
      © 2026 JJT PisoTab. You received this because your account is registered on this system.
    </p>
  </div>`;
}

// Sent to a newly registered admin when their account is approved
async function sendAccountApproved(user) {
  if (!user?.email) return;
  const html = wrap(`
    <h2 style="color:#1e293b;margin-top:0">Account Approved ✅</h2>
    <p>Hi <strong>${user.full_name || user.username}</strong>,</p>
    <p>Your JJT PisoTab account has been approved by a Super Admin. You can now log in and start managing your devices.</p>
    <a href="${APP_URL}/login"
       style="display:inline-block;margin-top:12px;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
      Log In Now
    </a>
    <p style="color:#64748b;margin-top:16px;font-size:14px">Username: <strong>${user.username}</strong></p>
  `);
  await send(user.email, 'Your JJT PisoTab account has been approved', html);
}

// Sent to admin when their license purchase request is approved
async function sendPurchaseApproved(user, request, keys) {
  if (!user?.email) return;
  const keyList = keys.map(k => `<li style="font-family:monospace;font-size:15px">${k}</li>`).join('');
  const html = wrap(`
    <h2 style="color:#1e293b;margin-top:0">License Purchase Approved ✅</h2>
    <p>Hi <strong>${user.full_name || user.username}</strong>,</p>
    <p>Your purchase request for <strong>${request.quantity} license key${request.quantity > 1 ? 's' : ''}</strong> has been approved.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px">YOUR LICENSE KEYS</p>
      <ul style="margin:0;padding-left:20px;line-height:2">${keyList}</ul>
    </div>
    <p style="color:#64748b;font-size:14px">Activate each key in your tablet's Admin panel under <strong>About → Activate License Key</strong>.</p>
    <a href="${APP_URL}/dashboard/licenses"
       style="display:inline-block;margin-top:8px;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
      View My Licenses
    </a>
  `);
  await send(user.email, 'Your license purchase has been approved — keys inside', html);
}

// Sent to admin when their license purchase request is rejected
async function sendPurchaseRejected(user, request, reason) {
  if (!user?.email) return;
  const html = wrap(`
    <h2 style="color:#1e293b;margin-top:0">Purchase Request Rejected ❌</h2>
    <p>Hi <strong>${user.full_name || user.username}</strong>,</p>
    <p>Your purchase request for <strong>${request.quantity} license key${request.quantity > 1 ? 's' : ''}</strong>
       (GCash ref: <code>${request.gcash_reference}</code>) has been <strong>rejected</strong>.</p>
    ${reason ? `<div style="background:#fef2f2;border-left:4px solid #DC2626;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
      <p style="margin:0;color:#991b1b"><strong>Reason:</strong> ${reason}</p>
    </div>` : ''}
    <p style="color:#64748b;font-size:14px">If you believe this is a mistake, please contact your Super Admin.</p>
  `);
  await send(user.email, 'Your license purchase request was rejected', html);
}

// Sent to user when a password reset token is generated (if SMTP is configured)
async function sendPasswordReset(user, token) {
  if (!user?.email) return;
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const html = wrap(`
    <h2 style="color:#1e293b;margin-top:0">Password Reset Request 🔑</h2>
    <p>Hi <strong>${user.full_name || user.username}</strong>,</p>
    <p>A password reset was requested for your account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}"
       style="display:inline-block;margin-top:12px;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
      Reset Password
    </a>
    <p style="color:#64748b;font-size:14px;margin-top:16px">Or copy this link:<br>
      <code style="word-break:break-all">${resetUrl}</code>
    </p>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px">If you didn't request this, ignore this email — your password won't change.</p>
  `);
  await send(user.email, 'Reset your JJT PisoTab password', html);
}

// Sent to admin when their license is expiring soon (7 days and 3 days before)
async function sendLicenseExpiring(user, license, daysLeft) {
  if (!user?.email) return;
  const urgency = daysLeft <= 3 ? '🔴' : '🟡';
  const deviceLine = license.device_name
    ? `<p style="color:#64748b;font-size:14px">Device: <strong>${license.device_name}</strong></p>`
    : '';
  const html = wrap(`
    <h2 style="color:#1e293b;margin-top:0">${urgency} License Expiring in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}</h2>
    <p>Hi <strong>${user.full_name || user.username}</strong>,</p>
    <p>Your license key is expiring soon. Once it expires, your device will revert to <strong>trial mode</strong>.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:16px 0">
      <p style="margin:0 0 4px;color:#64748b;font-size:13px">LICENSE KEY</p>
      <p style="margin:0;font-family:monospace;font-size:15px;color:#1e293b">${license.key}</p>
      ${deviceLine}
      <p style="margin:8px 0 0;color:${daysLeft <= 3 ? '#DC2626' : '#d97706'};font-size:13px;font-weight:bold">
        Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
      </p>
    </div>
    <p style="color:#64748b;font-size:14px">To keep your device running, renew your license before it expires.</p>
    <a href="${APP_URL}/dashboard/buy-license"
       style="display:inline-block;margin-top:8px;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
      Renew License
    </a>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px">
      If you've already renewed, you can ignore this notice.
    </p>
  `);
  const subject = daysLeft <= 3
    ? `⚠️ License expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — renew now`
    : `License expiring in ${daysLeft} days — action needed`;
  await send(user.email, subject, html);
}

// Sent when a user submits the support/contact form
async function sendSupportMessage({ name, email, subject, message }) {
  const SUPPORT_TO = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;
  if (!SUPPORT_TO) return;

  const html = wrap(`
    <h2 style="color:#1e293b;margin-top:0">New Support Request 📬</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td style="color:#64748b;padding:4px 8px 4px 0;white-space:nowrap">From</td>
          <td style="color:#1e293b;font-weight:bold">${name} &lt;${email}&gt;</td></tr>
      <tr><td style="color:#64748b;padding:4px 8px 4px 0">Subject</td>
          <td style="color:#1e293b">${subject}</td></tr>
    </table>
    <div style="margin-top:16px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px">
      <p style="margin:0;white-space:pre-wrap;color:#1e293b;font-size:14px">${message}</p>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px">
      Reply directly to this email to respond to the sender.
    </p>
  `);

  if (!transporter || !SUPPORT_TO) return;
  try {
    await transporter.sendMail({
      from: FROM, to: SUPPORT_TO, replyTo: email,
      subject: `[PisoTab Support] ${subject}`, html,
    });
  } catch (err) {
    console.error('[mailer] Failed to send support message:', err.message);
  }
}

module.exports = { sendAccountApproved, sendPurchaseApproved, sendPurchaseRejected, sendPasswordReset, sendLicenseExpiring, sendSupportMessage, SMTP_CONFIGURED };
