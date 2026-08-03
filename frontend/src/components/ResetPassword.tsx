import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, KeyRound, Mail, ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { apiUrl } from '../config/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Mode 1: Request reset link via email
  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(apiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset link');
      setSuccess(data.message || 'Check your email inbox for password reset instructions.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally { setLoading(false); }
  };

  // Mode 2: Reset password using verification token from email
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(apiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess('Password reset successfully! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Verification failed or link expired. Please request a new link.');
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
            {token ? 'Set New Password' : 'Forgot Password?'}
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
            {token ? 'Enter your new password below' : 'Enter your email to receive a secure password reset link'}
          </p>
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

          {!token ? (
            <form onSubmit={handleRequestLink} className="space-y-4">
              <div>
                <label className="tf-label">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@example.com" required className="tf-input" autoFocus />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2"
                style={{ padding: '10px 16px', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)' }}>
                <Mail className="w-4 h-4" />
                {loading ? 'Sending Link…' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="tf-label">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••" required className="tf-input" autoFocus />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2"
                style={{ padding: '10px 16px', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)' }}>
                <KeyRound className="w-4 h-4" />
                {loading ? 'Resetting…' : 'Update Password'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <Link to="/login" className="font-semibold hover:underline text-sm inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
