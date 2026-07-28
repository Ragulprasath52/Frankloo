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

    // Log approximate payload size for diagnosing large email issues
    const bodySize = JSON.stringify(req.body).length;
    console.log(`[Cloudmailin] Payload size: ~${(bodySize / 1024).toFixed(1)}KB, keys: ${Object.keys(req.body).join(', ')}`);
    console.log('[Cloudmailin] envelope:', JSON.stringify(req.body.envelope));
    console.log('[Cloudmailin] headers keys:', Object.keys(req.body.headers || {}).join(', '));

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

    // ─── Board address lookup ────────────────────────────────────────────────
    // For newsletter/broadcast emails the To header may be a mailing list address.
    // We try multiple fields in priority order to find our board address:
    //   1. envelope.to          – The actual SMTP RCPT TO recipient (most reliable for routing)
    //   2. headers['x-original-to']  – Set by MTA on forwarded emails
    //   3. headers['x-forward-to']   – Some forwarding setups use this
    //   4. headers.to           – The visible To: header (may be mailing list address for newsletters)
    const envelopeTo = Array.isArray(envelope.to) ? envelope.to[0] : (envelope.to || '');
    const headersXOriginalTo = headers['x-original-to'] || '';
    const headersXForwardTo = headers['x-forward-to'] || '';
    const headersTo = headers.to || '';

    // Use the first non-empty value
    const to = envelopeTo || headersXOriginalTo || headersXForwardTo || headersTo || '';
    const from = envelope.from || headers.from || '';

    // ─── Subject field ────────────────────────────────────────────────────────
    const subject = headers.subject || '(No Subject)';

    // ─── Body text field name ─────────────────────────────────────────────────
    // Cloudmailin JSON-Normalized uses 'plain' for plain-text body, not 'text'
    const bodyText = plain || text || '';

    console.log(`[Cloudmailin] Routing email → to: "${to}" (envelope: "${envelopeTo}", headers.to: "${headersTo}"), from: "${from}", subject: "${subject}", attachments: ${(attachments || []).length}`);

    if (!to) {
      console.error('[Cloudmailin] Could not determine recipient address from envelope or headers');
      // Return 200 to avoid CloudMailin retries — this is a configuration issue, not a server error
      return res.status(200).json({ error: 'Could not determine recipient board address', action: 'DROPPED' });
    }

    // Transform attachments to match our internal shape
    const transformedAttachments = (attachments || []).map((att) => ({
      filename: att.file_name || att.filename || 'attachment',
      storagePath: att.url || att.storage_path || '',
      mimeType: att.content_type || 'application/octet-stream',
      size: att.size || 0,
      base64Data: att.content || att.data || att.content_b64 || null
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
    // Return 200 for known "not found" / "disabled" errors to prevent CloudMailin from retrying endlessly
    const knownErrors = ['Board not found', 'Incoming email is disabled', 'Rate limit exceeded', 'Sender not authorized', 'spam'];
    const isKnownError = knownErrors.some(e => error.message?.toLowerCase().includes(e.toLowerCase()));
    if (isKnownError) {
      return res.status(200).json({ error: error.message, action: 'REJECTED' });
    }
    res.status(500).json({ error: error.message || 'Failed to process Cloudmailin webhook' });
  }
});

export default router;
