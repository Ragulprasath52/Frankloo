import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import type { Card } from './store/useStore';
import { useThemeStore } from './store/useThemeStore';

// Components
import Login from './components/Login';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import Sidebar from './components/Sidebar';
import WorkspaceDashboard from './components/WorkspaceDashboard';
import BoardView from './components/BoardView';
import CardModal from './components/CardModal';
import InboxPanel from './components/InboxPanel';
import AcceptInvite from './components/AcceptInvite';
import GlobalOverlays from './components/GlobalOverlays';
import GuideModal from './components/GuideModal';
import { Settings, X, ShieldAlert, User, Shield, AlertTriangle, Menu, HelpCircle } from 'lucide-react';

function DashboardLayout() {
  const { 
    token, user, workspaces, currentWorkspace, 
    fetchWorkspaces, fetchWorkspaceDetails, 
    currentBoard, initSocketConnection, showConfirm,
    setSidebarOpen, fetchMe
  } = useStore();

  const themeStore = useThemeStore();

  const navigate = useNavigate();

  // Navigation and Modal States
  const [activeTab, setActiveTab] = useState<string>('boards');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [wsSettingsOpen, setWsSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Edit Workspace Form States
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [wsShortName, setWsShortName] = useState('');
  const [wsWebsite, setWsWebsite] = useState('');
  const [wsVisibility, setWsVisibility] = useState('PRIVATE');
  const [wsBoardCreationRestriction, setWsBoardCreationRestriction] = useState('ANYONE');
  const [wsGuestInvitesAllowed, setWsGuestInvitesAllowed] = useState(true);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'permissions' | 'danger'>('profile');
  const [error, setError] = useState('');

  const { updateWorkspace, deleteWorkspace } = useStore((state) => ({
    updateWorkspace: async (id: string, updates: any) => {
      const res = await fetch(`http://127.0.0.1:5000/api/workspaces/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update workspace');
    },
    deleteWorkspace: state.deleteWorkspace || (async (id: string) => {
      const res = await fetch(`http://127.0.0.1:5000/api/workspaces/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete workspace');
    })
  }));


  // Auth Guard Redirect
  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      fetchMe();
      initSocketConnection();
      fetchWorkspaces();
    }
  }, [token]);

  // Load board icon/cover overrides from localStorage
  useEffect(() => {
    if (user?.id) {
      themeStore.loadUserPreferences(user.id);
    }
  }, [user?.id]);

  // Apply theme class on init
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Auto-load First Workspace if None Active
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspace) {
      fetchWorkspaceDetails(workspaces[0].id);
    }
  }, [workspaces, currentWorkspace]);

  // Sync Form States
  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name);
      setWsDesc(currentWorkspace.description || '');
      setWsShortName(currentWorkspace.shortName || '');
      setWsWebsite(currentWorkspace.website || '');
      setWsVisibility(currentWorkspace.visibility || 'PRIVATE');
      setWsBoardCreationRestriction(currentWorkspace.boardCreationRestriction || 'ANYONE');
      setWsGuestInvitesAllowed(currentWorkspace.guestInvitesAllowed ?? true);
    }
  }, [currentWorkspace]);

  // Listen to board modifications for card detail syncing
  useEffect(() => {
    if (selectedCard && currentBoard) {
      const allCards = currentBoard.lists.flatMap(l => l.cards);
      const updatedCard = allCards.find(c => c.id === selectedCard.id);
      if (updatedCard) {
        setSelectedCard(updatedCard);
      }
    }
  }, [currentBoard]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !wsName.trim()) return;
    try {
      await updateWorkspace(currentWorkspace.id, {
        name: wsName,
        description: wsDesc,
        shortName: wsShortName,
        website: wsWebsite,
        visibility: wsVisibility,
        boardCreationRestriction: wsBoardCreationRestriction,
        guestInvitesAllowed: wsGuestInvitesAllowed,
      });
      await fetchWorkspaceDetails(currentWorkspace.id);
      setWsSettingsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error updating workspace');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;
    const confirmed = await showConfirm(
      'Delete Workspace',
      'Are you absolutely sure you want to delete this workspace and ALL its boards? This action is irreversible.'
    );
    if (!confirmed) return;
    try {
      await deleteWorkspace(currentWorkspace.id);
      setWsSettingsOpen(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Error deleting workspace');
    }
  };

  if (!token || !user) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
      {/* Sidebar Nav */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setActiveBoardId(null); }} 
        onOpenWorkspaceSettings={() => setWsSettingsOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header Bar */}
        <div className="flex lg:hidden items-center justify-between px-4 py-3 bg-white dark:bg-[#161b22] border-b border-[#dfe1e6] dark:border-[#30363d] shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center min-w-[40px] min-h-[40px]"
              title="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>Frankloo</span>
          </div>
          {/* Workspace Initial / selector trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-indigo-500 dark:text-[#579dff] flex items-center justify-center min-w-[32px] min-h-[32px]"
              title="Application Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="w-6 h-6 rounded flex items-center justify-center text-[0.625rem] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              {currentWorkspace?.name?.[0]?.toUpperCase() || 'W'}
            </div>
            <span className="text-xs font-semibold truncate max-w-[100px]">{currentWorkspace?.name}</span>
          </div>
        </div>

        {activeBoardId ? (
          <BoardView 
            boardId={activeBoardId} 
            onBack={() => setActiveBoardId(null)}
            onOpenCardDetails={(card) => setSelectedCard(card)}
            onOpenGuide={() => setGuideOpen(true)}
          />
        ) : (
          <WorkspaceDashboard 
            activeTab={activeTab}
            onSelectBoard={(boardId) => setActiveBoardId(boardId)}
          />
        )}
      </main>

      {/* Persistent Workspace Inbox Right Panel */}
      <InboxPanel />

      {/* Guide Modal Overlay */}
      <GuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Card Details Modal Overlay */}
      {selectedCard && (
        <CardModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)} 
        />
      )}

      {/* Workspace Settings Modal Overlay */}
      {wsSettingsOpen && currentWorkspace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl modal-card p-4 md:p-6 shadow-2xl animate-fade-in flex flex-col min-h-0 md:min-h-[480px] max-h-[90vh] md:max-h-none overflow-y-auto responsive-modal md:relative">
            <div className="flex justify-between items-center pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Settings className="w-5 h-5 text-blue-600 dark:text-[#579dff]" /> Workspace Settings
              </h3>
              <button onClick={() => setWsSettingsOpen(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 my-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row mt-4 overflow-y-auto md:overflow-hidden gap-4">
              {/* Left sidebar tabs */}
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[#dfe1e6] dark:border-[#a6c5e229] pb-4 md:pb-0 md:pr-4 flex flex-row md:flex-col gap-2 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsTab('profile')}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-left text-xs font-semibold transition-all ${
                    settingsTab === 'profile'
                      ? 'bg-blue-600/10 dark:bg-[#579dff]/20 text-blue-600 dark:text-[#579dff]'
                      : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-[#091e420f] dark:hover:bg-[#a6c5e229]'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Workspace Profile
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('permissions')}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-left text-xs font-semibold transition-all ${
                    settingsTab === 'permissions'
                      ? 'bg-blue-600/10 dark:bg-[#579dff]/20 text-blue-600 dark:text-[#579dff]'
                      : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-[#091e420f] dark:hover:bg-[#a6c5e229]'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Permissions
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab('danger')}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-left text-xs font-semibold transition-all ${
                    settingsTab === 'danger'
                      ? 'bg-rose-500/10 text-rose-500 dark:text-rose-450 hover:bg-rose-500/20'
                      : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-[#091e420f] dark:hover:bg-[#a6c5e229]'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </button>
              </div>

              {/* Right column Form content */}
              <form onSubmit={handleUpdateWorkspace} className="w-full md:w-2/3 md:pl-6 flex flex-col justify-between overflow-y-auto md:max-h-[380px]">
                <div className="space-y-4 flex-1">
                  {settingsTab === 'profile' && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <label className="tf-label">Workspace Name</label>
                        <input
                          type="text"
                          value={wsName}
                          onChange={(e) => setWsName(e.target.value)}
                          className="tf-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="tf-label">Short Name (Slug)</label>
                        <input
                          type="text"
                          value={wsShortName}
                          onChange={(e) => setWsShortName(e.target.value)}
                          placeholder="e.g. engineering-team"
                          className="tf-input"
                        />
                      </div>
                      <div>
                        <label className="tf-label">Website (Optional)</label>
                        <input
                          type="url"
                          value={wsWebsite}
                          onChange={(e) => setWsWebsite(e.target.value)}
                          placeholder="https://example.com"
                          className="tf-input"
                        />
                      </div>
                      <div>
                        <label className="tf-label">Description</label>
                        <textarea
                          value={wsDesc}
                          onChange={(e) => setWsDesc(e.target.value)}
                          rows={3}
                          className="tf-input resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {settingsTab === 'permissions' && (
                    <div className="space-y-5 animate-fade-in">
                      <div>
                        <label className="tf-label">Who can create boards?</label>
                        <select
                          value={wsBoardCreationRestriction}
                          onChange={(e) => setWsBoardCreationRestriction(e.target.value)}
                          className="tf-input"
                        >
                          <option value="ANYONE">Any Workspace Member</option>
                          <option value="ADMINS">Workspace Admins & Owner Only</option>
                        </select>
                        <p className="text-[10px] text-[#8590a2] dark:text-[#738496] mt-1">Restrict board creation to maintain workspace cleanliness.</p>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-slate-55 dark:bg-[#1d2125]/45 border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[6px]">
                        <div>
                          <label className="block text-[#172b4d] dark:text-[#b6c2cf] text-xs font-semibold mb-0.5">Guest Invites</label>
                          <p className="text-[10px] text-[#8590a2] dark:text-[#738496]">Allow members to invite guests outside the workspace to individual boards.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={wsGuestInvitesAllowed}
                          onChange={(e) => setWsGuestInvitesAllowed(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}


                  {settingsTab === 'danger' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 border border-rose-500/25 bg-rose-500/5 rounded-[6px]">
                        <h4 className="text-rose-500 dark:text-rose-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-500" /> Destructive Actions
                        </h4>
                        <p className="text-[10px] text-rose-600 dark:text-rose-400/80 leading-relaxed mb-4">
                          Deleting a workspace will permanently delete all metadata, settings, boards, tasks, milestones, checklists, and integration hook configs. There is no undo.
                        </p>
                        
                        {currentWorkspace.myRole === 'OWNER' ? (
                          <button
                            type="button"
                            onClick={handleDeleteWorkspace}
                            className="btn-danger w-full justify-center text-sm py-2 rounded-[0.1875rem]"
                          >
                            Delete Workspace Permanently
                          </button>
                        ) : (
                          <div className="text-[10px] text-[#8590a2] dark:text-[#738496] italic">
                            Only the workspace Owner can delete this workspace.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {settingsTab !== 'danger' && (
                  <div className="pt-4 border-t border-[#dfe1e6] dark:border-[#a6c5e229] mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setWsSettingsOpen(false)}
                      className="btn-secondary rounded-[0.1875rem]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary rounded-[0.1875rem]"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <GlobalOverlays />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/*" element={<DashboardLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
