import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Middleware to verify workspace membership
const checkWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace' });
    }

    req.workspaceMember = membership;
    next();
  } catch (error) {
    console.error('Check workspace membership error:', error);
    res.status(500).json({ error: 'Internal server error checking permissions' });
  }
};

// GET all documents in a workspace
router.get('/workspace/:workspaceId', authenticate, checkWorkspaceMember, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const documents = await prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    console.error('Get workspace documents error:', error);
    res.status(500).json({ error: 'Server error fetching documents' });
  }
});

// POST Create new document (or space/folder/template)
router.post('/workspace/:workspaceId', authenticate, checkWorkspaceMember, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      title,
      content,
      parentId,
      spaceId,
      folderId,
      type,
      status,
      tags,
      linkedResources
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    const doc = await prisma.document.create({
      data: {
        title,
        content: content || '',
        workspaceId,
        parentId: parentId || null,
        spaceId: spaceId || null,
        folderId: folderId || null,
        type: type || 'document',
        status: status || 'DRAFT',
        tags: tags ? JSON.stringify(tags) : '[]',
        linkedResources: linkedResources ? JSON.stringify(linkedResources) : '[]',
        comments: '[]',
        suggestions: '[]',
        revisions: '[]',
        authorId: req.user.id,
        authorName: req.user.name || req.user.username,
        views: 0
      }
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Server error creating document' });
  }
});

// PUT Update document
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      parentId,
      spaceId,
      folderId,
      type,
      status,
      isFavorite,
      tags,
      linkedResources,
      comments,
      suggestions,
      revisions
    } = req.body;

    const existingDoc = await prisma.document.findUnique({
      where: { id }
    });

    if (!existingDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify membership of workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: existingDoc.workspaceId,
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Capture version history revision if title or content is modified
    let revisionsUpdate = undefined;
    if (
      (content !== undefined && content !== existingDoc.content) ||
      (title !== undefined && title !== existingDoc.title)
    ) {
      try {
        const oldRevisions = JSON.parse(existingDoc.revisions || '[]');
        const newRevision = {
          id: Math.random().toString(36).substring(2, 9),
          userId: req.user.id,
          userName: req.user.name || req.user.username,
          title: existingDoc.title,
          content: existingDoc.content,
          updatedAt: new Date().toISOString()
        };
        revisionsUpdate = JSON.stringify([newRevision, ...oldRevisions].slice(0, 20));
      } catch (err) {
        console.error('Failed to create history revision:', err);
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        content: content !== undefined ? content : undefined,
        parentId: parentId !== undefined ? parentId : undefined,
        spaceId: spaceId !== undefined ? spaceId : undefined,
        folderId: folderId !== undefined ? folderId : undefined,
        type: type !== undefined ? type : undefined,
        status: status !== undefined ? status : undefined,
        isFavorite: isFavorite !== undefined ? isFavorite : undefined,
        tags: tags !== undefined ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : undefined,
        linkedResources: linkedResources !== undefined ? (typeof linkedResources === 'string' ? linkedResources : JSON.stringify(linkedResources)) : undefined,
        comments: comments !== undefined ? (typeof comments === 'string' ? comments : JSON.stringify(comments)) : undefined,
        suggestions: suggestions !== undefined ? (typeof suggestions === 'string' ? suggestions : JSON.stringify(suggestions)) : undefined,
        revisions: revisions !== undefined ? (typeof revisions === 'string' ? revisions : JSON.stringify(revisions)) : (revisionsUpdate !== undefined ? revisionsUpdate : undefined)
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Server error updating document' });
  }
});

// POST Increment view count
router.post('/:id/view', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const updated = await prisma.document.update({
      where: { id },
      data: { views: { increment: 1 } }
    });
    res.json({ views: updated.views });
  } catch (error) {
    console.error('Increment views error:', error);
    res.status(500).json({ error: 'Server error incrementing view' });
  }
});

// POST Add comment
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment content is required' });

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const comments = JSON.parse(doc.comments || '[]');
    const newComment = {
      id: Math.random().toString(36).substring(2, 9),
      userId: req.user.id,
      userName: req.user.name || req.user.username,
      avatarUrl: req.user.avatarUrl || null,
      content,
      createdAt: new Date().toISOString()
    };
    comments.push(newComment);

    const updated = await prisma.document.update({
      where: { id },
      data: { comments: JSON.stringify(comments) }
    });
    res.json(updated);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error adding comment' });
  }
});

// POST Add suggestion
router.post('/:id/suggestions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { originalText, suggestedText } = req.body;
    if (!suggestedText) return res.status(400).json({ error: 'Suggested text is required' });

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const suggestions = JSON.parse(doc.suggestions || '[]');
    const newSuggestion = {
      id: Math.random().toString(36).substring(2, 9),
      userId: req.user.id,
      userName: req.user.name || req.user.username,
      originalText: originalText || '',
      suggestedText,
      status: 'pending', // 'pending' | 'accepted' | 'rejected'
      createdAt: new Date().toISOString()
    };
    suggestions.push(newSuggestion);

    const updated = await prisma.document.update({
      where: { id },
      data: { suggestions: JSON.stringify(suggestions) }
    });
    res.json(updated);
  } catch (error) {
    console.error('Add suggestion error:', error);
    res.status(500).json({ error: 'Server error adding suggestion' });
  }
});

// PUT Manage suggestion (accept/reject)
router.put('/:id/suggestions/:suggestionId', authenticate, async (req, res) => {
  try {
    const { id, suggestionId } = req.params;
    const { status } = req.body; // 'accepted' | 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const suggestions = JSON.parse(doc.suggestions || '[]');
    const suggestionIdx = suggestions.findIndex(s => s.id === suggestionId);
    if (suggestionIdx === -1) return res.status(404).json({ error: 'Suggestion not found' });

    suggestions[suggestionIdx].status = status;

    let updatedContent = doc.content;
    if (status === 'accepted') {
      const { originalText, suggestedText } = suggestions[suggestionIdx];
      // Replace originalText with suggestedText in document content if matching
      if (originalText && updatedContent.includes(originalText)) {
        updatedContent = updatedContent.replace(originalText, suggestedText);
      } else {
        // Fallback: append or replace entire doc if originalText is not found/empty
        updatedContent = updatedContent + '\n\n' + suggestedText;
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        suggestions: JSON.stringify(suggestions),
        content: updatedContent
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Manage suggestion error:', error);
    res.status(500).json({ error: 'Server error managing suggestion' });
  }
});

// DELETE Document
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const existingDoc = await prisma.document.findUnique({
      where: { id }
    });

    if (!existingDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: existingDoc.workspaceId,
        userId: req.user.id
      }
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only owners/admins can delete workspace documents' });
    }

    await prisma.document.delete({
      where: { id }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Server error deleting document' });
  }
});

export default router;
