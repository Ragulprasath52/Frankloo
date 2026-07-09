import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiUrl } from '../config/api';

import {
  Plus, PlusCircle,
  Trash2, Copy, X, MoreVertical,
  Slack, Github, Calendar, Cpu, Lock, Info, Zap,
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
    integrations, fetchIntegrations, updateIntegration, deleteIntegration, token,
    gmailProfile, gmailLogs, fetchGmailProfile, updateGmailSettings,
    connectGmail, disconnectGmail, syncGmailInbox,
    fetchGmailLogs, isInboxOpen, addToast, showConfirm,
    gmailRules, fetchGmailRules, createGmailRule, deleteGmailRule
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

  // Integrations state
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [isSlackEnabled, setIsSlackEnabled] = useState(true);

  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [isDiscordEnabled, setIsDiscordEnabled] = useState(true);

  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubSecret, setGithubSecret] = useState('');
  const [isGithubEnabled, setIsGithubEnabled] = useState(true);

  // Gmail Auto Rules States
  const [ruleTriggerType, setRuleTriggerType] = useState('SENDER');
  const [ruleTriggerVal, setRuleTriggerVal] = useState('');
  const [ruleTargetBoardId, setRuleTargetBoardId] = useState('');
  const [ruleTargetListId, setRuleTargetListId] = useState('');

  const handleCreateGmailRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTriggerVal.trim() || !ruleTargetBoardId) {
      addToast('Validation Error', 'Trigger match value and target board are required.', 'error');
      return;
    }
    try {
      await createGmailRule({
        triggerType: ruleTriggerType,
        triggerVal: ruleTriggerVal.trim(),
        targetBoardId: ruleTargetBoardId,
        targetListId: ruleTargetListId || undefined
      });
      addToast('Rule Created', 'Gmail Auto Routing Rule successfully added.', 'success');
      setRuleTriggerVal('');
      setRuleTargetBoardId('');
      setRuleTargetListId('');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to create rule', 'error');
    }
  };

  const handleDeleteGmailRule = async (ruleId: string) => {
    try {
      await deleteGmailRule(ruleId);
      addToast('Rule Deleted', 'Gmail Auto Routing Rule successfully deleted.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete rule', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'documents' && currentWorkspace) {
      fetchDocuments(currentWorkspace.id);
    }
    if (activeTab === 'integrations' && currentWorkspace) {
      fetchIntegrations(currentWorkspace.id);
      fetchGmailProfile();
      fetchGmailLogs();
      fetchGmailRules();
    }
  }, [activeTab, currentWorkspace]);

  useEffect(() => {
    if (!integrations) return;
    const slack = integrations.find(i => i.type === 'SLACK');
    if (slack) {
      setSlackWebhookUrl(slack.config.webhookUrl || '');
      setIsSlackEnabled(slack.isEnabled);
    } else {
      setSlackWebhookUrl('');
      setIsSlackEnabled(true);
    }

    const discord = integrations.find(i => i.type === 'DISCORD');
    if (discord) {
      setDiscordWebhookUrl(discord.config.webhookUrl || '');
      setIsDiscordEnabled(discord.isEnabled);
    } else {
      setDiscordWebhookUrl('');
      setIsDiscordEnabled(true);
    }

    const github = integrations.find(i => i.type === 'GITHUB');
    if (github) {
      setGithubOwner(github.config.repoOwner || '');
      setGithubRepo(github.config.repoName || '');
      setGithubSecret(github.config.secret || '');
      setIsGithubEnabled(github.isEnabled);
    } else {
      setGithubOwner('');
      setGithubRepo('');
      setGithubSecret('');
      setIsGithubEnabled(true);
    }
  }, [integrations]);

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

  // Integrations action handlers
  const handleSaveSlack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      await updateIntegration(currentWorkspace.id, 'SLACK', { webhookUrl: slackWebhookUrl }, isSlackEnabled);
      addToast('Slack Integration', 'Slack integration updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Slack Integration Error', 'Failed to update Slack integration', 'error');
    }
  };

  const handleSaveDiscord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      await updateIntegration(currentWorkspace.id, 'DISCORD', { webhookUrl: discordWebhookUrl }, isDiscordEnabled);
      addToast('Discord Integration', 'Discord integration updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Discord Integration Error', 'Failed to update Discord integration', 'error');
    }
  };

  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      await updateIntegration(
        currentWorkspace.id,
        'GITHUB',
        { repoOwner: githubOwner, repoName: githubRepo, secret: githubSecret },
        isGithubEnabled
      );
      addToast('GitHub Integration', 'GitHub integration updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('GitHub Integration Error', 'Failed to update GitHub integration', 'error');
    }
  };

  const handleDeleteIntegration = async (type: string) => {
    if (!currentWorkspace) return;
    const confirmed = await showConfirm(
      'Remove Integration',
      `Are you sure you want to remove the ${type} integration?`,
      'Remove',
      'Cancel'
    );
    if (!confirmed) return;
    try {
      await deleteIntegration(currentWorkspace.id, type);
      addToast('Integration Removed', `${type} integration removed successfully!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Integration Error', `Failed to remove ${type} integration`, 'error');
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

          const ownerMember = currentWorkspace?.members?.find(m => m.role.toLowerCase() === 'owner');
          const ownerName = ownerMember?.user?.name || ownerMember?.user?.username || 'Team Owner';

          return (
            <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-slate-800 dark:text-[#c9d1d9]">
              {/* ── Top Header Section ── */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6 shrink-0">
                <div className="space-y-1">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-sans">
                    {currentWorkspace?.name || 'Workspace Boards'}
                  </h1>
                  {currentWorkspace?.description && (
                    <p className="text-xs text-slate-500 dark:text-[#8d96a0] leading-relaxed max-w-xl truncate">
                      {currentWorkspace.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-550">
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400">
                      {currentWorkspace?.boards?.length || 0} Board{(currentWorkspace?.boards?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400">
                      {currentWorkspace?.members?.length || 0} Member{(currentWorkspace?.members?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Search and CTA Action block */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <div className="relative flex-grow sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-550" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search boards..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-650 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 transition-all font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center bg-slate-200/60 dark:bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-500 dark:text-slate-400 border border-slate-300/20">
                      Ctrl+K
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setBoardModalOpen(true)} 
                    className="btn-primary justify-center font-bold text-xs py-2 px-4.5 rounded-xl shadow-sm hover:translate-y-[-1px] transition-transform w-full sm:w-auto shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Board
                  </button>
                </div>
              </div>

              {/* ── Boards Grid / Layout ── */}
              {(!currentWorkspace?.boards || currentWorkspace.boards.length === 0) ? (
                /* Workspace Empty State */
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-850 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1.5 animate-pulse">No boards yet</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mb-5 leading-relaxed">
                    Create your first board to start planning, organizing projects, and tracking milestones with your team.
                  </p>
                  <button
                    onClick={() => setBoardModalOpen(true)}
                    className="btn-primary py-2 px-4 rounded-xl text-xs font-bold justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create your first board
                  </button>
                </div>
              ) : filteredBoards.length === 0 ? (
                /* Search Empty State */
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 max-w-xs mx-auto">
                  <span className="text-sm font-bold text-slate-400 dark:text-slate-550 block mb-1">No matching boards</span>
                  <span className="text-xs text-gray-400 block">Try checking your search filters or try another spelling.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredBoards.map(b => {
                    // Calculate task counts
                    const totalTasks = b.lists?.flatMap(l => l.cards).length || 0;
                    const completedTasks = b.lists
                      ?.filter(l => l.name.toLowerCase() === 'done' || l.name.toLowerCase() === 'completed')
                      ?.flatMap(l => l.cards).length || 0;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    const isFavorite = favorites.includes(b.id);

                    return (
                      <div
                        key={b.id}
                        onClick={() => onSelectBoard(b.id)}
                        className="group relative flex flex-col bg-white dark:bg-[#161b22] border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer"
                      >
                        {/* Top: Cover banner with absolute controls */}
                        <div 
                          className="h-16 w-full relative transition-all duration-200"
                          style={{ background: BOARD_GRADIENTS[b.background] || BOARD_GRADIENTS.indigo }}
                        >
                          {/* Overlay protection */}
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/15 transition-colors" />

                          {/* Top Left: Favorite Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => toggleFavoriteBoard(b.id, e)}
                            className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/25 hover:bg-black/45 text-white transition-all z-10 animate-fade-in"
                            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Star className={`w-3 h-3 transition-colors ${isFavorite ? "fill-amber-400 text-amber-400" : "text-white/80"}`} />
                          </button>

                          {/* Top Right: Options Trigger Button */}
                          <div className="absolute top-2 right-2 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveDropdownBoardId(activeDropdownBoardId === b.id ? null : b.id);
                              }}
                              className="p-1.5 rounded-lg bg-black/25 hover:bg-black/45 text-white transition-all"
                              title="Board options"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>

                            {/* Dropdown Options menu */}
                            {activeDropdownBoardId === b.id && (
                              <div
                                className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#21262d] border border-slate-200 dark:border-slate-850 rounded-lg shadow-xl py-1 z-20 animate-fade-in text-left text-xs"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveDropdownBoardId(null);
                                    handleDuplicateBoard(b.id, e);
                                  }}
                                  className="w-full px-3 py-1.5 text-slate-700 dark:text-[#c9d1d9] hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 font-medium"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicate
                                </button>
                                {isEditor && (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setActiveDropdownBoardId(null);
                                      handleDeleteBoard(b.id, b.name, e);
                                    }}
                                    className="w-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/10 flex items-center gap-2 font-medium border-t border-slate-100 dark:border-slate-800/60"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle: Details content */}
                        <div className="p-4 flex-grow flex flex-col justify-between space-y-3 min-h-[100px]">
                          <div className="space-y-1">
                            <h3 className="font-bold text-xs.5 text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                              {b.name}
                            </h3>
                            <p className="text-[11px] text-slate-450 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">
                              {b.description || "No project description provided."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-550 font-sans pt-1">
                            <span>Active Project</span>
                            <span className="font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 max-w-[90px] truncate">
                              {ownerName}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Progress + Members */}
                        <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2 bg-slate-50/30 dark:bg-slate-900/10">
                          <div className="flex items-center justify-between">
                            {/* Workspace member initials stack */}
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {(currentWorkspace?.members || []).slice(0, 3).map((m, idx) => {
                                const nameVal = m.user?.name || m.user?.username || "?";
                                const init = nameVal.substring(0, 2).toUpperCase();
                                const colors = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500'];
                                const c = colors[idx % colors.length];

                                return (
                                  <div 
                                    key={m.user?.id || idx}
                                    className={`w-5 h-5 rounded-full border border-white dark:border-[#161b22] text-[8px] font-bold text-white flex items-center justify-center ${c}`}
                                    title={nameVal}
                                  >
                                    {init}
                                  </div>
                                );
                              })}
                              {(currentWorkspace?.members?.length ?? 0) > 3 && (
                                <div 
                                  className="w-5 h-5 rounded-full border border-white dark:border-[#161b22] text-[8px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center"
                                >
                                  +{(currentWorkspace?.members?.length ?? 0) - 3}
                                </div>
                              )}
                            </div>

                            <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold tracking-tight">
                              {completedTasks}/{totalTasks} Tasks
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 dark:bg-indigo-650 transition-all duration-300 rounded-full" 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
            {/* Slack integration */}
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[12px] p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <Slack className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-[#172b4d] dark:text-[#b6c2cf]">Slack Notifications</span>
                  </div>
                  {integrations.some(i => i.type === 'SLACK') && (
                    <button
                      onClick={() => handleDeleteIntegration('SLACK')}
                      className="text-xs text-red-500 hover:text-red-650 hover:underline flex items-center gap-1 font-medium bg-transparent border-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">
                  Post automated log messages to a designated Slack channel whenever card actions occur in this workspace.
                </p>
              </div>

              <form onSubmit={handleSaveSlack} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[0.625rem] font-bold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider mb-1">Incoming Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhookUrl}
                    onChange={e => setSlackWebhookUrl(e.target.value)}
                    className="tf-input text-xs"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSlackEnabled}
                      onChange={e => setIsSlackEnabled(e.target.checked)}
                      className="rounded border-[#dfe1e6] text-blue-600 focus:ring-blue-500"
                    />
                    <span>Enabled</span>
                  </label>
                  <button type="submit" className="btn-primary py-1.5 px-3 text-xs">
                    Save Config
                  </button>
                </div>
              </form>
            </div>

            {/* Discord Integration */}
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[12px] p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-[#172b4d] dark:text-[#b6c2cf]">Discord Alerts</span>
                  </div>
                  {integrations.some(i => i.type === 'DISCORD') && (
                    <button
                      onClick={() => handleDeleteIntegration('DISCORD')}
                      className="text-xs text-red-500 hover:text-red-650 hover:underline flex items-center gap-1 font-medium bg-transparent border-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">
                  Post updates with rich embeds to a Discord channel via an incoming Webhook.
                </p>
              </div>

              <form onSubmit={handleSaveDiscord} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[0.625rem] font-bold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider mb-1">Discord Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhookUrl}
                    onChange={e => setDiscordWebhookUrl(e.target.value)}
                    className="tf-input text-xs"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDiscordEnabled}
                      onChange={e => setIsDiscordEnabled(e.target.checked)}
                      className="rounded border-[#dfe1e6] text-blue-600 focus:ring-blue-500"
                    />
                    <span>Enabled</span>
                  </label>
                  <button type="submit" className="btn-primary py-1.5 px-3 text-xs">
                    Save Config
                  </button>
                </div>
              </form>
            </div>

            {/* GitHub integration */}
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[12px] p-5 shadow-sm space-y-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/10 text-slate-800 dark:text-white dark:bg-white/10 flex items-center justify-center shrink-0">
                    <Github className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-[#172b4d] dark:text-[#b6c2cf]">GitHub Webhooks & PR Auto-Link</span>
                </div>
                {integrations.some(i => i.type === 'GITHUB') && (
                  <button
                    onClick={() => handleDeleteIntegration('GITHUB')}
                    className="text-xs text-red-500 hover:text-red-650 hover:underline flex items-center gap-1 font-medium bg-transparent border-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">
                    Connect your GitHub repository. Commit messages containing card ID (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">[TF-xxxx-xxxx]</code>) will log commits onto individual cards. Merged PRs will automatically move linked cards to Done.
                  </p>
                  
                  {/* Webhook Payload URL Info */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                      <Info className="w-3.5 h-3.5" /> Setup instructions
                    </div>
                    <p className="text-[0.6875rem] text-[#44546f] dark:text-[#9fadbc]">
                      In your GitHub repository settings under <b>Webhooks</b>, add a webhook with:
                    </p>
                    <div className="mt-1.5 space-y-1">
                      <span className="block text-[0.625rem] text-slate-500 font-medium">Payload URL:</span>
                      <code className="block text-[0.625rem] font-mono select-all bg-white dark:bg-[#1d2125] border border-slate-200 dark:border-slate-800 px-2 py-1 rounded break-all">
                        {apiUrl('/integrations/github/webhook')}
                      </code>
                      <span className="block text-[0.625rem] text-slate-500 font-medium mt-1">Content type:</span>
                      <span className="text-[0.625rem] font-mono bg-white dark:bg-[#1d2125] border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">application/json</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveGithub} className="space-y-3 border-t md:border-t-0 md:border-l border-[#dfe1e6] dark:border-[#a6c5e229] pt-4 md:pt-0 md:pl-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[0.625rem] font-bold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider mb-1">Repo Owner</label>
                        <input
                          type="text"
                          placeholder="e.g. facebook"
                          value={githubOwner}
                          onChange={e => setGithubOwner(e.target.value)}
                          className="tf-input text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[0.625rem] font-bold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider mb-1">Repo Name</label>
                        <input
                          type="text"
                          placeholder="e.g. react"
                          value={githubRepo}
                          onChange={e => setGithubRepo(e.target.value)}
                          className="tf-input text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[0.625rem] font-bold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider mb-1">Webhook Secret (Optional)</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={githubSecret}
                        onChange={e => setGithubSecret(e.target.value)}
                        className="tf-input text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-1.5 text-xs text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isGithubEnabled}
                        onChange={e => setIsGithubEnabled(e.target.checked)}
                        className="rounded border-[#dfe1e6] text-blue-600 focus:ring-blue-500"
                      />
                      <span>Enabled</span>
                    </label>
                    <button type="submit" className="btn-primary py-1.5 px-3 text-xs">
                      Save Config
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Google Calendar export */}
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[12px] p-5 shadow-sm space-y-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-[#172b4d] dark:text-[#b6c2cf]">Google Calendar & iCal Export</span>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">
                  Sync all board cards containing due dates and milestones directly with Google Calendar, Outlook, or Apple Calendar using a secure subscription feed.
                </p>
                
                <div className="flex flex-col gap-2 bg-slate-50 dark:bg-black/10 border border-[#dfe1e6] dark:border-[#a6c5e229] p-3 rounded-lg">
                  <span className="block text-[0.625rem] text-[#44546f] dark:text-[#9fadbc] font-bold uppercase tracking-wider">iCalendar Subscription URL</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={apiUrl(`/integrations/${currentWorkspace.id}/calendar/export.ics?token=${token}`)}
                      className="tf-input font-mono text-xs flex-1 select-all bg-white dark:bg-[#1d2125] border-slate-200 dark:border-slate-800"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(apiUrl(`/integrations/${currentWorkspace.id}/calendar/export.ics?token=${token}`));
                        addToast('URL Copied', 'Subscription feed URL copied to clipboard!', 'success');
                      }}
                      className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy URL
                    </button>
                  </div>
                  <span className="text-[0.625rem] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Secure token embedded. Keep this private.
                  </span>
                </div>
              </div>
            </div>

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
                  {gmailProfile?.googleEmail ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 max-w-[200px] truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        Connected: {gmailProfile.googleEmail}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${gmailProfile.gmailSandboxMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                        {gmailProfile.gmailSandboxMode ? 'Sandbox' : 'Production'}
                      </span>
                    </>
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
                  
                  {!gmailProfile?.googleEmail ? (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/20 p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">
                        Connect your Gmail account to enable inbox sync and automated email alerts.
                      </p>
                      
                      {/* Sandbox Toggle info */}
                      <label className="flex items-center justify-between p-2 rounded bg-white dark:bg-[#1d2125] border border-[#dfe1e6] dark:border-[#a6c5e229] cursor-pointer text-[11px] text-[#172b4d] dark:text-[#b6c2cf] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="font-medium">Sandbox Mode (Mock API)</span>
                        <input
                          type="checkbox"
                          checked={gmailProfile?.gmailSandboxMode ?? true}
                          onChange={(e) => handleToggleSetting('gmailSandboxMode', e.target.checked)}
                          className="rounded border-[#dfe1e6]"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Sandbox mode handles OAuth and Sync instantly using mock credentials. Toggle off for real Google OAuth API.
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
                      
                      <label className="flex items-center justify-between p-2 rounded bg-white dark:bg-[#1d2125] border border-[#dfe1e6] dark:border-[#a6c5e229] cursor-pointer text-[11px] text-[#172b4d] dark:text-[#b6c2cf] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="font-medium">Sandbox Mode</span>
                        <input
                          type="checkbox"
                          checked={gmailProfile.gmailSandboxMode}
                          onChange={(e) => handleToggleSetting('gmailSandboxMode', e.target.checked)}
                          className="rounded border-[#dfe1e6]"
                        />
                      </label>

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
                      disabled={!gmailProfile?.googleEmail || gmailSyncing}
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

              {/* Divider */}
              <div className="border-t border-[#dfe1e6] dark:border-[#a6c5e229] my-6"></div>

              {/* Gmail Auto Routing Rules section */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-500" /> Gmail Auto-Routing Rules
                  </h4>
                  <p className="text-xs text-[#44546f] dark:text-[#9fadbc] mt-1">
                    Configure rules to automatically parse incoming emails and create corresponding Kanban cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Create Rule Form */}
                  <form onSubmit={handleCreateGmailRule} className="lg:col-span-1 bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-350">Create New Auto Rule</span>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">When email matches</label>
                      <select
                        value={ruleTriggerType}
                        onChange={e => setRuleTriggerType(e.target.value)}
                        className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded text-xs focus:outline-none"
                      >
                        <option value="SENDER">Sender contains email/domain</option>
                        <option value="LABEL">Gmail Label is equal to</option>
                        <option value="KEYWORD">Subject/Body contains keyword</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Match Value</label>
                      <input
                        type="text"
                        value={ruleTriggerVal}
                        onChange={e => setRuleTriggerVal(e.target.value)}
                        placeholder={ruleTriggerType === 'SENDER' ? 'e.g. client@domain.com or domain.com' : ruleTriggerType === 'LABEL' ? 'e.g. IMPORTANT' : 'e.g. feedback, urgent'}
                        className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded text-xs focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Board</label>
                      <select
                        value={ruleTargetBoardId}
                        onChange={e => {
                          setRuleTargetBoardId(e.target.value);
                          setRuleTargetListId('');
                        }}
                        className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded text-xs focus:outline-none"
                        required
                      >
                        <option value="">-- Choose Board --</option>
                        {currentWorkspace.boards?.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {ruleTargetBoardId && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Column (Optional)</label>
                        <select
                          value={ruleTargetListId}
                          onChange={e => setRuleTargetListId(e.target.value)}
                          className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded text-xs focus:outline-none"
                        >
                          <option value="">-- Defaults to First Column --</option>
                          {currentWorkspace.boards?.find(b => b.id === ruleTargetBoardId)?.lists?.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!gmailProfile?.googleEmail}
                      className="btn-primary w-full justify-center py-2 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Rule
                    </button>
                  </form>

                  {/* Active Rules List */}
                  <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col h-[270px]">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-3">Active Rules ({gmailRules?.length || 0})</span>
                    
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                      {!gmailRules || gmailRules.length === 0 ? (
                        <div className="text-slate-450 italic text-center pt-10 text-slate-500 dark:text-slate-400">
                          No auto routing rules created yet.
                        </div>
                      ) : (
                        gmailRules.map((rule: any) => (
                          <div key={rule.id} className="p-3 bg-white dark:bg-[#161a22] border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                            <div className="leading-relaxed">
                              <p className="text-slate-850 dark:text-[#f0f6fc]">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">WHEN</span> email {rule.triggerType === 'SENDER' ? 'sender contains' : rule.triggerType === 'LABEL' ? 'has label' : 'subject/body contains'}{' '}
                                <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono text-[11px] text-slate-800 dark:text-slate-300">"{rule.triggerVal}"</code>
                              </p>
                              <p className="text-slate-500 dark:text-slate-400 mt-1">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">ROUTE TO BOARD</span>{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{rule.board?.name || 'Unknown Board'}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteGmailRule(rule.id)}
                              className="btn-icon p-1.5 hover:text-red-500 rounded-lg text-slate-400 shrink-0"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
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
