'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, RevenueRow, StaffUser } from '@/lib/api';
import { useDevices } from '@/hooks/useDevices';
import { formatPeso } from '@/lib/utils';

export default function AccountDashboardPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { devices, loading } = useDevices(userId);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [admin, setAdmin] = useState<StaffUser | null>(null);

  useEffect(() => {
    api.getRevenue(userId).then(setRevenue).catch(() => {});
    // Load admin info for display
    api.getUsers()
      .then(users => setAdmin(users.find(u => u.id === userId) ?? null))
      .catch(() => {});
  }, [userId]);

  const online = devices.filter(d => d.status !== 'offline').length;
  const inSession = devices.filter(d => d.status === 'in_session').length;
  const todayRevenue = revenue[0]?.total_revenue || 0;
  const todaySessions = revenue[0]?.session_count || 0;

  const displayName = admin?.business_name || admin?.username || 'Loading...';

  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <span className="text-base">←</span>
          <span>All Accounts</span>
        </button>
        <span className="text-slate-600">/</span>
        <h1 className="text-xl font-bold text-white truncate">{displayName}</h1>
        {admin?.username && admin.business_name && (
          <span className="text-slate-400 text-sm hidden sm:inline">@{admin.username}</span>
        )}
      </div>

      {/* Quick links to this account's other pages */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: '📱 Devices', href: `/dashboard/devices?account=${userId}` },
          { label: '⏱ Sessions', href: `/dashboard/sessions?account=${userId}` },
          { label: '📋 Revenue', href: `/dashboard/logs?account=${userId}` },
        ].map(link => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📱" label="Total Devices" value={String(devices.length)} />
        <StatCard icon="🟢" label="Online" value={String(online)} color="text-green-400" />
        <StatCard icon="⏱" label="In Session" value={String(inSession)} color="text-orange-400" />
        <StatCard icon="💰" label="Today's Revenue" value={formatPeso(todayRevenue)} color="text-yellow-400" />
      </div>

      {/* Active sessions */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Active Sessions</h2>
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : inSession === 0 ? (
          <p className="text-slate-400">No active sessions</p>
        ) : (
          <div className="space-y-2">
            {devices.filter(d => d.status === 'in_session').map(d => (
              <div key={d.id} className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                <div>
                  <span className="font-medium text-white">{d.name}</span>
                  <span className="text-slate-400 text-sm ml-2">{d.location_name}</span>
                </div>
                <div className="font-mono text-orange-400 font-bold">
                  {Math.floor((d.time_remaining_secs || 0) / 60)}:{String((d.time_remaining_secs || 0) % 60).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All devices quick view */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">
          Devices
          <span className="ml-2 text-slate-400 font-normal text-sm">({devices.length})</span>
        </h2>
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : devices.length === 0 ? (
          <p className="text-slate-400">No devices registered</p>
        ) : (
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    d.status === 'in_session' ? 'bg-orange-400' :
                    d.status === 'online'     ? 'bg-green-400' : 'bg-slate-500'
                  }`} />
                  <span className="text-white text-sm font-medium truncate">{d.name}</span>
                  {d.location_name && (
                    <span className="text-slate-400 text-xs truncate hidden sm:inline">{d.location_name}</span>
                  )}
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${
                  d.status === 'in_session' ? 'text-orange-400' :
                  d.status === 'online'     ? 'text-green-400' : 'text-slate-500'
                }`}>
                  {d.status === 'in_session' ? 'In Session' :
                   d.status === 'online'     ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue last 7 days */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Revenue (Last 7 days)</h2>
        <div className="space-y-2">
          {revenue.slice(0, 7).map(row => (
            <div key={row.day} className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">{row.day}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400">{row.session_count} sessions</span>
                <span className="text-yellow-400 font-medium">{formatPeso(row.total_revenue)}</span>
              </div>
            </div>
          ))}
          {revenue.length === 0 && <p className="text-slate-400 text-sm">No revenue data yet</p>}
        </div>
        {todaySessions > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400">
            Today: {todaySessions} sessions · {formatPeso(todayRevenue)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = 'text-white' }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
