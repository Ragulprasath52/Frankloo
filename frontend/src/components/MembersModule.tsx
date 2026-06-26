import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Mail, Search, Filter, Grid, List,
  Trash2, Send, Clock, Activity, Check, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { useStore, getAvatarUrl } from '../store/useStore';

interface MembersModuleProps {
  workspaceId: string;
  isEditor: boolean;
  onSelectBoard: (boardId: string) => void;
}

// Role Colors mapping
const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OWNER: { label: 'Owner', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  ADMIN: { label: 'Admin', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  MEMBER: { label: 'Member', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  VIEWER: { label: 'Guest', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' }
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
    showConfirm
  } = useStore();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'joinDate' | 'lastActive'>('name');
  const [viewType, setViewType] = useState<'list' | 'grid'>('grid');

  // Invite Member card state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN' | 'VIEWER'>('MEMBER');
  const [personalMessage, setPersonalMessage] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Sync data on load and when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceDetails(workspaceId);
      fetchWorkspaceInvitations(workspaceId);
      fetchWorkspaceActivity(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceDetails, fetchWorkspaceInvitations, fetchWorkspaceActivity]);

  // Statistics calculation
  const members = currentWorkspace?.members || [];
  const totalCount = members.length;
  const activeCount = members.filter(m => m.presence === 'online').length;
  const pendingCount = workspaceInvitations?.length || 0;
  const ownerCount = members.filter(m => m.role === 'OWNER').length;
  const adminCount = members.filter(m => m.role === 'ADMIN').length;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviteError(null);
    setInviteSuccess(false);
    setInviting(true);

    try {
      await inviteMember(workspaceId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setPersonalMessage('');
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 4000);
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
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update member role', 'error');
    }
  };

  const mIdIsOwner = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.role === 'OWNER';
  };

  // Search, filter and sorting application
  const filteredMembers = members
    .filter(m => {
      const matchSearch =
        (m.user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRole = roleFilter === 'ALL' ? true : m.role === roleFilter;
      return matchSearch && matchRole;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.user.name || a.user.username;
        const nameB = b.user.name || b.user.username;
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'joinDate') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        // online first, then away, then offline
        const statusWeight: Record<string, number> = { online: 3, away: 2, offline: 1 };
        const weightA = statusWeight[a.presence || 'offline'] || 1;
        const weightB = statusWeight[b.presence || 'offline'] || 1;
        return weightB - weightA;
      }
    });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 h-[calc(100vh-48px)] overflow-y-auto overflow-x-hidden animate-fade-in select-none">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-2">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" /> Team Workspace Directory
        </h1>
        <p className="text-xs sm:text-sm text-[#44546f] dark:text-[#9fadbc]">
          Manage permissions, invite new contributors, and monitor recent collaborator activity.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-center sm:items-start min-w-0">
            <p className="text-xs font-semibold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider">Total Members</p>
            <p className="text-xl font-bold text-[#172b4d] dark:text-[#b6c2cf]">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center font-bold text-[10px]">
              🟢
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-start min-w-0">
            <p className="text-xs font-semibold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider">Active Now</p>
            <p className="text-xl font-bold text-[#172b4d] dark:text-[#b6c2cf]">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-center sm:items-start min-w-0">
            <p className="text-xs font-semibold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider">Admins / Owners</p>
            <p className="text-xl font-bold text-[#172b4d] dark:text-[#b6c2cf]">{adminCount + ownerCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-center sm:items-start min-w-0">
            <p className="text-xs font-semibold text-[#44546f] dark:text-[#9fadbc] uppercase tracking-wider">Pending Invites</p>
            <p className="text-xl font-bold text-[#172b4d] dark:text-[#b6c2cf]">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Directory Search & List/Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-5 shadow-sm space-y-4">
            
            {/* Search, Filter and Toggle Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#44546f] dark:text-[#9fadbc]" />
                <input
                  type="text"
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="tf-input w-full text-sm"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-lg p-0.5 bg-gray-50 dark:bg-black/10 shrink-0">
                  <button
                    onClick={() => setViewType('list')}
                    className={`p-1.5 rounded-md transition-all ${viewType === 'list' ? 'bg-white dark:bg-[#2c333a] shadow-sm text-blue-500' : 'text-[#44546f] dark:text-[#9fadbc]'}`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewType('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewType === 'grid' ? 'bg-white dark:bg-[#2c333a] shadow-sm text-blue-500' : 'text-[#44546f] dark:text-[#9fadbc]'}`}
                    title="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
                
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="tf-input text-xs py-1.5 px-3 w-auto border-[#dfe1e6] dark:border-[#a6c5e229]"
                >
                  <option value="name">Sort by Name</option>
                  <option value="joinDate">Sort by Join Date</option>
                  <option value="lastActive">Sort by Activity</option>
                </select>
              </div>
            </div>

            {/* Role Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
              <span className="text-xs font-semibold text-[#44546f] dark:text-[#9fadbc] mr-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {(['ALL', 'OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${roleFilter === role ? 'bg-blue-600 border-blue-600 text-white font-medium shadow-sm' : 'bg-transparent border-[#dfe1e6] dark:border-[#a6c5e229] text-[#44546f] dark:text-[#9fadbc] hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                  {role === 'ALL' ? 'All Roles' : role === 'VIEWER' ? 'Guests' : role}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Listings */}
          {filteredMembers.length === 0 ? (
            <div className="border-2 border-dashed border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl py-12 text-center bg-white dark:bg-[#22272b]">
              <AlertCircle className="w-8 h-8 text-[#44546f] dark:text-[#9fadbc] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf]">No members found</p>
              <p className="text-xs text-[#44546f] dark:text-[#9fadbc] mt-1">Try resetting your filters or search query.</p>
            </div>
          ) : viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.map((m) => {
                const badge = ROLE_BADGES[m.role] || ROLE_BADGES.MEMBER;
                const userJoinDate = new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                
                // Presence Dot color
                const presenceColors = {
                  online: 'bg-emerald-500 ring-emerald-500/30',
                  away: 'bg-amber-400 ring-amber-400/30',
                  offline: 'bg-gray-400 ring-gray-400/30'
                };
                const presenceColor = presenceColors[m.presence as 'online'|'away'|'offline'] || presenceColors.offline;

                return (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group relative"
                  >
                    {/* Header: Avatar, Name, Role */}
                    {/* Header: Avatar, Name */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                            alt="avatar"
                            className="w-12 h-12 rounded-xl shrink-0 object-cover bg-slate-100"
                          />
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#22272b] ${presenceColor} flex items-center justify-center`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf] truncate" title={m.user.name || m.user.username}>
                            {m.user.name || m.user.username}
                          </p>
                          <p className="text-xs text-[#44546f] dark:text-[#9fadbc] truncate">@{m.user.username}</p>
                        </div>
                      </div>

                      {/* Show static badge or interactive role selector */}
                      {(!isEditor || m.role === 'OWNER' || m.user.id === user?.id) ? (
                        <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value)}
                          className={`appearance-none pl-2.5 pr-6 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider text-center shrink-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${badge.bg} ${badge.text} ${badge.border} transition-all`}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 0.4rem center',
                            backgroundSize: '0.55rem',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          <option value="MEMBER" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Member</option>
                          <option value="ADMIN" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Admin</option>
                          <option value="VIEWER" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Guest</option>
                        </select>
                      )}
                    </div>

                    {/* Email and Meta Data */}
                    <div className="space-y-1.5 text-xs text-[#44546f] dark:text-[#9fadbc]">
                      {m.user.email && (
                        <p className="truncate text-[#172b4d] dark:text-[#b6c2cf] font-medium" title={m.user.email}>
                          ✉️ {m.user.email}
                        </p>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#44546f] dark:text-[#9fadbc] shrink-0" />
                        <span>Joined {userJoinDate}</span>
                        <span className="mx-1">•</span>
                        <span className={`font-semibold ${m.presence === 'online' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                          {m.lastActive}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#dfe1e6] dark:border-[#a6c5e229] w-full pt-3" />

                    {/* Activity Stats */}
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] flex-1">
                        <div className="bg-slate-50 dark:bg-white/5 rounded p-1.5">
                          <p className="font-bold text-[#172b4d] dark:text-[#b6c2cf]">{m.activity?.cardsCreated || 0}</p>
                          <p className="text-[9px] text-[#44546f] dark:text-[#9fadbc] uppercase">Created</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 rounded p-1.5">
                          <p className="font-bold text-[#172b4d] dark:text-[#b6c2cf]">{m.activity?.tasksCompleted || 0}</p>
                          <p className="text-[9px] text-[#44546f] dark:text-[#9fadbc] uppercase">Done</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 rounded p-1.5">
                          <p className="font-bold text-[#172b4d] dark:text-[#b6c2cf]">{m.activity?.docsEdited || 0}</p>
                          <p className="text-[9px] text-[#44546f] dark:text-[#9fadbc] uppercase">Docs</p>
                        </div>
                      </div>

                      {/* Remove Button for Editor */}
                      {isEditor && m.role !== 'OWNER' && m.user.id !== user?.id && (
                        <button
                          onClick={() => handleRemove(m.id, m.user.name || m.user.username)}
                          className="ml-3 p-2 rounded-lg text-red-500 hover:text-red-650 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl overflow-hidden shadow-sm">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#dfe1e6] dark:border-[#a6c5e229] bg-gray-50/50 dark:bg-[#1d2125]/30">
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#44546f] dark:text-[#9fadbc]">Member</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#44546f] dark:text-[#9fadbc]">Status</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#44546f] dark:text-[#9fadbc]">Role</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#44546f] dark:text-[#9fadbc] hidden md:table-cell">Activity</th>
                      {isEditor && <th className="px-5 py-3.5 w-16"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dfe1e6] dark:divide-[#a6c5e229]">
                    {filteredMembers.map((m) => {
                      const badge = ROLE_BADGES[m.role] || ROLE_BADGES.MEMBER;
                      
                      const presenceColors = {
                        online: 'bg-emerald-500',
                        away: 'bg-amber-400',
                        offline: 'bg-gray-400'
                      };
                      const presenceColor = presenceColors[m.presence as 'online'|'away'|'offline'] || presenceColors.offline;

                      return (
                        <tr key={m.id} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-all group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img
                                  src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                                  alt="avatar"
                                  className="w-10 h-10 rounded-lg shrink-0 object-cover bg-slate-100"
                                />
                                <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#22272b] ${presenceColor}`} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf]">{m.user.name || m.user.username}</p>
                                <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">@{m.user.username} {m.user.email ? `• ${m.user.email}` : ''}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#44546f] dark:text-[#9fadbc]" />
                              <span className={m.presence === 'online' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-[#44546f] dark:text-[#9fadbc]'}>
                                {m.lastActive}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {isEditor && m.role !== 'OWNER' && m.user.id !== user?.id ? (
                              <select
                                value={m.role}
                                onChange={e => handleRoleChange(m.id, e.target.value)}
                                className={`appearance-none pl-2.5 pr-6 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider text-center shrink-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${badge.bg} ${badge.text} ${badge.border} transition-all`}
                                style={{
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                                  backgroundPosition: 'right 0.4rem center',
                                  backgroundSize: '0.55rem',
                                  backgroundRepeat: 'no-repeat'
                                }}
                              >
                                <option value="MEMBER" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Member</option>
                                <option value="ADMIN" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Admin</option>
                                <option value="VIEWER" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Guest</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                                {badge.label}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#44546f] dark:text-[#9fadbc] hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <span>🛠️ {m.activity?.cardsCreated || 0} created</span>
                              <span>•</span>
                              <span>✅ {m.activity?.tasksCompleted || 0} completed</span>
                            </div>
                          </td>

                          {isEditor && (
                            <td className="px-5 py-4 text-right">
                              {m.role !== 'OWNER' && m.user.id !== user?.id && (
                                <button
                                  onClick={() => handleRemove(m.id, m.user.name || m.user.username)}
                                  className="p-1.5 rounded text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Table View (Responsive Cards) */}
              <div className="block md:hidden divide-y divide-[#dfe1e6] dark:divide-[#a6c5e229]">
                {filteredMembers.map((m) => {
                  const badge = ROLE_BADGES[m.role] || ROLE_BADGES.MEMBER;
                  const presenceColors = {
                    online: 'bg-emerald-500',
                    away: 'bg-amber-400',
                    offline: 'bg-gray-400'
                  };
                  const presenceColor = presenceColors[m.presence as 'online'|'away'|'offline'] || presenceColors.offline;

                  return (
                    <div key={m.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <img
                              src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                              alt="avatar"
                              className="w-10 h-10 rounded-lg shrink-0 object-cover bg-slate-100"
                            />
                            <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#22272b] ${presenceColor}`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf]">{m.user.name || m.user.username}</p>
                            <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">@{m.user.username}</p>
                          </div>
                        </div>
                        
                        {isEditor && m.role !== 'OWNER' && m.user.id !== user?.id ? (
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            className={`appearance-none pl-2.5 pr-6 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider text-center shrink-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${badge.bg} ${badge.text} ${badge.border} transition-all`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                              backgroundPosition: 'right 0.4rem center',
                              backgroundSize: '0.55rem',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            <option value="MEMBER" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Member</option>
                            <option value="ADMIN" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Admin</option>
                            <option value="VIEWER" className="bg-white dark:bg-[#22272b] text-slate-800 dark:text-slate-200">Guest</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-[#44546f] dark:text-[#9fadbc]">
                        {m.user.email && <span className="truncate">✉️ {m.user.email}</span>}
                        <span className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5 text-[#44546f] dark:text-[#9fadbc]" />
                          <span>Last Active: {m.lastActive}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex gap-2 text-[10px] text-slate-500">
                          <span>🛠️ {m.activity?.cardsCreated || 0} created</span>
                          <span>•</span>
                          <span>✅ {m.activity?.tasksCompleted || 0} done</span>
                        </div>
                        {isEditor && m.role !== 'OWNER' && m.user.id !== user?.id && (
                          <button
                            onClick={() => handleRemove(m.id, m.user.name || m.user.username)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Invite & Recent Activity */}
        <div className="space-y-6">
          
          {/* Upgrade Invite Card */}
          {isEditor && (
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-500" /> Invite Workspace Member
              </h2>
              
              <form onSubmit={handleInvite} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#44546f] dark:text-[#9fadbc]">Email or Username</label>
                  <input
                    type="text"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@example.com or username"
                    className="tf-input text-xs w-full"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#44546f] dark:text-[#9fadbc]">Workspace Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as any)}
                    className="tf-input text-xs w-full"
                  >
                    <option value="MEMBER">Member (Standard write permissions)</option>
                    <option value="ADMIN">Admin (Workspace configurations & controls)</option>
                    <option value="VIEWER">Guest (Read only permissions)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#44546f] dark:text-[#9fadbc]">Personal Note (Optional)</label>
                  <textarea
                    value={personalMessage}
                    onChange={e => setPersonalMessage(e.target.value)}
                    placeholder="Hey! Join our collaboration board..."
                    className="tf-input text-xs w-full h-16 resize-none"
                  />
                </div>

                {/* Live Card Preview */}
                {inviteEmail.trim() && (
                  <div className="border border-[#dfe1e6]/60 dark:border-[#a6c5e229]/60 rounded-xl p-3 bg-gray-50/50 dark:bg-black/5 space-y-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Live Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {inviteEmail.trim().charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#172b4d] dark:text-[#b6c2cf] truncate">{inviteEmail}</p>
                        <p className="text-[10px] text-[#44546f] dark:text-[#9fadbc]">Pending invitation</p>
                      </div>
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${ROLE_BADGES[inviteRole].bg} ${ROLE_BADGES[inviteRole].text} ${ROLE_BADGES[inviteRole].border}`}>
                        {ROLE_BADGES[inviteRole].label}
                      </span>
                    </div>
                  </div>
                )}

                {inviteError && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200/30">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {inviteError}
                  </p>
                )}

                {inviteSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200/30 animate-pulse">
                    <Check className="w-3.5 h-3.5 shrink-0" /> Invitation sent successfully!
                  </p>
                )}

                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {inviting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send Workspace Invite
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Dedicated Pending Invitations list */}
          {workspaceInvitations && workspaceInvitations.length > 0 && (
            <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-5 shadow-sm space-y-3.5">
              <h2 className="text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-500" /> Pending Invites ({pendingCount})
              </h2>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {workspaceInvitations.map((inv) => {
                  const badge = ROLE_BADGES[inv.role] || ROLE_BADGES.MEMBER;
                  return (
                    <div
                      key={inv.id}
                      className="border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-lg p-3 bg-gray-50/20 dark:bg-[#1d2125]/20 flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#172b4d] dark:text-[#b6c2cf] truncate" title={inv.email}>
                          {inv.email}
                        </p>
                        <p className="text-[10px] text-[#44546f] dark:text-[#9fadbc] mt-0.5">
                          Sent: {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold uppercase shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>

                        {isEditor && (
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => handleResend(inv.id)}
                              className="p-1 rounded text-blue-500 hover:bg-blue-500/10"
                              title="Resend invitation"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRevoke(inv.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-500/10"
                              title="Cancel invitation"
                            >
                              <X className="w-3.5 h-3.5" />
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

          {/* Recent Team Activity Log panel */}
          <div className="bg-white dark:bg-[#22272b] border border-[#dfe1e6] dark:border-[#a6c5e229] rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" /> Recent Team Activity
            </h2>

            {workspaceActivity.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-[#44546f] dark:text-[#9fadbc]">No workspace activity recorded yet.</p>
              </div>
            ) : (
              <div className="relative border-l border-[#dfe1e6] dark:border-[#a6c5e229] ml-2.5 pl-4 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {workspaceActivity.map((log) => {
                  const logUser = log.user?.name || log.user?.username || 'Collaborator';
                  const logDate = new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={log.id} className="relative text-xs space-y-1">
                      {/* Timeline node */}
                      <span className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#22272b]" />
                      
                      <p className="text-[#172b4d] dark:text-[#b6c2cf] leading-relaxed">
                        <span className="font-bold">{logUser}</span> {log.details}
                      </p>
                      
                      <div className="flex items-center gap-1 text-[10px] text-[#44546f] dark:text-[#9fadbc]">
                        <span>{logDate}</span>
                        {log.board && (
                          <>
                            <span>•</span>
                            <span className="hover:underline cursor-pointer" onClick={() => onSelectBoard(log.board.id)}>
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

    </div>
  );
}
