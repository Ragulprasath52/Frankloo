import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { notifyBoardUpdate, notifyUser } from '../socket.js';
import { runAutomations } from '../utils/automations.js';
import { sendSlackNotification, sendDiscordNotification } from './integrations.js';
import { sendEmail } from '../utils/gmailService.js';

const router = Router();

// Middleware to check board membership
const checkBoardAccess = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const userId = req.user.id;

    const board = await prisma.board.findUnique({
      where: { id: boardId }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: board.workspaceId,
        userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You do not have access to this board' });
    }

    req.board = board;
    req.workspaceRole = membership.role;
    next();
  } catch (error) {
    console.error('Check board access error:', error);
    res.status(500).json({ error: 'Server error checking board access' });
  }
};

// GET boards in a workspace
router.get('/workspace/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // verify membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const boards = await prisma.board.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        lists: {
          include: {
            cards: {
              where: { isArchived: false }
            }
          }
        }
      }
    });

    res.json(boards);
  } catch (error) {
    console.error('Get workspace boards error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST Create board
router.post('/workspace/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, background } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Board name is required' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const board = await prisma.board.create({
      data: {
        name,
        description,
        background: background || 'indigo',
        workspaceId
      }
    });

    // Create default lists (To Do, Doing, Done)
    await prisma.list.createMany({
      data: [
        { name: 'To Do', position: 1000, boardId: board.id },
        { name: 'Doing', position: 2000, boardId: board.id },
        { name: 'Done', position: 3000, boardId: board.id }
      ]
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        boardId: board.id,
        action: 'CREATE_BOARD',
        details: `Created board ${name}`
      }
    });

    const fullBoard = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        lists: {
          include: {
            cards: {
              where: { isArchived: false }
            }
          }
        }
      }
    });

    res.status(201).json(fullBoard);
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET board by ID
router.get('/:id', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        lists: {
          where: { isArchived: false },
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { isArchived: false },
              orderBy: { position: 'asc' },
              include: {
                assignees: {
                  include: {
                    user: { select: { id: true, username: true, name: true, avatarUrl: true } }
                  }
                },
                checklists: { orderBy: { position: 'asc' } },
                dependencies: {
                  include: {
                    dependsOnCard: { select: { id: true, title: true } }
                  }
                },
                comments: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: { select: { id: true, username: true, name: true, avatarUrl: true } }
                  }
                },
                emailDetails: true
              }
            }
          }
        },
        automations: true,
        milestones: true,
        savedFilters: true
      }
    });

    res.json(board);
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update board
router.put('/:id', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { 
      name, description, background, isArchived,
      incomingEmailAddress, incomingEmailEnabled, incomingEmailListId,
      incomingEmailDefaultPriority, incomingEmailAllowedSenders,
      incomingEmailDefaultLabelIds, incomingEmailAutoAssigneeIds,
      incomingEmailThreadAction
    } = req.body;

    const dataObj = {};
    if (name !== undefined) dataObj.name = name;
    if (description !== undefined) dataObj.description = description;
    if (background !== undefined) dataObj.background = background;
    if (isArchived !== undefined) dataObj.isArchived = isArchived;
    if (incomingEmailAddress !== undefined) dataObj.incomingEmailAddress = incomingEmailAddress;
    if (incomingEmailEnabled !== undefined) dataObj.incomingEmailEnabled = incomingEmailEnabled;
    if (incomingEmailListId !== undefined) dataObj.incomingEmailListId = incomingEmailListId;
    if (incomingEmailDefaultPriority !== undefined) dataObj.incomingEmailDefaultPriority = incomingEmailDefaultPriority;
    if (incomingEmailAllowedSenders !== undefined) dataObj.incomingEmailAllowedSenders = incomingEmailAllowedSenders;
    if (incomingEmailDefaultLabelIds !== undefined) dataObj.incomingEmailDefaultLabelIds = incomingEmailDefaultLabelIds;
    if (incomingEmailAutoAssigneeIds !== undefined) dataObj.incomingEmailAutoAssigneeIds = incomingEmailAutoAssigneeIds;
    if (incomingEmailThreadAction !== undefined) dataObj.incomingEmailThreadAction = incomingEmailThreadAction;

    const updated = await prisma.board.update({
      where: { id: req.params.id },
      data: dataObj
    });

    notifyBoardUpdate(updated.id, 'BOARD_UPDATE', updated);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        boardId: updated.id,
        action: isArchived ? 'ARCHIVE_BOARD' : 'UPDATE_BOARD',
        details: isArchived ? 'Archived board' : 'Updated board information'
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE board
router.delete('/:id', authenticate, checkBoardAccess, async (req, res) => {
  try {
    if (req.workspaceRole !== 'OWNER' && req.workspaceRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only owners/admins can delete boards' });
    }

    await prisma.board.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST Duplicate Board
router.post('/:id/duplicate', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        lists: {
          include: {
            cards: {
              where: { isArchived: false },
              include: {
                checklists: true
              }
            }
          }
        }
      }
    });

    const newBoard = await prisma.board.create({
      data: {
        name: `${board.name} (Copy)`,
        description: board.description,
        background: board.background,
        workspaceId: board.workspaceId
      }
    });

    // Duplicate Lists & Cards
    for (const list of board.lists) {
      const newList = await prisma.list.create({
        data: {
          name: list.name,
          position: list.position,
          boardId: newBoard.id
        }
      });

      for (const card of list.cards) {
        const newCard = await prisma.card.create({
          data: {
            title: card.title,
            description: card.description,
            position: card.position,
            listId: newList.id,
            priority: card.priority,
            dueDate: card.dueDate,
            coverImage: card.coverImage,
            estimatedTime: card.estimatedTime,
            customFields: card.customFields
          }
        });

        // Duplicate checklists
        for (const chItem of card.checklists) {
          await prisma.checklistItem.create({
            data: {
              cardId: newCard.id,
              content: chItem.content,
              isCompleted: chItem.isCompleted,
              position: chItem.position
            }
          });
        }
      }
    }

    res.status(201).json(newBoard);
  } catch (error) {
    console.error('Duplicate board error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// LISTS Endpoints
// POST create list
router.post('/:boardId/lists', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, position } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const list = await prisma.list.create({
      data: {
        name,
        position: position || 1000,
        boardId
      }
    });

    notifyBoardUpdate(boardId, 'LIST_CREATE', list);
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update list
router.put('/:boardId/lists/:listId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { listId, boardId } = req.params;
    const { name, position, isArchived } = req.body;

    const dataObj = {};
    if (name !== undefined) dataObj.name = name;
    if (position !== undefined) dataObj.position = position;
    if (isArchived !== undefined) dataObj.isArchived = isArchived;

    const list = await prisma.list.update({
      where: { id: listId },
      data: dataObj
    });

    if (isArchived === false) {
      // Also unarchive all cards in this list
      await prisma.card.updateMany({
        where: { listId },
        data: { isArchived: false }
      });
    }

    notifyBoardUpdate(boardId, 'LIST_UPDATE', list);
    res.json(list);
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE list
router.delete('/:boardId/lists/:listId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { listId, boardId } = req.params;

    await prisma.list.delete({
      where: { id: listId }
    });

    notifyBoardUpdate(boardId, 'LIST_DELETE', { id: listId });
    res.json({ message: 'List deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH archive list (soft delete)
router.patch('/:boardId/lists/:listId/archive', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { listId, boardId } = req.params;
    console.log(`[ARCHIVE LIST] boardId = ${boardId}, listId = ${listId}`);

    const list = await prisma.list.update({
      where: { id: listId },
      data: { isArchived: true }
    });

    // Also archive all cards in this list
    await prisma.card.updateMany({
      where: { listId },
      data: { isArchived: true }
    });

    notifyBoardUpdate(boardId, 'LIST_ARCHIVE', { id: listId });
    res.json({ message: 'List archived', list });
  } catch (error) {
    console.error('Archive list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// CARDS Endpoints
// POST create card
router.post('/:boardId/lists/:listId/cards', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, listId } = req.params;
    const { title, position, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Card title is required' });
    }

    const card = await prisma.card.create({
      data: {
        title,
        position: position || 1000,
        listId,
        priority: priority || 'MEDIUM'
      },
      include: {
        assignees: true,
        checklists: true,
        dependencies: true
      }
    });

    // Run automation
    await runAutomations(boardId, card.id, 'CARD_CREATED', listId);

    // Trigger integrations
    sendSlackNotification(req.board.workspaceId, `🆕 Card Created in board *${req.board.name}*:\n*${title}* (Priority: ${priority || 'MEDIUM'})`).catch(e => console.error(e));
    sendDiscordNotification(req.board.workspaceId, {
      title: '🆕 Card Created',
      description: `**${title}**\nBoard: ${req.board.name}\nPriority: ${priority || 'MEDIUM'}`,
      color: 3066993
    }).catch(e => console.error(e));

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        boardId,
        cardId: card.id,
        action: 'CREATE_CARD',
        details: `Created task: "${title}"`
      }
    });

    const refreshedCard = await prisma.card.findUnique({
      where: { id: card.id },
      include: {
        assignees: { include: { user: { select: { id: true, username: true, name: true, avatarUrl: true } } } },
        checklists: true,
        dependencies: true
      }
    });

    notifyBoardUpdate(boardId, 'CARD_CREATE', refreshedCard);
    res.status(201).json(refreshedCard);
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update card (including drag & drop list moves)
router.put('/:boardId/cards/:cardId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId } = req.params;
    let { 
      title, description, position, listId, isArchived, dueDate, priority, 
      coverImage, estimatedTime, loggedTime, customFields, recurringCron, milestoneId, sprintId,
      githubPrUrl, githubCommits
    } = req.body;

    const oldCard = await prisma.card.findUnique({
      where: { id: cardId }
    });

    if (isArchived === false) {
      const currentListId = listId || oldCard.listId;
      const list = await prisma.list.findUnique({
        where: { id: currentListId }
      });
      if (list && list.isArchived) {
        const activeList = await prisma.list.findFirst({
          where: { boardId, isArchived: false },
          orderBy: { position: 'asc' }
        });
        if (activeList) {
          listId = activeList.id;
        }
      }
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        title,
        description,
        position,
        listId,
        isArchived,
        dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
        priority,
        coverImage,
        estimatedTime,
        loggedTime,
        customFields: customFields !== undefined ? (typeof customFields === 'string' ? customFields : JSON.stringify(customFields)) : undefined,
        recurringCron,
        milestoneId,
        sprintId,
        githubPrUrl,
        githubCommits: githubCommits !== undefined ? JSON.stringify(githubCommits) : undefined,
      },
      include: {
        assignees: { include: { user: { select: { id: true, username: true, name: true, avatarUrl: true } } } },
        checklists: true,
        dependencies: { include: { dependsOnCard: { select: { id: true, title: true } } } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, username: true, name: true, avatarUrl: true } } }
        }
      }
    });

    // Check if list changed (moved card)
    if (listId && listId !== oldCard.listId) {
      const newList = await prisma.list.findUnique({ where: { id: listId } });
      
      // Trigger integrations
      sendSlackNotification(req.board.workspaceId, `🔄 Card Moved in board *${req.board.name}*:\n*${updated.title}* → *${newList.name}*`).catch(e => console.error(e));
      sendDiscordNotification(req.board.workspaceId, {
        title: '🔄 Card Moved',
        description: `**${updated.title}** moved to **${newList.name}**\nBoard: ${req.board.name}`,
        color: 3447003
      }).catch(e => console.error(e));

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          boardId,
          cardId,
          action: 'MOVE_CARD',
          details: `Moved task "${updated.title}" to list "${newList.name}"`
        }
      });

      // Send Gmail Notifications to assignees
      if (updated.assignees && updated.assignees.length > 0) {
        for (const assignee of updated.assignees) {
          if (assignee.userId !== req.user.id && assignee.user.googleEmail) {
            sendEmail({
              userId: req.user.id,
              to: assignee.user.googleEmail,
              subject: `Task Status Changed: ${updated.title}`,
              text: `Hi ${assignee.user.name || assignee.user.username},\n\nThe task "${updated.title}" you are assigned to has been moved to "${newList.name}" in board "${req.board.name}" by ${req.user.name || req.user.username}.\n\nFrankloo`,
              htmlText: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dfe1e6; border-radius: 8px;">
                  <h3 style="color: #0052cc;">Task Status Updated</h3>
                  <p>Hi <strong>${assignee.user.name || assignee.user.username}</strong>,</p>
                  <p>A task you are assigned to was moved:</p>
                  <blockquote style="background: #f4f5f7; padding: 10px; border-left: 4px solid #0052cc; margin: 10px 0;">
                    <strong>${updated.title}</strong>
                  </blockquote>
                  <p>New Status: <strong>${newList.name}</strong></p>
                  <p>Moved by: ${req.user.name || req.user.username}</p>
                  <hr />
                  <span style="font-size: 11px; color: #8590a2;">Frankloo</span>
                </div>
              `
            }).catch(err => console.error('Gmail status update notification failed:', err));
          }
        }
      }

      // Run automations
      await runAutomations(boardId, cardId, 'CARD_MOVED', listId);
    } else if (isArchived !== undefined && isArchived !== oldCard.isArchived) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          boardId,
          cardId,
          action: isArchived ? 'ARCHIVE_CARD' : 'UNARCHIVE_CARD',
          details: isArchived ? `Archived task "${updated.title}"` : `Restored task "${updated.title}"`
        }
      });
    }

    notifyBoardUpdate(boardId, 'CARD_UPDATE', updated);
    res.json(updated);
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST Assign user
router.post('/:boardId/cards/:cardId/assign', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId } = req.params;
    const { userId } = req.body;

    const assignment = await prisma.cardAssignee.upsert({
      where: {
        cardId_userId: { cardId, userId }
      },
      create: {
        cardId,
        userId
      },
      update: {},
      include: {
        user: { select: { id: true, username: true, name: true, avatarUrl: true } }
      }
    });

    // Create Notification
    if (userId !== req.user.id) {
      const card = await prisma.card.findUnique({ where: { id: cardId } });
      const notification = await prisma.notification.create({
        data: {
          userId,
          content: `${req.user.name || req.user.username} assigned you to the task: "${card.title}"`
        }
      });
      notifyUser(userId, notification);

      // Send Gmail Notification
      const assignedUser = await prisma.user.findUnique({ where: { id: userId } });
      if (assignedUser && assignedUser.googleEmail) {
        sendEmail({
          userId: req.user.id,
          to: assignedUser.googleEmail,
          subject: `Task Assigned: ${card.title}`,
          text: `Hi ${assignedUser.name || assignedUser.username},\n\n${req.user.name || req.user.username} has assigned you to the task "${card.title}" on board "${req.board.name}".\n\nFrankloo`,
          htmlText: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dfe1e6; border-radius: 8px;">
              <h3 style="color: #0052cc;">New Task Assignment</h3>
              <p>Hi <strong>${assignedUser.name || assignedUser.username}</strong>,</p>
              <p><strong>${req.user.name || req.user.username}</strong> has assigned you to the task:</p>
              <blockquote style="background: #f4f5f7; padding: 10px; border-left: 4px solid #0052cc; margin: 10px 0;">
                <strong>${card.title}</strong>
              </blockquote>
              <p>Board: <em>${req.board.name}</em></p>
              <hr />
              <span style="font-size: 11px; color: #8590a2;">Frankloo</span>
            </div>
          `
        }).catch(err => console.error('Gmail assignment notification send error:', err));
      }
    }

    notifyBoardUpdate(boardId, 'ASSIGNEE_ADD', { cardId, assignment });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Server error assigning user' });
  }
});

