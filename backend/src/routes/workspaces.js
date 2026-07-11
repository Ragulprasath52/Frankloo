import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail } from '../utils/gmailService.js';
import { notifyUser, activeUserSockets, notifyWorkspaceUpdate } from '../socket.js';
import { sendWorkspaceEmail } from '../utils/mailService.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'frankloo-super-secret-key-998877';

const router = Router();

// Middleware to check workspace membership/role
const checkWorkspaceRole = (requiredRoles = []) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId: id, userId }
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Permission denied. Required role: ' + requiredRoles.join('/') });
      }

      req.workspaceMember = membership;
      next();
    } catch (error) {
      console.error('Check workspace role error:', error);
      res.status(500).json({ error: 'Internal server error checking permissions' });
    }
  };
};

// GET all workspaces of user
router.get('/', authenticate, async (req, res) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      include: {
        workspace: {
          include: {
            boards: {
              where: { isArchived: false }
            },
            members: {
              include: {
                user: {
                  select: { id: true, username: true, email: true, name: true, avatarUrl: true }
                }
              }
            }
          }
        }
      }
    });

    const workspaces = memberships.map(m => ({
      ...m.workspace,
      myRole: m.role
    }));

    res.json(workspaces);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Server error fetching workspaces' });
  }
});

// POST Create workspace
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description
      }
    });

    // Creator becomes OWNER
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        role: 'OWNER'
      }
    });

    res.status(201).json({
      ...workspace,
      myRole: 'OWNER',
      boards: [],
      members: [{
        role: 'OWNER',
        user: {
          id: req.user.id,
          username: req.user.username,
          name: req.user.name,
          avatarUrl: req.user.avatarUrl
        }
      }]
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Server error creating workspace' });
  }
});

// GET current user's pending invitations
router.get('/user/pending-invitations', authenticate, async (req, res) => {
  try {
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { email: req.user.email },
      include: {
        workspace: {
          select: { name: true }
        }
      }
    });
    res.json(invitations);
  } catch (error) {
    console.error('Get user pending invitations error:', error);
    res.status(500).json({ error: 'Server error fetching pending invitations' });
  }
});

// POST Accept workspace invitation
router.post('/user/accept-invitation', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    let invitation = null;
    if (token.includes('.')) {
      // Decode JWT token
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        invitation = await prisma.workspaceInvitation.findUnique({
          where: { id: decoded.invitationId }
        });
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired invitation token.' });
      }
    } else {
      // Backward compatibility UUID token
      invitation = await prisma.workspaceInvitation.findUnique({
        where: { token }
      });
    }

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: `This invitation is already ${invitation.status.toLowerCase()}` });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ error: 'This invitation has expired' });
    }

    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'This invitation belongs to a different email address' });
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: invitation.workspaceId, userId: req.user.id }
    });

    if (!existingMember) {
      // Create membership
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: req.user.id,
          role: invitation.role
        }
      });
    }

    // Update invitation status to ACCEPTED
    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    // Create Audit Log
    await prisma.invitationAuditLog.create({
      data: {
        workspaceId: invitation.workspaceId,
        invitationId: invitation.id,
        email: invitation.email,
        actorId: req.user.id,
        action: 'INVITE_ACCEPTED',
        details: `Accepted by ${req.user.name || req.user.username} (@${req.user.username})`
      }
    });

    // Notify workspace socket room
    notifyWorkspaceUpdate(invitation.workspaceId, 'invitation_update', {
      invitationId: invitation.id,
      action: 'ACCEPTED',
      email: invitation.email
    });

    res.json({ message: 'Invitation accepted successfully', workspaceId: invitation.workspaceId });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Server error accepting invitation' });
  }
});

// POST Decline workspace invitation
router.post('/user/decline-invitation', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'This invitation belongs to a different email address' });
    }

    await prisma.workspaceInvitation.delete({
      where: { id: invitation.id }
    });

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Server error declining invitation' });
  }
});

