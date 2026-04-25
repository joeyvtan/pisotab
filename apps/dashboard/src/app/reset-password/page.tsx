'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const [token, setToken]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    const t = params.get('token');
    if (t) setToken(t);
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!token.trim()) { setError('Reset token is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await api.resetPassword(token.trim(), password);
      setSuccess(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="card w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your reset token and new password</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-900/40 border border-green-700 rounded-lg p-4 text-center">
              <p className="text-green-300 font-medium">{success}</p>
            </div>
            <Link href="/login" className="btn-primary w-full text-center block">
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Reset Token</label>
              <input className="input font-mono text-sm" value={token}
                onChange={e => setToken(e.target.value)} placeholder="Paste token here" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">New Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" autoComplete="new-password" />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  onClick={() => setShowPw(v => !v)}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Confirm Password</label>
              <input className="input" type={showPw ? 'text' : 'password'}
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password" autoComplete="new-password" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
            <Link href="/login" className="block text-center text-sm text-slate-500 hover:text-orange-400">
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
