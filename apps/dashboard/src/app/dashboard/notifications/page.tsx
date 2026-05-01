'use client';
import { useEffect, useState } from 'react';
import { api, Notification } from '@/lib/api';
import { format, fromUnixTime } from 'date-fns';

const TYPE_ICON: Record<string, string> = {
  account_approved:  '✅',
  purchase_approved: '🎉',
  purchase_rejected: '❌',
  license_expiry:    '⚠️',
  support_request:   '📬',
};

const TYPE_COLOR: Record<string, string> = {
  account_approved:  'text-green-400',
  purchase_approved: 'text-green-400',
  purchase_rejected: 'text-red-400',
  license_expiry:    'text-amber-400',
  support_request:   'text-blue-400',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);

  async function load() {
    setLoading(true);
    try { setNotifications(await api.getNotifications()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await api.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
  }

  async function markAllRead() {
    await api.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  }

  async function deleteOne(id: string) {
    await api.deleteNotification(id).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unread > 0 && (
            <p className="text-slate-400 text-sm mt-0.5">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="text-sm text-slate-400 hover:text-white transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="card text-slate-500 text-sm text-center py-8">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`card flex gap-3 cursor-pointer transition-colors ${!n.read ? 'border-l-2 border-orange-500' : 'opacity-60'}`}>
              <div className="text-xl shrink-0 mt-0.5">
                {TYPE_ICON[n.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-medium text-sm ${TYPE_COLOR[n.type] ?? 'text-white'}`}>
                    {n.title}
                  </p>
                  <span className="text-slate-600 text-xs shrink-0">
                    {format(fromUnixTime(n.created_at), 'MMM d · h:mm a')}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-0.5 whitespace-pre-line">{n.body}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                className="text-slate-600 hover:text-red-400 transition-colors text-sm shrink-0 mt-0.5">
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