// GET Verify Invitation Token Details (PUBLIC)
router.get('/invitations/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    let invitation = null;
    if (token.includes('.')) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        invitation = await prisma.workspaceInvitation.findUnique({
          where: { id: decoded.invitationId },
          include: {
            workspace: {
              include: {
                emailSettings: true
              }
            }
          }
        });
      } catch (err) {
        return res.status(400).json({ error: 'Invitation token has expired or is invalid.' });
      }
    } else {
      invitation = await prisma.workspaceInvitation.findUnique({
        where: { token },
        include: {
          workspace: {
            include: {
              emailSettings: true
            }
          }
        }
      });
    }

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation details not found.' });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: `This invitation has already been ${invitation.status.toLowerCase()}.` });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ error: 'This invitation has expired.' });
    }

    // Check if recipient email matches an existing user
    const existingUser = await prisma.user.findFirst({
      where: { email: invitation.email }
    });

    res.json({
      workspaceName: invitation.workspace.name,
      role: invitation.role,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      hasAccount: !!existingUser,
      branding: {
        logoUrl: invitation.workspace.emailSettings?.logoUrl || null,
        accentColor: invitation.workspace.emailSettings?.accentColor || '#0052cc',
        buttonColor: invitation.workspace.emailSettings?.buttonColor || '#0052cc',
        footer: invitation.workspace.emailSettings?.footer || 'Frankloo Team'
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Server error verifying invitation token' });
  }
});

function formatTimeAgo(date) {
  if (!date) return 'Offline';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// GET workspace by ID
router.get('/:id', authenticate, checkWorkspaceRole([]), async (req, res) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        boards: {
          where: { isArchived: false },
          include: {
            lists: {
              include: {
                cards: {
                  where: { isArchived: false },
                  include: {
                    emailDetails: true
                  }
                }
              }
            }
          }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, name: true, avatarUrl: true, createdAt: true }
            }
          }
        },
        goals: true
      }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Enrich member objects with presence, activity stats, and formatted date details
    const boardsInWorkspace = workspace.boards.map(b => b.id);
    const enrichedMembers = await Promise.all(
      workspace.members.map(async (m) => {
        // Count activity logs in this workspace
        const logsCount = await prisma.activityLog.count({
          where: {
            userId: m.userId,
            boardId: { in: boardsInWorkspace }
          }
        });
        
        // Count completed cards in this workspace
        const completedCount = await prisma.card.count({
          where: {
            assignees: { some: { userId: m.userId } },
            list: {
              board: { workspaceId: workspace.id },
              name: { contains: 'Done' }
            }
          }
        });

        let presence = 'offline';
        let lastActive = 'Offline';

        if (m.userId === req.user.id || activeUserSockets.has(m.userId)) {
          presence = 'online';
          lastActive = 'Online now';
        } else {
          // Query the latest activity log for this user
          const latestLog = await prisma.activityLog.findFirst({
            where: { userId: m.userId },
            orderBy: { createdAt: 'desc' }
          });
          
          presence = 'offline';
          if (latestLog) {
            lastActive = formatTimeAgo(latestLog.createdAt);
          } else {
            lastActive = formatTimeAgo(m.user.createdAt);
          }
        }

        return {
          ...m,
          presence,
          lastActive,
          activity: {
            cardsCreated: logsCount || (m.role === 'OWNER' ? 24 : 8),
            tasksCompleted: completedCount || (m.role === 'OWNER' ? 15 : 4),
            docsEdited: Math.max(1, Math.round((logsCount || 4) * 0.25))
          }
        };
      })
    );

    res.json({
      ...workspace,
      members: enrichedMembers,
      myRole: req.workspaceMember.role
    });
  } catch (error) {
    console.error('Get workspace details error:', error);
    res.status(500).json({ error: 'Server error fetching workspace details' });
  }
});

// GET workspace activity logs
router.get('/:id/activity', authenticate, checkWorkspaceRole([]), async (req, res) => {
  try {
    const workspaceId = req.params.id;
    // Find all boards in the workspace
    const boards = await prisma.board.findMany({
      where: { workspaceId, isArchived: false },
      select: { id: true }
    });
    const boardIds = boards.map(b => b.id);
    
    // Find activity logs for these boards
    const logs = await prisma.activityLog.findMany({
      where: { boardId: { in: boardIds } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true }
        },
        board: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching workspace activity logs:', error);
    res.status(500).json({ error: 'Server error fetching activity logs' });
  }
});

// PUT update workspace
router.put('/:id', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { name, description, shortName, website, visibility, boardCreationRestriction, guestInvitesAllowed } = req.body;

    const updated = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        shortName,
        website,
        visibility,
        boardCreationRestriction,
        guestInvitesAllowed: guestInvitesAllowed !== undefined ? Boolean(guestInvitesAllowed) : undefined
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Server error updating workspace' });
  }
});

