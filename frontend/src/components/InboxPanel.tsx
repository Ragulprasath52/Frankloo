import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Inbox, ChevronRight, Mail, Slack, Github, 
  Calendar, Zap, Archive, CheckSquare, Search, Plus, Info, Clock, Send, ArrowLeft, RotateCw, CheckCircle2
} from 'lucide-react';

const transparentDragImg = new Image();
transparentDragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export default function InboxPanel() {
  const { 
    currentWorkspace, inboxItems, fetchInboxItems, createInboxItem, 
    updateInboxItem, convertInboxItem, mockIncomingInboxItems, replyToGmail,
    isInboxOpen, setInboxOpen, addToast, user,
    syncStatus, lastSyncedTime, setDraggedEmail,
    batchConvertInboxItems, batchArchiveInboxItems, batchDeleteInboxItems,
    batchUpdateInboxItemsStatus, syncGmailInbox,
    fetchWorkspaceDetails
  } = useStore();
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Quick Capture Form States
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickPriority, setQuickPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickCaptureExpanded, setQuickCaptureExpanded] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('NEW_PROCESSING'); // NEW or PROCESSING by default
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterHasAttachments, setFilterHasAttachments] = useState<boolean>(false);
  const [filterAssignedToMe, setFilterAssignedToMe] = useState<boolean>(false);

  // Advanced Convert States
  const [activeConvertId, setActiveConvertId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [selectedDueDate, setSelectedDueDate] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [selectedLabelsText, setSelectedLabelsText] = useState('');

  // Bulk Convert States
  const [isBulkConvertOpen, setIsBulkConvertOpen] = useState(false);
  const [bulkBoardId, setBulkBoardId] = useState('');
  const [bulkListId, setBulkListId] = useState('');

  // Email Details States
  const [activeGmailDetailsItem, setActiveGmailDetailsItem] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      fetchInboxItems(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  // Load lists when board changes in Convert
  useEffect(() => {
    if (selectedBoardId && currentWorkspace) {
      const board = currentWorkspace.boards?.find(b => b.id === selectedBoardId);
      if (board && board.lists && board.lists.length > 0) {
        setSelectedListId(board.lists[0].id);
      } else {
        setSelectedListId('');
      }
    }
  }, [selectedBoardId, currentWorkspace]);

  if (!currentWorkspace) return null;

  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      await createInboxItem(currentWorkspace.id, {
        title: quickTitle,
        description: quickDesc,
        priority: quickPriority,
        dueDate: quickDueDate || null,
        source: 'QUICK',
        sourceDetails: '{}'
      });
      setQuickTitle('');
      setQuickDesc('');
      setQuickPriority('MEDIUM');
      setQuickDueDate('');
      setQuickCaptureExpanded(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertItem = async (itemId: string) => {
    if (!selectedBoardId || !selectedListId) return;
    try {
      const labelsArray = selectedLabelsText.split(',')
        .map(l => l.trim())
        .filter(Boolean)
        .map(name => ({ name, color: '#36b37e' }));

      await convertInboxItem(currentWorkspace.id, itemId, {
        boardId: selectedBoardId,
        listId: selectedListId,
        priority: selectedPriority,
        dueDate: selectedDueDate || null,
        assigneeIds: selectedAssigneeIds,
        labels: labelsArray
      });

      setActiveConvertId(null);
      setSelectedBoardId('');
      setSelectedListId('');
      setSelectedPriority('MEDIUM');
      setSelectedDueDate('');
      setSelectedAssigneeIds([]);
      setSelectedLabelsText('');
    } catch (err: any) {
      addToast('Convert Error', err.message || 'Failed to convert item.', 'error');
    }
  };

  const handleSendReply = async () => {
    if (!activeGmailDetailsItem || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await replyToGmail(activeGmailDetailsItem.id, replyText);
      addToast('Reply Sent', 'Your reply email has been successfully sent.', 'success');
      setReplyText('');
    } catch (err: any) {
      addToast('Error sending reply', err.message || 'Could not send email reply.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: any) => {
    try {
      await updateInboxItem(currentWorkspace.id, itemId, { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMockIncoming = async () => {
    try {
      await mockIncomingInboxItems(currentWorkspace.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Manual refresh logic
  const handleManualRefresh = async () => {
    useStore.setState({ syncStatus: 'syncing' });
    try {
      await syncGmailInbox(currentWorkspace.id);
      await fetchInboxItems(currentWorkspace.id);
      await fetchWorkspaceDetails(currentWorkspace.id);
      useStore.setState({ syncStatus: 'synced', lastSyncedTime: new Date() });
    } catch (err) {
      useStore.setState({ syncStatus: 'offline' });
    }
  };

  // Filter and Search processing
  const filteredItems = inboxItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = filterSource === 'ALL' || item.source === filterSource;

    let matchesStatus = true;
    if (filterStatus === 'NEW_PROCESSING') {
      matchesStatus = item.status === 'NEW' || item.status === 'PROCESSING';
    } else if (filterStatus === 'UNREAD') {
      matchesStatus = item.status === 'NEW';
    } else if (filterStatus !== 'ALL') {
      matchesStatus = item.status === filterStatus;
    }

    const matchesPriority = filterPriority === 'ALL' || item.priority === filterPriority;

    const sourceDetailsObj = JSON.parse(item.sourceDetails || '{}');
    const hasAtt = sourceDetailsObj.attachments && sourceDetailsObj.attachments.length > 0;
    const matchesAttachments = !filterHasAttachments || hasAtt;

    let matchesAssigned = true;
    if (filterAssignedToMe && user) {
      const name = (user.name || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const bodyText = `${item.title} ${item.description}`.toLowerCase();
      matchesAssigned = (name && bodyText.includes(name)) || bodyText.includes(username) || bodyText.includes(`@${username}`);
    }

    return matchesSearch && matchesSource && matchesStatus && matchesPriority && matchesAttachments && matchesAssigned;
  });

  const unreadCount = inboxItems.filter(item => item.status === 'NEW').length;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'GMAIL': return <Mail className="w-4 h-4 text-red-500 shrink-0" />;
      case 'SLACK': return <Slack className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'DISCORD': return <Info className="w-4 h-4 text-indigo-500 shrink-0" />;
      case 'GITHUB': return <Github className="w-4 h-4 text-slate-150 dark:text-slate-100 shrink-0" />;
      case 'CALENDAR': return <Calendar className="w-4 h-4 text-blue-500 shrink-0" />;
      default: return <Zap className="w-4 h-4 text-yellow-500 shrink-0" />;
    }
  };

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const getStatusBadgeColor = (s: string) => {
    switch (s) {
      case 'NEW': return 'bg-blue-500/10 text-blue-400';
      case 'PROCESSING': return 'bg-purple-500/10 text-purple-400';
      case 'CONVERTED': return 'bg-emerald-500/10 text-emerald-400';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getSyncStatusIndicator = () => {
    if (syncStatus === 'syncing') {
      return (
        <span className="flex items-center gap-1.5 text-[10px] text-yellow-500 font-bold animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Syncing...
        </span>
      );
    }
    if (syncStatus === 'offline') {
      return (
        <span className="flex items-center gap-1.5 text-[10px] text-red-500 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Connection lost
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold" title={lastSyncedTime ? `Last synced: ${lastSyncedTime.toLocaleTimeString()}` : ''}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Synced {lastSyncedTime ? 'just now' : ''}
      </span>
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  return (
    <>
      {/* Backdrop Overlay - closes inbox when clicking outside */}
      {isInboxOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 transition-opacity duration-300"
          onClick={() => setInboxOpen(false)}
        />
      )}

      {/* Main Drawer Content */}
      <div
        className={`fixed top-0 right-0 h-screen bg-white dark:bg-[#101214] text-slate-800 dark:text-slate-100 flex flex-col border-l border-slate-250 dark:border-slate-800 transition-transform duration-300 ease-in-out z-50 shadow-2xl overflow-hidden w-full md:w-[25rem] ${
          isInboxOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Toggle Button — only visible on md+ (not on mobile, where full-width inbox has X button) */}
        <button
          onClick={() => setInboxOpen(!isInboxOpen)}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-10 bg-slate-900 dark:bg-[#1d2125] border border-slate-700 text-slate-400 hover:text-white w-10 h-10 rounded-l-lg items-center justify-center transition-all shadow-md focus:outline-none z-50"
        >
          {isInboxOpen ? <ChevronRight className="w-5 h-5" /> : (
            <div className="relative">
              <Inbox className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[0.5625rem] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
          )}
        </button>
        {/* Header (Sticky) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-[#161a1d] gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Inbox className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <h3 className="font-semibold text-xs sm:text-sm tracking-wide whitespace-nowrap truncate text-slate-800 dark:text-[#f0f6fc]">Workspace Inbox</h3>
            {unreadCount > 0 && (
              <span className="bg-indigo-650/10 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sync status */}
            {getSyncStatusIndicator()}
            {/* Refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={syncStatus === 'syncing'}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Refresh Inbox"
            >
              <RotateCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
            <button
              onClick={handleMockIncoming}
              className="text-[9px] sm:text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-semibold border border-slate-250 dark:border-slate-700 whitespace-nowrap"
            >
              Mock Alerts
            </button>
            {/* Close button */}
            <button
              onClick={() => setInboxOpen(false)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-550 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Close inbox"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Quick Capture Panel */}
          <div className="bg-slate-50 dark:bg-[#181a1c] border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div 
              onClick={() => setQuickCaptureExpanded(!quickCaptureExpanded)}
              className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white uppercase tracking-wider mb-2"
            >
              <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-indigo-500" /> Quick Capture</span>
              <span className="text-[0.625rem] text-slate-500">{quickCaptureExpanded ? 'Collapse' : 'Expand'}</span>
            </div>
            
            {quickCaptureExpanded ? (
              <form onSubmit={handleQuickCaptureSubmit} className="space-y-3 pt-1">
                <div>
                  <input
                    type="text"
                    placeholder="Task Title (Press Enter to create)"
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    className="w-full bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Description (Optional)"
                    value={quickDesc}
                    onChange={e => setQuickDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Priority</label>
                    <select
                      value={quickPriority}
                      onChange={e => setQuickPriority(e.target.value as any)}
                      className="w-full bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-white focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Due Date</label>
                    <input
                      type="date"
                      value={quickDueDate}
                      onChange={e => setQuickDueDate(e.target.value)}
                      className="w-full bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickCaptureExpanded(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-semibold rounded"
                  >
                    Capture
                  </button>
                </div>
              </form>
            ) : (
              <input
                type="text"
                placeholder="Instant Capture... (Type and press Enter)"
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleQuickCaptureSubmit(e);
                  }
                }}
                className="w-full bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* Filtering Panel */}
          <div className="bg-slate-50 dark:bg-[#181a1c] border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="flex gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-550 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search inbox..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-855 dark:text-white focus:outline-none"
              >
                <option value="NEW_PROCESSING">Active</option>
                <option value="UNREAD">Unread</option>
                <option value="NEW">New</option>
                <option value="PROCESSING">Processing</option>
                <option value="CONVERTED">Converted</option>
                <option value="ARCHIVED">Archived</option>
                <option value="ALL">All States</option>
              </select>
            </div>

            {/* Source Filter chips */}
            <div className="flex flex-wrap gap-1">
              {['ALL', 'QUICK', 'GMAIL', 'SLACK', 'DISCORD', 'GITHUB', 'CALENDAR'].map(source => (
                <button
                  key={source}
                  onClick={() => setFilterSource(source)}
                  className={`px-2 py-0.5 rounded text-[0.625rem] font-semibold border ${
                    filterSource === source
                      ? 'bg-indigo-100 dark:bg-indigo-600/20 text-indigo-650 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500'
                      : 'bg-white dark:bg-[#22272b] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>

            {/* Extended Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800/60">
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Priority</label>
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="w-full bg-white dark:bg-[#22272b] border border-slate-200 dark:border-slate-700 rounded p-1 text-[11px] text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1 justify-center pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-655 dark:text-slate-400 text-[10px] select-none">
                  <input
                    type="checkbox"
                    checked={filterHasAttachments}
                    onChange={e => setFilterHasAttachments(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                  />
                  <span>Has Attachments</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-655 dark:text-slate-400 text-[10px] select-none">
                  <input
                    type="checkbox"
                    checked={filterAssignedToMe}
                    onChange={e => setFilterAssignedToMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                  />
                  <span>Assigned to Me</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bulk Selection Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 space-y-2.5 animate-fade-in text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  {selectedIds.length} items selected
                </span>
                <button onClick={() => setSelectedIds([])} className="text-indigo-500 hover:text-indigo-700 underline bg-transparent border-0 cursor-pointer text-[10px]">
                  Clear selection
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-indigo-200 dark:border-indigo-850">
                <button
                  onClick={() => setIsBulkConvertOpen(!isBulkConvertOpen)}
                  className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded font-bold shadow-sm cursor-pointer"
                >
                  Convert Selected
                </button>
                <button
                  onClick={async () => {
                    try {
                      await batchArchiveInboxItems(currentWorkspace.id, selectedIds);
                      setSelectedIds([]);
                    } catch (e) {}
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Archive
                </button>
                <button
                  onClick={async () => {
                    try {
                      await batchDeleteInboxItems(currentWorkspace.id, selectedIds);
                      setSelectedIds([]);
                    } catch (e) {}
                  }}
                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded font-bold border border-rose-500/20 cursor-pointer"
                >
                  Delete
                </button>
                <button
                  onClick={async () => {
                    try {
                      await batchUpdateInboxItemsStatus(currentWorkspace.id, selectedIds, 'NEW');
                      setSelectedIds([]);
                    } catch (e) {}
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Unread
                </button>
                <button
                  onClick={async () => {
                    try {
                      await batchUpdateInboxItemsStatus(currentWorkspace.id, selectedIds, 'CONVERTED');
                      setSelectedIds([]);
                    } catch (e) {}
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Read
                </button>
              </div>

              {/* Bulk Convert Form */}
              {isBulkConvertOpen && (
                <div className="bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2 mt-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Board</label>
                    <select
                      value={bulkBoardId}
                      onChange={e => {
                        setBulkBoardId(e.target.value);
                        const b = currentWorkspace.boards?.find(bd => bd.id === e.target.value);
                        setBulkListId(b?.lists?.[0]?.id || '');
                      }}
                      className="w-full bg-slate-55 dark:bg-[#161a1d] border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="">-- Choose Board --</option>
                      {currentWorkspace.boards?.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  {bulkBoardId && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Column</label>
                      <select
                        value={bulkListId}
                        onChange={e => setBulkListId(e.target.value)}
                        className="w-full bg-slate-55 dark:bg-[#161a1d] border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="">-- Choose Column --</option>
                        {currentWorkspace.boards?.find(bd => bd.id === bulkBoardId)?.lists?.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      if (!bulkBoardId || !bulkListId) return;
                      try {
                        await batchConvertInboxItems(currentWorkspace.id, selectedIds, { boardId: bulkBoardId, listId: bulkListId });
                        setSelectedIds([]);
                        setIsBulkConvertOpen(false);
                      } catch (e) {}
                    }}
                    disabled={!bulkBoardId || !bulkListId}
                    className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded font-bold disabled:opacity-50 cursor-pointer mt-1"
                  >
                    Confirm Batch Convert
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inbox Feed List */}
          <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between px-1 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
              <span>Emails & Items ({filteredItems.length})</span>
              {filteredItems.length > 0 && (
                <label className="flex items-center gap-1 cursor-pointer select-none text-indigo-500 hover:text-indigo-650">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                  />
                  <span>Select All</span>
                </label>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg py-12 text-center text-slate-500 text-xs">
                <Inbox className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                No items found match filters
              </div>
            ) : (
              filteredItems.map(item => {
                const sourceDetailsObj = JSON.parse(item.sourceDetails || '{}');
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    draggable={item.status !== 'CONVERTED'}
                    onDragStart={e => {
                      if (selectedIds.includes(item.id)) {
                        e.dataTransfer.setData('inboxItemIds', JSON.stringify(selectedIds));
                      } else {
                        e.dataTransfer.setData('inboxItemId', item.id);
                      }

                      e.dataTransfer.setDragImage(transparentDragImg, 0, 0);
                      setDraggedEmail(item);
                    }}
                    onDragEnd={() => {
                      setDraggedEmail(null);
                    }}
                    className={`bg-slate-50 dark:bg-[#181a1c] border rounded-lg p-3 hover:border-slate-350 dark:hover:border-slate-700 transition shadow-sm space-y-2 cursor-grab active:cursor-grabbing relative group ${
                      item.status === 'CONVERTED' ? 'opacity-60 bg-emerald-50/5 border-emerald-500/10' : ''
                    } ${isSelected ? 'border-indigo-400 dark:border-indigo-650 bg-indigo-500/5 dark:bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800'}`}
                  >
                    {/* Top line: select box & source badge & metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, item.id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer pointer-events-auto shrink-0"
                          onClick={e => e.stopPropagation()}
                        />
                        {getSourceIcon(item.source)}
                        <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">
                          {item.source}
                        </span>
                      </div>
                      
                      {/* Priority and Status Badges */}
                      <div className="flex gap-1">
                        <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded ${getPriorityBadgeColor(item.priority)}`}>
                          {item.priority}
                        </span>
                        <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded ${getStatusBadgeColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div 
                      onClick={() => {
                        if (item.source === 'GMAIL') {
                          setActiveGmailDetailsItem(item);
                        }
                      }}
                      className={item.source === 'GMAIL' ? 'cursor-pointer hover:opacity-85 transition-all' : ''}
                    >
                      <h4 className="font-semibold text-xs text-slate-850 dark:text-white leading-snug">
                        {item.source === 'GMAIL' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse"></span>}
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-[0.6875rem] text-slate-550 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Source specific details */}
                    {item.source !== 'QUICK' && Object.keys(sourceDetailsObj).length > 0 && (
                      <div className="bg-slate-100/50 dark:bg-[#1f2326] border border-slate-200 dark:border-slate-800 p-2 rounded text-[0.625rem] text-slate-500 dark:text-slate-400 space-y-0.5">
                        {sourceDetailsObj.sender && <div><b>Sender:</b> {sourceDetailsObj.sender}</div>}
                        {sourceDetailsObj.channel && <div><b>Channel:</b> {sourceDetailsObj.channel}</div>}
                        {sourceDetailsObj.repo && <div><b>Repo:</b> {sourceDetailsObj.repo}</div>}
                        {sourceDetailsObj.calendar && <div><b>Calendar:</b> {sourceDetailsObj.calendar}</div>}
                        {sourceDetailsObj.link && (
                          <a 
                            href={sourceDetailsObj.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-550 dark:text-indigo-400 hover:underline inline-block mt-0.5 font-bold"
                          >
                            View Original Link
                          </a>
                        )}
                        {sourceDetailsObj.attachments && sourceDetailsObj.attachments.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
                            <span className="font-bold block mb-0.5 text-slate-650 dark:text-slate-350">Attachments ({sourceDetailsObj.attachments.length}):</span>
                            <ul className="list-disc pl-3.5 space-y-0.5 text-slate-500 font-medium">
                              {sourceDetailsObj.attachments.map((att: any, idx: number) => (
                                <li key={idx} className="truncate" title={att.filename}>
                                  {att.filename} <span className="text-[9px] text-slate-450 font-normal">({Math.round((att.size || 0) / 1024)} KB)</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between pt-1 text-[0.625rem] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        {item.dueDate && (
                          <span className="flex items-center gap-0.5 text-orange-400/80 font-medium">
                            <Clock className="w-3 h-3" />
                            {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'ARCHIVED')}
                            className="hover:text-red-505 dark:hover:text-red-400 flex items-center gap-0.5 font-medium bg-transparent border-0 cursor-pointer"
                            title="Archive Item"
                          >
                            <Archive className="w-3 h-3" /> Archive
                          </button>
                        )}
                        {item.status !== 'CONVERTED' && (
                          <button
                            onClick={() => {
                              setActiveConvertId(activeConvertId === item.id ? null : item.id);
                              if (currentWorkspace.boards && currentWorkspace.boards.length > 0) {
                                setSelectedBoardId(currentWorkspace.boards[0].id);
                              }
                            }}
                            className="hover:text-indigo-505 dark:hover:text-indigo-400 flex items-center gap-0.5 font-medium bg-transparent border-0 cursor-pointer"
                            title="Convert to Task"
                          >
                            <CheckSquare className="w-3 h-3" /> Convert
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Convert selector form (inline) */}
                    {activeConvertId === item.id && (
                      <div className="mt-3 p-3 bg-slate-100 dark:bg-[#1e2225] border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <div>
                          <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Board</label>
                          <select
                            value={selectedBoardId}
                            onChange={e => setSelectedBoardId(e.target.value)}
                            className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">-- Choose Board --</option>
                            {currentWorkspace.boards?.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        {selectedBoardId && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Column</label>
                              <select
                                value={selectedListId}
                                onChange={e => setSelectedListId(e.target.value)}
                                className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="">-- Choose Column --</option>
                                {currentWorkspace.boards?.find(b => b.id === selectedBoardId)?.lists?.map(l => (
                                  <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                                <select
                                  value={selectedPriority}
                                  onChange={e => setSelectedPriority(e.target.value as any)}
                                  className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded focus:outline-none"
                                >
                                  <option value="LOW">Low</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HIGH">High</option>
                                  <option value="URGENT">Urgent</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                                <input
                                  type="date"
                                  value={selectedDueDate}
                                  onChange={e => setSelectedDueDate(e.target.value)}
                                  className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1 rounded focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Labels (Comma-separated)</label>
                              <input
                                type="text"
                                value={selectedLabelsText}
                                onChange={e => setSelectedLabelsText(e.target.value)}
                                placeholder="e.g. Bug, Support"
                                className="w-full bg-white dark:bg-[#101214] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white p-1.5 rounded focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Assign Members</label>
                              <div className="max-h-20 overflow-y-auto border border-slate-200 dark:border-slate-850 p-1.5 rounded bg-white dark:bg-[#101214] space-y-1">
                                {currentWorkspace.members?.map(m => (
                                  <label key={m.user.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer text-slate-655 dark:text-slate-400">
                                    <input
                                      type="checkbox"
                                      checked={selectedAssigneeIds.includes(m.user.id)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedAssigneeIds([...selectedAssigneeIds, m.user.id]);
                                        } else {
                                          setSelectedAssigneeIds(selectedAssigneeIds.filter(id => id !== m.user.id));
                                        }
                                      }}
                                      className="rounded text-indigo-650 focus:ring-indigo-500 border-slate-350 w-3 h-3"
                                    />
                                    <span>{m.user.name || m.user.username}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end gap-1.5 pt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveConvertId(null);
                              setSelectedBoardId('');
                              setSelectedListId('');
                              setSelectedPriority('MEDIUM');
                              setSelectedDueDate('');
                              setSelectedAssigneeIds([]);
                              setSelectedLabelsText('');
                            }}
                            className="px-2 py-1 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConvertItem(item.id)}
                            disabled={!selectedBoardId || !selectedListId}
                            className="px-3 py-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Convert
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        {/* Email Details Sub-Drawer Overlay */}
        {activeGmailDetailsItem && (
          <div className="absolute inset-0 bg-white dark:bg-[#101214] flex flex-col z-50 animate-slide-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-[#161a1d] gap-2">
              <button 
                onClick={() => {
                  setActiveGmailDetailsItem(null);
                  setReplyText('');
                }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-850 dark:hover:text-white font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-500" /> Back to Inbox
              </button>
              
              <div className="flex gap-2">
                {activeGmailDetailsItem.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => {
                      handleStatusChange(activeGmailDetailsItem.id, 'ARCHIVED');
                      setActiveGmailDetailsItem(null);
                    }}
                    className="text-[10px] sm:text-xs font-semibold py-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveConvertId(activeGmailDetailsItem.id);
                    if (currentWorkspace?.boards?.length > 0) {
                      setSelectedBoardId(currentWorkspace.boards[0].id);
                    }
                    setActiveGmailDetailsItem(null);
                  }}
                  className="text-[10px] sm:text-xs font-semibold py-1.5 px-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Convert
                </button>
              </div>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                  Gmail Message
                </span>
                <h3 className="font-bold text-sm text-slate-850 dark:text-[#f0f6fc] leading-snug pt-1">
                  {activeGmailDetailsItem.title}
                </h3>
                
                {/* Meta details */}
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div><b>From:</b> {JSON.parse(activeGmailDetailsItem.sourceDetails || '{}').sender || 'Unknown'}</div>
                  <div><b>Date:</b> {new Date(activeGmailDetailsItem.dueDate || Date.now()).toLocaleString()}</div>
                </div>
              </div>

              {/* Message text */}
              <div className="space-y-1.5">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Body</span>
                <div className="border border-slate-250 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-750 dark:text-slate-350 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {activeGmailDetailsItem.description || 'No email content.'}
                </div>
              </div>

              {/* Synchronized Attachments */}
              {JSON.parse(activeGmailDetailsItem.sourceDetails || '{}').attachments?.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Synced Attachments ({JSON.parse(activeGmailDetailsItem.sourceDetails || '{}').attachments.length})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {JSON.parse(activeGmailDetailsItem.sourceDetails || '{}').attachments.map((att: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="min-w-0">
                          <span className="block text-[10px] font-semibold text-slate-750 dark:text-slate-300 truncate" title={att.filename}>
                            {att.filename}
                          </span>
                          <span className="text-[9px] text-slate-405">
                            {(att.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap shrink-0">
                          Synced
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Form */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Write Email Reply</span>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply message..."
                  rows={4}
                  className="w-full bg-white dark:bg-[#161a22] border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="btn-primary py-2 w-full justify-center text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingReply ? 'Sending Reply...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  </>
  );
}
