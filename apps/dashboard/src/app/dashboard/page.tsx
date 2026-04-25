'use client';
import { useEffect, useState } from 'react';
import { api, RevenueRow } from '@/lib/api';
import { useDevices } from '@/hooks/useDevices';
import { formatPeso } from '@/lib/utils';

export default function OverviewPage() {
  const { devices, loading } = useDevices();
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);

  useEffect(() => {
    api.getRevenue().then(setRevenue).catch(() => {});
  }, []);

  const online = devices.filter(d => d.status !== 'offline').length;
  const inSession = devices.filter(d => d.status === 'in_session').length;
  const todayRevenue = revenue[0]?.total_revenue || 0;
  const todaySessions = revenue[0]?.session_count || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Overview</h1>

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

      {/* Recent revenue */}
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
          {revenue.length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
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