// POST Unassign user
router.post('/:boardId/cards/:cardId/unassign', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId } = req.params;
    const { userId } = req.body;

    await prisma.cardAssignee.delete({
      where: {
        cardId_userId: { cardId, userId }
      }
    });

    notifyBoardUpdate(boardId, 'ASSIGNEE_REMOVE', { cardId, userId });
    res.json({ message: 'User unassigned' });
  } catch (error) {
    res.status(500).json({ error: 'Server error unassigning user' });
  }
});

// CHECKLISTS Endpoints
router.post('/:boardId/cards/:cardId/checklist', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId } = req.params;
    const { content, position } = req.body;

    const checklistItem = await prisma.checklistItem.create({
      data: {
        cardId,
        content,
        position: position || 0
      }
    });

    notifyBoardUpdate(boardId, 'CHECKLIST_CREATE', { cardId, checklistItem });
    res.status(201).json(checklistItem);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:boardId/checklist/:checklistId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, checklistId } = req.params;
    const { content, isCompleted, position } = req.body;

    const item = await prisma.checklistItem.update({
      where: { id: checklistId },
      data: { content, isCompleted, position }
    });

    notifyBoardUpdate(boardId, 'CHECKLIST_UPDATE', { cardId: item.cardId, checklistItem: item });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:boardId/checklist/:checklistId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, checklistId } = req.params;
    
    const item = await prisma.checklistItem.findUnique({ where: { id: checklistId } });
    if (!item) return res.status(404).json({ error: 'Not found' });

    await prisma.checklistItem.delete({
      where: { id: checklistId }
    });

    notifyBoardUpdate(boardId, 'CHECKLIST_DELETE', { cardId: item.cardId, checklistId });
    res.json({ message: 'Checklist item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// COMMENTS Endpoints
router.post('/:boardId/cards/:cardId/comments', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await prisma.comment.create({
      data: {
        cardId,
        userId: req.user.id,
        content
      },
      include: {
        user: { select: { id: true, username: true, name: true, avatarUrl: true } }
      }
    });

    // Parse Mentions e.g. @username
    const mentionRegex = /@(\w+)/g;
    let match;
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      const mentionedUser = await prisma.user.findUnique({ where: { username } });
      
      if (mentionedUser && mentionedUser.id !== req.user.id) {
        const notification = await prisma.notification.create({
          data: {
            userId: mentionedUser.id,
            content: `${req.user.name || req.user.username} mentioned you in a comment on card "${card.title}"`
          }
        });
        notifyUser(mentionedUser.id, notification);

        // Send Gmail Notification
        if (mentionedUser.googleEmail) {
          sendEmail({
            userId: req.user.id,
            to: mentionedUser.googleEmail,
            subject: `Comment Mention on "${card.title}"`,
            text: `Hi ${mentionedUser.name || mentionedUser.username},\n\n${req.user.name || req.user.username} mentioned you in a comment on task "${card.title}" in board "${req.board.name}":\n\n"${content}"\n\nFrankloo`,
            htmlText: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dfe1e6; border-radius: 8px;">
                <h3 style="color: #0052cc;">New Comment Mention</h3>
                <p>Hi <strong>${mentionedUser.name || mentionedUser.username}</strong>,</p>
                <p><strong>${req.user.name || req.user.username}</strong> mentioned you on the task <strong>${card.title}</strong>:</p>
                <blockquote style="background: #f4f5f7; padding: 12px; border-left: 4px solid #0052cc; margin: 10px 0; font-style: italic;">
                  "${content}"
                </blockquote>
                <p>Board: <em>${req.board.name}</em></p>
                <hr />
                <span style="font-size: 11px; color: #8590a2;">Frankloo</span>
              </div>
            `
          }).catch(err => console.error('Gmail mention email failed:', err));
        }
      }
    }

    notifyBoardUpdate(boardId, 'COMMENT_CREATE', { cardId, comment });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEPENDENCIES Endpoints
router.post('/:boardId/cards/:cardId/dependencies', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId } = req.params;
    const { dependsOnCardId } = req.body;

    if (cardId === dependsOnCardId) {
      return res.status(400).json({ error: 'A card cannot depend on itself' });
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        cardId,
        dependsOnCardId
      },
      include: {
        dependsOnCard: { select: { id: true, title: true } }
      }
    });

    notifyBoardUpdate(boardId, 'DEPENDENCY_CREATE', { cardId, dependency });
    res.status(201).json(dependency);
  } catch (error) {
    res.status(500).json({ error: 'Error creating dependency' });
  }
});

router.delete('/:boardId/cards/:cardId/dependencies/:depId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId, depId } = req.params;

    await prisma.taskDependency.delete({
      where: { id: depId }
    });

    notifyBoardUpdate(boardId, 'DEPENDENCY_DELETE', { cardId, depId });
    res.json({ message: 'Dependency removed' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting dependency' });
  }
});

// AUTOMATION RULES Endpoints
router.post('/:boardId/automations', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { triggerType, triggerVal, actionType, actionVal } = req.body;

    const rule = await prisma.automationRule.create({
      data: {
        boardId,
        triggerType,
        triggerVal,
        actionType,
        actionVal
      }
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Error creating automation rule' });
  }
});

router.get('/:boardId/automations', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const automations = await prisma.automationRule.findMany({
      where: { boardId: req.params.boardId }
    });
    res.json(automations);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching automations' });
  }
});

router.delete('/:boardId/automations/:ruleId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    await prisma.automationRule.delete({
      where: { id: req.params.ruleId }
    });
    res.json({ message: 'Automation rule deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting automation rule' });
  }
});

// MILESTONES Endpoints
router.post('/:boardId/milestones', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description, dueDate } = req.body;

    const milestone = await prisma.milestone.create({
      data: {
        boardId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    res.status(201).json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Error creating milestone' });
  }
});

router.get('/:boardId/milestones', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const milestones = await prisma.milestone.findMany({
      where: { boardId: req.params.boardId },
      include: { cards: true }
    });
    res.json(milestones);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching milestones' });
  }
});

router.put('/:boardId/milestones/:milestoneId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { title, description, dueDate, isCompleted } = req.body;
    const milestone = await prisma.milestone.update({
      where: { id: req.params.milestoneId },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        isCompleted
      }
    });
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Error updating milestone' });
  }
});

router.delete('/:boardId/milestones/:milestoneId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    await prisma.milestone.delete({
      where: { id: req.params.milestoneId }
    });
    res.json({ message: 'Milestone deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting milestone' });
  }
});

// POMODORO / TIME-TRACKING Session logging
router.post('/:boardId/cards/:cardId/pomodoro', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId, cardId } = req.params;
    const { duration } = req.body; // in minutes

    const session = await prisma.pomodoroSession.create({
      data: {
        userId: req.user.id,
        cardId,
        duration: duration || 25
      }
    });

    // Auto-update loggedTime on the card
    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        loggedTime: {
          increment: duration || 25
        }
      }
    });

    notifyBoardUpdate(boardId, 'POMODORO_SESSION_ADD', { cardId, loggedTime: card.loggedTime });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error saving Pomodoro session' });
  }
});

// GET archived items (lists and cards)
router.get('/:boardId/archived-items', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    console.log(`[GET ARCHIVED ITEMS] boardId = ${boardId}`);

    const lists = await prisma.list.findMany({
      where: { boardId, isArchived: true },
      orderBy: { position: 'asc' }
    });

    const cards = await prisma.card.findMany({
      where: {
        isArchived: true,
        list: { boardId }
      },
      include: {
        list: { select: { name: true } }
      },
      orderBy: { position: 'asc' }
    });

    console.log(`[GET ARCHIVED ITEMS] Found ${lists.length} lists, ${cards.length} cards`);
    res.json({ lists, cards });
  } catch (error) {
    console.error('Get archived items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
