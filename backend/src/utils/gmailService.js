import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { prisma } from '../db.js';

const DEFAULT_REDIRECT_URI = 'http://localhost:5000/api/gmail/callback';

export const getOAuthConfig = () => {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI,
  };
};

export const getOAuthClient = () => {
  const config = getOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    return null;
  }
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
};

// Mock emails list for sandbox simulation
export const MOCK_EMAILS = [
  {
    id: 'msg-sandbox-101',
    threadId: 'thread-sandbox-101',
    sender: 'John Client <john.client@example.com>',
    subject: 'New Feature: Custom branding design requested',
    snippet: 'Hi Team, could we add support for custom branding colors on the workspace dashboards? Our corporate clients need this...',
    body: `Hi Team,

Could we add support for custom branding colors on the workspace dashboards? The current themes are great, but our corporate clients need to apply their own logos and brand palettes.

Let me know if we can schedule a call to discuss this.

Best,
John`,
    date: new Date().toISOString(),
    attachments: [
      { filename: 'branding_specs.pdf', mimeType: 'application/pdf', size: 102400 }
    ]
  },
  {
    id: 'msg-sandbox-102',
    threadId: 'thread-sandbox-102',
    sender: 'QA Lead <qa@frankloo.pro>',
    subject: 'URGENT Bug: Mobile sidebar overlaps dashboard tabs',
    snippet: 'When opening the dashboard on iOS Chrome, the sidebar overlay remains open and blocks clicks on tabs...',
    body: `Hey team,

We found a critical layout bug on iOS. When opening the dashboard on iOS Chrome, the sidebar navigation drawer overlay remains partially open and blocks any tap actions on the main tabs (Kanban, Goals, Wiki). This makes the dashboard unusable on mobile.

Steps to reproduce:
1. Open dashboard on mobile Safari/Chrome.
2. Tap menu drawer.
3. Close menu drawer.
4. Try tapping Kanban tab.

Please fix as soon as possible.

Regards,
QA Team`,
    date: new Date(Date.now() - 3600000).toISOString(),
    attachments: []
  },
  {
    id: 'msg-sandbox-103',
    threadId: 'thread-sandbox-103',
    sender: 'Billing Finance <billing@company.com>',
    subject: 'Weekly project review and billing proposal',
    snippet: 'Please review the attached weekly report and invoice for hours logged on the task manager client update...',
    body: `Dear Administrator,

Please review the attached weekly progress report and invoice details for resources assigned to the board update project.

Let us know if there are any questions.

Thanks,
Finance Team`,
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    attachments: [
      { filename: 'invoice_2991.pdf', mimeType: 'application/pdf', size: 45000 }
    ]
  }
];

// Fetch recent emails (Real Gmail API or Sandbox Mock)
export const fetchRecentEmails = async (user, count = 10) => {
  if (user.gmailSandboxMode || !user.googleToken) {
    // Return Sandbox Mocks
    return MOCK_EMAILS;
  }

  const oauth2Client = getOAuthClient();
  if (!oauth2Client) {
    throw new Error('Google OAuth client is not configured.');
  }

  const tokens = JSON.parse(user.googleToken);
  oauth2Client.setCredentials(tokens);

  // Refresh token if expired
  oauth2Client.on('tokens', async (newTokens) => {
    const updatedToken = { ...tokens, ...newTokens };
    await prisma.user.update({
      where: { id: user.id },
      data: { googleToken: JSON.stringify(updatedToken) }
    });
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:inbox',
    maxResults: count
  });

  const messages = response.data.messages || [];
  const fetchedEmails = [];

  for (const msg of messages) {
    try {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const headers = details.data.payload.headers;
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
      const senderHeader = headers.find(h => h.name.toLowerCase() === 'from');
      const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');

      const subject = subjectHeader ? subjectHeader.value : 'No Subject';
      const sender = senderHeader ? senderHeader.value : 'Unknown Sender';
      const date = dateHeader ? dateHeader.value : new Date().toISOString();

      // Extract body
      let body = '';
      if (details.data.payload.parts) {
        const textPart = details.data.payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart && textPart.body && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        } else {
          body = details.data.snippet || '';
        }
      } else if (details.data.payload.body && details.data.payload.body.data) {
        body = Buffer.from(details.data.payload.body.data, 'base64').toString('utf-8');
      } else {
        body = details.data.snippet || '';
      }

      // Check for attachments
      const attachments = [];
      if (details.data.payload.parts) {
        for (const part of details.data.payload.parts) {
          if (part.filename && part.body && part.body.attachmentId) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
              attachmentId: part.body.attachmentId
            });
          }
        }
      }

      fetchedEmails.push({
        id: msg.id,
        threadId: msg.threadId,
        sender,
        subject,
        snippet: details.data.snippet || '',
        body,
        date,
        attachments
      });
    } catch (err) {
      console.error(`Error fetching details for message ${msg.id}:`, err);
    }
  }

  return fetchedEmails;
};

// Send an email (via Real Gmail API OAuth2 or Sandbox SMTP/console log)
export const sendEmail = async ({ userId, to, subject, htmlText, text }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // 1. Log Activity
  await prisma.gmailActivity.create({
    data: {
      userId,
      type: 'NOTIFICATION_SENT',
      details: JSON.stringify({ to, subject })
    }
  });

  // 2. Sandbox simulation send
  if (user.gmailSandboxMode || !user.googleToken) {
    console.log(`[GMAIL SANDBOX EMAIL]
To: ${to}
Subject: ${subject}
Content: ${text || htmlText}`);

    // If SMTP credentials are set in .env, optionally try to send real test mail
    const smtpHost = process.env.SMTP_HOST || (process.env.SMTP_USER ? 'smtp.gmail.com' : null);
    if (smtpHost && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Frankloo Sandbox" <${process.env.SMTP_USER}>`,
          to,
          subject: `[Sandbox] ${subject}`,
          text,
          html: htmlText
        });
        console.log(`Successfully sent sandbox SMTP email to ${to}`);
      } catch (err) {
        console.error('Failed to send SMTP email in sandbox mode:', err);
      }
    }
    return;
  }

  // 3. Real Gmail OAuth2 Send
  try {
    const oauth2Client = getOAuthClient();
    if (!oauth2Client) return;

    const tokens = JSON.parse(user.googleToken);
    oauth2Client.setCredentials(tokens);

    // Refresh credentials if needed
    const clientEmail = user.googleEmail;

    // Use Nodemailer with OAuth2 transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: clientEmail,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
      }
    });

    await transporter.sendMail({
      from: `"${user.name || 'Frankloo'}" <${clientEmail}>`,
      to,
      subject,
      text,
      html: htmlText
    });

    console.log(`Successfully sent OAuth2 email to ${to}`);
  } catch (error) {
    console.error('Error sending OAuth2 email:', error);
    throw error;
  }
};
