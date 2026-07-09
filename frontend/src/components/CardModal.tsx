import React, { useState, useEffect, useRef } from 'react';
import { useStore, getAvatarUrl } from '../store/useStore';
import type { Card } from '../store/useStore';
import {
  X, AlignLeft, CheckSquare, Link2, MessageSquare,
  Trash2, Plus, Clock, Archive, Pencil,
  Paperclip, MoreHorizontal, Check
} from 'lucide-react';

interface CardModalProps { card: Card; onClose: () => void; }

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20',
  HIGH:   'bg-amber-500/10 text-amber-650 dark:text-amber-400 border-amber-500/20',
  MEDIUM: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20',
  LOW:    'bg-slate-500/10 text-slate-650 dark:text-slate-400 border-slate-500/20',
};

interface CommentReply {
  id: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: string;
}

interface CommentReactions {
  emoji: string;
  users: string[];
}

export default function CardModal({ card, onClose }: CardModalProps) {
  const {
    currentBoard, currentWorkspace, updateCard, assignUserToCard,
    unassignUserFromCard, createChecklistItem, updateChecklistItem,
    deleteChecklistItem, createComment, createDependency, deleteDependency,
    addToast, user
  } = useStore();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.split('T')[0] : '');
  const [coverImage, setCoverImage] = useState(card.coverImage || '');
  const [imageError, setImageError] = useState(false);
  const [estTime, setEstTime] = useState(card.estimatedTime || 0);
  const [newChecklistVal, setNewChecklistVal] = useState('');
  
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // seconds
  const [manualLogVal, setManualLogVal] = useState('');

  // Dropdown/Popup toggle states
  const [assigneeSelectOpen, setAssigneeSelectOpen] = useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);

  // Custom visual label & emoji states
  const [labels, setLabels] = useState<{ name: string; color: string }[]>([]);
  const [cardEmoji, setCardEmoji] = useState('');
  
  // Create label local form states
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#ef4444');

  // Comment rich content form attachments & replies states
  const [newCommentVal, setNewCommentVal] = useState('');
  const [newDepVal, setNewDepVal] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [commentExtras, setCommentExtras] = useState<Record<string, { reactions: CommentReactions[], replies: CommentReply[], attachments: { name: string, size: string }[] }>>({});

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

  useEffect(() => {
    const extras: typeof commentExtras = {};
    if (card.comments) {
      for (const c of card.comments) {
        try {
          const stored = localStorage.getItem(`comment_extras_${c.id}`);
          if (stored) {
            extras[c.id] = JSON.parse(stored);
          } else {
            extras[c.id] = { reactions: [], replies: [], attachments: [] };
          }
        } catch (e) {}
      }
    }
    setCommentExtras(extras);
  }, [card.comments]);

  const saveCommentExtras = (commentId: string, updated: { reactions: CommentReactions[], replies: CommentReply[], attachments: { name: string, size: string }[] }) => {
    localStorage.setItem(`comment_extras_${commentId}`, JSON.stringify(updated));
    setCommentExtras(prev => ({
      ...prev,
      [commentId]: updated
    }));
  };

  const handleToggleReaction = (commentId: string, emoji: string) => {
    const userName = user?.name || user?.username || 'You';
    const current = commentExtras[commentId] || { reactions: [], replies: [], attachments: [] };
    const reactions = [...current.reactions];
    const existing = reactions.find(r => r.emoji === emoji);
    if (existing) {
      if (existing.users.includes(userName)) {
        existing.users = existing.users.filter(u => u !== userName);
      } else {
        existing.users.push(userName);
      }
    } else {
      reactions.push({ emoji, users: [userName] });
    }
    const filtered = reactions.filter(r => r.users.length > 0);
    saveCommentExtras(commentId, { ...current, reactions: filtered });
  };

  const handleAddReply = (commentId: string, replyText: string) => {
    if (!replyText.trim()) return;
    const current = commentExtras[commentId] || { reactions: [], replies: [], attachments: [] };
    const newReply: CommentReply = {
      id: Math.random().toString(),
      userName: user?.name || user?.username || 'You',
      userAvatar: user?.avatarUrl || null,
      content: replyText,
      createdAt: new Date().toISOString()
    };
    saveCommentExtras(commentId, { ...current, replies: [...current.replies, newReply] });
  };

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

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setPriority(card.priority);
    setDueDate(card.dueDate ? card.dueDate.split('T')[0] : '');
    setCoverImage(card.coverImage || '');
    setImageError(false);
    setEstTime(card.estimatedTime || 0);

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
    const nextEmoji = cardEmoji === emoji ? '' : emoji;
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
    const attachmentObj = commentAttachment ? { name: commentAttachment.name, size: '240 KB' } : null;
    
    await createComment(currentBoard.id, card.id, newCommentVal);
    const savedVal = newCommentVal;
    setNewCommentVal('');
    setCommentAttachment(null);
    
    if (attachmentObj) {
      setTimeout(() => {
        const newComm = card.comments?.find(c => c.content === savedVal && !localStorage.getItem(`comment_extras_${c.id}`));
        if (newComm) {
          localStorage.setItem(`comment_extras_${newComm.id}`, JSON.stringify({ reactions: [], replies: [], attachments: [attachmentObj] }));
        }
      }, 600);
    }
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

  const getProgressBlocks = (percent: number) => {
    const filledCount = Math.round(percent / 10);
    const emptyCount = 10 - filledCount;
    return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
  };

  const formatTime = (mins: number) => {
    if (!mins || mins <= 0) return '0m';
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs > 0 && remainingMins > 0) return `${hrs}h ${remainingMins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${remainingMins}m`;
  };

  const availablePrereqs = currentBoard?.lists
    .flatMap(l => l.cards)
    .filter(c => c.id !== card.id && !card.dependencies?.some(d => d.dependsOnCardId === c.id)) || [];

  const columnName = currentBoard?.lists.find(l => l.id === card.listId)?.name;

  return (
    <div className="modal-overlay flex items-center justify-center p-2 sm:p-4 z-[9999]" onClick={onClose}>
      <div
        className="w-full max-w-[66rem] h-[92vh] md:h-[84vh] bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-scale-in flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner Cover Image */}
        {coverImage && (
          <div className="relative h-24 w-full overflow-hidden border-b border-slate-200 dark:border-slate-800 shrink-0">
            {coverImage.startsWith('linear-gradient') || coverImage.startsWith('radial-gradient') || coverImage.startsWith('#') ? (
              <div className="w-full h-full" style={{ background: coverImage }} />
            ) : imageError ? (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/10 dark:to-purple-950/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-650 uppercase tracking-widest">No Banner Loaded</span>
              </div>
            ) : (
              <img 
                src={coverImage} 
                alt="cover" 
                className="w-full h-full object-cover" 
                onError={() => setImageError(true)}
              />
            )}
          </div>
        )}

        {/* Modal Top Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/40 shrink-0 bg-slate-50/50 dark:bg-[#0e121a]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-550">
            <span>{currentBoard?.name}</span>
            <span>/</span>
            <span className="text-indigo-500 dark:text-indigo-400">{columnName}</span>
          </div>

          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={() => setMoreSettingsOpen(!moreSettingsOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-550 hover:text-slate-800 dark:hover:text-white transition-colors"
              title="More settings"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Dropdown Menu Overlay */}
            {moreSettingsOpen && (
              <div className="absolute right-8 top-0 z-[100] w-64 bg-white dark:bg-[#161a22] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 animate-scale-in space-y-4">
                {/* Cover Color Picker */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Change Cover</h5>
                  <div className="grid grid-cols-4 gap-1.5">
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
                  
                  <div className="flex gap-1.5">
                    <input
                      type="text" value={coverImage}
                      onChange={e => setCoverImage(e.target.value)}
                      onBlur={() => save({ coverImage: coverImage || null })}
                      placeholder="Paste cover URL…"
                      className="flex-1 text-[10px] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                    {coverImage && (
                      <button
                        onClick={async () => { setCoverImage(''); if (currentBoard) await updateCard(currentBoard.id, card.id, { coverImage: null }); }}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Emoji Picker */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                  <h5 className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">Emoji Icon</h5>
                  <div className="grid grid-cols-6 gap-1">
                    {['📝', '🚀', '🐛', '✨', '🎨', '📞', '📊', '🛠️', '🔒', '💡', '✅', '🎉'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectEmoji(emoji)}
                        className={`text-sm p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          cardEmoji === emoji ? 'bg-indigo-650/20 ring-1 ring-indigo-500' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danger Zone Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">Actions</h5>
                  <button
                    onClick={async () => {
                      if (!currentBoard) return;
                      try {
                        await updateCard(currentBoard.id, card.id, { isArchived: true });
                        addToast('Card Archived', `"${card.title}" has been archived.`, 'success');
                        onClose();
                      } catch (err: any) {
                        addToast('Error', err.message || 'Failed to archive card', 'error');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Task</span>
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Columns split */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden relative">
          
          {/* Left panel (70%): main workspace content area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin">
            
            {/* Title / Priority / Emoji / Labels Block */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-widest ${PRIORITY_COLORS[priority]}`}>
                  {priority}
                </span>
                
                {cardEmoji && <span className="text-xl leading-none">{cardEmoji}</span>}
                
                {labels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] px-2 py-0.5 rounded font-extrabold text-white uppercase tracking-wider flex items-center gap-1 shadow-sm"
                    style={{ backgroundColor: lbl.color }}
                  >
                    {lbl.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(idx)}
                      className="hover:text-red-200 focus:outline-none font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative group/title w-full">
                <textarea
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={() => save({ title })}
                  className="w-full bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-900/30 focus:bg-white dark:focus:bg-[#161b22] text-2xl font-black text-slate-850 dark:text-slate-100 resize-none focus:outline-none border border-transparent focus:border-indigo-500 rounded-xl px-2.5 py-1 leading-snug transition-all"
                  rows={2}
                  placeholder="Task title..."
                />
                <div className="absolute right-3 top-3 opacity-0 group-hover/title:opacity-100 pointer-events-none text-slate-400 transition-opacity">
                  <Pencil className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Description Document-style block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-indigo-500" /> Description
                </h3>
                {!isEditingDesc && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={5}
                    className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-100 resize-none leading-relaxed"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setDescription(card.description || '');
                        setIsEditingDesc(false);
                      }}
                      className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        save({ description });
                        setIsEditingDesc(false);
                      }}
                      className="px-3 py-1.5 text-xs bg-indigo-650 text-white rounded-xl hover:bg-indigo-700 font-bold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-xl text-xs leading-relaxed text-slate-700 dark:text-slate-330 font-normal whitespace-pre-wrap doc-content hover:bg-slate-50 dark:hover:bg-slate-850/20 transition-colors cursor-pointer"
                  onClick={() => setIsEditingDesc(true)}
                >
                  {description ? description : <span className="text-slate-450 italic">No description details. Click here to document guidelines…</span>}
                </div>
              )}
            </div>

            {/* Checklist workspace panel */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-500" /> Checklist
                </h3>
                <span className="text-xs font-bold text-slate-450 dark:text-slate-400">{doneChecklist}/{totalChecklist}</span>
              </div>
              
              {totalChecklist > 0 && (
                <div className="flex items-center gap-3 text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/10 px-3 py-2 rounded-xl border border-indigo-500/10">
                  <span>Progress</span>
                  <span className="tracking-widest hidden sm:inline">{getProgressBlocks(progress)}</span>
                  <span className="ml-auto">{progress}%</span>
                </div>
              )}

              <div className="space-y-2">
                {card.checklists?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 group py-1 px-2 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => currentBoard && updateChecklistItem(currentBoard.id, item.id, { isCompleted: !item.isCompleted })}
                      className="w-4 h-4 rounded border-slate-350 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={`text-xs transition-colors ${item.isCompleted ? 'line-through text-slate-400 dark:text-slate-555' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.content}
                    </span>
                    <button
                      onClick={() => currentBoard && deleteChecklistItem(currentBoard.id, item.id)}
                      className="opacity-0 group-hover:opacity-100 ml-auto btn-icon p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistVal}
                  onChange={e => setNewChecklistVal(e.target.value)}
                  placeholder="Add checklist item…"
                  className="tf-input flex-1 text-xs px-3 py-2 rounded-xl"
                  style={{ borderColor: 'var(--border)' }}
                />
                <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Attachments Section */}
            {card.coverImage && !coverImage.startsWith('#') && !coverImage.startsWith('linear-') && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-indigo-500" /> Card Attachments
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-xl relative group">
                    <div className="w-14 h-14 bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden shrink-0">
                      <img src={coverImage} alt="cover thumb" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">card_cover_image.png</span>
                      <span className="text-[10px] text-slate-400 mt-1">Image Attachment</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dependencies */}
            {(card.dependencies?.length > 0 || availablePrereqs.length > 0) && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-500" /> Dependencies
                </h3>
                <div className="space-y-2">
                  {card.dependencies?.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-xl text-xs">
                      <span className="text-slate-650 dark:text-slate-400 font-medium">
                        Blocked by: <span className="text-slate-800 dark:text-slate-200 font-bold ml-1">{d.dependsOnCard?.title}</span>
                      </span>
                      <button onClick={() => currentBoard && deleteDependency(currentBoard.id, card.id, d.id)} className="btn-icon p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {availablePrereqs.length > 0 && (
                  <form onSubmit={handleAddDependency} className="flex gap-2">
                    <select value={newDepVal} onChange={e => setNewDepVal(e.target.value)} className="tf-input flex-1 text-xs px-3 py-2 rounded-xl" required>
                      <option value="">Select prerequisite card…</option>
                      {availablePrereqs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <button type="submit" className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all">Add</button>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Right sidebar (30%): fixed details, time tracking and activity hub */}
          <div className="w-full md:w-[22rem] shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/30 dark:bg-[#0e121a] overflow-y-auto p-5 space-y-5 scrollbar-thin">
            
            {/* Details Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800/40">
                Task Attributes
              </h4>
              
              <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-semibold flex items-center">Priority</span>
                <div>
                  <select
                    value={priority}
                    onChange={e => { setPriority(e.target.value as any); save({ priority: e.target.value }); }}
                    className="bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded px-1.5 py-0.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <span className="text-slate-400 dark:text-slate-500 font-semibold flex items-center">Due Date</span>
                <div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => { setDueDate(e.target.value); save({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null }); }}
                    className="bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded px-1.5 py-0.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <span className="text-slate-400 dark:text-slate-550 font-semibold flex items-center">Estimate (min)</span>
                <div>
                  <input
                    type="number"
                    value={estTime || ''}
                    onChange={e => setEstTime(Number(e.target.value))}
                    onBlur={() => save({ estimatedTime: Number(estTime) })}
                    placeholder="None"
                    className="w-16 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded px-1.5 py-0.5 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <span className="text-slate-400 dark:text-slate-550 font-semibold flex items-center">Logged</span>
                <span className="font-bold px-1.5 py-0.5 text-slate-800 dark:text-slate-200">{formatTime(card.loggedTime || 0)}</span>

                <span className="text-slate-400 dark:text-slate-550 font-semibold flex items-center">Assignees</span>
                <div className="relative">
                  <div className="flex flex-wrap gap-1 items-center px-1.5">
                    {card.assignees?.map(a => (
                      <img
                        key={a.id}
                        src={getAvatarUrl(a.user.avatarUrl, a.user.name || a.user.username)}
                        alt={a.user.name || ''}
                        title={a.user.name || a.user.username}
                        className="w-5 h-5 rounded-full object-cover border border-white dark:border-slate-850 cursor-pointer hover:scale-105 transition-transform"
                      />
                    ))}
                    <button 
                      onClick={() => setAssigneeSelectOpen(!assigneeSelectOpen)}
                      className="w-5 h-5 rounded-full border border-dashed border-slate-400 dark:border-slate-650 flex items-center justify-center text-slate-450 hover:text-indigo-500 hover:border-indigo-500 transition-all font-bold text-xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Assignee select dropdown overlay */}
                  {assigneeSelectOpen && (
                    <div className="absolute right-0 mt-1 z-50 w-52 bg-white dark:bg-[#161a22] border border-slate-205 dark:border-slate-800 rounded-xl shadow-xl p-2 animate-scale-in">
                      <div className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                        Toggle Assignees
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-0.5 scrollbar-thin text-left">
                        {currentWorkspace?.members.map(m => {
                          const assigned = card.assignees?.some(a => a.userId === m.user.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                if (assigned) {
                                  currentBoard && unassignUserFromCard(currentBoard.id, card.id, m.user.id);
                                } else {
                                  currentBoard && assignUserToCard(currentBoard.id, card.id, m.user.id);
                                }
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${
                                assigned ? 'text-indigo-500 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <img
                                src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                                alt="avatar" className="w-4 h-4 rounded-full shrink-0"
                              />
                              <span className="truncate flex-1">{m.user.name || m.user.username}</span>
                              {assigned && <Check className="w-3.5 h-3.5 ml-auto text-indigo-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-slate-400 dark:text-slate-550 font-semibold flex items-center">Labels</span>
                <div className="relative">
                  <div className="flex flex-wrap gap-1 px-1.5">
                    <button
                      onClick={() => setLabelManagerOpen(!labelManagerOpen)}
                      className="text-[9px] px-1.5 py-0.5 rounded border border-dashed border-slate-400 text-slate-450 hover:text-indigo-500 hover:border-indigo-500 transition-all font-bold"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Label management dropdown overlay */}
                  {labelManagerOpen && (
                    <div className="absolute right-0 mt-1 z-50 w-56 bg-white dark:bg-[#161a22] border border-slate-205 dark:border-slate-800 rounded-xl shadow-xl p-3 animate-scale-in space-y-3">
                      <div className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800 mb-1 flex justify-between items-center">
                        <span>Labels</span>
                        <button onClick={() => setLabelManagerOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                      </div>
                      
                      <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
                        {labels.map((lbl, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-900/30">
                            <span className="text-[10px] px-2 py-0.5 rounded text-white font-bold" style={{ backgroundColor: lbl.color }}>
                              {lbl.name}
                            </span>
                            <button onClick={() => handleRemoveLabel(idx)} className="text-slate-400 hover:text-rose-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleAddLabel} className="space-y-2 border-t border-slate-100 dark:border-slate-800/40 pt-2">
                        <div className="flex gap-1 justify-center">
                          {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewLabelColor(c)}
                              className={`w-4 h-4 rounded-full border ${
                                newLabelColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 border-transparent' : 'border-slate-200 dark:border-slate-800'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="Label text..."
                            className="tf-input text-[10px] px-2.5 py-1 flex-1 rounded-lg"
                            required
                          />
                          <button type="submit" className="px-2.5 py-1 bg-indigo-650 text-white rounded-lg text-[10px] font-bold">
                            Add
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Time Tracking Card */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Time Tracking</h4>
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-2 rounded-lg">
                  <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Estimate</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{formatTime(card.estimatedTime)}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-2 rounded-lg">
                  <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Logged</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{formatTime(card.loggedTime)}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-2 rounded-lg">
                  <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Remaining</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {formatTime(Math.max(0, (card.estimatedTime || 0) - (card.loggedTime || 0)))}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (isTimerActive) {
                      handleLogTimer();
                    } else {
                      setIsTimerActive(true);
                    }
                  }}
                  className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all ${
                    isTimerActive 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                      : 'bg-indigo-650 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isTimerActive 
                    ? `Stop (${Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:${(timeElapsed % 60).toString().padStart(2, '0')})` 
                    : 'Start Timer'}
                </button>
                
                {isTimerActive && (
                  <button
                    onClick={() => {
                      setIsTimerActive(false);
                      setTimeElapsed(0);
                    }}
                    className="px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl hover:bg-slate-300 text-xs font-bold transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Manual Time Logger input */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40 items-center">
                <input
                  type="number"
                  placeholder="Manual min..."
                  value={manualLogVal}
                  min={1}
                  onChange={e => setManualLogVal(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                />
                <button
                  onClick={handleManualLog}
                  className="text-xs bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-bold transition-colors"
                >
                  Log
                </button>
              </div>
            </div>

            {/* Activity Hub (Primary collaboration center) */}
            <div className="flex-1 flex flex-col min-h-[300px]">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" /> Activity Hub
              </h4>
              
              {/* Comments timeline */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin max-h-[320px]">
                {card.comments?.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-605 text-xs">
                    No activity yet. Start a discussion below!
                  </div>
                ) : (
                  card.comments?.map(c => {
                    const extras = commentExtras[c.id] || { reactions: [], replies: [], attachments: [] };
                    return (
                      <div key={c.id} className="space-y-2 text-xs border-b border-slate-100 dark:border-slate-800/40 pb-3">
                        <div className="flex items-start gap-2.5">
                          <img
                            src={getAvatarUrl(c.user.avatarUrl, c.user.name || c.user.username)}
                            alt="avatar"
                            className="w-6 h-6 rounded-full shrink-0 object-cover mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between mb-0.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{c.user.name || c.user.username}</span>
                              <span className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-650 dark:text-slate-350 leading-relaxed break-words">{c.content}</p>
                            
                            {/* Rich Comments attachments */}
                            {extras.attachments?.map((att, idx) => (
                              <div key={idx} className="mt-1.5 flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                                <Paperclip className="w-3 h-3 text-indigo-500" />
                                <span className="font-semibold text-slate-650 dark:text-slate-455 truncate max-w-[12rem]">{att.name}</span>
                                <span className="text-[9px] text-slate-400">{att.size}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Reactions and replies controls */}
                        <div className="flex items-center gap-2 pl-8">
                          <div className="flex items-center gap-1">
                            {['👍', '❤️', '😄', '🎉'].map(emoji => {
                              const r = extras.reactions.find(react => react.emoji === emoji);
                              const active = r?.users.includes(user?.name || user?.username || 'You');
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(c.id, emoji)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                                    active 
                                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' 
                                      : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'
                                  }`}
                                >
                                  {emoji} {r?.users.length || 0}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => setReplyTargetId(replyTargetId === c.id ? null : c.id)}
                            className="text-[10px] font-bold text-slate-450 hover:text-indigo-500 hover:underline flex items-center gap-1"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Replies Thread */}
                        {extras.replies?.length > 0 && (
                          <div className="pl-8 space-y-2 mt-2 border-l-2 border-slate-100 dark:border-slate-800/40">
                            {extras.replies.map(r => (
                              <div key={r.id} className="flex gap-2 text-[10px]">
                                <img
                                  src={getAvatarUrl(r.userAvatar, r.userName)}
                                  alt="avatar"
                                  className="w-4 h-4 rounded-full shrink-0 object-cover mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between mb-0.5">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{r.userName}</span>
                                    <span className="text-[9px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-slate-650 dark:text-slate-350 leading-relaxed break-words">{r.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Form */}
                        {replyTargetId === c.id && (
                          <div className="pl-8 mt-2 animate-scale-in">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const inputEl = e.currentTarget.elements.namedItem('replyText') as HTMLInputElement;
                                handleAddReply(c.id, inputEl.value);
                                inputEl.value = '';
                                setReplyTargetId(null);
                              }}
                              className="flex gap-1.5"
                            >
                              <input
                                name="replyText"
                                type="text"
                                placeholder="Reply..."
                                className="flex-1 text-[10px] px-2 py-1 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                                autoFocus
                              />
                              <button type="submit" className="px-2 py-1 bg-indigo-655 text-white rounded-lg text-[9px] font-bold">
                                Send
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Area */}
              <form onSubmit={handleAddComment} className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2 shrink-0">
                <textarea
                  value={newCommentVal}
                  onChange={e => setNewCommentVal(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent text-slate-850 dark:text-slate-100 resize-none leading-relaxed"
                />
                
                <div className="flex justify-between items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setCommentAttachment(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-550 flex items-center gap-1.5 px-2 py-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg border border-slate-200/40 dark:border-slate-800/40"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {commentAttachment ? commentAttachment.name.slice(0, 10) + '...' : 'Attach File'}
                  </button>
                  
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
