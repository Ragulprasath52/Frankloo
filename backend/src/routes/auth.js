import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { google } from 'googleapis';
import { notifyWorkspaceUpdate } from '../socket.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'frankloo-super-secret-key-998877';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, name, invitationToken } = req.body;

    const trimmedEmail = email ? String(email).trim().toLowerCase() : '';
    const trimmedUsername = username ? String(username).trim() : '';
    const trimmedName = name ? String(name).trim() : '';

    console.log(`[AUTH REGISTER] Email received: "${trimmedEmail}" (raw: "${email}"), Username received: "${trimmedUsername}", Invitation Token: "${invitationToken ? 'Yes' : 'No'}"`);

    if (!trimmedEmail || !trimmedUsername || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedEmail },
          { username: trimmedUsername }
        ]
      }
    });

    if (existingUser) {
      console.log(`[AUTH REGISTER] Conflict: User with email "${trimmedEmail}" or username "${trimmedUsername}" already exists.`);
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        username: trimmedUsername,
        password: hashedPassword,
        name: trimmedName,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trimmedName || trimmedUsername)}`
      }
    });

    console.log(`[AUTH REGISTER] User created successfully. ID: ${user.id}, Email: "${user.email}"`);

    // Create a default workspace for the user
    const workspace = await prisma.workspace.create({
      data: {
        name: `${trimmedName || trimmedUsername}'s Workspace`,
        description: 'Your default personal workspace.'
      }
    });

    // Add user as Owner of the default workspace
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'OWNER'
      }
    });

    let autoJoinedWorkspaceId = null;

    // Auto-join workspace if invitation token is provided
    if (invitationToken) {
      try {
        let invitation = null;
        if (invitationToken.includes('.')) {
          const decoded = jwt.verify(invitationToken, JWT_SECRET);
          invitation = await prisma.workspaceInvitation.findUnique({
            where: { id: decoded.invitationId }
          });
        } else {
          invitation = await prisma.workspaceInvitation.findUnique({
            where: { token: invitationToken }
          });
        }

        if (invitation && invitation.status === 'PENDING') {
          // Check that email matches
          if (invitation.email.toLowerCase() === trimmedEmail) {
            // Join workspace
            await prisma.workspaceMember.create({
              data: {
                workspaceId: invitation.workspaceId,
                userId: user.id,
                role: invitation.role
              }
            });

            // Update invitation status
            await prisma.workspaceInvitation.update({
              where: { id: invitation.id },
              data: {
                status: 'ACCEPTED',
                acceptedAt: new Date()
              }
            });

            // Audit log
            await prisma.invitationAuditLog.create({
              data: {
                workspaceId: invitation.workspaceId,
                invitationId: invitation.id,
                email: invitation.email,
                actorId: user.id,
                action: 'INVITE_ACCEPTED',
                details: `Accepted via registration auto-join`
              }
            });

            autoJoinedWorkspaceId = invitation.workspaceId;

            // Notify workspace
            notifyWorkspaceUpdate(invitation.workspaceId, 'invitation_update', {
              invitationId: invitation.id,
              action: 'ACCEPTED',
              email: invitation.email
            });
          }
        }
      } catch (err) {
        console.error('[AUTH REGISTER] Auto-join workspace error:', err);
      }
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        googleEmail: user.googleEmail
      },
      autoJoinedWorkspaceId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, email, password } = req.body;
    const rawIdentifier = emailOrUsername || email;

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const trimmedIdentifier = String(rawIdentifier).trim();
    const isEmailFormat = trimmedIdentifier.includes('@');
    const normalizedIdentifier = isEmailFormat ? trimmedIdentifier.toLowerCase() : trimmedIdentifier;

    console.log(`[AUTH LOGIN] Email lookup identifier: "${normalizedIdentifier}" (original input: "${rawIdentifier}")`);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { username: trimmedIdentifier }
        ]
      }
    });

    if (!user) {
      console.log(`[AUTH LOGIN] User not found for identifier: "${normalizedIdentifier}"`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log(`[AUTH LOGIN] User found: ID: ${user.id}, Username: "${user.username}". Comparing password hashes...`);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH LOGIN] Password mismatch for user ID: ${user.id}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log(`[AUTH LOGIN] Password verified. Creating token for user ID: ${user.id}...`);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[AUTH LOGIN] Token created successfully for user ID: ${user.id}`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        googleEmail: user.googleEmail
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    username: req.user.username,
    name: req.user.name,
    avatarUrl: req.user.avatarUrl,
    googleEmail: req.user.googleEmail
  });
});

// Update profile
router.put('/me', authenticate, async (req, res) => {
  try {
    const { name, avatarUrl, avatarBase64, password } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = String(name).trim();
    
    let resolvedAvatarUrl = avatarUrl;
    if (avatarBase64) {
      const matches = avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = type.split('/')[1] || 'png';
        const filename = `avatar-${req.user.id}-${Date.now()}.${ext}`;
        const uploadPath = path.join(__dirname, '../../../uploads', filename);

        // Ensure directory exists
        fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
        fs.writeFileSync(uploadPath, buffer);
        resolvedAvatarUrl = `/uploads/${filename}`;
      }
    }

    if (resolvedAvatarUrl !== undefined) updateData.avatarUrl = resolvedAvatarUrl;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      googleEmail: updatedUser.googleEmail
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
});

// Password reset request (Send verification / reset email)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: trimmedEmail }
    });

    if (!user) {
      // Return success even if email not found to prevent user enumeration
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    // Generate password reset token valid for 1 hour
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // Try sending email via Gmail OAuth or SMTP
    if (user.googleToken) {
      try {
        await sendGmailOAuthEmail({
          userId: user.id,
          to: user.email,
          subject: 'Reset your Frankloo Password',
          text: `Hi ${user.name || user.username},\n\nYou requested a password reset for your Frankloo account. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link is valid for 1 hour.\n\nIf you did not request this, please ignore this email.`,
          htmlText: `
            <div style="font-family: sans-serif; padding: 24px; border: 1px solid #dfe1e6; border-radius: 12px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #0052cc; margin-top: 0;">Reset Password</h2>
              <p>Hi <strong>${user.name || user.username}</strong>,</p>
              <p>You requested a password reset for your Frankloo account. Click the button below to update your credentials:</p>
              <p style="margin: 24px 0;">
                <a href="${resetUrl}" style="background: #0052cc; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
              </p>
              <p style="font-size: 12px; color: #6b778c;">This link is valid for 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `
        });
      } catch (e) {
        console.error('Failed to send reset email via Google OAuth:', e);
      }
    } else {
      console.log(`[PASSWORD RESET LINK] Sent to ${user.email}:\n${resetUrl}`);
    }

    res.json({ message: 'A password reset link has been sent to your email address.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error requesting password reset' });
  }
});

// Password reset execution (Verify token and update password)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({ error: 'Invalid token type' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Password reset link is invalid or has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword }
    });

    console.log(`[AUTH RESET PASSWORD] Password updated successfully for User ID: ${decoded.userId}`);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// GET Google Client ID
router.get('/google/client-id', async (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

// POST Google Sign-In / Sign-Up
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Credential token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'Google Client ID is not configured on the server.' });
    }

    // Verify Google ID token
    const oauth2Client = new google.auth.OAuth2(clientId);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: clientId
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid Google credential' });
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) {
      return res.status(400).json({ error: 'Google account does not have an email address' });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // 1. Try to find user by googleId
    let user = await prisma.user.findUnique({
      where: { googleId }
    });

    // 2. If not found by googleId, find by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: trimmedEmail }
      });

      if (user) {
        // Link googleId to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            googleEmail: trimmedEmail,
            name: user.name || name,
            avatarUrl: user.avatarUrl || picture,
            authProvider: 'google'
          }
        });
      }
    }

    // 3. If still not found, create new user and a default workspace
    if (!user) {
      let baseUsername = trimmedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      if (!baseUsername) baseUsername = 'user';
      
      let username = baseUsername;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        const existing = await prisma.user.findUnique({
          where: { username }
        });
        if (!existing) {
          isUnique = true;
        } else {
          username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
          attempts++;
        }
      }

      const randomPassword = Math.random().toString(36) + Math.random().toString(36);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          email: trimmedEmail,
          username,
          password: hashedPassword,
          name: name || baseUsername,
          avatarUrl: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || username)}`,
          googleId,
          googleEmail: trimmedEmail,
          authProvider: 'google'
        }
      });

      // Create a default workspace for the user
      const workspace = await prisma.workspace.create({
        data: {
          name: `${user.name || user.username}'s Workspace`,
          description: 'Your default personal workspace.'
        }
      });

      // Add user as Owner of the default workspace
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER'
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    res.status(500).json({ error: error.message || 'Server error during Google Sign-in' });
  }
});

export default router;

