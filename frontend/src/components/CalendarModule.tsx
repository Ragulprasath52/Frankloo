import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Card, Milestone } from '../store/useStore';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, Clock, Flag, CheckSquare, AlertTriangle, 
  Trash2, X, Check, Eye
} from 'lucide-react';

interface CalendarModuleProps {
  board: any; // Current Board object containing lists and milestones
  onOpenCardDetails: (card: Card) => void;
  onOpenSyncModal?: () => void;
}

export default function CalendarModule({ board, onOpenCardDetails, onOpenSyncModal }: CalendarModuleProps) {
  const { 
    createCard, updateCard, createMilestone, 
    updateMilestone, deleteMilestone, addToast 
  } = useStore();

  // Calendar State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  
  // Dragging states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Quick Add State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'TASK' | 'MILESTONE'>('TASK');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDesc, setQuickAddDesc] = useState('');

  // Extract all cards from board
  const allCards = useMemo(() => {
    return board.lists?.flatMap((l: any) => l.cards.map((c: any) => ({ ...c, listName: l.name }))) || [];
  }, [board.lists]);

  // Done list ID for completion checks
  const doneListId = useMemo(() => {
    return board.lists?.find((l: any) => l.name.toLowerCase() === 'done')?.id;
  }, [board.lists]);

  // Helper: check if two dates are same calendar day
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  // Navigations
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 30);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 30);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Calendar Grids Calculations
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells: Date[] = [];
    
    // Pad previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push(new Date(year, month - 1, prevMonthDays - i));
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push(new Date(year, month, i));
    }
    
    // Pad next month days to align 42 cells (6 rows)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push(new Date(year, month + 1, i));
    }
    
    return cells;
  }, [currentDate]);

  const weekGrid = useMemo(() => {
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
    
    const cells: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      cells.push(day);
    }
    return cells;
  }, [currentDate]);

  // Scheduled counters
  const overdueCount = useMemo(() => {
    const now = new Date();
    return allCards.filter((c: any) => c.dueDate && new Date(c.dueDate) < now && c.listId !== doneListId).length;
  }, [allCards, doneListId]);

  const milestonesCount = useMemo(() => {
    const total = board.milestones?.length || 0;
    const completed = board.milestones?.filter((m: Milestone) => m.isCompleted).length || 0;
    return { total, completed };
  }, [board.milestones]);

  // Unscheduled cards (Backlog to drag from)
  const unscheduledCards = useMemo(() => {
    return allCards.filter((c: any) => !c.dueDate);
  }, [allCards]);

  // Header Title
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = weekGrid[0];
      const end = weekGrid[6];
      return `${start.toLocaleString('default', { month: 'short', day: 'numeric' })} – ${end.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return `Agenda Feed (30 Days)`;
    }
  }, [currentDate, viewMode, weekGrid]);

  // Drag and Drop implementation
  const handleDragStart = (cardId: string) => {
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(dateStr);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    const cardId = draggedCardId || e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    try {
      // Retain time if card had a due date, otherwise set default noon time
      const targetDateWithTime = new Date(targetDate);
      targetDateWithTime.setHours(12, 0, 0, 0);

      await updateCard(board.id, cardId, { dueDate: targetDateWithTime.toISOString() });
      addToast('Task Scheduled', `Moved task to ${targetDate.toLocaleDateString()}`, 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to reschedule task', 'error');
    } finally {
      setDraggedCardId(null);
    }
  };

  // Quick Scheduler Submission
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    try {
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(12, 0, 0, 0);

      if (quickAddType === 'TASK') {
        if (!board.lists || board.lists.length === 0) {
          throw new Error('Board has no lists. Create a column first.');
        }
        const firstList = board.lists[0];
        const position = (firstList.cards.length + 1) * 1000;
        
        const newCard = await createCard(board.id, firstList.id, quickAddTitle, position);
        await updateCard(board.id, newCard.id, { 
          dueDate: scheduledDate.toISOString(),
          description: quickAddDesc
        });
        addToast('Task Created', `Created task for ${selectedDate.toLocaleDateString()}`, 'success');
      } else {
        await createMilestone(board.id, {
          title: quickAddTitle,
          description: quickAddDesc || null,
          dueDate: scheduledDate.toISOString(),
          isCompleted: false
        });
        addToast('Milestone Created', `Created milestone for ${selectedDate.toLocaleDateString()}`, 'success');
      }

      setQuickAddTitle('');
      setQuickAddDesc('');
      setQuickAddOpen(false);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to create item', 'error');
    }
  };

  // Toggle milestone completion
  const handleToggleMilestone = async (m: Milestone) => {
    try {
      await updateMilestone(board.id, m.id, { isCompleted: !m.isCompleted });
      addToast('Milestone Updated', `Marked milestone as ${!m.isCompleted ? 'completed' : 'incomplete'}`, 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update milestone', 'error');
    }
  };

  // Delete milestone
  const handleDeleteMilestone = async (mId: string) => {
    try {
      await deleteMilestone(board.id, mId);
      addToast('Milestone Deleted', 'Milestone removed from board', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete milestone', 'error');
    }
  };

  // Workload Intensity Class
  const getWorkloadClass = (taskCount: number) => {
    if (taskCount === 0) return 'bg-transparent';
    if (taskCount <= 1) return 'bg-indigo-500/5 text-indigo-400 border border-indigo-500/10';
    if (taskCount <= 3) return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    return 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50';
  };

  // Selected Day Items
  const selectedDayItems = useMemo(() => {
    const tasks = allCards.filter((c: any) => c.dueDate && isSameDay(new Date(c.dueDate), selectedDate));
    const milestones = (board.milestones || []).filter((m: Milestone) => m.dueDate && isSameDay(new Date(m.dueDate), selectedDate));
    return { tasks, milestones };
  }, [allCards, board.milestones, selectedDate]);  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-140px)] gap-6 select-none animate-fade-in text-slate-800 dark:text-[#e6edf3] pb-6 lg:pb-0">
      
      {/* ── Main Workspace Calendar Panel ───────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#161a22] border border-[#dfe1e6] dark:border-[#30363d] rounded-2xl overflow-hidden shadow-2xl">
        
        {/* TOP TOOLBAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 bg-slate-50/50 dark:bg-[#0d1117] border-b border-[#dfe1e6] dark:border-[#30363d]">
          {/* Title & Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-[#21262d] rounded-xl p-0.5 border border-[#dfe1e6] dark:border-[#30363d]">
              <button onClick={handlePrev} className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#30363d] rounded-lg transition-colors text-slate-600 dark:text-inherit" title="Previous">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleToday} className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-[#30363d] rounded-lg text-xs font-semibold transition-colors text-slate-600 dark:text-inherit">
                Today
              </button>
              <button onClick={handleNext} className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#30363d] rounded-lg transition-colors text-slate-600 dark:text-inherit" title="Next">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-[#f0f6fc]">{headerTitle}</h3>
          </div>
 
          {/* Quick Stats & View Mode Selectors */}
          <div className="flex items-center flex-wrap gap-4">
            
            {/* counters */}
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-[#8d96a0]">
              {overdueCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{overdueCount} Overdue</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                <Flag className="w-3.5 h-3.5" />
                <span>{milestonesCount.completed}/{milestonesCount.total} Milestones</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-[#21262d] border border-[#dfe1e6] dark:border-[#30363d] rounded-lg text-slate-600 dark:text-inherit">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>{allCards.filter((c: any) => c.listId === doneListId).length} Done</span>
              </div>
            </div>
 
            {/* View Mode Tabs */}
            <div className="flex bg-slate-100 dark:bg-[#21262d] rounded-xl p-0.5 border border-[#dfe1e6] dark:border-[#30363d]">
              {(['month', 'week', 'agenda'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                    viewMode === mode 
                      ? 'bg-indigo-655 text-white shadow-md' 
                      : 'hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-500 hover:text-slate-800 dark:text-[#8d96a0] dark:hover:text-[#f0f6fc]'
                  }`}
                  style={viewMode === mode ? { backgroundColor: 'var(--accent)' } : undefined}
                >
                  {mode}
                </button>
              ))}
            </div>
 
            {/* Add Action */}
            <div className="flex items-center gap-2">
              {onOpenSyncModal && (
                <button
                  type="button"
                  onClick={onOpenSyncModal}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] border border-[#dfe1e6] dark:border-[#30363d] text-slate-600 dark:text-[#e6edf3] text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <CalendarIcon className="w-3.5 h-3.5" /> Sync
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setQuickAddType('TASK');
                  setQuickAddOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 active:scale-95 transition-all"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Create
              </button>
            </div>
 
          </div>
        </div>
        {/* CALENDAR RENDERING */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/30 dark:bg-[#0d1117]/40 p-4">
          
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="h-full flex flex-col space-y-2">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-[11px] font-bold text-[#8d96a0] uppercase tracking-wider">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <span key={d}>
                    <span className="hidden sm:inline">{d}</span>
                    <span className="inline sm:hidden">{d[0]}</span>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 min-h-[320px] sm:min-h-[400px]">
                {monthGrid.map((date, idx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayTasks = allCards.filter((c: any) => c.dueDate && isSameDay(new Date(c.dueDate), date));
                  const dayMilestones = (board.milestones || []).filter((m: Milestone) => m.dueDate && isSameDay(new Date(m.dueDate), date));
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(date, new Date());
                  const isSelected = isSameDay(date, selectedDate);
                  const isHoveredOver = dragOverDate === dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={(e) => handleDrop(e, date)}
                      className={`group relative flex flex-col justify-between border rounded-xl p-1.5 sm:p-2 min-h-[55px] sm:min-h-[70px] cursor-pointer transition-all duration-150 ${
                        isCurrentMonth ? 'bg-slate-50/50 dark:bg-[#161a22]/70' : 'bg-slate-100/10 dark:bg-[#161a22]/20 opacity-40'
                      } ${
                        isToday ? 'border-indigo-500 bg-indigo-500/5' : 'border-[#dfe1e6] dark:border-[#30363d] hover:border-indigo-500/50'
                      } ${
                        isSelected ? 'ring-2 ring-indigo-600 border-transparent bg-indigo-500/10' : ''
                      } ${
                        isHoveredOver ? 'bg-indigo-600/20 border-indigo-400 scale-[1.01]' : ''
                      }`}
                    >
                      {/* Cell Header */}
                      <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                        <span className={`text-[10px] sm:text-[11px] font-bold ${isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-[#8d96a0]'}`}>
                          {date.getDate()}
                        </span>
                        
                        {/* Workload Indicator Heatmap */}
                        {dayTasks.length > 0 && (
                          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dayTasks.length >= 4 ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-500/50'}`} title={`${dayTasks.length} tasks`} />
                        )}
                      </div>

                      {/* Cell Content */}
                      <div className="flex-1 overflow-y-auto space-y-1 max-h-[72px] scrollbar-none sm:scrollbar-thin pr-0.5">
                        {/* On mobile devices: Show simple indicator dots to avoid overlapping/squeezing layout */}
                        <div className="flex sm:hidden justify-center gap-0.5 flex-wrap mt-0.5">
                          {dayMilestones.map((m: Milestone) => (
                            <span key={m.id} className={`w-1 h-1 rounded-full ${m.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          ))}
                          {dayTasks.map((t: any) => (
                            <span key={t.id} className={`w-1 h-1 rounded-full ${t.listId === doneListId ? 'bg-gray-500' : 'bg-indigo-400'}`} />
                          ))}
                        </div>

                        {/* On larger viewports: Show detailed task text */}
                        <div className="hidden sm:block space-y-1">
                          {/* Milestones */}
                          {dayMilestones.map((m: Milestone) => (
                            <div
                              key={m.id}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold leading-tight ${
                                m.isCompleted 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 line-through' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              <Flag className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{m.title}</span>
                            </div>
                          ))}

                          {/* Tasks */}
                          {dayTasks.map((t: any) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={() => handleDragStart(t.id)}
                              onClick={(e) => { e.stopPropagation(); onOpenCardDetails(t); }}
                              className={`px-1.5 py-0.5 rounded-md border text-[9px] font-medium leading-tight truncate hover:scale-[1.02] active:scale-95 transition-all cursor-grab ${
                                t.listId === doneListId 
                                  ? 'bg-slate-100/80 dark:bg-[#21262d]/50 text-slate-400 dark:text-gray-500 border-slate-200 dark:border-[#30363d] line-through' 
                                  : t.priority === 'URGENT' || t.priority === 'HIGH'
                                  ? 'bg-rose-500/10 text-rose-650 dark:text-rose-400 border-rose-500/25'
                                  : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-300 border-indigo-500/25'
                              }`}
                            >
                              {t.title}
                            </div>
                          ))}

                          {/* Placeholders / Quick Add */}
                          {dayTasks.length === 0 && dayMilestones.length === 0 && (
                            <div className="h-full flex items-center justify-center py-2">
                              <span className="text-[9px] font-semibold text-slate-400/40 dark:text-[#8d96a0]/30 group-hover:text-indigo-550 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-wider">
                                + Add Task
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="h-full flex flex-col space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 flex-1 min-h-[450px]">
                {weekGrid.map((date, idx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayTasks = allCards.filter((c: any) => c.dueDate && isSameDay(new Date(c.dueDate), date));
                  const dayMilestones = (board.milestones || []).filter((m: Milestone) => m.dueDate && isSameDay(new Date(m.dueDate), date));
                  const isToday = isSameDay(date, new Date());
                  const isSelected = isSameDay(date, selectedDate);
                  const isHoveredOver = dragOverDate === dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={(e) => handleDrop(e, date)}
                      className={`flex flex-col border rounded-2xl p-3 bg-slate-50/50 dark:bg-[#161a22]/70 transition-all ${
                        isToday ? 'border-indigo-500 bg-indigo-500/5' : 'border-[#dfe1e6] dark:border-[#30363d]'
                      } ${
                        isSelected ? 'ring-2 ring-indigo-600 border-transparent bg-indigo-500/10' : ''
                      } ${
                        isHoveredOver ? 'bg-indigo-600/25 border-indigo-400 scale-[1.01]' : ''
                      }`}
                    >
                      {/* Week Header */}
                      <div className="text-center pb-2 border-b border-[#dfe1e6] dark:border-[#30363d] mb-3 flex sm:block items-center justify-between">
                        <span className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8d96a0]">
                          {date.toLocaleDateString('default', { weekday: 'short' })}
                        </span>
                        <span className={`text-base font-bold leading-none ${isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-900 dark:text-[#f0f6fc]'}`}>
                          {date.getDate()}
                        </span>
                      </div>

                      {/* Workload Indicator Heatmap */}
                      <div className={`text-center py-1 mb-3 rounded-lg text-[10px] font-bold ${getWorkloadClass(dayTasks.length)}`}>
                        {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                      </div>

                      {/* Scheduled items */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {/* Milestones */}
                        {dayMilestones.map((m: Milestone) => (
                          <div
                            key={m.id}
                            className={`flex flex-col gap-1 p-2 rounded-xl border ${
                              m.isCompleted
                                ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 line-through'
                                : 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-[9px] font-bold">
                              <Flag className="w-3 h-3 text-amber-400" /> MILESTONE
                            </div>
                            <span className="text-[11px] font-semibold leading-tight">{m.title}</span>
                          </div>
                        ))}

                        {/* Tasks */}
                        {dayTasks.map((t: any) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={() => handleDragStart(t.id)}
                            onClick={(e) => { e.stopPropagation(); onOpenCardDetails(t); }}
                            className={`flex flex-col p-2.5 rounded-xl border text-left cursor-grab hover:scale-102 transition-transform active:scale-95 ${
                              t.listId === doneListId
                                ? 'bg-slate-100 dark:bg-[#21262d]/40 text-slate-400 dark:text-gray-500 border-[#dfe1e6] dark:border-[#30363d] line-through'
                                : t.priority === 'URGENT' || t.priority === 'HIGH'
                                ? 'bg-rose-50/50 dark:bg-rose-500/5 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-500/20'
                                : 'bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-700 dark:text-indigo-200 border-indigo-100 dark:border-indigo-500/20'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 dark:text-[#8d96a0] mb-1">
                              <span className="truncate max-w-[80px]">{t.listName}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold ${
                                t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                              }`}>{t.priority}</span>
                            </div>
                            <span className="text-[11px] font-bold leading-tight">{t.title}</span>
                          </div>
                        ))}

                        {/* Empty cell helper */}
                        {dayTasks.length === 0 && dayMilestones.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center py-4 sm:py-8 text-center text-slate-400 dark:text-[#8d96a0]/30 border border-dashed border-[#dfe1e6] dark:border-[#30363d] rounded-2xl">
                            <span className="text-[10px] font-bold uppercase tracking-wider">No Tasks</span>
                            <button
                              onClick={() => {
                                setSelectedDate(date);
                                setQuickAddType('TASK');
                                setQuickAddOpen(true);
                              }}
                              className="mt-2 text-[10px] font-semibold text-indigo-650 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AGENDA FEED VIEW */}
          {viewMode === 'agenda' && (
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              {Array.from({ length: 30 }).map((_, idx) => {
                const date = new Date(currentDate);
                date.setDate(currentDate.getDate() + idx);
                
                const dayTasks = allCards.filter((c: any) => c.dueDate && isSameDay(new Date(c.dueDate), date));
                const dayMilestones = (board.milestones || []).filter((m: Milestone) => m.dueDate && isSameDay(new Date(m.dueDate), date));

                if (dayTasks.length === 0 && dayMilestones.length === 0) return null;

                return (
                  <div key={idx} className="flex gap-4 p-4 bg-slate-50/50 dark:bg-[#161a22]/70 border border-[#dfe1e6] dark:border-[#30363d] rounded-2xl hover:border-indigo-500/40 transition-colors">
                    {/* Date stamp */}
                    <div className="w-16 text-center border-r border-[#dfe1e6] dark:border-[#30363d] pr-4 shrink-0">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8d96a0]">{date.toLocaleDateString('default', { weekday: 'short' })}</span>
                      <span className="block text-xl font-black text-indigo-650 dark:text-indigo-400 leading-none">{date.getDate()}</span>
                      <span className="block text-[9px] text-slate-455 dark:text-[#8d96a0] mt-0.5">{date.toLocaleDateString('default', { month: 'short' })}</span>
                    </div>

                    {/* Events list */}
                    <div className="flex-1 space-y-2">
                      {/* Milestones */}
                      {dayMilestones.map((m: Milestone) => (
                        <div key={m.id} className="flex justify-between items-center bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <Flag className="w-4 h-4 text-amber-500" />
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-[#f0f6fc]">{m.title}</span>
                              <span className="block text-[9px] text-amber-600 dark:text-amber-550 font-semibold tracking-wider uppercase">Workspace Milestone</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-[#8d96a0]">Due: {new Date(m.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}

                      {/* Tasks */}
                      {dayTasks.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center bg-slate-100/50 dark:bg-[#21262d]/40 border border-[#dfe1e6] dark:border-[#30363d] p-2.5 rounded-xl hover:border-indigo-500/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckSquare className={`w-4 h-4 shrink-0 ${t.listId === doneListId ? 'text-emerald-500' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                              <span 
                                onClick={() => onOpenCardDetails(t)} 
                                className={`text-xs font-bold hover:underline cursor-pointer truncate block ${t.listId === doneListId ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-slate-100'}`}
                              >
                                {t.title}
                              </span>
                              <span className="text-[9px] text-slate-500 dark:text-[#8d96a0] font-semibold">{t.listName} • {t.priority}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-500 dark:text-[#8d96a0]">Due: {new Date(t.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <button onClick={() => onOpenCardDetails(t)} className="btn-icon p-1 hover:bg-slate-200 dark:hover:bg-[#30363d]">
                              <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* ── Right-Side Interactive Sidebar (Agenda & Backlog) ─ */}
      <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        
        {/* AGENDA FOR SELECTED DAY */}
        <div className="flex-1 bg-white dark:bg-[#161a22] border border-[#dfe1e6] dark:border-[#30363d] rounded-2xl p-4 flex flex-col min-h-0 shadow-2xl">
          <div className="pb-3 border-b border-[#dfe1e6] dark:border-[#30363d] mb-4 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-xs text-slate-500 dark:text-[#8d96a0] uppercase tracking-wider">Day Agenda</h4>
              <p className="text-sm font-bold text-slate-800 dark:text-[#f0f6fc] mt-0.5">
                {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => {
                setQuickAddType('TASK');
                setQuickAddOpen(true);
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#21262d] border border-[#dfe1e6] dark:border-[#30363d] hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg text-slate-500 dark:text-[#8d96a0] hover:text-slate-800 dark:hover:text-[#f0f6fc] transition-colors"
              title="Add task/milestone to this date"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List items for chosen date */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            
            {/* Milestones header */}
            {selectedDayItems.milestones.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Milestones</span>
                {selectedDayItems.milestones.map((m: Milestone) => (
                  <div key={m.id} className="flex gap-2.5 items-start p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <button 
                      onClick={() => handleToggleMilestone(m)} 
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-all ${
                        m.isCompleted 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-amber-500/50 hover:bg-amber-500/10'
                      }`}
                    >
                      {m.isCompleted && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold leading-tight block ${m.isCompleted ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-slate-100'}`}>{m.title}</span>
                      {m.description && <p className="text-[10px] text-slate-550 dark:text-[#8d96a0] mt-0.5 leading-snug">{m.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteMilestone(m.id)} className="p-1 text-slate-400 dark:text-[#8d96a0] hover:text-red-400 dark:hover:text-red-400 rounded transition-colors self-start">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks header */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">Tasks Scheduled</span>
              {selectedDayItems.tasks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-[#8d96a0]/40 border border-dashed border-[#dfe1e6] dark:border-[#30363d] rounded-2xl">
                  <p className="text-xs font-semibold">No tasks scheduled</p>
                  <p className="text-[10px] mt-0.5">Drag a task onto the calendar or click add.</p>
                </div>
              ) : (
                selectedDayItems.tasks.map((t: any) => (
                  <div 
                    key={t.id}
                    draggable
                    onDragStart={() => handleDragStart(t.id)}
                    className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-[#21262d]/40 border border-[#dfe1e6] dark:border-[#30363d] rounded-xl hover:border-indigo-500/35 transition-colors cursor-grab"
                  >
                    <div className="min-w-0 flex-1">
                      <span 
                        onClick={() => onOpenCardDetails(t)} 
                        className={`text-xs font-bold hover:underline cursor-pointer truncate block ${t.listId === doneListId ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-slate-100'}`}
                      >
                        {t.title}
                      </span>
                      <span className="text-[9px] text-slate-550 dark:text-[#8d96a0] font-semibold uppercase">{t.listName} • {t.priority}</span>
                    </div>
                    <button onClick={() => onOpenCardDetails(t)} className="btn-icon p-1 hover:bg-slate-200 dark:hover:bg-[#30363d] shrink-0 ml-2">
                      <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* UNSCHEDULED TASK BACKLOG */}
        <div className="h-64 bg-white dark:bg-[#161a22] border border-[#dfe1e6] dark:border-[#30363d] rounded-2xl p-4 flex flex-col min-h-0 shadow-2xl">
          <div className="pb-3 border-b border-[#dfe1e6] dark:border-[#30363d] mb-3">
            <h4 className="font-bold text-xs text-slate-500 dark:text-[#8d96a0] uppercase tracking-wider">Unscheduled Backlog</h4>
            <p className="text-[10px] text-slate-455 dark:text-[#8d96a0] mt-0.5">Drag cards from here directly onto dates to schedule them.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {unscheduledCards.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-[#8d96a0]/30 border border-dashed border-[#dfe1e6] dark:border-[#30363d] rounded-xl py-6">
                <CheckSquare className="w-6 h-6 mb-1 opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Backlog Clear</span>
              </div>
            ) : (
              unscheduledCards.map((t: any) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    handleDragStart(t.id);
                    e.dataTransfer.setData('text/plain', t.id); // for safety across components
                  }}
                  className="p-2.5 bg-slate-50 dark:bg-[#21262d]/50 border border-[#dfe1e6] dark:border-[#30363d] hover:border-indigo-500/50 rounded-xl cursor-grab transition-all hover:scale-[1.01] active:scale-98"
                >
                  <span className="text-xs font-bold block truncate text-slate-800 dark:text-slate-100">{t.title}</span>
                  <div className="flex items-center justify-between mt-1.5 text-[9px] font-semibold text-slate-500 dark:text-[#8d96a0]">
                    <span>{t.listName}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200/50 dark:bg-[#30363d]">{t.priority}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </aside>

      {/* ── QUICK ADD MODAL DIALOG ─────────────────────── */}
      {quickAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#161a22] border border-[#dfe1e6] dark:border-[#30363d] rounded-2xl p-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center pb-3 border-b border-[#dfe1e6] dark:border-[#30363d] mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-[#f0f6fc] flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                Quick Add to Scheduler
              </h3>
              <button onClick={() => setQuickAddOpen(false)} className="btn-icon p-1 hover:bg-slate-200 dark:hover:bg-[#30363d] rounded-lg">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#8d96a0] uppercase tracking-wider mb-1.5">Entity Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAddType('TASK')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      quickAddType === 'TASK'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                        : 'bg-slate-100 border-[#dfe1e6] dark:bg-[#21262d] dark:border-[#30363d] text-slate-600 dark:text-[#8d96a0] hover:text-slate-900 dark:hover:text-[#f0f6fc]'
                    }`}
                  >
                    Task Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddType('MILESTONE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      quickAddType === 'MILESTONE'
                        ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/10'
                        : 'bg-slate-100 border-[#dfe1e6] dark:bg-[#21262d] dark:border-[#30363d] text-slate-600 dark:text-[#8d96a0] hover:text-slate-900 dark:hover:text-[#f0f6fc]'
                    }`}
                  >
                    Milestone Flag
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#8d96a0] uppercase tracking-wider mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder={quickAddType === 'TASK' ? 'e.g. Implement user login' : 'e.g. Alpha Version release'}
                  value={quickAddTitle}
                  onChange={e => setQuickAddTitle(e.target.value)}
                  className="w-full tf-input px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0d1117] border border-[#dfe1e6] dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3]"
                  autoFocus
                />
              </div>

              {/* Description input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#8d96a0] uppercase tracking-wider mb-1">Description</label>
                <textarea
                  placeholder="Optional details..."
                  value={quickAddDesc}
                  onChange={e => setQuickAddDesc(e.target.value)}
                  rows={3}
                  className="w-full tf-input px-3 py-2 text-xs rounded-xl resize-none bg-white dark:bg-[#0d1117] border border-[#dfe1e6] dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3]"
                />
              </div>

              {/* Selected date confirmation */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-[#dfe1e6] dark:border-[#30363d]">
                <Clock className="w-4 h-4 text-slate-500 dark:text-[#8d96a0]" />
                <span className="text-xs text-slate-550 dark:text-[#8d96a0]">
                  Scheduled for: <strong className="text-slate-800 dark:text-[#f0f6fc]">{selectedDate.toLocaleDateString()}</strong>
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-xs font-bold rounded-xl justify-center">
                  Schedule Item
                </button>
                <button type="button" onClick={() => setQuickAddOpen(false)} className="btn-secondary py-2 px-4 text-xs font-semibold rounded-xl">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
