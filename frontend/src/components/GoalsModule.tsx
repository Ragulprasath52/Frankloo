import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Target, Plus, Trash2, Calendar, BookOpen, Layers, CheckSquare,
  Activity, ArrowRight, Check, X, ShieldAlert, TrendingUp,
  FileText, Clipboard, Flag, HelpCircle, LayoutGrid, ChevronRight, ChevronDown
} from 'lucide-react';
import { useStore, getAvatarUrl } from '../store/useStore';
import type { Goal } from '../store/useStore';

interface GoalsModuleProps {
  workspaceId: string;
  isEditor: boolean;
  onSelectBoard: (boardId: string) => void;
}

// Visual category mapping
const CATEGORIES = [
  { value: 'PRODUCT', label: 'Product', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  { value: 'ENGINEERING', label: 'Engineering', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  { value: 'SALES', label: 'Sales', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { value: 'MARKETING', label: 'Marketing', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  { value: 'FINANCE', label: 'Finance', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800' },
  { value: 'LEARNING', label: 'Learning', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { value: 'PERSONAL', label: 'Personal', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800' },
  { value: 'BUSINESS', label: 'Business', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { value: 'GENERAL', label: 'General', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800' }
];

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-300' },
  { value: 'ON_TRACK', label: 'On Track', color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-400/30' },
  { value: 'AT_RISK', label: 'At Risk', color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-400/30' },
  { value: 'BEHIND_SCHEDULE', label: 'Behind Schedule', color: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-400/30' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-400/30' },
  { value: 'ARCHIVED', label: 'Archived', color: 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-400/30' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'text-slate-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-blue-500' },
  { value: 'HIGH', label: 'High', color: 'text-amber-500' },
  { value: 'URGENT', label: 'Urgent', color: 'text-rose-500 font-bold' }
];

// Predefined Goal Templates
const TEMPLATES = [
  {
    title: '🚀 Launch Product MVP',
    description: 'Track key initiatives to deliver product beta launch by end of sprint.',
    category: 'PRODUCT',
    priority: 'HIGH',
    keyResults: [
      { id: 'kr1', title: 'Complete QA regression tests', type: 'BOOLEAN', currentValue: 0, targetValue: 1, isCompleted: false },
      { id: 'kr2', title: 'Reduce critical bugs count to zero', type: 'NUMBER', currentValue: 5, targetValue: 0, isCompleted: false },
      { id: 'kr3', title: 'Publish release documentation and guides', type: 'BOOLEAN', currentValue: 0, targetValue: 1, isCompleted: false }
    ],
    milestones: [
      { id: 'm1', title: 'Feature Freeze', isCompleted: true },
      { id: 'm2', title: 'Closed Beta deployment', isCompleted: false },
      { id: 'm3', title: 'Public Announcement', isCompleted: false }
    ]
  },
  {
    title: '📚 Pass CCNA Certification',
    description: 'Self-study OKR to pass Cisco Certified Network Associate exam.',
    category: 'LEARNING',
    priority: 'MEDIUM',
    keyResults: [
      { id: 'kr1', title: 'Complete Jeremy IT Lab courses', type: 'NUMBER', currentValue: 0, targetValue: 30, isCompleted: false },
      { id: 'kr2', title: 'Score 85% or higher in practice mock tests', type: 'NUMBER', currentValue: 0, targetValue: 100, isCompleted: false },
      { id: 'kr3', title: 'Schedule exam slot', type: 'BOOLEAN', currentValue: 0, targetValue: 1, isCompleted: false }
    ],
    milestones: [
      { id: 'm1', title: 'Fundamentals & Routing', isCompleted: false },
      { id: 'm2', title: 'IPv6 & Security', isCompleted: false },
      { id: 'm3', title: 'Exam Day', isCompleted: false }
    ]
  },
  {
    title: '🎯 Project Task Completion',
    description: 'Ensure engineering sprint completion rate is maximized.',
    category: 'ENGINEERING',
    priority: 'URGENT',
    keyResults: [
      { id: 'kr1', title: 'Resolve outstanding project cards', type: 'NUMBER', currentValue: 0, targetValue: 10, isCompleted: false }
    ],
    milestones: [
      { id: 'm1', title: 'Code Refactoring', isCompleted: false },
      { id: 'm2', title: 'CI/CD pipeline green', isCompleted: false }
    ]
  }
];

// SVG Progress Ring Component
const ProgressRing = ({ percent, size = 36, strokeWidth = 3, className = "" }: { percent: number; size?: number; strokeWidth?: number; className?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <svg width={size} height={size} className={className}>
      <circle
        className="text-gray-200 dark:text-white/10"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="text-blue-600 dark:text-blue-500 transition-all duration-500 ease-out"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

export default function GoalsModule({ workspaceId, isEditor, onSelectBoard }: GoalsModuleProps) {
  const { currentWorkspace, createGoal, updateGoal, deleteGoal, documents, fetchDocuments, showConfirm, addToast } = useStore();

  const [activeViewTab, setActiveViewTab] = useState<'dashboard' | 'timeline' | 'all'>('dashboard');
  const [timelinePeriod, setTimelinePeriod] = useState<'today' | 'week' | 'month' | 'upcoming'>('week');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modal & Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardTab, setWizardTab] = useState<'info' | 'okr' | 'milestones' | 'links'>('info');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState('NOT_STARTED');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('GENERAL');
  const [ownerId, setOwnerId] = useState('');

  // Interactive OKR key results & milestones
  const [keyResults, setKeyResults] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [linkedBoards, setLinkedBoards] = useState<string[]>([]);
  const [linkedCards, setLinkedCards] = useState<string[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<string[]>([]);
  const [autoUpdateFromCards, setAutoUpdateFromCards] = useState(false);

  // Expanded View State
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // SMART Goal Tips State
  const [smartTipsVisible, setSmartTipsVisible] = useState(false);
  const [okrGuideVisible, setOkrGuideVisible] = useState(false);

  // Sync data on load
  useEffect(() => {
    if (workspaceId) {
      fetchDocuments(workspaceId);
    }
  }, [workspaceId, fetchDocuments]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetDate('');
    setStatus('NOT_STARTED');
    setPriority('MEDIUM');
    setCategory('GENERAL');
    setOwnerId('');
    setKeyResults([]);
    setMilestones([]);
    setLinkedBoards([]);
    setLinkedCards([]);
    setLinkedDocs([]);
    setAutoUpdateFromCards(false);
    setWizardTab('info');
    setEditingGoal(null);
  };

  const handleOpenEdit = (g: Goal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setDescription(g.description || '');
    setTargetDate(g.targetDate ? g.targetDate.substring(0, 10) : '');
    setStatus(g.status);
    setPriority(g.priority || 'MEDIUM');
    setCategory(g.category);
    setOwnerId(g.ownerId || '');

    try {
      setKeyResults(JSON.parse(g.keyResults || '[]'));
    } catch { setKeyResults([]); }

    try {
      setMilestones(JSON.parse(g.milestones || '[]'));
    } catch { setMilestones([]); }

    try {
      setLinkedBoards(JSON.parse(g.linkedBoards || '[]'));
    } catch { setLinkedBoards([]); }

    try {
      setLinkedCards(JSON.parse(g.linkedCards || '[]'));
    } catch { setLinkedCards([]); }

    try {
      setLinkedDocs(JSON.parse(g.linkedDocs || '[]'));
    } catch { setLinkedDocs([]); }

    setWizardOpen(true);
  };

  const handleApplyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setPriority(tpl.priority);
    setKeyResults(tpl.keyResults.map(kr => ({ ...kr, id: Math.random().toString(36).substring(2, 9) })));
    setMilestones(tpl.milestones.map(m => ({ ...m, id: Math.random().toString(36).substring(2, 9) })));
    setWizardTab('okr');
    setWizardOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      targetDate: targetDate || null,
      status,
      category,
      priority,
      ownerId: ownerId || null,
      keyResults: JSON.stringify(keyResults),
      milestones: JSON.stringify(milestones),
      linkedBoards: JSON.stringify(linkedBoards),
      linkedCards: JSON.stringify(linkedCards),
      linkedDocs: JSON.stringify(linkedDocs),
      autoUpdateFromCards
    };

    try {
      if (editingGoal) {
        await updateGoal(workspaceId, editingGoal.id, payload);
        addToast('Goal Updated', 'The goal objective was updated successfully.', 'success');
      } else {
        await createGoal(workspaceId, payload);
        addToast('Goal Created', 'New goal objective created successfully.', 'success');
      }
      setWizardOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (goalId: string) => {
    const confirmed = await showConfirm(
      'Delete Objective',
      'Are you sure you want to delete this objective?'
    );
    if (!confirmed) return;
    try {
      await deleteGoal(workspaceId, goalId);
      addToast('Objective Deleted', 'The goal objective has been deleted.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Inline updater for Key Results / Milestones directly from Card View
  const handleUpdateKRValue = async (goal: Goal, krId: string, value: number) => {
    try {
      const krs = JSON.parse(goal.keyResults || '[]');
      const updated = krs.map((kr: any) => {
        if (kr.id === krId) {
          const current = Math.min(kr.targetValue, Math.max(0, value));
          return {
            ...kr,
            currentValue: current,
            isCompleted: current >= kr.targetValue
          };
        }
        return kr;
      });
      await updateGoal(workspaceId, goal.id, { keyResults: JSON.stringify(updated) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleKRCheck = async (goal: Goal, krId: string, isCompleted: boolean) => {
    try {
      const krs = JSON.parse(goal.keyResults || '[]');
      const updated = krs.map((kr: any) => {
        if (kr.id === krId) {
          return {
            ...kr,
            isCompleted,
            currentValue: isCompleted ? 1 : 0
          };
        }
        return kr;
      });
      await updateGoal(workspaceId, goal.id, { keyResults: JSON.stringify(updated) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMilestone = async (goal: Goal, mId: string, isCompleted: boolean) => {
    try {
      const ms = JSON.parse(goal.milestones || '[]');
      const updated = ms.map((m: any) => {
        if (m.id === mId) {
          return { ...m, isCompleted };
        }
        return m;
      });
      await updateGoal(workspaceId, goal.id, { milestones: JSON.stringify(updated) });
    } catch (err) {
      console.error(err);
    }
  };

  // Helper selectors data
  const boardsList = currentWorkspace?.boards ?? [];
  const cardsList = currentWorkspace?.boards?.flatMap(b =>
    (b.lists ?? []).flatMap(l => (l.cards ?? []).map(c => ({ ...c, boardName: b.name })))
  ) ?? [];
  const membersList = currentWorkspace?.members ?? [];

  // Goal metrics computations
  const goals = currentWorkspace?.goals ?? [];
  const filteredGoals = goals.filter(g => selectedCategoryFilter === 'ALL' || g.category === selectedCategoryFilter);

  const totalGoals = filteredGoals.length;
  const completedGoals = filteredGoals.filter(g => g.status === 'COMPLETED').length;
  const activeGoals = filteredGoals.filter(g => g.status !== 'COMPLETED' && g.status !== 'ARCHIVED').length;

  const today = new Date();
  const overdueGoals = filteredGoals.filter(g => {
    if (g.status === 'COMPLETED' || g.status === 'ARCHIVED' || !g.targetDate) return false;
    return new Date(g.targetDate) < today;
  }).length;

  const successRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Timeline Filtering helper
  const getTimelineGoals = () => {
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);
    const endOfMonth = new Date();
    endOfMonth.setDate(now.getDate() + 30);

    return filteredGoals.filter(g => {
      if (!g.targetDate) return timelinePeriod === 'upcoming';
      const target = new Date(g.targetDate);

      const isToday = target.toDateString() === now.toDateString();
      const isThisWeek = target >= now && target <= endOfWeek && !isToday;
      const isThisMonth = target >= now && target <= endOfMonth && !isToday && !isThisWeek;
      const isUpcoming = target > endOfMonth;

      if (timelinePeriod === 'today') return isToday;
      if (timelinePeriod === 'week') return isToday || isThisWeek;
      if (timelinePeriod === 'month') return isToday || isThisWeek || isThisMonth;
      return isUpcoming;
    });
  };

  const displayedGoals = activeViewTab === 'timeline' ? getTimelineGoals() : filteredGoals;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-fade-in pb-16 text-[#172b4d] dark:text-[#b6c2cf] overflow-x-hidden">

      {/* ── HEADER & TABS ───────────────────────── */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>Objectives &amp; Key Results (OKRs)</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Align team execution with high-level workspace goals, initiatives, and S.M.A.R.T milestones.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-[#f1f2f4] dark:bg-white/5 rounded-lg p-0.5 tab-bar shrink-0" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveViewTab('dashboard')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${activeViewTab === 'dashboard' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveViewTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${activeViewTab === 'all' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              All Goals
            </button>
            <button
              onClick={() => setActiveViewTab('timeline')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${activeViewTab === 'timeline' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              Timeline View
            </button>
          </div>
          <div className="flex gap-2 flex-wrap sm:ml-auto">
            <button 
              type="button"
              onClick={() => setOkrGuideVisible(!okrGuideVisible)} 
              className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs font-semibold hover:border-indigo-500/30 dark:hover:border-indigo-400/30"
              style={{ color: 'var(--accent)' }}
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>{okrGuideVisible ? 'Hide Guide' : 'OKR Guide'}</span>
            </button>
            {isEditor && (
              <button onClick={() => { resetForm(); setWizardOpen(true); }} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Goal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* OKR Guide Section */}
      {okrGuideVisible && (
        <div className="mb-6 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/10 dark:bg-indigo-950/5 animate-fade-in space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-indigo-100/50 dark:border-indigo-900/20 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-indigo-650 dark:text-[#579dff] flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" /> Objectives &amp; Key Results (OKRs) Guide
            </h3>
            <button 
              onClick={() => setOkrGuideVisible(false)}
              className="p-1 rounded hover:bg-indigo-500/10 text-indigo-500/70 hover:text-indigo-500 transition"
              title="Close Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] border border-[#dfe1e6] dark:border-[#30363d] space-y-2 shadow-sm">
              <h4 className="text-xs font-bold text-[#172b4d] dark:text-white">1. OKR Concepts</h4>
              <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                <b>Objectives</b> are high-level, action-oriented, and aspirational goals. <b>Key Results (KRs)</b> are the quantifiable and measurable metrics to check if we are on track.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] border border-[#dfe1e6] dark:border-[#30363d] space-y-2 shadow-sm">
              <h4 className="text-xs font-bold text-[#172b4d] dark:text-white">2. Creating OKRs</h4>
              <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                Click <b>+ Add Goal</b>. Enter Title/Description, choose Category &amp; Priority, and set a Target Date. Predefined templates are also available to auto-populate standard goals.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] border border-[#dfe1e6] dark:border-[#30363d] space-y-2 shadow-sm">
              <h4 className="text-xs font-bold text-[#172b4d] dark:text-white">3. Adding KRs &amp; Milestones</h4>
              <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                Add KRs under the OKR wizard tab. Choose <b>Boolean</b> (Done/Not Done) or <b>Numeric</b> (progress from start value to target value). You can also add phase-based <b>Milestones</b>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] border border-[#dfe1e6] dark:border-[#30363d] space-y-2 shadow-sm">
              <h4 className="text-xs font-bold text-[#172b4d] dark:text-white">4. Progress Calculation</h4>
              <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                Update Key Result values inside the objective details view. The overall <b>OKR Progress percentage</b> will recalculate dynamically based on KR completion rates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── METRICS DASHBOARD VIEW ────────────────────── */}
      {activeViewTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <div className="col-span-1 md:col-span-2 lg:col-span-2 p-5 rounded-2xl flex items-center justify-between shadow-sm border border-[#dfe1e6] dark:border-[#a6c5e229]" style={{ background: 'var(--bg-surface)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">OKR Progress</p>
              <h3 className="text-3xl font-extrabold mt-1">{successRate}%</h3>
              <p className="text-xs text-gray-500 mt-2">Overall workspace objectives completion success rate.</p>
            </div>
            <ProgressRing percent={successRate} size={84} strokeWidth={8} />
          </div>

          {[
            { label: 'Total Goals', val: totalGoals, desc: 'Registered objectives', icon: Target, iconColor: 'text-indigo-500 bg-indigo-500/10' },
            { label: 'Active Initiatives', val: activeGoals, desc: 'Currently in progress', icon: TrendingUp, iconColor: 'text-emerald-500 bg-emerald-500/10' },
            { label: 'Overdue Objectives', val: overdueGoals, desc: 'Target date missed', icon: ShieldAlert, iconColor: overdueGoals > 0 ? 'text-rose-500 bg-rose-500/10' : 'text-gray-400 bg-gray-100' }
          ].map((card, i) => (
            <div key={i} className="p-5 rounded-2xl shadow-sm border border-[#dfe1e6] dark:border-[#a6c5e229]" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{card.label}</span>
                <span className={`p-1.5 rounded-lg ${card.iconColor}`}><card.icon className="w-4 h-4" /></span>
              </div>
              <h3 className="text-2xl font-extrabold">{card.val}</h3>
              <p className="text-xs text-gray-500 mt-2">{card.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── ROADMAP FILTER BAR (TIMELINE ONLY) ────────── */}
      {activeViewTab === 'timeline' && (
        <div className="flex bg-[#f1f2f4] dark:bg-white/5 rounded-xl p-1 mb-6 border border-[#dfe1e6] dark:border-[#a6c5e229] max-w-md">
          {[
            { value: 'today', label: 'Due Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
            { value: 'upcoming', label: 'Upcoming / Later' }
          ].map((period) => (
            <button
              key={period.value}
              onClick={() => setTimelinePeriod(period.value as any)}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all ${timelinePeriod === period.value ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      )}

      {/* ── CATEGORY BAR ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-2 border-b border-[#dfe1e6] dark:border-[#a6c5e229]">
        <button
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedCategoryFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow'
              : 'bg-[#f1f2f4] dark:bg-white/5 border-transparent text-[#44546f] dark:text-[#9fadbc] hover:bg-[#e4e6ea] dark:hover:bg-white/10'
            }`}
        >
          All Categories
        </button>
        {CATEGORIES.filter(c => c.value !== 'GENERAL').map((cat) => {
          const isSelected = selectedCategoryFilter === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white dark:bg-white/5 border-[#dfe1e6] dark:border-[#a6c5e229] text-[#44546f] dark:text-[#9fadbc] hover:bg-[#e4e6ea] dark:hover:bg-white/10'
                }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── GOALS CARDS LIST / TIMELINE ROADMAP ───────── */}
      {displayedGoals.length === 0 ? (
        <div>
          {/* EMPTY STATE TEMPLATES WIDGET */}
          <div className="border border-dashed border-[#dfe1e6] dark:border-[#a6c5e229] rounded-2xl py-12 px-6 text-center" style={{ background: 'var(--bg-surface)' }}>
            <Target className="w-12 h-12 mx-auto text-[#c1c7d0] dark:text-[#454f59] mb-4" />
            <h3 className="text-base font-bold text-[#172b4d] dark:text-[#b6c2cf]">No objectives found</h3>
            <p className="text-xs text-[#8590a2] mt-1 max-w-sm mx-auto">Track team deliverables and align targets case-by-case. Click a templates layout card below to deploy a pre-configured SMART Goal template instantly.</p>
            {isEditor && (
              <button onClick={() => { resetForm(); setWizardOpen(true); }} className="btn-primary mt-5 mx-auto">
                <Plus className="w-4 h-4" /> Create First Goal
              </button>
            )}
          </div>

          <div className="mt-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Suggested Goal Templates</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((tpl, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-5 rounded-2xl border border-[#dfe1e6] dark:border-[#a6c5e229] hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group"
                  style={{ background: 'var(--bg-surface)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full">{tpl.category}</span>
                    <span className="text-xs text-gray-400 group-hover:text-blue-500 flex items-center gap-1">Use <ArrowRight className="w-3 h-3" /></span>
                  </div>
                  <h4 className="font-bold text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">{tpl.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{tpl.description}</p>
                  <div className="text-[11px] text-gray-400 border-t border-gray-100 dark:border-white/5 pt-2">
                    Includes {tpl.keyResults.length} OKRs & {tpl.milestones.length} milestones
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedGoals.map((g) => {
            const isExpanded = expandedGoalId === g.id;

            let gKRs: any[] = [];
            let gMilestones: any[] = [];
            let gBoards: string[] = [];
            let gCards: string[] = [];
            let gDocs: string[] = [];
            let gActivities: any[] = [];

            try { gKRs = JSON.parse(g.keyResults || '[]'); } catch { }
            try { gMilestones = JSON.parse(g.milestones || '[]'); } catch { }
            try { gBoards = JSON.parse(g.linkedBoards || '[]'); } catch { }
            try { gCards = JSON.parse(g.linkedCards || '[]'); } catch { }
            try { gDocs = JSON.parse(g.linkedDocs || '[]'); } catch { }
            try { gActivities = JSON.parse(g.activities || '[]'); } catch { }

            const catConfig = CATEGORIES.find(c => c.value === g.category) || CATEGORIES[8];
            const statusConfig = STATUS_OPTIONS.find(s => s.value === g.status) || STATUS_OPTIONS[0];
            const priorityConfig = PRIORITIES.find(p => p.value === (g.priority || 'MEDIUM')) || PRIORITIES[1];

            const ownerMember = membersList.find(m => m.user.id === g.ownerId);

            return (
              <div
                key={g.id}
                className={`rounded-2xl border transition-all ${isExpanded ? 'border-blue-500 shadow-md' : 'border-[#dfe1e6] dark:border-[#a6c5e229] hover:border-gray-300 dark:hover:border-white/10'
                  }`}
                style={{ background: 'var(--bg-surface)' }}
              >
                {/* ── CARD HEADER ── */}
                <div
                  onClick={() => setExpandedGoalId(isExpanded ? null : g.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <ProgressRing percent={g.progress} size={42} strokeWidth={4} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catConfig.color}`}>
                          {catConfig.label}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Flag className="w-3 h-3 text-gray-300" /> {priorityConfig.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm leading-tight text-[#172b4d] dark:text-[#b6c2cf]">
                        {g.title}
                      </h3>
                      {g.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{g.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                    {g.targetDate && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Target Date</p>
                        <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {new Date(g.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {ownerMember && (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={getAvatarUrl(ownerMember.user.avatarUrl, ownerMember.user.name || ownerMember.user.username)}
                          alt="avatar"
                          className="w-6 h-6 rounded-full shrink-0 border border-gray-200"
                        />
                        <div className="text-left hidden sm:block">
                          <p className="text-[9px] text-gray-400 font-bold uppercase leading-none">Owner</p>
                          <span className="text-[11px] font-semibold">{ownerMember.user.name}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-gray-400">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* ── EXPANDED DETAILED DRAWER ── */}
                {isExpanded && (
                  <div className="border-t border-[#dfe1e6] dark:border-[#a6c5e229] p-6 bg-[#fafbfc] dark:bg-white/[0.01] rounded-b-2xl">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* Left: OKR / Key Results progress */}
                      <div className="col-span-1 lg:col-span-2 space-y-5">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-gray-400" /> Key Results (OKRs)
                          </h4>
                          {gKRs.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No key results defined. Edit goal to add OKR metrics.</p>
                          ) : (
                            <div className="space-y-3">
                              {gKRs.map((kr) => {
                                const krPercent = kr.type === 'BOOLEAN'
                                  ? (kr.isCompleted ? 100 : 0)
                                  : Math.min(100, Math.max(0, Math.round((kr.currentValue / kr.targetValue) * 100)));

                                return (
                                  <div key={kr.id} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2">
                                        {kr.type === 'BOOLEAN' ? (
                                          <input
                                            type="checkbox"
                                            checked={kr.isCompleted}
                                            disabled={!isEditor}
                                            onChange={(e) => handleToggleKRCheck(g, kr.id, e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                          />
                                        ) : (
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        )}
                                        <span className={`text-xs font-semibold ${kr.isCompleted ? 'line-through text-gray-400' : ''}`}>
                                          {kr.title}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{krPercent}%</span>
                                    </div>

                                    {kr.type === 'NUMBER' && (
                                      <div className="flex items-center gap-4 mt-2">
                                        <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${krPercent}%` }} />
                                        </div>
                                        {isEditor && (
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <input
                                              type="number"
                                              value={kr.currentValue}
                                              onChange={(e) => handleUpdateKRValue(g, kr.id, parseInt(e.target.value, 10) || 0)}
                                              className="w-16 px-1.5 py-0.5 text-center text-xs border border-gray-200 dark:border-white/10 rounded bg-[#fafbfc] dark:bg-[#1c2128]"
                                              min="0"
                                              max={kr.targetValue}
                                            />
                                            <span className="text-xs text-gray-400 font-medium">/ {kr.targetValue}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Milestones Horizontal Timeline */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-gray-400" /> Milestones Timeline
                          </h4>
                          {gMilestones.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No milestones defined.</p>
                          ) : (
                            <div className="flex flex-col space-y-2">
                              {gMilestones.map((m, mIdx) => (
                                <div key={m.id || mIdx} className="flex items-start gap-2.5">
                                  <div className="flex flex-col items-center">
                                    <button
                                      onClick={() => isEditor && handleToggleMilestone(g, m.id, !m.isCompleted)}
                                      className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all ${m.isCompleted
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'bg-white dark:bg-[#1a1f26] border-gray-300 hover:border-emerald-500 text-transparent'
                                        }`}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>
                                    {mIdx < gMilestones.length - 1 && (
                                      <div className="w-[1.5px] h-6 bg-gray-200 dark:bg-white/10 my-1" />
                                    )}
                                  </div>
                                  <span className={`text-xs font-semibold mt-0.5 ${m.isCompleted ? 'text-gray-400 line-through' : ''}`}>
                                    {m.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Linked context elements, logs & Actions */}
                      <div className="space-y-5 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-white/5 pt-5 lg:pt-0 lg:pl-6">

                        {/* Linked Items indicators */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Linked Resources</h4>

                          {/* Boards */}
                          {gBoards.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Boards</p>
                              <div className="flex flex-wrap gap-1">
                                {gBoards.map(bId => {
                                  const board = boardsList.find(b => b.id === bId);
                                  if (!board) return null;
                                  return (
                                    <button
                                      key={bId}
                                      onClick={() => onSelectBoard(bId)}
                                      className="px-2 py-1 rounded bg-[#f1f2f4] dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/15 text-[11px] font-semibold flex items-center gap-1 border border-transparent hover:border-gray-300 dark:hover:border-white/10"
                                    >
                                      <LayoutGrid className="w-3 h-3 text-indigo-500" /> {board.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Cards/Tasks */}
                          {gCards.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tasks</p>
                              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                {gCards.map(cId => {
                                  const card = cardsList.find(c => c.id === cId);
                                  if (!card) return null;
                                  return (
                                    <div key={cId} className="px-2 py-1 rounded bg-white dark:bg-white/5 text-[11px] flex items-center justify-between border border-gray-100 dark:border-white/5">
                                      <span className="font-semibold line-clamp-1 flex-1">{card.title}</span>
                                      <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded shrink-0 ml-2">{card.boardName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Documents */}
                          {gDocs.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Wiki Docs</p>
                              <div className="flex flex-wrap gap-1">
                                {gDocs.map(dId => {
                                  const doc = documents.find(d => d.id === dId);
                                  if (!doc) return null;
                                  return (
                                    <div key={dId} className="px-2 py-1 rounded bg-[#f1f2f4] dark:bg-white/5 text-[11px] font-semibold flex items-center gap-1">
                                      <FileText className="w-3 h-3 text-blue-500" /> {doc.title}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {gBoards.length === 0 && gCards.length === 0 && gDocs.length === 0 && (
                            <p className="text-xs text-gray-500 italic">No resources connected.</p>
                          )}
                        </div>

                        {/* Recent Activity feed log */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-gray-400" /> Objective History
                          </h4>
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {gActivities.slice(-5).reverse().map((act: any) => (
                              <div key={act.id} className="text-[11px] leading-snug border-b border-gray-100 dark:border-white/5 pb-1">
                                <span className="font-bold text-gray-600 dark:text-gray-400">{act.user}</span>{' '}
                                <span className="text-gray-500">{act.content}</span>
                                <p className="text-[9px] text-gray-400 mt-0.5">{new Date(act.createdAt).toLocaleTimeString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Edit/Delete Actions */}
                        {isEditor && (
                          <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                            <button
                              onClick={() => handleOpenEdit(g)}
                              className="btn-secondary py-1.5 px-3 text-xs w-full justify-center"
                            >
                              Edit Objective
                            </button>
                            <button
                              onClick={() => handleDelete(g.id)}
                              className="text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/20 hover:border-transparent rounded-lg px-3 py-1.5 text-xs transition-all shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── S.M.A.R.T CREATION WIZARD MODAL ───────────── */}
      {wizardOpen && createPortal(
        <div className="modal-overlay px-4" onClick={() => setWizardOpen(false)}>
          <div className="w-full max-w-2xl bg-white dark:bg-[#1a1f26] rounded-2xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()} style={{ border: '1px solid var(--border)' }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#dfe1e6] dark:border-[#a6c5e229]">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-base text-[#172b4d] dark:text-[#b6c2cf] truncate">
                  {editingGoal ? 'Edit Objective' : 'Deploy OKR & SMART Objective'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate sm:whitespace-normal">Ensure targets are Specific, Measurable, Achievable, Relevant, and Time-bound.</p>
              </div>
              <button onClick={() => setWizardOpen(false)} className="btn-icon shrink-0"><X className="w-4 h-4" /></button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-[#dfe1e6] dark:border-[#a6c5e229] px-4 sm:px-6 bg-gray-50 dark:bg-white/[0.01] overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap">
              {[
                { id: 'info', label: '1. Basic Info', icon: Clipboard },
                { id: 'okr', label: '2. OKRs (Key Results)', icon: CheckSquare },
                { id: 'milestones', label: '3. Milestones', icon: Layers },
                { id: 'links', label: '4. Linkages & Owner', icon: BookOpen }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWizardTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${wizardTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-800'
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">

                {/* 1. Basic Info Tab */}
                {wizardTab === 'info' && (
                  <div className="space-y-4">
                    <div>
                      <label className="tf-label">Objective Title *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Pass CCNA Exam, Launch Product Beta"
                        className="tf-input text-sm sm:text-base"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="tf-label">Description</label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Detail the metrics, expectations and business value..."
                        className="tf-input h-20 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="tf-label">Category</label>
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value)}
                          className="tf-input"
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="tf-label">Priority</label>
                        <select
                          value={priority}
                          onChange={e => setPriority(e.target.value)}
                          className="tf-input"
                        >
                          {PRIORITIES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="tf-label">Target Date</label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={e => setTargetDate(e.target.value)}
                          className="tf-input"
                        />
                      </div>
                      <div>
                        <label className="tf-label">Initial Status</label>
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          className="tf-input"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* SMART Guideline collapsible warning */}
                    <div className="border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 bg-blue-50/50 dark:bg-blue-950/5">
                      <button
                        type="button"
                        onClick={() => setSmartTipsVisible(!smartTipsVisible)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-blue-700 dark:text-blue-400"
                      >
                        <span className="flex items-center gap-1.5"><HelpCircle className="w-4 h-4 shrink-0" /> How to frame a S.M.A.R.T objective?</span>
                        <span>{smartTipsVisible ? 'Hide' : 'Show'}</span>
                      </button>
                      {smartTipsVisible && (
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-[11px] text-gray-500 leading-relaxed">
                          <li><strong>Specific:</strong> Define precisely what outcome is expected.</li>
                          <li><strong>Measurable:</strong> Define Key Results (numbers or checklist milestones).</li>
                          <li><strong>Achievable:</strong> Match with realistic capabilities.</li>
                          <li><strong>Relevant:</strong> Align with Workspace team projects.</li>
                          <li><strong>Time-bound:</strong> Ensure target dates are not open-ended.</li>
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. OKRs (Key Results) Tab */}
                {wizardTab === 'okr' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5 gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Objective Key Results</h4>
                      <button
                        type="button"
                        onClick={() => setKeyResults(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), title: '', type: 'BOOLEAN', currentValue: 0, targetValue: 1, isCompleted: false }])}
                        className="btn-secondary py-1 px-2.5 text-[11px] whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add KR
                      </button>
                    </div>

                    {keyResults.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400 italic">
                        No Key Results defined. Overall objective progress will default to static slider or card updates.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {keyResults.map((kr, idx) => (
                          <div key={kr.id} className="p-3 border border-gray-100 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/[0.01] flex items-start gap-3">
                            <div className="flex-1 space-y-2 min-w-0">
                              <input
                                type="text"
                                value={kr.title}
                                onChange={e => {
                                  const updated = [...keyResults];
                                  updated[idx].title = e.target.value;
                                  setKeyResults(updated);
                                }}
                                placeholder="Key Result metric description..."
                                className="tf-input text-xs w-full"
                                required
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Type:</label>
                                  <select
                                    value={kr.type}
                                    onChange={e => {
                                      const updated = [...keyResults];
                                      updated[idx].type = e.target.value;
                                      if (e.target.value === 'BOOLEAN') {
                                        updated[idx].targetValue = 1;
                                        updated[idx].currentValue = 0;
                                      } else {
                                        updated[idx].targetValue = 100;
                                        updated[idx].currentValue = 0;
                                      }
                                      setKeyResults(updated);
                                    }}
                                    className="px-1.5 py-0.5 border border-gray-200 dark:border-white/10 rounded bg-[#fafbfc] dark:bg-[#1c2128] text-[11px]"
                                  >
                                    <option value="BOOLEAN">Checkbox</option>
                                    <option value="NUMBER">Number Range</option>
                                  </select>
                                </div>
                                {kr.type === 'NUMBER' && (
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Target Target:</label>
                                    <input
                                      type="number"
                                      value={kr.targetValue}
                                      onChange={e => {
                                        const updated = [...keyResults];
                                        updated[idx].targetValue = parseInt(e.target.value, 10) || 1;
                                        setKeyResults(updated);
                                      }}
                                      className="w-16 px-1.5 py-0.5 border border-gray-200 dark:border-white/10 rounded text-[11px] bg-[#fafbfc] dark:bg-[#1c2128]"
                                      min="1"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setKeyResults(prev => prev.filter(k => k.id !== kr.id))}
                              className="text-gray-400 hover:text-rose-500 p-1.5 rounded transition-all mt-1 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Milestones Tab */}
                {wizardTab === 'milestones' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5 gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Goal Milestones Chronological Path</h4>
                      <button
                        type="button"
                        onClick={() => setMilestones(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), title: '', isCompleted: false }])}
                        className="btn-secondary py-1 px-2.5 text-[11px] whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Milestone
                      </button>
                    </div>

                    {milestones.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400 italic">
                        No milestone items defined. Add chronological deliverables.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {milestones.map((m, idx) => (
                          <div key={m.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-bold w-6 shrink-0">{idx + 1}.</span>
                            <input
                              type="text"
                              value={m.title}
                              onChange={e => {
                                const updated = [...milestones];
                                updated[idx].title = e.target.value;
                                setMilestones(updated);
                              }}
                              placeholder="e.g. Design validation complete"
                              className="tf-input text-xs flex-1 min-w-0"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setMilestones(prev => prev.filter(item => item.id !== m.id))}
                              className="text-gray-400 hover:text-rose-500 p-1.5 rounded transition-all shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Linkages & Owner Tab */}
                {wizardTab === 'links' && (
                  <div className="space-y-4">
                    <div>
                      <label className="tf-label">Objective Owner</label>
                      <select
                        value={ownerId}
                        onChange={e => setOwnerId(e.target.value)}
                        className="tf-input"
                      >
                        <option value="">Select owner...</option>
                        {membersList.map(m => (
                          <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.username}</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Linked Context Items</h4>

                      {/* Linked Boards Multi Select */}
                      <div className="mb-3">
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Link Boards</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {boardsList.map(b => {
                            const isLinked = linkedBoards.includes(b.id);
                            return (
                              <button
                                type="button"
                                key={b.id}
                                onClick={() => setLinkedBoards(prev => isLinked ? prev.filter(id => id !== b.id) : [...prev, b.id])}
                                className={`px-3 py-2 rounded-xl text-xs text-left border flex items-center justify-between font-semibold transition-all ${isLinked ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5'
                                  }`}
                              >
                                <span className="truncate mr-2">{b.name}</span>
                                {isLinked && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Linked Cards Multi Select */}
                      <div className="mb-3">
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Link Cards / Tasks</label>
                        <div className="max-h-32 overflow-y-auto space-y-1 mt-1 border border-gray-200 dark:border-white/5 rounded-xl p-2 bg-[#fafbfc] dark:bg-black/5">
                          {cardsList.map(c => {
                            const isLinked = linkedCards.includes(c.id);
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => setLinkedCards(prev => isLinked ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                                className={`w-full px-2 py-1.5 rounded-lg text-xs text-left border flex items-center justify-between transition-all ${isLinked ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' : 'border-transparent hover:bg-gray-200/50 dark:hover:bg-white/5'
                                  }`}
                              >
                                <span className="truncate mr-2">{c.title} <span className="text-[10px] text-gray-400 font-medium font-mono">({c.boardName})</span></span>
                                {isLinked && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                        {linkedCards.length > 0 && (
                          <div className="flex items-start gap-2 mt-2">
                            <input
                              type="checkbox"
                              id="autoUpdateFromCards"
                              checked={autoUpdateFromCards}
                              onChange={(e) => setAutoUpdateFromCards(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 mt-0.5 shrink-0"
                            />
                            <label htmlFor="autoUpdateFromCards" className="text-[11px] font-semibold text-gray-500 cursor-pointer select-none leading-relaxed">
                              Auto-calculate progress from task completions (case Done list matching)
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Linked Docs Multi Select */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Link Wiki Docs</label>
                        <div className="max-h-24 overflow-y-auto space-y-1 mt-1 border border-gray-200 dark:border-white/5 rounded-xl p-2 bg-[#fafbfc] dark:bg-black/5">
                          {documents.map(d => {
                            const isLinked = linkedDocs.includes(d.id);
                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => setLinkedDocs(prev => isLinked ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                                className={`w-full px-2 py-1 rounded-lg text-xs text-left border flex items-center justify-between transition-all ${isLinked ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' : 'border-transparent hover:bg-gray-200/50 dark:hover:bg-white/5'
                                  }`}
                              >
                                <span className="truncate mr-2">{d.title}</span>
                                {isLinked && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-4 border-t border-[#dfe1e6] dark:border-[#a6c5e229] flex justify-between items-center bg-gray-50 dark:bg-white/[0.01] gap-2 shrink-0">
                <div className="text-[10px] sm:text-xs text-gray-400 font-semibold truncate pr-2">
                  {wizardTab === 'info' && 'Step 1 of 4: Details'}
                  {wizardTab === 'okr' && 'Step 2 of 4: OKRs Metrics'}
                  {wizardTab === 'milestones' && 'Step 3 of 4: Milestones Timeline'}
                  {wizardTab === 'links' && 'Step 4 of 4: Linkages'}
                </div>
                <div className="flex gap-2 shrink-0">
                  {wizardTab !== 'info' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (wizardTab === 'okr') setWizardTab('info');
                        else if (wizardTab === 'milestones') setWizardTab('okr');
                        else if (wizardTab === 'links') setWizardTab('milestones');
                      }}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      Back
                    </button>
                  )}
                  {wizardTab !== 'links' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (wizardTab === 'info') setWizardTab('okr');
                        else if (wizardTab === 'okr') setWizardTab('milestones');
                        else if (wizardTab === 'milestones') setWizardTab('links');
                      }}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      Next
                    </button>
                  ) : (
                    <button type="submit" className="btn-primary py-1.5 px-3 text-xs">
                      {editingGoal ? 'Save Changes' : 'Deploy Objective'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
