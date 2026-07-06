import React, { useState, useEffect } from 'react';
import {
  Mail, Send, History, Activity, X, RefreshCw, AlertCircle,
  Eye, Moon, Sun, Laptop, Smartphone, CheckCircle2, Clock,
  ShieldAlert, Sparkles, Server
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
    showConfirm
  } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'send' | 'history' | 'branding' | 'smtp'>('dashboard');

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-48px)] overflow-y-auto overflow-x-hidden space-y-6 flex flex-col justify-start select-none animate-fade-in text-[#172b4d] dark:text-[#b6c2cf]">
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
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#dfe1e6] dark:border-[#a6c5e229] pb-5 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-[#091e42] dark:text-[#f0f6fc] font-display">
            <Mail className="w-6 h-6 text-blue-500" />
            Invitations &amp; Custom Branding
          </h1>
          <p className="text-xs sm:text-sm text-[#5e6c84] dark:text-[#9fadbc] mt-1 leading-snug">
            Configure custom SMTP settings, design branded templates, track acceptance analytics, and send batch email invites.
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-[#1d2125] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 max-w-full">
          {(['dashboard', 'send', 'history', 'branding', 'smtp'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-[#2c333a] shadow-sm text-blue-600 dark:text-[#579dff] font-bold' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
            >
              {tab === 'smtp' ? 'SMTP config' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabbed Views */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        
        {/* =========================================================
           TAB 1: INTEGRATED DASHBOARD WIDGETS
           ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Typographic Stats Ribbon (Frameless, integrated, modern stats layout) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x divide-slate-200 dark:divide-slate-800 pb-8 border-b border-slate-200 dark:border-slate-800">
              <div className="pb-4 md:pb-0 border-b border-slate-150 dark:border-slate-850 md:border-b-0 md:pr-8 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending Invitations</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-[#091e42] dark:text-[#f0f6fc]">{statsLoading ? '...' : dashboardStats?.pending || 0}</span>
                    <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md">Active links</span>
                  </div>
                </div>
              </div>

              <div className="pb-4 md:pb-0 border-b border-slate-150 dark:border-slate-850 md:border-b-0 md:px-8 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Accepted Invitations</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-[#091e42] dark:text-[#f0f6fc]">{statsLoading ? '...' : dashboardStats?.accepted || 0}</span>
                    <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">Joined team</span>
                  </div>
                </div>
              </div>

              <div className="md:pl-8 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Expired &amp; Revoked</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-[#091e42] dark:text-[#f0f6fc]">{statsLoading ? '...' : (dashboardStats?.expired || 0) + (dashboardStats?.revoked || 0)}</span>
                    <span className="text-[10px] text-rose-500 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-md">Inactive links</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invitation Activity Logs Feed */}
            <div className="pt-4">
              {/* Timeline Activity Feed */}
              <div className="flex flex-col justify-start pb-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Activity className="w-4 h-4 text-emerald-500" /> Recent Invitation Activity Logs
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 min-h-[300px] max-h-[380px] space-y-4 relative border-l border-slate-200 dark:border-slate-800 ml-2 pl-6 pt-1">
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
                        <div key={log.id} className="relative text-xs space-y-0.5">
                          <span className={`absolute -left-[29px] top-1 w-2 h-2 rounded-full ring-4 ring-[#f6f8fa] dark:ring-[#0d1117] ${dotColor}`} />
                          <div className="flex justify-between gap-4">
                            <p className="font-medium text-slate-800 dark:text-[#f0f6fc]">
                              <span className="font-bold">{log.email}</span>: {log.details}
                            </p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono tracking-wider block">Action: {log.action}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
           TAB 2: SEND EMAIL INVITATIONS
           ========================================================= */}
        {activeTab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start animate-fade-in divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Form Column */}
            <form onSubmit={handleSendInvitations} className="space-y-6 pb-8 lg:pb-0 lg:pr-8">
              <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-150 dark:border-slate-800">
                <Send className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-sm text-[#091e42] dark:text-[#f0f6fc]">Invite Workspace Members</h3>
              </div>

              <div className="space-y-1.5">
                <label className="tf-label">Emails / Usernames (separated by comma, semicolon or newline)</label>
                <textarea
                  value={emailsInput}
                  onChange={e => setEmailsInput(e.target.value)}
                  placeholder="colleague@example.com, developer@company.com, support@team.org"
                  className="tf-input text-xs w-full h-24"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="tf-label">Collaborator Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="tf-input text-xs w-full"
                >
                  <option value="MEMBER">Member (standard collaborate, create cards/lists)</option>
                  <option value="ADMIN">Admin (managing boards, members, integrations)</option>
                  <option value="VIEWER">Guest (read-only, view boards/wiki docs)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="tf-label">Custom Message (Included in email template)</label>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Hi! Join our team workspace to start collaborating on tasks, documentation, and milestones."
                  className="tf-input text-xs w-full h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingInvites}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5 shadow-sm text-xs"
              >
                {sendingInvites ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching Workspace Invites...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Workspace Invites
                  </>
                )}
              </button>
            </form>

            {/* Branded Email Live Preview Column (Updating in real-time) */}
            <div className="pt-8 lg:pt-0 lg:pl-8 flex flex-col justify-start">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Live Branded Email Preview
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

              {/* Responsive Container */}
              <div className={`mx-auto w-full transition-all duration-300 border border-slate-255 dark:border-slate-800 rounded-xl overflow-hidden shadow-md bg-white ${previewDevice === 'mobile' ? 'max-w-[340px]' : 'max-w-full'}`}>
                {/* Simulated Email Client Frame */}
                <div className="bg-[#f0f2f5] dark:bg-[#1d2125] p-3 text-xs border-b border-slate-255 dark:border-slate-800">
                  <p className="truncate"><span className="font-bold text-slate-500">From:</span> {senderName} &lt;no-reply@frankloo.local&gt;</p>
                  <p className="truncate"><span className="font-bold text-slate-500">Subject:</span> {emailSubject.replace(/\{\{workspace_name\}\}/g, currentWorkspace?.name || 'Workspace')}</p>
                </div>
                <div
                  className={`p-4 overflow-y-auto max-h-[350px] transition-colors duration-200 ${previewTheme === 'dark' ? 'bg-[#0d1117] text-[#c9d1d9] dark-email' : 'bg-[#f6f8fa] text-[#24292f]'}`}
                  dangerouslySetInnerHTML={{ __html: getCompiledPreview() }}
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
           TAB 3: INVITATION HISTORY TABLE
           ========================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#091e42] dark:text-[#f0f6fc] flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                Invitation History
              </h3>
              <button
                onClick={() => fetchWorkspaceInvitations(workspaceId)}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh List
              </button>
            </div>

            {(!workspaceInvitations || workspaceInvitations.length === 0) ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Mail className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-semibold text-sm">No invitations found</p>
                <p className="text-xs">Any pending or accepted invites will appear in this log trail.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse bg-white dark:bg-[#161b22]">
                  <thead>
                    <tr className="border-b border-[#dfe1e6] dark:border-[#a6c5e229] bg-slate-50/50 dark:bg-[#1d2125]/20 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3.5">Recipient Email</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Invite Status</th>
                      <th className="px-5 py-3.5">Delivery Status</th>
                      <th className="px-5 py-3.5">Date Sent</th>
                      <th className="px-5 py-3.5">Telemetry</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {workspaceInvitations.map((inv: any) => {
                      // Status color resolution
                      let statusBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
                      if (inv.status === 'ACCEPTED') statusBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                      if (inv.status === 'EXPIRED') statusBadge = 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
                      if (inv.status === 'REVOKED') statusBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400';

                      // Delivery color resolution
                      let deliveryBadge = 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400';
                      if (inv.deliveryStatus === 'DELIVERED') deliveryBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                      if (inv.deliveryStatus === 'FAILED') deliveryBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all">
                          <td className="px-5 py-4 font-semibold text-slate-800 dark:text-[#f0f6fc]">{inv.email}</td>
                          <td className="px-5 py-4 uppercase font-bold text-[10px] tracking-wide text-slate-500">{inv.role === 'VIEWER' ? 'Guest' : inv.role.toLowerCase()}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${deliveryBadge}`} title={inv.deliveryError || undefined}>
                              {inv.deliveryStatus}
                              {inv.deliveryError && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-400">{new Date(inv.createdAt).toLocaleString()}</td>
                          <td className="px-5 py-4 text-slate-400 space-y-0.5 text-[10px]">
                            <p>Resends: {inv.resentCount}</p>
                            {inv.lastResentAt && <p>Last: {new Date(inv.lastResentAt).toLocaleDateString()}</p>}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {inv.status === 'PENDING' && (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleResendInvite(inv.id)}
                                  className="btn-secondary py-1 px-2 flex items-center gap-1 text-[11px]"
                                  title="Resend workspace invite link"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" /> Resend
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  className="btn-danger hover:bg-rose-500/10 text-rose-500 py-1 px-2 flex items-center gap-1 text-[11px]"
                                  title="Revoke and cancel invite link"
                                >
                                  <X className="w-3.5 h-3.5" /> Revoke
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
            )}
          </div>
        )}

        {/* =========================================================
           TAB 4: EMAIL TEMPLATE & BRANDING SETTINGS
           ========================================================= */}
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start animate-fade-in divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Branding Inputs Form */}
            <form onSubmit={handleSaveBranding} className="space-y-6 pb-8 lg:pb-0 lg:pr-8">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-150 dark:border-slate-800">
                <h3 className="font-bold text-sm text-[#091e42] dark:text-[#f0f6fc] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" /> Workspace Custom Branding
                </h3>
                <button
                  type="submit"
                  disabled={updatingBranding}
                  className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {updatingBranding ? 'Saving changes...' : 'Save Settings'}
                </button>
              </div>


              {/* Accent & Button color pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="tf-label">Branding Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingAccentColor}
                      onChange={e => setBrandingAccentColor(e.target.value)}
                      className="w-10 h-8 rounded border border-slate-255 cursor-pointer p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={brandingAccentColor}
                      onChange={e => setBrandingAccentColor(e.target.value)}
                      placeholder="#0052cc"
                      className="tf-input text-xs w-full py-1.5 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="tf-label">Button Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingButtonColor}
                      onChange={e => setBrandingButtonColor(e.target.value)}
                      className="w-10 h-8 rounded border border-slate-255 cursor-pointer p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={brandingButtonColor}
                      onChange={e => setBrandingButtonColor(e.target.value)}
                      placeholder="#0052cc"
                      className="tf-input text-xs w-full py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Email details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="tf-label">Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Frankloo"
                    className="tf-input text-xs w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="tf-label">Reply-to Email Address</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={e => setReplyTo(e.target.value)}
                    placeholder="support@frankloo.local"
                    className="tf-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="tf-label">Email Subject Header</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="You're invited to join {{workspace_name}} on Frankloo"
                  className="tf-input text-xs w-full"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Variables supported: {"{{workspace_name}}"}</p>
              </div>

              <div className="space-y-1.5">
                <label className="tf-label">Email Footer Text</label>
                <input
                  type="text"
                  value={brandingFooter}
                  onChange={e => setBrandingFooter(e.target.value)}
                  placeholder="Frankloo Workspace Integration Services"
                  className="tf-input text-xs w-full"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="tf-label mb-0">HTML Editor Override (Leave empty for default template)</label>
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
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Reset default
                  </button>
                </div>
                <textarea
                  value={customBodyHtml}
                  onChange={e => setCustomBodyHtml(e.target.value)}
                  placeholder="<div>Custom HTML Layout... Use standard variables: {{workspace_name}}, {{invite_link}}, etc.</div>"
                  className="tf-input text-xs w-full h-32 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Variables supported: {"{{workspace_name}}, {{workspace_logo}}, {{workspace_owner}}, {{role}}, {{invite_link}}, {{expiry_date}}, {{custom_message}}, {{accent_color}}, {{button_color}}, {{footer}}"}</p>
              </div>
            </form>

            {/* Email Branded Simulator */}
            <div className="pt-8 lg:pt-0 lg:pl-8 flex flex-col justify-start">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Customized Live Template Preview
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

              {/* Responsive Container */}
              <div className={`mx-auto w-full transition-all duration-300 border border-slate-255 dark:border-slate-800 rounded-xl overflow-hidden shadow-md bg-white ${previewDevice === 'mobile' ? 'max-w-[340px]' : 'max-w-full'}`}>
                {/* Simulated Email Client Frame */}
                <div className="bg-[#f0f2f5] dark:bg-[#1d2125] p-3 text-xs border-b border-slate-255 dark:border-slate-800">
                  <p className="truncate"><span className="font-bold text-slate-500">From:</span> {senderName} &lt;no-reply@frankloo.local&gt;</p>
                  <p className="truncate"><span className="font-bold text-slate-500">Subject:</span> {emailSubject.replace(/\{\{workspace_name\}\}/g, currentWorkspace?.name || 'Workspace')}</p>
                </div>
                <div
                  className={`p-4 overflow-y-auto max-h-[380px] transition-colors duration-200 ${previewTheme === 'dark' ? 'bg-[#0d1117] text-[#c9d1d9] dark-email' : 'bg-[#f6f8fa] text-[#24292f]'}`}
                  dangerouslySetInnerHTML={{ __html: getCompiledPreview() }}
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
           TAB 5: SMTP SERVER CONFIGURATION
           ========================================================= */}
        {activeTab === 'smtp' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start animate-fade-in divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* SMTP Inputs form */}
            <form onSubmit={handleSaveSmtp} className="lg:col-span-2 space-y-6 pb-8 lg:pb-0 lg:pr-8">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-150 dark:border-slate-800">
                <h3 className="font-bold text-sm text-[#091e42] dark:text-[#f0f6fc] flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-500" /> Workspace SMTP Server Settings
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testingSmtp ? 'Running diagnostics...' : 'Test SMTP Connection'}
                  </button>
                  <button
                    type="submit"
                    disabled={updatingSmtp}
                    className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    {updatingSmtp ? 'Saving configurations...' : 'Save Settings'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="tf-label">SMTP Host Server</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com, smtp.sendgrid.net"
                    className="tf-input text-xs w-full"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="tf-label">SMTP Port Number</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    placeholder="587, 465, 25"
                    className="tf-input text-xs w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="tf-label">SMTP Username Address</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="user@example.com"
                    className="tf-input text-xs w-full"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="tf-label">SMTP Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="tf-input text-xs w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="tf-label">Sender Email Address (From)</label>
                  <input
                    type="text"
                    value={smtpFrom}
                    onChange={e => setSmtpFrom(e.target.value)}
                    placeholder="TaskFlow Pro <no-reply@frankloo.local>"
                    className="tf-input text-xs w-full"
                  />
                </div>
                <div className="flex items-center justify-start h-full pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={e => setSmtpSecure(e.target.checked)}
                      className="rounded border-[#dfe1e6] text-blue-600 focus:ring-blue-500"
                    />
                    <span>Force Secure Connection (SSL/TLS for port 465)</span>
                  </label>
                </div>
              </div>
            </form>

            {/* Diagnostics details & info */}
            <div className="pt-8 lg:pt-0 lg:pl-8 space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">SMTP Support Center</h4>
              <p className="text-xs text-[#5e6c84] dark:text-[#9fadbc] leading-relaxed">
                Frankloo supports standard SMTP servers for delivering workspace collaborator invitations. 
              </p>
              <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs space-y-2 leading-relaxed text-slate-500">
                <p className="font-bold text-[#172b4d] dark:text-[#f0f6fc]">Recommended configs:</p>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                  <li><strong className="text-slate-700 dark:text-slate-350">Gmail:</strong> smtp.gmail.com, Port 587, Secure connection disabled, Auth via App Passwords.</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">SendGrid:</strong> smtp.sendgrid.net, Port 587, User: apikey.</li>
                  <li><strong className="text-slate-700 dark:text-slate-350">Zoho:</strong> smtp.zoho.com, Port 465, Force Secure enabled.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
