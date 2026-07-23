import express, { Router } from 'express';
import PostalMime from 'postal-mime';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { notifyBoardUpdate } from '../socket.js';
import { parseEmailBody } from '../utils/emailParser.js';
import { parseEmailIntelligently, getDiceSimilarity, parseSender } from '../utils/emailParserService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// POST parse email body intelligently
router.post('/parse-email', async (req, res) => {
  try {
    const { title, text, html } = req.body;
    const parsed = parseEmailIntelligently(title || '', text || '', html || '');
    res.json(parsed);
  } catch (error) {
    console.error('Parse email endpoint error:', error);
    res.status(500).json({ error: 'Failed to parse email' });
  }
});

// POST check for duplicate tasks
router.post('/check-duplicates', authenticate, async (req, res) => {
  try {
    const { boardId, title, messageId, threadId } = req.body;
    if (!boardId) {
      return res.status(400).json({ error: 'Missing boardId' });
    }

    const duplicates = [];

    // 1. Check messageId and threadId first
    if (messageId || threadId) {
      const emailMatches = await prisma.card.findMany({
        where: {
          list: { boardId },
          isArchived: false,
          emailDetails: {
            OR: [
              ...(messageId ? [{ messageId }] : []),
              ...(threadId ? [{ threadId }] : [])
            ]
          }
        },
        include: {
          list: { select: { name: true } },
          emailDetails: true
        }
      });

      for (const card of emailMatches) {
        duplicates.push({
          id: card.id,
          title: card.title,
          listName: card.list.name,
          similarity: 100,
          reason: card.emailDetails?.messageId === messageId ? 'Message-ID Match' : 'Thread-ID Match'
        });
      }
    }

    // 2. Perform text similarity checks if title is provided
    if (title) {
      const cards = await prisma.card.findMany({
        where: {
          list: { boardId },
          isArchived: false
        },
        include: {
          list: { select: { name: true } }
        }
      });

      for (const card of cards) {
        if (duplicates.some(d => d.id === card.id)) continue;
        const similarity = getDiceSimilarity(title, card.title);
        if (similarity >= 60) {
          duplicates.push({
            id: card.id,
            title: card.title,
            listName: card.list.name,
            similarity,
            reason: 'Title Similarity'
          });
        }
      }
    }

    duplicates.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    res.json({
      hasDuplicates: duplicates.length > 0,
      duplicates
    });
  } catch (error) {
    console.error('Check duplicates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST merge email data into an existing card
router.post('/merge-card', authenticate, async (req, res) => {
  try {
    const { cardId, inboxItemId, description, checklist, labels } = req.body;
    if (!cardId || !inboxItemId) {
      return res.status(400).json({ error: 'Missing cardId or inboxItemId' });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true }
    });
    if (!card) return res.status(404).json({ error: 'Target card not found' });

    let updatedDesc = card.description || '';
    if (description) {
      updatedDesc += (updatedDesc ? '\n\n' : '') + `--- Merged from Email ---\n${description}`;
    }

    let currentCustomFields = { labels: [], emoji: '' };
    if (card.customFields) {
      try {
        currentCustomFields = JSON.parse(card.customFields);
      } catch (e) {}
    }
    if (!currentCustomFields.labels) currentCustomFields.labels = [];

    if (labels && Array.isArray(labels)) {
      labels.forEach(lbl => {
        if (!currentCustomFields.labels.some(l => l.name.toLowerCase() === lbl.toLowerCase())) {
          currentCustomFields.labels.push({ name: lbl, color: '#0969da' });
        }
      });
    }

    await prisma.card.update({
      where: { id: cardId },
      data: {
        description: updatedDesc,
        customFields: JSON.stringify(currentCustomFields)
      }
    });

    if (checklist && Array.isArray(checklist)) {
      const lastChecklist = await prisma.checklistItem.findFirst({
        where: { cardId },
        orderBy: { position: 'desc' }
      });
      let basePos = lastChecklist ? lastChecklist.position + 100.0 : 0;

      for (const item of checklist) {
        await prisma.checklistItem.create({
          data: {
            cardId,
            content: item,
            position: basePos
          }
        });
        basePos += 100.0;
      }
    }

    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: 'CONVERTED' }
    });

    notifyBoardUpdate(card.list.boardId, 'CARD_UPDATE', card);
    res.json({ success: true, message: 'Card merged successfully' });
  } catch (error) {
    console.error('Merge card error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST inbound parsed email from SMTP/forward service
router.post('/incoming-email', async (req, res) => {
  try {
    const { to, from, cc, subject, text, html, attachments, threadId, messageId, receivedDate } = req.body;
    if (!to || !from || !subject) {
      return res.status(400).json({ error: 'Missing required email fields (to, from, subject)' });
    }

    const result = await processIncomingEmail({ to, from, cc, subject, text, html, attachments, threadId, messageId, receivedDate });
    res.json(result);
  } catch (error) {
    console.error('Incoming Email Parse Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process incoming email' });
  }
});

// POST inbound parsed email from Cloudflare Email Workers
router.post('/cloudflare-email', express.text({ type: 'text/plain', limit: '25mb' }), async (req, res) => {
  try {
    console.log('[CLOUDFLARE EMAIL ARRIVED]');
    console.log('Headers x-cloudflare-secret:', req.headers['x-cloudflare-secret']);
    console.log('Headers x-envelope-to:', req.headers['x-envelope-to']);
    console.log('Headers x-envelope-from:', req.headers['x-envelope-from']);

    const secret = process.env.CLOUDFLARE_SECRET;
    if (secret && req.headers['x-cloudflare-secret'] !== secret) {
      console.warn('[CLOUDFLARE SECRET MISMATCH]');
      return res.status(401).json({ error: 'Invalid Cloudflare secret' });
    }

    let to, from, cc, subject, text, html, attachments, threadId, messageId, receivedDate;

    if (typeof req.body === 'string') {
      console.log('Parsing raw MIME body from string...');
      const parser = new PostalMime();
      const parsedEmail = await parser.parse(req.body);

      to = req.headers['x-envelope-to'] || (parsedEmail.to && parsedEmail.to[0]?.address) || '';
      from = req.headers['x-envelope-from'] || parsedEmail.from?.address || '';
      cc = (parsedEmail.cc || []).map(c => c.address || c.name || '').join(', ');
      subject = parsedEmail.subject || '(No Subject)';
      text = parsedEmail.text || '';
      html = parsedEmail.html || '';
      messageId = parsedEmail.messageId || null;
      threadId = null;
      receivedDate = parsedEmail.date || new Date().toISOString();
      attachments = (parsedEmail.attachments || []).map(att => ({
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.content ? att.content.byteLength : 0,
        storagePath: 'uploads/gmail-dummy'
      }));
    } else {
      console.log('Body is JSON object...');
      ({ to, from, cc, subject, text, html, attachments, threadId, messageId, receivedDate } = req.body || {});
    }

    console.log(`Email details parsed: from=${from}, to=${to}, subject=${subject}`);

    if (!to || !from) {
      console.warn('[MISSING FIELDS] to or from was empty');
      return res.status(400).json({ error: 'Missing required email fields (to, from)' });
    }

    const result = await processIncomingEmail({
      to,
      from,
      cc,
      subject: subject || '(No Subject)',
      text: text || '',
      html: html || '',
      attachments: attachments || [],
      threadId,
      messageId,
      receivedDate
    });
    console.log('[CLOUDFLARE EMAIL PROCESSED SUCCESSFULLY]', result);
    res.json(result);
  } catch (error) {
    console.error('Cloudflare Email Route Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process Cloudflare email' });
  }
});

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

// DELETE inbox item
router.delete('/:workspaceId/:itemId', authenticate, async (req, res) => {
  try {
    const { workspaceId, itemId } = req.params;

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    await prisma.inboxItem.delete({
      where: { id: itemId, workspaceId }
    });

    res.json({ message: 'Inbox item deleted successfully' });
  } catch (error) {
    console.error('Delete inbox item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to convert a single inbox item to a card
export async function convertSingleItemInternal({
  workspaceId,
  itemId,
  boardId,
  listId,
  assigneeIds,
  labels,
  priority,
  dueDate,
  checklist,
  title,
  description,
  attachments,
  userId
}) {
  const item = await prisma.inboxItem.findUnique({
    where: { id: itemId, workspaceId }
  });

  if (!item) throw new Error('Inbox item not found');

  const detailsObj = JSON.parse(item.sourceDetails || '{}');
  const sourceDesc = item.source !== 'QUICK' 
    ? `\n\n*Source: ${item.source}*\n${detailsObj.subject || detailsObj.channel || detailsObj.repo || detailsObj.calendar || ''}\n${detailsObj.link ? `[View original link](${detailsObj.link})` : ''}`
    : '';

  // 1. Smart Auto Extraction - People Mentioned -> Suggested Members
  let finalAssigneeIds = assigneeIds || [];
  if (finalAssigneeIds.length === 0) {
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });
    const searchableText = `${title || ''} ${description || ''} ${item.title || ''} ${item.description || ''}`.toLowerCase();
    for (const member of workspaceMembers) {
      const name = (member.user.name || '').toLowerCase();
      const username = (member.user.username || '').toLowerCase();
      const emailPart = member.user.email.split('@')[0].toLowerCase();
      if (
        (name && searchableText.includes(name)) ||
        (username && searchableText.includes(username)) ||
        searchableText.includes(`@${username}`) ||
        searchableText.includes(emailPart)
      ) {
        finalAssigneeIds.push(member.userId);
      }
    }
    finalAssigneeIds = [...new Set(finalAssigneeIds)];
  }

  // 2. Smart Auto Extraction - Links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const textToScan = `${description || ''} ${item.description || ''} ${detailsObj.text || ''}`;
  const extractedUrls = [...new Set(textToScan.match(urlRegex) || [])];
  const extractedLinks = extractedUrls.map(url => {
    try {
      return { url, title: new URL(url).hostname };
    } catch (e) {
      return { url, title: 'Link' };
    }
  });

  const customFieldsData = {
    labels: labels || [],
    emoji: '',
    links: extractedLinks
  };

  // Create the Card
  const card = await prisma.card.create({
    data: {
      title: title || item.title,
      description: (description !== undefined ? description : (item.description || '')) + sourceDesc,
      position: 1000.0,
      priority: priority || item.priority || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : (item.dueDate ? new Date(item.dueDate) : null),
      listId,
      customFields: JSON.stringify(customFieldsData)
    },
    include: {
      assignees: true,
      checklists: true,
      dependencies: true
    }
  });

  // Create CardEmailDetails if GMAIL or EMAIL source
  if (item.source === 'GMAIL' || item.source === 'EMAIL') {
    const metadataJson = JSON.stringify({
      cc: detailsObj.cc || '',
      bcc: detailsObj.bcc || '',
      recipients: detailsObj.recipients || '',
      replyLink: detailsObj.link || null
    });
    await prisma.cardEmailDetails.create({
      data: {
        cardId: card.id,
        sender: detailsObj.sender || 'Unknown Sender',
        subject: detailsObj.subject || item.title,
        messageId: detailsObj.messageId || null,
        threadId: detailsObj.threadId || null,
        bodyHtml: detailsObj.html || item.description,
        bodyText: detailsObj.text || item.description,
        replyLink: metadataJson,
        hasAttachments: detailsObj.attachments && detailsObj.attachments.length > 0
      }
    });
  }

  // Handle assignees
  if (finalAssigneeIds.length > 0) {
    for (const memberId of finalAssigneeIds) {
      await prisma.cardAssignee.create({
        data: {
          cardId: card.id,
          userId: memberId
        }
      });
    }
  }

  // Handle attachments if present
  const finalAttachments = attachments || detailsObj.attachments || [];
  if (finalAttachments.length > 0) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const att of finalAttachments) {
      let storagePath = att.storagePath || 'uploads/gmail-dummy';
      if (att.base64Data) {
        try {
          const buffer = Buffer.from(att.base64Data, 'base64');
          const uniqueFilename = `${Date.now()}-${att.filename}`;
          fs.writeFileSync(path.join(uploadDir, uniqueFilename), buffer);
          storagePath = `uploads/${uniqueFilename}`;
        } catch (err) {
          console.error('Error saving base64 attachment:', err);
        }
      }
      await prisma.cardAttachment.create({
        data: {
          cardId: card.id,
          uploadedBy: userId,
          filename: att.filename,
          storagePath,
          mimeType: att.mimeType || 'application/octet-stream',
          size: att.size || 0
        }
      });
    }
  }

  // Handle checklists (passed from request, or parsed from email body)
  const checklistsToCreate = [];
  if (checklist && Array.isArray(checklist)) {
    checklistsToCreate.push(...checklist.filter(Boolean));
  } else if (detailsObj.checklists && Array.isArray(detailsObj.checklists)) {
    checklistsToCreate.push(...detailsObj.checklists.filter(Boolean));
  }

  if (checklistsToCreate.length > 0) {
    for (let idx = 0; idx < checklistsToCreate.length; idx++) {
      await prisma.checklistItem.create({
        data: {
          cardId: card.id,
          content: checklistsToCreate[idx],
          position: idx * 100.0
        }
      });
    }
  }

  // Update status of InboxItem to CONVERTED
  const updatedItem = await prisma.inboxItem.update({
    where: { id: itemId },
    data: { status: 'CONVERTED' }
  });

  // Create activity log
  await prisma.activityLog.create({
    data: {
      userId,
      boardId,
      cardId: card.id,
      action: 'CREATE_CARD',
      details: `Converted inbox item to card: "${card.title}"`
    }
  });

  // Notify updates via Socket
  notifyBoardUpdate(boardId, 'CARD_CREATE', card);

  // Fetch full card with assignees and checklists for client response
  const fullCard = await prisma.card.findUnique({
    where: { id: card.id },
    include: {
      assignees: { include: { user: { select: { id: true, username: true, name: true, avatarUrl: true } } } },
      checklists: true,
      dependencies: { include: { dependsOnCard: { select: { id: true, title: true } } } },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, name: true, avatarUrl: true } } }
      },
      emailDetails: true
    }
  });

  return { card: fullCard, inboxItem: updatedItem };
}

