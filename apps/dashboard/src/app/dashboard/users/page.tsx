'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, StaffUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { format, fromUnixTime } from 'date-fns';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved:  'bg-green-900 text-green-300',
    pending:   'bg-amber-900 text-amber-300',
    suspended: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded capitalize ${map[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'A-Z', ok: /[A-Z]/.test(password) },
    { label: 'a-z', ok: /[a-z]/.test(password) },
    { label: '0-9', ok: /[0-9]/.test(password) },
    { label: '#@!', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {checks.map(c => (
        <span key={c.label} className={`text-xs px-1.5 py-0.5 rounded ${c.ok ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const router    = useRouter();

  const [users, setUsers]         = useState<StaffUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ username: '', password: '', role: 'staff' as 'superadmin' | 'admin' | 'staff' });
  const [busy, setBusy]           = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  const isAdmin      = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    if (user && !isAdmin) router.replace('/dashboard');
  }, [user, isAdmin, router]);

  async function load() {
    setLoading(true);
    try { setUsers(await api.getUsers()); } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function addUser() {
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required'); return;
    }
    setBusy('add'); setError('');
    try {
      await api.createUser(form.username.trim(), form.password, form.role);
      setForm({ username: '', password: '', role: 'staff' });
      setShowAdd(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally { setBusy(null); }
  }

  async function approveUser(id: string) {
    setBusy(id);
    try { await api.approveUser(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function batchApprove() {
    if (selected.size === 0) return;
    if (!confirm(`Approve ${selected.size} selected user${selected.size > 1 ? 's' : ''}?`)) return;
    setBatchBusy(true);
    try {
      const res = await api.batchApproveUsers(Array.from(selected));
      setSelected(new Set());
      alert(`${res.approved} user${res.approved !== 1 ? 's' : ''} approved.`);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Batch approve failed');
    } finally { setBatchBusy(false); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function suspendUser(id: string, username: string) {
    if (!confirm(`Suspend "${username}"?`)) return;
    setBusy(id);
    try { await api.suspendUser(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`Delete user "${username}"?`)) return;
    setBusy(id);
    try { await api.deleteUser(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  async function changeRole(id: string, username: string, newRole: string) {
    if (!confirm(`Change "${username}" role to ${newRole}?`)) return;
    setBusy(id + '_role');
    try { await api.changeUserRole(id, newRole); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  const pending  = users.filter(u => u.status === 'pending');
  const approved = users.filter(u => u.status !== 'pending');

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <button className="btn-primary" onClick={() => { setShowAdd(!showAdd); setError(''); }}>
          + Add User
        </button>
      </div>

      {showAdd && (
        <div className="card space-y-3">
          <h2 className="text-white font-medium">New User</h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Username *</label>
              <input className="input text-sm" placeholder="e.g., staff01"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Password *</label>
              <input className="input text-sm" type="password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <PasswordStrength password={form.password} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <select className="input text-sm" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'superadmin' | 'admin' | 'staff' }))}>
                <option value="staff">Staff</option>
                {isSuperAdmin && <option value="admin">Admin</option>}
                {isSuperAdmin && <option value="superadmin">Super Admin</option>}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={addUser} disabled={busy === 'add'}>
              {busy === 'add' ? 'Creating...' : 'Create User'}
            </button>
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setError(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending approvals — superadmin only */}
      {isSuperAdmin && pending.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-amber-400 font-medium">
              Pending Approval <span className="text-sm text-slate-400">({pending.length})</span>
            </h2>
            {selected.size > 0 && (
              <button
                disabled={batchBusy}
                onClick={batchApprove}
                className="text-sm px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white transition-colors">
                {batchBusy ? 'Approving...' : `Approve Selected (${selected.size})`}
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-700">
            {pending.map(u => (
              <div key={u.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="mt-1 accent-orange-500 cursor-pointer w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">{u.username}</div>
                      {u.full_name && <div className="text-slate-400 text-xs">{u.full_name}</div>}
                      {u.business_name && <div className="text-slate-500 text-xs">{u.business_name}</div>}
                      <div className="text-xs text-slate-400 mt-0.5">
                        {u.email || <span className="text-slate-600 italic">No email</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Registered {u.created_at && u.created_at > 0
                          ? format(fromUnixTime(Number(u.created_at)), 'MMM d, yyyy · h:mm a')
                          : <span className="text-slate-600 italic">Unknown</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={busy === u.id}
                    onClick={() => approveUser(u.id)}
                    className="text-sm px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white transition-colors shrink-0">
                    {busy === u.id ? '...' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All / approved users */}
      {loading ? (
        <div className="text-slate-400">Loading users...</div>
      ) : (
        <div className="card divide-y divide-slate-700">
          {approved.map(u => (
            <div key={u.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{u.username}</span>
                    <StatusBadge status={u.status} />
                  </div>
                  <div className={`text-xs font-medium capitalize ${
                    u.role === 'superadmin' ? 'text-purple-400'
                    : u.role === 'admin' ? 'text-orange-400'
                    : 'text-slate-400'}`}>
                    {u.role}
                    {u.full_name && ` — ${u.full_name}`}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {u.email || <span className="text-slate-600 italic">No email</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Joined {u.created_at && u.created_at > 0
                      ? format(fromUnixTime(Number(u.created_at)), 'MMM d, yyyy')
                      : <span className="text-slate-600 italic">Unknown</span>}
                  </div>
                </div>
              </div>
              {u.id !== user?.id && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role change dropdown — superadmin only */}
                  {isSuperAdmin && (
                    <select
                      disabled={busy === u.id + '_role'}
                      value={u.role}
                      onChange={e => changeRole(u.id, u.username, e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-slate-700 border border-slate-600 text-slate-300 focus:outline-none">
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  )}
                  {isSuperAdmin && u.status === 'approved' && u.role !== 'superadmin' && (
                    <button
                      disabled={busy === u.id}
                      onClick={() => suspendUser(u.id, u.username)}
                      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-amber-700 text-slate-300 hover:text-white transition-colors">
                      Suspend
                    </button>
                  )}
                  {isSuperAdmin && u.status === 'suspended' && (
                    <button
                      disabled={busy === u.id}
                      onClick={() => approveUser(u.id)}
                      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-green-700 text-slate-300 hover:text-white transition-colors">
                      Reinstate
                    </button>
                  )}
                  {u.role !== 'superadmin' && (
                    <button
                      disabled={busy === u.id}
                      onClick={() => deleteUser(u.id, u.username)}
                      className="text-slate-500 hover:text-red-400 transition-colors text-sm">
                      🗑
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
