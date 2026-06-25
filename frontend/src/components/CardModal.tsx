import React, { useState, useEffect } from 'react';
import { useStore, getAvatarUrl } from '../store/useStore';
import type { Card } from '../store/useStore';
import {
  X, AlignLeft, CheckSquare, Link2, MessageSquare,
  Trash2, Plus, User, Tag, Calendar, Clock
} from 'lucide-react';

interface CardModalProps { card: Card; onClose: () => void; }

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'badge-urgent',
  HIGH:   'badge-high',
  MEDIUM: 'badge-medium',
  LOW:    'badge-low',
};

export default function CardModal({ card, onClose }: CardModalProps) {
  const {
    currentBoard, currentWorkspace, updateCard, assignUserToCard,
    unassignUserFromCard, createChecklistItem, updateChecklistItem,
    deleteChecklistItem, createComment, createDependency, deleteDependency,
    addToast
  } = useStore();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.split('T')[0] : '');
  const [coverImage, setCoverImage] = useState(card.coverImage || '');
  const [estTime, setEstTime] = useState(card.estimatedTime || 0);
  const [newChecklistVal, setNewChecklistVal] = useState('');
  
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // seconds
  const [manualLogVal, setManualLogVal] = useState('');

  // Custom visual label & emoji states
  const [labels, setLabels] = useState<{ name: string; color: string }[]>([]);
  const [cardEmoji, setCardEmoji] = useState('');
  
  // Create label local form states
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#ef4444');

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const handleLogTimer = async () => {
    if (!currentBoard) return;
    setIsTimerActive(false);
    const minToLog = Math.max(1, Math.round(timeElapsed / 60));
    const newLogged = (card.loggedTime || 0) + minToLog;
    await updateCard(currentBoard.id, card.id, { loggedTime: newLogged });
    setTimeElapsed(0);
  };

  const handleManualLog = async () => {
    const mins = parseInt(manualLogVal);
    if (isNaN(mins) || mins <= 0 || !currentBoard) return;
    const newLogged = (card.loggedTime || 0) + mins;
    await updateCard(currentBoard.id, card.id, { loggedTime: newLogged });
    setManualLogVal('');
  };

  const [newCommentVal, setNewCommentVal] = useState('');
  const [newDepVal, setNewDepVal] = useState('');

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setPriority(card.priority);
    setDueDate(card.dueDate ? card.dueDate.split('T')[0] : '');
    setCoverImage(card.coverImage || '');
    setEstTime(card.estimatedTime || 0);

    // Parse customFields
    try {
      const customData = card.customFields ? JSON.parse(card.customFields) : {};
      setLabels(customData.labels || []);
      setCardEmoji(customData.emoji || '');
    } catch (e) {
      setLabels([]);
      setCardEmoji('');
    }
  }, [card]);

  const saveCustomFields = async (newLabels: typeof labels, newEmoji: string) => {
    if (!currentBoard) return;
    const jsonStr = JSON.stringify({ labels: newLabels, emoji: newEmoji });
    await updateCard(currentBoard.id, card.id, { customFields: jsonStr });
  };

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    const updated = [...labels, { name: newLabelName.trim(), color: newLabelColor }];
    setLabels(updated);
    setNewLabelName('');
    await saveCustomFields(updated, cardEmoji);
  };

  const handleRemoveLabel = async (indexToRemove: number) => {
    const updated = labels.filter((_, idx) => idx !== indexToRemove);
    setLabels(updated);
    await saveCustomFields(updated, cardEmoji);
  };

  const handleSelectEmoji = async (emoji: string) => {
    const nextEmoji = cardEmoji === emoji ? '' : emoji; // toggle
    setCardEmoji(nextEmoji);
    await saveCustomFields(labels, nextEmoji);
  };

  const save = async (fields?: any) => {
    if (!currentBoard) return;
    await updateCard(currentBoard.id, card.id, fields ?? {
      title, description, priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      coverImage: coverImage || null,
      estimatedTime: Number(estTime),
      customFields: card.customFields,
    });
  };


  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistVal.trim() || !currentBoard) return;
    await createChecklistItem(currentBoard.id, card.id, newChecklistVal);
    setNewChecklistVal('');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentVal.trim() || !currentBoard) return;
    await createComment(currentBoard.id, card.id, newCommentVal);
    setNewCommentVal('');
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepVal || !currentBoard) return;
    try { await createDependency(currentBoard.id, card.id, newDepVal); setNewDepVal(''); }
    catch (err: any) { addToast('Dependency Error', err.message || 'Failed to add dependency', 'error'); }
  };


  const totalChecklist = card.checklists?.length || 0;
  const doneChecklist = card.checklists?.filter(i => i.isCompleted).length || 0;
  const progress = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

  const availablePrereqs = currentBoard?.lists
    .flatMap(l => l.cards)
    .filter(c => c.id !== card.id && !card.dependencies?.some(d => d.dependsOnCardId === c.id)) || [];

  const columnName = currentBoard?.lists.find(l => l.id === card.listId)?.name;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-[48rem] bg-[#f1f2f4] dark:bg-[#282e33] rounded-[0.75rem] shadow-2xl animate-scale-in flex flex-col responsive-modal md:rounded-[0.75rem] md:max-h-[90vh] md:overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cover image or Gradient Header */}
        {coverImage && (
          <div className="relative h-28 w-full overflow-hidden border-b border-[#dfe1e6] dark:border-[#a6c5e229] shrink-0">
            {coverImage.startsWith('linear-gradient') || coverImage.startsWith('radial-gradient') || coverImage.startsWith('#') ? (
              <div className="w-full h-full" style={{ background: coverImage }} />
            ) : (
              <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
            )}
            <button
              onClick={async () => { setCoverImage(''); if (currentBoard) await updateCard(currentBoard.id, card.id, { coverImage: null }); }}
              className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-[4px] transition-colors animate-fade-in"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          {/* ── Main Body ─────────────────────────────── */}
          <div className="flex-1 min-w-0 p-4 md:p-6 space-y-6 overflow-y-auto md:max-h-[82vh]">
            {/* Title */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className={`${PRIORITY_COLORS[priority] || 'badge-low'} shrink-0`}>
                  {priority}
                </div>
                {cardEmoji && (
                  <span className="text-xl leading-none" role="img" aria-label="card-emoji">
                    {cardEmoji}
                  </span>
                )}
                
                {/* Labels list */}
                {labels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] px-2 py-0.5 rounded font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                    style={{ backgroundColor: lbl.color }}
                  >
                    {lbl.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(idx)}
                      className="hover:text-red-200 focus:outline-none font-bold text-xs"
                      title="Remove label"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => save({ title })}
                className="w-full bg-transparent text-xl font-bold text-[#172b4d] dark:text-[#b6c2cf] resize-none focus:outline-none border-0 p-0 leading-snug"
                rows={2}
              />
              <p className="text-xs text-[#8590a2]">
                in <span className="font-medium text-[#44546f] dark:text-[#9fadbc]">{columnName}</span>
              </p>
            </div>

            {/* Description */}
            <div>
              <div className="section-heading">
                <AlignLeft className="w-4 h-4" /> Description
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={() => save({ description })}
                placeholder="Add a more detailed description…"
                rows={4}
                className="w-full bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[6px] px-3 py-2.5 text-sm text-[#172b4d] dark:text-[#b6c2cf] placeholder-[#8590a2] focus:outline-none focus:border-blue-400 resize-none transition-colors"
              />
            </div>

            {/* Checklist */}
            {totalChecklist > 0 && (
              <div>
                <div className="section-heading">
                  <CheckSquare className="w-4 h-4" />
                  Checklist
                  <span className="ml-auto font-semibold text-[#44546f] dark:text-[#9fadbc] normal-case tracking-normal">{doneChecklist}/{totalChecklist}</span>
                </div>
                <div className="mb-3 h-1.5 bg-[#dfe1e6] dark:bg-[#454f59] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {card.checklists?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 group py-1">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => currentBoard && updateChecklistItem(currentBoard.id, item.id, { isCompleted: !item.isCompleted })}
                        className="w-4 h-4 rounded border-[#dfe1e6] dark:border-[#738496] text-blue-500 cursor-pointer"
                      />
                      <span className={`flex-1 text-sm ${item.isCompleted ? 'line-through text-[#8590a2]' : 'text-[#172b4d] dark:text-[#b6c2cf]'}`}>
                        {item.content}
                      </span>
                      <button
                        onClick={() => currentBoard && deleteChecklistItem(currentBoard.id, item.id)}
                        className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleAddChecklist} className="flex gap-2">
              <input
                type="text" value={newChecklistVal} onChange={e => setNewChecklistVal(e.target.value)}
                placeholder="Add an item…"
                className="tf-input flex-1 text-sm"
              />
              <button type="submit" className="btn-secondary"><Plus className="w-4 h-4" /></button>
            </form>

            {/* Dependencies */}
            {(card.dependencies?.length > 0 || availablePrereqs.length > 0) && (
              <div>
                <div className="section-heading"><Link2 className="w-4 h-4" /> Dependencies</div>
                {card.dependencies?.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 px-3 bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[6px] mb-2 text-sm">
                    <span className="text-[#44546f] dark:text-[#9fadbc]">
                      Blocked by: <span className="font-medium text-[#172b4d] dark:text-[#b6c2cf]">{d.dependsOnCard?.title}</span>
                    </span>
                    <button onClick={() => currentBoard && deleteDependency(currentBoard.id, card.id, d.id)} className="btn-icon text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {availablePrereqs.length > 0 && (
                  <form onSubmit={handleAddDependency} className="flex gap-2">
                    <select value={newDepVal} onChange={e => setNewDepVal(e.target.value)} className="tf-input flex-1 text-sm" required>
                      <option value="">Select prerequisite card…</option>
                      {availablePrereqs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <button type="submit" className="btn-secondary whitespace-nowrap">Add</button>
                  </form>
                )}
              </div>
            )}

            {/* Comments */}
            <div>
              <div className="section-heading"><MessageSquare className="w-4 h-4" /> Activity</div>
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {card.comments?.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img
                      src={getAvatarUrl(c.user.avatarUrl, c.user.name || c.user.username)}
                      alt="avatar" className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf]">{c.user.name || c.user.username}</span>
                        <span className="text-xs text-[#8590a2]">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-[6px] px-3 py-2 text-sm text-[#172b4d] dark:text-[#b6c2cf]">
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text" value={newCommentVal} onChange={e => setNewCommentVal(e.target.value)}
                  placeholder="Write a comment…"
                  className="tf-input flex-1 text-sm"
                />
                <button type="submit" className="btn-secondary">Save</button>
              </form>
            </div>
          </div>

          {/* ── Sidebar Panel ─────────────────────────── */}
          <div className="w-full md:w-[12rem] shrink-0 bg-[#f1f2f4] dark:bg-[#282e33] border-t md:border-t-0 md:border-l border-[#dfe1e6] dark:border-[#a6c5e229] p-4 md:p-3 overflow-y-auto max-h-none md:max-h-[80vh]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider">Details</span>
              <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>

            {/* Priority */}
            <div className="mb-3">
              <label className="tf-label flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Priority</label>
              <select
                value={priority}
                onChange={e => { setPriority(e.target.value as any); save({ priority: e.target.value }); }}
                className="w-full text-xs border border-[#dfe1e6] dark:border-[#738496] rounded-[4px] px-2 py-1.5 bg-white dark:bg-[#22272b] text-[#172b4d] dark:text-[#b6c2cf] focus:outline-none focus:border-blue-400"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Due date */}
            <div className="mb-3">
              <label className="tf-label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Due date</label>
              <input
                type="date" value={dueDate}
                onChange={e => { setDueDate(e.target.value); save({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null }); }}
                className="w-full text-xs border border-[#dfe1e6] dark:border-[#738496] rounded-[4px] px-2 py-1.5 bg-white dark:bg-[#22272b] text-[#172b4d] dark:text-[#b6c2cf] focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Estimated time */}
            <div className="mb-3">
              <label className="tf-label flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Est. (min)</label>
              <input
                type="number" value={estTime} min={0}
                onChange={e => setEstTime(Number(e.target.value))}
                onBlur={() => save({ estimatedTime: Number(estTime) })}
                className="w-full text-xs border border-[#dfe1e6] dark:border-[#738496] rounded-[4px] px-2 py-1 bg-white dark:bg-[#22272b] text-[#172b4d] dark:text-[#b6c2cf] focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Logged time & Stopwatch */}
            <div className="mb-3 border-t border-[#dfe1e6] dark:border-[#a6c5e229] pt-2">
              <label className="tf-label flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Logged</label>
              <p className="text-xs text-[#172b4d] dark:text-[#b6c2cf] font-semibold mb-2">{card.loggedTime || 0} min</p>
              
              {/* Live Stopwatch */}
              <div className="bg-black/5 dark:bg-white/5 p-2 rounded-[4px] mb-2 text-center">
                <span className="font-mono text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf] block mb-1">
                  {Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:{(timeElapsed % 60).toString().padStart(2, '0')}
                </span>
                <div className="flex gap-1.5 justify-center">
                  {!isTimerActive ? (
                    <button
                      onClick={() => setIsTimerActive(true)}
                      className="text-[0.625rem] px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={handleLogTimer}
                      className="text-[0.625rem] px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors animate-pulse"
                    >
                      Stop & Log
                    </button>
                  )}
                  {timeElapsed > 0 && !isTimerActive && (
                    <button
                      onClick={() => setTimeElapsed(0)}
                      className="text-[0.625rem] px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Time Logger */}
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Min"
                  value={manualLogVal}
                  min={1}
                  onChange={e => setManualLogVal(e.target.value)}
                  className="w-12 text-xs border border-[#dfe1e6] dark:border-[#738496] rounded-[4px] px-1 py-1 bg-white dark:bg-[#22272b] text-[#172b4d] dark:text-[#b6c2cf] focus:outline-none"
                />
                <button
                  onClick={handleManualLog}
                  className="flex-1 text-[0.625rem] bg-slate-600 hover:bg-slate-700 text-white font-semibold py-1 rounded transition-colors"
                >
                  Log Min
                </button>
              </div>
            </div>


            {/* Cover image & Gradients Presets */}
            <div className="mb-4">
              <label className="tf-label">Card Cover & Gradients</label>
              
              {/* Preset cover picker */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[
                  { name: 'Red', val: '#f43f5e' },
                  { name: 'Indigo', val: '#6366f1' },
                  { name: 'Green', val: '#10b981' },
                  { name: 'Amber', val: '#f59e0b' },
                  { name: 'Sunset', val: 'linear-gradient(135deg, #f59e0b, #e11d48)' },
                  { name: 'Ocean', val: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
                  { name: 'Aurora', val: 'linear-gradient(135deg, #0284c7, #10b981)' },
                  { name: 'Neon', val: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={async () => {
                      setCoverImage(preset.val);
                      if (currentBoard) await updateCard(currentBoard.id, card.id, { coverImage: preset.val });
                    }}
                    className="h-6 rounded border border-black/10 dark:border-white/10 hover:scale-105 transition-transform"
                    style={{ background: preset.val }}
                    title={preset.name}
                  />
                ))}
              </div>

              <input
                type="text" value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                onBlur={() => save({ coverImage: coverImage || null })}
                placeholder="Or paste image URL…"
                className="w-full text-[10px] border border-[#dfe1e6] dark:border-[#738496] rounded-[4px] px-2 py-1 bg-white dark:bg-[#22272b] text-[#172b4d] dark:text-[#b6c2cf] focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Title Emoji Picker */}
            <div className="mb-4">
              <label className="tf-label">Title Emoji Icon</label>
              <div className="grid grid-cols-6 gap-1">
                {['📝', '🚀', '🐛', '✨', '🎨', '📞', '📊', '🛠️', '🔒', '💡', '✅', '🎉'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className={`text-sm p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
                      cardEmoji === emoji ? 'bg-indigo-600/20 ring-1 ring-indigo-500' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Label Manager */}
            <div className="mb-4 border-t border-[#dfe1e6] dark:border-[#a6c5e229] pt-3">
              <label className="tf-label">Add Task Labels</label>
              
              <div className="flex gap-1.5 mb-2">
                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewLabelColor(c)}
                    className={`w-5 h-5 rounded-full border ${
                      newLabelColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 border-transparent' : 'border-white/10'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <form onSubmit={handleAddLabel} className="flex gap-1">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name..."
                  className="tf-input text-[10px] px-2 py-1 flex-1"
                  required
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Members */}
            <div className="mb-3">
              <label className="tf-label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Members</label>
              <div className="space-y-1">
                {currentWorkspace?.members.map(m => {
                  const assigned = card.assignees?.some(a => a.userId === m.user.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => assigned
                        ? (currentBoard && unassignUserFromCard(currentBoard.id, card.id, m.user.id))
                        : (currentBoard && assignUserToCard(currentBoard.id, card.id, m.user.id))}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-xs transition-colors ${
                        assigned
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'hover:bg-[#091e420f] dark:hover:bg-white/10 text-[#44546f] dark:text-[#9fadbc]'
                      }`}
                    >
                      <img
                        src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                        alt="avatar" className="w-5 h-5 rounded-full shrink-0"
                      />
                      <span className="truncate font-medium">{m.user.name || m.user.username}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