// POST convert inbox item to card
router.post('/:workspaceId/:itemId/convert', authenticate, async (req, res) => {
  try {
    const { workspaceId, itemId } = req.params;
    const { boardId, listId, assigneeIds, labels, priority, dueDate, checklist, title, description, attachments } = req.body;

    if (!boardId || !listId) return res.status(400).json({ error: 'Board ID and List ID are required' });

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const result = await convertSingleItemInternal({
      workspaceId,
      itemId,
      boardId,
      listId,
      assigneeIds,
      labels,
      priority,
      dueDate,
      checklist,
      title,
      description,
      attachments,
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    console.error('Convert inbox item error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// POST undo conversion of inbox item to card
router.post('/:workspaceId/:itemId/undo-convert', authenticate, async (req, res) => {
  try {
    const { workspaceId, itemId } = req.params;
    const { cardId } = req.body;

    if (!cardId) return res.status(400).json({ error: 'Card ID is required to undo conversion' });

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    // Find the card to get its board ID
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true }
    });

    if (card) {
      // Delete the Card
      await prisma.card.delete({
        where: { id: cardId }
      });
      // Notify board updates
      notifyBoardUpdate(card.list.boardId, 'CARD_DELETE', { id: cardId });
    }

    // Set InboxItem status back to NEW
    const updatedItem = await prisma.inboxItem.update({
      where: { id: itemId, workspaceId },
      data: { status: 'NEW' }
    });

    // Create activity log
    if (card) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          boardId: card.list.boardId,
          action: 'DELETE_CARD',
          details: `Reverted conversion of email to card: "${card.title}" (Undo)`
        }
      });
    }

    res.json({ success: true, inboxItem: updatedItem });
  } catch (error) {
    console.error('Undo convert error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// POST batch convert inbox items
router.post('/:workspaceId/batch/convert', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { itemIds, boardId, listId, priority, dueDate, assigneeIds, labels } = req.body;

    if (!boardId || !listId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const cards = [];
    const inboxItems = [];

    for (const itemId of itemIds) {
      try {
        const result = await convertSingleItemInternal({
          workspaceId,
          itemId,
          boardId,
          listId,
          assigneeIds,
          labels,
          priority,
          dueDate,
          checklist: undefined, // default checklist from email
          title: undefined,
          description: undefined,
          userId: req.user.id
        });
        cards.push(result.card);
        inboxItems.push(result.inboxItem);
      } catch (err) {
        console.error(`Failed to convert batch item ${itemId}:`, err);
      }
    }

    res.json({ cards, inboxItems });
  } catch (error) {
    console.error('Batch convert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST batch archive inbox items
router.post('/:workspaceId/batch/archive', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Missing itemIds' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    await prisma.inboxItem.updateMany({
      where: { id: { in: itemIds }, workspaceId },
      data: { status: 'ARCHIVED' }
    });

    const updatedItems = await prisma.inboxItem.findMany({
      where: { id: { in: itemIds }, workspaceId }
    });

    res.json(updatedItems);
  } catch (error) {
    console.error('Batch archive error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST batch delete inbox items
router.post('/:workspaceId/batch/delete', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Missing itemIds' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    await prisma.inboxItem.deleteMany({
      where: { id: { in: itemIds }, workspaceId }
    });

    res.json({ success: true, deletedIds: itemIds });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST batch update status (e.g. read/unread)
router.post('/:workspaceId/batch/status', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { itemIds, status } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || !status) {
      return res.status(400).json({ error: 'Missing itemIds or status' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    await prisma.inboxItem.updateMany({
      where: { id: { in: itemIds }, workspaceId },
      data: { status }
    });

    const updatedItems = await prisma.inboxItem.findMany({
      where: { id: { in: itemIds }, workspaceId }
    });

    res.json(updatedItems);
  } catch (error) {
    console.error('Batch status update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST batch assign labels
router.post('/:workspaceId/batch/labels', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { itemIds, labels } = req.body; // labels is comma-separated string or array of label names

    if (!itemIds || !Array.isArray(itemIds) || !labels) {
      return res.status(400).json({ error: 'Missing itemIds or labels' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const parsedLabels = Array.isArray(labels)
      ? labels
      : labels.split(',').map(l => l.trim()).filter(Boolean);

    // Get current inbox items to update their sourceDetails / priority / tags if applicable
    // But since labels inside InboxItem are not a direct DB column (they are created when converted),
    // we can update their sourceDetails to store these labels so that they carry over on conversion!
    const items = await prisma.inboxItem.findMany({
      where: { id: { in: itemIds }, workspaceId }
    });

    const updatedItems = [];
    for (const item of items) {
      const details = JSON.parse(item.sourceDetails || '{}');
      details.labels = parsedLabels.map(name => ({ name, color: '#36b37e' }));

      const updated = await prisma.inboxItem.update({
        where: { id: item.id },
        data: {
          sourceDetails: JSON.stringify(details)
        }
      });
      updatedItems.push(updated);
    }

    res.json(updatedItems);
  } catch (error) {
    console.error('Batch labels assignment error:', error);
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

// Helper function to process all incoming emails (from SMTP webhook or test simulator)
export async function processIncomingEmail({ to, from, cc, subject, text, html, attachments, threadId, messageId, receivedDate }) {
  const cleanTo = to.match(/<([^>]+)>/)?.[1] || to.trim();
  console.log(`[PROCESS INCOMING EMAIL] cleanTo = ${cleanTo}`);
  const prefix = cleanTo.split('@')[0] || '';
  const board = await prisma.board.findFirst({
    where: {
      OR: [
        { incomingEmailAddress: cleanTo },
        ...(prefix.length >= 8 ? [{ id: { startsWith: prefix } }] : [])
      ]
    },
    include: { workspace: true }
  });

  if (!board) {
    console.warn(`[PROCESS INCOMING EMAIL] Board not found for address: "${cleanTo}"`);
    throw new Error('Board not found for this email address');
  }

  console.log(`[PROCESS INCOMING EMAIL] Found board: "${board.name}" (id: ${board.id})`);

  if (!board.incomingEmailEnabled) {
    console.warn(`[PROCESS INCOMING EMAIL] Incoming email is disabled for board: "${board.name}"`);
    throw new Error('Incoming email is disabled for this board');
  }

  const cleanFrom = from.match(/<([^>]+)>/)?.[1] || from.trim();

  // 1. Rate Limiting check (max 60/hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyCount = await prisma.emailLog.count({
    where: { boardId: board.id, createdAt: { gte: oneHourAgo } }
  });
  if (hourlyCount >= 60) {
    await prisma.emailLog.create({
      data: {
        boardId: board.id,
        sender: from,
        subject: subject,
        status: 'RATE_LIMITED',
        details: 'Hourly email limit reached (60/hour).'
      }
    });
    throw new Error('Rate limit exceeded (60/hour)');
  }

  // 2. Sender validation check
  if (board.incomingEmailAllowedSenders && board.incomingEmailAllowedSenders !== 'ANY') {
    const allowedDomains = board.incomingEmailAllowedSenders.split(',').map(d => d.trim().toLowerCase());
    const senderDomain = cleanFrom.split('@')[1] || '';
    const isAllowed = allowedDomains.some(domain => 
      cleanFrom.toLowerCase() === domain || 
      senderDomain === domain || 
      (domain.startsWith('.') && senderDomain.endsWith(domain))
    );

    if (!isAllowed) {
      await prisma.emailLog.create({
        data: {
          boardId: board.id,
          sender: from,
          subject: subject,
          status: 'SENDER_BLOCKED',
          details: `Sender domain/address "${cleanFrom}" is not in the allowed list: "${board.incomingEmailAllowedSenders}".`
        }
      });
      throw new Error('Sender not authorized');
    }
  }

  // 3. Spam filtering check
  let isSpam = false;
  let spamTrigger = '';
  if (board.incomingEmailSpamFilter) {
    const spamKeywords = ['viagra', 'buy now', 'credit check', 'lottery winner', 'casino', 'free money', 'millions of dollars', '[spam]'];
    const cleanSubject = (subject || '').toLowerCase();
    const cleanBody = (text || html || '').toLowerCase();
    for (const kw of spamKeywords) {
      if (cleanSubject.includes(kw) || cleanBody.includes(kw)) {
        isSpam = true;
        spamTrigger = kw;
        break;
      }
    }
  }
  if (isSpam) {
    await prisma.emailLog.create({
      data: {
        boardId: board.id,
        sender: from,
        subject: subject,
        status: 'SPAM',
        details: `Flagged as spam by keyword match: "${spamTrigger}"`
      }
    });
    throw new Error('Email flagged as spam');
  }

  // 4. Attachment size limit check
  if (attachments && attachments.length > 0) {
    const totalBytes = attachments.reduce((sum, att) => sum + (att.size || 0), 0);
    const limitBytes = (board.incomingEmailAttachmentLimit || 10) * 1024 * 1024;
    if (totalBytes > limitBytes) {
      await prisma.emailLog.create({
        data: {
          boardId: board.id,
          sender: from,
          subject: subject,
          status: 'SIZE_EXCEEDED',
          details: `Total attachment size (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) exceeded the limit of ${board.incomingEmailAttachmentLimit} MB.`
        }
      });
      throw new Error('Attachment size limit exceeded');
    }
  }

  // 5. Threading replies check
  if (threadId) {
    const existingThreadCard = await prisma.card.findFirst({
      where: {
        list: { boardId: board.id },
        emailDetails: { threadId }
      }
    });

    if (existingThreadCard) {
      const threadAction = board.incomingEmailThreadAction || 'COMMENT';
      const ownerMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: board.workspaceId, role: 'OWNER' }
      });
      const userId = ownerMember?.userId || 'system';

      if (threadAction === 'COMMENT') {
        await prisma.comment.create({
          data: {
            cardId: existingThreadCard.id,
            userId,
            content: `[Reply from Email: ${from}]\n\n${text || 'Empty message body'}`
          }
        });
        notifyBoardUpdate(board.id, 'COMMENT_CREATE', { cardId: existingThreadCard.id });
      } else {
        await prisma.activityLog.create({
          data: {
            userId,
            boardId: board.id,
            cardId: existingThreadCard.id,
            action: 'THREAD_REPLY',
            details: `Threaded reply email from ${from}: "${subject}"`
          }
        });
      }

      await prisma.emailLog.create({
        data: {
          boardId: board.id,
          sender: from,
          subject: subject,
          status: 'SUCCESS',
          details: `Appended as threaded reply to Card "${existingThreadCard.title}" (ID: ${existingThreadCard.id}) via ${threadAction}.`
        }
      });

      return { success: true, action: 'THREAD_REPLY', cardId: existingThreadCard.id };
    }
  }

  const parsed = parseEmailIntelligently(subject, text || '', html || '');
  const senderInfo = parseSender(from);

  // 6. Automation Rules auto-routing matching logic
  let autoRouteMatch = false;
  let autoTargetListId = null;
  if (board.incomingEmailAutomationEnabled) {
    const rules = await prisma.gmailAutoRule.findMany({
      where: { targetBoardId: board.id }
    });
    if (rules.length > 0) {
      for (const rule of rules) {
        if (rule.triggerType === 'SENDER' && cleanFrom.toLowerCase().includes(rule.triggerVal.toLowerCase())) {
          autoRouteMatch = true;
          autoTargetListId = rule.targetListId;
          break;
        }
        if (rule.triggerType === 'KEYWORD' && (subject || '').toLowerCase().includes(rule.triggerVal.toLowerCase())) {
          autoRouteMatch = true;
          autoTargetListId = rule.targetListId;
          break;
        }
      }
    } else {
      // Automatically convert every email to a card if auto conversion toggle is enabled and no explicit match rules exist
      autoRouteMatch = true;
    }
  }

  if (autoRouteMatch) {
    // Automatically convert to card
    let listId = autoTargetListId || board.incomingEmailListId;
    if (!listId) {
      const firstList = await prisma.list.findFirst({
        where: { boardId: board.id },
        orderBy: { position: 'asc' }
      });
      listId = firstList?.id;
    }
    if (!listId) {
      const defaultList = await prisma.list.create({
        data: { name: 'Inbox', position: 1000.0, boardId: board.id }
      });
      listId = defaultList.id;
    }

    const defaultLabels = [];
    if (board.incomingEmailDefaultLabelIds) {
      const labelNames = board.incomingEmailDefaultLabelIds.split(',').map(l => l.trim());
      for (const name of labelNames) {
        if (name) {
          defaultLabels.push({ name, color: '#36b37e' });
        }
      }
    }

    // Add parsed auto labels
    if (parsed.labels && parsed.labels.length > 0) {
      for (const name of parsed.labels) {
        if (!defaultLabels.some(l => l.name.toLowerCase() === name.toLowerCase())) {
          defaultLabels.push({ name, color: '#0969da' });
        }
      }
    }

    // Extract inline base64 images from HTML content
    const inlineAttachments = [];
    const isHtml = (str) => /<html|<doctype|<head|<body|<style/i.test(str || '');
    const htmlToParse = html || (isHtml(text) ? text : '');
    if (htmlToParse) {
      const base64ImageRegex = /<img[^>]+src=["']data:image\/([a-zA-Z]*);base64,([^"']+)["'][^>]*>/g;
      let match;
      let imgIndex = 1;
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const uploadDir = path.join(__dirname, '../../../uploads');
      
      while ((match = base64ImageRegex.exec(htmlToParse)) !== null) {
        const extension = match[1] || 'png';
        const base64Data = match[2];
        const filename = `inline_image_${imgIndex++}.${extension}`;
        const uniqueName = `${Date.now()}-${filename}`;
        
        try {
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filePath = path.join(uploadDir, uniqueName);
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          inlineAttachments.push({
            filename,
            mimeType: `image/${extension}`,
            size: Math.round(base64Data.length * 0.75),
            storagePath: `uploads/${uniqueName}`
          });
        } catch (err) {
          console.error('Error saving inline base64 image:', err);
        }
      }
    }

    const allAttachments = [...(attachments || []), ...inlineAttachments];

    const card = await prisma.card.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        position: 1000.0,
        priority: parsed.priority || board.incomingEmailDefaultPriority || 'MEDIUM',
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        listId,
        customFields: JSON.stringify({ labels: defaultLabels, emoji: '' })
      }
    });

    const metadataJson = JSON.stringify({
      cc: cc || '',
      bcc: bcc || '',
      recipients: to || '',
      replyLink: null
    });
    await prisma.cardEmailDetails.create({
      data: {
        cardId: card.id,
        sender: from,
        subject: subject,
        receivedTime: receivedDate ? new Date(receivedDate) : new Date(),
        messageId: messageId || null,
        threadId: threadId || null,
        bodyHtml: html || text || '',
        bodyText: parsed.description,
        replyLink: metadataJson,
        hasAttachments: allAttachments.length > 0
      }
    });

    // Auto assignees
    if (board.incomingEmailAutoAssigneeIds) {
      const assigneeIds = board.incomingEmailAutoAssigneeIds.split(',').map(id => id.trim());
      for (const uid of assigneeIds) {
        if (uid) {
          await prisma.cardAssignee.create({
            data: { cardId: card.id, userId: uid }
          });
        }
      }
    }

    // Attachments
    if (allAttachments.length > 0) {
      const ownerMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: board.workspaceId, role: 'OWNER' }
      });
      const uploaderId = ownerMember?.userId || 'system';

      for (const att of allAttachments) {
        await prisma.cardAttachment.create({
          data: {
            cardId: card.id,
            uploadedBy: uploaderId,
            filename: att.filename,
            storagePath: att.storagePath || 'uploads/gmail-dummy',
            mimeType: att.mimeType || 'application/octet-stream',
            size: att.size || 0
          }
        });
      }
    }

    // Checklists
    if (parsed.checklist && parsed.checklist.length > 0) {
      for (let idx = 0; idx < parsed.checklist.length; idx++) {
        await prisma.checklistItem.create({
          data: {
            cardId: card.id,
            content: parsed.checklist[idx],
            position: idx * 100.0
          }
        });
      }
    }

    await prisma.emailLog.create({
      data: {
        boardId: board.id,
        sender: from,
        subject: subject,
        status: 'SUCCESS',
        details: `Automatically converted to Card "${card.title}" (ID: ${card.id}) matching automation rules.`
      }
    });

    notifyBoardUpdate(board.id, 'CARD_CREATE', card);
    return { success: true, action: 'AUTO_CONVERT', cardId: card.id };
  }

  // Create workspace InboxItem
  const detailsJson = {
    sender: from,
    senderName: senderInfo.name,
    senderEmail: senderInfo.email,
    subject: subject,
    recipients: to,
    cc: cc || '',
    receivedDate: receivedDate || new Date().toISOString(),
    text: text || '',
    html: html || '',
    attachments: attachments || [],
    threadId: threadId || null,
    messageId: messageId || null,
    checklists: parsed.checklist || [],
    labels: parsed.labels || []
  };

  const item = await prisma.inboxItem.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      source: 'EMAIL',
      sourceDetails: JSON.stringify(detailsJson),
      status: 'NEW',
      priority: parsed.priority || board.incomingEmailDefaultPriority || 'MEDIUM',
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      workspaceId: board.workspaceId,
      boardId: board.id
    }
  });

  await prisma.emailLog.create({
    data: {
      boardId: board.id,
      sender: from,
      subject: subject,
      status: 'SUCCESS',
      details: `Delivered to Board Inbox as InboxItem (ID: ${item.id}).`
    }
  });

  return { success: true, action: 'INBOX_DELIVERED', itemId: item.id };
}



