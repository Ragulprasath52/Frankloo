import React, { useState, useEffect } from 'react';
import {
  Users, Search, Trash2, Send, AlertCircle, RefreshCw, X, MoreVertical, Plus, Copy,
  CheckCircle, Shield, Check, Activity, LogOut, Key
} from 'lucide-react';
import { useStore, getAvatarUrl } from '../store/useStore';

interface MembersModuleProps {
  workspaceId: string;
  isEditor: boolean;
  onSelectBoard: (boardId: string) => void;
}

// Role Badges config
const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OWNER: { label: 'Owner', bg: 'bg-amber-500/5', text: 'text-amber-600 dark:text-amber-400 border-amber-500/10', border: 'border-amber-500/10' },
  ADMIN: { label: 'Admin', bg: 'bg-purple-500/5', text: 'text-purple-600 dark:text-purple-400 border-purple-500/10', border: 'border-purple-500/10' },
  MEMBER: { label: 'Member', bg: 'bg-slate-500/5', text: 'text-slate-600 dark:text-slate-400 border-slate-500/10', border: 'border-slate-500/10' },
  VIEWER: { label: 'Guest', bg: 'bg-slate-500/5', text: 'text-slate-600 dark:text-slate-400 border-slate-500/10', border: 'border-slate-500/10' }
};

