import React, { useState, useEffect, useRef } from 'react'; // Trel Card Modal - Force Redeployment Tweak
import { useStore, getAvatarUrl } from '../store/useStore';
import type { Card } from '../store/useStore';
import { BACKEND_BASE_URL } from '../config/api';
import {
  X, AlignLeft, CheckSquare, Link2, MessageSquare,
  Trash2, Plus, Archive,
  Paperclip, MoreHorizontal, Check, Download, Mail,
  Compass, Flag, Calendar, Users, Tag, Clock, UserPlus,
  ChevronUp, ChevronDown, ExternalLink
} from 'lucide-react';

interface CardModalProps { card: Card; onClose: () => void; }

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

const cleanText = (text: string) => {
  if (!text) return '';
  // Remove style blocks
  let cleaned = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove script blocks
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Remove all HTML tags safely (preserving bracketed email formats)
  cleaned = cleaned.replace(/<(?!mailto:)[a-zA-Z\/][^>]*>/g, '');
  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Collapse excessive blank lines (more than 2 in a row → 1 blank line)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
};

export default function CardModal({ card, onClose }: CardModalProps) {
  const {
    currentBoard, currentWorkspace, updateCard, assignUserToCard,
    unassignUserFromCard, createChecklistItem, updateChecklistItem,
    deleteChecklistItem, createComment, createDependency, deleteDependency,
    addToast, user, uploadAttachment, deleteAttachment
  } = useStore();

  const liveCard = currentBoard?.lists
    .flatMap(l => l.cards)
    .find(c => c.id === card.id) || card;

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(cleanText(card.description || ''));
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
  const [descExpanded, setDescExpanded] = useState(true);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [addCardMenuOpen, setAddCardMenuOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date(card.dueDate || Date.now()));
  const [startDateEnabled, setStartDateEnabled] = useState(false);
  const [startDateVal, setStartDateVal] = useState('');
  const [dueDateEnabled, setDueDateEnabled] = useState(!!card.dueDate);
  const [dueTimeVal, setDueTimeVal] = useState('06:22 PM');
  const [recurringVal, setRecurringVal] = useState('Never');
  const [reminderVal, setReminderVal] = useState('1 Day before');

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverSize, setCoverSize] = useState<'HEADER' | 'FULL'>('HEADER');

  const [isEmailViewerOpen, setIsEmailViewerOpen] = useState(false);
  const [checklistPopoverOpen, setChecklistPopoverOpen] = useState(false);
  const [checklistTitleInput, setChecklistTitleInput] = useState('Checklist');

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
  const fileInputRefForCard = useRef<HTMLInputElement>(null);
  const isCoverUpload = useRef(false);
  const [activeAttachmentMenuId, setActiveAttachmentMenuId] = useState<string | null>(null);

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
    setDescription(cleanText(card.description || ''));
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

  // Lock background body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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

  const handleAddQuickLabel = async (color: string) => {
    const namesByColor: Record<string, string> = {
      '#ef4444': 'Urgent',
      '#f97316': 'Important',
      '#eab308': 'Review',
      '#22c55e': 'Done',
      '#3b82f6': 'In Progress',
      '#a855f7': 'Idea'
    };
    const name = namesByColor[color] || 'Label';
    const updated = [...labels, { name, color }];
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

  const totalChecklist = liveCard.checklists?.length || 0;
  const doneChecklist = liveCard.checklists?.filter(i => i.isCompleted).length || 0;
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
        className="w-full max-w-[66rem] h-[92vh] md:h-[84vh] bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg flex flex-col overflow-hidden relative"
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner Cover Image */}
        {coverImage && (
          <div className={`relative w-full overflow-hidden border-b border-slate-200 dark:border-slate-800 shrink-0 ${coverSize === 'FULL' ? 'h-40' : 'h-24'}`}>
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
                  
                  <div className="flex gap-1.5 mt-2">
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

                  <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/40">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Or upload cover</span>
                    <button
                      type="button"
                      onClick={() => { isCoverUpload.current = true; fileInputRefForCard.current?.click(); }}
                      className="w-full py-1.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#2c333a] dark:hover:bg-[#3c444e] text-slate-808 dark:text-[#b6c2cf] rounded-lg transition-colors border-0 cursor-pointer"
                    >
                      Upload cover image
                    </button>
                    
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Photos from Unsplash</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=60',
                        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=150&auto=format&fit=crop&q=60',
                        'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=150&auto=format&fit=crop&q=60',
                        'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&auto=format&fit=crop&q=60'
                      ].map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={async () => {
                            const hdUrl = url.replace('w=150', 'w=1080');
                            setCoverImage(hdUrl);
                            if (currentBoard) {
                              await updateCard(currentBoard.id, card.id, { coverImage: hdUrl });
                            }
                          }}
                          className="h-8 rounded border-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden p-0 bg-transparent"
                        >
                          <img src={url} alt="unsplash" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
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
          
          {/* Left panel (65%): Title, Description, Selectors/Metadata, Checklists, Attachments, Original Email, Dependencies */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-6 scrollbar-thin" style={{ willChange: 'scroll-position', overscrollBehavior: 'contain' }}>
            
            {/* Title Block */}
            <div className="relative group/title w-full">
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => save({ title })}
                className="w-full bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-900/30 focus:bg-white dark:focus:bg-[#161b22] text-xl font-bold text-slate-850 dark:text-slate-100 resize-none focus:outline-none border border-transparent focus:border-indigo-500 rounded-lg px-2 py-1 leading-snug transition-all"
                rows={1}
                placeholder="Task title..."
              />

              {/* Action Toolbar Below Title */}
              <div className="flex flex-wrap gap-2 mt-2 select-none">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddCardMenuOpen(!addCardMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161a22]/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer bg-[#091e42]/05 dark:bg-white/10"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Add
                  </button>

                  {addCardMenuOpen && (
                    <div 
                      className="absolute left-0 mt-2 z-[999] w-72 bg-white dark:bg-[#1d2127] border border-slate-205 dark:border-slate-800 rounded-xl shadow-xl p-3 animate-scale-in"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-[#b6c2cf] mx-auto">Add to card</span>
                        <button
                          type="button"
                          onClick={() => setAddCardMenuOpen(false)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-555 border-0 bg-transparent cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-left">
                        {/* Labels */}
                        <button
                          type="button"
                          onClick={() => { setAddCardMenuOpen(false); setLabelManagerOpen(true); }}
                          className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-0 bg-transparent text-left cursor-pointer"
                        >
                          <Tag className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#b6c2cf]">Labels</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Organize, categorize, and prioritize</p>
                          </div>
                        </button>

                        {/* Dates */}
                        <button
                          type="button"
                          onClick={() => { setAddCardMenuOpen(false); setDatePickerOpen(true); }}
                          className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-0 bg-transparent text-left cursor-pointer"
                        >
                          <Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#b6c2cf]">Dates</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Start dates, due dates, and reminders</p>
                          </div>
                        </button>

                        {/* Checklist */}
                        <button
                          type="button"
                          onClick={() => {
                            setAddCardMenuOpen(false);
                            setChecklistTitleInput('Checklist');
                            setChecklistPopoverOpen(true);
                          }}
                          className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-0 bg-transparent text-left cursor-pointer"
                        >
                          <CheckSquare className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#b6c2cf]">Checklist</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Add subtasks</p>
                          </div>
                        </button>

                        {/* Members */}
                        <button
                          type="button"
                          onClick={() => { setAddCardMenuOpen(false); setAssigneeSelectOpen(true); }}
                          className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-0 bg-transparent text-left cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#b6c2cf]">Members</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Assign members</p>
                          </div>
                        </button>

                        {/* Attachment */}
                        <button
                          type="button"
                          onClick={() => { setAddCardMenuOpen(false); fileInputRefForCard.current?.click(); }}
                          className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-0 bg-transparent text-left cursor-pointer"
                        >
                          <Paperclip className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#b6c2cf]">Attachment</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Add links, pages, work items, and more</p>
                          </div>
                        </button>


                        {/* Cover */}
                        <button
                          type="button"
                          onClick={() => { setAddCardMenuOpen(false); setCoverPickerOpen(true); }}
                          className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-0 bg-transparent text-left cursor-pointer"
                        >
                          <div className="w-4 h-4 rounded bg-indigo-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#b6c2cf]">Cover</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Add colors or photos to this card</p>
                          </div>
                        </button>

                        {/* Custom Fields */}
                        <button
                          type="button"
                          onClick={() => { setAddCardMenuOpen(false); setLabelManagerOpen(true); }}
                          className="w-full flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-0 bg-transparent text-left cursor-pointer"
                        >
                          <Compass className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#b6c2cf]">Custom Fields</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Create your own fields</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Labels Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLabelManagerOpen(!labelManagerOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161a22]/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Labels
                  </button>
                  {labelManagerOpen && (
                    <div className="absolute left-0 mt-2 z-50 w-48 bg-white dark:bg-[#161a22] border border-slate-205 dark:border-slate-800 rounded-lg shadow-lg p-2 animate-scale-in">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2" style={{ borderColor: 'var(--border)' }}>
                        Quick Labels
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAddQuickLabel(color); }}
                            className="w-4 h-4 rounded-full border border-white hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="Label title…"
                          value={newLabelName}
                          onChange={e => setNewLabelName(e.target.value)}
                          className="tf-input text-[10px] px-2 py-1 h-7 rounded-md"
                        />
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="color"
                            value={newLabelColor}
                            onChange={e => setNewLabelColor(e.target.value)}
                            className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={handleAddLabel}
                            className="btn-primary text-[10px] py-1 px-2.5 h-6 flex-1 justify-center rounded-md font-semibold"
                          >
                            Add Custom
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates Button */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(!datePickerOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161a22]/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Dates
                  </button>
                  {datePickerOpen && (
                    <div 
                      className="absolute left-0 mt-2 top-full z-[999] w-72 max-h-[480px] overflow-y-auto bg-white dark:bg-[#1d2127] border border-slate-205 dark:border-slate-800 rounded-xl shadow-2xl p-4 animate-scale-in scrollbar-thin" 
                      onClick={e => e.stopPropagation()}
                      onWheel={e => e.stopPropagation()}
                      style={{ overscrollBehavior: 'contain' }}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <span className="text-xs font-bold text-slate-805 dark:text-[#b6c2cf] mx-auto">Dates</span>
                        <button
                          type="button"
                          onClick={() => setDatePickerOpen(false)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 border-0 bg-transparent cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Calendar Navigation */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear() - 1, calendarDate.getMonth(), 1))}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-transparent border-0 cursor-pointer text-xs"
                          >
                            &laquo;
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-transparent border-0 cursor-pointer text-xs"
                          >
                            &lsaquo;
                          </button>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-[#b6c2cf]">
                          {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-transparent border-0 cursor-pointer text-xs"
                          >
                            &rsaquo;
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear() + 1, calendarDate.getMonth(), 1))}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-transparent border-0 cursor-pointer text-xs"
                          >
                            &raquo;
                          </button>
                        </div>
                      </div>

                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1 select-none">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d}>{d}</div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center mb-4">
                        {(() => {
                          const year = calendarDate.getFullYear();
                          const month = calendarDate.getMonth();
                          const firstDayIndex = new Date(year, month, 1).getDay();
                          const totalDays = new Date(year, month + 1, 0).getDate();
                          const prevTotalDays = new Date(year, month, 0).getDate();

                          const days = [];
                          for (let i = firstDayIndex - 1; i >= 0; i--) {
                            days.push({ day: prevTotalDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevTotalDays - i) });
                          }
                          for (let i = 1; i <= totalDays; i++) {
                            days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
                          }
                          const totalSlots = 42;
                          const nextDaysCount = totalSlots - days.length;
                          for (let i = 1; i <= nextDaysCount; i++) {
                            days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
                          }

                          return days.map((dObj, idx) => {
                            const isSelected = dueDate && new Date(dueDate).toDateString() === dObj.date.toDateString();
                            const isToday = new Date().toDateString() === dObj.date.toDateString();
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setDueDate(dObj.date.toISOString().split('T')[0]);
                                  setDueDateEnabled(true);
                                }}
                                className={`h-6 text-[11px] rounded flex items-center justify-center font-medium border-0 cursor-pointer select-none transition-colors ${
                                  !dObj.isCurrentMonth
                                    ? 'text-slate-300 dark:text-slate-600 bg-transparent'
                                    : isSelected
                                      ? 'bg-blue-600 text-white font-bold'
                                      : isToday
                                        ? 'border border-blue-500 text-blue-600 font-bold bg-blue-500/5'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-[#b6c2cf] bg-transparent'
                                }`}
                              >
                                {dObj.day}
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {/* Start Date Option */}
                      <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-left">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Start date</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={startDateEnabled}
                              onChange={(e) => setStartDateEnabled(e.target.checked)}
                              className="rounded border-slate-350 text-blue-600 focus:ring-blue-550 cursor-pointer"
                            />
                            <input
                              type="text"
                              placeholder="M/D/YYYY"
                              disabled={!startDateEnabled}
                              value={startDateVal}
                              onChange={(e) => setStartDateVal(e.target.value)}
                              className="flex-1 bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Due Date Option */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Due date</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={dueDateEnabled}
                              onChange={(e) => setDueDateEnabled(e.target.checked)}
                              className="rounded border-slate-350 text-blue-600 focus:ring-blue-550 cursor-pointer"
                            />
                            <input
                              type="date"
                              disabled={!dueDateEnabled}
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="flex-1 bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <select
                              disabled={!dueDateEnabled}
                              value={dueTimeVal}
                              onChange={(e) => setDueTimeVal(e.target.value)}
                              className="w-24 bg-transparent border border-slate-200 dark:border-slate-800 rounded px-1.5 py-1 text-xs text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            >
                              {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '06:22 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Recurring Option */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Recurring</span>
                          <select
                            value={recurringVal}
                            onChange={(e) => setRecurringVal(e.target.value)}
                            className="w-full bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {['Never', 'Daily', 'Weekly', 'Monthly', 'Custom'].map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        {/* Reminder Option */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Set due date reminder</span>
                          <select
                            value={reminderVal}
                            onChange={(e) => setReminderVal(e.target.value)}
                            className="w-full bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {['None', 'At time of due date', '5 Minutes before', '10 Minutes before', '15 Minutes before', '1 Hour before', '2 Hours before', '1 Day before', '2 Days before'].map(rm => (
                              <option key={rm} value={rm}>{rm}</option>
                            ))}
                          </select>
                        </div>

                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Reminders will be sent to all members and watchers of this card.
                        </p>

                        {/* Save Action */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (currentBoard) {
                              const finalDueDate = dueDateEnabled && dueDate ? new Date(dueDate).toISOString() : null;
                              await updateCard(currentBoard.id, card.id, { dueDate: finalDueDate });
                              addToast('Date Saved', 'The due date has been updated.', 'success');
                            }
                            setDatePickerOpen(false);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors border-0 cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checklist Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setChecklistPopoverOpen(!checklistPopoverOpen); setChecklistTitleInput('Checklist'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161a22]/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Checklist
                  </button>
                  {checklistPopoverOpen && (
                    <div 
                      className="absolute left-0 mt-2 z-[999] w-72 bg-white dark:bg-[#1d2127] border border-slate-205 dark:border-slate-800 rounded-xl shadow-2xl p-4 animate-scale-in text-left"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <span className="text-xs font-bold text-slate-805 dark:text-[#b6c2cf] mx-auto">Add checklist</span>
                        <button
                          type="button"
                          onClick={() => setChecklistPopoverOpen(false)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 border-0 bg-transparent cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title</label>
                          <input
                            type="text"
                            value={checklistTitleInput}
                            onChange={e => setChecklistTitleInput(e.target.value)}
                            className="w-full bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (checklistTitleInput.trim() && currentBoard) {
                              createChecklistItem(currentBoard.id, card.id, checklistTitleInput.trim());
                              setChecklistPopoverOpen(false);
                              addToast('Checklist Created', `Checklist "${checklistTitleInput.trim()}" added.`, 'success');
                            }
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors border-0 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Members Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssigneeSelectOpen(!assigneeSelectOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161a22]/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Members
                  </button>
                  {assigneeSelectOpen && (
                    <div className="absolute left-0 mt-2 z-50 w-48 bg-white dark:bg-[#161a22] border border-slate-205 dark:border-slate-800 rounded-lg shadow-lg p-1.5 animate-scale-in" onClick={e => e.stopPropagation()}>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b mb-1" style={{ borderColor: 'var(--border)' }}>
                        Members
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-0.5 scrollbar-thin text-left">
                        {currentWorkspace?.members.map(m => {
                          const assigned = card.assignees?.some(a => a.userId === m.user.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                if (assigned) {
                                  currentBoard && unassignUserFromCard(currentBoard.id, card.id, m.user.id);
                                } else {
                                  currentBoard && assignUserToCard(currentBoard.id, card.id, m.user.id);
                                }
                              }}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${
                                assigned ? 'text-indigo-500 dark:text-indigo-400 font-semibold' : 'text-slate-650 dark:text-slate-400'
                              }`}
                            >
                              <img
                                src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                                alt="avatar" className="w-3.5 h-3.5 rounded-full shrink-0"
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

                {/* Cover Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCoverPickerOpen(!coverPickerOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161a22]/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 rounded bg-indigo-500 shrink-0" /> Cover
                  </button>
                  {coverPickerOpen && (
                    <div 
                      className="absolute left-0 mt-2 z-[999] w-72 max-h-[480px] overflow-y-auto bg-white dark:bg-[#1d2127] border border-slate-205 dark:border-slate-800 rounded-xl shadow-2xl p-4 animate-scale-in text-left scrollbar-thin"
                      onClick={e => e.stopPropagation()}
                      onWheel={e => e.stopPropagation()}
                      style={{ overscrollBehavior: 'contain' }}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                        <span className="text-xs font-bold text-slate-805 dark:text-[#b6c2cf] mx-auto">Cover</span>
                        <button
                          type="button"
                          onClick={() => setCoverPickerOpen(false)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-555 border-0 bg-transparent cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Size option */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Size</span>
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Header cover size */}
                            <button
                              type="button"
                              onClick={() => setCoverSize('HEADER')}
                              className={`p-2 rounded-lg border text-left cursor-pointer transition-all bg-transparent ${
                                coverSize === 'HEADER' 
                                  ? 'border-blue-500 ring-1 ring-blue-500' 
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="h-6 w-full bg-slate-200 dark:bg-slate-805 rounded mb-1.5" />
                              <div className="h-1.5 w-12 bg-slate-400 dark:bg-slate-600 rounded mb-1" />
                              <div className="h-1.5 w-8 bg-slate-300 dark:bg-slate-700 rounded" />
                            </button>
                            {/* Full cover size */}
                            <button
                              type="button"
                              onClick={() => setCoverSize('FULL')}
                              className={`p-2 rounded-lg border text-left cursor-pointer transition-all bg-transparent ${
                                coverSize === 'FULL' 
                                  ? 'border-blue-500 ring-1 ring-blue-500' 
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="h-12 w-full bg-slate-200 dark:bg-slate-805 rounded flex flex-col justify-end p-1.5">
                                <div className="h-1.5 w-12 bg-slate-400 dark:bg-slate-600 rounded mb-1" />
                                <div className="h-1.5 w-8 bg-slate-300 dark:bg-slate-700 rounded" />
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Remove Cover Button */}
                        {coverImage && (
                          <button
                            type="button"
                            onClick={async () => {
                              setCoverImage('');
                              if (currentBoard) {
                                await updateCard(currentBoard.id, card.id, { coverImage: null });
                              }
                            }}
                            className="w-full py-1.5 text-xs font-semibold bg-slate-105 hover:bg-slate-200 dark:bg-[#2c333a] dark:hover:bg-[#3c444e] text-slate-808 dark:text-[#b6c2cf] rounded-lg transition-colors border-0 cursor-pointer"
                          >
                            Remove cover
                          </button>
                        )}

                        {/* Colors Grid */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Colors</span>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[
                              '#218559', '#eab308', '#d97706', '#dc2626', '#8b5cf6',
                              '#2563eb', '#06b6d4', '#84cc16', '#db2777', '#6b7280'
                            ].map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={async () => {
                                  setCoverImage(color);
                                  if (currentBoard) {
                                    await updateCard(currentBoard.id, card.id, { coverImage: color });
                                  }
                                }}
                                className="h-7 rounded-md border-0 cursor-pointer hover:scale-105 transition-transform"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Upload Cover */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Attachments</span>
                          <button
                            type="button"
                            onClick={() => { isCoverUpload.current = true; fileInputRefForCard.current?.click(); }}
                            className="w-full py-1.5 text-xs font-semibold bg-slate-105 hover:bg-slate-200 dark:bg-[#2c333a] dark:hover:bg-[#3c444e] text-slate-808 dark:text-[#b6c2cf] rounded-lg transition-colors border-0 cursor-pointer"
                          >
                            Upload a cover image
                          </button>
                          <p className="text-[9px] text-slate-400 mt-1">Tip: Drag an image on to the card to upload it.</p>
                        </div>

                        {/* Unsplash Photos */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Photos from Unsplash</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=60',
                              'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=150&auto=format&fit=crop&q=60',
                              'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=150&auto=format&fit=crop&q=60',
                              'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&auto=format&fit=crop&q=60',
                              'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=150&auto=format&fit=crop&q=60',
                              'https://images.unsplash.com/photo-1472214222541-d510753a49fa?w=150&auto=format&fit=crop&q=60'
                            ].map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={async () => {
                                  const hdUrl = url.replace('w=150', 'w=1080');
                                  setCoverImage(hdUrl);
                                  if (currentBoard) {
                                    await updateCard(currentBoard.id, card.id, { coverImage: hdUrl });
                                  }
                                }}
                                className="h-10 rounded-md border-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden p-0 bg-transparent"
                              >
                                <img src={url} alt="unsplash" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-805 dark:text-slate-200 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-slate-500" /> Description
                </h4>
                {!isEditingDesc && description && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#2c333a] dark:hover:bg-[#3c444e] text-slate-800 dark:text-[#b6c2cf] rounded-md transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="animate-scale-in">
                {isEditingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={8}
                      className="w-full text-sm p-3 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-[#22272b] text-slate-850 dark:text-[#b6c2cf] resize-y leading-relaxed font-sans"
                    />
                    <div className="flex gap-2 justify-start">
                      <button
                        onClick={() => {
                          save({ description });
                          setIsEditingDesc(false);
                        }}
                        className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-750 text-white rounded-md font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setDescription(cleanText(card.description || ''));
                          setIsEditingDesc(false);
                        }}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-[#2c333a] dark:hover:bg-[#3c444e] text-slate-650 dark:text-[#b6c2cf] rounded-md font-semibold"
                      >
                        Cancel
                      </button>
                      {card.emailDetails && (
                        <button
                          type="button"
                          onClick={() => {
                            setDescription(cleanText(card.description || ''));
                            setIsEditingDesc(false);
                          }}
                          className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-md font-semibold ml-auto"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div 
                      className={`p-3.5 bg-slate-50/70 dark:bg-[#22272b]/80 border border-slate-150/40 dark:border-slate-800/40 rounded-lg text-sm leading-relaxed text-slate-800 dark:text-[#b6c2cf] font-normal whitespace-pre-wrap font-sans hover:bg-slate-100/60 dark:hover:bg-[#2c333a] transition-all cursor-pointer scrollbar-thin ${
                        !descExpanded ? 'max-h-48 overflow-hidden relative' : 'max-h-[420px] overflow-y-auto'
                      }`}
                      onClick={() => setIsEditingDesc(true)}
                    >
                      {description ? (
                        description
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">
                          Add a more detailed description…
                        </span>
                      )}
                      {!descExpanded && description && description.length > 300 && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 dark:from-[#22272b] to-transparent pointer-events-none" />
                      )}
                    </div>

                    {description && description.length > 300 && (
                      <div className="flex justify-center mt-2.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#b6c2cf] hover:text-indigo-500 transition-colors bg-slate-100 dark:bg-[#2c333a] hover:bg-slate-200 dark:hover:bg-[#3c444e] px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                        >
                          {descExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" /> Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" /> Show more
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {card.emailDetails && (
              <div className="pt-2 pb-1 space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider flex items-center gap-1.5" title="Email Reference">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" /> Created from email
                </span>
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center gap-4">
                  <div className="space-y-0.5 text-left min-w-0">
                    <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-snug truncate">
                      {card.emailDetails.subject}
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      from: <span className="font-medium text-slate-650 dark:text-slate-350">{card.emailDetails.sender}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEmailViewerOpen(true)}
                      className="px-3 py-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="p-1.5 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Checklists Section */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-2 mb-2">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Checklists ({doneChecklist}/{totalChecklist})
              </h4>
              <div className="space-y-3">
                {totalChecklist > 0 && (
                  <div className="flex items-center gap-3 text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/10">
                    <span>Progress</span>
                    <span className="tracking-widest hidden sm:inline">{getProgressBlocks(progress)}</span>
                    <span className="ml-auto">{progress}%</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  {liveCard.checklists?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 group py-1 px-2 hover:bg-slate-50/50 dark:hover:bg-slate-955/30 rounded-md transition-colors">
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
                        type="button"
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
                    className="tf-input flex-1 text-xs px-3 py-1.5 rounded-lg"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <button type="submit" className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-805 dark:text-slate-200 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-indigo-500" /> Attachments
                </h4>
                <button
                  type="button"
                  onClick={() => fileInputRefForCard.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#2c333a] dark:hover:bg-[#3c444e] text-slate-800 dark:text-[#b6c2cf] rounded-md transition-colors"
                >
                  Add
                </button>
                <input
                  type="file"
                  ref={fileInputRefForCard}
                  multiple
                  onChange={async (e) => {
                    if (e.target.files && currentBoard) {
                      const files = Array.from(e.target.files);
                      for (const file of files) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64Data = (reader.result as string).split(',')[1];
                          const uploaded = await uploadAttachment(currentBoard.id, card.id, {
                            filename: file.name,
                            mimeType: file.type,
                            size: file.size,
                            base64Data
                          });
                          if (isCoverUpload.current && uploaded?.storagePath) {
                            const fullPath = `http://localhost:5000/${uploaded.storagePath.replace(/^\/?/, '')}`;
                            setCoverImage(fullPath);
                            await updateCard(currentBoard.id, card.id, { coverImage: fullPath });
                          }
                          isCoverUpload.current = false;
                          addToast('Attachment Added', `File ${file.name} successfully uploaded.`, 'success');
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                  className="hidden"
                />
              </div>

              {liveCard.attachments && liveCard.attachments.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-455 dark:text-slate-550 mt-1 mb-2">Files</h5>
                    <div className="space-y-2">
                      {liveCard.attachments.map((att: any) => {
                        const pathVal = att.storagePath || att.path || '';
                        const displayPath = pathVal.startsWith('http') ? pathVal : `${BACKEND_BASE_URL}/${pathVal.replace(/^\/?/, '')}`;
                        const ext = att.filename.split('.').pop()?.toUpperCase() || 'FILE';
                        const formattedDate = new Date(att.createdAt || Date.now()).toLocaleDateString([], {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div 
                            key={att.id} 
                            className="group/att flex items-center gap-3 p-2 bg-[#22272b]/30 dark:bg-[#22272b]/60 border border-slate-150/40 dark:border-slate-800/40 rounded-xl relative"
                          >
                            {/* File icon preview block */}
                            <div className="w-12 h-10 bg-[#22272b]/60 dark:bg-[#161a22] rounded-lg flex items-center justify-center font-bold text-xs text-slate-400 shrink-0 select-none">
                              {ext}
                            </div>

                            {/* File metadata details */}
                            <div className="min-w-0 flex-grow text-left">
                              <h6 className="font-bold text-xs text-slate-800 dark:text-[#b6c2cf] truncate leading-tight">
                                {att.filename}
                              </h6>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                Added {formattedDate}
                              </p>
                            </div>

                            {/* Actions Right Buttons block */}
                            <div className="flex items-center gap-1.5 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                              {/* Open link */}
                              <a 
                                href={displayPath} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Open in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>

                              {/* Triage menu */}
                              <button
                                type="button"
                                onClick={() => setActiveAttachmentMenuId(activeAttachmentMenuId === att.id ? null : att.id)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center"
                                title="Options"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {/* Options Dropdown menu overlay */}
                              {activeAttachmentMenuId === att.id && (
                                <div 
                                  className="absolute right-0 mt-8 top-0 w-32 py-1 rounded-lg shadow-xl z-[999] border"
                                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                                >
                                  <a
                                    href={displayPath}
                                    download={att.filename}
                                    onClick={() => setActiveAttachmentMenuId(null)}
                                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-[#b6c2cf] no-underline font-semibold"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </a>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setActiveAttachmentMenuId(null);
                                      if (currentBoard) {
                                        await deleteAttachment(currentBoard.id, card.id, att.id);
                                        addToast('Attachment Deleted', 'The file has been deleted from the card.', 'success');
                                      }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-rose-500/10 text-red-500 border-t font-semibold bg-transparent border-0 cursor-pointer"
                                    style={{ borderColor: 'var(--border)' }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dependencies Section */}
            {(card.dependencies?.length > 0 || availablePrereqs.length > 0) && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-555 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Link2 className="w-3.5 h-3.5 text-indigo-500" /> Dependencies
                </h4>
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    {card.dependencies?.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-2 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-lg text-xs">
                        <span className="text-slate-650 dark:text-slate-400 font-semibold">
                          Blocked by: <span className="text-slate-805 dark:text-slate-200 font-bold ml-1">{d.dependsOnCard?.title}</span>
                        </span>
                        <button type="button" onClick={() => currentBoard && deleteDependency(currentBoard.id, card.id, d.id)} className="btn-icon p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {availablePrereqs.length > 0 && (
                    <form onSubmit={handleAddDependency} className="flex gap-2 mt-1.5">
                      <select value={newDepVal} onChange={e => setNewDepVal(e.target.value)} className="tf-input flex-1 text-xs px-3 py-1.5 rounded-lg" required>
                        <option value="">Select prerequisite card…</option>
                        {availablePrereqs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                      <button type="submit" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all">Add</button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Grid for Quick Metadata / Selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50/30 dark:bg-[#161a22]/30 border rounded-xl mt-6" style={{ borderColor: 'var(--border)' }}>
              {/* Status */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" title="Status">
                  <Compass className="w-3.5 h-3.5 text-indigo-500" /> Status
                </span>
                <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                  {currentBoard?.lists?.find(l => l.id === card.listId)?.name || 'Inbox'}
                </span>
              </div>

              {/* Priority Select */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" title="Priority">
                  <Flag className="w-3.5 h-3.5 text-orange-500" /> Priority
                </span>
                <select
                  value={priority}
                  onChange={e => { setPriority(e.target.value as any); save({ priority: e.target.value }); }}
                  className="bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-xs font-semibold text-slate-805 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-550 w-full"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Due Date Select */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" title="Due Date">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" /> Due Date
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => { setDueDate(e.target.value); save({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null }); }}
                  className="bg-transparent border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-555 w-full"
                />
              </div>

              {/* Assignees Section */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" title="Assignees">
                  <Users className="w-3.5 h-3.5 text-emerald-500" /> Assignees ({card.assignees?.length || 0})
                </span>
                <div className="relative flex items-center gap-1.5">
                  <div className="flex flex-wrap gap-1 items-center">
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
                      type="button"
                      onClick={() => setAssigneeSelectOpen(!assigneeSelectOpen)}
                      className="w-5 h-5 rounded-full border border-dashed border-slate-450 dark:border-slate-655 flex items-center justify-center text-slate-455 hover:text-indigo-500 hover:border-indigo-500 transition-all font-bold text-xs"
                    >
                      +
                    </button>
                  </div>

                  {assigneeSelectOpen && (
                    <div className="absolute left-0 mt-6 z-50 w-48 bg-white dark:bg-[#161a22] border border-slate-205 dark:border-slate-800 rounded-lg shadow-lg p-1.5 animate-scale-in">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b mb-1" style={{ borderColor: 'var(--border)' }}>
                        Members
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-0.5 scrollbar-thin text-left">
                        {currentWorkspace?.members.map(m => {
                          const assigned = card.assignees?.some(a => a.userId === m.user.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                if (assigned) {
                                  currentBoard && unassignUserFromCard(currentBoard.id, card.id, m.user.id);
                                } else {
                                  currentBoard && assignUserToCard(currentBoard.id, card.id, m.user.id);
                                }
                              }}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${
                                assigned ? 'text-indigo-500 dark:text-indigo-400 font-semibold' : 'text-slate-650 dark:text-slate-400'
                              }`}
                            >
                              <img
                                src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                                alt="avatar" className="w-3.5 h-3.5 rounded-full shrink-0"
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
              </div>
            </div>

            {/* Labels and Time Tracking inline bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Labels Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" title="Labels">
                  <Tag className="w-3.5 h-3.5 text-purple-500" /> Labels ({labels.length})
                </span>
                <div className="relative">
                  <div className="flex flex-wrap gap-1 items-center">
                    {labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-2 py-0.5 rounded font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-sm"
                        style={{ backgroundColor: lbl.color }}
                      >
                        {lbl.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(idx)}
                          className="hover:text-red-200 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLabelManagerOpen(!labelManagerOpen)}
                      className="w-5 h-5 rounded border border-dashed border-slate-455 dark:border-slate-655 flex items-center justify-center text-slate-455 hover:text-indigo-500 hover:border-indigo-500 transition-all font-bold text-xs"
                    >
                      +
                    </button>
                  </div>

                  {labelManagerOpen && (
                    <div className="absolute left-0 mt-1.5 z-50 w-48 bg-white dark:bg-[#161a22] border border-slate-205 dark:border-slate-800 rounded-lg shadow-lg p-2 animate-scale-in">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2" style={{ borderColor: 'var(--border)' }}>
                        Quick Labels
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleAddQuickLabel(color)}
                            className="w-4 h-4 rounded-full border border-white hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="Label title…"
                          value={newLabelName}
                          onChange={e => setNewLabelName(e.target.value)}
                          className="tf-input text-[10px] px-2 py-1 h-7 rounded-md"
                        />
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="color"
                            value={newLabelColor}
                            onChange={e => setNewLabelColor(e.target.value)}
                            className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={handleAddLabel}
                            className="btn-primary text-[10px] py-1 px-2.5 h-6 flex-1 justify-center rounded-md font-semibold"
                          >
                            Add Custom
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Time Tracking Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" title="Time Tracker">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> Time Tracker
                </span>
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-2 rounded-lg flex items-center justify-between text-xs border" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex gap-3 text-center">
                    <div>
                      <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Est</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatTime(card.estimatedTime)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Log</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatTime(card.loggedTime)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Rem</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {formatTime(Math.max(0, (card.estimatedTime || 0) - (card.loggedTime || 0)))}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isTimerActive) {
                          handleLogTimer();
                        } else {
                          setIsTimerActive(true);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                        isTimerActive 
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                          : 'bg-indigo-650 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isTimerActive 
                        ? `Stop (${Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:${(timeElapsed % 60).toString().padStart(2, '0')})` 
                        : 'Start Timer'}
                    </button>
                    
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        placeholder="Log min"
                        value={manualLogVal}
                        min={1}
                        onChange={e => setManualLogVal(e.target.value)}
                        className="w-12 text-[10px] px-1 py-0.5 bg-transparent border rounded focus:outline-none"
                        style={{ borderColor: 'var(--border)' }}
                      />
                      <button
                        type="button"
                        onClick={handleManualLog}
                        className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
                      >
                        Log
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Archive Actions / Danger Zone */}
            <div className="pt-4 border-t flex justify-end gap-3 mt-6" style={{ borderColor: 'var(--border)' }}>
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
                className="flex items-center justify-center gap-1.5 px-4 h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Card</span>
              </button>
            </div>

          </div>

          {/* Right sidebar (35%): ONLY Comments / Activity Feed */}
          <div className="w-full md:w-[22rem] shrink-0 border-t md:border-t-0 md:border-l border-slate-205 dark:border-slate-800 flex flex-col md:h-full bg-slate-50/20 dark:bg-[#11141c] p-4 overflow-visible md:overflow-hidden">
            
            {/* Activity Hub */}
            <div className="flex-grow flex flex-col min-h-0 md:h-full">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-3 flex items-center gap-2 shrink-0">
                <MessageSquare className="w-4 h-4 text-indigo-500" /> Activity Feed
              </h4>
              
              {/* Comments timeline (scrolls independently) */}
              <div className="flex-grow overflow-y-auto space-y-4 pr-1 scrollbar-thin" style={{ willChange: 'scroll-position', overscrollBehavior: 'contain' }}>
                {liveCard.comments?.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-605 text-xs">
                    No activity yet. Start a discussion below!
                  </div>
                ) : (
                  liveCard.comments?.map(c => {
                    const extras = commentExtras[c.id] || { reactions: [], replies: [], attachments: [] };
                    return (
                      <div key={c.id} className="flex gap-3 text-xs text-left">
                        {/* Avatar & Timeline Connector Line */}
                        <div className="flex flex-col items-center shrink-0">
                          <img
                            src={getAvatarUrl(c.user.avatarUrl, c.user.name || c.user.username)}
                            alt="avatar"
                            className="w-5 h-5 rounded-full object-cover z-10"
                          />
                          <div className="w-0.5 flex-grow bg-slate-100 dark:bg-slate-800/60 my-1 min-h-[1.5rem]" />
                        </div>

                        {/* Content area */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{c.user.name || c.user.username}</span>
                            <span>commented</span>
                            <span>•</span>
                            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          <p className="mt-1 text-slate-650 leading-relaxed break-words text-xs">{c.content}</p>
                          
                          {/* Rich Comments attachments */}
                          {extras.attachments?.map((att, idx) => (
                            <div key={idx} className="mt-2 flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
                              <Paperclip className="w-3 h-3 text-indigo-500" />
                              <span className="font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[12rem]">{att.name}</span>
                              <span className="text-[9px] text-slate-400">{att.size}</span>
                            </div>
                          ))}

                          {/* Reactions & Reply controls */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                              {['👍', '❤️', '😄', '🎉'].map(emoji => {
                                const r = extras.reactions.find(react => react.emoji === emoji);
                                const active = r?.users.includes(user?.name || user?.username || 'You');
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(c.id, emoji)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
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
                              type="button"
                              onClick={() => setReplyTargetId(replyTargetId === c.id ? null : c.id)}
                              className="text-[9px] font-bold text-slate-400 hover:text-indigo-500 hover:underline"
                            >
                              Reply
                            </button>
                          </div>

                          {/* Replies Thread */}
                          {extras.replies?.length > 0 && (
                            <div className="mt-3 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-3">
                              {extras.replies.map(r => (
                                <div key={r.id} className="flex gap-2 text-[11px]">
                                  <img
                                    src={getAvatarUrl(r.userAvatar, r.userName)}
                                    alt="avatar"
                                    className="w-4 h-4 rounded-full shrink-0 object-cover mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                      <span className="font-bold text-slate-700 dark:text-slate-300">{r.userName}</span>
                                      <span>replied</span>
                                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="mt-0.5 text-slate-600 dark:text-slate-350 leading-relaxed break-words">{r.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply Form */}
                          {replyTargetId === c.id && (
                            <div className="mt-2 pl-3 border-l border-slate-200 dark:border-slate-800 animate-scale-in">
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
                                  className="flex-1 text-[10px] px-2.5 py-1 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                                  autoFocus
                                />
                                <button type="submit" className="px-2.5 py-1 bg-indigo-650 text-white rounded-lg text-[9px] font-bold">
                                  Send
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Area (Fixed at bottom) */}
              <form onSubmit={handleAddComment} className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2 shrink-0 bg-transparent">
                <textarea
                  value={newCommentVal}
                  onChange={e => setNewCommentVal(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent text-slate-800 dark:text-slate-100 resize-none leading-relaxed"
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
        {/* Email Viewer Overlay Modal (Trello-style) */}
        {isEmailViewerOpen && card.emailDetails && (
          <div className="absolute inset-0 bg-[#090b0f]/90 z-[10000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsEmailViewerOpen(false)}>
            <div className="w-full max-w-4xl h-[85vh] bg-[#1d2127] dark:bg-[#1a1f2c] border border-[#2f353f] rounded-xl flex flex-col overflow-hidden shadow-2xl relative animate-scale-in" onClick={e => e.stopPropagation()}>
              {/* Header Panel */}
              <div className="px-6 py-4 border-b border-[#2f353f] flex justify-between items-start gap-4 shrink-0 bg-[#161a1f] dark:bg-[#131620]">
                <div className="space-y-1 text-left">
                  <h4 className="font-bold text-white text-base leading-snug">
                    {card.emailDetails.subject}
                  </h4>
                  <p className="text-xs text-slate-400">
                    from: <span className="font-medium text-slate-200">{card.emailDetails.sender}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400 shrink-0 font-medium mt-1">
                    {new Date(card.emailDetails.receivedTime).toLocaleString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEmailViewerOpen(false)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto bg-white p-6">
                {card.emailDetails.bodyHtml ? (
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <style>
                            body { 
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                              font-size: 14px;
                              line-height: 1.6;
                              color: #111827;
                              margin: 0;
                              padding: 8px;
                              background-color: #ffffff;
                              overflow-x: hidden;
                            }
                            img { max-width: 100%; height: auto; }
                          </style>
                        </head>
                        <body>
                          ${card.emailDetails.bodyHtml}
                        </body>
                      </html>
                    `}
                    className="w-full h-full border-0 bg-white"
                    title="Original Email HTML Content"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                  />
                ) : (
                  <div className="text-left text-sm text-slate-900 whitespace-pre-wrap font-normal select-text">
                    {card.emailDetails.bodyText}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-[#2f353f] bg-[#161a1f] dark:bg-[#131620] flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([card.emailDetails?.bodyHtml || card.emailDetails?.bodyText || ''], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${card.emailDetails?.subject || 'email'}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2f353f] hover:bg-[#3d4450] text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
