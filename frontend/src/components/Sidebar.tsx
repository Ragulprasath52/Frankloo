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

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[49] lg:hidden backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside 
        className={`flex flex-col h-screen shrink-0 select-none transition-all duration-300 z-50
          fixed inset-y-0 left-0 transform lg:relative lg:translate-x-0 lg:flex
          bg-slate-50 dark:bg-[#161a22] border-r border-slate-200 dark:border-[#30363d]
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'w-[4.5rem]' : 'w-[17rem]'}
        `}
      >
        {isSidebarCollapsed ? (
          /* ── COLLAPSED SIDEBAR (Strict Grid Alignment) ── */
          <div className="flex flex-col h-full items-center py-4 justify-between relative w-full">
            
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute -right-3 top-5 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-md z-50 p-1 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <div className="w-11 h-11 flex items-center justify-center mb-1 shrink-0">
              <button
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm hover:scale-105 transition-transform"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
                title={currentWorkspace?.name || "Workspace"}
              >
                {wsInitial}
              </button>
            </div>

            <hr className="w-8 border-t border-slate-200 dark:border-white/5 mb-3 shrink-0" />

            <div className="flex-grow w-full flex flex-col items-center space-y-2 overflow-y-auto scrollbar-none">
              <button
                onClick={() => { handleTabChange('boards'); setActiveBoardId && setActiveBoardId(null); }}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  activeTab === 'boards' && !activeBoardId
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Home"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Home className="w-4 h-4 shrink-0" />
                </div>
              </button>

              <button
                onClick={() => { handleTabChange('board-inbox'); }}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 relative ${
                  activeTab === 'board-inbox'
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Inbox"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Inbox className="w-4 h-4 shrink-0" />
                </div>
                {inboxUnreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-indigo-600 dark:bg-indigo-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {inboxUnreadCount}
                  </span>
                )}
              </button>

              <hr className="w-8 border-t border-slate-200 dark:border-white/5 my-1.5 shrink-0" />

              <button
                onClick={() => handleTabChange('members')}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  activeTab === 'members'
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Members"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Users className="w-4 h-4 shrink-0" />
                </div>
              </button>

              <button
                onClick={() => handleTabChange('documents')}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  activeTab === 'documents'
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Wiki & Docs"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 shrink-0" />
                </div>
              </button>

              <button
                onClick={() => handleTabChange('goals')}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  activeTab === 'goals'
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Goals"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Target className="w-4 h-4 shrink-0" />
                </div>
              </button>

              <button
                onClick={() => handleTabChange('insights')}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  activeTab === 'insights'
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Insights"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 shrink-0" />
                </div>
              </button>

              <hr className="w-8 border-t border-slate-200 dark:border-white/5 my-1.5 shrink-0" />

              <button
                onClick={() => handleTabChange('integrations')}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  activeTab === 'integrations'
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Integrations"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Link2 className="w-4 h-4 shrink-0" />
                </div>
              </button>

              {isOwnerOrAdmin && (
                <button
                  onClick={() => handleTabChange('invitations')}
                  className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                    activeTab === 'invitations'
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title="Invitations Portal"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Mail className="w-4 h-4 shrink-0" />
                  </div>
                </button>
              )}

              <button
                onClick={() => handleTabChange('appearance')}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  activeTab === 'appearance'
                    ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Appearance & Themes"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Palette className="w-4 h-4 shrink-0" />
                </div>
              </button>

              {isOwnerOrAdmin && (
                <button
                  onClick={handleSettingsClick}
                  className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-150"
                  title="Workspace Settings"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Settings className="w-4 h-4 shrink-0" />
                  </div>
                </button>
              )}
            </div>

            <div className="w-full flex flex-col items-center space-y-2 pt-2 border-t border-slate-200 dark:border-white/5 shrink-0">
              <button
                onClick={onOpenGuide}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-850 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-150"
                title="Application Guide"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                </div>
              </button>

              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-850 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-150"
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
              </button>

              <button
                onClick={() => setNotifPanelOpen(true)}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-850 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-150 relative"
                title="Notifications"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-indigo-650 dark:bg-indigo-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="w-11 h-11 flex items-center justify-center pt-1 shrink-0">
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 hover:scale-105 transition-all"
                  title="Your Profile"
                >
                  <img
                    src={getAvatarUrl(user?.avatarUrl, user?.name || user?.username || 'U')}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── EXPANDED SIDEBAR (Standard List Navigator) ── */
          <>
            <div className="px-4 py-4 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
                  <img src={logoImg} alt="logo" className="w-32 h-32 max-w-none shrink-0 dark:invert-0 invert" />
                </div>
                <div className="min-w-0 animate-fade-in">
                  <p className="font-bold text-sm leading-tight text-slate-800 dark:text-[#f0f6fc] font-display">Frankloo</p>
                  <p className="text-[0.6875rem] leading-tight mt-0.5 text-slate-455 dark:text-[#6e7681]">Self-hosted workspace</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex btn-icon p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-white"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden btn-icon p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-[#8d96a0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-3 relative border-b border-slate-200 dark:border-white/5">
              <p className="text-[0.625rem] font-semibold uppercase tracking-widest px-1 mb-1.5 animate-fade-in text-slate-500 dark:text-[#6e7681]">Workspace</p>
              <button
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-200/50 dark:bg-white/10 text-slate-855 dark:text-[#e6edf3] border border-slate-250 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/15"
              >
                <div className="flex items-center gap-2 min-w-0 mx-auto lg:mx-0">
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-[0.625rem] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                    {wsInitial}
                  </div>
                  <span className="truncate animate-fade-in">{currentWorkspace?.name || 'Select workspace…'}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-slate-500 dark:text-[#6e7681]" />
              </button>

              {wsDropdownOpen && (
                <div className="absolute left-3 right-3 top-full mt-1 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-fade-in bg-white dark:bg-[#21262d] border border-slate-200 dark:border-[#30363d]">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-wider px-3 py-1.5 text-slate-500 dark:text-[#6e7681]">Your workspaces</p>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => { handleSelectWorkspace(ws.id); setSidebarOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors text-slate-700 dark:text-[#c9d1d9] hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-4 h-4 rounded text-[0.5rem] font-bold text-white flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                          {ws.name[0]?.toUpperCase()}
                        </div>
                        <span className="truncate">{ws.name}</span>
                      </div>
                      {currentWorkspace?.id === ws.id && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-[#58a6ff]" />}
                    </button>
                  ))}
                  <div className="border-t border-slate-150 dark:border-white/8 mt-1 pt-1">
                    <button
                      onClick={() => { setWsDropdownOpen(false); setNewWsModalOpen(true); }}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors text-indigo-600 dark:text-[#58a6ff] hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create workspace
                    </button>
                  </div>
                </div>
              )}
            </div>

            <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin text-left">
              <div className="space-y-0.5">
                <button
                  onClick={() => { handleTabChange('boards'); setActiveBoardId && setActiveBoardId(null); }}
                  className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'boards' && !activeBoardId
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => { handleTabChange('board-inbox'); }}
                  className={`w-full flex items-center justify-between py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'board-inbox'
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Inbox className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Inbox</span>
                  </div>
                  {inboxUnreadCount > 0 && (
                    <span className="bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                      {inboxUnreadCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">Boards</p>
                </div>
                
                <div className="pl-1 space-y-0.5 max-h-40 overflow-y-auto scrollbar-thin">
                  {(currentWorkspace?.boards || []).length === 0 ? (
                    <p className="text-[10px] text-slate-400 dark:text-slate-650 px-2 py-1 italic">No boards yet</p>
                  ) : (
                    (currentWorkspace?.boards || []).map((b: any) => {
                      const isSelected = activeBoardId === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => { handleTabChange('boards'); setActiveBoardId && setActiveBoardId(b.id); }}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                            isSelected
                              ? 'bg-slate-200/40 dark:bg-white/5 text-slate-900 dark:text-white font-semibold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="text-slate-400 dark:text-[#58a6ff] font-bold text-xs shrink-0">•</span>
                          <span className="truncate">{b.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 px-2.5 mb-1.5">Collaboration</p>
                
                <button
                  onClick={() => handleTabChange('members')}
                  className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'members'
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Members</span>
                </button>

                <button
                  onClick={() => handleTabChange('documents')}
                  className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'documents'
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Wiki & Docs</span>
                </button>

                <button
                  onClick={() => handleTabChange('goals')}
                  className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'goals'
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>Goals</span>
                </button>

                <button
                  onClick={() => handleTabChange('insights')}
                  className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'insights'
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Insights</span>
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 px-2.5 mb-1.5">Settings & Tools</p>

                <button
                  onClick={() => handleTabChange('integrations')}
                  className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'integrations'
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Integrations</span>
                </button>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => handleTabChange('invitations')}
                    className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                      activeTab === 'invitations'
                        ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>Invitations Portal</span>
                  </button>
                )}

                <button
                  onClick={() => handleTabChange('appearance')}
                  className={`w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors justify-start px-2.5 gap-2.5 ${
                    activeTab === 'appearance'
                      ? 'bg-slate-200/60 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span>Appearance & Themes</span>
                </button>

                {isOwnerOrAdmin && (
                  <button 
                    onClick={handleSettingsClick} 
                    className="w-full flex items-center py-1.5 rounded-lg text-xs font-semibold transition-colors text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc] hover:bg-slate-100 dark:hover:bg-white/5 justify-start px-2.5 gap-2.5"
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span>Workspace Settings</span>
                  </button>
                )}
              </div>
            </nav>

            <div className="px-2 py-3 space-y-2 border-t border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-1 px-1">
                <button
                  onClick={() => setInboxOpen(!isInboxOpen)}
                  className={`btn-icon flex-1 justify-center p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 ${isInboxOpen ? 'text-slate-800 dark:text-white bg-slate-200/50 dark:bg-white/10' : ''}`}
                  title="Workspace Inbox"
                >
                  <div className="relative flex items-center justify-center">
                    <Inbox className="w-4 h-4 text-slate-500 dark:text-[#8d96a0]" />
                    {inboxUnreadCount > 0 && (
                      <span className="notif-dot absolute -top-1.5 -right-1.5 bg-indigo-600 dark:bg-[#6366f1]" style={{ minWidth: '14px', height: '14px', fontSize: '0.5rem', padding: '0 3px' }}>
                        {inboxUnreadCount}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setNotifPanelOpen(true)}
                  className="btn-icon flex-1 justify-center p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10"
                  title="Notifications"
                >
                  <div className="relative flex items-center justify-center">
                    <Bell className="w-4 h-4 text-slate-500 dark:text-[#8d96a0]" />
                    {unreadCount > 0 && (
                      <span className="notif-dot absolute -top-1.5 -right-1.5" style={{ minWidth: '14px', height: '14px', fontSize: '0.5rem', padding: '0 3px' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="btn-icon flex-1 justify-center p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10"
                  title="Toggle theme"
                >
                  {theme === 'dark'
                    ? <Sun className="w-4 h-4 text-slate-500 dark:text-[#8d96a0]" />
                    : <Moon className="w-4 h-4 text-slate-500 dark:text-[#8d96a0]" />}
                </button>
                <button
                  onClick={onOpenGuide}
                  className="btn-icon flex-1 justify-center p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-indigo-600 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300"
                  title="Application Guide"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <button onClick={logout} className="btn-icon flex-1 justify-center p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10" title="Log out">
                  <LogOut className="w-4 h-4 text-slate-500 dark:text-[#8d96a0]" />
                </button>
              </div>

              <button
                onClick={() => setProfileModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-left transition-colors text-slate-700 dark:text-[#e6edf3]"
              >
                <img
                  src={getAvatarUrl(user?.avatarUrl, user?.name || user?.username)}
                  alt="avatar"
                  className="w-7 h-7 rounded-full shrink-0 ring-2 ring-slate-200 dark:ring-white/10"
                />
                <div className="min-w-0 flex-1 animate-fade-in">
                  <p className="text-sm font-semibold truncate leading-tight text-slate-850 dark:text-[#f0f6fc]">{user?.name || user?.username}</p>
                  <p className="text-[0.6875rem] truncate leading-tight text-slate-500 dark:text-[#6e7681]">@{user?.username}</p>
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