// GET email logs for a board
router.get('/:workspaceId/logs/:boardId', authenticate, async (req, res) => {
  try {
    const { workspaceId, boardId } = req.params;
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const logs = await prisma.emailLog.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch email logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST simulated test email to a board
router.post('/:workspaceId/test-email/:boardId', authenticate, async (req, res) => {
  try {
    const { workspaceId, boardId } = req.params;
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const board = await prisma.board.findUnique({
      where: { id: boardId }
    });
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const testPayload = {
      to: board.incomingEmailAddress || `${board.id.substring(0, 8)}@boards.frankloo.app`,
      from: `Test Client <client@company.com>`,
      subject: `Simulated Email-to-Board Task: Homepage Redesign Request`,
      text: `Hi Team,\n\nWe need to refresh the homepage styling. Please make sure the layout is responsive.\n\n- [ ] Design high-fidelity wireframes\n- [ ] Code React Tailwind templates\n- [ ] Review performance metrics\n\nBest,\nTest Sender`,
      html: `<p>Hi Team,</p><p>We need to refresh the homepage styling. Please make sure the layout is responsive.</p><ul><li>[ ] Design high-fidelity wireframes</li><li>[ ] Code React Tailwind templates</li><li>[ ] Review performance metrics</li></ul><p>Best,<br>Test Sender</p>`,
      attachments: [
        {
          filename: 'mockup_screenshot.png',
          storagePath: 'uploads/gmail-dummy',
          mimeType: 'image/png',
          size: 142000
        }
      ]
    };

    const result = await processIncomingEmail(testPayload);
    res.json(result);
  } catch (error) {
    console.error('Simulate test email error:', error);
    res.status(500).json({ error: error.message || 'Failed to simulate test email' });
  }
});

export default router;
