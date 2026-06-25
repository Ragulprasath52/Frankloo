import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, FileText, Save, Star, Eye, MessageSquare,
  History, Heading1, Heading2, Heading3, BookOpen, Clock, Tag, Link2,
  ChevronRight, ChevronDown, Globe,
  Compass, User, Settings, LayoutGrid,
  FolderPlus, Folder, Book, Search, Send, CheckSquare, CornerDownRight,
  RotateCcw, AlertTriangle, Lightbulb, Rocket, List, Table, Quote, Code,
  SeparatorHorizontal, Image, Video, AlertCircle, ArrowLeft, Target
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { DocumentItem } from '../store/useStore';

interface WikiDocsModuleProps {
  workspaceId: string;
  isEditor: boolean;
  onSelectBoard: (boardId: string) => void;
}

// Built-in Templates configuration
const TEMPLATES = [
  {
    name: 'Product Requirements Document (PRD)',
    icon: Rocket,
    iconColor: 'text-indigo-500 bg-indigo-500/10',
    description: 'Define feature specs, user stories, and release plans.',
    content: `# 🚀 Product Requirements Document: [Feature Name]

**Author:** @ProductManager
**Status:** 📝 DRAFT
**Target Release:** Q3 2026

---

## 🎯 Executive Summary
*Provide a concise summary of the feature, target audience, and key metrics.*

## 👥 User Personas & Problems
- **Persona A:** Developer needing fast API responses.
- **Problem:** Existing endpoints take >2 seconds to return queries.

## 🛠️ Functional Requirements
- [ ] Implement query caching layer.
- [ ] Optimize database indexes on Document table.
- [ ] Expose cache-control headers on GET endpoints.

## 📐 Architecture Design
> 💡 *Note: Keep it simple. Leverage memory cache before introducing Redis.*
`
  },
  {
    name: 'Sprint Retrospective',
    icon: RotateCcw,
    iconColor: 'text-emerald-500 bg-emerald-500/10',
    description: 'Review what went well, what did not, and next actions.',
    content: `# 🔄 Sprint Retrospective: Sprint [Number]

**Date:** 2026-06-22
**Facilitator:** @TeamLead

---

## 🚀 What Went Well?
- Completed Wiki database migration with zero downtime.
- Increased automated test coverage to 78%.

## 🛑 What Didn't Go Well?
- Slow response times on OAuth redirects.
- Missing mock data for analytics panel testing.

## 💡 Key Action Items
- [ ] Implement Redis replication tests.
- [ ] Document OAuth flow in tech docs.
`
  },
  {
    name: 'Standard Operating Procedure (SOP)',
    icon: CheckSquare,
    iconColor: 'text-amber-500 bg-amber-500/10',
    description: 'Create step-by-step guides for team tasks.',
    content: `# 📋 SOP: Deploying Release Builds

**Owner:** @DevOpsEngineer
**Last Updated:** 2026-06-22

---

## 🌟 Purpose
Ensure stable, error-free deployment of Frankloo application bundles to staging and production.

## 🚶 Step-by-Step Instructions
1. Run local lint tests:
   \`\`\`bash
   npm run lint
   \`\`\`
2. Generate Prisma Client:
   \`\`\`bash
   npx prisma generate
   \`\`\`
3. Push changes to database:
   \`\`\`bash
   npx prisma db push
   \`\`\`

> ⚠️ **CAUTION:** Never bypass migrations on production SQLite database files.
`
  },
  {
    name: 'Technical Documentation',
    icon: Code,
    iconColor: 'text-blue-500 bg-blue-500/10',
    description: 'Detail code architectures, setup commands, and APIs.',
    content: `# 🛠️ Technical Documentation: Wiki & Docs Engine

**Lead Engineer:** @TechArchitect
**Tech Stack:** React, TypeScript, SQLite, Prisma, Node.js

---

## 🏗️ Architecture Overview
The Wiki & Docs engine stores documents as flat records in SQLite. Nesting is resolved hierarchically in memory using \`parentId\`, \`spaceId\`, and \`folderId\`.

## 🚀 Dev Setup
\`\`\`bash
cd backend
npm install
npx prisma generate
npm run dev
\`\`\`

## 🔌 API Endpoints
- \`GET /api/documents/workspace/:id\` - Retrieves all workspace documentation nodes.
- \`POST /api/documents/:id/comments\` - Creates an inline comment.
`
  },
  {
    name: 'Onboarding Guide',
    icon: BookOpen,
    iconColor: 'text-purple-500 bg-purple-500/10',
    description: 'Help new team members get set up quickly.',
    content: `# 🎒 Onboarding Guide: Engineering Team

Welcome to the team! We are excited to have you build the future of workspace collaboration tools.

---

## 🏁 Day 1 Checklist
- [ ] Access Slack & Discord workspace channels.
- [ ] Set up local development environment (Node.js 18+).
- [ ] Review the core code layout in [Architecture Design](link).

## 🔗 Useful Links
- [Figma Design System](https://figma.com)
- [Wiki Home Dashboard](http://localhost:5173/)
`
  },
  {
    name: 'Team Handbook',
    icon: Book,
    iconColor: 'text-rose-500 bg-rose-500/10',
    description: 'Document company rules, values, and policies.',
    content: `# 📖 Team Handbook: Frankloo Core Team

**Version:** 1.2
**Last Modified:** Q2 2026

---

## 🌟 Our Core Philosophy
1. **Transparency:** Default to documentation over private messaging.
2. **Speed & Design:** Deliver lag-free, visually stunning interfaces.

## 💼 Vacation & Benefits
- Flexible hours and unlimited PTO (minimum 20 days mandatory per year).
- Hardware allowance of $3,000 every two years.
`
  },
  {
    name: 'Meeting Notes',
    icon: Clock,
    iconColor: 'text-teal-500 bg-teal-500/10',
    description: 'Keep track of meeting discussions and outcomes.',
    content: `# 📅 Meeting Notes: [Topic Name]

**Date:** 2026-06-22
**Attendees:** @Nancy, @Raghul, @Team
**Goal:** Align on dashboard sidebar widgets and search features.

---

## 💡 Topics Discussed
- Redesigning the Left hierarchy sidebar for infinite nesting folders.
- Storing tags and revisions inside SQLite as JSON string arrays.

## 🎯 Next Action Items
- [ ] Complete Prisma schema update (@Raghul)
- [ ] Create search-filtering logic in UI (@Nancy)
`
  },
  {
    name: 'Project Plan',
    icon: Target,
    iconColor: 'text-cyan-500 bg-cyan-500/10',
    description: 'Track timelines, project goals, and team roles.',
    content: `# 🎯 Project Plan: Wiki Redesign

**Project Lead:** @ProductManager
**Timeline:** June 22 - July 15

---

## 📅 Milestones
- **M1: Schema & Backend Routes:** Completed (June 22)
- **M2: UI Workspace Tree Navigation:** In Progress (June 25)
- **M3: Templates & Suggestions Panel:** Target (July 05)

## 👥 Roles
- Frontend Developer: @Nancy
- Backend Architect: @Raghul
`
  },
  {
    name: 'Architecture Design',
    icon: Settings,
    iconColor: 'text-orange-500 bg-orange-500/10',
    description: 'Design databases, microservices, and system flows.',
    content: `# 🏗️ Architecture Design: Real-time Notifications

**Author:** @Architect

---

## 🔗 Component diagram
\`\`\`
[Vite Frontend Client] ──(WebSockets)──> [Express Server]
                                              │ (Prisma)
                                              ▼
                                       [SQLite Database]
\`\`\`

## 💾 Schema Setup
We use SQLite as our main store. Real-time notifications are pushed over standard websocket channels.
`
  },
  {
    name: 'Incident Report',
    icon: AlertTriangle,
    iconColor: 'text-red-500 bg-red-500/10',
    description: 'Analyze production bugs and outline preventions.',
    content: `# 🚨 Incident Report: Staging Database Lock

**Incident Date:** 2026-06-22
**Severity:** High (Staging unavailable for 12 minutes)

---

## ⏱️ Timeline
- **11:00 AM:** Dev server locks up during concurrent Prisma generates.
- **11:04 AM:** Port 5000 identified as locked. Server PID killed.
- **11:12 AM:** Prisma generates successfully, node dev server restarted.

## 🔍 Root Cause Analysis
Node process locks native DLL files (\`query_engine\`) in Windows during execution, blocking schema updates.

## 🛡️ Preventative Action Plan
- [ ] Add deployment script to check port lock and close PIDs.
`
  }
];

