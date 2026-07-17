import nodemailer from 'nodemailer';
import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { sendEmail as sendGmailOAuthEmail } from './gmailService.js';

/**
 * Replace variables in a template string
 */
function compileTemplate(templateStr, variables) {
  if (!templateStr) return '';
  let compiled = templateStr;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    compiled = compiled.replace(placeholder, value || '');
  }
  return compiled;
}

/**
 * Renders default HTML invitation template if none is in DB
 */
function getDefaultHtmlTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f6f8fa;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border: 1px solid #d0d7de; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f6f8fa;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, {{accent_color}}, #6366f1); color: #ffffff; line-height: 48px; text-align: center; margin: 0 auto 16px auto; font-size: 20px; font-weight: 700; box-shadow: 0 4px 10px rgba(99,102,241,0.2); font-family: sans-serif;">
                {{workspace_initial}}
              </div>
              <h2 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #0d1117;">{{workspace_name}}</h2>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #24292f;">
                You're invited to join <strong>{{workspace_name}}</strong> on Frankloo.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #24292f;">
                <strong>{{workspace_owner}}</strong> has invited you to collaborate as a <strong>{{role}}</strong>.
              </p>
              
              <!-- Board access details -->
              <div style="margin: 0 0 20px 0;">
                {{board_access_html}}
              </div>
              
              <!-- Custom message if present -->
              <div style="display: {{custom_message_display}}; margin: 0 0 24px 0; padding: 16px; background-color: #f6f8fa; border-left: 4px solid {{accent_color}}; border-radius: 0 6px 6px 0; font-style: italic; font-size: 14px; line-height: 22px; color: #57606a;">
                "{{custom_message}}"
              </div>
              
              <!-- Action Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="{{invite_link}}" target="_blank" style="background-color: {{button_color}}; color: #ffffff; display: inline-block; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">Accept Invitation</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #57606a;">
                This invitation expires on <strong>{{expiry_date}}</strong>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #fafbfc; border-top: 1px solid #f6f8fa; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #57606a;">
                {{footer}}
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #8c959f;">
                This email was sent via Frankloo project management workspace.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getDefaultTextTemplate() {
  return `You're invited to join {{workspace_name}} on Frankloo.

{{workspace_owner}} has invited you to collaborate as a {{role}}.

{{board_access_text}}

Click the link below to accept your invitation and start collaborating:
{{invite_link}}

This invitation expires on {{expiry_date}}.

--
{{footer}}`;
}

/**
 * Sends a workspace invitation email.
 * Configured dynamically: Custom Workspace SMTP, Global SMTP fallback, or Console Sandbox Log.
 */
