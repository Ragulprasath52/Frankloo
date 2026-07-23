import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

import {
  Plus, PlusCircle,
  Trash2, Copy, X, MoreVertical,
  Cpu,
  Mail, RefreshCw, Activity, CheckSquare, ExternalLink, AlertCircle,
  Search, Star
} from 'lucide-react';
import AppearanceSettings from './AppearanceSettings';
import WikiDocsModule from './WikiDocsModule';
import GoalsModule from './GoalsModule';
import MembersModule from './MembersModule';
import InsightsModule from './InsightsModule';
import WorkspaceInvitationPortal from './WorkspaceInvitationPortal';
import BoardInboxModule from './BoardInboxModule';

interface WorkspaceDashboardProps {
  activeTab: string;
  onSelectBoard: (boardId: string) => void;
}

const BOARD_GRADIENTS: Record<string, string> = {
  indigo:  'var(--gradient-indigo)',
  rose:    'var(--gradient-rose)',
  emerald: 'var(--gradient-emerald)',
  amber:   'var(--gradient-amber)',
  sky:     'var(--gradient-sky)',
  slate:   'var(--gradient-slate)',
  violet:  'var(--gradient-violet)',
  teal:    'var(--gradient-teal)',
  pink:    'var(--gradient-pink)',
  orange:  'var(--gradient-orange)',
};

// Keep legacy class-based map for backward compat
export const COLORS: Record<string, string> = {
  indigo: 'from-indigo-500 to-indigo-700', rose: 'from-rose-500 to-rose-700',
  emerald: 'from-emerald-500 to-emerald-700', amber: 'from-amber-400 to-amber-600',
  sky: 'from-sky-500 to-sky-700', slate: 'from-slate-500 to-slate-700',
  violet: 'from-violet-500 to-violet-700', teal: 'from-teal-500 to-teal-700',
  pink: 'from-pink-500 to-pink-700', orange: 'from-orange-500 to-orange-700',
};