export default function WikiDocsModule({ workspaceId, isEditor, onSelectBoard }: WikiDocsModuleProps) {
  const {
    documents,
    createDocument,
    updateDocument,
    deleteDocument,
    incrementDocViews,
    addDocComment,
    addDocSuggestion,
    respondToDocSuggestion,
    currentWorkspace,
    addToast,
    showConfirm
  } = useStore();

  // State managers
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'edit' | 'preview'>('preview');
  
  // Sidebar expand/collapse
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Document Fields
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docStatus, setDocStatus] = useState<'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED'>('DRAFT');
  
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isTreeSidebarOpen, setIsTreeSidebarOpen] = useState(() => {
    return window.innerWidth >= 768;
  });
  
  // Creation state
  const [creationModalOpen, setCreationModalOpen] = useState(false);
  const [creationType, setCreationType] = useState<'space' | 'folder' | 'document'>('document');
  const [creationTitle, setCreationTitle] = useState('');
  const [creationParentId, setCreationParentId] = useState<string | null>(null);

  // Right sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'comments' | 'suggestions' | 'history'>('comments');
  const [commentInput, setCommentInput] = useState('');
  
  // Suggestions inputs
  const [suggestOriginal, setSuggestOriginal] = useState('');
  const [suggestReplacement, setSuggestReplacement] = useState('');
  
  // Linked resource inputs
  const [linkResourceModalOpen, setLinkResourceModalOpen] = useState(false);
  const [linkType, setLinkType] = useState<'BOARD' | 'TASK' | 'GOAL' | 'MILESTONE'>('TASK');
  const [linkItemId, setLinkItemId] = useState('');

  // Selected active document object
  const activeDoc = documents.find(d => d.id === selectedDocId);

  // Initialize view and increment count on selection
  useEffect(() => {
    if (activeDoc) {
      setDocTitle(activeDoc.title);
      setDocContent(activeDoc.content);
      setDocStatus((activeDoc.status as any) || 'DRAFT');
      
      // Track views increment
      incrementDocViews(activeDoc.id);
    }
  }, [selectedDocId]);

  // Safe parsing helper
  const safeParseJSON = (jsonString: string | undefined | null, fallback: any = []) => {
    if (!jsonString) return fallback;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return fallback;
    }
  };

  // Node tree expand toggling
  const toggleNodeExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Creation handler
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creationTitle.trim()) return;

    let parentSpaceId: string | null = null;
    let parentFolderId: string | null = null;

    if (creationParentId) {
      const parentNode = documents.find(d => d.id === creationParentId);
      if (parentNode) {
        if (parentNode.type === 'space') {
          parentSpaceId = parentNode.id;
        } else if (parentNode.type === 'folder') {
          parentFolderId = parentNode.id;
          parentSpaceId = parentNode.spaceId || null;
        } else {
          // Document parent
          parentFolderId = parentNode.folderId || null;
          parentSpaceId = parentNode.spaceId || null;
        }
      }
    }

    try {
      const defaultContent = creationType === 'document'
        ? `# ${creationTitle}\n\nStart writing documentation here…`
        : '';
        
      const created = await createDocument(
        workspaceId,
        creationTitle,
        defaultContent,
        creationParentId,
        parentSpaceId,
        parentFolderId,
        creationType,
        'DRAFT',
        [],
        []
      );

      setCreationTitle('');
      setCreationModalOpen(false);
      
      // Auto expand parent
      if (creationParentId) {
        setExpandedNodes(prev => ({ ...prev, [creationParentId]: true }));
      }
      
      if (creationType === 'document') {
        setSelectedDocId(created.id);
        setIsEditingDoc(false);
      }
    } catch (err) {
      console.error('Create document node error:', err);
    }
  };

  // Document saving
  const handleSaveDocument = async () => {
    if (!selectedDocId) return;
    try {
      await updateDocument(selectedDocId, {
        title: docTitle,
        content: docContent,
        status: docStatus
      });
      setIsEditingDoc(false);
    } catch (err) {
      console.error('Update doc error:', err);
    }
  };

  // Star toggling
  const handleToggleFavorite = async () => {
    if (!activeDoc) return;
    try {
      await updateDocument(activeDoc.id, {
        isFavorite: !activeDoc.isFavorite
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Status updating
  const handleStatusChange = async (status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED') => {
    setDocStatus(status);
    if (!selectedDocId) return;
    try {
      await updateDocument(selectedDocId, { status });
    } catch (err) {
      console.error(err);
    }
  };

  // Adding Comment
  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedDocId) return;
    try {
      await addDocComment(selectedDocId, commentInput);
      setCommentInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Adding Suggestion
  const handleAddSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestReplacement.trim() || !selectedDocId) return;
    try {
      await addDocSuggestion(selectedDocId, suggestOriginal, suggestReplacement);
      setSuggestOriginal('');
      setSuggestReplacement('');
    } catch (err) {
      console.error(err);
    }
  };

  // Responding to Suggestion
  const handleSuggestionResolve = async (suggestionId: string, action: 'accepted' | 'rejected') => {
    if (!selectedDocId) return;
    try {
      await respondToDocSuggestion(selectedDocId, suggestionId, action);
    } catch (err) {
      console.error(err);
    }
  };

  // Version Restore
  const handleRestoreRevision = async (rev: any) => {
    if (!selectedDocId) return;
    const confirmed = await showConfirm(
      'Restore Version',
      'Are you sure you want to restore this version? This will create a new save containing the restored text.',
      'Restore',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      await updateDocument(selectedDocId, {
        title: rev.title,
        content: rev.content
      });
      setDocTitle(rev.title);
      setDocContent(rev.content);
      addToast('Version Restored', 'Document version restored successfully!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Linked Resources Handlers
  const handleAddLinkedResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !linkItemId) return;
    
    // Find metadata name
    let name = 'Resource';
    if (linkType === 'BOARD') {
      name = currentWorkspace?.boards?.find(b => b.id === linkItemId)?.name || 'Board';
    } else if (linkType === 'GOAL') {
      name = currentWorkspace?.goals?.find(g => g.id === linkItemId)?.title || 'Goal';
    } else if (linkType === 'TASK') {
      const cards = currentWorkspace?.boards?.flatMap(b => b.lists.flatMap(l => l.cards)) || [];
      name = cards.find(c => c.id === linkItemId)?.title || 'Task';
    } else if (linkType === 'MILESTONE') {
      const milestones = currentWorkspace?.boards?.flatMap(b => b.milestones) || [];
      name = milestones.find(m => m.id === linkItemId)?.title || 'Milestone';
    }

    const currentLinks = safeParseJSON(activeDoc.linkedResources, []);
    // Prevent duplicates
    if (currentLinks.some((l: any) => l.id === linkItemId)) {
      setLinkResourceModalOpen(false);
      return;
    }

    const updatedLinks = [...currentLinks, { type: linkType, id: linkItemId, name }];
    try {
      await updateDocument(activeDoc.id, {
        linkedResources: JSON.stringify(updatedLinks)
      });
      setLinkItemId('');
      setLinkResourceModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveLinkedResource = async (resourceId: string) => {
    if (!activeDoc) return;
    const currentLinks = safeParseJSON(activeDoc.linkedResources, []);
    const updatedLinks = currentLinks.filter((l: any) => l.id !== resourceId);
    try {
      await updateDocument(activeDoc.id, {
        linkedResources: JSON.stringify(updatedLinks)
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Instantiating templates
  const handleInstantiateTemplate = async (template: typeof TEMPLATES[0]) => {
    try {
      const created = await createDocument(
        workspaceId,
        template.name,
        template.content,
        null,
        null,
        null,
        'document',
        'DRAFT',
        [template.name.toLowerCase().includes('technical') ? '#architecture' : '#meeting'],
        []
      );
      setSelectedDocId(created.id);
      setIsEditingDoc(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Render a simple list of subpages hierarchy recursively
  const renderTree = (parentId: string | null, depth = 0) => {
    const children = documents.filter(doc => doc.parentId === parentId);
    if (children.length === 0) return null;

    // Sort by type: spaces first, then folders, then documents
    const sorted = [...children].sort((a, b) => {
      const score = (node: DocumentItem) => (node.type === 'space' ? 0 : node.type === 'folder' ? 1 : 2);
      return score(a) - score(b);
    });

    return (
      <div className="flex flex-col space-y-0.5">
        {sorted.map(node => {
          const isExpanded = expandedNodes[node.id] || false;
          const nodeChildren = documents.filter(doc => doc.parentId === node.id);
          const hasChildren = nodeChildren.length > 0;
          const isSelected = selectedDocId === node.id;

          let icon = FileText;
          let colorClass = 'text-gray-400 dark:text-gray-500';
          if (node.type === 'space') {
            icon = Globe;
            colorClass = 'text-indigo-500 dark:text-indigo-400';
          } else if (node.type === 'folder') {
            icon = Folder;
            colorClass = 'text-amber-500 dark:text-amber-400';
          }

          return (
            <div key={node.id} className="flex flex-col">
              <div
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                onClick={() => {
                  if (node.type === 'document') {
                    setSelectedDocId(node.id);
                    setIsEditingDoc(false);
                  } else {
                    // Autoexpand space/folder on click
                    setExpandedNodes(prev => ({ ...prev, [node.id]: !prev[node.id] }));
                  }
                }}
                className={`group flex items-center justify-between py-1.5 pr-2 rounded cursor-pointer transition-colors text-sm ${
                  isSelected
                    ? 'bg-[#e4ebf8] dark:bg-[#1a2c4e] text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {/* Expand arrow */}
                  <button
                    onClick={(e) => toggleNodeExpand(node.id, e)}
                    className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 text-[#8590a2] ${
                      hasChildren ? 'opacity-100' : 'opacity-0 cursor-default'
                    }`}
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>

                  {/* Document type Icon */}
                  {React.createElement(icon, { className: `w-4 h-4 shrink-0 ${colorClass}` })}
                  <span className="truncate text-xs md:text-sm">{node.title}</span>
                </div>

                {/* Inline Action Buttons */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 gap-1 shrink-0">
                  {isEditor && (node.type === 'space' || node.type === 'folder') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationParentId(node.id);
                        setCreationType('document');
                        setCreationModalOpen(true);
                      }}
                      className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded text-blue-500"
                      title="Add child page"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isEditor && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const nodeType = node.type || 'page';
                        const confirmed = await showConfirm(
                          `Delete ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
                          `Are you sure you want to delete this ${nodeType}?`,
                          'Delete',
                          'Cancel'
                        );
                        if (confirmed) {
                          deleteDocument(node.id);
                          if (selectedDocId === node.id) setSelectedDocId(null);
                        }
                      }}
                      className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500"
                      title="Delete node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Recursive child render */}
              {isExpanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  // Custom visual markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-gray-400 italic">No content. Click Edit to add text.</p>;

    const lines = text.split('\n');
    let insideCode = false;
    let codeLines: string[] = [];
    
    let insideTable = false;
    let tableRows: string[][] = [];

    const elements: React.ReactNode[] = [];

    const parseInlineStyles = (txt: string) => {
      // Bold **txt**
      const boldRegex = /\*\*(.*?)\*\*/g;
      // Italics *txt*
      const italicRegex = /\*(.*?)\*/g;
      // Link [txt](url)
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      // Code tags `code`
      const inlineCodeRegex = /`(.*?)`/g;

      // Quick parsing for bold, italics, links, and inline code tags
      // We will perform basic tags replacement for simple visual layouts
      // For standard HTML display:
      return <span dangerouslySetInnerHTML={{
        __html: txt
          .replace(boldRegex, '<strong>$1</strong>')
          .replace(italicRegex, '<em>$1</em>')
          .replace(inlineCodeRegex, '<code class="bg-[#f1f2f4] dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs font-semibold">$1</code>')
          .replace(linkRegex, '<a href="$2" target="_blank" class="text-blue-500 dark:text-blue-400 underline hover:text-blue-600">$1</a>')
      }} />;
    };

    const flushTable = (index: number) => {
      if (tableRows.length === 0) return null;
      const headers = tableRows[0];
      const dataRows = tableRows.slice(1).filter(r => !r.every(c => c.trim().startsWith('-'))); // Filter out divider row |---|---|
      
      const el = (
        <div key={`table-${index}`} className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-800 text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-white/5">
                {headers.map((h, i) => (
                  <th key={i} className="border border-slate-300 dark:border-slate-850 px-4 py-2 text-left font-semibold">
                    {parseInlineStyles(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-white/5">
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-slate-300 dark:border-slate-800 px-4 py-2">
                      {parseInlineStyles(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      insideTable = false;
      return el;
    };

    lines.forEach((line, index) => {
      // 1. Code Block starts/ends
      if (line.trim().startsWith('```')) {
        if (insideCode) {
          // Flush code block
          const codeText = codeLines.join('\n');
          elements.push(
            <div key={`code-${index}`} className="my-4 rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto relative group">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeText);
                  addToast('Copied to Clipboard', 'Code block copied successfully.', 'success');
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-all text-[10px] text-white font-medium"
              >
                Copy
              </button>
              <pre><code>{codeText}</code></pre>
            </div>
          );
          codeLines = [];
          insideCode = false;
        } else {
          insideCode = true;
        }
        return;
      }

      if (insideCode) {
        codeLines.push(line);
        return;
      }

      // 2. Table parsing
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        insideTable = true;
        // Split and filter out empty cells from outer pipes
        const cells = line.split('|').slice(1, -1);
        tableRows.push(cells);
        return;
      } else if (insideTable) {
        // Table ended, flush it
        const tbl = flushTable(index);
        if (tbl) elements.push(tbl);
      }

      // 3. Headings
      if (line.startsWith('# ')) {
        elements.push(<h1 key={index} className="text-2xl font-extrabold mt-6 mb-3 border-b pb-1 text-[#172b4d] dark:text-[#b6c2cf]">{parseInlineStyles(line.substring(2))}</h1>);
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(<h2 key={index} className="text-xl font-bold mt-5 mb-2 text-[#172b4d] dark:text-[#b6c2cf]">{parseInlineStyles(line.substring(3))}</h2>);
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(<h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-[#172b4d] dark:text-[#b6c2cf]">{parseInlineStyles(line.substring(4))}</h3>);
        return;
      }

      // 4. Quotations & Callouts
      if (line.startsWith('> ')) {
        const quoteContent = line.substring(2).trim();
        // Check for premium callout boxes
        if (quoteContent.startsWith('💡')) {
          elements.push(
            <div key={index} className="my-4 flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 text-blue-950 dark:text-blue-200">
              <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm font-medium leading-relaxed">{parseInlineStyles(quoteContent.substring(1).trim())}</div>
            </div>
          );
        } else if (quoteContent.startsWith('⚠️')) {
          elements.push(
            <div key={index} className="my-4 flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 text-amber-950 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm font-medium leading-relaxed">{parseInlineStyles(quoteContent.substring(1).trim())}</div>
            </div>
          );
        } else if (quoteContent.startsWith('🚀')) {
          elements.push(
            <div key={index} className="my-4 flex gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 text-emerald-950 dark:text-emerald-200">
              <Rocket className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm font-medium leading-relaxed">{parseInlineStyles(quoteContent.substring(1).trim())}</div>
            </div>
          );
        } else if (quoteContent.startsWith('🚨')) {
          elements.push(
            <div key={index} className="my-4 flex gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 text-red-950 dark:text-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm font-medium leading-relaxed">{parseInlineStyles(quoteContent.substring(1).trim())}</div>
            </div>
          );
        } else {
          elements.push(
            <blockquote key={index} className="my-4 border-l-4 border-slate-350 dark:border-slate-700 pl-4 py-1 italic text-slate-550 dark:text-slate-400">
              {parseInlineStyles(quoteContent)}
            </blockquote>
          );
        }
        return;
      }

      // 5. Checklist Items (Interactive Toggle support!)
      const checklistMatch = line.match(/^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/);
      if (checklistMatch) {
        const indent = checklistMatch[1];
        const isChecked = checklistMatch[2].toLowerCase() === 'x';
        const itemText = checklistMatch[3];

        const handleCheckboxClick = async () => {
          if (!isEditor || !selectedDocId) return;
          // Toggle [ ] <-> [x] in the docContent directly and save to db
          const textLines = text.split('\n');
          const targetLine = textLines[index];
          const newStatus = isChecked ? ' ' : 'x';
          textLines[index] = targetLine.replace(/\[[ xX]\]/, `[${newStatus}]`);
          const newContent = textLines.join('\n');
          
          setDocContent(newContent);
          try {
            await updateDocument(selectedDocId, { content: newContent });
          } catch (err) {
            console.error(err);
          }
        };

        elements.push(
          <div key={index} style={{ paddingLeft: `${indent.length * 10}px` }} className="flex items-center gap-2 py-0.5">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={handleCheckboxClick}
              disabled={!isEditor}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-default"
            />
            <span className={`text-sm ${isChecked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-[#172b4d] dark:text-[#b6c2cf]'}`}>
              {parseInlineStyles(itemText)}
            </span>
          </div>
        );
        return;
      }

      // 6. Dividers
      if (line.trim() === '---') {
        elements.push(<hr key={index} className="my-6 border-[#dfe1e6] dark:border-[#a6c5e229]" />);
        return;
      }

      // 7. Bullet lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <ul key={index} className="list-disc pl-6 py-0.5">
            <li className="text-sm text-[#172b4d] dark:text-[#b6c2cf]">
              {parseInlineStyles(line.substring(2))}
            </li>
          </ul>
        );
        return;
      }

      // 8. Numbered lists
      const numMatch = line.match(/^\d+\.\s(.*)$/);
      if (numMatch) {
        elements.push(
          <ol key={index} className="list-decimal pl-6 py-0.5">
            <li className="text-sm text-[#172b4d] dark:text-[#b6c2cf]">
              {parseInlineStyles(numMatch[1])}
            </li>
          </ol>
        );
        return;
      }

      // 9. Standard paragraphs or empty spaces
      if (line.trim() === '') {
        elements.push(<div key={index} className="h-2" />);
      } else {
        elements.push(<p key={index} className="text-sm text-[#172b4d] dark:text-[#b6c2cf] leading-relaxed my-1.5">{parseInlineStyles(line)}</p>);
      }
    });

    return <div className="space-y-1">{elements}</div>;
  };

  // Toolbar action inserter
  const insertTextAtCursor = (markdownToInsert: string) => {
    const textarea = document.getElementById('wiki-doc-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      setDocContent(prev => prev + '\n' + markdownToInsert);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const updated = before + markdownToInsert + after;
    setDocContent(updated);
    
    // Maintain cursor focus
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + markdownToInsert.length;
      textarea.selectionEnd = start + markdownToInsert.length;
    }, 50);
  };

  // Template Quick Actions
  const handleToolbarInsert = (type: string) => {
    switch (type) {
      case 'h1': insertTextAtCursor('\n# Heading 1\n'); break;
      case 'h2': insertTextAtCursor('\n## Heading 2\n'); break;
      case 'h3': insertTextAtCursor('\n### Heading 3\n'); break;
      case 'divider': insertTextAtCursor('\n---\n'); break;
      case 'quote': insertTextAtCursor('\n> Quote text\n'); break;
      case 'callout_idea': insertTextAtCursor('\n> 💡 Tip: Keep writing here...\n'); break;
      case 'callout_warn': insertTextAtCursor('\n> ⚠️ Warning: Crucial details here...\n'); break;
      case 'checklist': insertTextAtCursor('\n- [ ] Checklist item\n'); break;
      case 'bullet': insertTextAtCursor('\n- Bullet item\n'); break;
      case 'code': insertTextAtCursor('\n\`\`\`javascript\nconsole.log("Hello, world!");\n\`\`\`\n'); break;
      case 'table': insertTextAtCursor('\n| Column 1 | Column 2 |\n|---|---|\n| Item A | Item B |\n'); break;
      case 'link': insertTextAtCursor('[Frankloo Docs](http://localhost:5173/)'); break;
      case 'image': insertTextAtCursor('![Alt text](https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80)'); break;
      case 'video': insertTextAtCursor('![Video tutorial](https://www.w3schools.com/html/mov_bbb.mp4)'); break;
    }
  };

  // Filtering documents list by search + tag category
  const getFilteredDocs = () => {
    return documents.filter(doc => {
      // Must belong to this workspace
      if (doc.workspaceId !== workspaceId) return false;

      // Filter by tag category chip if selected
      if (selectedCategoryFilter) {
        const docTags = safeParseJSON(doc.tags, []);
        if (!docTags.includes(selectedCategoryFilter)) return false;
      }

      // Filter by global search query
      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesContent = doc.content.toLowerCase().includes(query);
        const matchesAuthor = doc.authorName && doc.authorName.toLowerCase().includes(query);
        const matchesTags = doc.tags && doc.tags.toLowerCase().includes(query);
        return matchesTitle || matchesContent || matchesAuthor || matchesTags;
      }

      return true;
    });
  };

  const filteredDocs = getFilteredDocs();
  const favoriteDocs = documents.filter(d => d.workspaceId === workspaceId && d.isFavorite);
  const recentDocs = [...documents]
    .filter(d => d.workspaceId === workspaceId && d.type === 'document')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Extract all unique tags in workspace to show chips
  const allWorkspaceTags = Array.from(
    new Set(
      documents
        .filter(d => d.workspaceId === workspaceId)
        .flatMap(d => safeParseJSON(d.tags, []))
    )
  );

  return (
    <div className="flex h-[calc(100vh-48px)] select-none bg-white dark:bg-[#1d2125] overflow-hidden text-[#172b4d] dark:text-[#b6c2cf] relative">
      {/* ── LEFT SIDEBAR ── */}
      {isTreeSidebarOpen && (
        <div className="w-64 border-r border-[#dfe1e6] dark:border-[#a6c5e229] flex flex-col h-full bg-[#f4f5f7] dark:bg-[#181a1d] shrink-0 z-20 absolute md:relative inset-y-0 left-0 shadow-xl md:shadow-none">
        
        {/* Navigation Actions */}
        <div className="p-3 border-b border-[#dfe1e6] dark:border-[#a6c5e229] space-y-2">
          {/* Global Home Button */}
          <button
            onClick={() => setSelectedDocId(null)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              !selectedDocId
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Knowledge Base Home</span>
          </button>

          {/* Quick Filter Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8590a2]" />
            <input
              type="text"
              placeholder="Search wiki pages…"
              value={globalSearchQuery}
              onChange={e => setGlobalSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-[#8590a2]"
            />
          </div>
        </div>

        {/* Tree hierarchy container */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <div className="flex items-center justify-between px-2 pb-1 border-b border-[#dfe1e6]/50 dark:border-[#a6c5e229]/20">
            <span className="text-[10px] font-bold text-[#8590a2] uppercase tracking-widest">Document Hierarchy</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsTreeSidebarOpen(false)}
                className="md:hidden p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-[#8590a2] hover:text-red-500 shrink-0"
                title="Close tree"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {isEditor && (
                <button
                  onClick={() => {
                    setCreationParentId(null);
                    setCreationType('document');
                    setCreationModalOpen(true);
                  }}
                  className="p-1 hover:bg-[#dfe1e6] dark:hover:bg-white/10 rounded text-blue-600 dark:text-blue-400"
                  title="Create root document"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {documents.filter(d => d.workspaceId === workspaceId).length === 0 ? (
            <div className="py-8 px-2 text-center text-xs text-[#8590a2]">
              <p className="font-semibold mb-1">No documents yet</p>
              <p className="opacity-70 text-[10px]">Create spaces, folders, or pages to structure your documentation hierarchy.</p>
            </div>
          ) : (
            // Render root nodes (nodes where parentId is null/empty)
            <div className="space-y-0.5">
              {renderTree(null, 0)}
            </div>
          )}
        </div>

        {/* Quick links settings at bottom of sidebar */}
        <div className="p-3 border-t border-[#dfe1e6] dark:border-[#a6c5e229] flex items-center justify-between text-xs text-[#8590a2]">
          <span className="flex items-center gap-1">
            <Book className="w-3.5 h-3.5" />
            <span>Frankloo Wiki v2.0</span>
          </span>
          {isEditor && (
            <button
              onClick={() => {
                setCreationParentId(null);
                setCreationType('space');
                setCreationModalOpen(true);
              }}
              className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
            >
              <FolderPlus className="w-3 h-3" /> Space
            </button>
          )}
        </div>
      </div>
    )}

      {/* ── CENTER AREA: DASHBOARD OR WRITER ── */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#1d2125] overflow-hidden">
        {/* Responsive tree toggle header bar */}
        <div className="px-4 py-2 border-b border-[#dfe1e6]/60 dark:border-[#a6c5e229]/20 flex items-center justify-between bg-slate-50/50 dark:bg-black/10 shrink-0">
          <button
            onClick={() => setIsTreeSidebarOpen(!isTreeSidebarOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/10"
            title="Toggle Docs Tree"
          >
            <List className="w-3.5 h-3.5" />
            <span>{isTreeSidebarOpen ? 'Hide Docs Tree' : 'Show Docs Tree'}</span>
          </button>
        </div>
        
        {!selectedDocId ? (
          /* ═════════════════════════════════════════════════════════════
             KNOWLEDGE BASE HOME DASHBOARD
             ═════════════════════════════════════════════════════════════ */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
            
            {/* Header announcement banner */}
            <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border border-blue-500/20 shadow-sm relative overflow-hidden">
              <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
                <BookOpen className="w-24 h-24 text-blue-600" />
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-600 text-white mb-3">
                Knowledge Hub
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#172b4d] dark:text-[#b6c2cf] mb-1">
                Welcome to the Workspace Knowledge Base
              </h1>
              <p className="text-sm text-[#44546f] dark:text-[#9fadbc] max-w-2xl leading-relaxed">
                Centralize your team’s product specs, technical documentation, standard procedures (SOPs), retrospective logs, and handbook guides. Choose a template below or browse existing workspace assets.
              </p>
            </div>

            {/* Global categories tagging chips */}
            {allWorkspaceTags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8590a2] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Filter by Category Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedCategoryFilter(null)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      !selectedCategoryFilter
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-[#f1f2f4] dark:bg-white/10 hover:bg-[#e4e6ea] dark:hover:bg-white/20'
                    }`}
                  >
                    All Categories
                  </button>
                  {allWorkspaceTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === tag ? null : tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        selectedCategoryFilter === tag
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 hover:bg-indigo-100/50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Templates gallery grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8590a2] flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" /> Documentation Templates Gallery
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATES.slice(0, 6).map((tmpl, idx) => {
                  const IconComp = tmpl.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleInstantiateTemplate(tmpl)}
                      className="group cursor-pointer bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] hover:border-blue-500/50 rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg ${tmpl.iconColor}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold text-blue-500 group-hover:underline flex items-center gap-0.5">
                            Use <Plus className="w-3 h-3" />
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-[#172b4d] dark:text-[#b6c2cf] leading-snug">
                          {tmpl.name}
                        </h4>
                        <p className="text-xs text-[#44546f] dark:text-[#9fadbc] leading-relaxed line-clamp-2">
                          {tmpl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Favorites & Recent double grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Starred documents */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8590a2] flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-500" /> Starred & Pinned Docs
                </h3>
                {favoriteDocs.length === 0 ? (
                  <div className="border border-dashed border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-6 text-center text-xs text-[#8590a2]">
                    No starred documents yet. Star important guides to pin them here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favoriteDocs.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className="flex items-center justify-between p-3 bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-lg hover:shadow-sm cursor-pointer transition-shadow"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-xs font-semibold truncate text-[#172b4d] dark:text-[#b6c2cf]">
                            {doc.title}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {doc.status || 'DRAFT'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent revisions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8590a2] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Recently Modified
                </h3>
                {recentDocs.length === 0 ? (
                  <div className="border border-dashed border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-6 text-center text-xs text-[#8590a2]">
                    No documents created in this workspace yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentDocs.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className="flex items-center justify-between p-3 bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-lg hover:shadow-sm cursor-pointer transition-shadow"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-xs font-medium truncate text-[#172b4d] dark:text-[#b6c2cf]">
                            {doc.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Global Workspace Document overview */}
            <div className="space-y-3 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8590a2] flex items-center justify-between">
                <span>All Workspace Documentation ({filteredDocs.length})</span>
                {globalSearchQuery && <span className="text-[10px] text-blue-500 font-semibold normal-case">Filtered search result</span>}
              </h3>
              
              {filteredDocs.length === 0 ? (
                <div className="py-12 border border-dashed border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl text-center text-sm text-[#8590a2] space-y-2">
                  <FileText className="w-8 h-8 mx-auto opacity-40 text-blue-600" />
                  <p className="font-semibold">No matches found</p>
                  <p className="text-xs opacity-75">Try clearing filters or checking spelling of tags.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredDocs.filter(d => d.type === 'document').map(doc => {
                    const tagList = safeParseJSON(doc.tags, []);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className="p-4 bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl hover:border-slate-350 dark:hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between h-28 hover:shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400">
                              By {doc.authorName || 'Member'}
                            </span>
                            <span className={`text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded ${
                              doc.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                              doc.status === 'REVIEW' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                            }`}>
                              {doc.status || 'DRAFT'}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#172b4d] dark:text-[#b6c2cf] truncate">
                            {doc.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#dfe1e6]/40 dark:border-[#a6c5e229]/10 pt-2 text-[10px] text-[#8590a2]">
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{doc.views || 0} views</span>
                          </div>
                          {tagList.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-indigo-500/5 text-indigo-500 font-semibold rounded truncate max-w-[120px]">
                              {tagList[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════
             DOCUMENT VIEWER / EDITOR VIEW
             ═════════════════════════════════════════════════════════════ */
          <div className="flex-1 flex overflow-hidden">
            
            {/* Writer main content block */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Header navigation bar */}
              <div className="h-auto py-2 sm:h-12 border-b border-[#dfe1e6] dark:border-[#a6c5e229] px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 bg-[#f4f5f7] dark:bg-[#1c1e22]/50">
                <div className="flex items-center justify-between w-full sm:w-auto min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Home icon backlink */}
                    <button
                      onClick={() => setSelectedDocId(null)}
                      className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[#8590a2] shrink-0"
                      title="Back to Wiki Home"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-[#8590a2] truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[180px]">
                      {activeDoc?.title}
                    </span>
                  </div>
                  
                  {/* Favorite star on mobile */}
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 sm:hidden ${
                      activeDoc?.isFavorite ? 'text-yellow-500' : 'text-[#8590a2]'
                    }`}
                    title={activeDoc?.isFavorite ? 'Remove Star' : 'Star Document'}
                  >
                    <Star className={`w-4 h-4 ${activeDoc?.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto shrink-0">
                  {/* Favorite star on desktop */}
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 hidden sm:block ${
                      activeDoc?.isFavorite ? 'text-yellow-500' : 'text-[#8590a2]'
                    }`}
                    title={activeDoc?.isFavorite ? 'Remove Star' : 'Star Document'}
                  >
                    <Star className={`w-4 h-4 ${activeDoc?.isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  {/* Status Dropdown */}
                  <div className="relative flex items-center text-xs shrink-0">
                    <span className="text-[#8590a2] mr-1.5 hidden sm:inline">Status:</span>
                    <select
                      value={docStatus}
                      onChange={e => handleStatusChange(e.target.value as any)}
                      className={`font-semibold bg-transparent border border-[#dfe1e6] dark:border-[#a6c5e229] rounded px-1.5 py-0.5 cursor-pointer text-[11px] uppercase ${
                        docStatus === 'APPROVED' ? 'text-emerald-500 border-emerald-500/30' :
                        docStatus === 'REVIEW' ? 'text-amber-500 border-amber-500/30' :
                        docStatus === 'ARCHIVED' ? 'text-gray-500 border-gray-500/30' :
                        'text-indigo-500 border-indigo-500/30'
                      }`}
                    >
                      <option value="DRAFT" className="dark:bg-[#1d2125] text-indigo-500">Draft</option>
                      <option value="REVIEW" className="dark:bg-[#1d2125] text-amber-500">Review</option>
                      <option value="APPROVED" className="dark:bg-[#1d2125] text-emerald-500">Approved</option>
                      <option value="ARCHIVED" className="dark:bg-[#1d2125] text-gray-500">Archived</option>
                    </select>
                  </div>

                  {/* Edit/Preview Toggle */}
                  {isEditor && (
                    <div className="flex rounded-lg border border-[#dfe1e6] dark:border-[#a6c5e229] p-0.5 bg-white dark:bg-[#22272b] shrink-0">
                      <button
                        onClick={() => {
                          setIsEditingDoc(true);
                          setActiveEditorTab('edit');
                        }}
                        className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                          isEditingDoc && activeEditorTab === 'edit'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (isEditingDoc) handleSaveDocument();
                          setIsEditingDoc(false);
                          setActiveEditorTab('preview');
                        }}
                        className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                          !isEditingDoc
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  )}

                  {/* Sidebar toggler */}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 ${
                      sidebarOpen ? 'text-blue-500 bg-blue-500/10' : 'text-[#8590a2]'
                    }`}
                    title="Collaboration Panel"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View/Edit Pane container */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
                
                {isEditingDoc ? (
                  /* WRITE MODE */
                  <div className="space-y-4 h-full flex flex-col">
                    
                    {/* Title */}
                    <input
                      type="text"
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      className="text-2xl md:text-3xl font-extrabold text-[#172b4d] dark:text-[#b6c2cf] bg-transparent border-b border-blue-500 focus:outline-none w-full pb-2"
                      placeholder="Untitled Document"
                    />

                    {/* Rich Layout Shortcut Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f4f5f7] dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-lg text-[#44546f] dark:text-[#9fadbc] shrink-0">
                      <button type="button" onClick={() => handleToolbarInsert('h1')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('h2')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('h3')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Heading 3"><Heading3 className="w-4 h-4" /></button>
                      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                      
                      <button type="button" onClick={() => handleToolbarInsert('bullet')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Bullet List"><List className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('checklist')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Todo Checklist"><CheckSquare className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('table')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Markdown Table"><Table className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('quote')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Blockquote"><Quote className="w-4 h-4" /></button>
                      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                      <button type="button" onClick={() => handleToolbarInsert('callout_idea')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-blue-500" title="💡 Idea Callout"><Lightbulb className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('callout_warn')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-amber-500" title="⚠️ Warning Callout"><AlertTriangle className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('code')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Code Block"><Code className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('divider')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Horizontal Divider"><SeparatorHorizontal className="w-4 h-4" /></button>
                      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                      <button type="button" onClick={() => handleToolbarInsert('link')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Insert Link"><Link2 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('image')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Insert Image"><Image className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleToolbarInsert('video')} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="Insert Video"><Video className="w-4 h-4" /></button>
                    </div>

                    {/* Editor Textarea */}
                    <textarea
                      id="wiki-doc-textarea"
                      value={docContent}
                      onChange={e => setDocContent(e.target.value)}
                      className="w-full flex-1 min-h-[calc(100vh-380px)] text-sm text-[#172b4d] dark:text-[#b6c2cf] bg-transparent border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-4 focus:outline-none focus:border-blue-500 resize-none font-mono"
                      placeholder="Use toolbar or write raw Markdown. Type > 💡 for tips, - [ ] for checklists, | for tables..."
                    />

                    {/* Form actions */}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setIsEditingDoc(false);
                          setActiveEditorTab('preview');
                        }}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDocument}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* READ & PREVIEW MODE */
                  <div className="space-y-6">
                    
                    {/* Document Header Panel */}
                    <div className="border-b border-[#dfe1e6] dark:border-[#a6c5e229] pb-4 space-y-4">
                      
                      {/* Document Title */}
                      <h1 className="text-3xl font-extrabold tracking-tight text-[#172b4d] dark:text-[#b6c2cf]">
                        {activeDoc?.title}
                      </h1>
                      
                      {/* Metadata bar */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-[#8590a2] gap-4">
                        
                        {/* Analytics details */}
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span>Author: <b>{activeDoc?.authorName || 'System'}</b></span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Updated: {new Date(activeDoc?.updatedAt || '').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{activeDoc?.views || 0} views</span>
                          </span>
                        </div>

                        {/* Status label */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          activeDoc?.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          activeDoc?.status === 'REVIEW' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          activeDoc?.status === 'ARCHIVED' ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400' :
                          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {activeDoc?.status || 'DRAFT'}
                        </span>
                      </div>
                    </div>

                    {/* Integrated Project Linkages Panel */}
                    <div className="bg-[#f4f5f7]/50 dark:bg-white/5 rounded-xl p-4 border border-[#dfe1e6] dark:border-[#a6c5e229] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8590a2] flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5 shrink-0" /> Linked Workspace Resources
                        </span>
                        {isEditor && (
                          <button
                            onClick={() => setLinkResourceModalOpen(true)}
                            className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 font-semibold shrink-0"
                          >
                            <Plus className="w-3 h-3" /> Link Task/Goal
                          </button>
                        )}
                      </div>
                      
                      {safeParseJSON(activeDoc?.linkedResources, []).length === 0 ? (
                        <p className="text-xs text-[#8590a2] italic">
                          No project entities linked. Link boards, goals, milestones or tasks to tie documentation directly to execution.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {safeParseJSON(activeDoc?.linkedResources, []).map((res: any, idx: number) => {
                            let badgeBg = 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-350';
                            if (res.type === 'BOARD') badgeBg = 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/50';
                            if (res.type === 'GOAL') badgeBg = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50';
                            if (res.type === 'TASK') badgeBg = 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50';
                            if (res.type === 'MILESTONE') badgeBg = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/50';

                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg}`}
                              >
                                <span className="text-[10px] font-extrabold opacity-75">{res.type}</span>
                                <span
                                  onClick={() => {
                                    if (res.type === 'BOARD') {
                                      onSelectBoard(res.id);
                                    }
                                  }}
                                  className={res.type === 'BOARD' ? 'cursor-pointer hover:underline' : ''}
                                >
                                  {res.name}
                                </span>
                                {isEditor && (
                                  <button
                                    onClick={() => handleRemoveLinkedResource(res.id)}
                                    className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded text-red-500"
                                    title="Unlink"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Main Rendered Document Body */}
                    <div className="prose dark:prose-invert max-w-none min-h-[400px] border border-slate-100 dark:border-slate-800/20 rounded-xl p-4 bg-white dark:bg-[#1c1e22]/20">
                      {renderMarkdown(docContent)}
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
               COLLABORATION SIDEBAR (COMMENTS, SUGGESTIONS, HISTORY)
               ═════════════════════════════════════════════════════════════ */}
            {sidebarOpen && (
              <div className="w-80 border-l border-[#dfe1e6] dark:border-[#a6c5e229] flex flex-col h-full bg-[#f4f5f7] dark:bg-[#181a1d] shrink-0 animate-fade-in">
                
                {/* Sidebar Navigation tabs */}
                <div className="flex border-b border-[#dfe1e6] dark:border-[#a6c5e229] p-1 bg-[#e4e6ea] dark:bg-white/5 shrink-0">
                  {(['comments', 'suggestions', 'history'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSidebarTab(tab)}
                      className={`flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                        sidebarTab === tab
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {tab === 'comments' && 'Comments'}
                      {tab === 'suggestions' && 'Suggests'}
                      {tab === 'history' && 'History'}
                    </button>
                  ))}
                </div>

                {/* Sidebar body container */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                  
                  {/* 1. Comments feed tab */}
                  {sidebarTab === 'comments' && (
                    <div className="flex flex-col h-full space-y-4">
                      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {safeParseJSON(activeDoc?.comments, []).length === 0 ? (
                          <div className="text-center py-12 text-xs text-[#8590a2] space-y-2">
                            <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-indigo-500" />
                            <p>No comments on this document yet.</p>
                            <p className="opacity-70 text-[10px]">Start the conversation below.</p>
                          </div>
                        ) : (
                          safeParseJSON(activeDoc?.comments, []).map((cmt: any, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-[#22272b] p-3 rounded-lg border border-[#dfe1e6] dark:border-[#a6c5e229] space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-[#172b4d] dark:text-[#b6c2cf]">
                                  {cmt.userName}
                                </span>
                                <span className="text-[9px] text-[#8590a2]">
                                  {new Date(cmt.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-[#44546f] dark:text-[#9fadbc] leading-relaxed break-words whitespace-pre-wrap">
                                {cmt.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add comment submit form */}
                      <form onSubmit={handleAddCommentSubmit} className="pt-2 border-t border-[#dfe1e6] dark:border-[#a6c5e229] flex gap-2">
                        <input
                          type="text"
                          placeholder="Write comment…"
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-[#8590a2]"
                        />
                        <button
                          type="submit"
                          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  )}

                  {/* 2. Suggestions tab */}
                  {sidebarTab === 'suggestions' && (
                    <div className="flex flex-col h-full space-y-4">
                      
                      {/* Suggestion list */}
                      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {safeParseJSON(activeDoc?.suggestions, []).length === 0 ? (
                          <div className="text-center py-8 text-xs text-[#8590a2] space-y-2">
                            <CornerDownRight className="w-8 h-8 mx-auto opacity-30 text-indigo-500" />
                            <p>No content suggestions submitted.</p>
                            <p className="opacity-70 text-[10px]">Highlight original text and suggest replacements below.</p>
                          </div>
                        ) : (
                          safeParseJSON(activeDoc?.suggestions, []).map((sug: any, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-[#22272b] p-3 rounded-lg border border-[#dfe1e6] dark:border-[#a6c5e229] space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-500">By {sug.userName}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  sug.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                  sug.status === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                  'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {sug.status}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="p-1.5 bg-red-500/5 text-red-600 dark:text-red-400 rounded line-through border border-red-500/10">
                                  {sug.originalText || '(End of file append)'}
                                </div>
                                <div className="p-1.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/10 font-medium">
                                  {sug.suggestedText}
                                </div>
                              </div>

                              {/* Acceptance actions for editors */}
                              {isEditor && sug.status === 'pending' && (
                                <div className="flex items-center gap-1.5 justify-end pt-1">
                                  <button
                                    onClick={() => handleSuggestionResolve(sug.id, 'rejected')}
                                    className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-500 font-semibold text-[10px]"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleSuggestionResolve(sug.id, 'accepted')}
                                    className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 font-semibold text-[10px]"
                                  >
                                    Accept & Merge
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add suggestion inputs */}
                      <form onSubmit={handleAddSuggestionSubmit} className="pt-3 border-t border-[#dfe1e6] dark:border-[#a6c5e229] space-y-2">
                        <span className="text-[10px] font-bold text-[#8590a2] uppercase tracking-wider block">Submit content edit</span>
                        
                        <input
                          type="text"
                          placeholder="Original text to replace (optional)"
                          value={suggestOriginal}
                          onChange={e => setSuggestOriginal(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded text-xs bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] text-slate-800 dark:text-slate-100"
                        />

                        <textarea
                          placeholder="Suggested replacement text"
                          value={suggestReplacement}
                          onChange={e => setSuggestReplacement(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded text-xs bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] text-slate-800 dark:text-slate-100 h-16 resize-none"
                          required
                        />

                        <button
                          type="submit"
                          className="w-full py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm"
                        >
                          Submit Suggestion
                        </button>
                      </form>

                    </div>
                  )}

                  {/* 3. Version history tab */}
                  {sidebarTab === 'history' && (
                    <div className="space-y-3">
                      {safeParseJSON(activeDoc?.revisions, []).length === 0 ? (
                        <div className="text-center py-12 text-xs text-[#8590a2] space-y-2">
                          <History className="w-8 h-8 mx-auto opacity-30 text-indigo-500" />
                          <p>No revision history.</p>
                          <p className="opacity-70 text-[10px]">Revisions are saved automatically when you edit content.</p>
                        </div>
                      ) : (
                        safeParseJSON(activeDoc?.revisions, []).map((rev: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-[#22272b] p-3 rounded-lg border border-[#dfe1e6] dark:border-[#a6c5e229] space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-500">By {rev.userName}</span>
                              <span className="text-[9px] text-[#8590a2]">
                                {new Date(rev.updatedAt).toLocaleDateString()}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc] line-clamp-1 italic bg-slate-50 dark:bg-black/10 p-1.5 rounded font-mono">
                              "{rev.title}"
                            </p>

                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                onClick={() => handleRestoreRevision(rev)}
                                className="px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-semibold rounded text-[10px] flex items-center gap-0.5"
                              >
                                <RotateCcw className="w-3 h-3" /> Restore version
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════════
         CREATION DIALOG MODAL
         ═════════════════════════════════════════════════════════════ */}
      {creationModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#22272b] rounded-xl border border-[#dfe1e6] dark:border-[#a6c5e229] w-full max-w-md p-6 space-y-4 shadow-2xl animate-scale-in text-[#172b4d] dark:text-[#b6c2cf]">
            
            <div className="flex items-center justify-between border-b pb-3 border-[#dfe1e6] dark:border-[#a6c5e229]">
              <h3 className="text-base font-bold flex items-center gap-2">
                {creationType === 'space' && <Globe className="w-5 h-5 text-indigo-500" />}
                {creationType === 'folder' && <Folder className="w-5 h-5 text-amber-500" />}
                {creationType === 'document' && <FileText className="w-5 h-5 text-blue-500" />}
                Create New {creationType.charAt(0).toUpperCase() + creationType.slice(1)}
              </h3>
              <button
                onClick={() => setCreationModalOpen(false)}
                className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-4">
              
              {/* Type Switcher (only when parent is null) */}
              {!creationParentId && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#8590a2] uppercase tracking-wider">Node Type</label>
                  <div className="flex rounded-lg border border-[#dfe1e6] dark:border-[#a6c5e229] p-0.5 bg-slate-50 dark:bg-black/20">
                    {(['space', 'folder', 'document'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCreationType(type)}
                        className={`flex-1 py-1 rounded text-xs font-semibold transition-colors capitalize ${
                          creationType === type
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#8590a2] uppercase tracking-wider">{creationType} Title</label>
                <input
                  type="text"
                  placeholder={`Enter ${creationType} name…`}
                  value={creationTitle}
                  onChange={e => setCreationTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#1d2125] border border-[#dfe1e6] dark:border-[#a6c5e229] focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-[#8590a2]"
                  required
                  autoFocus
                />
              </div>

              {/* Parent tracker */}
              {creationParentId && (
                <div className="p-2 rounded bg-slate-50 dark:bg-black/20 text-xs flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-[#8590a2]" />
                  <span className="text-[#8590a2]">Nesting under parent:</span>
                  <b className="truncate max-w-[180px]">
                    {documents.find(d => d.id === creationParentId)?.title}
                  </b>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-2 border-t border-[#dfe1e6] dark:border-[#a6c5e229]">
                <button
                  type="button"
                  onClick={() => setCreationModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-150 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                >
                  Create {creationType}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
         RESOURCE LINKER DIALOG MODAL
         ═════════════════════════════════════════════════════════════ */}
      {linkResourceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#22272b] rounded-xl border border-[#dfe1e6] dark:border-[#a6c5e229] w-full max-w-sm p-6 space-y-4 shadow-2xl animate-scale-in text-[#172b4d] dark:text-[#b6c2cf]">
            
            <div className="flex items-center justify-between border-b pb-3 border-[#dfe1e6] dark:border-[#a6c5e229]">
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-blue-500" /> Link Workspace Item
              </h3>
              <button
                onClick={() => setLinkResourceModalOpen(false)}
                className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLinkedResource} className="space-y-4">
              
              {/* Type select */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#8590a2] uppercase tracking-wider">Item Type</label>
                <select
                  value={linkType}
                  onChange={e => {
                    setLinkType(e.target.value as any);
                    setLinkItemId('');
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#1d2125] border border-[#dfe1e6] dark:border-[#a6c5e229] text-slate-800 dark:text-slate-100"
                >
                  <option value="BOARD">Board</option>
                  <option value="TASK">Task (Card)</option>
                  <option value="GOAL">Goal</option>
                  <option value="MILESTONE">Milestone</option>
                </select>
              </div>

              {/* Specific resource select */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#8590a2] uppercase tracking-wider">Select Resource</label>
                <select
                  value={linkItemId}
                  onChange={e => setLinkItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#1d2125] border border-[#dfe1e6] dark:border-[#a6c5e229] text-slate-800 dark:text-slate-100"
                  required
                >
                  <option value="">-- Choose item --</option>
                  
                  {linkType === 'BOARD' && currentWorkspace?.boards?.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}

                  {linkType === 'TASK' && currentWorkspace?.boards?.flatMap(b => b.lists.flatMap(l => l.cards.map(c => ({ ...c, bName: b.name })))).map(c => (
                    <option key={c.id} value={c.id}>[{c.bName}] {c.title}</option>
                  ))}

                  {linkType === 'GOAL' && currentWorkspace?.goals?.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}

                  {linkType === 'MILESTONE' && currentWorkspace?.boards?.flatMap(b => b.milestones.map(m => ({ ...m, bName: b.name }))).map(m => (
                    <option key={m.id} value={m.id}>[{m.bName}] {m.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2 border-t border-[#dfe1e6] dark:border-[#a6c5e229]">
                <button
                  type="button"
                  onClick={() => setLinkResourceModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-150 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                >
                  Link Resource
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
