'use client';
import { useEffect, useState } from 'react';
import { api, Session } from '@/lib/api';
import { formatTime, formatPeso } from '@/lib/utils';
import { format, fromUnixTime } from 'date-fns';
import AccountFilter from '@/components/AccountFilter';

export default function SessionsPage() {
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [account, setAccount]       = useState('');

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (account)      params.account = account;
      const data = await api.getSessions(params);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter, account]);

  async function endSession(id: string) {
    if (!confirm('End this session?')) return;
    await api.endSession(id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Sessions</h1>
        <div className="flex items-center gap-3">
          <AccountFilter value={account} onChange={setAccount} />
          <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 pr-4">Device</th>
              <th className="text-left py-2 pr-4">Started</th>
              <th className="text-left py-2 pr-4">Duration</th>
              <th className="text-left py-2 pr-4">Remaining</th>
              <th className="text-left py-2 pr-4">Payment</th>
              <th className="text-left py-2 pr-4">Amount</th>
              <th className="text-left py-2 pr-4">Status</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">No sessions found</td></tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-2 pr-4 text-white font-medium">{s.device_name || s.device_id}</td>
                <td className="py-2 pr-4 text-slate-300">
                  {format(fromUnixTime(s.started_at), 'MMM d, HH:mm')}
                </td>
                <td className="py-2 pr-4 text-slate-300">{s.duration_mins}m</td>
                <td className="py-2 pr-4 font-mono text-orange-400">
                  {s.status !== 'ended' ? formatTime(s.time_remaining_secs) : '—'}
                </td>
                <td className="py-2 pr-4 text-slate-300 capitalize">{s.payment_method}</td>
                <td className="py-2 pr-4 text-yellow-400">{formatPeso(s.amount_paid)}</td>
                <td className="py-2 pr-4">
                  <span className={`badge-${s.status}`}>{s.status}</span>
                </td>
                <td className="py-2">
                  {s.status !== 'ended' && (
                    <button className="text-red-400 hover:text-red-300 text-xs"
                      onClick={() => endSession(s.id)}>
                      End
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
