/**
 * Support / contact form route.
 * POST /api/support/contact — sends an email to the superadmin support address.
 * No auth required — allows potential customers to reach out.
 * Rate limiting is left to the infrastructure layer.
 */
const express = require('express');
const router  = express.Router();
const { sendSupportMessage } = require('../services/mailer');

// POST /api/support/contact
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    await sendSupportMessage({ name, email, subject: subject || 'Support Request', message });
    res.json({ ok: true, message: 'Your message has been sent. We will get back to you shortly.' });
  } catch (err) {
    console.error('[support] Failed to send message:', err.message);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;
