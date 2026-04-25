'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<{ message: string; reset_token?: string } | null>(null);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    if (!username.trim()) { setError('Username is required'); return; }
    setLoading(true);
    try {
      const res = await api.forgotPassword(username.trim());
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="card w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your username to get a reset token</p>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="bg-green-900/40 border border-green-700 rounded-lg p-4">
              <p className="text-green-300 text-sm font-medium">{result.message}</p>
              {result.reset_token && (
                <div className="mt-3">
                  <p className="text-xs text-slate-400 mb-1">Your reset token:</p>
                  <div className="bg-slate-800 rounded p-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-orange-400 text-xs break-all">{result.reset_token}</span>
                    <button
                      className="text-slate-400 hover:text-white text-xs shrink-0"
                      onClick={() => navigator.clipboard.writeText(result.reset_token!)}>
                      Copy
                    </button>
                  </div>
                  <Link href={`/reset-password?token=${result.reset_token}`}
                    className="btn-primary w-full text-center block mt-3 text-sm">
                    Reset Password Now
                  </Link>
                </div>
              )}
            </div>
            <Link href="/login" className="block text-center text-sm text-slate-500 hover:text-orange-400">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Get Reset Token'}
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
