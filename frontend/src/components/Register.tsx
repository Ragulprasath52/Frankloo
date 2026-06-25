import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { AlertCircle, Sparkles } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Register() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [email, setEmail] = useState(emailParam);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useStore((state) => state.setAuth);
  const navigate = useNavigate();
  const [googleClientId, setGoogleClientId] = useState<string>('');

  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/auth/google/client-id');
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
      const res = await fetch('http://127.0.0.1:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Google registration failed');
      setAuth(data.user, data.token);
      navigate(redirect);
    } catch (err: any) {
      setError(err.message || 'Google registration failed');
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
              text: 'signup_with',
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
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedUsername || !password) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://127.0.0.1:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          username: trimmedUsername,
          name: trimmedName,
          password,
          invitationToken: tokenParam
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Registration failed');
      setAuth(data.user, data.token);

      if (data.autoJoinedWorkspaceId) {
        await useStore.getState().fetchWorkspaces();
        await useStore.getState().fetchWorkspaceDetails(data.autoJoinedWorkspaceId);
        navigate('/');
      } else {
        navigate(redirect);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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

      {/* Right register form */}
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
            Create account
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>Get started with Frankloo for free</p>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-5"
              style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="tf-label">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name" className="tf-input" />
            </div>
            <div>
              <label className="tf-label">Username *</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="your_username" required className="tf-input" />
            </div>
            <div>
              <label className="tf-label">Email Address *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required className="tf-input" />
            </div>
            <div>
              <label className="tf-label">Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required className="tf-input" />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center mt-2"
              style={{ padding: '10px 16px', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)' }}>
              <Sparkles className="w-4 h-4" />
              {loading ? 'Creating account…' : 'Create Free Account'}
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
              Already have an account?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
