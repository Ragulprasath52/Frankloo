import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { AlertCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { apiUrl } from '../config/api';

export default function Login() {
  const { setAuth } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>('');

  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const res = await fetch(apiUrl('/auth/google/client-id'));
        const data = await res.json();
        if (data.clientId) {
          setGoogleClientId(data.clientId);
        }
      } catch (err) {
        console.error('Failed to fetch Google Client ID:', err);
      }
    };
    fetchClientId();
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Google authentication failed');
      localStorage.setItem('token', data.token);
      setAuth(data.user, data.token);
      navigate(redirect);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogleSignIn = () => {
      const win = window as any;
      if (win.google?.accounts?.id) {
        win.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          win.google.accounts.id.renderButton(
            btnContainer,
            {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'signin_with',
              shape: 'rectangular',
            }
          );
        }
      } else {
        setTimeout(initGoogleSignIn, 100);
      }
    };

    initGoogleSignIn();
  }, [googleClientId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Invalid credentials');
      localStorage.setItem('token', data.token);
      setAuth(data.user, data.token);
      navigate(redirect);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-body)' }}>
      {/* Left decorative panel — hidden on small screens */}
      <div className="hidden lg:flex w-[45%] flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0d1117 0%,#161b22 60%,#1c2128 100%)' }}>
        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle,#388bfd,transparent)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />

        <div className="relative z-10 text-center max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: 'rgba(56,139,253,0.12)', border: '1px solid rgba(56,139,253,0.2)' }}>
              <img src={logoImg} alt="logo" className="w-56 h-56 max-w-none" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-3 leading-tight"
            style={{ color: '#f0f6fc', fontFamily: 'var(--font-display)' }}>
            Frankloo
          </h2>
          <p className="text-base leading-relaxed" style={{ color: '#8d96a0' }}>
            Your self-hosted project management workspace — boards, goals, docs and team insights in one place.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: 'Kanban Boards', color: '#388bfd' },
              { label: 'Team Goals',    color: '#6366f1' },
              { label: 'Analytics',     color: '#10b981' },
            ].map(f => (
              <div key={f.label} className="rounded-xl p-3 text-xs font-semibold text-center transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: f.color }}>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo on mobile */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center mb-4"
              style={{ background: '#161b22', border: '1px solid var(--border)' }}>
              <img src={logoImg} alt="logo" className="w-48 h-48 max-w-none" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Frankloo
            </h1>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>Sign in to your workspace</p>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-5"
              style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="tf-label">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" className="tf-input" required autoFocus
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="tf-label mb-0">Password</label>
                <Link to="/reset-password" className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password" className="tf-input" required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
              style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.9375rem', padding: '10px 16px' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {googleClientId && (
            <>
              <div className="relative my-5 flex py-2 items-center">
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border)' }}></div>
                <span className="flex-shrink mx-4 text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Or continue with</span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border)' }}></div>
              </div>
              <div className="w-full flex justify-center mb-3">
                <div id="google-signin-btn" style={{ minHeight: '40px' }}></div>
              </div>
            </>
          )}

          <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
