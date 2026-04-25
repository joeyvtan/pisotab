'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '', password: '', email: '', full_name: '', business_name: '',
  });
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required'); return;
    }
    setLoading(true);
    try {
      const res = await api.register({
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
        full_name: form.full_name.trim() || undefined,
        business_name: form.business_name.trim() || undefined,
      });
      setSuccess(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="card w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🪙</div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Request access to PisoTab Dashboard</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-900/40 border border-green-700 rounded-lg p-4 text-center">
              <p className="text-green-300 font-medium">Registration submitted!</p>
              <p className="text-slate-400 text-sm mt-2">{success}</p>
            </div>
            <Link href="/login"
              className="btn-primary w-full text-center block">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                <input className="input" value={form.full_name}
                  onChange={e => set('full_name', e.target.value)} placeholder="Juan dela Cruz" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Business Name</label>
                <input className="input" value={form.business_name}
                  onChange={e => set('business_name', e.target.value)} placeholder="Juan's Shop" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input className="input" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="juan@example.com" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username <span className="text-red-400">*</span></label>
              <input className="input" value={form.username}
                onChange={e => set('username', e.target.value)} placeholder="juanshop" autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min. 6 characters" autoComplete="new-password" />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  onClick={() => setShowPw(v => !v)}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Request Access'}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-400 hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
