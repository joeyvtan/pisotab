/**
 * PDF receipt generator for license purchase approvals.
 * Uses pdfkit — pure JS, no native dependencies.
 * Call generateReceipt(request, buyer) → returns a Buffer.
 */
const PDFDocument = require('pdfkit');

const BRAND_RED  = '#DC2626';
const BRAND_GOLD = '#D4A017';
const DARK       = '#1E293B';
const MUTED      = '#64748B';

function formatPeso(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(unixSecs) {
  return new Date(unixSecs * 1000).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * @param {object} request  - license_purchase_requests row (with generated_keys JSON)
 * @param {object} buyer    - users row (username, full_name, business_name, email)
 * @returns {Promise<Buffer>}
 */
function generateReceipt(request, buyer) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // usable width

    // ── Header band ──────────────────────────────────────────────────────────
    doc.rect(50, 50, W, 80).fill(BRAND_RED);

    doc.fillColor('#FFFFFF')
       .fontSize(22).font('Helvetica-Bold')
       .text('JJT PisoTab', 70, 68);

    doc.fontSize(10).font('Helvetica')
       .text('Smart Coin-Operated Phone Rental System', 70, 94);

    // Gold accent line
    doc.rect(50, 130, W, 3).fill(BRAND_GOLD);

    // ── Title ────────────────────────────────────────────────────────────────
    doc.fillColor(DARK)
       .fontSize(18).font('Helvetica-Bold')
       .text('OFFICIAL RECEIPT', 50, 150, { align: 'center', width: W });

    doc.fontSize(10).font('Helvetica').fillColor(MUTED)
       .text(`Receipt No: ${request.id}`, 50, 174, { align: 'center', width: W });

    // ── Divider ──────────────────────────────────────────────────────────────
    doc.moveTo(50, 198).lineTo(50 + W, 198).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // ── Two-column info section ───────────────────────────────────────────────
    const col1 = 50;
    const col2 = 320;
    let y = 215;

    function labelValue(label, value, col, row) {
      doc.fontSize(8).font('Helvetica').fillColor(MUTED).text(label, col, row);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(value || '—', col, row + 11);
    }

    // Left column — buyer info
    labelValue('BILLED TO', '', col1, y);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK)
       .text(buyer.full_name || buyer.username, col1, y + 11);
    doc.fontSize(9).font('Helvetica').fillColor(MUTED)
       .text(`@${buyer.username}`, col1, y + 26);
    if (buyer.business_name) {
      doc.text(buyer.business_name, col1, y + 38);
    }
    if (buyer.email) {
      doc.text(buyer.email, col1, buyer.business_name ? y + 50 : y + 38);
    }

    // Right column — payment info
    labelValue('DATE ISSUED',   formatDate(request.reviewed_at || request.created_at), col2, y);
    labelValue('GCASH REFERENCE', request.gcash_reference, col2, y + 40);
    labelValue('STATUS', 'PAID & APPROVED', col2, y + 80);

    y += 120;

    // ── Items table ──────────────────────────────────────────────────────────
    doc.rect(col1, y, W, 28).fill('#F8FAFC');
    doc.fontSize(9).font('Helvetica-Bold').fillColor(MUTED)
       .text('DESCRIPTION',   col1 + 10, y + 9)
       .text('QTY',           col1 + 300, y + 9)
       .text('UNIT PRICE',    col1 + 360, y + 9)
       .text('TOTAL',         col1 + 430, y + 9);

    y += 28;
    doc.moveTo(col1, y).lineTo(col1 + W, y).strokeColor('#E2E8F0').stroke();

    const unitPrice = request.quantity > 0 ? request.amount_paid / request.quantity : 0;
    y += 8;
    doc.fontSize(10).font('Helvetica').fillColor(DARK)
       .text(`PisoTab License Key (${request.plan})`, col1 + 10, y)
       .text(String(request.quantity),               col1 + 300, y)
       .text(formatPeso(unitPrice),                  col1 + 360, y)
       .text(formatPeso(request.amount_paid),        col1 + 430, y);

    y += 24;
    doc.moveTo(col1, y).lineTo(col1 + W, y).strokeColor('#E2E8F0').stroke();

    // Total row
    y += 12;
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_RED)
       .text('TOTAL AMOUNT PAID', col1 + 10, y)
       .text(formatPeso(request.amount_paid), col1 + 430, y);

    y += 36;

    // ── License Keys ─────────────────────────────────────────────────────────
    const keys = (() => {
      try { return JSON.parse(request.generated_keys || '[]'); } catch { return []; }
    })();

    if (keys.length > 0) {
      doc.moveTo(col1, y).lineTo(col1 + W, y).strokeColor('#E2E8F0').stroke();
      y += 16;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
         .text('LICENSE KEYS', col1, y);
      doc.fontSize(9).font('Helvetica').fillColor(MUTED)
         .text('Activate each key in the tablet Admin panel under About → Activate License Key', col1, y + 14);
      y += 36;

      // Key boxes (3 per row)
      const keyBoxW = Math.floor((W - 20) / 3);
      keys.forEach((key, i) => {
        const col = col1 + (i % 3) * (keyBoxW + 10);
        const row = y + Math.floor(i / 3) * 36;
        doc.rect(col, row, keyBoxW, 26).fill('#F1F5F9').stroke();
        doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
           .text(key, col + 4, row + 8, { width: keyBoxW - 8, align: 'center' });
      });

      y += Math.ceil(keys.length / 3) * 36 + 16;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 80;
    doc.rect(50, footerY, W, 50).fill('#F8FAFC');
    doc.fontSize(8).font('Helvetica').fillColor(MUTED)
       .text(
         'This is an official receipt for your license purchase. Keep this for your records.\n' +
         'JJT PisoTab — Smart Coin-Operated Phone Rental System',
         60, footerY + 10,
         { align: 'center', width: W - 20 }
       );

    doc.end();
  });
}

module.exports = { generateReceipt };
