'use client';
import { useEffect, useState } from 'react';
import { api, AnalyticsData } from '@/lib/api';
import { formatPeso } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import AccountFilter from '@/components/AccountFilter';

// Fill in any missing hours with zeros so the chart always shows 0–23
function fillHours(hourly: { hour: number; sessions: number; revenue: number }[]) {
  const map = new Map(hourly.map(h => [h.hour, h]));
  return Array.from({ length: 24 }, (_, i) => map.get(i) ?? { hour: i, sessions: 0, revenue: 0 });
}

function hourLabel(h: number) {
  if (h === 0)  return '12AM';
  if (h < 12)   return `${h}AM`;
  if (h === 12) return '12PM';
  return `${h - 12}PM`;
}

export default function AnalyticsPage() {
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getAnalytics(account || undefined)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [account]);

  const header = (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <AccountFilter value={account} onChange={v => { setAccount(v); setLoading(true); }} />
    </div>
  );

  if (loading) return <div className="space-y-4">{header}<div className="text-slate-400">Loading analytics...</div></div>;

  if (!data || (data.hourly.length === 0 && data.byDevice.length === 0)) {
    return (
      <div className="space-y-4">
        {header}
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📈</div>
          <p className="text-slate-400">No session data yet.</p>
          <p className="text-slate-500 text-sm mt-1">Start some sessions to see analytics here.</p>
        </div>
      </div>
    );
  }

  const hours = fillHours(data.hourly);
  const peakHour = hours.reduce((a, b) => a.sessions >= b.sessions ? a : b);
  const totalSessions = data.byDevice.reduce((s, d) => s + d.sessions, 0);
  const totalRevenue  = data.byDevice.reduce((s, d) => s + d.revenue, 0);
  const avgRevenue    = totalSessions > 0 ? totalRevenue / totalSessions : 0;
  const avgDuration   = data.byDevice.length > 0
    ? data.byDevice.reduce((s, d) => s + d.avg_mins * d.sessions, 0) / (totalSessions || 1)
    : 0;
  const topDevice     = data.byDevice[0];

  const chartTooltipStyle = {
    contentStyle: { background: '#1e293b', border: '1px solid #475569', borderRadius: 8 },
    labelStyle: { color: '#f1f5f9' },
  };

  return (
    <div className="space-y-6">
      {header}

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="⏰"
          label="Peak Hour"
          value={peakHour.sessions > 0 ? hourLabel(peakHour.hour) : '—'}
          sub={peakHour.sessions > 0 ? `${peakHour.sessions} sessions` : 'no data'}
        />
        <StatCard
          icon="⏱"
          label="Avg Session"
          value={avgDuration > 0 ? `${Math.round(avgDuration)}m` : '—'}
          sub="per session"
        />
        <StatCard
          icon="💰"
          label="Avg Revenue"
          value={avgRevenue > 0 ? formatPeso(avgRevenue) : '—'}
          sub="per session"
        />
        <StatCard
          icon="🏆"
          label="Top Device"
          value={topDevice?.device_name || '—'}
          sub={topDevice ? formatPeso(topDevice.revenue) : 'no data'}
        />
      </div>

      {/* Hourly activity heatmap */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Hourly Activity</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hours} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="hour"
              tickFormatter={hourLabel}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              interval={2}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              {...chartTooltipStyle}
              labelFormatter={h => `${hourLabel(Number(h))} – ${hourLabel(Number(h) + 1)}`}
              formatter={(v: number) => [v, 'Sessions']}
            />
            <Bar dataKey="sessions" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">Sessions started per hour of day (local time)</p>
      </div>

      {/* Per-device breakdown */}
      {data.byDevice.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-bold text-white mb-4">Per-Device Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700 text-left">
                <th className="py-2 pr-6">Device</th>
                <th className="py-2 pr-6">Sessions</th>
                <th className="py-2 pr-6">Avg Duration</th>
                <th className="py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.byDevice.map(d => (
                <tr key={d.device_name} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-2 pr-6 text-white font-medium">{d.device_name}</td>
                  <td className="py-2 pr-6 text-slate-300">{d.sessions}</td>
                  <td className="py-2 pr-6 text-slate-300">{d.avg_mins}m</td>
                  <td className="py-2 text-yellow-400 font-medium">{formatPeso(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment method split */}
      {data.byPayment.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Payment Method Split</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.byPayment.map(p => {
              const pct = totalSessions > 0 ? Math.round((p.sessions / totalSessions) * 100) : 0;
              return (
                <div key={p.payment_method} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium capitalize">{p.payment_method}</span>
                    <span className="text-slate-400 text-sm">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{p.sessions} sessions</span>
                    <span className="text-yellow-400 font-medium">{formatPeso(p.revenue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-white truncate">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}
