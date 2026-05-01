'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'A-Z',      ok: /[A-Z]/.test(password) },
    { label: 'a-z',      ok: /[a-z]/.test(password) },
    { label: '0-9',      ok: /[0-9]/.test(password) },
    { label: '#@!',      ok: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {checks.map(c => (
        <span key={c.label} className={`text-xs px-1.5 py-0.5 rounded ${c.ok ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loginDirect, token } = useAuth();

  const [email,    setEmail]    = useState('');
  const [fullName, setFullName] = useState('');
  const [bizName,  setBizName]  = useState('');
  const [profLoading, setProfLoading] = useState(false);
  const [profMsg,     setProfMsg]     = useState('');
  const [profError,   setProfError]   = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg,     setPwMsg]     = useState('');
  const [pwError,   setPwError]   = useState('');

  useEffect(() => {
    api.getMe().then(me => {
      setEmail((me as { email?: string }).email || '');
      setFullName((me as { full_name?: string }).full_name || '');
      setBizName((me as { business_name?: string }).business_name || '');
    }).catch(() => {});
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfError(''); setProfMsg('');
    setProfLoading(true);
    try {
      const res = await api.updateProfile({
        email:         email.trim()   || undefined,
        full_name:     fullName.trim() || undefined,
        business_name: bizName.trim()  || undefined,
      }) as { ok: boolean; user?: NonNullable<typeof user> };
      setProfMsg('Profile updated successfully');
      if (res.ok && res.user) {
        loginDirect(token, { ...user!, ...res.user });
      }
    } catch (err: unknown) {
      setProfError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally { setProfLoading(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(''); setPwMsg('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      const res = await api.changePassword(currentPw, newPw);
      setPwMsg(res.message);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally { setPwLoading(false); }
  }

  const roleBadge: Record<string, string> = {
    superadmin: 'text-purple-400',
    admin:      'text-orange-400',
    staff:      'text-slate-400',
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      {/* Avatar + identity */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-2xl shrink-0">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="text-white font-semibold text-lg">{user?.username}</div>
          <div className={`text-sm font-medium capitalize ${roleBadge[user?.role ?? ''] ?? 'text-slate-400'}`}>
            {user?.role}
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">Account Info</h2>
        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
            <input className="input" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Business Name</label>
            <input className="input" value={bizName} onChange={e => setBizName(e.target.value)}
              placeholder="Your shop or business name" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" />
            <p className="text-xs text-slate-500 mt-1">Used for license expiry reminders and notifications.</p>
          </div>
          {profError && <p className="text-red-400 text-sm">{profError}</p>}
          {profMsg   && <p className="text-green-400 text-sm">{profMsg}</p>}
          <button type="submit" className="btn-primary w-full" disabled={profLoading}>
            {profLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Password</label>
            <input className="input" type={showPw ? 'text' : 'password'}
              value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              autoComplete="current-password" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">New Password</label>
            <input className="input" type={showPw ? 'text' : 'password'}
              value={newPw} onChange={e => setNewPw(e.target.value)}
              autoComplete="new-password" />
            <PasswordStrength password={newPw} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Confirm New Password</label>
            <input className="input" type={showPw ? 'text' : 'password'}
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              autoComplete="new-password" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} className="accent-orange-500" />
            Show passwords
          </label>
          {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
          {pwMsg   && <p className="text-green-400 text-sm">{pwMsg}</p>}
          <button type="submit" className="btn-primary w-full" disabled={pwLoading}>
            {pwLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
