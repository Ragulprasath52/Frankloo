import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ShieldAlert, Check, X, ArrowRight } from 'lucide-react';


export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { token: authToken, acceptInvitation, declineInvitation, verifyInvitationToken, user, logout, fetchMe } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<any>(null);

  const isEmailMismatch = user && invitationDetails && user.email.toLowerCase() !== invitationDetails.email.toLowerCase();

  useEffect(() => {
    if (authToken) {
      fetchMe();
    }
  }, [authToken]);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
      return;
    }

    const verifyToken = async () => {
      setLoading(true);
      setError('');
      try {
        const details = await verifyInvitationToken(token);
        setInvitationDetails(details);
      } catch (err: any) {
        setError(err.message || 'Failed to verify invitation. The invitation may have expired or belongs to a different email.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      await acceptInvitation(token);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. The invitation may have expired or belongs to a different email.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      await declineInvitation(token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation.');
    } finally {
      setLoading(false);
    }
  };

  const loginRedirectUrl = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  const registerRedirectUrl = `/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}&email=${encodeURIComponent(invitationDetails?.email || '')}&token=${encodeURIComponent(token || '')}`;



  // Custom colors styling
  const customAccentColor = invitationDetails?.branding?.accentColor || '#0052cc';
  const customButtonColor = invitationDetails?.branding?.buttonColor || '#0052cc';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-body)' }}>
      <div
        className="w-full max-w-md modal-card p-8 shadow-2xl rounded-2xl border relative overflow-hidden"
        style={{ borderColor: customAccentColor + '40' }}
      >
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ background: `radial-gradient(circle, ${customAccentColor}, transparent)` }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />

        <div className="flex justify-center mb-6 relative z-10 animate-scale-in">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border relative group text-white font-extrabold text-2xl"
            style={{ 
              background: `linear-gradient(135deg, ${customAccentColor}, #6366f1)`,
              borderColor: `${customAccentColor}40`,
              boxShadow: `0 8px 20px -6px ${customAccentColor}60`,
              fontFamily: 'var(--font-display)'
            }}
          >
            {invitationDetails?.workspaceName?.[0]?.toUpperCase() || 'W'}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Workspace Invitation
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
          {invitationDetails ? (
            <>
              You have been invited to join <strong style={{ color: customAccentColor }}>{invitationDetails.workspaceName}</strong> as a <strong>{invitationDetails.role === 'VIEWER' ? 'Guest' : invitationDetails.role.toLowerCase()}</strong>.
            </>
          ) : (
            'Verifying invitation details...'
          )}
        </p>

        {error && (
          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {authToken && (error.toLowerCase().includes('different email') || error.toLowerCase().includes('belongs to')) && (
              <button
                onClick={() => logout()}
                className="btn-primary w-full justify-center py-2.5 text-sm font-semibold flex items-center gap-1.5 text-white"
                style={{ backgroundColor: customButtonColor, borderColor: customButtonColor }}
              >
                Logout &amp; Switch Accounts
              </button>
            )}
          </div>
        )}

        {success ? (
          <div className="text-center py-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Invitation Accepted!</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Redirecting you to your dashboard...</p>
          </div>
        ) : !authToken ? (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-blue-600/5 border border-blue-500/10 text-xs text-blue-650 dark:text-[#579dff] leading-relaxed">
              To accept this invitation, please log in to your account or create a new one. The invite will automatically attach to your account if your email matches.
            </div>
            <div className="flex flex-col gap-3">
              <Link
                to={loginRedirectUrl}
                className="btn-primary w-full justify-center py-2.5 text-sm font-semibold flex items-center gap-1.5"
                style={{ backgroundColor: customButtonColor, borderColor: customButtonColor }}
              >
                Sign In <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={registerRedirectUrl}
                className="btn-secondary w-full justify-center py-2.5 text-sm font-semibold text-center border-slate-200 dark:border-slate-800"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            {isEmailMismatch ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs leading-relaxed">
                  This invitation was sent to <strong className="font-bold">{invitationDetails.email}</strong>, but you are signed in as <strong className="font-bold">{user?.email}</strong>.
                </div>
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="btn-primary w-full justify-center py-2.5 text-sm font-semibold flex items-center gap-1.5 text-white"
                  style={{ backgroundColor: customButtonColor, borderColor: customButtonColor }}
                >
                  Logout &amp; Switch Accounts
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-[#091e4205] dark:bg-[#a6c5e20a] border border-[#dfe1e6] dark:border-[#a6c5e229] text-center">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    You are currently signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>.
                  </p>
                  <button
                    onClick={() => logout()}
                    className="text-xs font-semibold mt-2 transition-all hover:underline"
                    style={{ color: customAccentColor }}
                  >
                    Not you? Logout &amp; Switch Accounts
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleDecline}
                    disabled={loading}
                    className="btn-secondary flex-1 justify-center py-2.5 text-sm font-semibold flex items-center gap-1.5 border-slate-250 dark:border-slate-800"
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="btn-primary flex-1 justify-center py-2.5 text-sm font-semibold flex items-center gap-1.5 text-white"
                    style={{ backgroundColor: customButtonColor, borderColor: customButtonColor }}
                  >
                    <Check className="w-4 h-4" /> {loading ? 'Accepting...' : 'Accept'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
