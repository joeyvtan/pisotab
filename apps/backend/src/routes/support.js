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

  // Also notify via Telegram (works even without SMTP configured)
  const tgMsg = `📬 New Support Request\n\nFrom: ${name} <${email}>\nSubject: ${subject || 'Support Request'}\n\n${message}`;
  notify(tgMsg).catch(() => {});

  res.json({ ok: true, message: 'Your message has been sent. We will get back to you shortly.' });
});

// GET /api/support/test-email — superadmin only, sends a real test email and returns the result
router.get('/test-email', requireAuth, requireSuperAdmin, async (req, res) => {
  const host  = process.env.SMTP_HOST;
  const port  = parseInt(process.env.SMTP_PORT || '587', 10);
  const user  = process.env.SMTP_USER;
  const pass  = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return res.json({ ok: false, error: 'SMTP not configured — missing SMTP_HOST, SMTP_USER, or SMTP_PASS env vars' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host, port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout:   8000,
      socketTimeout:     15000,
    });

    await transporter.verify();
    await transporter.sendMail({
      from: `JJT PisoTab <${user}>`,
      to:   user,
      subject: '[PisoTab] SMTP Test Email',
      text: 'This is a test email from your PisoTab backend. SMTP is working correctly.',
    });

    res.json({ ok: true, message: `Test email sent to ${user}` });
  } catch (err) {
    res.json({ ok: false, error: err.message, code: err.code });
  }
});

module.exports = router;
