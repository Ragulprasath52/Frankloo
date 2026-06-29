import { useState, useEffect } from 'react';
import { useStore, getAvatarUrl } from '../store/useStore';
import type { Card } from '../store/useStore';
import { apiUrl } from '../config/api';

import { 
  Columns, Calendar as CalendarIcon, 
  BarChart3, UserCheck, Play, ArrowLeft, Plus, X, Trash2, 
  CalendarCheck, Clock, CheckCircle, PlusCircle, Copy, Check, Info, Lock, Paintbrush,
  MessageSquare, AlertCircle, Sparkles, ChevronRight, Flame, Upload, HelpCircle, Users
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
    user, currentBoard, fetchBoardDetails,
    createList, deleteList, createCard, updateCard,
    createAutomationRule, deleteAutomationRule, currentWorkspace, convertInboxItem, token,
    addToast
  } = useStore();

  const themeStore = useThemeStore();
  const boardOverride = themeStore.boardOverrides[boardId];

  const [activeTab, setActiveTab] = useState<TabType>('kanban');
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [cardTitles, setCardTitles] = useState<Record<string, string>>({}); // keyed by listId
  const [calendarSyncOpen, setCalendarSyncOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  // Customizer form states
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [overrideIcon, setOverrideIcon] = useState('');
  const [overrideCover, setOverrideCover] = useState('');
  const [overrideCoverColor, setOverrideCoverColor] = useState('');
  const [overrideAccentColor, setOverrideAccentColor] = useState('');
  const [overrideBackgroundValue, setOverrideBackgroundValue] = useState('');

  // Sync state values when Customizer opens
  useEffect(() => {
    if (customizerOpen) {
      setOverrideIcon(boardOverride?.icon || '📋');
      setOverrideCover(boardOverride?.coverImage || '');
      setOverrideCoverColor(boardOverride?.coverColor || '#6366f1');
      setOverrideAccentColor(boardOverride?.accentColor || '#6366f1');
      setOverrideBackgroundValue(boardOverride?.backgroundValue || '');
    }
  }, [customizerOpen, boardOverride]);

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

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const inboxItemId = e.dataTransfer.getData('inboxItemId');

    if (inboxItemId && currentWorkspace) {
      try {
        await convertInboxItem(currentWorkspace.id, inboxItemId, boardId, targetListId);
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
              <h2 className="text-sm sm:text-base font-bold leading-tight flex items-center gap-2 truncate" style={{ color: 'var(--text-primary)' }}>
                <span className="truncate">{currentBoard.name}</span>
                {totalTasks > 0 && (
                  <span className="hidden md:inline text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {totalTasks} Tasks
                  </span>
                )}
              </h2>
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
          <div className="absolute bottom-4 left-6 flex items-center gap-2">
            <span className="text-3xl filter drop-shadow">{boardOverride?.icon || '📋'}</span>
            <h1 className="text-xl font-extrabold text-white filter drop-shadow-md">{currentBoard.name}</h1>
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
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, list.id)}
                className={`kb-column ${hasCustomBg ? 'kb-column-glass' : ''}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-gray-200/50 dark:border-gray-800/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#172b4d] dark:text-[#cbd5e1] truncate max-w-[10rem]">
                      {list.name}
                    </span>
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
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
                    onClick={() => deleteList(boardId, list.id)}
                    className="btn-icon w-6 h-6 rounded-md hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Delete list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onClick={() => onOpenCardDetails(card)}
                          className={`kb-card space-y-3 animate-fade-in ${
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
                          <div className="flex items-start gap-1.5">
                            {cardEmoji && <span className="text-sm shrink-0 leading-none mt-0.5">{cardEmoji}</span>}
                            <h4 className="text-xs font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                              {card.title}
                            </h4>
                          </div>

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

      {/* Redesigned Customizer Modal Panel */}
      {customizerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-[32rem] bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl animate-scale-in overflow-hidden mx-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-indigo-500" /> Customize Board Styling
              </h3>
              <button onClick={() => setCustomizerOpen(false)} className="btn-icon rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomization} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Board Emoji & Cover Image URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
