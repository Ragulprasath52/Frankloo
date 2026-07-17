import React, { useState, useEffect } from 'react';
import {
  Mail, Send, Activity, X, RefreshCw, AlertCircle, Copy,
  Eye, Moon, Sun, Laptop, Smartphone, Sparkles,
  Server, Plus, Lock, Search, CheckCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface WorkspaceInvitationPortalProps {
  workspaceId: string;
}

export default function WorkspaceInvitationPortal({ workspaceId }: WorkspaceInvitationPortalProps) {
  const {
    currentWorkspace,
    inviteMember,
    workspaceInvitations,
    fetchWorkspaceInvitations,
    revokeInvitation,
    resendInvitation,
    workspaceEmailSettings,
    fetchWorkspaceEmailSettings,
    updateWorkspaceEmailSettings,
    testSmtpConnection,
    fetchInvitationDashboard,
    addToast,
    showConfirm,
    gmailProfile,
    fetchGmailProfile
  } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'send' | 'history' | 'branding' | 'smtp'>('dashboard');

  const [sendInviteModalOpen, setSendInviteModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyRoleFilter, setHistoryRoleFilter] = useState<'ALL' | 'MEMBER' | 'ADMIN' | 'VIEWER'>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'>('ALL');

  // Dashboard Stats States
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Send Invitation Form States
  const [emailsInput, setEmailsInput] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN' | 'VIEWER'>('MEMBER');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);

  // Branding Customization States
  const [senderName, setSenderName] = useState('Frankloo');
  const [replyTo, setReplyTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [brandingAccentColor, setBrandingAccentColor] = useState('#0052cc');
  const [brandingButtonColor, setBrandingButtonColor] = useState('#0052cc');
  const [brandingFooter, setBrandingFooter] = useState('Frankloo Team');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [customBodyHtml, setCustomBodyHtml] = useState('');
  const [customBodyText, setCustomBodyText] = useState('');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [updatingBranding, setUpdatingBranding] = useState(false);


  // SMTP Settings States
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [updatingSmtp, setUpdatingSmtp] = useState(false);

  // Load Dashboard Stats
  const loadDashboardData = async () => {
    if (!workspaceId) return;
    setStatsLoading(true);
    try {
      const data = await fetchInvitationDashboard(workspaceId);
      setDashboardStats(data.stats);
      setRecentLogs(data.recentActivity);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Branding Settings
  const loadBrandingSettings = async () => {
    if (!workspaceId) return;
    try {
      await fetchWorkspaceEmailSettings(workspaceId);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadDashboardData();
      fetchWorkspaceInvitations(workspaceId);
      loadBrandingSettings();
      fetchGmailProfile().catch(console.error);
    }
  }, [workspaceId]);

  // Sync Settings when they change in Store
  useEffect(() => {
    if (workspaceEmailSettings) {
      setSenderName(workspaceEmailSettings.senderName || 'Frankloo');
      setReplyTo(workspaceEmailSettings.replyTo || '');
      setEmailSubject(workspaceEmailSettings.subject || "You're invited to join {{workspace_name}} on Frankloo");
      setBrandingAccentColor(workspaceEmailSettings.accentColor || '#0052cc');
      setBrandingButtonColor(workspaceEmailSettings.buttonColor || '#0052cc');
      setBrandingFooter(workspaceEmailSettings.footer || 'Frankloo Team');
      setCustomBodyHtml(workspaceEmailSettings.bodyHtml || '');
      setCustomBodyText(workspaceEmailSettings.bodyText || '');

      setSmtpHost(workspaceEmailSettings.smtpHost || '');
      setSmtpPort(workspaceEmailSettings.smtpPort ? String(workspaceEmailSettings.smtpPort) : '587');
      setSmtpUser(workspaceEmailSettings.smtpUser || '');
      setSmtpPass(workspaceEmailSettings.smtpPass || '');
      setSmtpSecure(workspaceEmailSettings.smtpSecure || false);
      setSmtpFrom(workspaceEmailSettings.smtpFrom || '');
    }
  }, [workspaceEmailSettings]);



  // Save Branding Updates
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingBranding(true);
    try {
      const payload: any = {
        senderName,
        replyTo,
        subject: emailSubject,
        accentColor: brandingAccentColor,
        buttonColor: brandingButtonColor,
        footer: brandingFooter,
        bodyHtml: customBodyHtml,
        bodyText: customBodyText
      };
      if (logoBase64) {
        payload.logoBase64 = logoBase64;
      }
      await updateWorkspaceEmailSettings(workspaceId, payload);
      setLogoBase64(null);
      addToast('Branding Settings Saved', 'Workspace branding settings have been updated successfully.', 'success');
      loadBrandingSettings();
    } catch (err: any) {
      addToast('Error saving branding', err.message || 'Failed to update branding settings', 'error');
    } finally {
      setUpdatingBranding(false);
    }
  };

  // Save SMTP Settings
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSmtp(true);
    try {
      const payload = {
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
        smtpUser,
        smtpPass,
        smtpSecure,
        smtpFrom
      };
      await updateWorkspaceEmailSettings(workspaceId, payload);
      addToast('SMTP Settings Saved', 'Custom SMTP configuration has been saved successfully.', 'success');
    } catch (err: any) {
      addToast('Error saving SMTP settings', err.message || 'Failed to save SMTP settings', 'error');
    } finally {
      setUpdatingSmtp(false);
    }
  };

  // Test SMTP Diagnostics
  const handleTestSmtp = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      addToast('Missing Fields', 'SMTP Host, Username, and Password are required to test connection.', 'warning');
      return;
    }
    setTestingSmtp(true);
    try {
      const payload = {
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
        smtpUser,
        smtpPass,
        smtpSecure,
        smtpFrom
      };
      const res = await testSmtpConnection(workspaceId, payload);
      addToast('SMTP Test Success', res.message || 'SMTP Connection diagnostics completed successfully. Check your email inbox.', 'success');
    } catch (err: any) {
      addToast('SMTP Test Failed', err.message || 'SMTP Connection diagnostics failed.', 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  // Send Invitations
  const handleSendInvitations = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEmails = emailsInput.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
    if (parsedEmails.length === 0) {
      addToast('No Emails Entered', 'Please input at least one recipient email address.', 'warning');
      return;
    }
    setSendingInvites(true);
    try {
      const res = await inviteMember(workspaceId, emailsInput, inviteRole, customMessage);
      const successes = res.results.filter((r: any) => r.status === 'SUCCESS').length;
      const failures = res.results.filter((r: any) => r.status === 'FAILED').length;
      
      if (successes > 0) {
        addToast('Invitations Dispatched', `Successfully sent ${successes} workspace invitation(s).`, 'success');
        setEmailsInput('');
        setCustomMessage('');
        loadDashboardData();
        fetchWorkspaceInvitations(workspaceId);
      }
      if (failures > 0) {
        const errors = res.results.filter((r: any) => r.status === 'FAILED').map((r: any) => r.error).join(', ');
        addToast('Some Invites Failed', `Failed to send to ${failures} address(es): ${errors}`, 'warning');
      }
    } catch (err: any) {
      addToast('Send Failed', err.message || 'Rate limit hit or connection issue sending invites.', 'error');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    try {
      await resendInvitation(workspaceId, invitationId);
      addToast('Invitation Resent', 'The workspace invite link has been renewed and resent.', 'success');
      loadDashboardData();
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to resend invitation.', 'error');
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    const confirmed = await showConfirm(
      'Cancel Workspace Invitation',
      'Are you sure you want to cancel and revoke this invitation link? It will immediately stop working.'
    );
    if (!confirmed) return;
    try {
      await revokeInvitation(workspaceId, invitationId);
      addToast('Invitation Revoked', 'The pending workspace invitation link was revoked.', 'info');
      loadDashboardData();
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to revoke invitation.', 'error');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const acceptLink = `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(acceptLink);
    addToast('Link Copied', 'Invitation link copied to clipboard.', 'success');
  };

  // Compile Live Template Preview
  const getCompiledPreview = () => {
    const wsName = currentWorkspace?.name || 'Workspace';
    const accent = brandingAccentColor;
    const btn = brandingButtonColor;
    const footer = brandingFooter;

    const mockVariables = {
      workspace_name: wsName,
      workspace_logo: '',
      workspace_owner: 'John Owner',
      recipient_email: 'invitee@gmail.com',
      role: inviteRole === 'VIEWER' ? 'Guest' : inviteRole.toLowerCase(),
      invite_link: '#',
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      custom_message: customMessage || 'Join our engineering collaboration board!'
    };

    let template = customBodyHtml || `
      <div class="email-container" style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); background-color: #ffffff;">
        <div class="email-header" style="padding: 24px; text-align: center; border-bottom: 1px solid #f0f2f5;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, ${accent}, #6366f1); color: #ffffff; line-height: 44px; text-align: center; margin: 0 auto 12px auto; font-size: 18px; font-weight: 700; box-shadow: 0 4px 10px rgba(99,102,241,0.15); font-family: sans-serif;">
            ${wsName[0]?.toUpperCase() || 'W'}
          </div>
          <h2 class="email-title" style="margin: 0; font-size: 18px; color: #172b4d;">\${workspace_name}</h2>
        </div>
        <div class="email-body" style="padding: 24px; color: #172b4d; font-size: 14px; line-height: 1.6;">
          <p>You're invited to join <strong>\${workspace_name}</strong> on Frankloo.</p>
          <p><strong>\${workspace_owner}</strong> has invited you to collaborate as a <strong>\${role}</strong>.</p>
          
          <div class="email-quote" style="margin: 20px 0; padding: 12px 16px; background-color: #f6f8fa; border-left: 4px solid \${accent_color}; border-radius: 0 4px 4px 0; font-style: italic; color: #44546f;">
            "\${custom_message}"
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="#" class="email-button" style="background-color: \${button_color}; color: white; display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invitation</a>
          </div>
          
          <p class="email-expiry" style="font-size: 11px; color: #5e6c84; margin-top: 24px;">This invitation expires on \${expiry_date}.</p>
        </div>
        <div class="email-footer" style="padding: 16px; background-color: #f6f8fa; border-top: 1px solid #e1e4e8; text-align: center; font-size: 11px; color: #5e6c84;">
          \${footer}
        </div>
      </div>
    `;

    // Standardize variables substitution
    let html = template;
    html = html.replace(/\$\{workspace_name\}/g, mockVariables.workspace_name);
    html = html.replace(/\$\{workspace_logo\}/g, mockVariables.workspace_logo);
    html = html.replace(/\$\{workspace_owner\}/g, mockVariables.workspace_owner);
    html = html.replace(/\$\{recipient_email\}/g, mockVariables.recipient_email);
    html = html.replace(/\$\{role\}/g, mockVariables.role);
    html = html.replace(/\$\{invite_link\}/g, mockVariables.invite_link);
    html = html.replace(/\$\{expiry_date\}/g, mockVariables.expiry_date);
    html = html.replace(/\$\{custom_message\}/g, mockVariables.custom_message);
    html = html.replace(/\$\{accent_color\}/g, accent);
    html = html.replace(/\$\{button_color\}/g, btn);
    html = html.replace(/\$\{footer\}/g, footer);

    // Support double curly braces syntax
    html = html.replace(/\{\{workspace_name\}\}/g, mockVariables.workspace_name);
    html = html.replace(/\{\{workspace_logo\}\}/g, mockVariables.workspace_logo);
    html = html.replace(/\{\{workspace_owner\}\}/g, mockVariables.workspace_owner);
    html = html.replace(/\{\{recipient_email\}\}/g, mockVariables.recipient_email);
    html = html.replace(/\{\{role\}\}/g, mockVariables.role);
    html = html.replace(/\{\{invite_link\}\}/g, mockVariables.invite_link);
    html = html.replace(/\{\{expiry_date\}\}/g, mockVariables.expiry_date);
    html = html.replace(/\{\{custom_message\}\}/g, mockVariables.custom_message);
    html = html.replace(/\{\{accent_color\}\}/g, accent);
    html = html.replace(/\{\{button_color\}\}/g, btn);
    html = html.replace(/\{\{footer\}\}/g, footer);

    return html;
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full animate-fade-in text-slate-800 dark:text-[#c9d1d9]">
      <style>{`
        /* Dynamic simulator override for email previews in dark mode */
        .dark-email .email-container {
          background-color: #161b22 !important;
          border-color: #30363d !important;
        }
        .dark-email .email-header {
          border-bottom-color: #21262d !important;
        }
        .dark-email .email-title {
          color: #f0f6fc !important;
        }
        .dark-email .email-body {
          color: #c9d1d9 !important;
        }
        .dark-email .email-body p, .dark-email .email-body strong {
          color: #c9d1d9 !important;
        }
        .dark-email .email-quote {
          background-color: #0d1117 !important;
          border-left-color: ${brandingAccentColor} !important;
          color: #8b949e !important;
        }
        .dark-email .email-button {
          color: #ffffff !important;
        }
        .dark-email .email-expiry {
          color: #8b949e !important;
        }
        .dark-email .email-footer {
          background-color: #0d1117 !important;
          border-top-color: #30363d !important;
          color: #8b949e !important;
        }
      `}</style>
      
      {/* ── Page Header Section ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6 shrink-0">
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-sans flex items-center gap-2">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" /> Workspace Invitations
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8d96a0] leading-relaxed">
            Manage workspace invitations, email templates and SMTP configuration.
          </p>
        </div>

        <button 
          onClick={() => setSendInviteModalOpen(true)} 
          className="btn-primary justify-center font-bold text-xs py-2.5 px-4.5 rounded-xl shadow-sm hover:translate-y-[-1px] transition-transform w-full md:w-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Send Invitation
        </button>
      </div>

      {/* ── Segmented Navigation Tabs ── */}
      <div className="flex bg-slate-50 dark:bg-[#0d0d0f] p-1 rounded-xl border border-slate-100 dark:border-[#2d3139] overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 max-w-full">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-[#161b22] border border-slate-200/50 dark:border-[#2d3139] shadow-sm text-blue-600 dark:text-[#579dff]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          Dashboard &amp; Feed
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-[#161b22] border border-slate-200/50 dark:border-[#2d3139] shadow-sm text-blue-600 dark:text-[#579dff]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          Invitations List
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'branding' ? 'bg-white dark:bg-[#161b22] border border-slate-200/50 dark:border-[#2d3139] shadow-sm text-blue-600 dark:text-[#579dff]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          Email Branding &amp; Template
        </button>
        <button
          onClick={() => setActiveTab('smtp')}
          className={`shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'smtp' ? 'bg-white dark:bg-[#161b22] border border-slate-200/50 dark:border-[#2d3139] shadow-sm text-blue-600 dark:text-[#579dff]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          SMTP Server Configuration
        </button>
      </div>

      {/* ── Summary statistics pill row ── */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-[#0d0d0f] border border-slate-150 dark:border-[#2d3139] p-3.5 rounded-xl text-xs font-semibold text-slate-550 dark:text-[#8d96a0]">
        <span className="font-bold text-[10px] uppercase text-slate-400 mr-2">Summary Metrics:</span>
        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">Pending • {statsLoading ? '...' : dashboardStats?.pending || 0}</span>
        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">Accepted • {statsLoading ? '...' : dashboardStats?.accepted || 0}</span>
        <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-0.5 rounded-lg">Expired • {statsLoading ? '...' : (dashboardStats?.expired || 0) + (dashboardStats?.revoked || 0)}</span>
      </div>

      {/* ── Main Tabbed Views ── */}
      <div className="flex-1 min-h-0">
        
        {/* TAB 1: INTEGRATED DASHBOARD & ACTIVITY FEED */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200/80 dark:border-[#2d3139] rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Activity className="w-4 h-4 text-emerald-500" /> Recent Invitation Activity Logs
              </h3>
              
              <div className="relative border-l border-slate-100 dark:border-[#2d3139] ml-2 pl-4 space-y-4 max-h-[350px] overflow-y-auto pr-1 pt-1.5">
                {statsLoading ? (
                  <div className="text-center py-12 text-xs text-slate-400">Loading activity feed...</div>
                ) : recentLogs.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 italic">No invitation activity logs recorded yet.</div>
                ) : (
                  recentLogs.map((log) => {
                    let dotColor = 'bg-blue-500 ring-blue-500/20';
                    if (log.action === 'INVITE_ACCEPTED') dotColor = 'bg-emerald-500 ring-emerald-500/20';
                    if (log.action === 'INVITE_REVOKED') dotColor = 'bg-rose-500 ring-rose-500/20';
                    if (log.action === 'DELIVERY_FAILURE') dotColor = 'bg-amber-400 ring-amber-400/20';

                    return (
                      <div key={log.id} className="relative text-xs space-y-1">
                        <span className={`absolute -left-[20.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#0d0d0f] ${dotColor}`} />
                        <div className="flex justify-between gap-4">
                          <p className="font-medium text-slate-700 dark:text-slate-350 leading-relaxed text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.email}</span>: {log.details}
                          </p>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider block">Action: {log.action}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVITATIONS HISTORY LIST */}
        {activeTab === 'history' && (() => {
          const filteredInvitations = (workspaceInvitations || []).filter((inv: any) => {
            const matchSearch = (inv.email || '').toLowerCase().includes(historySearch.toLowerCase());
            const matchRole = historyRoleFilter === 'ALL' ? true : inv.role === historyRoleFilter;
            const matchStatus = historyStatusFilter === 'ALL' ? true : inv.status === historyStatusFilter;
            return matchSearch && matchRole && matchStatus;
          });

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Search & Filters Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0d0d0f] border border-slate-100 dark:border-[#2d3139] p-4 rounded-xl">
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-550" />
                  <input
                    type="text"
                    placeholder="Search invited email address..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#161b22] border border-slate-250 dark:border-[#2d3139] focus:border-indigo-500 dark:focus:border-indigo-650 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 transition-all font-medium"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-[#161b22] border border-slate-200/60 dark:border-[#2d3139] px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Role</span>
                    <select
                      value={historyRoleFilter}
                      onChange={e => setHistoryRoleFilter(e.target.value as any)}
                      className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL" className="dark:bg-[#161b22]">All Roles</option>
                      <option value="MEMBER" className="dark:bg-[#161b22]">Member</option>
                      <option value="ADMIN" className="dark:bg-[#161b22]">Admin</option>
                      <option value="VIEWER" className="dark:bg-[#161b22]">Guest</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white dark:bg-[#161b22] border border-slate-200/60 dark:border-[#2d3139] px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Status</span>
                    <select
                      value={historyStatusFilter}
                      onChange={e => setHistoryStatusFilter(e.target.value as any)}
                      className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL" className="dark:bg-[#161b22]">All Statuses</option>
                      <option value="PENDING" className="dark:bg-[#161b22]">Pending</option>
                      <option value="ACCEPTED" className="dark:bg-[#161b22]">Accepted</option>
                      <option value="EXPIRED" className="dark:bg-[#161b22]">Expired</option>
                      <option value="REVOKED" className="dark:bg-[#161b22]">Revoked</option>
                    </select>
                  </div>

                  <button
                    onClick={() => fetchWorkspaceInvitations(workspaceId)}
                    className="btn-secondary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm font-bold hover:translate-y-[-1px] transition-transform border border-slate-200 dark:border-[#2d3139]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh List
                  </button>
                </div>
              </div>

              {filteredInvitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-slate-50 dark:bg-[#0d0d0f] rounded-2xl border border-slate-100 dark:border-[#2d3139] max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-550 flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1.5">No invitations found</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-550 max-w-xs mb-5 leading-relaxed">
                    Try modifying your search queries or active filter tags.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#0d0d0f] border border-slate-200/80 dark:border-[#2d3139] rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-[#2d3139] bg-slate-50/50 dark:bg-[#161b22] text-[10px] font-bold uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                          <th className="px-5 py-3">Recipient Email</th>
                          <th className="px-5 py-3">Workspace Role</th>
                          <th className="px-5 py-3">Invite Status</th>
                          <th className="px-5 py-3">Delivery Status</th>
                          <th className="px-5 py-3">Date Sent</th>
                          <th className="px-5 py-3">Resends</th>
                          <th className="px-5 py-3 w-32"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#2d3139] text-xs">
                        {filteredInvitations.map((inv: any) => {
                          let statusBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
                          if (inv.status === 'ACCEPTED') statusBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                          if (inv.status === 'EXPIRED') statusBadge = 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
                          if (inv.status === 'REVOKED') statusBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400';

                          let deliveryBadge = 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400';
                          if (inv.deliveryStatus === 'DELIVERED') deliveryBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                          if (inv.deliveryStatus === 'FAILED') deliveryBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400';

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">{inv.email}</td>
                              <td className="px-5 py-4 uppercase font-bold text-[10px] tracking-wide text-slate-500">{inv.role === 'VIEWER' ? 'Guest' : inv.role.toLowerCase()}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase shrink-0 ${statusBadge}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold flex items-center gap-1 w-fit ${deliveryBadge}`} title={inv.deliveryError || undefined}>
                                  {inv.deliveryStatus}
                                  {inv.deliveryError && <AlertCircle className="w-3 h-3 text-rose-500" />}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-slate-450 dark:text-slate-500">
                                {new Date(inv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="px-5 py-4 text-slate-450 dark:text-slate-500 font-medium">
                                {inv.resentCount || 0}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {inv.status === 'PENDING' && (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleCopyInviteLink(inv.token)}
                                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                                      title="Copy invitation link"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleResendInvite(inv.id)}
                                      className="p-1 rounded text-blue-500 hover:bg-blue-500/10 transition-colors"
                                      title="Resend invitation link"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRevokeInvite(inv.id)}
                                      className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                      title="Cancel and revoke invite link"
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
          );
        })()}

        {/* TAB 3: BRANDING & EMAIL TEMPLATES */}
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start animate-fade-in divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Branding Inputs Form */}
            <form onSubmit={handleSaveBranding} className="space-y-6 pb-8 lg:pb-0 lg:pr-8">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-150 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" /> Workspace Custom Branding
                </h3>
                <button
                  type="submit"
                  disabled={updatingBranding}
                  className="btn-primary py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {updatingBranding ? 'Saving changes...' : 'Save Settings'}
                </button>
              </div>

              {/* Accent & Button color pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingAccentColor}
                      onChange={e => setBrandingAccentColor(e.target.value)}
                      className="w-10 h-8 rounded-lg border border-slate-250 cursor-pointer p-0 shrink-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={brandingAccentColor}
                      onChange={e => setBrandingAccentColor(e.target.value)}
                      placeholder="#0052cc"
                      className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Button Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingButtonColor}
                      onChange={e => setBrandingButtonColor(e.target.value)}
                      className="w-10 h-8 rounded-lg border border-slate-250 cursor-pointer p-0 shrink-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={brandingButtonColor}
                      onChange={e => setBrandingButtonColor(e.target.value)}
                      placeholder="#0052cc"
                      className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Email details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Frankloo"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Reply-To Address</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={e => setReplyTo(e.target.value)}
                    placeholder="support@frankloo.local"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Email Subject Header</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="You're invited to join {{workspace_name}} on Frankloo"
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                  required
                />
                <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1">Variables supported: {"{{workspace_name}}"}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Email Footer Text</label>
                <input
                  type="text"
                  value={brandingFooter}
                  onChange={e => setBrandingFooter(e.target.value)}
                  placeholder="Frankloo Workspace Integration Services"
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">HTML Editor Override</label>
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = await showConfirm(
                        "Reset HTML Template",
                        "Reset HTML template to default markup?",
                        "Reset to Default",
                        "Cancel"
                      );
                      if (confirmed) setCustomBodyHtml('');
                    }}
                    className="text-[10px] text-rose-500 hover:underline font-bold"
                  >
                    Reset default
                  </button>
                </div>
                <textarea
                  value={customBodyHtml}
                  onChange={e => setCustomBodyHtml(e.target.value)}
                  placeholder="<div>Custom HTML Layout... Use standard variables: {{workspace_name}}, {{invite_link}}, etc.</div>"
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-mono h-32"
                />
                <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 leading-normal">Supported: {"{{workspace_name}}, {{workspace_logo}}, {{workspace_owner}}, {{role}}, {{invite_link}}, {{expiry_date}}, {{custom_message}}, {{accent_color}}, {{button_color}}, {{footer}}"}</p>
              </div>
            </form>

            {/* Email Branded Simulator */}
            <div className="pt-8 lg:pt-0 lg:pl-8 flex flex-col justify-start">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Branded Template Preview
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                    title="Toggle Dark Mode Preview"
                  >
                    {previewTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setPreviewDevice(previewDevice === 'desktop' ? 'mobile' : 'desktop')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                    title="Toggle Mobile View Preview"
                  >
                    {previewDevice === 'desktop' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Responsive Simulated Container */}
              <div className={`mx-auto w-full transition-all duration-300 border border-slate-200 dark:border-[#2d3139] rounded-xl overflow-hidden shadow-md bg-white ${previewDevice === 'mobile' ? 'max-w-[340px]' : 'max-w-full'}`}>
                {/* Simulated Email Client Frame */}
                <div className="bg-[#f0f2f5] dark:bg-[#161b22] p-3 text-xs border-b border-slate-255 dark:border-[#2d3139]">
                  <p className="truncate text-slate-650 dark:text-slate-400"><span className="font-bold text-slate-500">From:</span> {senderName} &lt;no-reply@frankloo.local&gt;</p>
                  <p className="truncate text-slate-650 dark:text-slate-400"><span className="font-bold text-slate-500">Subject:</span> {emailSubject.replace(/\{\{workspace_name\}\}/g, currentWorkspace?.name || 'Workspace')}</p>
                </div>
                <div
                  className={`p-4 overflow-y-auto max-h-[380px] transition-colors duration-200 ${previewTheme === 'dark' ? 'bg-[#0d1117] text-[#c9d1d9] dark-email' : 'bg-[#f6f8fa] text-[#24292f]'}`}
                  dangerouslySetInnerHTML={{ __html: getCompiledPreview() }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SMTP CONFIGURATION */}
        {activeTab === 'smtp' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start animate-fade-in divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* SMTP Inputs form */}
            <form onSubmit={handleSaveSmtp} className="lg:col-span-2 space-y-6 pb-8 lg:pb-0 lg:pr-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3 mb-2 border-b border-slate-150 dark:border-slate-800 gap-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-500" /> Server SMTP Connection
                </h3>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp}
                    className="btn-secondary py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 border border-slate-200 dark:border-[#2d3139]"
                  >
                    {testingSmtp ? 'Running diagnostics...' : 'Test Connection'}
                  </button>
                  <button
                    type="submit"
                    disabled={updatingSmtp}
                    className="btn-primary py-1.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm font-bold"
                  >
                    {updatingSmtp ? 'Saving configurations...' : 'Save Settings'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">SMTP Host Server</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">SMTP Port</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">SMTP Username</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">SMTP Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Sender Email Address (From)</label>
                  <input
                    type="text"
                    value={smtpFrom}
                    onChange={e => setSmtpFrom(e.target.value)}
                    placeholder="TaskFlow Pro <no-reply@frankloo.local>"
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold"
                  />
                </div>
                <div className="flex items-center justify-start h-full pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={e => setSmtpSecure(e.target.checked)}
                      className="rounded border-[#dfe1e6] dark:border-[#2d3139] bg-transparent text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-650 dark:text-slate-400 font-semibold select-none">Force Secure Connection (SSL/TLS)</span>
                  </label>
                </div>
              </div>
            </form>

            {/* Diagnostics details & info */}
            <div className="pt-8 lg:pt-0 lg:pl-8 space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-500" /> SMTP Support Info
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#8d96a0] leading-relaxed">
                TaskFlow delivers invitation messages securely through your SMTP configuration. Verify connection credentials to start sending.
              </p>
              <div className="bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] p-4 rounded-xl text-xs space-y-2 leading-relaxed text-slate-500">
                <p className="font-bold text-slate-800 dark:text-slate-350">Recommended parameters:</p>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                  <li><strong className="text-slate-655 dark:text-slate-400">Gmail:</strong> smtp.gmail.com, Port 587, Secure disabled, Auth via App Passwords.</li>
                  <li><strong className="text-slate-655 dark:text-slate-400">SendGrid:</strong> smtp.sendgrid.net, Port 587, User: apikey.</li>
                  <li><strong className="text-slate-655 dark:text-slate-400">Zoho:</strong> smtp.zoho.com, Port 465, Force Secure enabled.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Send Invitation Modal Drawer overlay ── */}
      {sendInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSendInviteModalOpen(false)}>
          <div className="bg-white dark:bg-[#161b22] border border-slate-250 dark:border-[#30363d] rounded-2xl p-5 w-full max-w-md shadow-2xl animate-scale-in text-xs" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205">Dispatch Workspace Invites</h3>
              <button onClick={() => setSendInviteModalOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => { handleSendInvitations(e).then(() => { setSendInviteModalOpen(false); }); }} className="space-y-4 pt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500 mb-1">Emails / Usernames (separated by comma, semicolon or newline)</label>
                <textarea
                  value={emailsInput}
                  onChange={e => setEmailsInput(e.target.value)}
                  placeholder="colleague@example.com, support@team.org"
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold h-24 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500 mb-1">Collaborator Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  <option value="MEMBER">Member (standard collaborate, create cards/lists)</option>
                  <option value="ADMIN">Admin (managing boards, members, integrations)</option>
                  <option value="VIEWER">Guest (read-only, view boards/wiki docs)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500 mb-1">Custom Message (Included in email template)</label>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Hi! Join our team workspace to collaborate on tasks."
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-[#2d3139] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 text-xs font-semibold h-20 resize-none"
                />
              </div>

              {gmailProfile?.googleEmail && gmailProfile?.hasToken ? (
                <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl flex items-start gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-[10px] uppercase tracking-wider leading-none">Google OAuth Active</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                      Invitations will send via your connected account: <strong className="text-slate-800 dark:text-slate-200">{gmailProfile.googleEmail}</strong>. SMTP server configuration is not required!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 text-[#b07b1d] dark:text-amber-450 p-3 rounded-xl flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-[10px] uppercase tracking-wider leading-none">Google Account Disconnected</p>
                    <p className="text-[10px] leading-relaxed">
                      Connect your Google Account under Integrations or configure a custom SMTP server under the <strong>SMTP Server Configuration</strong> tab to send invites directly from your own email.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-850">
                <button type="button" onClick={() => setSendInviteModalOpen(false)} className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={sendingInvites} className="btn-primary py-2 px-4 rounded-xl text-xs font-bold">
                  {sendingInvites ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Dispatch Invites
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
