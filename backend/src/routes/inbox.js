import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { notifyBoardUpdate } from '../socket.js';

const router = Router();

// GET all inbox items for a workspace
router.get('/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    // Verify membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const items = await prisma.inboxItem.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST quick capture inbox item
router.post('/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, description, priority, dueDate, source, sourceDetails } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const item = await prisma.inboxItem.create({
      data: {
        title,
        description: description || '',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        source: source || 'QUICK',
        sourceDetails: sourceDetails ? (typeof sourceDetails === 'string' ? sourceDetails : JSON.stringify(sourceDetails)) : '{}',
        status: 'NEW',
        workspaceId
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create inbox item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update inbox item
router.put('/:workspaceId/:itemId', authenticate, async (req, res) => {
  try {
    const { workspaceId, itemId } = req.params;
    const { title, description, status, priority, dueDate } = req.body;

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.inboxItem.update({
      where: { id: itemId, workspaceId },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update inbox item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST convert inbox item to card
router.post('/:workspaceId/:itemId/convert', authenticate, async (req, res) => {
  try {
    const { workspaceId, itemId } = req.params;
    const { boardId, listId } = req.body;

    if (!boardId || !listId) return res.status(400).json({ error: 'Board ID and List ID are required' });

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const item = await prisma.inboxItem.findUnique({
      where: { id: itemId, workspaceId }
    });

    if (!item) return res.status(404).json({ error: 'Inbox item not found' });

    // 1. Create the Card
    const detailsObj = JSON.parse(item.sourceDetails || '{}');
    const sourceDesc = item.source !== 'QUICK' 
      ? `\n\n*Source: ${item.source}*\n${detailsObj.subject || detailsObj.channel || detailsObj.repo || detailsObj.calendar || ''}\n${detailsObj.link ? `[View original link](${detailsObj.link})` : ''}`
      : '';

    const card = await prisma.card.create({
      data: {
        title: item.title,
        description: (item.description || '') + sourceDesc,
        position: 1000.0,
        priority: item.priority,
        dueDate: item.dueDate,
        listId
      },
      include: {
        assignees: true,
        checklists: true,
        dependencies: true
      }
    });

    // 1b. Handle attachments if present
    if (detailsObj.attachments && detailsObj.attachments.length > 0) {
      for (const att of detailsObj.attachments) {
        await prisma.cardAttachment.create({
          data: {
            cardId: card.id,
            uploadedBy: req.user.id,
            filename: att.filename,
            storagePath: att.storagePath || 'uploads/gmail-dummy',
            mimeType: att.mimeType || 'application/octet-stream',
            size: att.size || 0
          }
        });
      }
    }

    // 2. Update status of InboxItem to CONVERTED
    const updatedItem = await prisma.inboxItem.update({
      where: { id: itemId },
      data: { status: 'CONVERTED' }
    });

    // Notify updates
    notifyBoardUpdate(boardId, 'CARD_CREATE', card);

    res.json({ card, inboxItem: updatedItem });
  } catch (error) {
    console.error('Convert inbox item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST mock incoming items
router.post('/:workspaceId/mock-incoming', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const mocks = [
      {
        title: "Re: Security Alert: New login detected",
        description: "A new sign-in was detected on your Google Account from a Windows machine in London, UK.",
        source: "GMAIL",
        sourceDetails: JSON.stringify({ sender: "Google Security <security@google.com>", subject: "Security Alert", link: "https://gmail.com" }),
        priority: "URGENT",
        dueDate: new Date(Date.now() + 3600000 * 2)
      },
      {
        title: "Review deployment error in #prod-alerts",
        description: "Error: DB connection timeout. Server crashed 3 times. Urgent investigation needed.",
        source: "SLACK",
        sourceDetails: JSON.stringify({ channel: "#prod-alerts", sender: "Slackbot", link: "https://slack.com" }),
        priority: "HIGH",
        dueDate: new Date(Date.now() + 3600000 * 4)
      },
      {
        title: "Discord bot notification: community feedback",
        description: "User @cyber_ninja reported a layout bug on the workspace dashboards mobile view.",
        source: "DISCORD",
        sourceDetails: JSON.stringify({ guild: "Frankloo Community", channel: "#bugs", link: "https://discord.gg" }),
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 3600000 * 24)
      },
      {
        title: "GitHub Issue #119: Add support for SQLite DB backups",
        description: "Feature request opened by @octocat. Need automated backups for SQLite databases.",
        source: "GITHUB",
        sourceDetails: JSON.stringify({ repo: "frankloo/backend", sender: "@octocat", link: "https://github.com/frankloo/backend/issues/119" }),
        priority: "LOW",
        dueDate: new Date(Date.now() + 3600000 * 48)
      },
      {
        title: "Calendar: Workspace Design Sync",
        description: "Weekly sync meeting with the product design and engineering leads.",
        source: "CALENDAR",
        sourceDetails: JSON.stringify({ calendar: "Work", location: "Google Meet", link: "https://calendar.google.com" }),
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 3600000 * 1.5)
      }
    ];

    const created = [];
    for (const mock of mocks) {
      const item = await prisma.inboxItem.create({
        data: {
          ...mock,
          status: 'NEW',
          workspaceId
        }
      });
      created.push(item);
    }

    res.json(created);
  } catch (error) {
    console.error('Mock incoming inbox items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
