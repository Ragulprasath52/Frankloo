import { Router } from 'express';
import { google } from 'googleapis';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { 
  getOAuthClient, 
  getOAuthConfig, 
  fetchRecentEmails, 
  sendEmail 
} from '../utils/gmailService.js';
import { parseEmailIntelligently, parseSender } from '../utils/emailParserService.js';
import { notifyBoardUpdate } from '../socket.js';

const router = Router();

// GET Connection info & settings
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        googleEmail: true,
        gmailSandboxMode: true,
        dailySummaryEnabled: true,
        upcomingDeadlinesEnabled: true,
        overdueAlertsEnabled: true,
        googleToken: true
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      googleEmail: user.googleEmail,
      gmailSandboxMode: false,
      dailySummaryEnabled: user.dailySummaryEnabled,
      upcomingDeadlinesEnabled: user.upcomingDeadlinesEnabled,
      overdueAlertsEnabled: user.overdueAlertsEnabled,
      hasToken: user.googleToken !== null
    });
  } catch (error) {
    console.error('Fetch Gmail profile error:', error);
    res.status(500).json({ error: 'Server error fetching Gmail profile' });
  }
});

// POST Update Gmail Settings
router.post('/settings', authenticate, async (req, res) => {
  try {
    const { dailySummaryEnabled, upcomingDeadlinesEnabled, overdueAlertsEnabled } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        gmailSandboxMode: false,
        dailySummaryEnabled: dailySummaryEnabled !== undefined ? dailySummaryEnabled : undefined,
        upcomingDeadlinesEnabled: upcomingDeadlinesEnabled !== undefined ? upcomingDeadlinesEnabled : undefined,
        overdueAlertsEnabled: overdueAlertsEnabled !== undefined ? overdueAlertsEnabled : undefined
      },
      select: {
        googleEmail: true,
        dailySummaryEnabled: true,
        upcomingDeadlinesEnabled: true,
        overdueAlertsEnabled: true
      }
    });
    res.json({
      ...updated,
      gmailSandboxMode: false
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating Gmail settings' });
  }
});

// GET OAuth URL
router.get('/auth-url', authenticate, async (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    if (!oauth2Client) {
      return res.status(400).json({ 
        error: 'Google OAuth client is not configured on the server. Please set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET environment variables.' 
      });
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://mail.google.com/'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: req.user.id
    });

    res.json({ url, isSandbox: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Auth URL' });
  }
});

// GET OAuth Callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send('OAuth code is missing');
    }

    // Identify the user by checking the state parameter, falling back to the first user
    let user = null;
    if (state) {
      user = await prisma.user.findUnique({ where: { id: state } });
    }
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      return res.status(404).send('No user found to associate with Gmail');
    }

    if (code === 'sandbox_mock_code') {
      // Complete mock connection
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleEmail: 'sandbox-user@gmail.com',
          googleId: 'sandbox-google-id-12345',
          googleToken: JSON.stringify({ access_token: 'sandbox-access-token', refresh_token: 'sandbox-refresh-token' }),
          gmailSandboxMode: true
        }
      });

      await prisma.gmailActivity.create({
        data: {
          userId: user.id,
          type: 'SYNC',
          details: 'Connected Gmail Account in Sandbox Mode'
        }
      });

      return res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f4f5f7;">
            <div style="background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
              <h2 style="color: #2e7d32;">Gmail Sandbox Connected!</h2>
              <p>You have successfully authorized the sandbox account <strong>sandbox-user@gmail.com</strong>.</p>
              <button onclick="window.close()" style="background: #0052cc; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 15px;">Close window</button>
            </div>
          </body>
        </html>
      `);
    }

    // Real OAuth Exchange
    const oauth2Client = getOAuthClient();
    if (!oauth2Client) {
      return res.status(400).send('Google OAuth client is not configured.');
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Check if another Trel user has already connected this Google account
    const existingConnection = await prisma.user.findFirst({
      where: {
        googleId: userInfo.data.id,
        NOT: { id: user.id }
      }
    });

    if (existingConnection) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f4f5f7;">
            <div style="background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 450px;">
              <h2 style="color: #de350b; margin-top: 0;">Connection Failed</h2>
              <p>The Google account <strong>${userInfo.data.email}</strong> is already connected to another Trel user account.</p>
              <p style="color: #6b778c; font-size: 13px; line-height: 1.5;">Each Google account can only be linked to one Trel user account at a time. Please disconnect it from the other account first or use a different Google account.</p>
              <button onclick="window.close()" style="background: #0052cc; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 15px;">Close window</button>
            </div>
          </body>
        </html>
      `);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleEmail: userInfo.data.email,
        googleId: userInfo.data.id,
        googleToken: JSON.stringify(tokens)
      }
    });

    await prisma.gmailActivity.create({
      data: {
        userId: user.id,
        type: 'SYNC',
        details: `Connected Gmail Account: ${userInfo.data.email}`
      }
    });

    return res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f4f5f7;">
          <div style="background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
            <h2 style="color: #0052cc;">Gmail Connected Successfully!</h2>
            <p>Authorized email: <strong>${userInfo.data.email}</strong></p>
            <button onclick="window.close()" style="background: #0052cc; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 15px;">Close window</button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send(`OAuth authorization failed: ${error.message}`);
  }
});