export async function sendWorkspaceEmail({
  workspaceId,
  recipientEmail,
  inviteLink,
  roleName,
  inviterName,
  customMessage = '',
  expiryDateStr,
  invitationId,
  inviterId,
  boardAccess
}) {
  let settings = null;
  let workspace = null;

  try {
    workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    settings = await prisma.workspaceEmailSettings.findUnique({
      where: { workspaceId }
    });
  } catch (error) {
    console.error('Error fetching email settings for sending invite:', error);
  }

  const workspaceName = workspace?.name || 'Workspace';
  const roleLabel = roleName === 'VIEWER' ? 'Guest' : (roleName || 'MEMBER').toLowerCase();

  // 1. Resolve Branding Parameters
  const accentColor = settings?.accentColor || '#0052cc';
  const buttonColor = settings?.buttonColor || '#0052cc';
  const footerText = settings?.footer || 'Frankloo Team';
  const senderName = settings?.senderName || 'Frankloo';
  const replyTo = settings?.replyTo || null;
  // Permanently use the default logo.png
  const logoUrl = `${env.backendBaseUrl}/uploads/logo.png`;
  const workspaceInitial = workspaceName[0]?.toUpperCase() || 'W';

  let boardAccessHtml = '';
  let boardAccessText = '';
  try {
    if (boardAccess && boardAccess !== 'ALL') {
      const parsed = typeof boardAccess === 'string' ? JSON.parse(boardAccess) : boardAccess;
      const boardIds = parsed.map(item => item.boardId);
      const boards = await prisma.board.findMany({
        where: { id: { in: boardIds } },
        select: { id: true, name: true }
      });
      const items = parsed.map(item => {
        const board = boards.find(b => b.id === item.boardId);
        const boardName = board ? board.name : 'Unknown Board';
        const roleLabel = (item.role || 'EDITOR').toLowerCase();
        return { name: boardName, role: roleLabel };
      });
      
      boardAccessText = `You currently have access to:\n` + items.map(item => `• ${item.name} (${item.role})`).join('\n');
      boardAccessHtml = `<p style="margin: 0 0 12px 0; font-size: 15px; color: #24292f;">You currently have access to:</p>` +
                        `<ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #24292f; line-height: 22px;">` +
                        items.map(item => `<li><strong>${item.name}</strong> (${item.role})</li>`).join('') +
                        `</ul>`;
    } else {
      boardAccessText = `You currently have access to all boards in this workspace.`;
      boardAccessHtml = `<p style="margin: 0 0 16px 0; font-size: 15px; color: #24292f;">You currently have access to all boards in this workspace.</p>`;
    }
  } catch (err) {
    console.error('Failed to parse boardAccess in mail service:', err);
    boardAccessText = `You currently have access to all boards in this workspace.`;
    boardAccessHtml = `<p style="margin: 0 0 16px 0; font-size: 15px; color: #24292f;">You currently have access to all boards in this workspace.</p>`;
  }

  // 2. Prepare Variables Map
  const variables = {
    workspace_name: workspaceName,
    workspace_initial: workspaceInitial,
    workspace_logo: logoUrl,
    workspace_owner: inviterName,
    recipient_email: recipientEmail,
    role: roleLabel,
    invite_link: inviteLink,
    expiry_date: expiryDateStr,
    custom_message: customMessage,
    custom_message_display: customMessage ? 'block' : 'none',
    accent_color: accentColor,
    button_color: buttonColor,
    footer: footerText,
    board_access_html: boardAccessHtml,
    board_access_text: boardAccessText
  };

  // 3. Compile Templates
  const templateSubject = settings?.subject || "You're invited to join {{workspace_name}} on Frankloo";
  const templateHtml = settings?.bodyHtml || getDefaultHtmlTemplate();
  const templateText = settings?.bodyText || getDefaultTextTemplate();

  const finalSubject = compileTemplate(templateSubject, variables);
  const finalHtml = compileTemplate(templateHtml, variables);
  const finalPlain = compileTemplate(templateText, variables);

  // Try to send via Google OAuth first if the inviter has connected Google OAuth
  if (inviterId) {
    try {
      const inviter = await prisma.user.findUnique({
        where: { id: inviterId }
      });
      if (inviter && inviter.googleToken) {
        try {
          // Send email via Google OAuth
          await sendGmailOAuthEmail({
            userId: inviterId,
            to: recipientEmail,
            subject: finalSubject,
            htmlText: finalHtml,
            text: finalPlain
          });

          // Log success in Database
          if (invitationId) {
            await prisma.workspaceInvitation.update({
              where: { id: invitationId },
              data: {
                deliveryStatus: 'DELIVERED',
                deliveryError: null
              }
            });

            await prisma.invitationAuditLog.create({
              data: {
                workspaceId,
                invitationId,
                email: recipientEmail,
                action: 'DELIVERY_SUCCESS',
                details: `Delivered via Google OAuth2 (Gmail: ${inviter.googleEmail})`
              }
            });
          }
          return; // Success, exit early!
        } catch (oauthErr) {
          console.error('[GMAIL OAUTH EMAIL] Send failed:', oauthErr);
          
          // Log failure in Database
          if (invitationId) {
            let errorMsg = oauthErr.message || 'Google OAuth delivery error';
            if (errorMsg.includes('invalid_grant')) {
              errorMsg = 'Google Account access has expired or been revoked. Please disconnect and reconnect your Google Account on the dashboard.';
            }
            
            await prisma.workspaceInvitation.update({
              where: { id: invitationId },
              data: {
                deliveryStatus: 'FAILED',
                deliveryError: errorMsg
              }
            });

            await prisma.invitationAuditLog.create({
              data: {
                workspaceId,
                invitationId,
                email: recipientEmail,
                action: 'DELIVERY_FAILURE',
                details: `Google OAuth error: ${errorMsg}`
              }
            });
          }
          return; // Stop here, do not fall back to mock sandbox delivery!
        }
      }
    } catch (dbErr) {
      console.error('Database lookup failed for inviter:', dbErr);
    }
  }

  // 4. Setup Transporter
  let transporter = null;
  let fromAddress = `"Frankloo" <no-reply@frankloo.local>`;

  const isCustomSmtpConfigured = settings?.smtpHost && settings?.smtpUser && settings?.smtpPass;

  if (isCustomSmtpConfigured) {
    // Custom SMTP Transport
    transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort || '587', 10),
      secure: settings.smtpSecure || settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      }
    });
    fromAddress = settings.smtpFrom || `"${senderName}" <${settings.smtpUser}>`;
  } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Fallback Global SMTP Transport
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    fromAddress = process.env.SMTP_FROM || `"${senderName}" <${process.env.SMTP_USER}>`;
  }

  // 5. Dispatch Email
  if (transporter) {
    try {
      const mailOptions = {
        from: fromAddress,
        to: recipientEmail,
        subject: finalSubject,
        text: finalPlain,
        html: finalHtml
      };

      if (replyTo) {
        mailOptions.replyTo = replyTo;
      }

      await transporter.sendMail(mailOptions);
      console.log(`[SMTP EMAIL] Successfully sent invitation to ${recipientEmail}`);

      // Log success in Database
      if (invitationId) {
        await prisma.workspaceInvitation.update({
          where: { id: invitationId },
          data: {
            deliveryStatus: 'DELIVERED',
            deliveryError: null
          }
        });

        await prisma.invitationAuditLog.create({
          data: {
            workspaceId,
            invitationId,
            email: recipientEmail,
            action: 'DELIVERY_SUCCESS',
            details: `Delivered via ${isCustomSmtpConfigured ? 'Custom SMTP' : 'Global SMTP'}`
          }
        });
      }
    } catch (err) {
      console.error('[SMTP EMAIL] Send failed:', err);

      // Log failure in Database
      if (invitationId) {
        await prisma.workspaceInvitation.update({
          where: { id: invitationId },
          data: {
            deliveryStatus: 'FAILED',
            deliveryError: err.message || 'SMTP dispatch error'
          }
        });

        await prisma.invitationAuditLog.create({
          data: {
            workspaceId,
            invitationId,
            email: recipientEmail,
            action: 'DELIVERY_FAILURE',
            details: `SMTP error: ${err.message || 'Unknown issue'}`
          }
        });
      }
    }
  } else {
    // Console log fallback for Sandbox testing
    console.log(`[GMAIL WORKSPACE INVITATION SANDBOX]
=========================================
Sender: ${fromAddress} (Sandbox Fallback)
Reply-To: ${replyTo || 'None'}
To: ${recipientEmail}
Subject: ${finalSubject}
-----------------------------------------
${finalPlain}
=========================================`);

    // Log success as sandbox delivered
    if (invitationId) {
      await prisma.workspaceInvitation.update({
        where: { id: invitationId },
        data: {
          deliveryStatus: 'DELIVERED',
          deliveryError: null
        }
      });

      await prisma.invitationAuditLog.create({
        data: {
          workspaceId,
          invitationId,
          email: recipientEmail,
          action: 'DELIVERY_SUCCESS',
          details: 'Delivered via Console Sandbox Log'
        }
      });
    }
  }
}
