/**
 * License purchase request routes.
 * Admin submits a GCash payment reference → superadmin reviews → approve auto-generates keys.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin, requireSuperAdmin } = require('./auth');
const { emitBadges } = require('../services/badges');
const { sendPurchaseApproved, sendPurchaseRejected } = require('../services/mailer');
const { generateReceipt } = require('../services/pdf');

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return 'PTAB-' + groups.join('-');
}

// GET /api/purchase-requests
// Superadmin sees all requests; admin sees only their own
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const isSuperAdmin = req.user.role === 'superadmin';

    const query = `
      SELECT pr.*,
        u.username  AS requester_username,
        u.full_name AS requester_full_name,
        r.username  AS reviewer_username
      FROM license_purchase_requests pr
      JOIN users u ON u.id = pr.user_id
      LEFT JOIN users r ON r.id = pr.reviewed_by
      ${isSuperAdmin ? '' : 'WHERE pr.user_id = ?'}
      ORDER BY pr.created_at DESC
    `;
    res.json(await db.all(query, isSuperAdmin ? [] : [req.user.id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/purchase-requests — admin submits a GCash payment
// body: { quantity, gcash_reference, plan? }
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { quantity = 1, gcash_reference, plan = 'paid' } = req.body;
  if (!gcash_reference) return res.status(400).json({ error: 'gcash_reference required' });
  if (quantity < 1 || quantity > 50) return res.status(400).json({ error: 'quantity must be between 1 and 50' });

  try {
    const db = getDb();

    // Resolve the price for this user: user-specific rule takes priority over platform default
    const pricing = await db.get(
      `SELECT price_pesos, duration_days FROM license_pricing
       WHERE plan = ? AND (user_id = ? OR user_id IS NULL)
       ORDER BY user_id IS NULL ASC
       LIMIT 1`,
      [plan, req.user.id]
    );

    const priceEach = pricing?.price_pesos ?? 0;
    const totalAmount = priceEach * quantity;

    const id = 'req_' + uuidv4().replace(/-/g, '').slice(0, 8);
    await db.run(
      `INSERT INTO license_purchase_requests
        (id, user_id, plan, quantity, amount_paid, gcash_reference, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, req.user.id, plan, quantity, totalAmount, gcash_reference.trim()]
    );

    emitBadges(req.io);

    res.status(201).json({
      id,
      status: 'pending',
      quantity,
      plan,
      amount_paid: totalAmount,
      gcash_reference: gcash_reference.trim(),
      message: 'Purchase request submitted. A Super Admin will review and approve it shortly.',
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/purchase-requests/:id/approve — superadmin approves → auto-generates license keys
router.patch('/:id/approve', requireAuth, requireSuperAdmin, async (req, res) => {
  const { note } = req.body;
  try {
    const db = getDb();

    const request = await db.get('SELECT * FROM license_purchase_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already reviewed' });

    // Resolve duration from license_pricing for this user+plan
    const pricing = await db.get(
      `SELECT duration_days FROM license_pricing
       WHERE plan = ? AND (user_id = ? OR user_id IS NULL)
       ORDER BY user_id IS NULL ASC
       LIMIT 1`,
      [request.plan, request.user_id]
    );

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = pricing?.duration_days
      ? now + pricing.duration_days * 86400
      : null;  // null = lifetime

    // Generate one license key per quantity requested
    const generatedKeys = [];
    for (let i = 0; i < request.quantity; i++) {
      const key = generateKey();
      const licId = 'lic_' + crypto.randomBytes(4).toString('hex');
      await db.run(
        `INSERT INTO licenses (id, key, plan, owner_user_id, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [licId, key, request.plan, request.user_id, expiresAt]
      );
      generatedKeys.push({ id: licId, key });
    }

    // Mark request as approved and store key list for the receipt
    await db.run(
      `UPDATE license_purchase_requests
       SET status = 'approved', reviewed_by = ?, reviewed_at = ?, note = ?, generated_keys = ?
       WHERE id = ?`,
      [req.user.id, now, note || null, JSON.stringify(generatedKeys.map(k => k.key)), req.params.id]
    );

    // Audit log entry
    const auditId = 'aud_' + uuidv4().replace(/-/g, '').slice(0, 8);
    await db.run(
      `INSERT INTO audit_log (id, user_id, action, target_type, target_id, detail)
       VALUES (?, ?, 'purchase.approved', 'purchase_request', ?, ?)`,
      [auditId, req.user.id, req.params.id, JSON.stringify({ keys: generatedKeys.map(k => k.key) })]
    );

    // Send approval email with the generated keys (fire-and-forget)
    const requester = await db.get('SELECT username, email, full_name FROM users WHERE id = ?', [request.user_id]);
    sendPurchaseApproved(requester, request, generatedKeys.map(k => k.key)).catch(() => {});

    emitBadges(req.io);
    res.json({ ok: true, status: 'approved', licenses_generated: generatedKeys });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/purchase-requests/:id/reject — superadmin rejects with optional note
router.patch('/:id/reject', requireAuth, requireSuperAdmin, async (req, res) => {
  const { note } = req.body;
  try {
    const db = getDb();

    const request = await db.get('SELECT * FROM license_purchase_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already reviewed' });

    const now = Math.floor(Date.now() / 1000);
    await db.run(
      `UPDATE license_purchase_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, note = ?
       WHERE id = ?`,
      [req.user.id, now, note || null, req.params.id]
    );

    // Send rejection email (fire-and-forget)
    const requester = await db.get('SELECT username, email, full_name FROM users WHERE id = ?', [request.user_id]);
    sendPurchaseRejected(requester, request, note || null).catch(() => {});

    emitBadges(req.io);
    res.json({ ok: true, status: 'rejected' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/purchase-requests/:id/receipt — download PDF receipt (superadmin or owning admin)
router.get('/:id/receipt', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();

    const pdfSetting = await db.get("SELECT value FROM app_settings WHERE key = 'invoice_pdf_enabled'", []);
    if (pdfSetting?.value !== '1') {
      return res.status(403).json({ error: 'Invoice PDF is currently disabled by the administrator.' });
    }

    const request = await db.get('SELECT * FROM license_purchase_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'approved') return res.status(400).json({ error: 'Receipt only available for approved requests' });

    // Admin can only download their own receipt; superadmin can download any
    if (req.user.role === 'admin' && request.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const buyer = await db.get('SELECT username, full_name, business_name, email FROM users WHERE id = ?', [request.user_id]);

    const pdf = await generateReceipt(request, buyer || { username: 'Unknown' });
    const filename = `receipt-${request.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  } catch (err) {
    console.error('[receipt] PDF generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

module.exports = router;
