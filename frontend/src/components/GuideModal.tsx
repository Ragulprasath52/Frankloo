import { useState } from 'react';
import { 
  X, HelpCircle, LayoutDashboard, Target, Palette, 
  Bot, Calendar, Mail, BookOpen, 
  Github, MessageSquare, Sparkles
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'welcome' | 'boards' | 'automations' | 'integrations' | 'appearance' | 'howto';

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('welcome');

  if (!isOpen) return null;

  const tabs = [
    { id: 'welcome', label: 'Welcome to Frankloo', icon: Sparkles },
    { id: 'boards', label: 'Boards & Kanban', icon: LayoutDashboard },
    { id: 'automations', label: 'Smart Automations', icon: Bot },
    { id: 'integrations', label: 'Integrations & Sync', icon: Mail },
    { id: 'appearance', label: 'Custom Themes', icon: Palette },
    { id: 'howto', label: 'How-To Guides', icon: BookOpen },
  ] as const;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px] animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl h-[85vh] md:h-[600px] modal-card rounded-2xl border shadow-2xl animate-scale-in flex flex-col overflow-hidden"
        style={{
          background: 'var(--bg-surface, #161b22)',
          borderColor: 'var(--border, #30363d)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dfe1e6] dark:border-[#30363d] shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-[#172b4d] dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Frankloo Interactive Guide
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="btn-icon p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar Navigation + Main Panel */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Navigation (Horizontal scroll on mobile, vertical on desktop) */}
          <div 
            className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#dfe1e6] dark:border-[#30363d] p-3 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0 bg-slate-50/50 dark:bg-black/10"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-[#579dff] shadow-sm'
                      : 'text-[#44546f] dark:text-[#9fadbc] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500 dark:text-[#579dff]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            
            {activeTab === 'welcome' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Welcome to Frankloo! 🚀</h3>
                  <p className="text-xs leading-relaxed text-[#44546f] dark:text-[#9fadbc]">
                    Frankloo is a self-hosted workspace collaboration platform that combines Kanban boards, calendars, document wikis, objective goal-tracking, and intelligent integrations to help your team stay productive and aligned.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold">Boards & Tasks</span>
                    </div>
                    <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">
                      Track projects dynamically. Use checklists, custom covers, task cards, and interactive sub-views.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold">Goals & Objectives</span>
                    </div>
                    <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">
                      Align teams around S.M.A.R.T objectives, milestones, target dates, and real-time completion progress metrics.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold">Wiki & Docs</span>
                    </div>
                    <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">
                      Build beautiful team knowledge bases, share technical manuals, notes, and collaborative documents.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold">Gmail Integration</span>
                    </div>
                    <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">
                      Sync with the Google API inbox to retrieve recent emails and display them directly in the workspace.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'boards' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Boards & Kanban Workflow 📋</h3>
                <p className="text-xs leading-relaxed text-[#44546f] dark:text-[#9fadbc]">
                  Frankloo offers a feature-rich, beautiful Kanban layout that makes project organization simple and collaborative.
                </p>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Drag-and-Drop Cards</h4>
                      <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">Drag card components smoothly between columns to update status instantly.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Interactive Sub-Views</h4>
                      <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">Switch between Kanban layout, Calendar scheduling, Analytics Dashboard, Workload allocation, and Automations at the top sub-tabs bar.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Card Customization</h4>
                      <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">Open card details to assign members, add priority level badges, write descriptions, create checklists, and write real-time chat comments.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'automations' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Smart Automations 🤖</h3>
                <p className="text-xs leading-relaxed text-[#44546f] dark:text-[#9fadbc]">
                  Automate repetitive actions by setting up trigger-action rules. Navigate to the <b>Automations</b> tab inside any board.
                </p>

                <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4" /> Trigger & Action Example
                  </h4>
                  <div className="text-[11px] space-y-1 text-[#44546f] dark:text-[#9fadbc]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Trigger:</span>
                      <span>Card moved to Done column</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Action:</span>
                      <span>Set priority to LOW / Complete checklist items automatically</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#44546f] dark:text-[#9fadbc] leading-relaxed">
                  Automations run on the background server and update connected web clients in real-time using socket events.
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Integrations & Sync 🔗</h3>
                <p className="text-xs leading-relaxed text-[#44546f] dark:text-[#9fadbc]">
                  Connect Frankloo to your other favorite developer tools and sync updates automatically.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/5">
                    <Github className="w-5 h-5 text-slate-900 dark:text-white shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">GitHub Webhooks</h4>
                      <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">Commit messages mentioning your card IDs automatically append commit logs to the card. Merged PRs can automatically move matching cards to Done.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/5">
                    <MessageSquare className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Slack & Discord Notifications</h4>
                      <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">Configure incoming Webhooks under Workspace Integrations to automatically push card updates, member assignments, and deadline notifications to team channels.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/5">
                    <Calendar className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">iCal Calendar Export</h4>
                      <p className="text-[11px] text-[#44546f] dark:text-[#9fadbc]">Copy the secure iCal feed URL to subscribe your Google Calendar, Outlook Calendar, or Apple Calendar to task deadlines.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Custom Themes & Styles 🎨</h3>
                <p className="text-xs leading-relaxed text-[#44546f] dark:text-[#9fadbc]">
                  Frankloo makes customization easy and beautiful. Personalize your visual system with standard tokens.
                </p>

                <div className="space-y-3 text-xs text-[#44546f] dark:text-[#9fadbc]">
                  <p>
                    <b>Global Themes:</b> Head to <i>Appearance & Themes</i> in the sidebar to configure Light/Dark modes, choose beautiful fonts (Outfit, Inter, Roboto), adjust border radiuses, and choose accent colors.
                  </p>
                  <p>
                    <b>Board Customizer:</b> Click <b>Appearance</b> in the board header to change the background to a gradient, upload your own beautiful high-resolution image, change the board emoji icon, or set a custom accent color for that board only.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'howto' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Step-by-Step How-To Guides 📖</h3>
                <p className="text-xs leading-relaxed text-[#44546f] dark:text-[#9fadbc]">
                  Follow these simple steps to perform common tasks in Frankloo:
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">How to Create a Board & Add Cards</h4>
                    <ol className="list-decimal list-inside text-[11px] text-[#44546f] dark:text-[#9fadbc] space-y-1">
                      <li>Go to the Sidebar and click the <b>Boards</b> tab.</li>
                      <li>Click the <b>Create board</b> button or the <b>+</b> icon in the header.</li>
                      <li>Enter a board title, select a gradient color background, and click <b>Create board</b>.</li>
                      <li>Within the board, click the <b>+ Add List</b> button to create custom columns.</li>
                      <li>Click <b>+ Add Card</b> at the bottom of any column to create tasks.</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">How to Configure a Smart Board Automation</h4>
                    <ol className="list-decimal list-inside text-[11px] text-[#44546f] dark:text-[#9fadbc] space-y-1">
                      <li>Open your target Board.</li>
                      <li>Navigate to the <b>Automations</b> sub-tab in the board header.</li>
                      <li>Select a trigger (e.g. <b>Card moved to Done</b>).</li>
                      <li>Select an action (e.g. <b>Set priority to LOW</b>).</li>
                      <li>Click <b>Create Rule</b>. Now, the system will apply this rule automatically to all cards.</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">How to Connect & Sync Gmail Inbox</h4>
                    <ol className="list-decimal list-inside text-[11px] text-[#44546f] dark:text-[#9fadbc] space-y-1">
                      <li>Select <b>Integrations</b> from the Sidebar navigation.</li>
                      <li>Scroll down to the <b>Gmail Integration & Test Center</b>.</li>
                      <li>Ensure <b>Sandbox Mode (Mock API)</b> is checked for testing, then click <b>Connect Account</b>.</li>
                      <li>Once connected, click <b>Sync Gmail Inbox</b> to fetch recent emails.</li>
                      <li>Your synced emails will appear in the <b>Inbox</b> panel on the right side of the workspace.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#dfe1e6] dark:border-[#30363d] shrink-0 flex justify-end bg-slate-50/50 dark:bg-black/10">
          <button 
            onClick={onClose} 
            className="btn-primary px-5 py-2 text-xs font-bold rounded-xl"
            style={{ background: 'var(--accent, #6366f1)', color: '#fff' }}
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