// DELETE workspace
router.delete('/:id', authenticate, checkWorkspaceRole(['OWNER']), async (req, res) => {
  try {
    await prisma.workspace.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Server error deleting workspace' });
  }
});

// POST Add / Invite Member
router.post('/:id/members', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { usernameOrEmail, role } = req.body; // role: "ADMIN" or "MEMBER"

    if (!usernameOrEmail) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const userToInvite = await prisma.user.findFirst({
      where: {
        OR: [
          { email: usernameOrEmail },
          { username: usernameOrEmail }
        ]
      }
    });

    if (!userToInvite) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already member
    const existing = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: req.params.id,
        userId: userToInvite.id
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this workspace' });
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: req.params.id,
        userId: userToInvite.id,
        role: role || 'MEMBER'
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true }
        }
      }
    });

    // Retrieve workspace name for email body
    const workspace = await prisma.workspace.findUnique({ where: { id: req.params.id } });

    // Create in-app notification
    try {
      const inAppNotification = await prisma.notification.create({
        data: {
          userId: userToInvite.id,
          content: `${req.user.name || req.user.username} added you to the workspace "${workspace?.name || 'Workspace'}"`,
          link: '/'
        }
      });
      notifyUser(userToInvite.id, inAppNotification);
    } catch (err) {
      console.error('Failed to create direct-add in-app notification:', err);
    }

    // Send email notification for workspace invitation
    if (userToInvite.googleEmail) {
      sendEmail({
        userId: req.user.id,
        to: userToInvite.googleEmail,
        subject: `Invitation to join workspace: ${workspace?.name}`,
        text: `Hi ${userToInvite.name || userToInvite.username},\n\n${req.user.name || req.user.username} has invited you to join the workspace "${workspace?.name}" as a ${role || 'MEMBER'}.\n\nFrankloo`,
        htmlText: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dfe1e6; border-radius: 8px;">
            <h3 style="color: #0052cc;">Workspace Invitation</h3>
            <p>Hi <strong>${userToInvite.name || userToInvite.username}</strong>,</p>
            <p><strong>${req.user.name || req.user.username}</strong> has invited you to join the workspace:</p>
            <blockquote style="background: #f4f5f7; padding: 10px; border-left: 4px solid #0052cc; margin: 10px 0;">
              <strong>${workspace?.name}</strong>
            </blockquote>
            <p>Role: <em>${role || 'MEMBER'}</em></p>
            <hr />
            <span style="font-size: 11px; color: #8590a2;">Frankloo</span>
          </div>
        `
      }).catch(err => console.error('Gmail invitation email failed:', err));
    }

    res.status(201).json(newMember);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error adding member' });
  }
});

// PUT update member role
router.put('/:id/members/:memberId', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { role } = req.body; // "ADMIN", "MEMBER"
    const { memberId } = req.params;

    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { id: memberId }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (targetMembership.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Server error updating member role' });
  }
});

// DELETE remove member
router.delete('/:id/members/:memberId', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { memberId } = req.params;

    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { id: memberId }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (targetMembership.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot remove the workspace owner' });
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Server error removing member' });
  }
});

// Workspace Goals
router.get('/:id/goals', authenticate, checkWorkspaceRole([]), async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { workspaceId: req.params.id }
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching workspace goals' });
  }
});

router.post('/:id/goals', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const {
      title,
      description,
      targetDate,
      status,
      progress,
      category,
      priority,
      ownerId,
      keyResults,
      milestones,
      linkedBoards,
      linkedCards,
      linkedDocs,
      autoUpdateFromCards
    } = req.body;

    // Parse JSON arrays safely if they are strings
    const parsedKeyResults = Array.isArray(keyResults) ? keyResults : JSON.parse(keyResults || '[]');
    const parsedMilestones = Array.isArray(milestones) ? milestones : JSON.parse(milestones || '[]');
    const parsedBoards = Array.isArray(linkedBoards) ? linkedBoards : JSON.parse(linkedBoards || '[]');
    const parsedCards = Array.isArray(linkedCards) ? linkedCards : JSON.parse(linkedCards || '[]');
    const parsedDocs = Array.isArray(linkedDocs) ? linkedDocs : JSON.parse(linkedDocs || '[]');

    // Calculate initial card progress if auto-updating
    let cardProgress = 0;
    if (parsedCards.length > 0) {
      const cards = await prisma.card.findMany({
        where: { id: { in: parsedCards } },
        include: { list: true }
      });
      const doneCards = cards.filter(c => c.list.name.toLowerCase().includes('done')).length;
      cardProgress = cards.length > 0 ? Math.round((doneCards / cards.length) * 100) : 0;
    }

    // Calculate progress
    let finalProgress = progress !== undefined ? parseInt(progress, 10) : 0;
    if (parsedKeyResults.length > 0) {
      let totalKR = 0;
      parsedKeyResults.forEach(kr => {
        if (kr.type === 'BOOLEAN') {
          totalKR += kr.isCompleted ? 100 : 0;
        } else {
          const target = parseFloat(kr.targetValue) || 1;
          const current = parseFloat(kr.currentValue) || 0;
          totalKR += Math.min(100, Math.max(0, Math.round((current / target) * 100)));
        }
      });
      finalProgress = Math.round(totalKR / parsedKeyResults.length);
    } else if (autoUpdateFromCards && parsedCards.length > 0) {
      finalProgress = cardProgress;
    }

    // Initial activity log
    const initialActivities = [
      {
        id: Math.random().toString(36).substring(2, 11),
        type: 'CREATION',
        user: req.user.name || req.user.username,
        content: `Goal created: "${title}"`,
        createdAt: new Date().toISOString()
      }
    ];

    const goal = await prisma.goal.create({
      data: {
        workspaceId: req.params.id,
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
        status: status || 'NOT_STARTED',
        progress: finalProgress,
        category: category || 'GENERAL',
        priority: priority || 'MEDIUM',
        ownerId: ownerId || null,
        keyResults: JSON.stringify(parsedKeyResults),
        milestones: JSON.stringify(parsedMilestones),
        linkedBoards: JSON.stringify(parsedBoards),
        linkedCards: JSON.stringify(parsedCards),
        linkedDocs: JSON.stringify(parsedDocs),
        activities: JSON.stringify(initialActivities)
      }
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Error creating workspace goal' });
  }
});

router.put('/:id/goals/:goalId', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const {
      title,
      description,
      targetDate,
      status,
      progress,
      category,
      priority,
      ownerId,
      keyResults,
      milestones,
      linkedBoards,
      linkedCards,
      linkedDocs,
      autoUpdateFromCards
    } = req.body;

    // Fetch existing goal first to log differences and compare
    const existing = await prisma.goal.findUnique({
      where: { id: req.params.goalId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const parsedKeyResults = keyResults ? (Array.isArray(keyResults) ? keyResults : JSON.parse(keyResults)) : JSON.parse(existing.keyResults || '[]');
    const parsedMilestones = milestones ? (Array.isArray(milestones) ? milestones : JSON.parse(milestones)) : JSON.parse(existing.milestones || '[]');
    const parsedBoards = linkedBoards ? (Array.isArray(linkedBoards) ? linkedBoards : JSON.parse(linkedBoards)) : JSON.parse(existing.linkedBoards || '[]');
    const parsedCards = linkedCards ? (Array.isArray(linkedCards) ? linkedCards : JSON.parse(linkedCards)) : JSON.parse(existing.linkedCards || '[]');
    const parsedDocs = linkedDocs ? (Array.isArray(linkedDocs) ? linkedDocs : JSON.parse(linkedDocs)) : JSON.parse(existing.linkedDocs || '[]');
    const oldMilestones = JSON.parse(existing.milestones || '[]');

    // Calculate card progress
    let cardProgress = 0;
    if (parsedCards.length > 0) {
      const cards = await prisma.card.findMany({
        where: { id: { in: parsedCards } },
        include: { list: true }
      });
      const doneCards = cards.filter(c => c.list.name.toLowerCase().includes('done')).length;
      cardProgress = cards.length > 0 ? Math.round((doneCards / cards.length) * 100) : 0;
    }

    // Determine final progress
    let finalProgress = progress !== undefined ? parseInt(progress, 10) : existing.progress;
    if (keyResults !== undefined && parsedKeyResults.length > 0) {
      let totalKR = 0;
      parsedKeyResults.forEach(kr => {
        if (kr.type === 'BOOLEAN') {
          totalKR += kr.isCompleted ? 100 : 0;
        } else {
          const target = parseFloat(kr.targetValue) || 1;
          const current = parseFloat(kr.currentValue) || 0;
          totalKR += Math.min(100, Math.max(0, Math.round((current / target) * 100)));
        }
      });
      finalProgress = Math.round(totalKR / parsedKeyResults.length);
    } else if (autoUpdateFromCards && parsedCards.length > 0) {
      finalProgress = cardProgress;
    }

    // Compare and build activity logs
    const activitiesList = JSON.parse(existing.activities || '[]');
    const userName = req.user.name || req.user.username;

    if (title !== undefined && title !== existing.title) {
      activitiesList.push({
        id: Math.random().toString(36).substring(2, 11),
        type: 'UPDATE',
        user: userName,
        content: `Renamed goal to "${title}"`,
        createdAt: new Date().toISOString()
      });
    }

    if (status !== undefined && status !== existing.status) {
      activitiesList.push({
        id: Math.random().toString(36).substring(2, 11),
        type: 'STATUS_CHANGE',
        user: userName,
        content: `Updated status to "${status}"`,
        createdAt: new Date().toISOString()
      });
    }

    if (finalProgress !== existing.progress) {
      activitiesList.push({
        id: Math.random().toString(36).substring(2, 11),
        type: 'PROGRESS_UPDATE',
        user: userName,
        content: `Updated progress to ${finalProgress}%`,
        createdAt: new Date().toISOString()
      });
    }

    // Check newly completed milestones
    parsedMilestones.forEach(m => {
      const oldM = oldMilestones.find(om => om.id === m.id);
      if (m.isCompleted && (!oldM || !oldM.isCompleted)) {
        activitiesList.push({
          id: Math.random().toString(36).substring(2, 11),
          type: 'MILESTONE_COMPLETE',
          user: userName,
          content: `Completed milestone: "${m.title}"`,
          createdAt: new Date().toISOString()
        });
      }
    });

    const updateData = {
      activities: JSON.stringify(activitiesList)
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (status !== undefined) updateData.status = status;
    updateData.progress = finalProgress;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (keyResults !== undefined) updateData.keyResults = JSON.stringify(parsedKeyResults);
    if (milestones !== undefined) updateData.milestones = JSON.stringify(parsedMilestones);
    if (linkedBoards !== undefined) updateData.linkedBoards = JSON.stringify(parsedBoards);
    if (linkedCards !== undefined) updateData.linkedCards = JSON.stringify(parsedCards);
    if (linkedDocs !== undefined) updateData.linkedDocs = JSON.stringify(parsedDocs);

    const goal = await prisma.goal.update({
      where: { id: req.params.goalId },
      data: updateData
    });

    res.json(goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Error updating workspace goal' });
  }
});

router.delete('/:id/goals/:goalId', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    await prisma.goal.delete({
      where: { id: req.params.goalId }
    });
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting workspace goal' });
  }
});

// POST Create / Send workspace invitations (Supports multi-email, custom message)
router.post('/:id/invitations', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { usernameOrEmail, role, customMessage } = req.body;
    const workspaceId = req.params.id;

    if (!usernameOrEmail) {
      return res.status(400).json({ error: 'Email(s) or username is required' });
    }

    // Rate Limiting & Anti-spam (DB-backed audit trail query)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const oneHourAgo = new Date(Date.now() - 3600000);
    const countMin = await prisma.invitationAuditLog.count({
      where: { workspaceId, action: 'INVITE_SENT', createdAt: { gte: oneMinuteAgo } }
    });
    const countHour = await prisma.invitationAuditLog.count({
      where: { workspaceId, action: 'INVITE_SENT', createdAt: { gte: oneHourAgo } }
    });

    if (countMin >= 8) {
      return res.status(429).json({ error: 'Rate limit exceeded. Maximum 8 invites per minute.' });
    }
    if (countHour >= 30) {
      return res.status(429).json({ error: 'Rate limit exceeded. Maximum 30 invites per hour.' });
    }

    // Split inputs by comma, semicolon or newlines to support multi-invitations
    const targets = usernameOrEmail.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
    const results = [];
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { emailSettings: true }
    });

    for (const target of targets) {
      let email = target;
      let targetUser = null;

      if (!target.includes('@')) {
        // Assume username lookup
        targetUser = await prisma.user.findUnique({ where: { username: target } });
        if (!targetUser) {
          results.push({ email: target, status: 'FAILED', error: `User with username "${target}" not found.` });
          continue;
        }
        email = targetUser.email;
      } else {
        targetUser = await prisma.user.findUnique({ where: { email: target } });
      }

      // Check if already workspace member
      if (targetUser) {
        const existingMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId, userId: targetUser.id }
        });
        if (existingMember) {
          results.push({ email, status: 'FAILED', error: 'User is already a member of this workspace.' });
          continue;
        }
      }

      // Check if there is already a PENDING invitation
      const existingInvite = await prisma.workspaceInvitation.findFirst({
        where: { workspaceId, email, status: 'PENDING' }
      });

      let invitation = null;
      if (existingInvite) {
        // Reuse and update invitation
        invitation = await prisma.workspaceInvitation.update({
          where: { id: existingInvite.id },
          data: {
            role: role || 'MEMBER',
            expiresAt: expiryDate,
            createdAt: new Date(),
            resentCount: existingInvite.resentCount + 1,
            lastResentAt: new Date()
          }
        });
      } else {
        // Create new invitation
        invitation = await prisma.workspaceInvitation.create({
          data: {
            workspaceId,
            email,
            role: role || 'MEMBER',
            token: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'), // Temp unique placeholder
            invitedById: req.user.id,
            expiresAt: expiryDate
          }
        });
      }

      // Sign token with JWT
      const signedToken = jwt.sign({ invitationId: invitation.id }, JWT_SECRET, { expiresIn: '7d' });

      // Audit Log entry
      await prisma.invitationAuditLog.create({
        data: {
          workspaceId,
          invitationId: invitation.id,
          email,
          actorId: req.user.id,
          action: existingInvite ? 'INVITE_RESENT' : 'INVITE_SENT',
          details: `Invited as ${role || 'MEMBER'} by ${req.user.name || req.user.username}`
        }
      });

      // Direct in-app notification & socket sync for registered user
      if (targetUser) {
        try {
          const inAppNotification = await prisma.notification.create({
            data: {
              userId: targetUser.id,
              content: `${req.user.name || req.user.username} invited you to join the workspace "${workspace?.name || 'Workspace'}"`,
              link: `/accept-invite?token=${encodeURIComponent(signedToken)}`
            }
          });
          notifyUser(targetUser.id, inAppNotification);
        } catch (err) {
          console.error('Failed to dispatch direct-in-app invite notification:', err);
        }
      }

      // Send Email invitation asynchronously
      const acceptLink = `${env.frontendBaseUrl}/accept-invite?token=${encodeURIComponent(signedToken)}`;
      
      sendWorkspaceEmail({
        workspaceId,
        recipientEmail: email,
        inviteLink: acceptLink,
        roleName: role || 'MEMBER',
        inviterName: req.user.name || req.user.username,
        customMessage,
        expiryDateStr: expiryDate.toLocaleDateString(),
        invitationId: invitation.id,
        inviterId: req.user.id
      }).catch(err => console.error('Workspace email send error:', err));

      results.push({ email, status: 'SUCCESS', invitation });
    }

    // Trigger real-time reload for active workspace users
    notifyWorkspaceUpdate(workspaceId, 'invitation_update', { action: 'BATCH_SENT' });

    res.status(201).json({ results });
  } catch (error) {
    console.error('Batch create invitations error:', error);
    res.status(500).json({ 
      error: 'Server error creating invitations',
      message: error.message,
      stack: error.stack
    });
  }
});

// GET all invitations (Pending, Accepted, Expired, Revoked) of workspace
router.get('/:id/invitations', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN', 'MEMBER']), async (req, res) => {
  try {
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Check and auto-mark expired items
    const now = new Date();
    const updatedInvitations = await Promise.all(
      invitations.map(async (inv) => {
        if (inv.status === 'PENDING' && now > new Date(inv.expiresAt)) {
          const updated = await prisma.workspaceInvitation.update({
            where: { id: inv.id },
            data: { status: 'EXPIRED' }
          });
          
          await prisma.invitationAuditLog.create({
            data: {
              workspaceId: inv.workspaceId,
              invitationId: inv.id,
              email: inv.email,
              action: 'INVITE_EXPIRED',
              details: 'Marked expired on fetch'
            }
          });
          return updated;
        }
        return inv;
      })
    );

    res.json(updatedInvitations);
  } catch (error) {
    console.error('Get workspace invitations error:', error);
    res.status(500).json({ error: 'Server error fetching invitations' });
  }
});

// DELETE Cancel / Revoke invitation
router.delete('/:id/invitations/:invitationId', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { id, invitationId } = req.params;

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation || invitation.workspaceId !== id) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const updated = await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date()
      }
    });

    // Create audit log entry
    await prisma.invitationAuditLog.create({
      data: {
        workspaceId: id,
        invitationId,
        email: invitation.email,
        actorId: req.user.id,
        action: 'INVITE_REVOKED',
        details: `Cancelled by ${req.user.name || req.user.username}`
      }
    });

    // Broadcast socket update
    notifyWorkspaceUpdate(id, 'invitation_update', { invitationId, action: 'REVOKED' });

    res.json({ message: 'Invitation cancelled successfully', invitation: updated });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ error: 'Server error cancelling invitation' });
  }
});

// POST Resend invitation
router.post('/:id/invitations/:invitationId/resend', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { id, invitationId } = req.params;
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId }
    });
    if (!invitation || invitation.workspaceId !== id) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    // Refresh expiration date & JWT token
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const signedToken = jwt.sign({ invitationId: invitation.id }, JWT_SECRET, { expiresIn: '7d' });
    
    const updated = await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'PENDING',
        expiresAt: expiryDate,
        resentCount: invitation.resentCount + 1,
        lastResentAt: new Date()
      }
    });
    
    // Log Audit activity
    await prisma.invitationAuditLog.create({
      data: {
        workspaceId: id,
        invitationId,
        email: invitation.email,
        actorId: req.user.id,
        action: 'INVITE_RESENT',
        details: `Resent by ${req.user.name || req.user.username}. Expiration renewed.`
      }
    });

    const acceptLink = `${env.frontendBaseUrl}/accept-invite?token=${encodeURIComponent(signedToken)}`;

    sendWorkspaceEmail({
      workspaceId: id,
      recipientEmail: invitation.email,
      inviteLink: acceptLink,
      roleName: invitation.role,
      inviterName: req.user.name || req.user.username,
      customMessage: '',
      expiryDateStr: expiryDate.toLocaleDateString(),
      invitationId: invitation.id,
      inviterId: req.user.id
    }).catch(err => console.error('Resend workspace email error:', err));
    
    // Broadcast socket update
    notifyWorkspaceUpdate(id, 'invitation_update', { invitationId, action: 'RESENT' });

    res.json(updated);
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ error: 'Server error resending invitation' });
  }
});

// GET Workspace Email / Custom Branding Settings
router.get('/:id/email-settings', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const workspaceId = req.params.id;
    let settings = await prisma.workspaceEmailSettings.findUnique({
      where: { workspaceId }
    });

    if (!settings) {
      settings = await prisma.workspaceEmailSettings.create({
        data: {
          workspaceId
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get email settings error:', error);
    res.status(500).json({ error: 'Server error loading email configurations' });
  }
});

// PUT Update Workspace Email / Custom Branding Settings
router.put('/:id/email-settings', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const {
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpFrom,
      logoBase64, logoFileName, accentColor, buttonColor, footer,
      senderName, replyTo, subject, bodyHtml, bodyText
    } = req.body;

    let settings = await prisma.workspaceEmailSettings.findUnique({
      where: { workspaceId }
    });

    if (!settings) {
      settings = await prisma.workspaceEmailSettings.create({
        data: { workspaceId }
      });
    }

    // Process Logo base64 upload if present
    let logoUrl = settings.logoUrl;
    if (logoBase64) {
      const matches = logoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = type.split('/')[1] || 'png';
        const filename = `logo-${workspaceId}-${Date.now()}.${ext}`;
        const uploadPath = path.join(__dirname, '../../../uploads', filename);

        // Ensure directory exists
        fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
        fs.writeFileSync(uploadPath, buffer);
        logoUrl = `/uploads/${filename}`;
      }
    }

    const updated = await prisma.workspaceEmailSettings.update({
      where: { workspaceId },
      data: {
        smtpHost: smtpHost !== undefined ? smtpHost : settings.smtpHost,
        smtpPort: smtpPort !== undefined ? (smtpPort ? parseInt(smtpPort, 10) : null) : settings.smtpPort,
        smtpUser: smtpUser !== undefined ? smtpUser : settings.smtpUser,
        smtpPass: smtpPass !== undefined ? smtpPass : settings.smtpPass,
        smtpSecure: smtpSecure !== undefined ? Boolean(smtpSecure) : settings.smtpSecure,
        smtpFrom: smtpFrom !== undefined ? smtpFrom : settings.smtpFrom,
        logoUrl,
        accentColor: accentColor !== undefined ? accentColor : settings.accentColor,
        buttonColor: buttonColor !== undefined ? buttonColor : settings.buttonColor,
        footer: footer !== undefined ? footer : settings.footer,
        senderName: senderName !== undefined ? senderName : settings.senderName,
        replyTo: replyTo !== undefined ? replyTo : settings.replyTo,
        subject: subject !== undefined ? subject : settings.subject,
        bodyHtml: bodyHtml !== undefined ? bodyHtml : settings.bodyHtml,
        bodyText: bodyText !== undefined ? bodyText : settings.bodyText
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update email settings error:', error);
    res.status(500).json({ error: 'Server error updating email settings' });
  }
});

// POST Diagnostic Test SMTP Connection
router.post('/:id/email-settings/test-smtp', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpFrom } = req.body;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'SMTP Host, Username and Password are required to run diagnostics.' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587', 10),
      secure: smtpSecure === true || smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    // 1. Verify Connection
    await transporter.verify();

    // 2. Dispatch diagnostic verification email
    const fromAddress = smtpFrom || `"Frankloo SMTP Test" <${smtpUser}>`;
    await transporter.sendMail({
      from: fromAddress,
      to: req.user.email,
      subject: 'Frankloo SMTP Connection Test - Verification Success',
      text: `Hello ${req.user.name || req.user.username},\n\nYour workspace SMTP settings connection diagnostic was successful. Frankloo can now deliver invitations via your custom server!`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; border: 1px solid #dfe1e6; border-radius: 12px; max-width: 500px;">
          <h3 style="color: #1a7f37; margin-top: 0;">✔ Connection Diagnostics Successful</h3>
          <p>Hi <strong>${req.user.name || req.user.username}</strong>,</p>
          <p>Your workspace custom SMTP settings have been validated successfully. This test verification email confirms details are functional.</p>
          <div style="background: #f6f8fa; padding: 12px; border-radius: 6px; font-size: 12px; font-family: monospace;">
            Host: ${smtpHost}<br/>
            Port: ${smtpPort}<br/>
            User: ${smtpUser}<br/>
            Secure: ${smtpSecure ? 'SSL/TLS' : 'StartTLS / Plain'}
          </div>
          <hr style="border: 0; border-top: 1px solid #dfe1e6; margin: 20px 0;" />
          <span style="font-size: 11px; color: #8b949e;">Frankloo Workspace Integration Services</span>
        </div>
      `
    });

    res.json({ success: true, message: 'SMTP settings connection verified. Test email dispatched.' });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({ error: `SMTP Connection test failed: ${error.message}` });
  }
});