export default function MembersModule({ workspaceId, isEditor, onSelectBoard }: MembersModuleProps) {
  const {
    currentWorkspace,
    fetchWorkspaceDetails,
    inviteMember,
    removeMember,
    updateMemberRole,
    workspaceInvitations,
    fetchWorkspaceInvitations,
    revokeInvitation,
    resendInvitation,
    workspaceActivity,
    fetchWorkspaceActivity,
    user,
    addToast,
    showConfirm,
    gmailProfile,
    fetchGmailProfile,
    updateBoardMember,
    revokeBoardMember
  } = useStore();

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'online' | 'away' | 'offline'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'joinDate' | 'lastActive'>('name');

  // Modals & Popovers
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeDropdownMemberId, setActiveDropdownMemberId] = useState<string | null>(null);
  const [editingRoleMemberId, setEditingRoleMemberId] = useState<string | null>(null);
  const [activeBoardTooltipId, setActiveBoardTooltipId] = useState<string | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN' | 'VIEWER'>('MEMBER');
  const [personalMessage, setPersonalMessage] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // Board Access & Permissions Management State
  const [accessMember, setAccessMember] = useState<any>(null);
  const [memberBoardAccess, setMemberBoardAccess] = useState<Record<string, { enabled: boolean; role: string }>>({});
  const [boardSearch, setBoardSearch] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);

  // Invite Board Access State
  const [selectAllBoards, setSelectAllBoards] = useState(true);
  const [customBoardAccess, setCustomBoardAccess] = useState<Record<string, { enabled: boolean; role: string }>>({});
  const [inviteBoardSearch, setInviteBoardSearch] = useState('');

  // Mobile Bottom Sheet Action State
  const [mobileActionsMember, setMobileActionsMember] = useState<any>(null);

  // Copy success feedback helper state
  const [copiedLinkToken, setCopiedLinkToken] = useState<string | null>(null);

  // Activity feed filtering state
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'MEMBERS' | 'BOARDS' | 'INVITATIONS' | 'PERMISSIONS'>('ALL');

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownMemberId(null);
      setActiveBoardTooltipId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (inviteModalOpen) {
      const initialAccess: Record<string, { enabled: boolean; role: string }> = {};
      const wsBoards = currentWorkspace?.boards || [];
      wsBoards.forEach((b: any) => {
        initialAccess[b.id] = { enabled: false, role: 'EDITOR' };
      });
      setCustomBoardAccess(initialAccess);
      setSelectAllBoards(true);
      setInviteBoardSearch('');
    }
  }, [inviteModalOpen, currentWorkspace]);

  useEffect(() => {
    if (accessMember) {
      const initialAccess: Record<string, { enabled: boolean; role: string }> = {};
      const wsBoards = currentWorkspace?.boards || [];
      wsBoards.forEach((b: any) => {
        const existing = accessMember.boards?.find((mb: any) => mb.id === b.id);
        initialAccess[b.id] = {
          enabled: !!existing,
          role: existing ? existing.role : 'EDITOR'
        };
      });
      setMemberBoardAccess(initialAccess);
      setBoardSearch('');
    }
  }, [accessMember, currentWorkspace]);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceDetails(workspaceId);
      fetchWorkspaceInvitations(workspaceId);
      fetchWorkspaceActivity(workspaceId);
      fetchGmailProfile?.().catch(console.error);
    }
  }, [workspaceId, fetchWorkspaceDetails, fetchWorkspaceInvitations, fetchWorkspaceActivity, fetchGmailProfile]);

  const members = currentWorkspace?.members || [];
  const pendingCount = workspaceInvitations?.length || 0;

  const handleSaveAccess = async () => {
    if (!accessMember || savingAccess) return;
    setSavingAccess(true);
    try {
      const promises: Promise<any>[] = [];
      const wsBoards = currentWorkspace?.boards || [];
      
      for (const b of wsBoards) {
        const state = memberBoardAccess[b.id];
        const existing = accessMember.boards?.find((mb: any) => mb.id === b.id);

        if (state.enabled && (!existing || existing.role !== state.role)) {
          promises.push(updateBoardMember(workspaceId, accessMember.user.id, b.id, state.role));
        } else if (!state.enabled && existing) {
          promises.push(revokeBoardMember(workspaceId, b.id, accessMember.user.id));
        }
      }

      await Promise.all(promises);
      addToast('Permissions Updated', 'Board access permissions updated successfully.', 'success');
      setAccessMember(null);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update board permissions', 'error');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviteError(null);
    setInviting(true);

    try {
      let boardAccessPayload: any = 'ALL';
      if (!selectAllBoards) {
        boardAccessPayload = Object.entries(customBoardAccess)
          .filter(([_, value]) => value.enabled)
          .map(([boardId, value]) => ({ boardId, role: value.role }));
      }

      await inviteMember(workspaceId, inviteEmail.trim(), inviteRole, personalMessage, boardAccessPayload);
      setInviteEmail('');
      setPersonalMessage('');
      addToast('Invitation Sent', 'Invitation sent successfully!', 'success');
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      await resendInvitation(workspaceId, invitationId);
      addToast('Invitation Sent', 'Workspace invitation has been delivered successfully.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to resend invitation', 'error');
    }
  };

  const handleRevoke = async (invitationId: string) => {
    const confirmed = await showConfirm(
      'Revoke Invitation',
      'Are you sure you want to revoke this invitation?'
    );
    if (!confirmed) return;
    try {
      await revokeInvitation(workspaceId, invitationId);
      addToast('Invitation Revoked', 'The pending workspace invitation was cancelled.', 'info');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to revoke invitation', 'error');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const acceptLink = `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(acceptLink);
    setCopiedLinkToken(token);
    addToast('Link Copied', 'Invitation link copied to clipboard.', 'success');
    setTimeout(() => setCopiedLinkToken(null), 2000);
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (mIdIsOwner(memberId)) {
      addToast('Action Prohibited', 'Cannot remove the workspace owner.', 'warning');
      return;
    }
    const confirmed = await showConfirm(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this workspace?`
    );
    if (!confirmed) return;
    try {
      await removeMember(workspaceId, memberId);
      addToast('Member Removed', 'The user was successfully removed from the workspace.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to remove member', 'error');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(workspaceId, memberId, newRole);
      addToast('Role Updated', 'Member permissions updated successfully.', 'success');
      setEditingRoleMemberId(null);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update member role', 'error');
    }
  };

  const mIdIsOwner = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.role === 'OWNER';
  };

  // Helper to highlight matching text in search results
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded px-0.5 font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Search filtering
  const filteredMembers = members
    .filter(m => {
      const search = searchQuery.toLowerCase().trim();
      if (!search) {
        const matchRole = roleFilter === 'ALL' ? true : m.role === roleFilter;
        const matchStatus = statusFilter === 'ALL' ? true : m.presence === statusFilter;
        return matchRole && matchStatus;
      }
      
      const matchName = (m.user.name || '').toLowerCase().includes(search);
      const matchUsername = m.user.username.toLowerCase().includes(search);
      const matchEmail = (m.user.email || '').toLowerCase().includes(search);
      const matchRole = (ROLE_BADGES[m.role]?.label || '').toLowerCase().includes(search);
      const matchBoard = m.role === 'OWNER' || m.role === 'ADMIN'
        ? 'all boards'.includes(search)
        : m.boards?.some((b: any) => b.name.toLowerCase().includes(search)) || false;

      const matchRoleFilter = roleFilter === 'ALL' ? true : m.role === roleFilter;
      const matchStatusFilter = statusFilter === 'ALL' ? true : m.presence === statusFilter;

      return (matchName || matchUsername || matchEmail || matchRole || matchBoard) && matchRoleFilter && matchStatusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.user.name || a.user.username;
        const nameB = b.user.name || b.user.username;
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'joinDate') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        const statusWeight: Record<string, number> = { online: 3, away: 2, offline: 1 };
        const weightA = statusWeight[a.presence || 'offline'] || 1;
        const weightB = statusWeight[b.presence || 'offline'] || 1;
        return weightB - weightA;
      }
    });

  // Expiration date calculator for invites
  const getExpiryText = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const expiryDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  // Activity filter logic
  const filteredActivity = workspaceActivity.filter(log => {
    if (activityFilter === 'ALL') return true;
    const details = (log.details || '').toLowerCase();
    if (activityFilter === 'MEMBERS') {
      return details.includes('joined') || details.includes('member') || details.includes('removed') || details.includes('left');
    }
    if (activityFilter === 'BOARDS') {
      return details.includes('board') || details.includes('card');
    }
    if (activityFilter === 'INVITATIONS') {
      return details.includes('invite') || details.includes('invitation') || details.includes('accepted') || details.includes('revoked') || details.includes('cancelled');
    }
    if (activityFilter === 'PERMISSIONS') {
      return details.includes('role') || details.includes('permission') || details.includes('owner') || details.includes('admin') || details.includes('access');
    }
    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      
      {/* ── Page Header Section ── */}
      <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-slate-700 dark:text-slate-200" /> 
              <span>Members</span>
              <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full dark:text-slate-300">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage roles, permissions, and workspace membership settings.
            </p>
          </div>
          {isEditor && (
            <button 
              onClick={() => setInviteModalOpen(true)} 
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-705 text-white font-semibold text-xs py-2 px-3.5 rounded-lg shadow-sm active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Invite Teammate
            </button>
          )}
        </div>

        {/* ── Toolbar: Search & Filters ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-grow max-w-lg w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, username, email, board, role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] focus:border-slate-400 dark:focus:border-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 text-slate-900 dark:text-slate-100 transition-all placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          
          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-slate-405 dark:text-slate-400 font-semibold uppercase tracking-wider">Role</span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="dark:bg-[#161b22]">All Roles</option>
                <option value="OWNER" className="dark:bg-[#161b22]">Owner</option>
                <option value="ADMIN" className="dark:bg-[#161b22]">Admin</option>
                <option value="MEMBER" className="dark:bg-[#161b22]">Member</option>
                <option value="VIEWER" className="dark:bg-[#161b22]">Guest</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-slate-405 dark:text-slate-400 font-semibold uppercase tracking-wider">Status</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="dark:bg-[#161b22]">All Statuses</option>
                <option value="online" className="dark:bg-[#161b22]">Online</option>
                <option value="away" className="dark:bg-[#161b22]">Away</option>
                <option value="offline" className="dark:bg-[#161b22]">Offline</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-slate-405 dark:text-slate-400 font-semibold uppercase tracking-wider">Sort</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="name" className="dark:bg-[#161b22]">Name</option>
                <option value="joinDate" className="dark:bg-[#161b22]">Date Joined</option>
                <option value="lastActive" className="dark:bg-[#161b22]">Activity</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Members List ── */}
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-slate-50/50 dark:bg-[#0d0d0f]/20 rounded-xl border border-dashed border-slate-200 dark:border-[#30363d] max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#161b22] text-slate-400 dark:text-slate-400 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-1">Invite your first teammate.</h3>
          <p className="text-xs text-slate-400 dark:text-slate-400 max-w-xs mb-4">
            Get your team members on board to collaborate, track milestones, and manage workflows together.
          </p>
          {isEditor && (
            <button 
              onClick={() => setInviteModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-medium"
            >
              Invite Member
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#161b22]/50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Board Access</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last Active</th>
                  <th className="px-6 py-3.5 w-12 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#30363d] text-xs">
                {filteredMembers.map((m) => {
                  const badge = ROLE_BADGES[m.role] || ROLE_BADGES.MEMBER;
                  
                  const presenceColors = {
                    online: 'bg-emerald-500',
                    away: 'bg-amber-500',
                    offline: 'bg-slate-400'
                  };
                  const presenceColor = presenceColors[m.presence as 'online'|'away'|'offline'] || presenceColors.offline;
                  const presenceText = m.presence === 'online' ? 'Online' : m.presence === 'away' ? 'Away' : 'Offline';

                  // Custom Board Chips
                  const maxChips = 3;
                  const boardList = m.boards || [];
                  const displayedBoards = boardList.slice(0, maxChips);
                  const remainingCount = boardList.length - maxChips;

                  return (
                    <tr 
                      key={m.id} 
                      onClick={() => setSelectedMember(m)}
                      className="hover:bg-slate-50/50 dark:hover:bg-[#161b22]/20 transition-colors cursor-pointer group"
                    >
                      {/* Member Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-[#30363d]">
                            {m.user.avatarUrl ? (
                              <img
                                src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                                alt="avatar"
                                className="w-full h-full object-cover bg-slate-100"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextSibling as HTMLDivElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-xs uppercase"
                              style={{ display: m.user.avatarUrl ? 'none' : 'flex' }}
                            >
                              {(m.user.name || m.user.username).charAt(0)}
                            </div>
                          </div>
                          <div className="space-y-0.5 truncate max-w-[200px]">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                              {highlightText(m.user.name || m.user.username, searchQuery)}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              @{highlightText(m.user.username, searchQuery)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Display */}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        {editingRoleMemberId === m.id && isEditor && m.role !== 'OWNER' && m.user.id !== user?.id ? (
                          <select
                            value={m.role}
                            autoFocus
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            onBlur={() => setEditingRoleMemberId(null)}
                            className="text-xs bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-slate-100"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                            <option value="VIEWER">Guest</option>
                          </select>
                        ) : (
                          <button
                            disabled={!isEditor || m.role === 'OWNER' || m.user.id === user?.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoleMemberId(m.id);
                            }}
                            className={`inline-flex px-1.5 py-0.5 border rounded text-[9px] font-bold tracking-wider uppercase ${badge.bg} ${badge.text} ${badge.border} transition-opacity hover:opacity-90`}
                          >
                            {badge.label}
                          </button>
                        )}
                      </td>

                      {/* Board Access chips */}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {m.role === 'OWNER' || m.role === 'ADMIN' ? (
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">All Boards</span>
                          ) : boardList.length > 0 ? (
                            <>
                              {displayedBoards.map((b: any) => (
                                <span 
                                  key={b.id} 
                                  onClick={() => onSelectBoard(b.id)}
                                  className="inline-flex items-center bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-750 dark:text-slate-200 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer"
                                >
                                  {highlightText(b.name, searchQuery)}
                                </span>
                              ))}

                              {remainingCount > 0 && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveBoardTooltipId(activeBoardTooltipId === m.id ? null : m.id);
                                    }}
                                    className="inline-flex bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-605 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium"
                                  >
                                    +{remainingCount} more
                                  </button>
                                  
                                  {activeBoardTooltipId === m.id && (
                                    <div 
                                      className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-lg shadow-lg p-2.5 z-30 space-y-1 animate-fade-in"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                                        Assigned Boards
                                      </p>
                                      <div className="max-h-24 overflow-y-auto space-y-1 pt-1.5">
                                        {boardList.slice(maxChips).map((b: any) => (
                                          <div 
                                            key={b.id} 
                                            onClick={() => { onSelectBoard(b.id); setActiveBoardTooltipId(null); }}
                                            className="text-[11px] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 py-0.5 cursor-pointer truncate"
                                          >
                                            {b.name}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {isEditor && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setAccessMember(m);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Key className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No access</span>
                          )}
                        </div>
                      </td>

                      {/* Presence Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${presenceColor}`} />
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">{presenceText}</span>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-350">
                        {m.lastActive || 'Offline'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveDropdownMemberId(activeDropdownMemberId === m.id ? null : m.id);
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeDropdownMemberId === m.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-lg shadow-lg py-1.5 z-20 text-left text-xs animate-fade-in">
                              <button
                                onClick={() => { setSelectedMember(m); setActiveDropdownMemberId(null); }}
                                className="w-full px-3 py-1.5 text-slate-750 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium"
                              >
                                <Users className="w-3.5 h-3.5 text-slate-400" /> View Profile
                              </button>
                              {isEditor && m.role !== 'OWNER' && (
                                <button
                                  onClick={() => { setAccessMember(m); setActiveDropdownMemberId(null); }}
                                  className="w-full px-3 py-1.5 text-slate-750 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium"
                                >
                                  <Key className="w-3.5 h-3.5 text-slate-400" /> Board Access
                                </button>
                              )}
                              {isEditor && m.role !== 'OWNER' && m.user.id !== user?.id && (
                                <>
                                  <button
                                    onClick={() => { setEditingRoleMemberId(m.id); setActiveDropdownMemberId(null); }}
                                    className="w-full px-3 py-1.5 text-slate-755 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium"
                                  >
                                    <Shield className="w-3.5 h-3.5 text-slate-400" /> Change Role
                                  </button>
                                  <button
                                    onClick={() => {
                                      addToast('Deactivated', 'Member deactivated successfully. (Visual simulation)', 'success');
                                      setActiveDropdownMemberId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium"
                                  >
                                    <LogOut className="w-3.5 h-3.5 text-slate-400" /> Deactivate
                                  </button>
                                  <button
                                    onClick={() => { handleRemove(m.id, m.user.name || m.user.username); setActiveDropdownMemberId(null); }}
                                    className="w-full px-3 py-1.5 text-rose-605 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-medium border-t border-slate-100 dark:border-slate-800/60"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Remove Member
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Member Cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-[#30363d]">
            {filteredMembers.map((m) => {
              const badge = ROLE_BADGES[m.role] || ROLE_BADGES.MEMBER;
              const presenceColors = {
                online: 'bg-emerald-500',
                away: 'bg-amber-500',
                offline: 'bg-slate-400'
              };
              const presenceColor = presenceColors[m.presence as 'online'|'away'|'offline'] || presenceColors.offline;
              const presenceText = m.presence === 'online' ? 'Online' : m.presence === 'away' ? 'Away' : 'Offline';

              return (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-[#161b22]/20 active:bg-slate-100 dark:active:bg-[#161b22] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-[#30363d]">
                        {m.user.avatarUrl ? (
                          <img
                            src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                            alt="avatar"
                            className="w-full h-full object-cover bg-slate-100"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextSibling as HTMLDivElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-xs uppercase"
                          style={{ display: m.user.avatarUrl ? 'none' : 'flex' }}
                        >
                          {(m.user.name || m.user.username).charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{m.user.name || m.user.username}</p>
                        <p className="text-[10px] text-slate-400">@{m.user.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileActionsMember(m);
                      }}
                      className="p-1 rounded text-slate-400"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] font-medium uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${presenceColor}`} />
                        <span className="text-slate-500 dark:text-slate-300 capitalize">{presenceText}</span>
                      </span>
                    </div>

                    <span className="text-slate-400 dark:text-slate-405">
                      Active: {m.lastActive || 'offline'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pending Invitations & Recent Activity Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Pending Invitations list */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            Pending Invitations ({pendingCount})
          </h2>

          {(!workspaceInvitations || workspaceInvitations.length === 0) ? (
            <div className="p-6 text-center bg-slate-50/50 dark:bg-[#0d0d0f]/20 rounded-xl border border-dashed border-slate-200 dark:border-[#30363d] italic text-xs text-slate-400 dark:text-slate-500">
              No pending workspace invitations.
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#161b22]/50 text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Sent</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#30363d] text-xs">
                    {workspaceInvitations.map((inv) => {
                      const badge = ROLE_BADGES[inv.role] || ROLE_BADGES.MEMBER;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-[#161b22]/20 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200 max-w-[160px] truncate" title={inv.email}>
                            {inv.email}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 border rounded-full text-[9px] font-medium uppercase tracking-wide shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-350">
                            {new Date(inv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              {getExpiryText(inv.createdAt)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isEditor && (
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => handleCopyInviteLink(inv.token)}
                                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 relative group transition-colors"
                                  title="Copy invitation link"
                                >
                                  {copiedLinkToken === inv.token ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleResend(inv.id)}
                                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                                  title="Resend invitation email"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRevoke(inv.id)}
                                  className="p-1.5 rounded hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 transition-colors"
                                  title="Cancel invitation"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Workspace Activity Timeline */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" /> Workspace Activity
            </h2>
          </div>

          <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] rounded-xl p-4 shadow-sm space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
              {(['ALL', 'MEMBERS', 'BOARDS', 'INVITATIONS', 'PERMISSIONS'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActivityFilter(tab)}
                  className={`text-[9px] px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase transition-colors ${
                    activityFilter === tab 
                      ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-905' 
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#161b22] dark:text-slate-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {filteredActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No activity matching filter.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-100 dark:border-[#30363d] ml-1.5 pl-3.5 space-y-3.5 max-h-[280px] overflow-y-auto pr-1 pt-1 scrollbar-thin">
                {filteredActivity.map((log) => {
                  const logUser = log.user?.name || log.user?.username || 'Collaborator';
                  const logDate = new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={log.id} className="relative text-[11px] leading-tight space-y-0.5">
                      {/* Timeline dot */}
                      <span className="absolute -left-[20.5px] top-1 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 ring-4 ring-white dark:ring-[#0d0d0f]" />
                      
                      <p className="text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{logUser}</span> {log.details}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-400">
                        <span>{logDate}</span>
                        {log.board && (
                          <>
                            <span>•</span>
                            <span 
                              className="hover:underline cursor-pointer font-medium text-slate-500 dark:text-slate-350" 
                              onClick={() => onSelectBoard(log.board.id)}
                            >
                              {log.board.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Invite Member Modal ── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setInviteModalOpen(false)}>
          <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-xl p-5 w-full max-w-lg shadow-xl animate-scale-in text-xs max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Invite Workspace Member</h3>
              <button onClick={() => setInviteModalOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => { 
                handleInvite(e).then(() => { 
                  if (!inviteError) setInviteModalOpen(false); 
                }); 
              }} 
              className="space-y-4 pt-4 text-left"
            >
              {gmailProfile?.googleEmail && gmailProfile?.hasToken ? (
                <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="space-y-0.5 text-left text-[11px]">
                    <p className="font-semibold">Google OAuth Connected</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Sending directly from <strong className="text-slate-700 dark:text-slate-300">{gmailProfile.googleEmail}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 text-amber-700 dark:text-amber-400 p-3 rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-0.5 text-left text-[11px]">
                    <p className="font-semibold">Custom SMTP Server Default</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Connect Google OAuth in Settings to customize sender credentials.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Email or Username</label>
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="name@email.com or username"
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-slate-100 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Workspace Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="MEMBER">Member (Read & Write)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                    <option value="VIEWER">Guest (Read Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-1">Personal Note (Optional)</label>
                  <textarea
                    value={personalMessage}
                    onChange={e => setPersonalMessage(e.target.value)}
                    placeholder="Welcome message..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900 dark:text-slate-100 h-[38px] resize-none"
                  />
                </div>
              </div>

              {/* ── Board Access Section ── */}
              <div className="border-t border-slate-100 dark:border-[#30363d] pt-3.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">Initial Board Access</label>
                
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={selectAllBoards}
                      onChange={() => setSelectAllBoards(true)}
                      className="cursor-pointer text-slate-900 dark:text-slate-100 focus:ring-slate-400"
                    />
                    <span>All workspace boards</span>
                  </label>
                  <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={!selectAllBoards}
                      onChange={() => setSelectAllBoards(false)}
                      className="cursor-pointer text-slate-900 dark:text-slate-100 focus:ring-slate-400"
                    />
                    <span>Custom selection</span>
                  </label>
                </div>

                {!selectAllBoards && (
                  <div className="space-y-2 border border-slate-200 dark:border-[#30363d] rounded-lg p-3 bg-slate-50/50 dark:bg-[#0d0d0f]/20 animate-fade-in">
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-[#30363d]">
                      <input
                        type="text"
                        placeholder="Search boards..."
                        value={inviteBoardSearch}
                        onChange={e => setInviteBoardSearch(e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...customBoardAccess };
                          (currentWorkspace?.boards || []).forEach((b: any) => {
                            updated[b.id] = { ...updated[b.id], enabled: true };
                          });
                          setCustomBoardAccess(updated);
                        }}
                        className="text-[10px] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
                      >
                        Select All
                      </button>
                    </div>

                    {/* Chips for selected boards */}
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {Object.entries(customBoardAccess)
                        .filter(([_, val]) => val.enabled)
                        .map(([boardId, val]) => {
                          const board = (currentWorkspace?.boards || []).find((b: any) => b.id === boardId);
                          if (!board) return null;
                          return (
                            <span key={boardId} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200/50 dark:border-slate-700/50">
                              {board.name} ({val.role.toLowerCase()})
                              <button
                                type="button"
                                onClick={() => setCustomBoardAccess(prev => ({
                                  ...prev,
                                  [boardId]: { ...prev[boardId], enabled: false }
                                }))}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                    </div>

                    {/* Boards list with role dropdown */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(currentWorkspace?.boards || [])
                        .filter((b: any) => b.name.toLowerCase().includes(inviteBoardSearch.toLowerCase()))
                        .map((b: any) => {
                          const state = customBoardAccess[b.id] || { enabled: false, role: 'EDITOR' };
                          return (
                            <div key={b.id} className="flex items-center justify-between pt-1.5">
                              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-350">
                                <input
                                  type="checkbox"
                                  checked={state.enabled}
                                  onChange={() => setCustomBoardAccess(prev => ({
                                    ...prev,
                                    [b.id]: { ...state, enabled: !state.enabled }
                                  }))}
                                  className="rounded text-slate-900 focus:ring-slate-400"
                                />
                                <span>{b.name}</span>
                              </label>

                              {state.enabled && (
                                <select
                                  value={state.role}
                                  onChange={e => setCustomBoardAccess(prev => ({
                                    ...prev,
                                    [b.id]: { ...state, role: e.target.value }
                                  }))}
                                  className="px-2 py-0.5 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded text-[10px]"
                                >
                                  <option value="VIEWER">Viewer</option>
                                  <option value="COMMENTER">Commenter</option>
                                  <option value="EDITOR">Editor</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {inviteError && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-500/5 p-2.5 rounded-lg border border-rose-100 dark:border-rose-500/10">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {inviteError}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setInviteModalOpen(false)} className="px-3.5 py-1.5 border border-slate-205 dark:border-[#30363d] rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={inviting} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-705 disabled:opacity-60 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm">
                  {inviting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Invite Teammate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Board Access Modal ── */}
      {accessMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setAccessMember(null)}>
          <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-xl p-5 w-full max-w-md shadow-xl animate-scale-in text-xs max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Manage Board Access</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{accessMember.user.name || accessMember.user.username}</p>
              </div>
              <button onClick={() => setAccessMember(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-left">
              <div>
                <input
                  type="text"
                  placeholder="Search boards..."
                  value={boardSearch}
                  onChange={e => setBoardSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#30363d] rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Boards list */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                {(currentWorkspace?.boards || [])
                  .filter((b: any) => b.name.toLowerCase().includes(boardSearch.toLowerCase()))
                  .map((b: any) => {
                    const state = memberBoardAccess[b.id] || { enabled: false, role: 'EDITOR' };
                    return (
                      <div key={b.id} className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-350">
                          <input
                            type="checkbox"
                            checked={state.enabled}
                            onChange={() => setMemberBoardAccess(prev => ({
                              ...prev,
                              [b.id]: { ...state, enabled: !state.enabled }
                            }))}
                            className="rounded text-slate-900 focus:ring-slate-400"
                          />
                          <span>{b.name}</span>
                        </label>

                        {state.enabled && (
                          <select
                            value={state.role}
                            onChange={e => setMemberBoardAccess(prev => ({
                              ...prev,
                              [b.id]: { ...state, role: e.target.value }
                            }))}
                            className="px-2 py-0.5 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded text-[10px] cursor-pointer text-slate-900 dark:text-slate-100"
                          >
                            <option value="VIEWER">Viewer</option>
                            <option value="COMMENTER">Commenter</option>
                            <option value="EDITOR">Editor</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setAccessMember(null)} className="px-3.5 py-1.5 border border-slate-200 dark:border-[#30363d] rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                <button type="button" onClick={handleSaveAccess} disabled={savingAccess} className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-lg font-semibold flex items-center gap-1.5">
                  {savingAccess ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Member Profile Drawer (Slide-over) ── */}
      {selectedMember && (() => {
        const assignedCards = currentWorkspace?.boards?.flatMap(b => b.lists || [])
          .flatMap(l => l.cards || [])
          .filter(c => c.assignees?.some((a: any) => a.userId === selectedMember.user.id || a.user?.id === selectedMember.user.id)) || [];

        const memberActivity = workspaceActivity?.filter(act => act.userId === selectedMember.user.id) || [];

        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMember(null)}>
            <div 
              className="bg-white dark:bg-[#161b22] border-l border-slate-200 dark:border-[#30363d] w-full max-w-md h-full flex flex-col justify-between shadow-xl p-6 overflow-y-auto text-xs animate-slide-in relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-105">Teammate Profile</h3>
                  <button onClick={() => setSelectedMember(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Avatar + Basic Details */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-[#30363d]">
                    {selectedMember.user.avatarUrl ? (
                      <img
                        src={getAvatarUrl(selectedMember.user.avatarUrl, selectedMember.user.name || selectedMember.user.username)}
                        alt="avatar"
                        className="w-full h-full object-cover bg-slate-100"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextSibling as HTMLDivElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-lg uppercase"
                      style={{ display: selectedMember.user.avatarUrl ? 'none' : 'flex' }}
                    >
                      {(selectedMember.user.name || selectedMember.user.username).charAt(0)}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#161b22] ${
                      selectedMember.presence === 'online' ? 'bg-emerald-500' : selectedMember.presence === 'away' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {selectedMember.user.name || selectedMember.user.username}
                    </h4>
                    <p className="text-xs text-slate-400">@{selectedMember.user.username}</p>
                    <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                      ROLE_BADGES[selectedMember.role]?.bg || ROLE_BADGES.MEMBER.bg
                    } ${ROLE_BADGES[selectedMember.role]?.text || ROLE_BADGES.MEMBER.text} ${ROLE_BADGES[selectedMember.role]?.border || ROLE_BADGES.MEMBER.border}`}>
                      {ROLE_BADGES[selectedMember.role]?.label || 'Member'}
                    </span>
                  </div>
                </div>

                {/* Personal Info list */}
                <div className="bg-slate-50 dark:bg-[#0d0d0f]/20 p-4 rounded-xl border border-slate-200/60 dark:border-[#30363d] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Email</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold break-all select-all">{selectedMember.user.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Joined Workspace</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {new Date(selectedMember.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Presence</span>
                    <span className={`font-semibold uppercase text-[10px] ${
                      selectedMember.presence === 'online' ? 'text-emerald-500' : selectedMember.presence === 'away' ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                      {selectedMember.presence === 'online' ? 'Active Now' : selectedMember.lastActive || 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Assigned Tasks count / cards */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">Assigned Tasks ({assignedCards.length})</h4>
                  {assignedCards.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-550 italic">No tasks currently assigned to this teammate.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {assignedCards.map((c: any) => (
                        <div key={c.id} className="p-2.5 rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0d0d0f]/20 flex justify-between items-center">
                          <span className="font-medium text-slate-750 dark:text-slate-300 truncate max-w-[240px]">{c.title}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${
                            c.priority === 'URGENT' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20' : 
                            c.priority === 'HIGH' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20' : 'bg-slate-105 dark:bg-slate-800 text-slate-400'
                          }`}>{c.priority}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity logs timeline */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">Recent Member Activity</h4>
                  {memberActivity.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-550 italic">No activity recorded for this member.</p>
                  ) : (
                    <div className="relative border-l border-slate-100 dark:border-[#30363d] ml-1.5 pl-3.5 space-y-3.5 max-h-48 overflow-y-auto pr-1 pt-1 scrollbar-thin">
                      {memberActivity.map((log: any) => (
                        <div key={log.id} className="relative text-[11px] leading-tight text-slate-600 dark:text-slate-350">
                          <span className="absolute -left-[20.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 ring-4 ring-white dark:ring-[#161b22]" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{log.user?.name || log.user?.username}</span> {log.details}
                          <span className="block text-[9px] text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer actions / footer */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setSelectedMember(null)} 
                  className="w-full justify-center py-2 border border-slate-200 dark:border-[#30363d] rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Mobile Action Bottom Sheet ── */}
      {mobileActionsMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setMobileActionsMember(null)}>
          <div 
            className="bg-white dark:bg-[#161b22] w-full rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto p-5 space-y-4 animate-slide-in text-xs"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {mobileActionsMember.user.name || mobileActionsMember.user.username}
                </p>
                <p className="text-[10px] text-slate-400">@{mobileActionsMember.user.username}</p>
              </div>
              <button onClick={() => setMobileActionsMember(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-1">
              <button
                onClick={() => { setSelectedMember(mobileActionsMember); setMobileActionsMember(null); }}
                className="w-full text-left py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2.5 text-xs"
              >
                <Users className="w-4 h-4 text-slate-400" /> View Profile
              </button>
              
              {isEditor && mobileActionsMember.role !== 'OWNER' && (
                <button
                  onClick={() => { setAccessMember(mobileActionsMember); setMobileActionsMember(null); }}
                  className="w-full text-left py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2.5 text-xs"
                >
                  <Key className="w-4 h-4 text-slate-400" /> Board Access
                </button>
              )}

              {isEditor && mobileActionsMember.role !== 'OWNER' && mobileActionsMember.user.id !== user?.id && (
                <>
                  <button
                    onClick={() => { setEditingRoleMemberId(mobileActionsMember.id); setMobileActionsMember(null); }}
                    className="w-full text-left py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2.5 text-xs"
                  >
                    <Shield className="w-4 h-4 text-slate-400" /> Change Role
                  </button>
                  <button
                    onClick={() => {
                      addToast('Deactivated', 'Member deactivated successfully. (Visual simulation)', 'success');
                      setMobileActionsMember(null);
                    }}
                    className="w-full text-left py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 font-semibold flex items-center gap-2.5 text-xs"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" /> Deactivate
                  </button>
                  <button
                    onClick={() => { handleRemove(mobileActionsMember.id, mobileActionsMember.user.name || mobileActionsMember.user.username); setMobileActionsMember(null); }}
                    className="w-full text-left py-3 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 font-semibold flex items-center gap-2.5 text-xs border-t border-slate-100 dark:border-slate-800/60"
                  >
                    <Trash2 className="w-4 h-4 font-semibold text-rose-600" /> Remove Member
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
