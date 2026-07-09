import { useState, useEffect } from 'react';
import { useStore, getAvatarUrl } from '../store/useStore';
import type { Card } from '../store/useStore';
import { apiUrl } from '../config/api';

import { 
  Columns, Calendar as CalendarIcon, 
  BarChart3, UserCheck, Play, ArrowLeft, Plus, X, Trash2, Archive,
  CalendarCheck, Clock, CheckCircle, PlusCircle, Copy, Check, Info, Lock, Paintbrush,
  MessageSquare, AlertCircle, Sparkles, ChevronRight, Flame, Upload, HelpCircle, Users,
  Pencil
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { useThemeStore } from '../store/useThemeStore';
import CalendarModule from './CalendarModule';

interface BoardViewProps {
  boardId: string;
  onBack: () => void;
  onOpenCardDetails: (card: Card) => void;
  onOpenGuide: () => void;
}

type TabType = 'kanban' | 'calendar' | 'dashboard' | 'workload' | 'automations';

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  OWNER: { label: 'Owner', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  ADMIN: { label: 'Admin', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
  MEMBER: { label: 'Member', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  VIEWER: { label: 'Guest', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' }
};

export default function BoardView({ boardId, onBack, onOpenCardDetails, onOpenGuide }: BoardViewProps) {
  const { 
    user, currentBoard, fetchBoardDetails, deleteBoard,
    createList, archiveList, createCard, updateCard, updateBoard,
    createAutomationRule, deleteAutomationRule, currentWorkspace, convertInboxItem, token,
    addToast, showConfirm, fetchArchivedItems, updateList
  } = useStore();

  const themeStore = useThemeStore();
  const boardOverride = themeStore.boardOverrides[boardId];

  const currentMember = currentWorkspace?.members.find(m => m.user.id === user?.id);
  const isOwnerOrAdmin = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<TabType>('kanban');
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [cardTitles, setCardTitles] = useState<Record<string, string>>({}); // keyed by listId
  const [calendarSyncOpen, setCalendarSyncOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  
  // Board & Card Renaming states
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [editedBoardName, setEditedBoardName] = useState(currentBoard?.name || '');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  // Customizer form states
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [overrideIcon, setOverrideIcon] = useState('');
  const [overrideCover, setOverrideCover] = useState('');
  const [overrideCoverColor, setOverrideCoverColor] = useState('');
  const [overrideAccentColor, setOverrideAccentColor] = useState('');
  const [overrideBackgroundValue, setOverrideBackgroundValue] = useState('');

  // Email-to-Board States
  const [activeCustomizerTab, setActiveCustomizerTab] = useState<'style' | 'email' | 'archive' | 'danger'>('style');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailListId, setEmailListId] = useState('');
  const [emailPriority, setEmailPriority] = useState('MEDIUM');
  const [emailAllowedSenders, setEmailAllowedSenders] = useState('ANY');
  const [emailDefaultLabels, setEmailDefaultLabels] = useState('');
  const [emailAutoAssignees, setEmailAutoAssignees] = useState<string[]>([]);
  const [emailThreadAction, setEmailThreadAction] = useState('COMMENT');

  // Archive Restore States
  const [archivedLists, setArchivedLists] = useState<any[]>([]);
  const [archivedCards, setArchivedCards] = useState<any[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const loadArchivedItems = async () => {
    if (!boardId) return;
    setLoadingArchived(true);
    try {
      const data = await fetchArchivedItems(boardId);
      console.log('[ARCHIVED ITEMS FETCHED]', data);
      setArchivedLists(data.lists || []);
      setArchivedCards(data.cards || []);
    } catch (err: any) {
      console.error(err);
      addToast('Error Loading Archive', err.message || 'Failed to fetch archived items.', 'error');
    } finally {
      setLoadingArchived(false);
    }
  };

  useEffect(() => {
    if (customizerOpen && activeCustomizerTab === 'archive') {
      loadArchivedItems();
    }
  }, [customizerOpen, activeCustomizerTab]);

  // Sync state values when Customizer opens
  useEffect(() => {
    if (customizerOpen) {
      setOverrideIcon(boardOverride?.icon || '📋');
      setOverrideCover(boardOverride?.coverImage || '');
      setOverrideCoverColor(boardOverride?.coverColor || '#6366f1');
      setOverrideAccentColor(boardOverride?.accentColor || '#6366f1');
      setOverrideBackgroundValue(boardOverride?.backgroundValue || '');
      setActiveCustomizerTab('style');
    }
  }, [customizerOpen, boardOverride]);

  useEffect(() => {
    if (customizerOpen && currentBoard) {
      setEmailEnabled(currentBoard.incomingEmailEnabled ?? true);
      setEmailAddress(currentBoard.incomingEmailAddress || '');
      setEmailListId(currentBoard.incomingEmailListId || '');
      setEmailPriority(currentBoard.incomingEmailDefaultPriority || 'MEDIUM');
      setEmailAllowedSenders(currentBoard.incomingEmailAllowedSenders || 'ANY');
      setEmailDefaultLabels(currentBoard.incomingEmailDefaultLabelIds || '');
      setEmailAutoAssignees(currentBoard.incomingEmailAutoAssigneeIds ? currentBoard.incomingEmailAutoAssigneeIds.split(',').filter(Boolean) : []);
      setEmailThreadAction(currentBoard.incomingEmailThreadAction || 'COMMENT');
    }
  }, [customizerOpen, currentBoard]);

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBoard) return;
    try {
      await updateBoard(currentBoard.id, {
        incomingEmailEnabled: emailEnabled,
        incomingEmailAddress: emailAddress || null,
        incomingEmailListId: emailListId || null,
        incomingEmailDefaultPriority: emailPriority,
        incomingEmailAllowedSenders: emailAllowedSenders,
        incomingEmailDefaultLabelIds: emailDefaultLabels,
        incomingEmailAutoAssigneeIds: emailAutoAssignees.join(','),
        incomingEmailThreadAction: emailThreadAction
      });
      addToast('Settings Saved', 'Email-to-Board settings successfully updated.', 'success');
      setCustomizerOpen(false);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to save settings', 'error');
    }
  };

  const handleSaveCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    themeStore.setBoardOverride(user.id, boardId, {
      icon: overrideIcon || undefined,
      coverImage: overrideCover || undefined,
      coverColor: overrideCoverColor || undefined,
      accentColor: overrideAccentColor || undefined,
      backgroundValue: overrideBackgroundValue || undefined,
    });
    setCustomizerOpen(false);
  };

  const handleDeleteBoardFromInside = async () => {
    if (!currentBoard) return;
    const confirmed = await showConfirm(
      '🗑️ Delete Board',
      `Are you sure you want to permanently delete "${currentBoard.name}"? This will delete all lists, cards, and data inside it. This action cannot be undone.`,
      'Yes, Delete Board',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      setCustomizerOpen(false);
      await deleteBoard(currentBoard.id);
      addToast('Board Deleted', `"${currentBoard.name}" has been permanently deleted.`, 'success');
      onBack();
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete board. Please try again.', 'error');
    }
  };

  const handleClearCustomization = () => {
    if (!user?.id) return;
    themeStore.clearBoardOverride(user.id, boardId);
    setCustomizerOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Invalid File Type', 'Please upload a valid image file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Optimize resolution: max width 1920px for HD clarity
        const maxW = 1920;
        const maxH = 1080;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          if (w / h > maxW / maxH) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          } else {
            w = Math.round((w * maxH) / h);
            h = maxH;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setOverrideBackgroundValue(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Automation Form States
  const [trigType, setTrigType] = useState('CARD_MOVED');
  const [trigVal, setTrigVal] = useState('');
  const [actType, setActType] = useState('SET_PRIORITY');
  const [actVal, setActVal] = useState('HIGH');

  useEffect(() => {
    fetchBoardDetails(boardId);
  }, [boardId]);

  useEffect(() => {
    if (currentBoard) {
      setEditedBoardName(currentBoard.name);
    }
  }, [currentBoard]);

  const saveBoardName = async () => {
    if (!currentBoard || !editedBoardName.trim()) {
      setEditedBoardName(currentBoard?.name || '');
      setIsEditingBoardName(false);
      return;
    }
    if (editedBoardName.trim() === currentBoard.name) {
      setIsEditingBoardName(false);
      return;
    }
    try {
      await updateBoard(currentBoard.id, { name: editedBoardName.trim() });
      addToast('Board Renamed', `Board name updated to "${editedBoardName.trim()}"`, 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to rename board', 'error');
      setEditedBoardName(currentBoard.name);
    } finally {
      setIsEditingBoardName(false);
    }
  };

  const handleBoardNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveBoardName();
    } else if (e.key === 'Escape') {
      setEditedBoardName(currentBoard?.name || '');
      setIsEditingBoardName(false);
    }
  };

  const saveCardQuickRename = async (cardId: string) => {
    if (!editingCardTitle.trim()) {
      setEditingCardId(null);
      return;
    }
    const allCards = currentBoard?.lists.flatMap(l => l.cards) || [];
    const card = allCards.find(c => c.id === cardId);
    if (card && editingCardTitle.trim() !== card.title) {
      try {
        await updateCard(boardId, cardId, { title: editingCardTitle.trim() });
        addToast('Card Renamed', 'Task title updated successfully', 'success');
      } catch (err: any) {
        addToast('Error', err.message || 'Failed to rename card', 'error');
      }
    }
    setEditingCardId(null);
  };

  const handleCardQuickRenameKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, cardId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveCardQuickRename(cardId);
    } else if (e.key === 'Escape') {
      setEditingCardId(null);
    }
  };

  const saveListName = async (listId: string) => {
    if (!editingListName.trim()) {
      setEditingListId(null);
      return;
    }
    const list = currentBoard?.lists.find(l => l.id === listId);
    if (list && editingListName.trim() !== list.name) {
      try {
        await updateList(boardId, listId, editingListName.trim());
        addToast('Column Renamed', `Column name updated to "${editingListName.trim()}"`, 'success');
      } catch (err: any) {
        addToast('Error', err.message || 'Failed to rename column', 'error');
      }
    }
    setEditingListId(null);
  };

  const handleListNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, listId: string) => {
    if (e.key === 'Enter') {
      saveListName(listId);
    } else if (e.key === 'Escape') {
      setEditingListId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    if ((e.target as HTMLElement).closest('.kb-card')) {
      return;
    }
    e.dataTransfer.setData('listId', listId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    const draggedListId = e.dataTransfer.getData('listId');
    const cardId = e.dataTransfer.getData('cardId');
    const inboxItemId = e.dataTransfer.getData('inboxItemId');

    if (draggedListId) {
      if (draggedListId === targetListId) return;

      const lists = currentBoard?.lists || [];
      const draggedIndex = lists.findIndex(l => l.id === draggedListId);
      const targetIndex = lists.findIndex(l => l.id === targetListId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      let newPosition: number;
      if (draggedIndex < targetIndex) {
        // Dragged right: place after target
        const targetPos = lists[targetIndex].position;
        const nextPos = targetIndex + 1 < lists.length ? lists[targetIndex + 1].position : targetPos + 1000;
        newPosition = (targetPos + nextPos) / 2;
      } else {
        // Dragged left: place before target
        const targetPos = lists[targetIndex].position;
        const prevPos = targetIndex > 0 ? lists[targetIndex - 1].position : 0;
        newPosition = (targetPos + prevPos) / 2;
      }

      try {
        await updateList(boardId, draggedListId, undefined, newPosition);
        addToast('Column Moved', 'Column order updated successfully', 'success');
      } catch (err: any) {
        addToast('Error', err.message || 'Failed to move column', 'error');
      }
      return;
    }

    if (inboxItemId && currentWorkspace) {
      try {
        await convertInboxItem(currentWorkspace.id, inboxItemId, { boardId, listId: targetListId });
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (!cardId) return;

    const allCards = currentBoard?.lists.flatMap(l => l.cards) || [];
    const card = allCards.find(c => c.id === cardId);
    if (!card || card.listId === targetListId) return;

    try {
      await updateCard(boardId, cardId, { listId: targetListId });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const position = ((currentBoard?.lists.length || 0) + 1) * 1000;
    await createList(boardId, newListName, position);
    setNewListName('');
    setNewListOpen(false);
  };

  const handleCreateCardSubmit = async (listId: string) => {
    const title = cardTitles[listId];
    if (!title || !title.trim()) return;
    
    const targetList = currentBoard?.lists.find(l => l.id === listId);
    const position = ((targetList?.cards.length || 0) + 1) * 1000;

    await createCard(boardId, listId, title, position);
    setCardTitles({ ...cardTitles, [listId]: '' });
  };

  const handleCreateAutomationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAutomationRule(boardId, {
      triggerType: trigType,
      triggerVal: trigVal || null,
      actionType: actType,
      actionVal: actVal || null
    });
    setTrigVal('');
    setActVal('');
  };

  if (!currentBoard) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-body)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading board…</p>
        </div>
      </div>
    );
  }

  // Dashboard calculations
  const allCards = currentBoard.lists.flatMap(l => l.cards);
  const doneListId = currentBoard.lists.find(l => l.name.toLowerCase() === 'done')?.id;
  const completedTasks = allCards.filter(c => c.listId === doneListId).length;
  const totalTasks = allCards.length;
  
  const now = new Date();
  const overdueTasks = allCards.filter(c => c.dueDate && new Date(c.dueDate) < now && c.listId !== doneListId).length;

  const priorityCounts = {
    LOW: allCards.filter(c => c.priority === 'LOW').length,
    MEDIUM: allCards.filter(c => c.priority === 'MEDIUM').length,
    HIGH: allCards.filter(c => c.priority === 'HIGH').length,
    URGENT: allCards.filter(c => c.priority === 'URGENT').length,
  };

  const pieData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));
  const COLORS = ['#94a3b8', '#38bdf8', '#fbbf24', '#f87171'];

  // Burndown mock data
  const burndownData = [
    { day: 'Day 1', Ideal: totalTasks, Actual: totalTasks },
    { day: 'Day 2', Ideal: Math.max(0, totalTasks - (totalTasks * 0.15)), Actual: Math.max(0, totalTasks - 1) },
    { day: 'Day 3', Ideal: Math.max(0, totalTasks - (totalTasks * 0.3)), Actual: Math.max(0, totalTasks - 2) },
    { day: 'Day 4', Ideal: Math.max(0, totalTasks - (totalTasks * 0.45)), Actual: Math.max(0, totalTasks - 2) },
    { day: 'Day 5', Ideal: Math.max(0, totalTasks - (totalTasks * 0.6)), Actual: Math.max(0, totalTasks - Math.ceil(totalTasks * 0.4)) },
    { day: 'Day 6', Ideal: Math.max(0, totalTasks - (totalTasks * 0.75)), Actual: Math.max(0, totalTasks - Math.ceil(totalTasks * 0.5)) },
    { day: 'Day 7', Ideal: Math.max(0, totalTasks - (totalTasks * 0.9)), Actual: Math.max(0, totalTasks - Math.ceil(totalTasks * 0.8)) },
    { day: 'Day 8', Ideal: 0, Actual: Math.max(0, totalTasks - completedTasks) }
  ];

  // Resolve background style
  const resolveBackgroundStyle = () => {
    if (boardOverride?.backgroundValue) {
      const val = boardOverride.backgroundValue;
      if (val.startsWith('linear-gradient') || val.startsWith('radial-gradient') || val.startsWith('#')) {
        return { background: val };
      }
      if (val.startsWith('http') || val.startsWith('https') || val.startsWith('data:image/')) {
        return { 
          backgroundImage: `url(${val})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        };
      }
    }
    // Default gorgeous gradient (light / dark responsive)
    return undefined; // Handled by CSS/Tailwind
  };

  const hasCustomBg = !!boardOverride?.backgroundValue;

  return (
    <div 
      className={`flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-500 ${
        hasCustomBg ? '' : 'bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-[#0b0f19] dark:to-[#17142b]'
      }`}
      style={resolveBackgroundStyle()}
    >
      {/* Background soft overlay for contrast */}
      {hasCustomBg && <div className="bg-overlay-blur absolute inset-0 z-0 pointer-events-none" />}

      {/* Board Header */}
      <header 
        className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col justify-between gap-2 sm:gap-4 shrink-0 z-10 border-b transition-colors relative" 
        style={{ 
          background: 'var(--bg-surface)', 
          borderColor: 'var(--border)'
        }}
      >
        {/* Row 1: Back + Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button onClick={onBack} className="btn-icon rounded-xl hover:scale-105 transition-transform shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Board Icon Badge - smaller on mobile */}
            <div 
              className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl shadow-md border shrink-0"
              style={{ 
                background: 'var(--bg-body)',
                borderColor: 'var(--border)'
              }}
            >
              {boardOverride?.icon || '📋'}
            </div>
            
            <div className="min-w-0">
              <div className="hidden md:flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                <span>{currentWorkspace?.name || 'Workspace'}</span>
                <ChevronRight className="w-3 h-3" />
                <span style={{ color: 'var(--text-muted)' }}>Board</span>
              </div>
              {isEditingBoardName ? (
                <input
                  type="text"
                  value={editedBoardName}
                  onChange={(e) => setEditedBoardName(e.target.value)}
                  onBlur={saveBoardName}
                  onKeyDown={handleBoardNameKeyDown}
                  className="text-sm sm:text-base font-bold leading-tight px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[15rem] sm:max-w-[25rem]"
                  style={{ color: 'var(--text-primary)' }}
                  autoFocus
                />
              ) : (
                <h2 
                  onClick={() => setIsEditingBoardName(true)}
                  className="text-sm sm:text-base font-bold leading-tight flex items-center gap-2 truncate cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 px-1 py-0.5 rounded group" 
                  style={{ color: 'var(--text-primary)' }}
                  title="Click to rename board"
                >
                  <span className="truncate">{currentBoard.name}</span>
                  <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity text-slate-500 shrink-0" />
                  {totalTasks > 0 && (
                    <span className="hidden md:inline text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      {totalTasks} Tasks
                    </span>
                  )}
                </h2>
              )}
              {currentBoard.description && (
                <p className="hidden md:block text-xs mt-0.5 line-clamp-1 max-w-[24rem]" style={{ color: 'var(--text-muted)' }}>
                  {currentBoard.description}
                </p>
              )}
            </div>
          </div>

          {/* Member Avatars + live indicator: shifted to right on mobile */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => setShowAllMembersModal(true)}
              className="flex -space-x-2 cursor-pointer hover:opacity-90 active:scale-95 transition-all outline-none"
              title="View all members"
            >
              {currentWorkspace?.members.slice(0, 3).map(m => (
                <img
                  key={m.id}
                  src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                  alt={m.user.name || ''}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white dark:border-[#161a1d] object-cover shrink-0"
                />
              ))}
              {currentWorkspace?.members && currentWorkspace.members.length > 3 && (
                <div 
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white dark:border-[#161a1d] flex items-center justify-center text-[9px] font-bold text-white bg-slate-500 shrink-0"
                >
                  +{currentWorkspace.members.length - 3}
                </div>
              )}
            </button>
            <button
              onClick={() => setCustomizerOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm hover:scale-105 active:scale-95"
              style={{ 
                background: 'var(--bg-surface)', 
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <Paintbrush className="w-3.5 h-3.5 text-indigo-500" /> 
              <span>Appearance</span>
            </button>
            <button
              onClick={onOpenGuide}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm hover:scale-105 active:scale-95 text-[#6366f1] dark:text-[#579dff]"
              style={{ 
                background: 'var(--bg-surface)', 
                borderColor: 'var(--border)',
              }}
              title="Help Guide"
            >
              <HelpCircle className="w-3.5 h-3.5" /> 
              <span>Help</span>
            </button>
            {/* Mobile appearance button (icon only) */}
            <button
              onClick={() => setCustomizerOpen(true)}
              className="md:hidden btn-icon rounded-lg"
              title="Appearance"
            >
              <Paintbrush className="w-4 h-4 text-indigo-500" />
            </button>
            {/* Mobile help button (icon only) */}
            <button
              onClick={onOpenGuide}
              className="md:hidden btn-icon rounded-lg text-[#6366f1] dark:text-[#579dff]"
              title="Help Guide"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Tabs bar — scrollable on mobile */}
      <div className="px-2 sm:px-6 py-2 bg-slate-100/60 dark:bg-[#0c101b]/40 border-b border-gray-200 dark:border-gray-800 shrink-0 z-10 backdrop-blur-sm tab-bar">
        {(['kanban', 'calendar', 'dashboard', 'workload', 'automations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'text-white'
                : ''
            }`}
            style={activeTab === tab
              ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }
              : { background: 'transparent', color: 'var(--text-secondary)' }
            }
            onMouseEnter={e => { if (activeTab !== tab) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (activeTab !== tab) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {tab === 'kanban'      && <Columns className="w-3.5 h-3.5" />}
            {tab === 'calendar'   && <CalendarIcon className="w-3.5 h-3.5" />}
            {tab === 'dashboard'  && <BarChart3 className="w-3.5 h-3.5" />}
            {tab === 'workload'   && <UserCheck className="w-3.5 h-3.5" />}
            {tab === 'automations'&& <Play className="w-3.5 h-3.5" />}
            <span className="capitalize whitespace-nowrap">{tab}</span>
          </button>
        ))}
      </div>

      {/* Board Cover Banner Image (if configured in customizer) */}
      {boardOverride?.coverImage && (
        <div className="h-32 w-full shrink-0 overflow-hidden relative border-b z-10" style={{ borderColor: 'var(--border)' }}>
          <img 
            src={boardOverride.coverImage} 
            alt="Board cover banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px]" />
          <div className="absolute bottom-4 left-6 flex items-center gap-2 z-20">
            <span className="text-3xl filter drop-shadow">{boardOverride?.icon || '📋'}</span>
            {isEditingBoardName ? (
              <input
                type="text"
                value={editedBoardName}
                onChange={(e) => setEditedBoardName(e.target.value)}
                onBlur={saveBoardName}
                onKeyDown={handleBoardNameKeyDown}
                className="text-xl font-extrabold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[20rem]"
                autoFocus
              />
            ) : (
              <h1 
                onClick={() => setIsEditingBoardName(true)}
                className="text-xl font-extrabold text-white filter drop-shadow-md cursor-pointer hover:bg-black/20 px-2 py-0.5 rounded flex items-center gap-2 group"
                title="Click to rename board"
              >
                <span>{currentBoard.name}</span>
                <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-80 transition-opacity text-white shrink-0" />
              </h1>
            )}
          </div>
        </div>
      )}

      {/* Main Tab View Port */}
      <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 z-10">
        
        {/* Kanban View */}
        {activeTab === 'kanban' && (
          <div className="flex gap-3 sm:gap-4 h-full items-start select-none pb-4">
            {currentBoard.lists.map((list) => (
              <div
                key={list.id}
                draggable={editingListId !== list.id}
                onDragStart={(e) => handleListDragStart(e, list.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, list.id)}
                className={`kb-column ${hasCustomBg ? 'kb-column-glass' : ''}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-gray-200/50 dark:border-gray-800/40 cursor-grab active:cursor-grabbing">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {editingListId === list.id ? (
                      <input
                        type="text"
                        value={editingListName}
                        onChange={(e) => setEditingListName(e.target.value)}
                        onBlur={() => saveListName(list.id)}
                        onKeyDown={(e) => handleListNameKeyDown(e, list.id)}
                        className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                        style={{ color: 'var(--text-primary)' }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingListId(list.id);
                          setEditingListName(list.name);
                        }}
                        className="text-xs font-bold uppercase tracking-wider text-[#172b4d] dark:text-[#cbd5e1] truncate cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 px-1 py-0.5 rounded flex items-center gap-1.5 group/list min-w-0"
                        title="Click to rename column"
                      >
                        <span className="truncate max-w-[8rem]">{list.name}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/list:opacity-60 transition-opacity text-slate-500 shrink-0" />
                      </span>
                    )}
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ 
                        background: 'var(--bg-body)', 
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)' 
                      }}
                    >
                      {list.cards.length}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm(
                        'Archive List',
                        `Archive "${list.name}"? All its cards will also be archived. You can restore them later from the board settings.`,
                        'Archive',
                        'Cancel'
                      );
                      if (!confirmed) return;
                      try {
                        await archiveList(boardId, list.id);
                        addToast('List Archived', `"${list.name}" has been archived successfully.`, 'success');
                      } catch (err: any) {
                        addToast('Error', err.message || 'Failed to archive list. Please try again.', 'error');
                      }
                    }}
                    className="btn-icon w-6 h-6 rounded-md hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                    title="Archive list"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                  {list.cards.length === 0 ? (
                    /* Dotted Empty state inside List */
                    <div 
                      className="h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center transition-all hover:border-indigo-400 group"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <Sparkles className="w-5 h-5 text-gray-400 dark:text-gray-600 mb-1 group-hover:animate-bounce" />
                      <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>No cards here</p>
                      <span className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Drag tasks or click plus below</span>
                    </div>
                  ) : (
                    list.cards.map((card) => {
                      let customData: any = {};
                      try {
                        if (card.customFields) {
                          customData = JSON.parse(card.customFields);
                        }
                      } catch (e) {}
                      const labels = customData.labels || [];
                      const cardEmoji = customData.emoji || '';

                      // Completed checks count
                      const checklistCount = card.checklists?.length || 0;
                      const completedChecklistCount = card.checklists?.filter(i => i.isCompleted).length || 0;
                      const progressPercentage = checklistCount > 0 ? (completedChecklistCount / checklistCount) * 100 : 0;
                      const commentsCount = card.comments?.length || 0;

                      return (
                        <div
                          key={card.id}
                          draggable={editingCardId !== card.id}
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onClick={() => {
                            if (editingCardId !== card.id) {
                              onOpenCardDetails(card);
                            }
                          }}
                          className={`kb-card space-y-3 animate-fade-in group/card ${
                            card.priority === 'URGENT' ? 'priority-left-urgent' :
                            card.priority === 'HIGH' ? 'priority-left-high' :
                            card.priority === 'MEDIUM' ? 'priority-left-medium' : 'priority-left-low'
                          }`}
                        >
                          {card.coverImage && (
                            <div className="w-full overflow-hidden rounded-lg mb-1">
                              {card.coverImage.startsWith('linear-gradient') || card.coverImage.startsWith('radial-gradient') || card.coverImage.startsWith('#') ? (
                                <div
                                  className="w-full h-14"
                                  style={{ background: card.coverImage }}
                                />
                              ) : (
                                <img
                                  src={card.coverImage}
                                  alt="cover"
                                  className="w-full h-24 object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>
                          )}

                          {/* Labels list */}
                          {labels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {labels.map((lbl: any, idx: number) => (
                                <span 
                                  key={idx} 
                                  className="text-[9px] px-2 py-0.5 rounded-full font-bold text-white uppercase tracking-wider"
                                  style={{ backgroundColor: lbl.color || '#6366f1' }}
                                >
                                  {lbl.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Priority Indicator Pill */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                              card.priority === 'URGENT' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                              card.priority === 'HIGH'   ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'   :
                              card.priority === 'MEDIUM' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 
                                                           'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                            }`}>
                              {card.priority}
                            </span>
                            {card.priority === 'URGENT' && (
                              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            )}
                          </div>

                          {/* Title & Emoji */}
                          {editingCardId === card.id ? (
                            <div 
                              className="space-y-1.5" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <textarea
                                value={editingCardTitle}
                                onChange={(e) => setEditingCardTitle(e.target.value)}
                                onKeyDown={(e) => handleCardQuickRenameKeyDown(e, card.id)}
                                className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-none font-semibold"
                                style={{ borderColor: 'var(--border)' }}
                                autoFocus
                                rows={2}
                              />
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => setEditingCardId(null)}
                                  className="px-2.5 py-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveCardQuickRename(card.id)}
                                  className="px-2.5 py-1 text-[10px] bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-1.5 min-w-0">
                                {cardEmoji && <span className="text-sm shrink-0 leading-none mt-0.5">{cardEmoji}</span>}
                                <h4 className="text-xs font-semibold leading-snug break-words" style={{ color: 'var(--text-primary)' }}>
                                  {card.title}
                                </h4>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCardId(card.id);
                                  setEditingCardTitle(card.title);
                                }}
                                className="opacity-0 group-hover/card:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-opacity shrink-0"
                                title="Quick rename"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Checklist Meter Line */}
                          {checklistCount > 0 && (
                            <div>
                              <div className="flex items-center justify-between text-[9px] font-bold text-gray-500">
                                <span>Checklist Tasks</span>
                                <span>{completedChecklistCount}/{checklistCount}</span>
                              </div>
                              <div className="card-progress-bar">
                                <div 
                                  className="card-progress-fill" 
                                  style={{ 
                                    width: `${progressPercentage}%`,
                                    background: progressPercentage === 100 ? 'var(--success)' : 'var(--accent)'
                                  }} 
                                />
                              </div>
                            </div>
                          )}

                          {/* Card Footer badges */}
                          <div className="flex items-center justify-between pt-1 border-t border-gray-100/50 dark:border-gray-800/40">
                            <div className="flex items-center gap-2">
                              {card.dueDate && (
                                <span className={`flex items-center gap-1 text-[10px] font-bold rounded-md px-1.5 py-0.5 ${
                                  new Date(card.dueDate) < new Date() && list.name.toLowerCase() !== 'done'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  <CalendarCheck className="w-3 h-3" />
                                  {new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}

                              {commentsCount > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-500" title="Comments">
                                  <MessageSquare className="w-3 h-3" />
                                  {commentsCount}
                                </span>
                              )}

                              {card.loggedTime > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-500" title="Logged Time">
                                  <Clock className="w-3 h-3" />
                                  {card.loggedTime}m
                                </span>
                              )}
                            </div>

                            {/* Assignee circles */}
                            <div className="flex -space-x-1.5">
                              {card.assignees.map(a => (
                                <img
                                  key={a.id}
                                  src={getAvatarUrl(a.user.avatarUrl, a.user.name || a.user.username)}
                                  alt={a.user.name || ''}
                                  title={a.user.name || a.user.username}
                                  className="w-5 h-5 rounded-full border border-white dark:border-[#1c2128]"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Card input block */}
                <div className="px-3 pb-3 shrink-0 border-t border-gray-100/50 dark:border-gray-800/40 pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add card title…"
                      value={cardTitles[list.id] || ''}
                      onChange={e => setCardTitles({ ...cardTitles, [list.id]: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleCreateCardSubmit(list.id)}
                      className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      style={{ 
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)' 
                      }}
                    />
                    <button
                      onClick={() => handleCreateCardSubmit(list.id)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Column button */}
            {newListOpen ? (
              <form 
                onSubmit={handleCreateListSubmit} 
                className="w-[18rem] bg-white dark:bg-[#161a22] border rounded-2xl p-3 shrink-0 space-y-2.5 shadow-xl"
                style={{ borderColor: 'var(--border)' }}
              >
                <input
                  type="text" 
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="Enter column title…"
                  className="tf-input w-full text-xs py-2 px-3 rounded-xl" 
                  required 
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary py-2 px-4 text-xs flex-1 justify-center rounded-xl">Add column</button>
                  <button 
                    type="button" 
                    onClick={() => setNewListOpen(false)} 
                    className="btn-icon rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setNewListOpen(true)}
                className="h-12 flex items-center gap-2 px-4 text-xs font-semibold rounded-2xl shrink-0 transition-all border border-dashed hover:border-solid hover:scale-102 hover:shadow-md cursor-pointer"
                style={{
                  width: '18rem',
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <PlusCircle className="w-4 h-4 text-indigo-500" />
                <span>Create Column</span>
              </button>
            )}
          </div>
        )}

        {/* Calendar View */}
        {activeTab === 'calendar' && (
          <div className="w-full">
            <CalendarModule
              board={currentBoard}
              onOpenCardDetails={onOpenCardDetails}
              onOpenSyncModal={() => setCalendarSyncOpen(true)}
            />

            {/* Google Calendar Sync dialog */}
            {calendarSyncOpen && currentWorkspace && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-fade-in space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-bold text-[#172b4d] dark:text-[#b6c2cf] text-sm flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-indigo-600" /> Google Calendar Subscription
                    </h3>
                    <button onClick={() => setCalendarSyncOpen(false)} className="btn-icon">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#44546f] dark:text-[#9fadbc] leading-relaxed">
                    Sync all board cards containing due dates directly to Google Calendar, Outlook, or Apple Calendar using a secure subscription feed.
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl space-y-2">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">iCalendar Subscription URL</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={apiUrl(`/integrations/${currentWorkspace.id}/calendar/export.ics?token=${token}`)}
                        className="tf-input font-mono text-xs flex-1 select-all bg-white dark:bg-slate-850"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(apiUrl(`/integrations/${currentWorkspace.id}/calendar/export.ics?token=${token}`));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 whitespace-nowrap rounded-xl"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy URL
                          </>
                        )}
                      </button>
                    </div>
                    <span className="text-[9px] text-gray-400 flex items-center gap-1 pt-1">
                      <Lock className="w-3 h-3" /> Secure token embedded. Keep this subscription feed private.
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-indigo-600" /> How to Add to Your Calendar
                    </h4>
                    <div className="space-y-2.5 text-xs text-gray-500 leading-relaxed pl-1">
                      <div>
                        <strong>Google Calendar:</strong>
                        <p className="text-[11px] text-gray-400">Click the '+' next to "Other calendars" on the left panel, choose "From URL", paste this feed URL, and click "Add calendar".</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                    <button
                      onClick={() => setCalendarSyncOpen(false)}
                      className="btn-secondary rounded-xl px-4 py-2 text-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Sprint Tasks</span>
                  <h4 className="text-2xl font-bold text-[#172b4d] dark:text-[#b6c2cf] mt-1">{totalTasks}</h4>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Columns className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Completed Tasks</span>
                  <h4 className="text-2xl font-bold text-emerald-500 mt-1">{completedTasks}</h4>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overdue Warnings</span>
                  <h4 className="text-2xl font-bold text-rose-500 mt-1">{overdueTasks}</h4>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-xs text-gray-500 mb-4 uppercase tracking-wider">Sprint Burndown Rate</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={burndownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="Ideal" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="Actual" stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-xs text-gray-500 mb-4 uppercase tracking-wider">Task Priority Ratios</h3>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workload View */}
        {activeTab === 'workload' && (
          <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto space-y-6 animate-fade-in">
            <h3 className="font-bold text-[#172b4d] dark:text-[#b6c2cf] text-sm">Team Workload Distribution</h3>
            
            <div className="space-y-4 divide-y divide-gray-200 dark:divide-gray-800">
              {currentWorkspace?.members.map((m) => {
                const memberCards = allCards.filter(c => c.assignees.some(a => a.userId === m.user.id));
                return (
                  <div key={m.id} className="pt-4 flex items-center justify-between gap-6">
                    <div className="w-1/4 flex items-center gap-3">
                      <img 
                        src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-[#172b4d] dark:text-[#b6c2cf] truncate">{m.user.name || m.user.username}</h4>
                        <span className="text-[10px] text-gray-500">{memberCards.length} assigned tasks</span>
                      </div>
                    </div>

                    <div className="flex-1 bg-slate-100 dark:bg-slate-900 h-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${Math.min(100, (memberCards.length / 8) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Automations Tab */}
        {activeTab === 'automations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto animate-fade-in">
            <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-[#172b4d] dark:text-[#b6c2cf] text-sm flex items-center gap-2">
                <span>⚡</span> Build Board Automation Rule
              </h3>
              
              <form onSubmit={handleCreateAutomationSubmit} className="space-y-4">
                <div>
                  <label className="tf-label">WHEN trigger event occurs</label>
                  <select 
                    value={trigType}
                    onChange={(e) => setTrigType(e.target.value)}
                    className="tf-input rounded-xl"
                  >
                    <option value="CARD_CREATED">A Card is Created</option>
                    <option value="CARD_MOVED">A Card is Moved to Column</option>
                  </select>
                </div>

                {trigType === 'CARD_MOVED' && (
                  <div>
                    <label className="tf-label">Target Column</label>
                    <select 
                      value={trigVal}
                      onChange={(e) => setTrigVal(e.target.value)}
                      className="tf-input rounded-xl"
                      required
                    >
                      <option value="">Select Column...</option>
                      {currentBoard.lists.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="tf-label">THEN trigger action</label>
                  <select 
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="tf-input rounded-xl"
                  >
                    <option value="SET_PRIORITY">Set Task Priority to</option>
                    <option value="ADD_CHECKLIST">Append Checklist Item</option>
                    <option value="MARK_COMPLETE">Auto-complete Checklist Items</option>
                  </select>
                </div>

                {actType === 'SET_PRIORITY' && (
                  <div>
                    <label className="tf-label">Priority Level</label>
                    <select 
                      value={actVal}
                      onChange={(e) => setActVal(e.target.value)}
                      className="tf-input rounded-xl"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                )}

                {actType === 'ADD_CHECKLIST' && (
                  <div>
                    <label className="tf-label">Checklist Text</label>
                    <input 
                      type="text"
                      value={actVal}
                      onChange={(e) => setActVal(e.target.value)}
                      placeholder="e.g. Run tests, Review code..."
                      className="tf-input rounded-xl"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full justify-center text-xs py-2.5 rounded-xl mt-2"
                >
                  Create Rule
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-[#172b4d] dark:text-[#b6c2cf] text-sm">Active Rules List</h3>
              
              <div className="space-y-3">
                {currentBoard.automations?.length === 0 ? (
                  <p className="text-xs text-gray-400">No automation rules created yet.</p>
                ) : (
                  currentBoard.automations?.map((r) => {
                    const trigCol = currentBoard.lists.find(l => l.id === r.triggerVal)?.name;
                    return (
                      <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-850 rounded-xl flex items-center justify-between text-xs text-gray-500">
                        <div className="leading-relaxed">
                          <p>
                            <span className="font-bold text-indigo-600">WHEN</span> {r.triggerType === 'CARD_CREATED' ? 'Card is created' : `Card moves to "${trigCol}"`}
                          </p>
                          <p className="mt-1">
                            <span className="font-bold text-indigo-500">THEN</span> {r.actionType === 'SET_PRIORITY' ? `Set priority to "${r.actionVal}"` : r.actionType === 'ADD_CHECKLIST' ? `Add checklist item "${r.actionVal}"` : 'Auto-complete items'}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteAutomationRule(boardId, r.id)}
                          className="btn-icon text-gray-400 hover:text-rose-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {customizerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-[32rem] bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl animate-scale-in overflow-hidden mx-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-indigo-500" /> Board Customizer
              </h3>
              <button onClick={() => setCustomizerOpen(false)} className="btn-icon rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 overflow-x-auto shrink-0 scrollbar-none">
              <button 
                type="button"
                onClick={() => setActiveCustomizerTab('style')}
                className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors shrink-0 ${
                  activeCustomizerTab === 'style' 
                    ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Styling
              </button>
              <button 
                type="button"
                onClick={() => setActiveCustomizerTab('archive')}
                className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors shrink-0 ${
                  activeCustomizerTab === 'archive' 
                    ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Archived Items
              </button>
              {isOwnerOrAdmin && (
                <>
                  <button 
                    type="button"
                    onClick={() => setActiveCustomizerTab('email')}
                    className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors shrink-0 ${
                      activeCustomizerTab === 'email' 
                        ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400' 
                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    Email-to-Board
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveCustomizerTab('danger')}
                    className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors shrink-0 ${
                      activeCustomizerTab === 'danger' 
                        ? 'border-red-500 text-red-650 dark:text-red-400' 
                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    Danger Zone
                  </button>
                </>
              )}
            </div>

            {activeCustomizerTab === 'style' ? (
              <form onSubmit={handleSaveCustomization} className="p-4 md:p-6 space-y-4 md:space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Board Emoji & Cover Image URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="tf-label">Board Emoji Icon</label>
                    <input
                      type="text"
                      value={overrideIcon}
                      onChange={(e) => setOverrideIcon(e.target.value)}
                      placeholder="e.g. 🚀, 📚, 💼"
                      className="tf-input text-center text-lg rounded-xl py-2"
                      maxLength={2}
                    />
                    <div className="flex gap-1.5 justify-center mt-2">
                      {['🚀', '📚', '💪', '💼', '💻', '🎨'].map(emoji => (
                        <button 
                          key={emoji}
                          type="button" 
                          onClick={() => setOverrideIcon(emoji)}
                          className="p-1 text-sm hover:scale-120 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="tf-label">Cover Banner Image URL</label>
                    <input
                      type="text"
                      value={overrideCover}
                      onChange={(e) => setOverrideCover(e.target.value)}
                      placeholder="https://unsplash.com/..."
                      className="tf-input text-xs rounded-xl py-2"
                    />
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 max-w-[14rem]">
                      {[
                        { name: 'Study', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1920&q=85' },
                        { name: 'Forest', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1920&q=85' },
                        { name: 'Alpine', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=85' },
                        { name: 'Starry', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1920&q=85' }
                      ].map(p => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setOverrideCover(p.url)}
                          className="text-[9px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md whitespace-nowrap hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Wallpaper & Custom Background choices */}
                <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <label className="tf-label font-bold">Board Wallpaper Background</label>
                  
                  <input
                    type="text"
                    value={overrideBackgroundValue}
                    onChange={(e) => setOverrideBackgroundValue(e.target.value)}
                    placeholder="Paste linear-gradient(), color HEX, or Unsplash URL"
                    className="tf-input text-xs font-mono rounded-xl py-2"
                  />

                  {/* Grid of preset gradients */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Gradients</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { name: 'Northern Lights', val: 'linear-gradient(135deg, #06b6d4, #0f766e, #1e1b4b)' },
                        { name: 'Sunset Glow', val: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)' },
                        { name: 'Lavender Dusk', val: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)' },
                        { name: 'Deep Ocean', val: 'linear-gradient(135deg, #0f172a, #1e3a8a, #0d9488)' },
                        { name: 'Cyber Neon', val: 'linear-gradient(135deg, #111827, #06b6d4, #10b981)' },
                        { name: 'Charcoal Slate', val: '#1e293b' },
                        { name: 'Dark Purple', val: '#12071a' },
                        { name: 'Notion White', val: '#ffffff' }
                      ].map((bg) => (
                        <button
                          key={bg.name}
                          type="button"
                          onClick={() => setOverrideBackgroundValue(bg.val)}
                          className={`h-9 rounded-xl border relative overflow-hidden text-[9px] font-bold flex items-center justify-center text-white ${
                            overrideBackgroundValue === bg.val ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-800'
                          }`}
                          style={{ background: bg.val.startsWith('linear-gradient') ? bg.val : bg.val }}
                        >
                          <span className="bg-black/35 px-1.5 py-0.5 rounded filter drop-shadow">
                            {bg.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid of preset wallpaper images */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Wallpapers</span>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[
                        { name: 'Desk', val: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Forest', val: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Peaks', val: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Starry', val: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Sunset', val: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Cabin', val: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Aurora', val: 'https://images.unsplash.com/photo-1483168527879-c66136b56105?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1483168527879-c66136b56105?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Neon', val: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Dunes', val: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80' },
                        { name: 'Abstract', val: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2560&q=85', preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80' }
                      ].map((bg) => (
                        <button
                          key={bg.name}
                          type="button"
                          onClick={() => setOverrideBackgroundValue(bg.val)}
                          className={`h-9 rounded-xl border relative overflow-hidden text-[9px] font-bold flex items-center justify-center text-white bg-cover bg-center transition-all ${
                            overrideBackgroundValue === bg.val ? 'border-indigo-600 ring-2 ring-indigo-500/20 scale-[1.02]' : 'border-gray-200 dark:border-gray-800 hover:scale-[1.02]'
                          }`}
                          style={{ backgroundImage: `url(${bg.preview})` }}
                        >
                          <span className="bg-black/35 px-1.5 py-0.5 rounded filter drop-shadow">
                            {bg.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Wallpaper Section */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Custom Wallpaper</span>
                    {overrideBackgroundValue.startsWith('data:image/') ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <div 
                          className="w-12 h-9 rounded-lg bg-cover bg-center border border-gray-200 dark:border-gray-800"
                          style={{ backgroundImage: `url(${overrideBackgroundValue})` }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">Your Custom Wallpaper</p>
                          <p className="text-[9px] text-gray-400">Saved in board storage</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOverrideBackgroundValue('')}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300 hover:border-indigo-400 dark:hover:border-indigo-600 group text-center">
                        <div className="flex items-center gap-2">
                          <Upload size={14} className="text-gray-400 group-hover:text-indigo-500 group-hover:-translate-y-0.5 transition-all duration-300" />
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">Upload image file</span>
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">Supports PNG, JPG (auto-compressed to HD)</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="submit" className="btn-primary flex-1 justify-center text-xs py-2.5 rounded-xl">
                    Save Changes
                  </button>
                  {boardOverride && (
                    <button 
                      type="button" 
                      onClick={handleClearCustomization} 
                      className="btn-danger justify-center text-xs py-2.5 px-4 rounded-xl"
                    >
                      Reset
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setCustomizerOpen(false)} 
                    className="btn-secondary justify-center text-xs py-2.5 px-4 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : activeCustomizerTab === 'email' ? (
              <form onSubmit={handleSaveEmailSettings} className="p-4 md:p-6 space-y-4 md:space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Active Incoming Email status toggle */}
                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-[#172b4d] dark:text-[#b6c2cf] block">Enable Email-to-Board</span>
                    <span className="text-[10px] text-gray-400">Allow creating cards by forwarding emails to this board</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={emailEnabled} 
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                {/* Email Address block */}
                {emailEnabled && (
                  <div className="space-y-2.5">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl space-y-2">
                      <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">Unique Incoming Board Email</span>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder="inbox@mccmrfip.in"
                          className="tf-input font-mono text-[11px] flex-1 bg-white dark:bg-[#1d2125] border-gray-250 dark:border-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (emailAddress) {
                              navigator.clipboard.writeText(emailAddress);
                              addToast('Address Copied', 'Incoming board email address copied to clipboard.', 'success');
                            }
                          }}
                          disabled={!emailAddress}
                          className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 shrink-0 rounded-xl disabled:opacity-55"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-150 dark:border-gray-800/80">
                        <span className="text-[9px] text-gray-400">Define your custom board email address (e.g. inbox@mccmrfip.in).</span>
                      </div>
                    </div>

                    {/* Target list */}
                    <div>
                      <label className="tf-label font-semibold">Default Column Target</label>
                      <select 
                        value={emailListId} 
                        onChange={(e) => setEmailListId(e.target.value)}
                        className="tf-input text-xs rounded-xl"
                      >
                        <option value="">-- Choose Column (Defaults to First) --</option>
                        {currentBoard.lists?.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Default Priority */}
                    <div>
                      <label className="tf-label font-semibold">Default Card Priority</label>
                      <select 
                        value={emailPriority} 
                        onChange={(e) => setEmailPriority(e.target.value)}
                        className="tf-input text-xs rounded-xl"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>

                    {/* Thread matching action */}
                    <div>
                      <label className="tf-label font-semibold">When email matches an existing thread</label>
                      <select 
                        value={emailThreadAction} 
                        onChange={(e) => setEmailThreadAction(e.target.value)}
                        className="tf-input text-xs rounded-xl"
                      >
                        <option value="COMMENT">Post reply as Card Comment</option>
                        <option value="ACTIVITY">Log reply in Card Activity Log</option>
                      </select>
                    </div>

                    {/* Allowed Senders input */}
                    <div>
                      <label className="tf-label font-semibold flex items-center gap-1.5">
                        Allowed Senders
                        <span title="Enter 'ANY' for no restrictions, or enter comma-separated domains (e.g. client.com, work.org) / email addresses.">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </span>
                      </label>
                      <input 
                        type="text" 
                        value={emailAllowedSenders} 
                        onChange={(e) => setEmailAllowedSenders(e.target.value)}
                        placeholder="ANY, or domains (e.g. gmail.com, corporate.com)"
                        className="tf-input text-xs rounded-xl"
                      />
                    </div>

                    {/* Default Labels */}
                    <div>
                      <label className="tf-label font-semibold">Default Card Labels (Comma-separated)</label>
                      <input 
                        type="text" 
                        value={emailDefaultLabels} 
                        onChange={(e) => setEmailDefaultLabels(e.target.value)}
                        placeholder="e.g. Support, Client Request, Bug"
                        className="tf-input text-xs rounded-xl"
                      />
                    </div>

                    {/* Auto Assignees */}
                    <div>
                      <label className="tf-label font-semibold">Auto-Assign Workspace Members</label>
                      <div className="max-h-24 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl p-2.5 space-y-1.5 bg-slate-50 dark:bg-slate-900/60">
                        {currentWorkspace?.members.map(m => (
                          <label key={m.user.id} className="flex items-center gap-2 text-xs cursor-pointer text-slate-700 dark:text-slate-350">
                            <input 
                              type="checkbox"
                              checked={emailAutoAssignees.includes(m.user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEmailAutoAssignees([...emailAutoAssignees, m.user.id]);
                                } else {
                                  setEmailAutoAssignees(emailAutoAssignees.filter(id => id !== m.user.id));
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{m.user.name || m.user.username}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Built-in Documentation panel */}
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl p-3 text-[11px] text-blue-700 dark:text-blue-400 space-y-1.5">
                  <strong className="block font-bold">ℹ️ How Email-to-Board Works</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Forward emails to the unique board address to instantly create Kanban cards.</li>
                    <li><b>Title:</b> The email subject will become the card title.</li>
                    <li><b>Description:</b> Cleaned email body text (signatures and reply history are automatically stripped).</li>
                    <li><b>Checklists:</b> Include checklist syntaxes like <code>- [ ] Item name</code> in the body to auto-populate card checklist items.</li>
                    <li><b>Thread support:</b> Replies to the same email chain won't duplicate cards; they append as comments or logs.</li>
                  </ul>
                </div>

                {/* Save Buttons */}
                <div className="flex gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="submit" className="btn-primary flex-1 justify-center text-xs py-2.5 rounded-xl">
                    Save settings
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCustomizerOpen(false)} 
                    className="btn-secondary justify-center text-xs py-2.5 px-4 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : activeCustomizerTab === 'archive' ? (
              <div className="p-4 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto text-[#172b4d] dark:text-[#b6c2cf]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Restore previously archived lists or task cards to the board.
                </p>

                {loadingArchived ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin border-indigo-500" />
                    <span className="text-xs text-gray-400">Loading archives...</span>
                  </div>
                ) : (
                  <div className="space-y-5">
                    
                    {/* Archived Lists Section */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Columns className="w-3.5 h-3.5" /> Archived Columns ({archivedLists.length})
                      </h4>
                      {archivedLists.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic py-1">No archived columns on this board.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {archivedLists.map(l => (
                            <div key={l.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-150 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900/40">
                              <span className="text-xs font-semibold truncate max-w-[16rem]">{l.name}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateList(boardId, l.id, undefined, undefined, false);
                                    addToast('Column Restored', `"${l.name}" column and its cards restored.`, 'success');
                                    loadArchivedItems();
                                  } catch (err: any) {
                                    addToast('Error', err.message || 'Failed to restore column', 'error');
                                  }
                                }}
                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-650 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Archived Cards Section */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#8590a2] flex items-center gap-1.5">
                        <CalendarCheck className="w-3.5 h-3.5" /> Archived Cards ({archivedCards.length})
                      </h4>
                      {archivedCards.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic py-1">No archived cards on this board.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {archivedCards.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-150 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900/40">
                              <div className="min-w-0 pr-2">
                                <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</span>
                                <span className="text-[9px] text-gray-400">Originally in column: <span className="font-medium text-gray-500 dark:text-gray-405">{c.list?.name || 'Unknown'}</span></span>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateCard(boardId, c.id, { isArchived: false });
                                    addToast('Card Restored', `"${c.title}" has been restored.`, 'success');
                                    loadArchivedItems();
                                  } catch (err: any) {
                                    addToast('Error', err.message || 'Failed to restore card', 'error');
                                  }
                                }}
                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-650 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                <div className="flex gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    type="button" 
                    onClick={() => setCustomizerOpen(false)} 
                    className="btn-secondary flex-1 justify-center text-xs py-2.5 rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="p-4 border border-red-200/60 dark:border-red-900/40 rounded-xl bg-red-50/10 dark:bg-red-950/5 space-y-3">
                  <h4 className="font-bold text-sm text-red-650 dark:text-red-400">Permanently Delete Board</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    This will permanently delete the board, including all cards, lists, attachments, dependencies, automations, and milestones. This action is irreversible.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteBoardFromInside}
                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm focus:outline-none flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Board
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* View All Members Modal */}
      {showAllMembersModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4" 
          onClick={() => setShowAllMembersModal(false)}
        >
          <div 
            className="w-full max-w-sm modal-card p-5 shadow-2xl animate-scale-in relative bg-white dark:bg-[#1c2128]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#dfe1e6] dark:border-[#a6c5e229]">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Users className="w-4 h-4 text-indigo-500" /> Workspace Members ({currentWorkspace?.members.length})
              </h3>
              <button 
                onClick={() => setShowAllMembersModal(false)}
                className="btn-icon p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 max-h-60 overflow-y-auto pr-1 space-y-2.5">
              {currentWorkspace?.members.map((m) => {
                const badge = ROLE_BADGES[m.role] || { label: m.role, bg: 'bg-slate-100', text: 'text-slate-600' };
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                        alt="avatar"
                        className="w-8 h-8 rounded-full shrink-0 object-cover border border-slate-200 dark:border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-tight text-slate-850 dark:text-[#f0f6fc]">
                          {m.user.name || m.user.username}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                          @{m.user.username}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
