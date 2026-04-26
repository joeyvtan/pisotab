'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {checks.map(c => (
        <span key={c.label} className={`text-xs px-2 py-0.5 rounded-full ${c.ok ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
          {c.ok ? '✓' : '○'} {c.label}
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [tgToken, setTgToken]     = useState('');
  const [tgChatId, setTgChatId]   = useState('');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgMsg, setTgMsg]         = useState('');

  useEffect(() => {
    api.getMe().then(me => {
      if (me.telegram_bot_token) setTgToken(me.telegram_bot_token as string);
      if (me.telegram_chat_id)   setTgChatId(me.telegram_chat_id as string);
    }).catch(() => {});
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    setPwLoading(true);
    try {
      const res = await api.changePassword(currentPw, newPw);
      setPwSuccess(res.message);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="card space-y-4">
        <h2 className="font-bold text-white">Account</h2>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Username</label>
          <div className="input opacity-60 cursor-not-allowed">{user?.username}</div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Role</label>
          <div className="input opacity-60 cursor-not-allowed capitalize">{user?.role}</div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Password</label>
            <input className="input" type={showPw ? 'text' : 'password'}
              value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              placeholder="Enter current password" autoComplete="current-password" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">New Password</label>
            <input className="input" type={showPw ? 'text' : 'password'}
              value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Enter new password" autoComplete="new-password" />
            <PasswordStrength password={newPw} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Confirm New Password</label>
            <input className="input" type={showPw ? 'text' : 'password'}
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat new password" autoComplete="new-password" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} className="accent-orange-500" />
            Show passwords
          </label>
          {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
          {pwSuccess && <p className="text-green-400 text-sm">{pwSuccess}</p>}
          <button type="submit" className="btn-primary w-full" disabled={pwLoading}>
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold text-white">API Connection</h2>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Backend URL</label>
          <div className="input opacity-60 text-sm">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}</div>
        </div>
        <p className="text-xs text-slate-500">
          To change, set NEXT_PUBLIC_API_URL in your .env file.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold text-white">Android App Setup</h2>
        <p className="text-sm text-slate-400">
          Configure the Android kiosk app by entering the backend URL and device ID in the app settings screen.
        </p>
        <div className="bg-slate-700 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">API URL</span>
            <span className="text-white font-mono text-xs">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Default port</span>
            <span className="text-white font-mono text-xs">4000</span>
          </div>
        </div>
      </div>

      {/* Telegram Notifications */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">Telegram Notifications</h2>
        <p className="text-sm text-slate-400">
          Set your own Telegram bot to receive alerts for your devices. Leave blank to use the system default.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Bot Token</label>
            <input className="input text-sm font-mono" placeholder="123456789:AABBCCDDEEFFaabbccddeeff..."
              value={tgToken} onChange={e => setTgToken(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">Get from @BotFather on Telegram</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Chat ID</label>
            <input className="input text-sm font-mono" placeholder="-100123456789"
              value={tgChatId} onChange={e => setTgChatId(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">Your Telegram user ID or group chat ID</p>
          </div>
          {tgMsg && <p className={`text-sm ${tgMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{tgMsg}</p>}
          <div className="flex gap-2">
            <button className="btn-primary text-sm" disabled={tgLoading} onClick={async () => {
              setTgLoading(true); setTgMsg('');
              try {
                await api.updateTelegram(tgToken, tgChatId);
                setTgMsg('Telegram settings saved');
              } catch (e: unknown) {
                setTgMsg('Error: ' + (e instanceof Error ? e.message : 'Failed'));
              } finally { setTgLoading(false); }
            }}>
              {tgLoading ? 'Saving...' : 'Save Telegram Settings'}
            </button>
            {(tgToken || tgChatId) && (
              <button className="btn-secondary text-sm" disabled={tgLoading} onClick={async () => {
                setTgLoading(true); setTgMsg('');
                try {
                  await api.updateTelegram('', '');
                  setTgToken(''); setTgChatId('');
                  setTgMsg('Telegram settings cleared');
                } catch { setTgMsg('Error clearing settings'); }
                finally { setTgLoading(false); }
              }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
