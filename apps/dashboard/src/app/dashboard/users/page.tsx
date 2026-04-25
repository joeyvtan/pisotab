'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, StaffUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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

export default function UsersPage() {
  const { user } = useAuth();
  const router    = useRouter();

  const [users, setUsers]     = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ username: '', password: '', role: 'staff' as 'admin' | 'staff' });
  const [busy, setBusy]       = useState<string | null>(null);
  const [error, setError]     = useState('');

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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Username *</label>
              <input className="input text-sm" placeholder="e.g., staff01"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Password *</label>
              <input className="input text-sm" type="password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <select className="input text-sm" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}>
                <option value="staff">Staff</option>
                {isSuperAdmin && <option value="admin">Admin</option>}
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
          <h2 className="text-amber-400 font-medium">
            Pending Approval <span className="text-sm text-slate-400">({pending.length})</span>
          </h2>
          <div className="divide-y divide-slate-700">
            {pending.map(u => (
              <div key={u.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{u.username}</div>
                    {u.full_name && <div className="text-slate-400 text-xs">{u.full_name}</div>}
                    {u.business_name && <div className="text-slate-500 text-xs">{u.business_name}</div>}
                    {u.email && <div className="text-slate-500 text-xs">{u.email}</div>}
                  </div>
                  <button
                    disabled={busy === u.id}
                    onClick={() => approveUser(u.id)}
                    className="text-sm px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white transition-colors">
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
            <div key={u.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
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
                </div>
              </div>
              {u.id !== user?.id && (
                <div className="flex items-center gap-2">
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
