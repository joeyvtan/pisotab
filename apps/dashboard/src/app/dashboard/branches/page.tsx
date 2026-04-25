'use client';
import { useEffect, useState } from 'react';
import { api, Location } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function BranchesPage() {
  const { user }    = useAuth();
  const canManage   = user?.role === 'admin' || user?.role === 'superadmin';
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [newName, setNewName]     = useState('');
  const [newAddr, setNewAddr]     = useState('');
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');

  async function load() {
    setLoading(true);
    try { setLocations(await api.getLocations()); } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addBranch() {
    if (!newName.trim()) { setError('Name is required'); return; }
    setBusy(true); setError('');
    try {
      await api.createLocation(newName.trim(), newAddr.trim());
      setNewName(''); setNewAddr(''); setShowAdd(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add branch');
    } finally { setBusy(false); }
  }

  async function deleteBranch(id: string, name: string) {
    if (!confirm(`Delete branch "${name}"? Devices assigned to it will need to be reassigned.`)) return;
    try {
      await api.deleteLocation(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Branches</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => { setShowAdd(!showAdd); setError(''); }}>
            + Add Branch
          </button>
        )}
      </div>

      {showAdd && canManage && (
        <div className="card space-y-3">
          <h2 className="text-white font-medium">New Branch</h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Branch Name *</label>
              <input className="input" placeholder="e.g., Main Branch" value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBranch()} />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Address (optional)</label>
              <input className="input" placeholder="e.g., 123 Rizal St." value={newAddr}
                onChange={e => setNewAddr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBranch()} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={addBranch} disabled={busy}>
              {busy ? 'Adding...' : 'Add Branch'}
            </button>
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setError(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400">Loading branches...</div>
      ) : locations.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-slate-400">No branches yet.</p>
          <p className="text-slate-500 text-sm mt-1">Add a branch to organize your devices by location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="card flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🏪</span>
                  <span className="text-white font-semibold">{loc.name}</span>
                </div>
                {loc.address && (
                  <p className="text-slate-400 text-sm">{loc.address}</p>
                )}
                <p className="text-slate-600 text-xs mt-1 font-mono">{loc.id}</p>
              </div>
              {/* Prevent deleting the default branch; staff cannot delete */}
              {canManage && loc.id !== 'loc_main' && (
                <button
                  onClick={() => deleteBranch(loc.id, loc.name)}
                  className="text-slate-500 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                  title="Delete branch">
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
