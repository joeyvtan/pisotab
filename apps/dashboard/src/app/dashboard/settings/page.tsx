'use client';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

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

      <div className="card space-y-3">
        <h2 className="font-bold text-white">Notifications</h2>
        <p className="text-sm text-slate-400">
          Set <code className="bg-slate-700 px-1 rounded text-xs">TELEGRAM_BOT_TOKEN</code> and{' '}
          <code className="bg-slate-700 px-1 rounded text-xs">TELEGRAM_CHAT_ID</code> in your backend .env file to enable Telegram alerts.
        </p>
      </div>
    </div>
  );
}
