// src/routes/cloudmailin.js
import { Router } from 'express';
import { processIncomingEmail } from './inbox.js'; // reuse existing logic

const router = Router();

// Optional secret verification – set CLOUDMAILIN_SECRET in .env if you want
router.post('/', async (req, res) => {
  try {
    const secret = process.env.CLOUDMAILIN_SECRET;
    if (secret && req.headers['x-cloudmailin-secret'] !== secret) {
      return res.status(401).json({ error: 'Invalid Cloudmailin secret' });
    }

    // Log full payload in dev so we can inspect the exact field names
    console.log('[Cloudmailin] Raw payload keys:', Object.keys(req.body));
    console.log('[Cloudmailin] envelope:', req.body.envelope);
    console.log('[Cloudmailin] headers:', req.body.headers);

    // Cloudmailin JSON-Normalized format fields
    const {
      envelope = {},
      headers = {},
      // Body text: Cloudmailin sends 'plain' in JSON-normalized format, not 'text'
      plain,
      text,
      html,
      attachments = []
    } = req.body;

    // ─── FIX 1: Board address lookup ────────────────────────────────────────
    // envelope.to  = the Cloudmailin relay address  (abc@cloudmailin.net) ← WRONG for board lookup
    // headers.to   = the original recipient address the sender addressed   ← CORRECT for board lookup
    // When a user forwards to abc123@boards.frankloo.app, that address lives in headers.to
    const to = headers.to || envelope.to || '';
    const from = envelope.from || headers.from || '';

    // ─── FIX 2: Subject field ────────────────────────────────────────────────
    const subject = headers.subject || '';

    // ─── FIX 3: Body text field name ────────────────────────────────────────
    // Cloudmailin JSON-Normalized uses 'plain' for plain-text body, not 'text'
    const bodyText = plain || text || '';

    console.log(`[Cloudmailin] Routing email → to: ${to}, from: ${from}, subject: ${subject}`);

    // Transform attachments to match our internal shape
    const transformedAttachments = (attachments || []).map((att) => ({
      filename: att.file_name || att.filename || 'attachment',
      storagePath: att.url || att.storage_path || '',
      mimeType: att.content_type || 'application/octet-stream',
      size: att.size || 0,
    }));

    const result = await processIncomingEmail({
      to,
      from,
      subject,
      text: bodyText,
      html: html || '',
      attachments: transformedAttachments,
    });

    res.json(result);
  } catch (error) {
    console.error('[Cloudmailin] webhook error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to process Cloudmailin webhook' });
  }
});

export default router;
