import { useState, useEffect } from 'react';
import { useStore, getAvatarUrl } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import {
  Users, Target, BarChart2, Bell,
  Sun, Moon, LogOut, Plus, Settings, ChevronDown,
  Check, X, AlertCircle, CheckCircle2, BookOpen, Link2,
  Inbox, Palette, ChevronLeft, ChevronRight, HelpCircle, Mail,
  Upload, Home
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeBoardId?: string | null;
  setActiveBoardId?: (boardId: string | null) => void;
  onOpenWorkspaceSettings: () => void;
  onOpenGuide: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, activeBoardId, setActiveBoardId, onOpenWorkspaceSettings, onOpenGuide }: SidebarProps) {
  const navigate = useNavigate();
  const {
    user, logout, theme, setTheme, workspaces, currentWorkspace,
    fetchWorkspaces, fetchWorkspaceDetails, createWorkspace,
    notifications, fetchNotifications, markNotificationRead, markAllNotificationsRead,
    isInboxOpen, setInboxOpen, inboxItems,
    isSidebarOpen, setSidebarOpen, isSidebarCollapsed, setSidebarCollapsed, updateProfile
  } = useStore();

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [newWsModalOpen, setNewWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setSelectedAvatar(user.avatarUrl || '');
      setAvatarBase64(null);
    }
  }, [user]);

  const PREMADE_AVATARS = [
    { label: 'Default', url: user ? `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}` : '' },
    { label: 'Developer', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=developer' },
    { label: 'Astronaut', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=astronaut' },
    { label: 'Artist', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=artist' },
    { label: 'Gamer', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=gamer' },
    { label: 'Geek', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=geek' },
    { label: 'Ninja', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ninja' },
    { label: 'Cat', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=cat' },
    { label: 'Panda', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=panda' },
    { label: 'Robot', url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=robot' },
    { label: 'Hero', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=hero' },
    { label: 'Vibe', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=vibe' },
    { label: 'Explorer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=explorer' },
    { label: 'Gamer Girl', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=gamergirl' },
    { label: 'Creator', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=creator' },
    { label: 'Mech', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=mech' },
    { label: 'Scholar', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=scholar' },
    { label: 'Nomad', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nomad' },
    { label: 'Tiger', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=tiger' },
    { label: 'Sphere', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=sphere' },
    { label: 'Cyborg', url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cyborg' },
    { label: 'Champion', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=champion' },
    { label: 'Smiley', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=smiley' },
    { label: 'Abstract', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=abstract' }
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    try {
      const payload: any = {
        name: profileName,
        avatarUrl: avatarBase64 ? undefined : selectedAvatar
      };
      if (avatarBase64) {
        payload.avatarBase64 = avatarBase64;
      }
      if (profilePassword.trim()) {
        if (profilePassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        payload.password = profilePassword;
      }
      await updateProfile(payload);
      setProfileSuccess('Profile updated successfully!');
      setProfilePassword('');
      setAvatarBase64(null);
      setTimeout(() => {
        setProfileModalOpen(false);
        setProfileSuccess('');
      }, 1200);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchNotifications();
  }, []);

  const handleSelectWorkspace = (wsId: string) => {
    fetchWorkspaceDetails(wsId);
    setWsDropdownOpen(false);
  };

  const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) { setError('Workspace name is required'); return; }
    setCreating(true);
    try {
      const ws = await createWorkspace(newWsName, newWsDesc);
      fetchWorkspaceDetails(ws.id);
      setNewWsName(''); setNewWsDesc(''); setError('');
      setNewWsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error creating workspace');
    } finally { setCreating(false); }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const inboxUnreadCount = inboxItems.filter(i => i.status === 'NEW').length;

  const isOwnerOrAdmin = currentWorkspace?.myRole === 'OWNER' || currentWorkspace?.myRole === 'ADMIN';



  const wsInitial = currentWorkspace?.name?.[0]?.toUpperCase() || 'W';

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  const handleSettingsClick = () => {
    onOpenWorkspaceSettings();
    setSidebarOpen(false);
  };

  const [boardsExpanded, setBoardsExpanded] = useState(true);

  // Nav item helper: active class with left-border indicator
  const navCls = (tab: string, extraCheck?: boolean) => {
    const isActive = activeTab === tab && (extraCheck === undefined ? true : extraCheck);
    return `sidebar-item${isActive ? ' active' : ''}`;
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[49] lg:hidden backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col h-screen shrink-0 select-none z-50
          fixed inset-y-0 left-0 transform lg:relative lg:translate-x-0 lg:flex
          border-r transition-all duration-200
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'w-12' : 'w-[220px]'}
        `}
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
      >
        {isSidebarCollapsed ? (
          /* ════════════════════════════════════════
             COLLAPSED SIDEBAR — 48px icon rail
             ════════════════════════════════════════ */
          <div className="flex flex-col h-full items-center pt-3 pb-3 relative" style={{ width: '48px' }}>
            {/* Expand button */}
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute -right-3 top-4 z-50 w-6 h-6 rounded-full flex items-center justify-center shadow-md border"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              title="Expand Sidebar"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* Workspace avatar */}
            <button
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
              className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white mb-2 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
              title={currentWorkspace?.name || 'Workspace'}
            >
              {wsInitial}
            </button>

            <div
              className="w-6 mb-1"
              style={{ height: '1px', background: 'var(--border)' }}
            />

            {/* Navigation icons */}
            <div className="flex flex-col items-center gap-0.5 flex-1 w-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {/* Icon buttons — each 36x36 with tooltip title */}
              {([
                { tab: 'boards', icon: <Home className="w-4 h-4" />, label: 'Home', extra: !activeBoardId },
                { tab: 'board-inbox', icon: <Inbox className="w-4 h-4" />, label: 'Inbox', badge: inboxUnreadCount },
              ] as any[]).map(({ tab, icon, label, extra, badge }) => (
                <button
                  key={tab}
                  onClick={() => { handleTabChange(tab); if (tab === 'boards') setActiveBoardId && setActiveBoardId(null); }}
                  title={label}
                  className={`relative w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 ${
                    (activeTab === tab && (extra === undefined || extra))
                      ? 'text-white'
                      : 'hover:bg-black/5 dark:hover:bg-white/8'
                  }`}
                  style={(activeTab === tab && (extra === undefined || extra)) ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-muted)' }}
                >
                  {icon}
                  {badge > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center text-[7px] font-bold" style={{ background: 'var(--danger)' }}>{badge > 9 ? '9+' : badge}</span>}
                </button>
              ))}

              <div className="w-5 my-0.5" style={{ height: '1px', background: 'var(--border)' }} />

              {([
                { tab: 'members',      icon: <Users className="w-4 h-4" />,    label: 'Members' },
                { tab: 'documents',    icon: <BookOpen className="w-4 h-4" />, label: 'Wiki & Docs' },
                { tab: 'goals',        icon: <Target className="w-4 h-4" />,   label: 'Goals' },
                { tab: 'insights',     icon: <BarChart2 className="w-4 h-4" />,label: 'Insights' },
              ] as any[]).map(({ tab, icon, label }) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  title={label}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 ${
                    activeTab === tab ? 'text-white' : 'hover:bg-black/5 dark:hover:bg-white/8'
                  }`}
                  style={activeTab === tab ? { background: 'var(--accent)' } : { color: 'var(--text-muted)' }}
                >
                  {icon}
                </button>
              ))}

              <div className="w-5 my-0.5" style={{ height: '1px', background: 'var(--border)' }} />

              {([
                { tab: 'integrations', icon: <Link2 className="w-4 h-4" />,   label: 'Integrations' },
                ...(isOwnerOrAdmin ? [{ tab: 'invitations', icon: <Mail className="w-4 h-4" />, label: 'Invitations' }] : []),
                { tab: 'appearance',   icon: <Palette className="w-4 h-4" />, label: 'Appearance' },
                ...(isOwnerOrAdmin ? [{ tab: '_settings', icon: <Settings className="w-4 h-4" />, label: 'Settings', onClick: handleSettingsClick }] : []),
              ] as any[]).map(({ tab, icon, label, onClick }) => (
                <button
                  key={tab}
                  onClick={onClick || (() => handleTabChange(tab))}
                  title={label}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 ${
                    activeTab === tab ? 'text-white' : 'hover:bg-black/5 dark:hover:bg-white/8'
                  }`}
                  style={activeTab === tab ? { background: 'var(--accent)' } : { color: 'var(--text-muted)' }}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Footer icons */}
            <div className="flex flex-col items-center gap-0.5 pt-2 w-full" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={onOpenGuide} title="Guide" className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--text-muted)' }}>
                <HelpCircle className="w-4 h-4" />
              </button>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={theme === 'light' ? 'Dark mode' : 'Light mode'} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--text-muted)' }}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button onClick={() => setNotifPanelOpen(true)} title="Notifications" className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--text-muted)' }}>
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center text-[7px] font-bold" style={{ background: 'var(--danger)' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              <button onClick={() => setProfileModalOpen(true)} title="Profile" className="w-8 h-8 flex items-center justify-center mt-0.5">
                <img src={getAvatarUrl(user?.avatarUrl, user?.name || user?.username || 'U')} alt="avatar" className="w-6 h-6 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10" />
              </button>
            </div>
          </div>
        ) : (
          /* ════════════════════════════════════════
             EXPANDED SIDEBAR — 220px Trello-style
             ════════════════════════════════════════ */
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-3 h-12 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center">
                  <img src={logoImg} alt="logo" className="w-20 h-20 max-w-none dark:invert-0 invert" />
                </div>
                <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Frankloo</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setSidebarCollapsed(true)} className="hidden lg:flex w-6 h-6 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--text-muted)' }} title="Collapse">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-6 h-6 flex items-center justify-center rounded" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Workspace Selector ── */}
            <div className="px-2 pt-2 pb-1 relative" style={{ borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-2 h-8 rounded-md text-left transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                    {wsInitial}
                  </div>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{currentWorkspace?.name || 'Select workspace…'}</span>
                </div>
                <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
              </button>

              {wsDropdownOpen && (
                <div className="absolute left-2 right-2 top-full mt-1 rounded-lg shadow-lg z-50 py-1 overflow-hidden animate-scale-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <p className="sidebar-section-label mt-1 mb-0">Workspaces</p>
                  {workspaces.map((ws) => (
                    <button key={ws.id} onClick={() => { handleSelectWorkspace(ws.id); setSidebarOpen(false); }}
                      className="w-full text-left px-3 h-8 flex items-center justify-between gap-2 text-sm transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                          {ws.name[0]?.toUpperCase()}
                        </div>
                        <span className="truncate text-xs">{ws.name}</span>
                      </div>
                      {currentWorkspace?.id === ws.id && <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '2px', paddingTop: '2px' }}>
                    <button onClick={() => { setWsDropdownOpen(false); setNewWsModalOpen(true); }}
                      className="w-full text-left px-3 h-8 flex items-center gap-2 text-xs transition-colors"
                      style={{ color: 'var(--accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Plus className="w-3 h-3" /> New workspace
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 px-2 py-2 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

              {/* Primary */}
              <div className="space-y-0.5 mb-1">
                <button onClick={() => { handleTabChange('boards'); setActiveBoardId && setActiveBoardId(null); }} className={navCls('boards', !activeBoardId)}>
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span>Home</span>
                </button>
                <button onClick={() => handleTabChange('board-inbox')} className={navCls('board-inbox')} style={{ justifyContent: 'space-between' }}>
                  <span className="flex items-center gap-2">
                    <Inbox className="w-3.5 h-3.5 shrink-0" />
                    Inbox
                  </span>
                  {inboxUnreadCount > 0 && <span className="notif-dot">{inboxUnreadCount}</span>}
                </button>
              </div>

              {/* Boards */}
              <div className="mt-3">
                <div className="sidebar-section-label">
                  <span>Boards</span>
                  <button onClick={() => setBoardsExpanded(!boardsExpanded)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/8" style={{ color: 'var(--text-muted)' }}>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${boardsExpanded ? '' : '-rotate-90'}`} />
                  </button>
                </div>
                {boardsExpanded && (
                  <div className="space-y-0.5 pl-2">
                    {(currentWorkspace?.boards || []).length === 0 ? (
                      <p className="text-xs px-2 py-1 italic" style={{ color: 'var(--text-muted)' }}>No boards yet</p>
                    ) : (
                      (currentWorkspace?.boards || []).map((b: any) => (
                        <button
                          key={b.id}
                          onClick={() => { handleTabChange('boards'); setActiveBoardId && setActiveBoardId(b.id); }}
                          className={`sidebar-item text-xs${activeBoardId === b.id ? ' active' : ''}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: activeBoardId === b.id ? 'var(--accent)' : 'var(--text-muted)' }} />
                          <span className="truncate">{b.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Workspace */}
              <div className="mt-3">
                <p className="sidebar-section-label">Workspace</p>
                <div className="space-y-0.5">
                  <button onClick={() => handleTabChange('members')}   className={navCls('members')}><Users className="w-3.5 h-3.5 shrink-0" /><span>Members</span></button>
                  <button onClick={() => handleTabChange('documents')} className={navCls('documents')}><BookOpen className="w-3.5 h-3.5 shrink-0" /><span>Wiki</span></button>
                  <button onClick={() => handleTabChange('goals')}     className={navCls('goals')}><Target className="w-3.5 h-3.5 shrink-0" /><span>Goals</span></button>
                  <button onClick={() => handleTabChange('insights')}  className={navCls('insights')}><BarChart2 className="w-3.5 h-3.5 shrink-0" /><span>Insights</span></button>
                </div>
              </div>

              {/* Tools */}
              <div className="mt-3">
                <p className="sidebar-section-label">Tools</p>
                <div className="space-y-0.5">
                  <button onClick={() => handleTabChange('integrations')} className={navCls('integrations')}><Link2 className="w-3.5 h-3.5 shrink-0" /><span>Integrations</span></button>
                  {isOwnerOrAdmin && <button onClick={() => handleTabChange('invitations')} className={navCls('invitations')}><Mail className="w-3.5 h-3.5 shrink-0" /><span>Invitations</span></button>}
                  <button onClick={() => handleTabChange('appearance')}   className={navCls('appearance')}><Palette className="w-3.5 h-3.5 shrink-0" /><span>Appearance</span></button>
                  {isOwnerOrAdmin && <button onClick={handleSettingsClick} className="sidebar-item"><Settings className="w-3.5 h-3.5 shrink-0" /><span>Settings</span></button>}
                </div>
              </div>
            </nav>

            {/* ── Footer ── */}
            <div className="px-2 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Utility row */}
              <div className="flex items-center justify-between gap-1 mb-3 px-1">
                <button onClick={() => setInboxOpen(!isInboxOpen)} title="Email Inbox" className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: isInboxOpen ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <Inbox className="w-[18px] h-[18px]" />
                  {inboxUnreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--danger)' }}>{inboxUnreadCount}</span>}
                </button>
                <button onClick={() => setNotifPanelOpen(true)} title="Notifications" className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--danger)' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                </button>
                <button onClick={onOpenGuide} title="Guide" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--accent)' }}>
                  <HelpCircle className="w-[18px] h-[18px]" />
                </button>
                <button onClick={logout} title="Log out" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/8 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </div>
              {/* Profile row */}
              <button onClick={() => setProfileModalOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 h-10 rounded-lg transition-colors" style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <img src={getAvatarUrl(user?.avatarUrl, user?.name || user?.username)} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.name || user?.username}</p>
                  <p className="text-[10px] truncate leading-tight" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
                </div>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Notifications Panel */}
      {notifPanelOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end animate-fade-in"
          onClick={() => setNotifPanelOpen(false)}
        >
          <div
            className="w-96 h-full flex flex-col shadow-2xl animate-slide-in-right"
            style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
                {unreadCount > 0 && (
                  <span className="notif-dot">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setNotifPanelOpen(false)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16" style={{ color: 'var(--text-muted)' }}>
                  <CheckCircle2 className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs mt-1 opacity-70">No new notifications</p>
                </div>
              ) : (
                <div style={{ borderTop: 'none' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.link) {
                          navigate(n.link);
                          setNotifPanelOpen(false);
                        }
                        if (!n.isRead) {
                          markNotificationRead(n.id);
                        }
                      }}
                      className={`px-5 py-3.5 flex gap-3 items-start transition-colors ${n.link ? 'cursor-pointer hover:bg-[#091e420a] dark:hover:bg-white/5' : ''}`}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: n.isRead ? 'transparent' : 'var(--accent-muted)',
                        opacity: n.isRead ? 0.65 : 1,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{n.content}</p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                          }}
                          className="shrink-0 w-2 h-2 rounded-full mt-1.5 transition-colors"
                          style={{ background: 'var(--accent)' }}
                          title="Mark as read"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {newWsModalOpen && (
        <div className="modal-overlay" onClick={() => setNewWsModalOpen(false)}>
          <div
            className="w-full max-w-sm modal-card shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Create workspace</h3>
              <button onClick={() => setNewWsModalOpen(false)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-4"
                  style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-4">
                <div>
                  <label className="tf-label">Workspace name *</label>
                  <input
                    type="text"
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    placeholder="e.g. Engineering, Design Team"
                    className="tf-input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="tf-label">Description</label>
                  <textarea
                    value={newWsDesc}
                    onChange={e => setNewWsDesc(e.target.value)}
                    placeholder="What is this workspace about?"
                    rows={3}
                    className="tf-input resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={creating} className="btn-primary">
                    {creating ? 'Creating…' : 'Create workspace'}
                  </button>
                  <button type="button" onClick={() => setNewWsModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Customize Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-lg modal-card p-6 shadow-2xl animate-fade-in flex flex-col max-h-[90vh] overflow-y-auto relative bg-white dark:bg-[#1c2128]">
            <div className="flex justify-between items-center pb-4 border-b border-[#dfe1e6] dark:border-[#a6c5e229]">
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Palette className="w-5 h-5 text-indigo-500" /> Customize Profile
              </h3>
              <button 
                onClick={() => { setProfileModalOpen(false); setProfileError(''); setProfileSuccess(''); }}
                className="btn-icon p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileError && (
              <div className="p-3 my-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 my-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5 mt-4">
              {/* Profile Preview Block */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
                  <img
                    src={avatarBase64 || getAvatarUrl(selectedAvatar, user?.username)}
                    alt="Selected Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{profileName || user?.username}</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
                </div>
              </div>

              {/* Name input */}
              <div className="space-y-1.5">
                <label className="tf-label">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="tf-input text-xs"
                  placeholder="Your Full Name"
                  required
                />
              </div>

              {/* Custom Upload Option */}
              <div className="space-y-1.5">
                <label className="tf-label">Or Upload Custom Avatar</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="file"
                    id="custom-avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          setProfileError('Image size must be less than 2MB');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAvatarBase64(reader.result as string);
                          setProfileError('');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="custom-avatar-upload"
                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 cursor-pointer bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-center group"
                  >
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors mb-1" />
                    <span className="text-xs font-medium text-slate-600 dark:text-[#8d96a0] group-hover:text-indigo-500 dark:group-hover:text-indigo-400">
                      Click to upload avatar
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 2MB</span>
                  </label>
                  
                  {avatarBase64 && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAvatarBase64(null)}
                        className="btn-secondary px-3 py-2 rounded-lg text-[10px] text-rose-500 hover:text-rose-600 border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        Remove Custom
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Avatar Selection Grid */}
              <div className="space-y-2">
                <label className="tf-label">Select Avatar Character Preset</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[160px] overflow-y-auto pr-1">
                  {PREMADE_AVATARS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.url && !avatarBase64;
                    return (
                      <button
                        key={avatar.label}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(avatar.url);
                          setAvatarBase64(null);
                        }}
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center p-1.5 bg-white dark:bg-slate-900 overflow-hidden relative group transition-all ${
                          isSelected 
                            ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/10' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                        title={avatar.label}
                      >
                        <img src={avatar.url} alt={avatar.label} className="max-h-full max-w-full object-contain" />
                        {isSelected && (
                          <div className="absolute top-0 right-0 bg-indigo-500 text-white rounded-bl-lg p-0.5 shadow-sm">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password update input */}
              <div className="space-y-1.5">
                <label className="tf-label">New Password (leave empty to keep unchanged)</label>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="tf-input text-xs"
                  placeholder="Min 6 characters"
                  minLength={6}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#dfe1e6] dark:border-[#a6c5e229] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setProfileModalOpen(false); setProfileError(''); setProfileSuccess(''); }}
                  className="btn-secondary rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary rounded-lg text-xs font-semibold px-4"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