export default function WorkspaceDashboard({ activeTab, onSelectBoard }: WorkspaceDashboardProps) {
  const {
    user,
    currentWorkspace, createBoard, duplicateBoard, deleteBoard,
    fetchDocuments,
    gmailProfile, gmailLogs, fetchGmailProfile, updateGmailSettings,
    connectGmail, disconnectGmail, syncGmailInbox,
    fetchGmailLogs, isInboxOpen, addToast, showConfirm
  } = useStore();

  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailSuccess, setGmailSuccess] = useState<string | null>(null);

  const gridColsClass = isInboxOpen
    ? "grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6"
    : "grid grid-cols-1 xl:grid-cols-3 gap-6";

  const col2BorderClass = isInboxOpen
    ? "space-y-5 xl:col-span-1 2xl:border-r border-[#dfe1e6] dark:border-[#a6c5e229] pr-0 xl:pr-6 pb-6 xl:pb-0 border-b xl:border-b-0"
    : "space-y-5 xl:col-span-1 xl:border-r border-[#dfe1e6] dark:border-[#a6c5e229] pr-0 xl:pr-6 pb-6 xl:pb-0 border-b xl:border-b-0";

  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDesc, setBoardDesc] = useState('');
  const [boardBg, setBoardBg] = useState('indigo');
  const [activeDropdownBoardId, setActiveDropdownBoardId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('trel_favorite_boards') || '[]');
    } catch {
      return [];
    }
  });

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownBoardId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFavoriteBoard = (boardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = favorites.includes(boardId)
      ? favorites.filter(id => id !== boardId)
      : [...favorites, boardId];
    setFavorites(updated);
    localStorage.setItem('trel_favorite_boards', JSON.stringify(updated));
  };

  useEffect(() => {
    if (activeTab === 'documents' && currentWorkspace) {
      fetchDocuments(currentWorkspace.id);
    }
    if (activeTab === 'integrations' && currentWorkspace) {
      fetchGmailProfile();
      fetchGmailLogs();
    }
  }, [activeTab, currentWorkspace]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim() || !currentWorkspace) return;
    try {
      const board = await createBoard(currentWorkspace.id, boardName, boardDesc, boardBg);
      setBoardName(''); setBoardDesc(''); setBoardBg('indigo'); setBoardModalOpen(false);
      onSelectBoard(board.id);
    } catch (e) { console.error(e); }
  };

  const handleDuplicateBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await duplicateBoard(boardId); } catch { }
  };

  const handleDeleteBoard = async (boardId: string, boardName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      '🗑️ Delete Board',
      `Are you sure you want to permanently delete "${boardName}"? This will delete all lists, cards, and data inside it. This action cannot be undone.`,
      'Yes, Delete Board',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      await deleteBoard(boardId);
      addToast('Board Deleted', `"${boardName}" has been permanently deleted.`, 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete board. Please try again.', 'error');
    }
  };

  // Gmail Action Handlers
  const handleConnectGmail = async () => {
    try {
      setGmailError(null);
      const url = await connectGmail();
      const width = 550;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        url,
        'Connect Gmail',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          fetchGmailProfile();
          fetchGmailLogs();
        }
      }, 1000);
    } catch (err: any) {
      setGmailError(err.message || 'Failed to initiate Gmail connection');
    }
  };

  const handleDisconnectGmail = async () => {
    const confirmed = await showConfirm(
      'Disconnect Gmail',
      'Are you sure you want to disconnect your Gmail account?',
      'Disconnect',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      setGmailError(null);
      await disconnectGmail();
      setGmailSuccess('Gmail account disconnected successfully');
      setTimeout(() => setGmailSuccess(null), 4000);
      fetchGmailProfile();
      fetchGmailLogs();
    } catch (err: any) {
      setGmailError(err.message || 'Failed to disconnect Gmail');
    }
  };

  const handleSyncGmail = async () => {
    if (!currentWorkspace) return;
    try {
      setGmailError(null);
      setGmailSyncing(true);
      await syncGmailInbox(currentWorkspace.id);
      setGmailSuccess('Gmail inbox synced successfully!');
      setTimeout(() => setGmailSuccess(null), 4000);
    } catch (err: any) {
      setGmailError(err.message || 'Gmail sync failed');
    } finally {
      setGmailSyncing(false);
    }
  };



  const handleToggleSetting = async (field: string, value: boolean) => {
    try {
      setGmailError(null);
      await updateGmailSettings({ [field]: value });
    } catch (err: any) {
      setGmailError(err.message || 'Failed to update Gmail settings');
    }
  };








  const currentMember = currentWorkspace?.members?.find(m => m.user?.id === user?.id);
  const isEditor = currentWorkspace?.myRole === 'OWNER' || currentWorkspace?.myRole === 'ADMIN' || currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 select-none" style={{ background: 'var(--bg-body)' }}>
        <div className="text-center max-w-sm p-8 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-muted)' }}>
            <PlusCircle className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>No Workspace Selected</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Create a workspace via the selector in the sidebar, or wait for your workspaces to finish loading.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto overflow-x-hidden">
      {/* ── Boards Tab ─────────────────────── */}
      {activeTab === 'boards' && (
        (() => {
          const filteredBoards = currentWorkspace?.boards?.filter(b => 
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (b.description || '').toLowerCase().includes(searchQuery.toLowerCase())
          ) || [];


          return (
            <div className="p-6 max-w-6xl mx-auto w-full animate-fade-in" style={{ color: 'var(--text-primary)' }}>
              {/* ── Header ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {currentWorkspace?.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                      {currentWorkspace?.boards?.length || 0} board{(currentWorkspace?.boards?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                      {currentWorkspace?.members?.length || 0} member{(currentWorkspace?.members?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search boards…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="tf-input pl-8 pr-10 py-1.5 text-xs h-8"
                      style={{ width: '200px' }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold hidden sm:block" style={{ color: 'var(--text-muted)' }}>⌘K</span>
                  </div>
                  <button onClick={() => setBoardModalOpen(true)} className="btn-primary text-xs h-8 px-3 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> New board
                  </button>
                </div>
              </div>

              {/* ── Board Grid ── */}
              {(!currentWorkspace?.boards || currentWorkspace.boards.length === 0) ? (
                <div className="empty-state mt-8">
                  <div className="empty-state-icon"><PlusCircle className="w-5 h-5" /></div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>No boards yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create your first board to start organizing work with your team.</p>
                  <button onClick={() => setBoardModalOpen(true)} className="btn-primary text-xs mt-2">
                    <Plus className="w-3.5 h-3.5" /> Create board
                  </button>
                </div>
              ) : filteredBoards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No boards match "{searchQuery}"</p>
                </div>
              ) : (
                <>
                  {/* Starred section */}
                  {filteredBoards.some(b => favorites.includes(b.id)) && (
                    <div className="mb-6">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Star className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>STARRED</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredBoards.filter(b => favorites.includes(b.id)).map(b => (
                          <BoardCard key={b.id} b={b} onSelect={onSelectBoard} isFavorite={true} onToggleFavorite={toggleFavoriteBoard} isEditor={isEditor} onDuplicate={handleDuplicateBoard} onDelete={handleDeleteBoard} activeDropdownId={activeDropdownBoardId} setActiveDropdownId={setActiveDropdownBoardId} members={currentWorkspace?.members || []} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All boards */}
                  <div>
                    {filteredBoards.some(b => favorites.includes(b.id)) && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>ALL BOARDS</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredBoards.filter(b => !favorites.includes(b.id)).map(b => (
                        <BoardCard key={b.id} b={b} onSelect={onSelectBoard} isFavorite={false} onToggleFavorite={toggleFavoriteBoard} isEditor={isEditor} onDuplicate={handleDuplicateBoard} onDelete={handleDeleteBoard} activeDropdownId={activeDropdownBoardId} setActiveDropdownId={setActiveDropdownBoardId} members={currentWorkspace?.members || []} />
                      ))}
                      {/* New board tile */}
                      <button
                        onClick={() => setBoardModalOpen(true)}
                        className="aspect-[5/3] rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '2px dashed var(--border)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Plus className="w-4 h-4" /> New
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()
      )}


      {/* ── Board Inbox Tab ─────────────────────────── */}
      {activeTab === 'board-inbox' && currentWorkspace && (
        <BoardInboxModule
          workspaceId={currentWorkspace.id}
          isEditor={isEditor}
          onSelectBoard={onSelectBoard}
        />
      )}

      {/* ── Members Tab ─────────────────────────────── */}
      {activeTab === 'members' && (
        <MembersModule
          workspaceId={currentWorkspace.id}
          isEditor={isEditor}
          onSelectBoard={onSelectBoard}
        />
      )}

      {/* ── Goals Tab ───────────────────────────────── */}
      {activeTab === 'goals' && (
        <GoalsModule
          workspaceId={currentWorkspace.id}
          isEditor={isEditor}
          onSelectBoard={onSelectBoard}
        />
      )}

      {/* ── Documents Tab ────────────────────────────── */}
      {activeTab === 'documents' && (
        <WikiDocsModule
          workspaceId={currentWorkspace.id}
          isEditor={isEditor}
          onSelectBoard={onSelectBoard}
        />
      )}

      {/* ── Insights Tab ────────────────────────────── */}
      {activeTab === 'insights' && currentWorkspace && (
        <InsightsModule
          workspaceId={currentWorkspace.id}
          onSelectBoard={onSelectBoard}
        />
      )}


      {/* ── Integrations Tab ────────────────────────── */}
      {activeTab === 'integrations' && currentWorkspace && (
        <div className="p-4 sm:p-8 max-w-4xl h-[calc(100vh-48px)] overflow-y-auto animate-fade-in select-none">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" /> Platform Integrations
            </h2>
            <p className="text-sm text-[#44546f] dark:text-[#9fadbc] mt-0.5">
              Connect Frankloo to external systems to receive alerts, sync calendars, or connect commit logs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">

            {/* ── Gmail Integration Testing Center ── */}
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[12px] p-5 md:p-6 shadow-sm space-y-6 md:col-span-2">
              {/* Card Header — stacks on mobile, row on md+ */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[#dfe1e6] dark:border-[#a6c5e229] pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-base text-[#172b4d] dark:text-[#b6c2cf] block leading-snug">Gmail Integration &amp; Test Center</span>
                    <span className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">OAuth, Real-time Inbox Sync, and Automated Notifications</span>
                  </div>
                </div>
                {/* Connection Status Badge */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {gmailProfile?.googleEmail && gmailProfile?.hasToken ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 max-w-[200px] truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      Connected: {gmailProfile.googleEmail}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md">
                      Disconnected
                    </span>
                  )}
                </div>
              </div>

              {/* Status messages */}
              {gmailError && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 rounded-lg text-xs text-red-700 dark:text-red-400 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div><span className="font-bold">Error:</span> {gmailError}</div>
                </div>
              )}
              {gmailSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-3 rounded-lg text-xs text-emerald-700 dark:text-emerald-400 animate-fade-in">
                  <CheckSquare className="w-4 h-4 shrink-0" />
                  <div>{gmailSuccess}</div>
                </div>
              )}

              <div className={gridColsClass}>
                
                {/* COLUMN 1: Connection & Settings */}
                <div className="space-y-4 xl:col-span-1 xl:border-r border-[#dfe1e6] dark:border-[#a6c5e229] pr-0 xl:pr-6 pb-6 xl:pb-0 border-b xl:border-b-0">
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Account Connection</h4>
                  
                  {!gmailProfile?.googleEmail || !gmailProfile?.hasToken ? (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/20 p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">
                        Connect your Gmail account to enable inbox sync and automated email alerts.
                      </p>
                      
                      <button
                        onClick={handleConnectGmail}
                        className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 font-semibold text-xs mt-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Connect Account
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/20 p-4 rounded-lg border border-[#dfe1e6] dark:border-[#a6c5e229]">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Connected Account</span>
                        <span className="font-bold text-xs text-[#172b4d] dark:text-[#b6c2cf] block break-all">{gmailProfile.googleEmail}</span>
                      </div>
                      
                      <button
                        onClick={handleDisconnectGmail}
                        className="btn-secondary hover:text-red-500 hover:border-red-500/30 w-full py-2 flex items-center justify-center gap-1 text-xs"
                        style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                      >
                        Disconnect Account
                      </button>
                    </div>
                  )}

                  {/* Notification settings */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Email Preferences</h4>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gmailProfile?.dailySummaryEnabled ?? true}
                          onChange={(e) => handleToggleSetting('dailySummaryEnabled', e.target.checked)}
                          className="rounded border-[#dfe1e6] text-blue-600 focus:ring-blue-500"
                        />
                        <span>Send Daily Summary Email</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gmailProfile?.upcomingDeadlinesEnabled ?? true}
                          onChange={(e) => handleToggleSetting('upcomingDeadlinesEnabled', e.target.checked)}
                          className="rounded border-[#dfe1e6] text-blue-600 focus:ring-blue-500"
                        />
                        <span>Alert on Upcoming Deadlines</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gmailProfile?.overdueAlertsEnabled ?? true}
                          onChange={(e) => handleToggleSetting('overdueAlertsEnabled', e.target.checked)}
                          className="rounded border-[#dfe1e6] text-blue-600 focus:ring-blue-500"
                        />
                        <span>Alert on Overdue Tasks</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Synchronization & Reminders */}
                <div className={col2BorderClass}>
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Synchronization Hub</h4>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-lg border border-[#dfe1e6] dark:border-[#a6c5e229] space-y-3">
                    <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">
                      Sync with the Google API inbox to retrieve recent emails and display them in the global <b>Frankloo Inbox panel</b>.
                    </p>
                    <button
                      onClick={handleSyncGmail}
                      disabled={!gmailProfile?.googleEmail || !gmailProfile?.hasToken || gmailSyncing}
                      className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 font-semibold text-xs disabled:opacity-50"
                      style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${gmailSyncing ? 'animate-spin' : ''}`} />
                      {gmailSyncing ? 'Syncing Inbox...' : 'Sync Gmail Inbox'}
                    </button>
                  </div>
                </div>

                {/* COLUMN 3: Activity Log Feed */}
                <div className="space-y-3 xl:col-span-1 flex flex-col h-[320px]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-indigo-500" /> Activity Logs
                    </h4>
                    <button
                      onClick={fetchGmailLogs}
                      className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 bg-transparent border-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-slate-950 dark:bg-black/40 border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-lg p-3 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-2">
                    {!gmailLogs || gmailLogs.length === 0 ? (
                      <div className="text-slate-500 italic text-center pt-8">
                        No activity recorded yet
                      </div>
                    ) : (
                      gmailLogs.map((log) => {
                        let badgeColor = 'text-blue-400 border-blue-900/30 bg-blue-950/20';
                        if (log.type === 'SYNC') badgeColor = 'text-indigo-400 border-indigo-900/30 bg-indigo-950/20';
                        if (log.type === 'NOTIFICATION_SENT') badgeColor = 'text-emerald-400 border-emerald-900/30 bg-emerald-950/20';
                        if (log.type === 'DAILY_SUMMARY') badgeColor = 'text-purple-400 border-purple-900/30 bg-purple-950/20';
                        
                        return (
                          <div key={log.id} className="border-b border-slate-800/60 pb-1.5 last:border-b-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold ${badgeColor}`}>
                                {log.type}
                              </span>
                              <span className="text-slate-500 text-[8px]">
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-400 mt-1 leading-normal break-words">{log.details}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>



            </div>
          </div>
        </div>
      )}

      {/* ── Appearance Tab ──────────────────────────── */}
      {activeTab === 'appearance' && (
        <AppearanceSettings />
      )}

      {/* ── Invitations Tab ─────────────────────────── */}
      {activeTab === 'invitations' && (
        <WorkspaceInvitationPortal workspaceId={currentWorkspace.id} />
      )}


      {/* ── Create Board Modal ───────────────────────── */}
      {boardModalOpen && (
        <div className="modal-overlay" onClick={() => setBoardModalOpen(false)}>
          <div className="w-full max-w-sm modal-card shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Create board</h3>
              <button onClick={() => setBoardModalOpen(false)} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              {/* Live Preview */}
              <div
                className="h-24 w-full rounded-xl mb-4 transition-all duration-300 shadow-sm"
                style={{ background: BOARD_GRADIENTS[boardBg] || BOARD_GRADIENTS.indigo }}
              >
                <div className="p-3 h-full flex items-end">
                  <p className="text-white font-bold text-sm truncate opacity-90">{boardName || 'Board name'}</p>
                </div>
              </div>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div>
                  <label className="tf-label">Board title *</label>
                  <input
                    type="text" value={boardName}
                    onChange={e => setBoardName(e.target.value)}
                    placeholder="e.g. Q4 Roadmap, Marketing Sprint"
                    className="tf-input" required autoFocus
                  />
                </div>
                <div>
                  <label className="tf-label">Description</label>
                  <textarea
                    value={boardDesc} onChange={e => setBoardDesc(e.target.value)}
                    placeholder="What is this board about?" rows={2} className="tf-input resize-none"
                  />
                </div>
                <div>
                  <label className="tf-label">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(BOARD_GRADIENTS).map(([key, grad]) => (
                      <button
                        key={key} type="button"
                        onClick={() => setBoardBg(key)}
                        className="w-9 h-7 rounded-lg transition-all relative"
                        style={{ background: grad, outline: boardBg === key ? '3px solid var(--accent)' : 'none', outlineOffset: '2px' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary">Create board</button>
                  <button type="button" onClick={() => setBoardModalOpen(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}




    </div>
  );
}

// ── Trello-style Board Card Subcomponent ──
interface BoardCardProps {
  b: any;
  onSelect: (id: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  isEditor: boolean;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;
  members: any[];
}

function BoardCard({
  b, onSelect, isFavorite, onToggleFavorite, isEditor,
  onDuplicate, onDelete, activeDropdownId, setActiveDropdownId, members
}: BoardCardProps) {
  const totalTasks = b.lists?.flatMap((l: any) => l.cards).length || 0;
  const completedTasks = b.lists
    ?.filter((l: any) => l.name.toLowerCase() === 'done' || l.name.toLowerCase() === 'completed')
    ?.flatMap((l: any) => l.cards).length || 0;

  const bgGradient = BOARD_GRADIENTS[b.background] || BOARD_GRADIENTS.indigo;

  return (
    <div
      onClick={() => onSelect(b.id)}
      className="group relative flex flex-col rounded-lg overflow-hidden border transition-all duration-150 cursor-pointer aspect-[5/3]"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Cover Header */}
      <div className="h-10 w-full relative" style={{ background: bgGradient }}>
        {/* Star icon (always visible if favorite, otherwise visible on hover) */}
        <button
          onClick={e => onToggleFavorite(b.id, e)}
          className={`absolute top-1.5 left-2 z-10 transition-opacity ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white/80'}`} />
        </button>

        {/* Options */}
        <div className="absolute top-1.5 right-2 z-10">
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setActiveDropdownId(activeDropdownId === b.id ? null : b.id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 text-white"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {activeDropdownId === b.id && (
            <div
              className="absolute right-0 mt-1 w-28 py-1 rounded-md shadow-lg z-20"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={e => {
                  setActiveDropdownId(null);
                  onDuplicate(b.id, e);
                }}
                className="w-full text-left px-2.5 py-1 text-[11px] flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-primary)' }}
              >
                <Copy className="w-3 h-3" /> Duplicate
              </button>
              {isEditor && (
                <button
                  onClick={e => {
                    setActiveDropdownId(null);
                    onDelete(b.id, b.name, e);
                  }}
                  className="w-full text-left px-2.5 py-1 text-[11px] flex items-center gap-1.5 hover:bg-rose-500/10 border-t"
                  style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Details */}
      <div className="p-2.5 flex-1 flex flex-col justify-between min-h-0">
        <div>
          <h3 className="font-semibold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
            {b.name}
          </h3>
          <p className="text-[10px] line-clamp-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {b.description || 'No description.'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-1 pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Member stack */}
          <div className="flex -space-x-1">
            {members.slice(0, 3).map((m, idx) => {
              const init = (m.user?.name || m.user?.username || '?').substring(0, 2).toUpperCase();
              const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b'];
              return (
                <div
                  key={m.user?.id || idx}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white border border-white dark:border-[#161a20]"
                  style={{ background: colors[idx % colors.length] }}
                  title={m.user?.name || m.user?.username}
                >
                  {init}
                </div>
              );
            })}
            {members.length > 3 && (
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                +{members.length - 3}
              </div>
            )}
          </div>

          <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            {completedTasks}/{totalTasks} tasks
          </span>
        </div>
      </div>
    </div>
  );
}

