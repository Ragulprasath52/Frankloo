import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Inbox, Trash2, Settings, ShieldAlert, Cpu, Check, Copy, 
  RefreshCw, FileText, Download, CheckSquare, Plus, X, 
  ExternalLink, ShieldCheck, PlayCircle, Paperclip, Clock, 
  Archive, Eye, Edit3
} from 'lucide-react';
import { getEmailDomain } from '../config/api';

interface BoardInboxModuleProps {
  workspaceId: string;
  isEditor: boolean;
  onSelectBoard: (boardId: string) => void;
}

type Tab = 'inbox' | 'settings';
type SettingsSubTab = 'automation' | 'logs' | 'advanced';

export default function BoardInboxModule({ workspaceId, isEditor, onSelectBoard }: BoardInboxModuleProps) {
  const { 
    currentWorkspace, inboxItems, fetchInboxItems, convertInboxItem, 
    sendTestEmail, fetchEmailLogs, addToast, deleteInboxItem, updateInboxItem,
    gmailRules, fetchGmailRules, createGmailRule, deleteGmailRule, updateBoard
  } = useStore();

  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsSubTab>('advanced');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'text' | 'html'>('html');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Convert Modal States
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertItem, setConvertItem] = useState<any | null>(null);
  const [convertBoardId, setConvertBoardId] = useState('');
  const [convertListId, setConvertListId] = useState('');
  const [convertPriority, setConvertPriority] = useState('MEDIUM');
  const [convertLabels, setConvertLabels] = useState('');
  const [convertAssignees, setConvertAssignees] = useState<string[]>([]);
  const [convertDueDate, setConvertDueDate] = useState('');
  const [convertChecklist, setConvertChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [convertedCardId, setConvertedCardId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [saveAsDefaultPreferences, setSaveAsDefaultPreferences] = useState(false);

  // Settings states
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailListId, setEmailListId] = useState('');
  const [emailPriority, setEmailPriority] = useState('MEDIUM');
  const [emailAllowedSenders, setEmailAllowedSenders] = useState('ANY');
  const [emailDefaultLabels, setEmailDefaultLabels] = useState('');
  const [emailAutoAssignees, setEmailAutoAssignees] = useState<string[]>([]);
  const [emailThreadAction, setEmailThreadAction] = useState('COMMENT');
  const [emailSpamFilter, setEmailSpamFilter] = useState(true);
  const [emailAutomationEnabled, setEmailAutomationEnabled] = useState(false);
  const [emailAttachmentLimit, setEmailAttachmentLimit] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);

  // Automation Rules form states
  const [ruleTriggerType, setRuleTriggerType] = useState('SENDER');
  const [ruleTriggerVal, setRuleTriggerVal] = useState('');
  const [ruleTargetBoardId, setRuleTargetBoardId] = useState('');
  const [ruleTargetListId, setRuleTargetListId] = useState('');

  // Fetch workspace details and inbox items on mount
  useEffect(() => {
    fetchInboxItems(workspaceId);
    fetchGmailRules();
  }, [workspaceId]);

  // Set default selected board on load
  useEffect(() => {
    if (currentWorkspace?.boards && currentWorkspace.boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(currentWorkspace.boards[0].id);
    }
  }, [currentWorkspace, selectedBoardId]);

  // Sync board settings when active board changes
  const activeBoard = currentWorkspace?.boards?.find(b => b.id === selectedBoardId);
  useEffect(() => {
    const board = currentWorkspace?.boards?.find(b => b.id === selectedBoardId);
    if (board) {
      setEmailEnabled(board.incomingEmailEnabled ?? true);
      setEmailAddress(board.incomingEmailAddress || '');
      setEmailListId(board.incomingEmailListId || '');
      setEmailPriority(board.incomingEmailDefaultPriority || 'MEDIUM');
      setEmailAllowedSenders(board.incomingEmailAllowedSenders || 'ANY');
      setEmailDefaultLabels(board.incomingEmailDefaultLabelIds || '');
      setEmailAutoAssignees(board.incomingEmailAutoAssigneeIds ? board.incomingEmailAutoAssigneeIds.split(',').filter(Boolean) : []);
      setEmailThreadAction(board.incomingEmailThreadAction || 'COMMENT');
      setEmailSpamFilter(board.incomingEmailSpamFilter ?? true);
      setEmailAutomationEnabled(board.incomingEmailAutomationEnabled ?? false);
      setEmailAttachmentLimit(board.incomingEmailAttachmentLimit ?? 10);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoardId]); // ← Only sync on board switch, NOT on every workspace refresh (prevents regenerated address from disappearing)

  // Load logs when logs subtab is selected or updated
  useEffect(() => {
    if (activeTab === 'settings' && activeSettingsTab === 'logs' && selectedBoardId) {
      loadLogs();
    }
  }, [activeTab, activeSettingsTab, selectedBoardId]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchEmailLogs(workspaceId, selectedBoardId);
      setEmailLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCopyEmail = () => {
    if (emailAddress) {
      navigator.clipboard.writeText(emailAddress);
      setCopiedAddress(true);
      addToast('Address Copied', 'Incoming board email address copied to clipboard.', 'success');
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };  const handleRegenerateAddress = async () => {
    if (!activeBoard) return;
    const cleanBoardName = activeBoard.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'board';
    const randomHex = Math.random().toString(36).substring(2, 6);
    const newAddr = `${cleanBoardName}-${randomHex}@${getEmailDomain()}`;
    setEmailAddress(newAddr);
    try {
      await updateBoard(activeBoard.id, { incomingEmailAddress: newAddr });
      addToast('Address Generated', 'A new incoming email address has been generated and saved.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to generate address', 'error');
    }
  };

  const handleSaveEmailAddress = async () => {
    if (!activeBoard) return;
    try {
      await updateBoard(activeBoard.id, { incomingEmailAddress: emailAddress || null });
      setIsEditingAddress(false);
      addToast('Address Updated', 'Incoming board email address updated successfully.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update address', 'error');
    }
  };

  const handleToggleEmailEnabled = async () => {
    if (!activeBoard) return;
    const nextState = !emailEnabled;
    setEmailEnabled(nextState);
    try {
      await updateBoard(activeBoard.id, { incomingEmailEnabled: nextState });
      addToast(nextState ? 'Email Enabled' : 'Email Disabled', `Incoming email has been ${nextState ? 'enabled' : 'disabled'}.`, 'success');
    } catch (err: any) {
      setEmailEnabled(emailEnabled); // revert
      addToast('Error', err.message || 'Failed to update email status', 'error');
    }
  };

  const handleTestEmail = async () => {
    if (!selectedBoardId) return;
    try {
      await sendTestEmail(workspaceId, selectedBoardId);
      addToast('Test Email Sent', 'Simulated incoming email dispatched successfully. Refreshing inbox...', 'success');
      setTimeout(() => {
        fetchInboxItems(workspaceId);
        loadLogs();
      }, 1000);
    } catch (err: any) {
      addToast('Test Failed', err.message || 'Failed to simulate test email', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor) {
      addToast('Permission Denied', 'Only workspace editors/owners can update settings.', 'error');
      return;
    }
    if (!activeBoard) return;
    setSavingSettings(true);
    try {
      await updateBoard(activeBoard.id, {
        incomingEmailAddress: emailAddress || null,
        incomingEmailListId: emailListId || null,
        incomingEmailDefaultPriority: emailPriority,
        incomingEmailAllowedSenders: emailAllowedSenders,
        incomingEmailDefaultLabelIds: emailDefaultLabels,
        incomingEmailAutoAssigneeIds: emailAutoAssignees.join(','),
        incomingEmailThreadAction: emailThreadAction,
        incomingEmailSpamFilter: emailSpamFilter,
        incomingEmailAutomationEnabled: emailAutomationEnabled,
        incomingEmailAttachmentLimit: emailAttachmentLimit
      });
      addToast('Settings Saved', 'Board Inbox configurations successfully updated.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor) {
      addToast('Permission Denied', 'Only workspace editors/owners can add rules.', 'error');
      return;
    }
    if (!ruleTriggerVal.trim() || !ruleTargetBoardId) {
      addToast('Validation Error', 'Trigger value and target board are required.', 'error');
      return;
    }
    try {
      await createGmailRule({
        triggerType: ruleTriggerType,
        triggerVal: ruleTriggerVal.trim(),
        targetBoardId: ruleTargetBoardId,
        targetListId: ruleTargetListId || undefined
      });
      addToast('Rule Created', 'Automation rule successfully added.', 'success');
      setRuleTriggerVal('');
      setRuleTargetBoardId('');
      setRuleTargetListId('');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to create rule', 'error');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!isEditor) {
      addToast('Permission Denied', 'Only workspace editors/owners can delete rules.', 'error');
      return;
    }
    try {
      await deleteGmailRule(ruleId);
      addToast('Rule Deleted', 'Automation rule successfully removed.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete rule', 'error');
    }
  };

  const handleOpenConvert = (item: any) => {
    const details = JSON.parse(item.sourceDetails || '{}');
    setConvertItem(item);
    setConvertBoardId(item.boardId || selectedBoardId || '');
    
    // Autofill defaults from board settings
    const bId = item.boardId || selectedBoardId;
    const matchedBoard = currentWorkspace?.boards?.find(b => b.id === bId);
    
    setConvertPriority(matchedBoard?.incomingEmailDefaultPriority || item.priority || 'MEDIUM');
    setConvertLabels(matchedBoard?.incomingEmailDefaultLabelIds || '');
    setConvertAssignees(matchedBoard?.incomingEmailAutoAssigneeIds ? matchedBoard.incomingEmailAutoAssigneeIds.split(',').filter(Boolean) : []);
    setConvertDueDate('');
    setConvertedCardId(null);
    setConvertChecklist(details.checklists || []);
    setSaveAsDefaultPreferences(false);
    
    if (matchedBoard && matchedBoard.lists && matchedBoard.lists.length > 0) {
      setConvertListId(matchedBoard.incomingEmailListId || matchedBoard.lists[0].id);
    } else {
      setConvertListId('');
    }

    setConvertModalOpen(true);
  };

  useEffect(() => {
    if (convertBoardId) {
      const matchedBoard = currentWorkspace?.boards?.find(b => b.id === convertBoardId);
      if (matchedBoard && matchedBoard.lists && matchedBoard.lists.length > 0) {
        setConvertListId(matchedBoard.incomingEmailListId || matchedBoard.lists[0].id);
      } else {
        setConvertListId('');
      }
    }
  }, [convertBoardId]);

  const handleAddConvertChecklist = () => {
    if (newChecklistItem.trim()) {
      setConvertChecklist([...convertChecklist, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveConvertChecklist = (index: number) => {
    setConvertChecklist(convertChecklist.filter((_, idx) => idx !== index));
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertItem || !convertBoardId || !convertListId) {
      addToast('Validation Error', 'Board and Target Column are required.', 'error');
      return;
    }
    setConverting(true);
    try {
      const labelsArray = convertLabels.split(',')
        .map(l => l.trim())
        .filter(Boolean)
        .map(name => ({ name, color: '#36b37e' }));

      const payload = {
        boardId: convertBoardId,
        listId: convertListId,
        assigneeIds: convertAssignees,
        labels: labelsArray,
        priority: convertPriority,
        dueDate: convertDueDate ? new Date(convertDueDate).toISOString() : null,
        checklist: convertChecklist
      };

      // Save defaults if toggled
      if (saveAsDefaultPreferences) {
        await updateBoard(convertBoardId, {
          incomingEmailListId: convertListId,
          incomingEmailDefaultPriority: convertPriority,
          incomingEmailDefaultLabelIds: convertLabels,
          incomingEmailAutoAssigneeIds: convertAssignees.join(',')
        });
      }

      await convertInboxItem(workspaceId, convertItem.id, payload);
      addToast('Converted Successfully', 'Email successfully converted into card.', 'success');
      
      fetchInboxItems(workspaceId);

      setTimeout(async () => {
        const boardDetail = await useStore.getState().fetchBoardDetails(convertBoardId);
        const card = boardDetail.lists.flatMap(l => l.cards).find(c => c.title === convertItem.title);
        if (card) {
          setConvertedCardId(card.id);
        } else {
          setConvertedCardId('success');
        }
        setConverting(false);
      }, 1500);

    } catch (err: any) {
      addToast('Conversion Failed', err.message || 'Server error converting item', 'error');
      setConverting(false);
    }
  };

  const handleArchiveInboxItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateInboxItem(workspaceId, itemId, { status: 'ARCHIVED' });
      addToast('Email Archived', 'Email has been successfully moved to archive.', 'success');
      if (selectedEmail?.id === itemId) setSelectedEmail(null);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to archive email', 'error');
    }
  };

  const handleDeleteInboxItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteInboxItem(workspaceId, itemId);
      addToast('Email Deleted', 'Email permanently deleted from Board Inbox.', 'success');
      if (selectedEmail?.id === itemId) setSelectedEmail(null);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete email', 'error');
    }
  };

  // Filter emails belonging to current selected board
  const boardInboxItems = inboxItems.filter(item => {
    if (item.source !== 'EMAIL') return false;
    return item.boardId === selectedBoardId && item.status !== 'ARCHIVED';
  });

  // Relative time formatter helper
  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Get circular initials avatar for sender
  function getInitials(sender: string) {
    const clean = sender.replace(/<.*>/, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function getAvatarColor(sender: string) {
    const colors = [
      'bg-red-500/10 text-red-500 border border-red-500/25',
      'bg-orange-500/10 text-orange-500 border border-orange-500/25',
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25',
      'bg-teal-500/10 text-teal-500 border border-teal-500/25',
      'bg-blue-500/10 text-blue-500 border border-blue-500/25',
      'bg-indigo-500/10 text-indigo-500 border border-indigo-500/25',
      'bg-purple-500/10 text-purple-500 border border-purple-500/25',
      'bg-pink-500/10 text-pink-500 border border-pink-500/25',
      'bg-rose-500/10 text-rose-500 border border-rose-500/25',
    ];
    let sum = 0;
    for (let i = 0; i < sender.length; i++) {
      sum += sender.charCodeAt(i);
    }
    return colors[sum % colors.length];
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-48px)] overflow-hidden select-none" style={{ background: 'var(--bg-body)' }}>
      {/* ── TOP HERO BANNER ── */}
      {activeBoard ? (
        <div className="border-b border-gray-200/60 dark:border-gray-800/40 px-6 py-5 md:py-6 shrink-0 bg-white dark:bg-[#161a22] shadow-sm">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">
                  Email-to-Board
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Configure routing</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-2.5">
                {activeBoard.name} Inbox
              </h2>
            </div>

            {/* Email Address focal point */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-3 px-4 rounded-2xl max-w-xl w-full">
              {isEditingAddress ? (
                <div className="flex-1 flex flex-col gap-2 w-full md:min-w-[280px]">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block">Incoming Board Address</span>
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="inbox@mccmrfip.in"
                      className="tf-input text-xs font-mono py-1.5 px-2.5 rounded-xl border border-gray-250 dark:border-gray-800 flex-1 bg-white dark:bg-[#1d2125]"
                    />
                    <button
                      onClick={handleSaveEmailAddress}
                      className="text-xs text-emerald-655 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 rounded-xl border border-emerald-500/20 font-bold"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEmailAddress(activeBoard.incomingEmailAddress || '');
                        setIsEditingAddress(false);
                      }}
                      className="text-xs text-rose-650 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 rounded-xl border border-rose-500/20 font-bold"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block mb-0.5">Incoming Board Address</span>
                  <span className="text-sm font-mono font-bold text-indigo-650 dark:text-indigo-400 break-all select-all">
                    {emailAddress || 'inbox@mccmrfip.in'}
                  </span>
                </div>
              )}
              
              {!isEditingAddress && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleCopyEmail}
                    disabled={!emailAddress}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 rounded-xl disabled:opacity-50"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                  </button>
                  {isEditor && (
                    <>
                      <button
                        onClick={() => setIsEditingAddress(true)}
                        className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 rounded-xl"
                        title="Edit custom email address"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleRegenerateAddress}
                        className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 rounded-xl"
                        title="Regenerate random email address"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleToggleEmailEnabled}
                        className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 border transition-all ${
                          emailEnabled 
                            ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-450 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {emailEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4 md:mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('inbox')}
                className={`text-xs font-bold py-1 px-1 border-b-2 transition-all ${
                  activeTab === 'inbox' 
                    ? 'border-indigo-500 text-[#172b4d] dark:text-[#f0f6fc]' 
                    : 'border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-gray-300'
                }`}
              >
                Email Inbox ({boardInboxItems.length})
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`text-xs font-bold py-1 px-1 border-b-2 transition-all ${
                  activeTab === 'settings' 
                    ? 'border-indigo-500 text-[#172b4d] dark:text-[#f0f6fc]' 
                    : 'border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-gray-300'
                }`}
              >
                Settings & Advanced
              </button>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto mt-2 md:mt-0">
              <button
                onClick={handleTestEmail}
                className="text-[10px] text-emerald-600 dark:text-emerald-450 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold shrink-0"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Simulate Test Email
              </button>
              <span className="text-[11px] text-slate-450 dark:text-[#6e7681] hidden md:inline-block">
                Board Selector:
              </span>
              <select 
                value={selectedBoardId} 
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="bg-slate-50 dark:bg-white/5 border border-gray-250 dark:border-[#30363d] text-xs rounded-lg py-1 px-2 pr-7 font-bold text-gray-600 dark:text-[#8d96a0] max-w-[150px] md:max-w-none"
              >
                {currentWorkspace?.boards?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161a22]">
          <p className="text-sm text-gray-500">No boards exist in this workspace. Please create a board first.</p>
        </div>
      )}

      {/* ── CORE VIEWS CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto min-h-full flex flex-col">
          {activeBoard ? (
            <>
              {activeTab === 'inbox' && (
                <div className="min-h-full flex flex-col flex-1">
                  {boardInboxItems.length === 0 ? (
                    /* Beautiful Onboarding State */
                    <div className="flex-1 min-h-[380px] bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm my-6 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-5 animate-pulse">
                        <Inbox className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-[#172b4d] dark:text-[#f0f6fc]">Set up Email-to-Board</h3>
                      <p className="text-xs text-gray-400 max-w-sm mt-2 leading-relaxed">
                        Configure a custom email address for this board. Any email sent to this address will be automatically converted to a task.
                      </p>
                      
                      <div className="w-full max-w-md my-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-150 dark:border-white/5 text-left space-y-3">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-500 block mb-1">When emails arrive, you can:</span>
                        <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-700 dark:text-[#c9d1d9]">
                          <div className="flex items-start gap-2">
                            <span className="text-indigo-500 shrink-0 font-bold">•</span>
                            <p><b>Preview:</b> Read formatted email bodies and inspect metadata.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-indigo-500 shrink-0 font-bold">•</span>
                            <p><b>Convert:</b> Instantly convert incoming emails into Kanban cards.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-indigo-500 shrink-0 font-bold">•</span>
                            <p><b>Attachments:</b> Automatically parse and attach uploaded files.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-indigo-500 shrink-0 font-bold">•</span>
                            <p><b>Assign & Label:</b> Apply customized checklists, members, or status tags.</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCopyEmail}
                        disabled={!emailAddress}
                        className="btn-primary py-2.5 px-6 rounded-xl font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-50"
                      >
                        <Copy className="w-4 h-4" /> <span>{copiedAddress ? 'Address Copied' : 'Copy Board Address'}</span>
                      </button>
                    </div>
                  ) : (
                    /* Premium Inbox Client Layout */
                    <div className="bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-[#30363d] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                      
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              <th className="p-4 w-[160px]">Sender</th>
                              <th className="p-4">Subject & Preview</th>
                              <th className="p-4 w-[110px] text-center">Attachments</th>
                              <th className="p-4 w-[110px] text-center">Received</th>
                              <th className="p-4 w-[110px] text-center">Status</th>
                              <th className="p-4 w-[140px] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                            {boardInboxItems.map((item) => {
                              const details = JSON.parse(item.sourceDetails || '{}');
                              const hasAtts = details.attachments && details.attachments.length > 0;
                              const isNew = item.status === 'NEW';
                              const initials = getInitials(details.sender || 'Unknown');
                              const avatarColor = getAvatarColor(details.sender || 'Unknown');
                              
                              return (
                                <tr 
                                  key={item.id} 
                                  onClick={() => setSelectedEmail(item)}
                                  className="group/row hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                  {/* Sender with initials badge */}
                                  <td className="p-4 whitespace-nowrap min-w-[150px]">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${avatarColor}`}>
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-xs text-[#172b4d] dark:text-[#b6c2cf] truncate">
                                          {details.sender?.split('<')[0]?.trim() || details.sender || 'Unknown'}
                                        </p>
                                        <p className="text-[10px] text-gray-455 truncate">
                                          {details.sender?.match(/<([^>]+)>/)?.[1] || ''}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  
                                  {/* Subject & body text excerpt */}
                                  <td className="p-4 min-w-[200px]">
                                    <div className="min-w-0">
                                      <p className={`text-xs text-[#172b4d] dark:text-[#f0f6fc] truncate ${isNew ? 'font-bold' : 'font-medium'}`}>
                                        {item.title}
                                      </p>
                                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 max-w-[450px]">
                                        {item.description}
                                      </p>
                                    </div>
                                  </td>
                                  
                                  {/* Attachment Indicator */}
                                  <td className="p-4 text-center">
                                    {hasAtts ? (
                                      <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-0.5 border border-indigo-500/10">
                                        <Paperclip className="w-3 h-3" /> {details.attachments.length}
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 dark:text-gray-700">—</span>
                                    )}
                                  </td>
                                  
                                  {/* Relative Received Time */}
                                  <td className="p-4 text-center text-gray-400 whitespace-nowrap font-medium">
                                    {formatRelativeTime(item.createdAt)}
                                  </td>
                                  
                                  {/* Inbox Status */}
                                  <td className="p-4 text-center whitespace-nowrap">
                                    {isNew ? (
                                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-455 font-bold rounded-full text-[9px] border border-indigo-500/10">
                                        New
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-655 dark:text-emerald-450 font-bold rounded-full text-[9px] border border-emerald-500/10 inline-flex items-center gap-0.5">
                                        <Check className="w-3 h-3" /> Converted
                                      </span>
                                    )}
                                  </td>
                                  
                                  {/* Actions */}
                                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-1.5 opacity-80 group-hover/row:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => setSelectedEmail(item)}
                                        className="btn-icon p-1.5 rounded-lg hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                                        title="Preview email"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      {isNew && (
                                        <button
                                          onClick={() => handleOpenConvert(item)}
                                          className="btn-icon p-1.5 rounded-lg hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors text-emerald-600"
                                          title="Convert to Card"
                                        >
                                          <CheckSquare className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => handleArchiveInboxItem(item.id, e)}
                                        className="btn-icon p-1.5 rounded-lg hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                        title="Archive email"
                                      >
                                        <Archive className="w-3.5 h-3.5" />
                                      </button>
                                      {isEditor && (
                                        <button
                                          onClick={(e) => handleDeleteInboxItem(item.id, e)}
                                          className="btn-icon p-1.5 rounded-lg hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                          title="Delete email"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card List View */}
                      <div className="block md:hidden divide-y divide-gray-150 dark:divide-gray-800">
                        {boardInboxItems.map((item) => {
                          const details = JSON.parse(item.sourceDetails || '{}');
                          const hasAtts = details.attachments && details.attachments.length > 0;
                          const isNew = item.status === 'NEW';
                          const initials = getInitials(details.sender || 'Unknown');
                          const avatarColor = getAvatarColor(details.sender || 'Unknown');
                          
                          return (
                            <div 
                              key={item.id} 
                              onClick={() => setSelectedEmail(item)}
                              className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-white/5 cursor-pointer active:bg-slate-100/50 dark:active:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                {/* Sender Avatar & Info */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${avatarColor}`}>
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-[#172b4d] dark:text-[#b6c2cf] truncate">
                                      {details.sender?.split('<')[0]?.trim() || details.sender || 'Unknown'}
                                    </p>
                                    <p className="text-[10px] text-gray-450 truncate">
                                      {details.sender?.match(/<([^>]+)>/)?.[1] || ''}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Status badge */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  {isNew ? (
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-455 font-bold rounded-full text-[9px] border border-indigo-500/10">
                                      New
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-655 dark:text-emerald-450 font-bold rounded-full text-[9px] border border-emerald-500/10 inline-flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Converted
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Subject & Preview */}
                              <div>
                                <h4 className={`text-xs font-bold text-[#172b4d] dark:text-[#f0f6fc] ${isNew ? 'font-black' : 'font-medium'}`}>
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                                  {item.description || 'No text preview available'}
                                </p>
                              </div>

                              {/* Footer (Attachments, Time, Actions) */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    {formatRelativeTime(item.createdAt)}
                                  </span>
                                  {hasAtts && (
                                    <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold text-[9px] inline-flex items-center gap-0.5 border border-indigo-500/10">
                                      <Paperclip className="w-2.5 h-2.5" /> {details.attachments.length}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedEmail(item)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-transform"
                                    title="Preview email"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {isNew && (
                                    <button
                                      onClick={() => handleOpenConvert(item)}
                                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/25 active:scale-95 transition-transform"
                                      title="Convert to Card"
                                    >
                                      <CheckSquare className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleArchiveInboxItem(item.id, e)}
                                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/25 active:scale-95 transition-transform"
                                    title="Archive email"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                  {isEditor && (
                                    <button
                                      onClick={(e) => handleDeleteInboxItem(item.id, e)}
                                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 active:scale-95 transition-transform"
                                      title="Delete email"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start min-h-full">
                  {/* Left Side settings subtab menu */}
                  <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 md:space-y-1 md:col-span-1 md:border-r border-b md:border-b-0 border-gray-250/40 dark:border-gray-800/40 md:pr-4">
                    {[
                      { id: 'advanced', label: 'General Config', icon: Settings },
                      { id: 'automation', label: 'Routing Rules', icon: Cpu },
                      { id: 'logs', label: 'Delivery Logs', icon: ShieldAlert }
                    ].map(subTab => {
                      const Icon = subTab.icon;
                      return (
                        <button
                          key={subTab.id}
                          onClick={() => setActiveSettingsTab(subTab.id as SettingsSubTab)}
                          className={`px-3 py-2 text-xs font-bold flex items-center gap-2 rounded-xl transition-colors whitespace-nowrap md:w-full shrink-0 ${
                            activeSettingsTab === subTab.id
                              ? 'bg-indigo-500/10 text-indigo-655 dark:text-indigo-400'
                              : 'text-gray-500 hover:bg-gray-150/40 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" /> {subTab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Side settings subtab contents */}
                  <div className="md:col-span-3 space-y-4">
                    {activeSettingsTab === 'advanced' && (
                      <form onSubmit={handleSaveSettings} className="bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm space-y-4 text-xs">
                        <div className="border-b border-gray-100 dark:border-gray-850 pb-2 mb-3">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-[#f0f6fc]">Board Inbox Configurations</h3>
                          <p className="text-[10px] text-gray-400 mt-0.5">Control default conversion defaults and allowed senders lists.</p>
                            {/* Custom incoming email address input */}
                        <div>
                          <label className="tf-label font-bold">Incoming Board Email Address</label>
                          <input
                            type="email"
                            placeholder="inbox@mccmrfip.in"
                            value={emailAddress}
                            onChange={e => setEmailAddress(e.target.value)}
                            className="tf-input rounded-xl font-mono text-xs w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800"
                          />
                          <span className="text-[9px] text-gray-455 mt-1 block">
                            Define the email address you want to route to this board (e.g., inbox@mccmrfip.in). Make sure this matches your Cloudflare Email Routing configuration.
                          </span>
                        </div>                      </div>
                        
                        {/* Auto conversion toggle */}
                        <label className="flex items-center justify-between p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer hover:bg-slate-100/40 dark:hover:bg-white/10 transition-colors">
                          <div className="pr-4">
                            <span className="font-bold text-[#172b4d] dark:text-[#b6c2cf] block">Automatically convert forwarded emails</span>
                            <span className="text-[10px] text-gray-400 leading-normal block mt-0.5">When enabled, incoming emails bypass the inbox and instantly create task cards based on your configurations below.</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={emailAutomationEnabled}
                            onChange={e => setEmailAutomationEnabled(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 shrink-0"
                          />
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="tf-label font-bold">Default Column Target</label>
                            <select
                              value={emailListId}
                              onChange={e => setEmailListId(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                            >
                              <option value="">-- Choose Column (Defaults to First) --</option>
                              {activeBoard.lists?.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="tf-label font-bold">Default Card Priority</label>
                            <select
                              value={emailPriority}
                              onChange={e => setEmailPriority(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </select>
                          </div>
                        </div>

                        <label className="flex items-center justify-between p-3 border border-gray-150 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer">
                          <div>
                            <span className="font-bold text-[#172b4d] dark:text-[#b6c2cf] block">Enable Spam Keywords Filter</span>
                            <span className="text-[10px] text-gray-400">Block incoming emails containing spam markers (free cash, lottery winner, credit checks, etc.)</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={emailSpamFilter}
                            onChange={e => setEmailSpamFilter(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4"
                          />
                        </label>

                        <div>
                          <label className="tf-label font-bold flex items-center gap-1">
                            Allowed Sender Domains / Addresses
                            <span title="Enter 'ANY' for no restrictions, or comma-separated domain suffixes like corporate.com, client.org." className="text-gray-400 cursor-help font-normal">ⓘ</span>
                          </label>
                          <input
                            type="text"
                            placeholder="ANY, or domains (e.g. corporate.com, client.com)"
                            value={emailAllowedSenders}
                            onChange={e => setEmailAllowedSenders(e.target.value)}
                            className="tf-input rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <div>
                            <label className="tf-label font-bold">Max Attachment Size Limit (MB)</label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={emailAttachmentLimit}
                              onChange={e => setEmailAttachmentLimit(Number(e.target.value))}
                              className="tf-input rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="tf-label font-bold">When email matches an existing thread</label>
                            <select
                              value={emailThreadAction}
                              onChange={e => setEmailThreadAction(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                            >
                              <option value="COMMENT">Post reply as Card Comment</option>
                              <option value="ACTIVITY">Log reply in Card Activity Log</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="tf-label font-bold mb-1 block">Auto-Assign Members to Converted Cards</label>
                          <div className="max-h-24 overflow-y-auto border border-gray-250 dark:border-gray-800 rounded-xl p-2.5 space-y-1.5 bg-slate-50 dark:bg-white/5">
                            {currentWorkspace?.members.map(m => (
                              <label key={m.user.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-350">
                                <input 
                                  type="checkbox"
                                  checked={emailAutoAssignees.includes(m.user.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEmailAutoAssignees([...emailAutoAssignees, m.user.id]);
                                    } else {
                                      setEmailAutoAssignees(emailAutoAssignees.filter(id => id !== m.user.id));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span>{m.user.name || m.user.username}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="tf-label font-bold">Default Card Labels (Comma-separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. Support, Client, Feedback"
                            value={emailDefaultLabels}
                            onChange={e => setEmailDefaultLabels(e.target.value)}
                            className="tf-input rounded-xl"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="btn-primary justify-center font-bold px-6 py-2 rounded-xl shrink-0"
                        >
                          {savingSettings ? 'Saving Settings...' : 'Save Configurations'}
                        </button>
                      </form>
                    )}

                    {activeSettingsTab === 'automation' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 space-y-3">
                          <div className="border-b border-gray-100 dark:border-gray-850 pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8d96a0]">Current Auto-Routing Rules</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Bypass general inbox and route specifically when rules match.</p>
                          </div>
                          
                          {gmailRules.filter(r => r.targetBoardId === selectedBoardId).length === 0 ? (
                            <div className="border border-dashed border-gray-250 dark:border-gray-800 p-8 text-center rounded-2xl bg-white dark:bg-[#1c2128] text-gray-400 text-xs">
                              <Cpu className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                              No active auto-routing rules configured for this board.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {gmailRules.filter(r => r.targetBoardId === selectedBoardId).map((rule) => (
                                <div 
                                  key={rule.id}
                                  className="bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-800 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase rounded">
                                        {rule.triggerType}
                                      </span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200">
                                        matches "{rule.triggerVal}"
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-450 mt-1">
                                      Route to column: {rule.targetListId ? 'Selected list' : 'First column'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="btn-icon p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    title="Delete rule"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm h-fit space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8d96a0]">Add Routing Rule</h3>
                          <form onSubmit={handleCreateRule} className="space-y-3.5 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Trigger Condition</label>
                              <select
                                value={ruleTriggerType}
                                onChange={e => setRuleTriggerType(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-slate-800 p-2 rounded-xl focus:outline-none"
                              >
                                <option value="SENDER">If Sender Address contains</option>
                                <option value="KEYWORD">If Subject contains Keyword</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Match Value</label>
                              <input
                                type="text"
                                placeholder={ruleTriggerType === 'SENDER' ? 'e.g. client@company.com or company.com' : 'e.g. Redesign, Urgent'}
                                value={ruleTriggerVal}
                                onChange={e => setRuleTriggerVal(e.target.value)}
                                className="tf-input rounded-xl"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Action: Auto Convert to Board</label>
                              <select
                                value={ruleTargetBoardId}
                                onChange={e => {
                                  setRuleTargetBoardId(e.target.value);
                                  setRuleTargetListId('');
                                }}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-slate-800 p-2 rounded-xl focus:outline-none"
                                required
                              >
                                <option value="">-- Choose Board --</option>
                                {currentWorkspace?.boards?.map(b => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                            </div>

                            {ruleTargetBoardId && (
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Column (Optional)</label>
                                <select
                                  value={ruleTargetListId}
                                  onChange={e => setRuleTargetListId(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-slate-800 p-2 rounded-xl focus:outline-none"
                                >
                                  <option value="">-- Defaults to First Column --</option>
                                  {currentWorkspace?.boards?.find(b => b.id === ruleTargetBoardId)?.lists?.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button
                              type="submit"
                              className="btn-primary w-full justify-center rounded-xl py-2 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Rule
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {activeSettingsTab === 'logs' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-2">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8d96a0]">Audit Trail Logs</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Logs of incoming emails delivery status.</p>
                          </div>
                          <button 
                            onClick={loadLogs} 
                            className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} /> Refresh logs
                          </button>
                        </div>

                        {loadingLogs ? (
                          <div className="text-center py-12 text-gray-400 text-xs">Loading logs...</div>
                        ) : emailLogs.length === 0 ? (
                          <div className="border border-dashed border-gray-250 dark:border-gray-800 p-8 text-center rounded-2xl bg-white dark:bg-[#1c2128] text-gray-400 text-xs">
                            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                            No logged delivery actions recorded yet for this address.
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm text-xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                                    <th className="p-3">Sender</th>
                                    <th className="p-3">Subject</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Diagnostic Details</th>
                                    <th className="p-3">Time</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                                  {emailLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                      <td className="p-3 font-semibold text-slate-800 dark:text-[#c9d1d9] truncate max-w-[120px]">{log.sender}</td>
                                      <td className="p-3 font-medium text-slate-700 dark:text-[#c9d1d9] truncate max-w-[160px]">{log.subject}</td>
                                      <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                          log.status === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-450' :
                                          log.status === 'SPAM' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-450' :
                                          'bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400'
                                        }`}>
                                          {log.status}
                                        </span>
                                      </td>
                                      <td className="p-3 text-gray-500 dark:text-gray-400 font-sans max-w-[320px] truncate" title={log.details}>
                                        {log.details}
                                      </td>
                                      <td className="p-3 text-gray-450 whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state py-12 text-center text-gray-500">
              Workspace boards are loading...
            </div>
          )}
        </div>
      </div>

      {/* ── EMAIL PREVIEW DRAWER (Slide In from Right) ── */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-[100] flex justify-end">
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#1c2128] border-l border-gray-250 dark:border-gray-800 h-full shadow-2xl flex flex-col animate-slide-in relative select-text"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-150 dark:border-gray-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-[#161a22]">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 font-bold rounded-full text-[10px]">
                    Email Preview
                  </span>
                  <span className="text-[10px] text-gray-450 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" /> {new Date(selectedEmail.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="btn-icon p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 sm:hidden"
                >
                  <X className="w-4 h-4 shrink-0" />
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedEmail.status === 'NEW' ? (
                  <button
                    onClick={() => { handleOpenConvert(selectedEmail); }}
                    className="btn-primary py-1.5 px-3 text-xs rounded-xl font-bold flex items-center gap-1 shadow-sm flex-1 sm:flex-initial justify-center"
                  >
                    <Plus className="w-4 h-4" /> Convert
                  </button>
                ) : (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-655 dark:text-emerald-450 text-xs font-bold rounded-xl inline-flex items-center gap-1 border border-emerald-500/20">
                    <Check className="w-4 h-4" /> Converted
                  </span>
                )}
                <button
                  onClick={(e) => handleArchiveInboxItem(selectedEmail.id, e)}
                  className="btn-secondary py-1.5 px-2.5 text-xs rounded-xl flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                  title="Archive email"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
                {isEditor && (
                  <button
                    onClick={(e) => handleDeleteInboxItem(selectedEmail.id, e)}
                    className="btn-secondary py-1.5 px-2.5 text-xs rounded-xl text-red-500 border-red-500/10 hover:bg-red-500/5 hover:border-red-500/20 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="btn-icon p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 hidden sm:block"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Email Sender/Subject details panel */}
            <div className="p-5 border-b border-gray-150 dark:border-gray-850 space-y-2.5 text-xs bg-slate-50/50 dark:bg-[#161a22]/20">
              <h1 className="text-sm font-bold text-slate-850 dark:text-[#f0f6fc] leading-snug">{selectedEmail.title}</h1>
              <div className="grid grid-cols-1 gap-1 text-gray-500 dark:text-[#8d96a0] font-sans">
                <div>
                  <span className="font-semibold inline-block w-14">From:</span>
                  <span className="text-slate-800 dark:text-slate-200">{JSON.parse(selectedEmail.sourceDetails || '{}').sender}</span>
                </div>
                <div>
                  <span className="font-semibold inline-block w-14">To:</span>
                  <span className="text-slate-800 dark:text-slate-200 break-all">{JSON.parse(selectedEmail.sourceDetails || '{}').recipients}</span>
                </div>
              </div>

              {/* Attachments Section */}
              {JSON.parse(selectedEmail.sourceDetails || '{}').attachments?.length > 0 && (
                <div className="pt-3 border-t border-gray-200/50 dark:border-gray-850/50 mt-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Attachments:</span>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(selectedEmail.sourceDetails || '{}').attachments.map((att: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-gray-850 p-2 px-3 rounded-xl text-[11px] flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="font-bold truncate max-w-[150px] text-slate-850 dark:text-slate-250" title={att.filename}>{att.filename}</span>
                        <span className="text-gray-400">({(att.size / 1024).toFixed(0)} KB)</span>
                        <a
                          href={`/api/attachments/download/${att.storagePath}`}
                          download={att.filename}
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-indigo-500 shrink-0"
                          title="Download attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Tabs */}
            <div className="flex border-b border-gray-150 dark:border-gray-850 px-5 bg-slate-50/20">
              <button
                onClick={() => setPreviewTab('html')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                  previewTab === 'html'
                    ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                HTML Body
              </button>
              <button
                onClick={() => setPreviewTab('text')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                  previewTab === 'text'
                    ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Plain Text
              </button>
            </div>

            {/* Email Body Container */}
            <div className="flex-1 p-5 overflow-y-auto font-sans leading-relaxed text-sm text-slate-800 dark:text-[#c9d1d9] bg-white dark:bg-[#1c2128]">
              {previewTab === 'text' ? (
                <pre className="font-sans text-xs whitespace-pre-wrap leading-relaxed select-text font-medium">
                  {JSON.parse(selectedEmail.sourceDetails || '{}').text || selectedEmail.description}
                </pre>
              ) : (
                <div 
                  className="bg-white p-4 rounded-xl border border-gray-200 text-black overflow-x-auto min-h-[160px] select-text"
                  dangerouslySetInnerHTML={{ __html: JSON.parse(selectedEmail.sourceDetails || '{}').html || selectedEmail.description }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CARD CONVERSION MODAL ── */}
      {convertModalOpen && convertItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#161a22] border border-gray-250 dark:border-[#30363d] rounded-2xl shadow-2xl p-5 md:p-6 animate-scale-in relative text-xs"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setConvertModalOpen(false)}
              className="absolute right-4 top-4 btn-icon p-1 rounded-lg"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="font-bold text-sm text-[#172b4d] dark:text-[#b6c2cf] mb-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-850 pb-2">
              <CheckSquare className="w-4.5 h-4.5 text-indigo-500" /> Convert Email to Task Card
            </h3>

            {convertedCardId ? (
              <div className="py-6 text-center space-y-4 animate-scale-in">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-650 dark:text-emerald-450 flex items-center justify-center mx-auto text-xl font-bold animate-bounce border border-emerald-500/20">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-slate-850 dark:text-[#f0f6fc]">Card Created Successfully!</p>
                  <p className="text-gray-400 mt-1">The email has been converted and linked to your board.</p>
                </div>
                <div className="flex gap-2.5 justify-center pt-2">
                  <button
                    onClick={() => {
                      setConvertModalOpen(false);
                      onSelectBoard(convertBoardId);
                    }}
                    className="btn-primary py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Board View
                  </button>
                  <button
                    onClick={() => setConvertModalOpen(false)}
                    className="btn-secondary py-2 px-4 rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConvertSubmit} className="space-y-4">
                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase mb-1">Card Subject Title</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs truncate leading-snug">{convertItem.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="tf-label font-bold">Target Board</label>
                    <select
                      value={convertBoardId}
                      onChange={e => setConvertBoardId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                      required
                    >
                      {currentWorkspace?.boards?.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="tf-label font-bold">Target Column</label>
                    <select
                      value={convertListId}
                      onChange={e => setConvertListId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Column --</option>
                      {currentWorkspace?.boards?.find(b => b.id === convertBoardId)?.lists?.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="tf-label font-bold">Priority</label>
                    <select
                      value={convertPriority}
                      onChange={e => setConvertPriority(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="tf-label font-bold">Due Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={convertDueDate}
                      onChange={e => setConvertDueDate(e.target.value)}
                      className="tf-input rounded-xl py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="tf-label font-bold">Card Labels (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Client, Urgent, Redesign"
                    value={convertLabels}
                    onChange={e => setConvertLabels(e.target.value)}
                    className="tf-input rounded-xl"
                  />
                </div>

                {/* Checklist block */}
                <div>
                  <label className="tf-label font-bold mb-1 block">Checklist Items ({convertChecklist.length})</label>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto mb-2 border border-gray-200 dark:border-gray-800 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5">
                    {convertChecklist.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-1 px-2.5 bg-white dark:bg-[#1d2125] border border-gray-150 dark:border-gray-800 rounded-lg">
                        <span className="truncate flex-1 pr-1 font-medium">{item}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveConvertChecklist(idx)}
                          className="text-red-500 hover:text-red-700 font-bold shrink-0 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {convertChecklist.length === 0 && (
                      <span className="text-[10px] text-gray-400 block text-center py-2">No checklist items. Add one below.</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add checklist item..."
                      value={newChecklistItem}
                      onChange={e => setNewChecklistItem(e.target.value)}
                      className="tf-input rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleAddConvertChecklist}
                      className="btn-secondary py-1 px-3.5 rounded-xl font-bold shrink-0 text-indigo-650 dark:text-indigo-400"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Member selection block */}
                <div>
                  <label className="tf-label font-bold mb-1 block">Assign Members</label>
                  <div className="max-h-24 overflow-y-auto border border-gray-250 dark:border-gray-800 rounded-xl p-2.5 space-y-1.5 bg-slate-50 dark:bg-white/5">
                    {currentWorkspace?.members.map(m => (
                      <label key={m.user.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-350">
                        <input 
                          type="checkbox"
                          checked={convertAssignees.includes(m.user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConvertAssignees([...convertAssignees, m.user.id]);
                            } else {
                              setConvertAssignees(convertAssignees.filter(id => id !== m.user.id));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span>{m.user.name || m.user.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Default Conversion preferences toggler */}
                <label className="flex items-center gap-2 cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={saveAsDefaultPreferences}
                    onChange={(e) => setSaveAsDefaultPreferences(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span className="text-[10px] text-gray-500 font-semibold">Save these selections as default settings for this board</span>
                </label>

                <button
                  type="submit"
                  disabled={converting}
                  className="btn-primary w-full justify-center py-2.5 rounded-xl font-bold mt-2"
                >
                  {converting ? 'Converting to card...' : 'Convert to Card'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