// POST Disconnect Gmail
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        googleEmail: null,
        googleId: null,
        googleToken: null
      }
    });

    await prisma.gmailActivity.create({
      data: {
        userId: req.user.id,
        type: 'SYNC',
        details: 'Disconnected Gmail account connection'
      }
    });

    res.json({ message: 'Gmail disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

// POST Sync Recent Emails
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.googleEmail) {
      return res.status(400).json({ error: 'No connected Gmail account found' });
    }

    const rules = await prisma.gmailAutoRule.findMany({
      where: { userId: req.user.id }
    });

    const emails = await fetchRecentEmails(user, 10);
    let importedCount = 0;
    let autoCardCount = 0;
    let threadMatchCount = 0;

    for (const email of emails) {
      // Check if already processed
      const existingInbox = await prisma.inboxItem.findFirst({
        where: {
          workspaceId,
          source: 'GMAIL',
          sourceDetails: {
            contains: email.id
          }
        }
      });

      const existingCardDetails = await prisma.cardEmailDetails.findFirst({
        where: { messageId: email.id }
      });

      if (existingInbox || existingCardDetails) {
        continue;
      }

      // Check rules
      let matchedRule = null;
      for (const rule of rules) {
        if (rule.triggerType === 'SENDER') {
          if (email.sender.toLowerCase().includes(rule.triggerVal.toLowerCase())) {
            matchedRule = rule;
            break;
          }
        } else if (rule.triggerType === 'LABEL') {
          if (email.labelIds && email.labelIds.some(lbl => lbl.toLowerCase() === rule.triggerVal.toLowerCase())) {
            matchedRule = rule;
            break;
          }
        } else if (rule.triggerType === 'KEYWORD') {
          if (email.subject.toLowerCase().includes(rule.triggerVal.toLowerCase()) || 
              email.body.toLowerCase().includes(rule.triggerVal.toLowerCase())) {
            matchedRule = rule;
            break;
          }
        }
      }

      if (matchedRule) {
        // Find existing thread card
        const existingThreadCard = await prisma.card.findFirst({
          where: {
            list: { boardId: matchedRule.targetBoardId },
            emailDetails: { threadId: email.threadId }
          },
          include: { list: true }
        });

        if (existingThreadCard) {
          const board = await prisma.board.findUnique({
            where: { id: matchedRule.targetBoardId }
          });
          const threadAction = board?.incomingEmailThreadAction || 'COMMENT';

          if (threadAction === 'COMMENT') {
            await prisma.comment.create({
              data: {
                cardId: existingThreadCard.id,
                userId: req.user.id,
                content: `[Auto-sync Thread Update from ${email.sender}]\n\n${email.body.substring(0, 1000)}`
              }
            });
            notifyBoardUpdate(matchedRule.targetBoardId, 'COMMENT_CREATE', { cardId: existingThreadCard.id });
          } else {
            await prisma.activityLog.create({
              data: {
                userId: req.user.id,
                boardId: matchedRule.targetBoardId,
                cardId: existingThreadCard.id,
                action: 'THREAD_REPLY',
                details: `Received threaded email from ${email.sender}: "${email.subject}"`
              }
            });
          }
          threadMatchCount++;
        } else {
          // Create new card
          let listId = matchedRule.targetListId;
          if (!listId) {
            const firstList = await prisma.list.findFirst({
              where: { boardId: matchedRule.targetBoardId },
              orderBy: { position: 'asc' }
            });
            listId = firstList?.id;
          }

          if (!listId) {
            const defaultList = await prisma.list.create({
              data: { name: 'Inbox', position: 1000.0, boardId: matchedRule.targetBoardId }
            });
            listId = defaultList.id;
          }

          const parsed = parseEmailIntelligently(email.subject, email.text || '', email.html || '');

          const card = await prisma.card.create({
            data: {
              title: parsed.title,
              description: parsed.description,
              position: 1000.0,
              priority: parsed.priority || 'MEDIUM',
              dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
              listId
            }
          });

          await prisma.cardEmailDetails.create({
            data: {
              cardId: card.id,
              sender: email.sender,
              subject: email.subject,
              receivedTime: email.date ? new Date(email.date) : new Date(),
              messageId: email.id,
              threadId: email.threadId,
              bodyHtml: email.html || email.body || '',
              bodyText: parsed.description,
              replyLink: `https://mail.google.com/mail/u/0/#inbox/${email.threadId || email.id}`,
              hasAttachments: email.attachments && email.attachments.length > 0
            }
          });

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

          if (email.attachments && email.attachments.length > 0) {
            for (const att of email.attachments) {
              await prisma.cardAttachment.create({
                data: {
                  cardId: card.id,
                  uploadedBy: req.user.id,
                  filename: att.filename,
                  storagePath: 'uploads/gmail-dummy',
                  mimeType: att.mimeType,
                  size: att.size
                }
              });
            }
          }

          await prisma.activityLog.create({
            data: {
              userId: req.user.id,
              boardId: matchedRule.targetBoardId,
              cardId: card.id,
              action: 'CREATE_CARD',
              details: `Card automatically created from email rule match: "${email.subject}"`
            }
          });

          autoCardCount++;
          notifyBoardUpdate(matchedRule.targetBoardId, 'CARD_CREATE', card);
        }
      } else {
        const parsed = parseEmailIntelligently(email.subject, email.text || '', email.html || '');
        const senderInfo = parseSender(email.sender);
        // General sync to Inbox
        const detailsObj = {
          id: email.id,
          threadId: email.threadId,
          sender: email.sender,
          senderName: senderInfo.name,
          senderEmail: senderInfo.email,
          subject: email.subject,
          recipients: email.recipients || '',
          cc: email.cc || '',
          receivedDate: email.date || new Date().toISOString(),
          link: `https://mail.google.com/mail/u/0/#inbox/${email.threadId || email.id}`,
          attachments: email.attachments,
          text: email.text || '',
          html: email.html || '',
          checklists: parsed.checklist || [],
          labels: parsed.labels || []
        };

        await prisma.inboxItem.create({
          data: {
            title: parsed.title,
            description: parsed.description,
            source: 'GMAIL',
            sourceDetails: JSON.stringify(detailsObj),
            status: 'NEW',
            priority: parsed.priority || 'MEDIUM',
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
            workspaceId
          }
        });
        importedCount++;
      }
    }

    await prisma.gmailActivity.create({
      data: {
        userId: req.user.id,
        type: 'SYNC',
        details: `Sync summary: Fetched ${emails.length} emails. Rules auto-created ${autoCardCount} cards, updated ${threadMatchCount} threads, imported ${importedCount} items to Inbox.`
      }
    });

    res.json({ 
      message: 'Inbox sync completed', 
      syncedCount: emails.length, 
      importedCount,
      autoCardCount,
      threadMatchCount
    });
  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

// GET Gmail Activity Logs
router.get('/logs', authenticate, async (req, res) => {
  try {
    const logs = await prisma.gmailActivity.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Gmail activity logs' });
  }
});

// POST Send Test Email
router.post('/test-send', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.googleEmail) {
      return res.status(400).json({ error: 'Please connect a Gmail account first' });
    }

    await sendEmail({
      userId: user.id,
      to: user.googleEmail,
      subject: 'Frankloo Integration Test',
      text: `Hello!

This is a test notification from your Frankloo Workspace dashboard.
Your Gmail connection is working perfectly!

Enjoy your productivity workflow.
- Frankloo Team`,
      htmlText: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f4f5f7;">
          <h2 style="color: #0052cc;">Frankloo</h2>
          <p>This is a test notification from your Frankloo Workspace dashboard.</p>
          <p>Your Gmail connection is working <strong>perfectly</strong>!</p>
          <br />
          <hr />
          <span style="font-size: 11px; color: #8590a2;">Sent from self-hosted Frankloo.</span>
        </div>
      `
    });

    res.json({ message: `Test email sent successfully to ${user.googleEmail}` });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// POST Trigger Manual Reminders (Daily Summary, Deadlines, Overdue)
router.post('/trigger-reminder', authenticate, async (req, res) => {
  try {
    const { type } = req.body; // "DAILY_SUMMARY", "DEADLINES", "OVERDUE"
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.googleEmail) {
      return res.status(400).json({ error: 'Please connect a Gmail account first' });
    }

    // Query active cards assigned to user
    const assignedCards = await prisma.card.findMany({
      where: {
        assignees: {
          some: { userId: user.id }
        },
        isArchived: false,
        list: {
          name: { notIn: ['Done', 'Completed', 'Archived'] }
        }
      },
      include: {
        list: { select: { name: true } }
      }
    });

    let subject = '';
    let emailHtml = '';

    if (type === 'DAILY_SUMMARY') {
      subject = `Frankloo Daily Summary - ${new Date().toLocaleDateString()}`;
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px border #dfe1e6; border-radius: 8px;">
          <h2 style="color: #0052cc; margin-bottom: 5px;">Frankloo Daily Summary</h2>
          <p style="color: #44546f; font-size: 14px; margin-top: 0;">Here is a summary of your assigned tasks for today:</p>
          
          ${assignedCards.length === 0 ? `
            <div style="background-color: #f1f2f4; padding: 15px; border-radius: 6px; text-align: center; color: #44546f;">
              🎉 You have no pending tasks! Great job.
            </div>
          ` : `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="border-bottom: 2px solid #dfe1e6; text-align: left;">
                  <th style="padding: 8px; font-size: 13px; color: #44546f;">Task Title</th>
                  <th style="padding: 8px; font-size: 13px; color: #44546f;">Status (Column)</th>
                  <th style="padding: 8px; font-size: 13px; color: #44546f;">Priority</th>
                </tr>
              </thead>
              <tbody>
                ${assignedCards.map(c => `
                  <tr style="border-bottom: 1px solid #f1f2f4;">
                    <td style="padding: 8px; font-size: 13px; font-weight: bold; color: #172b4d;">${c.title}</td>
                    <td style="padding: 8px; font-size: 12px; color: #626f86;">${c.list?.name || 'N/A'}</td>
                    <td style="padding: 8px; font-size: 12px;"><span style="background-color: #fffae6; color: #b38600; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${c.priority}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
          
          <div style="margin-top: 25px; padding-top: 15px; border-t: 1px solid #dfe1e6; font-size: 11px; color: #8590a2; text-align: center;">
            Sent automatically by Frankloo. Manage your notification preferences in the Integration panel.
          </div>
        </div>
      `;
    } else if (type === 'DEADLINES') {
      const upcoming = assignedCards.filter(c => {
        if (!c.dueDate) return false;
        const diff = new Date(c.dueDate).getTime() - Date.now();
        return diff > 0 && diff <= 3600000 * 24 * 3; // within 3 days
      });

      subject = 'Frankloo Alert: Upcoming Deadlines';
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px border #dfe1e6; border-radius: 8px;">
          <h2 style="color: #de350b; margin-bottom: 5px;">⏰ Upcoming Task Deadlines</h2>
          <p style="color: #44546f; font-size: 14px;">The following tasks are due in the next 3 days:</p>
          
          ${upcoming.length === 0 ? `
            <p style="color: #626f86; font-size: 13px;">No tasks due in the next 3 days.</p>
          ` : `
            <div style="margin-top: 15px; space-y: 10px;">
              ${upcoming.map(c => `
                <div style="background-color: #fffae6; border-left: 4px solid #ffab00; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                  <strong style="color: #172b4d; font-size: 14px;">${c.title}</strong>
                  <div style="color: #44546f; font-size: 12px; margin-top: 4px;">
                    Due Date: <strong>${new Date(c.dueDate).toLocaleDateString()}</strong> (Priority: ${c.priority})
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } else if (type === 'OVERDUE') {
      const overdue = assignedCards.filter(c => {
        if (!c.dueDate) return false;
        return new Date(c.dueDate).getTime() < Date.now(); // past due
      });

      subject = '⚠️ Frankloo Alert: Overdue Tasks!';
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px border #dfe1e6; border-radius: 8px;">
          <h2 style="color: #bf2600; margin-bottom: 5px;">⚠️ Overdue Task Alert</h2>
          <p style="color: #44546f; font-size: 14px;">The following tasks are past their target deadlines:</p>
          
          ${overdue.length === 0 ? `
            <p style="color: #626f86; font-size: 13px;">🎉 Excellent! You have no overdue tasks.</p>
          ` : `
            <div style="margin-top: 15px;">
              ${overdue.map(c => `
                <div style="background-color: #ffebe6; border-left: 4px solid #ff5630; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                  <strong style="color: #172b4d; font-size: 14px;">${c.title}</strong>
                  <div style="color: #bf2600; font-size: 12px; margin-top: 4px;">
                    Was due on: <strong>${new Date(c.dueDate).toLocaleDateString()}</strong> (Priority: ${c.priority})
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }

    await sendEmail({
      userId: user.id,
      to: user.googleEmail,
      subject,
      htmlText: emailHtml,
      text: subject
    });

    // Record activity
    await prisma.gmailActivity.create({
      data: {
        userId: user.id,
        type: 'DAILY_SUMMARY',
        details: `Triggered manual test reminder email: ${type}`
      }
    });

    res.json({ message: `Successfully sent ${type} email to ${user.googleEmail}` });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to trigger reminder email' });
  }
});

// GET Gmail Auto Rules
router.get('/rules', authenticate, async (req, res) => {
  try {
    const rules = await prisma.gmailAutoRule.findMany({
      where: { userId: req.user.id },
      include: {
        board: {
          select: { name: true }
        }
      }
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// POST Create Gmail Auto Rule
router.post('/rules', authenticate, async (req, res) => {
  try {
    const { triggerType, triggerVal, targetBoardId, targetListId } = req.body;
    if (!triggerType || !triggerVal || !targetBoardId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const rule = await prisma.gmailAutoRule.create({
      data: {
        userId: req.user.id,
        triggerType,
        triggerVal,
        targetBoardId,
        targetListId: targetListId || null
      },
      include: {
        board: { select: { name: true } }
      }
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// DELETE Gmail Auto Rule
router.delete('/rules/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.gmailAutoRule.delete({
      where: { id, userId: req.user.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// POST Send Threaded Reply
router.post('/reply', authenticate, async (req, res) => {
  try {
    const { itemId, replyText } = req.body; // itemId can be InboxItem ID or Card ID
    if (!itemId || !replyText) {
      return res.status(400).json({ error: 'Item ID and reply content are required' });
    }

    // Attempt to look up original details in InboxItem or CardEmailDetails
    let originalDetails = null;
    const inboxItem = await prisma.inboxItem.findUnique({ where: { id: itemId } });

    if (inboxItem && inboxItem.source === 'GMAIL') {
      originalDetails = JSON.parse(inboxItem.sourceDetails || '{}');
    } else {
      // Look up CardEmailDetails
      const cardDetails = await prisma.cardEmailDetails.findUnique({
        where: { cardId: itemId } // cardId as key
      });
      if (cardDetails) {
        originalDetails = {
          id: cardDetails.messageId,
          threadId: cardDetails.threadId,
          sender: cardDetails.sender,
          subject: cardDetails.subject
        };
      }
    }

    if (!originalDetails) {
      return res.status(404).json({ error: 'Original email details not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.googleEmail) {
      return res.status(400).json({ error: 'No connected Gmail account found' });
    }

    // Extract sender email address from string (e.g. "John Doe <john@example.com>")
    const emailMatch = originalDetails.sender.match(/<([^>]+)>/) || [null, originalDetails.sender];
    const targetRecipient = emailMatch[1] || originalDetails.sender;

    const replySubject = originalDetails.subject.toLowerCase().startsWith('re:') 
      ? originalDetails.subject 
      : `Re: ${originalDetails.subject}`;

    await sendEmail({
      userId: user.id,
      to: targetRecipient,
      subject: replySubject,
      text: replyText,
      htmlText: `<div style="font-family: sans-serif; font-size: 14px;">
        <p>${replyText.replace(/\n/g, '<br />')}</p>
        <br />
        <hr style="border: 0; border-top: 1px solid #dfe1e6; margin: 20px 0;" />
        <span style="font-size: 11px; color: #8590a2;">Reply sent from Frankloo Task Manager.</span>
      </div>`,
      threadId: originalDetails.threadId,
      inReplyTo: originalDetails.id,
      references: originalDetails.id
    });

    // Record reply activity log
    await prisma.gmailActivity.create({
      data: {
        userId: user.id,
        type: 'NOTIFICATION_SENT',
        details: `Sent threaded reply to ${targetRecipient}: "${replySubject}"`
      }
    });

    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Email Reply Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send reply' });
  }
});

export default router;
