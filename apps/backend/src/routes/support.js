/**
 * Support / contact form route.
 * POST /api/support/contact — sends an email to the superadmin support address.
 * No auth required — allows potential customers to reach out.
 * Rate limiting is left to the infrastructure layer.
 */
const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const { sendSupportMessage } = require('../services/mailer');
const { notify } = require('../services/notifier');
const { requireAuth, requireSuperAdmin } = require('./auth');
const { addNotification } = require('../services/notificationLogger');

// POST /api/support/contact
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Fire-and-forget — never block the HTTP response
  sendSupportMessage({ name, email, subject: subject || 'Support Request', message }).catch(err => {
    console.error('[support] Email failed:', err.message);
  });

  addNotification({ user_id: null, type: 'support_request', title: `Support: ${subject || 'Support Request'}`, body: `From: ${name} <${email}>\n${message}` });

  // Also notify via Telegram (works even without SMTP configured)
  const tgMsg = `📬 New Support Request\n\nFrom: ${name} <${email}>\nSubject: ${subject || 'Support Request'}\n\n${message}`;
  notify(tgMsg).catch(() => {});

  res.json({ ok: true, message: 'Your message has been sent. We will get back to you shortly.' });
});

// GET /api/support/test-email — superadmin only, sends a real test email and returns the result
router.get('/test-email', requireAuth, requireSuperAdmin, async (req, res) => {
  // Try Resend first (HTTPS — works on Render free tier)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM || `JJT PisoTab <onboarding@resend.dev>`;
      const to   = process.env.RESEND_TO   || process.env.SMTP_USER;
      if (!to) return res.json({ ok: false, error: 'Set RESEND_TO or SMTP_USER env var so we know where to send the test' });
      await resend.emails.send({
        from, to: [to],
        subject: '[PisoTab] Resend Test Email',
        text: 'This is a test email from your PisoTab backend via Resend. Email is working correctly.',
      });
      return res.json({ ok: true, message: `Test email sent to ${to} via Resend`, sender: from });
    } catch (err) {
      return res.json({ ok: false, provider: 'resend', error: err.message });
    }
  }

  // Fall back to SMTP test
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return res.json({ ok: false, error: 'No email provider configured. Set RESEND_API_KEY (recommended) or SMTP_HOST/SMTP_USER/SMTP_PASS.' });
  }
  try {
    const transporter = nodemailer.createTransport({
      host, port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
      connectionTimeout: 10000, greetingTimeout: 8000, socketTimeout: 15000,
    });
    await transporter.verify();
    await transporter.sendMail({
      from: `JJT PisoTab <${user}>`, to: user,
      subject: '[PisoTab] SMTP Test Email',
      text: 'SMTP is working correctly.',
    });
    res.json({ ok: true, message: `Test email sent to ${user} via SMTP` });
  } catch (err) {
    res.json({ ok: false, provider: 'smtp', error: err.message, code: err.code });
  }
});

module.exports = router;
