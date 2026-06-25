import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { apiUrl } from '../config/api';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !newPassword) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(apiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess('Password reset successfully! Redirecting to login…');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your details.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-body)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center mb-4 shrink-0"
            style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)' }}>
            <img src={logoImg} alt="logo" className="w-48 h-48 max-w-none shrink-0" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Reset password
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Update your account credentials</p>
        </div>

        <div className="rounded-xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-5"
              style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-5"
              style={{ background: 'var(--success-subtle)', border: '1px solid var(--success)', color: 'var(--success)' }}>
              <CheckCircle className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="tf-label">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="demo@frankloo.pro" required className="tf-input" autoFocus />
            </div>
            <div>
              <label className="tf-label">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="demo_user" required className="tf-input" />
            </div>
            <div>
              <label className="tf-label">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••" required className="tf-input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2"
              style={{ padding: '10px 16px', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)' }}>
              <KeyRound className="w-4 h-4" />
              {loading ? 'Processing…' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <Link to="/login" className="font-semibold hover:underline text-sm" style={{ color: 'var(--accent)' }}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