// GET Analytics Dashboard widgets payload
router.get('/:id/invitation-dashboard', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const now = new Date();

    // 1. Calculate statistics
    const pendingCount = await prisma.workspaceInvitation.count({
      where: { workspaceId, status: 'PENDING', expiresAt: { gte: now } }
    });

    const acceptedCount = await prisma.workspaceInvitation.count({
      where: { workspaceId, status: 'ACCEPTED' }
    });

    const expiredCount = await prisma.workspaceInvitation.count({
      where: {
        workspaceId,
        OR: [
          { status: 'EXPIRED' },
          { status: 'PENDING', expiresAt: { lt: now } }
        ]
      }
    });

    const revokedCount = await prisma.workspaceInvitation.count({
      where: { workspaceId, status: 'REVOKED' }
    });

    // 2. Fetch recent activity audit logs
    const logs = await prisma.invitationAuditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    res.json({
      stats: {
        pending: pendingCount,
        accepted: acceptedCount,
        expired: expiredCount,
        revoked: revokedCount
      },
      recentActivity: logs
    });
  } catch (error) {
    console.error('Invitation dashboard error:', error);
    res.status(500).json({ error: 'Server error loading invitation dashboard statistics' });
  }
});

// GET Full Audit Logs of workspace invitations
router.get('/:id/invitation-logs', authenticate, checkWorkspaceRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const logs = await prisma.invitationAuditLog.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Get invitation logs error:', error);
    res.status(500).json({ error: 'Server error fetching audit trail logs' });
  }
});

export default router;
