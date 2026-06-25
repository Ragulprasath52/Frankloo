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
        overdueAlertsEnabled: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching Gmail profile' });
  }
});

// POST Update Gmail Settings
router.post('/settings', authenticate, async (req, res) => {
  try {
    const { gmailSandboxMode, dailySummaryEnabled, upcomingDeadlinesEnabled, overdueAlertsEnabled } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        gmailSandboxMode: gmailSandboxMode !== undefined ? gmailSandboxMode : undefined,
        dailySummaryEnabled: dailySummaryEnabled !== undefined ? dailySummaryEnabled : undefined,
        upcomingDeadlinesEnabled: upcomingDeadlinesEnabled !== undefined ? upcomingDeadlinesEnabled : undefined,
        overdueAlertsEnabled: overdueAlertsEnabled !== undefined ? overdueAlertsEnabled : undefined
      },
      select: {
        googleEmail: true,
        gmailSandboxMode: true,
        dailySummaryEnabled: true,
        upcomingDeadlinesEnabled: true,
        overdueAlertsEnabled: true
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating Gmail settings' });
  }
});

// GET OAuth URL
router.get('/auth-url', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (user?.gmailSandboxMode) {
      // Sandbox OAuth Url directly hitting the callback route with sandbox code
      const config = getOAuthConfig();
      return res.json({ 
        url: `${config.redirectUri}?code=sandbox_mock_code&state=${req.user.id}`,
        isSandbox: true
      });
    }

    const oauth2Client = getOAuthClient();
    if (!oauth2Client) {
      return res.status(400).json({ 
        error: 'Google OAuth is not configured on the server. Please use Sandbox Mode or set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET environment variables.' 
      });
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
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

    const emails = await fetchRecentEmails(user, 10);
    let importedCount = 0;

    for (const email of emails) {
      // Check if already sync-imported
      const existing = await prisma.inboxItem.findFirst({
        where: {
          workspaceId,
          source: 'GMAIL',
          sourceDetails: {
            contains: email.id
          }
        }
      });

      if (!existing) {
        const detailsObj = {
          id: email.id,
          threadId: email.threadId,
          sender: email.sender,
          subject: email.subject,
          link: `https://mail.google.com/mail/u/0/#inbox/${email.threadId || email.id}`,
          attachments: email.attachments
        };

        await prisma.inboxItem.create({
          data: {
            title: email.subject,
            description: email.body,
            source: 'GMAIL',
            sourceDetails: JSON.stringify(detailsObj),
            status: 'NEW',
            priority: email.subject.toLowerCase().includes('urgent') ? 'URGENT' : 'MEDIUM',
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
        details: `Inbox Sync - Fetched ${emails.length} emails, imported ${importedCount} new tasks`
      }
    });

    res.json({ 
      message: 'Inbox sync completed', 
      syncedCount: emails.length, 
      importedCount 
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

export default router;
