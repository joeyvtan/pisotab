'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, RevenueRow, StaffUser, Device } from '@/lib/api';
import { useDevices } from '@/hooks/useDevices';
import { useAuth } from '@/context/AuthContext';
import { formatPeso } from '@/lib/utils';

export default function OverviewPage() {
  const { user } = useAuth();

  if (user?.role === 'superadmin') return <SuperAdminAccountsView />;
  return <AdminOverview />;
}

// ── Regular admin dashboard ──────────────────────────────────────────────────

function AdminOverview() {
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📱" label="Total Devices" value={String(devices.length)} />
        <StatCard icon="🟢" label="Online" value={String(online)} color="text-green-400" />
        <StatCard icon="⏱" label="In Session" value={String(inSession)} color="text-orange-400" />
        <StatCard icon="💰" label="Today's Revenue" value={formatPeso(todayRevenue)} color="text-yellow-400" />
      </div>

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

// ── Superadmin accounts grid ─────────────────────────────────────────────────

function SuperAdminAccountsView() {
  const router = useRouter();
  const [admins, setAdmins] = useState<StaffUser[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getUsers(), api.getDevices()])
      .then(([users, devices]) => {
        setAdmins(users.filter(u => u.role === 'admin' && u.status === 'approved'));
        setAllDevices(devices);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group device stats per admin user
  const statsByUser = (userId: string) => {
    const userDevices = allDevices.filter(d => d.owner_user_id === userId);
    return {
      total: userDevices.length,
      online: userDevices.filter(d => d.status !== 'offline').length,
      inSession: userDevices.filter(d => d.status === 'in_session').length,
    };
  };

  // Aggregate totals across all admins
  const totals = {
    admins: admins.length,
    devices: allDevices.length,
    online: allDevices.filter(d => d.status !== 'offline').length,
    inSession: allDevices.filter(d => d.status === 'in_session').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Accounts</h1>
        <p className="text-slate-400 text-sm mt-1">Click an account to view their dashboard.</p>
      </div>

      {/* Platform-wide totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Admin Accounts" value={String(totals.admins)} />
        <StatCard icon="📱" label="Total Devices" value={String(totals.devices)} />
        <StatCard icon="🟢" label="Online Now" value={String(totals.online)} color="text-green-400" />
        <StatCard icon="⏱" label="In Session" value={String(totals.inSession)} color="text-orange-400" />
      </div>

      {/* Accounts grid */}
      {loading ? (
        <p className="text-slate-400">Loading accounts...</p>
      ) : admins.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No admin accounts yet.</p>
          <p className="text-slate-500 text-sm mt-1">Approved admin users will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map(admin => {
            const s = statsByUser(admin.id);
            return (
              <button
                key={admin.id}
                onClick={() => router.push(`/dashboard/account/${admin.id}`)}
                className="card text-left hover:bg-slate-700 transition-colors cursor-pointer group w-full"
              >
                {/* Header row */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-400 font-bold text-base uppercase">
                      {(admin.business_name || admin.username).charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate leading-tight">
                      {admin.business_name || admin.username}
                    </p>
                    {admin.business_name && (
                      <p className="text-slate-400 text-xs truncate">@{admin.username}</p>
                    )}
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400">
                      Admin
                    </span>
                  </div>
                  <span className="text-slate-500 group-hover:text-orange-400 transition-colors text-lg flex-shrink-0">→</span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-700/60 rounded-lg py-2 px-1">
                    <p className="text-white font-bold text-lg leading-tight">{s.total}</p>
                    <p className="text-slate-400 text-xs">Devices</p>
                  </div>
                  <div className="bg-slate-700/60 rounded-lg py-2 px-1">
                    <p className="text-green-400 font-bold text-lg leading-tight">{s.online}</p>
                    <p className="text-slate-400 text-xs">Online</p>
                  </div>
                  <div className="bg-slate-700/60 rounded-lg py-2 px-1">
                    <p className="text-orange-400 font-bold text-lg leading-tight">{s.inSession}</p>
                    <p className="text-slate-400 text-xs">In Session</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color = 'text-white' }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
