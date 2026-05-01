'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, RevenueRow, Session } from '@/lib/api';
import { formatPeso } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, fromUnixTime } from 'date-fns';
import AccountFilter from '@/components/AccountFilter';

export default function LogsPage() {
  const searchParams             = useSearchParams();
  const [revenue, setRevenue]   = useState<RevenueRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]     = useState(true);
  const [account, setAccount]     = useState(() => searchParams.get('account') ?? '');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const acc = account || undefined;
    Promise.all([
      api.getRevenue(acc),
      api.getSessions({ status: 'ended', limit: '100', ...(account ? { account } : {}) }),
    ]).then(([rev, ses]) => {
      setRevenue(rev);
      setSessions(ses);
    }).finally(() => setLoading(false));
  }, [account]);

  const totalRevenue = revenue.reduce((s, r) => s + r.total_revenue, 0);
  const totalSessions = revenue.reduce((s, r) => s + r.session_count, 0);
  const totalMins = revenue.reduce((s, r) => s + r.total_mins, 0);

  const chartData = [...revenue].reverse().slice(-14).map(r => ({
    date: r.day.slice(5),
    revenue: Number(r.total_revenue.toFixed(2)),
    sessions: r.session_count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Logs & Revenue</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <AccountFilter value={account} onChange={setAccount} />
          <button
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try { await api.exportSessionsCsv(account || undefined); }
              catch (e: unknown) { alert(e instanceof Error ? e.message : 'Export failed'); }
              finally { setExporting(false); }
            }}
            className="text-sm px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors flex items-center gap-2">
            {exporting ? 'Exporting...' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">{formatPeso(totalRevenue)}</div>
          <div className="text-xs text-slate-400 mt-1">Total Revenue (30d)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-400">{totalSessions}</div>
          <div className="text-xs text-slate-400 mt-1">Total Sessions (30d)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-400">{Math.floor(totalMins / 60)}h {totalMins % 60}m</div>
          <div className="text-xs text-slate-400 mt-1">Total Usage (30d)</div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Daily Revenue (Last 14 days)</h2>
        {chartData.length === 0 ? (
          <p className="text-slate-400 text-sm">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(v: number) => [formatPeso(v), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily breakdown table */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-bold text-white mb-4">Daily Breakdown</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 pr-6">Date</th>
              <th className="text-left py-2 pr-6">Sessions</th>
              <th className="text-left py-2 pr-6">Total Mins</th>
              <th className="text-left py-2">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading...</td></tr>
            ) : revenue.map(row => (
              <tr key={row.day} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-2 pr-6 text-slate-300">{row.day}</td>
                <td className="py-2 pr-6 text-slate-300">{row.session_count}</td>
                <td className="py-2 pr-6 text-slate-300">{row.total_mins}m</td>
                <td className="py-2 text-yellow-400 font-medium">{formatPeso(row.total_revenue)}</td>
              </tr>
            ))}
            {revenue.length === 0 && !loading && (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Session log */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-bold text-white mb-4">Session Log (Last 100)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 pr-4">Device</th>
              <th className="text-left py-2 pr-4">Date</th>
              <th className="text-left py-2 pr-4">Duration</th>
              <th className="text-left py-2 pr-4">Payment</th>
              <th className="text-left py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-2 pr-4 text-white">{s.device_name || s.device_id}</td>
                <td className="py-2 pr-4 text-slate-300">
                  {format(fromUnixTime(s.started_at), 'MMM d, HH:mm')}
                </td>
                <td className="py-2 pr-4 text-slate-300">{s.duration_mins}m</td>
                <td className="py-2 pr-4 text-slate-300 capitalize">{s.payment_method}</td>
                <td className="py-2 text-yellow-400">{formatPeso(s.amount_paid)}</td>
              </tr>
            ))}
            {sessions.length === 0 && !loading && (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">No sessions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
