import React, { useState, useEffect } from 'react';
import {
  Users, Search, Trash2, Send, AlertCircle, RefreshCw, X, MoreVertical, Plus
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


  const [statusFilter, setStatusFilter] = useState<'ALL' | 'online' | 'away' | 'offline'>('ALL');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeDropdownMemberId, setActiveDropdownMemberId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownMemberId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Invite Member card state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN' | 'VIEWER'>('MEMBER');
  const [personalMessage, setPersonalMessage] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

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
  const pendingCount = workspaceInvitations?.length || 0;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviteError(null);
    setInviting(true);

    try {
      await inviteMember(workspaceId, inviteEmail.trim(), inviteRole);
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
      const matchStatus = statusFilter === 'ALL' ? true : m.presence === statusFilter;
      return matchSearch && matchRole && matchStatus;
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
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full animate-fade-in text-slate-800 dark:text-[#c9d1d9]">
      
      {/* ── Page Header Section ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6 shrink-0">
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-sans flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" /> Workspace Members
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8d96a0] leading-relaxed">
            Manage your workspace members, invitations and permissions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
          <div className="relative flex-grow sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-550" />
            <input
              type="text"
              placeholder="Search by name, username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#0d0d0f] border border-slate-250 dark:border-[#2d3139] focus:border-indigo-500 dark:focus:border-indigo-650 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-205 transition-all font-medium"
            />
          </div>
          
          {isEditor && (
            <button 
              onClick={() => setInviteModalOpen(true)} 
              className="btn-primary justify-center font-bold text-xs py-2 px-4.5 rounded-xl shadow-sm hover:translate-y-[-1px] transition-transform w-full sm:w-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Invite Member
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar: Filters & Sort ── */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-[#0d0d0f] border border-slate-100 dark:border-[#2d3139] p-4 rounded-xl">
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#161b22] border border-slate-200/60 dark:border-[#2d3139] px-3 py-1.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Role</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as any)}
            className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="dark:bg-[#161b22]">All Roles</option>
            <option value="OWNER" className="dark:bg-[#161b22]">Owner</option>
            <option value="ADMIN" className="dark:bg-[#161b22]">Admin</option>
            <option value="MEMBER" className="dark:bg-[#161b22]">Member</option>
            <option value="VIEWER" className="dark:bg-[#161b22]">Guest</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-[#161b22] border border-slate-200/60 dark:border-[#2d3139] px-3 py-1.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Status</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="dark:bg-[#161b22]">All Statuses</option>
            <option value="online" className="dark:bg-[#161b22]">Online</option>
            <option value="away" className="dark:bg-[#161b22]">Away</option>
            <option value="offline" className="dark:bg-[#161b22]">Offline</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-[#161b22] border border-slate-200/60 dark:border-[#2d3139] px-3 py-1.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Sort</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="name" className="dark:bg-[#161b22]">Sort by Name</option>
            <option value="joinDate" className="dark:bg-[#161b22]">Sort by Joined Date</option>
            <option value="lastActive" className="dark:bg-[#161b22]">Sort by Activity</option>
          </select>
        </div>
      </div>

      {/* ── Member List ── */}
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-slate-50 dark:bg-[#0d0d0f] rounded-2xl border border-slate-100 dark:border-[#2d3139] max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-550 flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1.5">No members found</h3>
          <p className="text-xs text-slate-400 dark:text-slate-550 max-w-xs mb-5 leading-relaxed">
            We couldn't find any workspace members matching your active filters. Try modifying your search or filter tags.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200/80 dark:border-[#2d3139] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#2d3139] bg-slate-50/50 dark:bg-[#161b22] text-[10px] font-bold uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Role Status</th>
                  <th className="px-5 py-3">Last Active</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {filteredMembers.map((m) => {
                  const badge = ROLE_BADGES[m.role] || ROLE_BADGES.MEMBER;
                  
                  const presenceColors = {
                    online: 'bg-emerald-500',
                    away: 'bg-amber-400',
                    offline: 'bg-gray-400'
                  };
                  const presenceColor = presenceColors[m.presence as 'online'|'away'|'offline'] || presenceColors.offline;
                  const presenceText = m.presence === 'online' ? 'Online' : m.presence === 'away' ? 'Away' : 'Offline';

                  return (
                    <tr 
                      key={m.id} 
                      onClick={() => setSelectedMember(m)}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-250 dark:border-[#2d3139]">
                            {m.user.avatarUrl ? (
                              <img
                                src={getAvatarUrl(m.user.avatarUrl, m.user.name || m.user.username)}
                                alt="avatar"
                                className="w-full h-full object-cover bg-slate-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextSibling as HTMLDivElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-full h-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs uppercase"
                              style={{ display: m.user.avatarUrl ? 'none' : 'flex' }}
                            >
                              {(m.user.name || m.user.username).charAt(0)}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-250 truncate max-w-[150px]">{m.user.name || m.user.username}</p>
                            <p className="text-[10px] text-slate-400">@{m.user.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-slate-650 dark:text-slate-400 font-medium">
                        {m.user.email || <span className="text-slate-400 italic">None</span>}
                      </td>

                      <td className="px-5 py-3">
                        {isEditor && m.role !== 'OWNER' && m.user.id !== user?.id ? (
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className={`appearance-none pl-2.5 pr-6 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${badge.bg} ${badge.text} ${badge.border} transition-all`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                              backgroundPosition: 'right 0.4rem center',
                              backgroundSize: '0.55rem',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            <option value="MEMBER" className="bg-white dark:bg-[#161b22]">Member</option>
                            <option value="ADMIN" className="bg-white dark:bg-[#161b22]">Admin</option>
                            <option value="VIEWER" className="bg-white dark:bg-[#161b22]">Guest</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-slate-500">
                        {m.lastActive || 'Offline'}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${presenceColor}`} />
                          <span className="text-[10px] text-slate-400 capitalize">{presenceText}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveDropdownMemberId(activeDropdownMemberId === m.id ? null : m.id);
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeDropdownMemberId === m.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#2d3139] rounded-lg shadow-xl py-1 z-20 text-left text-[11px] animate-fade-in">
                              <button
                                onClick={() => { setSelectedMember(m); setActiveDropdownMemberId(null); }}
                                className="w-full px-3 py-1.5 text-slate-700 dark:text-[#c9d1d9] hover:bg-slate-55 dark:hover:bg-[#1d2125] flex items-center gap-2 font-medium"
                              >
                                <Users className="w-3.5 h-3.5 text-slate-400" /> View Profile
                              </button>
                              {isEditor && m.role !== 'OWNER' && m.user.id !== user?.id && (
                                <button
                                  onClick={() => { handleRemove(m.id, m.user.name || m.user.username); setActiveDropdownMemberId(null); }}
                                  className="w-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-medium border-t border-slate-100 dark:border-slate-800/60"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
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
        </div>
      )}

      {/* ── Invitations & Recent Activity Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Invitations list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
            Pending Invitations ({pendingCount})
          </h2>

          {(!workspaceInvitations || workspaceInvitations.length === 0) ? (
            <div className="p-5 text-center bg-slate-50/50 dark:bg-[#0d0d0f] rounded-xl border border-dashed border-slate-200 dark:border-[#2d3139] italic text-slate-400">
              No pending invitations in this workspace.
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200/80 dark:border-[#2d3139] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#2d3139] bg-slate-50/50 dark:bg-[#161b22] text-[10px] font-bold uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                      <th className="px-5 py-3">Invited Email</th>
                      <th className="px-5 py-3">Assigned Role</th>
                      <th className="px-5 py-3">Date Sent</th>
                      <th className="px-5 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2d3139] text-xs">
                    {workspaceInvitations.map((inv) => {
                      const badge = ROLE_BADGES[inv.role] || ROLE_BADGES.MEMBER;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-250 truncate max-w-[200px]" title={inv.email}>
                            {inv.email}
                          </td>

                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="px-5 py-3 text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>

                          <td className="px-5 py-3 text-right">
                            {isEditor && (
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => handleResend(inv.id)}
                                  className="p-1 rounded text-blue-500 hover:bg-blue-500/10 transition-colors"
                                  title="Resend invitation"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRevoke(inv.id)}
                                  className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="Revoke invitation"
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

        {/* Recent Activity Timeline */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
            Workspace Activity Log
          </h2>

          <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200/80 dark:border-[#2d3139] rounded-xl p-5 shadow-sm space-y-4 min-h-[150px]">
            {workspaceActivity.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 italic">No workspace activity recorded yet.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-100 dark:border-[#2d3139] ml-2 pl-4 space-y-4 max-h-[300px] overflow-y-auto pr-1 pt-1.5">
                {workspaceActivity.map((log) => {
                  const logUser = log.user?.name || log.user?.username || 'Collaborator';
                  const logDate = new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={log.id} className="relative text-xs space-y-1">
                      {/* Timeline node */}
                      <span className="absolute -left-[20.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#161b22]" />
                      
                      <p className="text-slate-700 dark:text-slate-350 leading-relaxed text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{logUser}</span> {log.details}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500">
                        <span>{logDate}</span>
                        {log.board && (
                          <>
                            <span>•</span>
                            <span className="hover:underline cursor-pointer font-semibold" onClick={() => onSelectBoard(log.board.id)}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setInviteModalOpen(false)}>
          <div className="bg-white dark:bg-[#161b22] border border-slate-250 dark:border-[#30363d] rounded-2xl p-5 w-full max-w-md shadow-2xl animate-scale-in text-xs" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205">Invite Workspace Member</h3>
              <button onClick={() => setInviteModalOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => { 
                handleInvite(e).then(() => { 
                  if (!inviteError) setInviteModalOpen(false); 
                }); 
              }} 
              className="space-y-4 pt-4"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500 mb-1">Email or Username</label>
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@example.com or username"
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500 mb-1">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  <option value="MEMBER" className="bg-white dark:bg-[#161b22]">Member (Standard write permissions)</option>
                  <option value="ADMIN" className="bg-white dark:bg-[#161b22]">Admin (Workspace configurations & controls)</option>
                  <option value="VIEWER" className="bg-white dark:bg-[#161b22]">Guest (Read only permissions)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-1">Personal Note (Optional)</label>
                <textarea
                  value={personalMessage}
                  onChange={e => setPersonalMessage(e.target.value)}
                  placeholder="Hey! Join our collaboration board..."
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold h-20 resize-none"
                />
              </div>

              {inviteError && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {inviteError}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setInviteModalOpen(false)} className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={inviting} className="btn-primary py-2 px-4 rounded-xl text-xs font-bold">
                  {inviting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Invite Teammate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Member Profile Drawer (Slide-over) ── */}
      {selectedMember && (() => {
        // Real assigned cards
        const assignedCards = currentWorkspace?.boards?.flatMap(b => b.lists || [])
          .flatMap(l => l.cards || [])
          .filter(c => c.assignees?.some((a: any) => a.userId === selectedMember.user.id || a.user?.id === selectedMember.user.id)) || [];

        // Real activities
        const memberActivity = workspaceActivity?.filter(act => act.userId === selectedMember.user.id) || [];

        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMember(null)}>
            <div 
              className="bg-white dark:bg-[#161b22] border-l border-slate-250 dark:border-[#30363d] w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto text-xs animate-slide-in relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205">Teammate Profile</h3>
                  <button onClick={() => setSelectedMember(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Avatar + Basic Details */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-[#2d3139]">
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
                      className="w-full h-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-lg uppercase"
                      style={{ display: selectedMember.user.avatarUrl ? 'none' : 'flex' }}
                    >
                      {(selectedMember.user.name || selectedMember.user.username).charAt(0)}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#161b22] ${
                      selectedMember.presence === 'online' ? 'bg-emerald-500' : selectedMember.presence === 'away' ? 'bg-amber-400' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                      {selectedMember.user.name || selectedMember.user.username}
                    </h4>
                    <p className="text-xs text-slate-400">@{selectedMember.user.username}</p>
                    <span className={`inline-block px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      ROLE_BADGES[selectedMember.role]?.bg || ROLE_BADGES.MEMBER.bg
                    } ${ROLE_BADGES[selectedMember.role]?.text || ROLE_BADGES.MEMBER.text} ${ROLE_BADGES[selectedMember.role]?.border || ROLE_BADGES.MEMBER.border}`}>
                      {ROLE_BADGES[selectedMember.role]?.label || 'Member'}
                    </span>
                  </div>
                </div>

                {/* Personal Info list */}
                <div className="bg-slate-50 dark:bg-white/2 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Email</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold break-all select-all">{selectedMember.user.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Joined workspace</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">
                      {new Date(selectedMember.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Active Status</span>
                    <span className={`font-bold uppercase text-[10px] ${
                      selectedMember.presence === 'online' ? 'text-emerald-500' : selectedMember.presence === 'away' ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      {selectedMember.presence === 'online' ? 'Active Now' : selectedMember.lastActive || 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Assigned Tasks count / cards */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-205">Assigned Tasks ({assignedCards.length})</h4>
                  {assignedCards.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-550 leading-relaxed italic">No tasks currently assigned to this teammate.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {assignedCards.map((c: any) => (
                        <div key={c.id} className="p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-white/2 flex justify-between items-center">
                          <span className="font-bold text-slate-750 dark:text-slate-300 truncate max-w-[240px]">{c.title}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            c.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                            c.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>{c.priority}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity logs timeline */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-205">Recent Member Activity</h4>
                  {memberActivity.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-550 leading-relaxed italic">No activity recorded for this member.</p>
                  ) : (
                    <div className="relative border-l border-slate-100 dark:border-slate-800 ml-2 pl-4 space-y-4 max-h-48 overflow-y-auto pr-1 pt-1.5">
                      {memberActivity.map((log: any) => (
                        <div key={log.id} className="relative text-[11px] leading-relaxed text-slate-600 dark:text-[#8d96a0]">
                          <span className="absolute -left-[20.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#161b22]" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{log.user?.name || log.user?.username}</span> {log.details}
                          <span className="block text-[9px] text-slate-405 dark:text-slate-500 mt-0.5">{new Date(log.createdAt).toLocaleDateString()}</span>
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
                  className="btn-secondary w-full justify-center py-2 rounded-xl font-bold"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
