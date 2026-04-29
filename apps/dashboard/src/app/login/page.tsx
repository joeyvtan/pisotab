'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function LoginPage() {
  const { login, loginDirect } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // TOTP step state
  const [totpStep, setTotpStep]       = useState(false);
  const [tempToken, setTempToken]     = useState('');
  const [totpCode, setTotpCode]       = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result?.requires_totp) {
        setTempToken(result.temp_token || '');
        setTotpStep(true);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTotpLoading(true);
    try {
      const res = await api.totpVerify(tempToken, totpCode);
      loginDirect(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="card w-full max-w-sm space-y-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jjt-logo.png" alt="JJT Logo" className="w-20 h-20 mx-auto mb-3 rounded-full object-contain" />
          <h1 className="text-2xl font-bold text-white">JJT PisoTab</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Dashboard</p>
        </div>

        {!totpStep ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  onClick={() => setShowPw(v => !v)}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTotpVerify} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="text-2xl">🔐</div>
              <p className="text-white font-medium">Two-Factor Authentication</p>
              <p className="text-slate-400 text-sm">Enter the 6-digit code from your authenticator app.</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Verification Code</label>
              <input
                className="input text-center font-mono tracking-widest text-xl"
                placeholder="000000"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                autoComplete="one-time-code" />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={totpLoading || totpCode.length !== 6}>
              {totpLoading ? 'Verifying...' : 'Verify'}
            </button>

            <button type="button" className="w-full text-sm text-slate-500 hover:text-slate-300"
              onClick={() => { setTotpStep(false); setTempToken(''); setTotpCode(''); setError(''); }}>
              Back to login
            </button>
          </form>
        )}

        {!totpStep && (
          <div className="flex justify-between text-sm text-slate-500">
            <Link href="/register" className="hover:text-orange-400 transition-colors">
              Create account
            </Link>
            <Link href="/forgot-password" className="hover:text-orange-400 transition-colors">
              Forgot password?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
