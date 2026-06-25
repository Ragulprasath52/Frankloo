/**
 * Integrations Route
 *
 * Handles configuration + incoming webhooks for:
 *   - Slack (Incoming Webhooks)
 *   - Discord (Incoming Webhooks)
 *   - GitHub (push + pull_request events)
 *   - Google Calendar (.ics export)
 *
 * All integrations use official free APIs. No Zapier, no Make, no paid middleware.
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';
import https from 'https';
import jwt from 'jsonwebtoken';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getIntegration(workspaceId, type) {
  const cfg = await prisma.integrationConfig.findUnique({
    where: { workspaceId_type: { workspaceId, type } }
  });
  if (!cfg || !cfg.isEnabled) return null;
  try { return { ...cfg, config: JSON.parse(cfg.config) }; } catch { return null; }
}

function postWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => { resolve(res.statusCode); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Send Slack Notification (called from boards route on events) ────────────
export async function sendSlackNotification(workspaceId, text, blocks = null) {
  const integration = await getIntegration(workspaceId, 'SLACK');
  if (!integration) return;
  const { webhookUrl } = integration.config;
  if (!webhookUrl) return;
  try {
    await postWebhook(webhookUrl, blocks ? { text, blocks } : { text });
  } catch (e) {
    console.error('Slack webhook error:', e.message);
  }
}

// ─── Send Discord Notification ───────────────────────────────────────────────
export async function sendDiscordNotification(workspaceId, embed) {
  const integration = await getIntegration(workspaceId, 'DISCORD');
  if (!integration) return;
  const { webhookUrl } = integration.config;
  if (!webhookUrl) return;
  try {
    await postWebhook(webhookUrl, { embeds: [embed] });
  } catch (e) {
    console.error('Discord webhook error:', e.message);
  }
}

// ─── GET /api/integrations/:workspaceId ──────────────────────────────────────
// List all integrations configured for a workspace
router.get('/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const integrations = await prisma.integrationConfig.findMany({
      where: { workspaceId }
    });

    // Mask secrets in config before returning
    const safe = integrations.map(i => {
      let cfg = {};
      try { cfg = JSON.parse(i.config); } catch { }
      if (cfg.webhookUrl) cfg.webhookUrl = cfg.webhookUrl.replace(/\/[^/]+$/, '/••••••');
      if (cfg.secret) cfg.secret = '••••••';
      return { ...i, config: cfg };
    });

    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PUT /api/integrations/:workspaceId/:type ─────────────────────────────────
// Save or update an integration config
router.put('/:workspaceId/:type', authenticate, async (req, res) => {
  try {
    const { workspaceId, type } = req.params;
    const VALID_TYPES = ['SLACK', 'DISCORD', 'GITHUB', 'GOOGLE_CALENDAR'];
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid integration type' });

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id, role: { in: ['OWNER', 'ADMIN'] } }
    });
    if (!member) return res.status(403).json({ error: 'Admin access required' });

    const { config, isEnabled = true } = req.body;
    const integration = await prisma.integrationConfig.upsert({
      where: { workspaceId_type: { workspaceId, type } },
      create: { workspaceId, type, config: JSON.stringify(config), isEnabled },
      update: { config: JSON.stringify(config), isEnabled }
    });

    res.json({ success: true, id: integration.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/integrations/:workspaceId/:type ──────────────────────────────
router.delete('/:workspaceId/:type', authenticate, async (req, res) => {
  try {
    const { workspaceId, type } = req.params;
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id, role: { in: ['OWNER', 'ADMIN'] } }
    });
    if (!member) return res.status(403).json({ error: 'Admin access required' });

    await prisma.integrationConfig.deleteMany({ where: { workspaceId, type } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/integrations/github/webhook ────────────────────────────────────
// Receives GitHub push + pull_request events
// Card reference format in commit/PR: [TF-<cardId>]
router.post('/github/webhook', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    const payload = req.body;

    // Find workspace that has GitHub configured with matching repo
    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) return res.status(400).json({ error: 'No repository in payload' });

    const [owner, repo] = repoFullName.split('/');
    const integrations = await prisma.integrationConfig.findMany({
      where: { type: 'GITHUB', isEnabled: true }
    });

    // Find the matching integration by repo owner/name
    let matchedIntegration = null;
    for (const i of integrations) {
      try {
        const cfg = JSON.parse(i.config);
        if (cfg.repoOwner === owner && cfg.repoName === repo) {
          matchedIntegration = { ...i, config: cfg };
          break;
        }
      } catch { }
    }

    if (!matchedIntegration) return res.status(200).json({ ignored: true });

    // Verify HMAC signature if secret is configured
    if (matchedIntegration.config.secret && signature) {
      const hmac = crypto.createHmac('sha256', matchedIntegration.config.secret);
      hmac.update(JSON.stringify(payload));
      const expected = `sha256=${hmac.digest('hex')}`;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Extract card references [TF-<id>] from commit messages or PR body
    const TF_REF = /\[TF-([a-f0-9-]+)\]/gi;

    if (event === 'push') {
      const commits = payload.commits || [];
      for (const commit of commits) {
        const matches = [...(commit.message || '').matchAll(TF_REF)];
        for (const match of matches) {
          const cardId = match[1];
          const card = await prisma.card.findUnique({ where: { id: cardId } });
          if (!card) continue;

          // Get system user for log (use first workspace admin)
          const admin = await prisma.workspaceMember.findFirst({
            where: { workspaceId: matchedIntegration.workspaceId, role: { in: ['OWNER', 'ADMIN'] } }
          });

          // Append commit to card's githubCommits JSON
          let commits_list = [];
          try { commits_list = JSON.parse(card.githubCommits || '[]'); } catch { }
          commits_list.push({ sha: commit.id?.substring(0, 7), message: commit.message, url: commit.url });

          await prisma.card.update({
            where: { id: cardId },
            data: { githubCommits: JSON.stringify(commits_list) }
          });

          if (admin) {
            const board = await prisma.list.findUnique({ where: { id: card.listId }, select: { boardId: true } });
            await prisma.activityLog.create({
              data: {
                userId: admin.userId,
                boardId: board?.boardId || matchedIntegration.workspaceId,
                cardId,
                action: 'GITHUB_COMMIT',
                details: `Commit ${commit.id?.substring(0, 7)}: ${commit.message}`
              }
            });
          }
        }
      }
    }

    if (event === 'pull_request') {
      const pr = payload.pull_request;
      const text = `${pr.title} ${pr.body || ''}`;
      const matches = [...text.matchAll(TF_REF)];

      for (const match of matches) {
        const cardId = match[1];
        const card = await prisma.card.findUnique({
          where: { id: cardId },
          include: { list: { select: { boardId: true, board: { select: { workspaceId: true } } } } }
        });
        if (!card) continue;

        // Link PR to card
        await prisma.card.update({
          where: { id: cardId },
          data: { githubPrUrl: pr.html_url }
        });

        // Auto-close: if PR is merged, move card to Done column
        if (payload.action === 'closed' && pr.merged) {
          const board = await prisma.board.findUnique({
            where: { id: card.list.boardId },
            include: { lists: { orderBy: { position: 'asc' } } }
          });
          const doneList = board?.lists.find(l => l.name.toLowerCase() === 'done');

          if (doneList && card.listId !== doneList.id) {
            const maxPos = doneList.cards?.reduce((m, c) => Math.max(m, c.position), 0) || 0;
            await prisma.card.update({
              where: { id: cardId },
              data: { listId: doneList.id, position: maxPos + 1000 }
            });

            // Log it
            const admin = await prisma.workspaceMember.findFirst({
              where: { workspaceId: card.list.board.workspaceId, role: { in: ['OWNER', 'ADMIN'] } }
            });
            if (admin) {
              await prisma.activityLog.create({
                data: {
                  userId: admin.userId,
                  boardId: card.list.boardId,
                  cardId,
                  action: 'PR_MERGED',
                  details: `PR merged: ${pr.html_url} → card auto-moved to Done`
                }
              });
            }
          }
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('GitHub webhook error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/integrations/:workspaceId/calendar/export.ics ─────────────────
// Export all board due dates + milestones as iCalendar format
router.get('/:workspaceId/calendar/export.ics', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const token = req.query.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'frankloo-super-secret-key-998877');
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: decoded.userId }
    });
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const cards = await prisma.card.findMany({
      where: {
        isArchived: false,
        dueDate: { not: null },
        list: { board: { workspaceId, isArchived: false } }
      },
      select: { id: true, title: true, dueDate: true, description: true }
    });

    const milestones = await prisma.milestone.findMany({
      where: { board: { workspaceId }, dueDate: { not: null } },
      select: { id: true, title: true, dueDate: true, description: true }
    });

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Frankloo//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    const toICSDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    for (const card of cards) {
      ics.push(
        'BEGIN:VEVENT',
        `UID:card-${card.id}@frankloo`,
        `DTSTAMP:${now}`,
        `DTSTART:${toICSDate(card.dueDate)}`,
        `DTEND:${toICSDate(card.dueDate)}`,
        `SUMMARY:${card.title.replace(/,/g, '\\,')}`,
        card.description ? `DESCRIPTION:${card.description.substring(0, 200).replace(/\n/g, '\\n')}` : '',
        'END:VEVENT'
      );
    }

    for (const ms of milestones) {
      ics.push(
        'BEGIN:VEVENT',
        `UID:milestone-${ms.id}@frankloo`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${new Date(ms.dueDate).toISOString().split('T')[0].replace(/-/g, '')}`,
        `SUMMARY:[Milestone] ${ms.title.replace(/,/g, '\\,')}`,
        'END:VEVENT'
      );
    }

    ics.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="frankloo.ics"');
    res.send(ics.filter(Boolean).join('\r\n'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
