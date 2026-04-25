'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, License } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface LicenseWithOwner extends License {
  owner_username?: string;
}

export default function LicensesPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [licenses, setLicenses] = useState<LicenseWithOwner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGen]    = useState(false);
  const [expiresDays, setExpiresDays] = useState<string>('365');
  const [newKey, setNewKey]     = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState<string | null>(null);

  const isAdmin      = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    if (user && !isAdmin) router.replace('/dashboard');
  }, [user, isAdmin, router]);

  async function load() {
    setLoading(true);
    try { setLicenses(await api.getLicenses() as LicenseWithOwner[]); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function generateKey() {
    setGen(true); setError(''); setNewKey('');
    try {
      const days = expiresDays ? parseInt(expiresDays) : null;
      const result = await api.generateLicense(days);
      setNewKey(result.key);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate');
    } finally { setGen(false); }
  }

  async function handleAction(id: string, action: 'unbind' | 'deactivate' | 'delete') {
    const labels = { unbind: 'Unbind', deactivate: 'Deactivate', delete: 'Delete' };
    if (!confirm(`${labels[action]} this license?`)) return;
    setBusy(id);
    try {
      if (action === 'unbind')     await api.unbindLicense(id);
      if (action === 'deactivate') await api.deactivateLicense(id);
      if (action === 'delete')     await api.deleteLicense(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally { setBusy(null); }
  }

  function formatDate(unix: number | null) {
    if (!unix) return 'Lifetime';
    return new Date(unix * 1000).toLocaleDateString();
  }

  function statusBadge(lic: LicenseWithOwner) {
    const now = Math.floor(Date.now() / 1000);
    if (!lic.device_id) return <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">Unused</span>;
    if (lic.expires_at && lic.expires_at < now)
      return <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">Expired</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">Active</span>;
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-white">Licenses</h1>

      {/* Generate key — superadmin only */}
      {isSuperAdmin && (
        <div className="card space-y-4">
          <h2 className="text-white font-medium">Generate License Key</h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {newKey && (
            <div className="bg-slate-800 rounded p-3 flex items-center justify-between gap-4">
              <span className="font-mono text-orange-400 font-bold tracking-widest text-lg">{newKey}</span>
              <button className="text-slate-400 hover:text-white text-xs"
                onClick={() => navigator.clipboard.writeText(newKey)}>
                Copy
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Expires after (days)</label>
              <input className="input text-sm w-40" type="number" min="1" placeholder="Blank = lifetime"
                value={expiresDays} onChange={e => setExpiresDays(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={generateKey} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        </div>
      )}

      {/* Admin info — non-superadmin */}
      {!isSuperAdmin && (
        <div className="card bg-slate-800/50 border border-slate-700">
          <p className="text-slate-400 text-sm">
            Your license keys are shown below. To purchase more, visit{' '}
            <a href="/dashboard/buy-license" className="text-orange-400 hover:underline">Buy License</a>.
          </p>
        </div>
      )}

      {/* License list */}
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : licenses.length === 0 ? (
        <div className="card text-slate-500 text-sm">No licenses yet.</div>
      ) : (
        <div className="card">
          <div className={`grid gap-3 pb-3 text-xs text-slate-400 font-medium border-b border-slate-700 ${isSuperAdmin ? 'grid-cols-[2fr_1fr_1fr_0.7fr_0.7fr_auto]' : 'grid-cols-[2fr_1fr_0.7fr_0.7fr_auto]'}`}>
            <span>Key</span>
            {isSuperAdmin && <span>Owner</span>}
            <span>Device</span>
            <span>Status</span>
            <span>Expires</span>
            <span>Actions</span>
          </div>

          {licenses.map(lic => (
            <div key={lic.id}
              className={`grid gap-3 py-3 items-center border-b border-slate-700/50 last:border-0 ${isSuperAdmin ? 'grid-cols-[2fr_1fr_1fr_0.7fr_0.7fr_auto]' : 'grid-cols-[2fr_1fr_0.7fr_0.7fr_auto]'}`}>
              <span className="font-mono text-orange-400 text-sm tracking-wide">{lic.key}</span>
              {isSuperAdmin && (
                <span className="text-slate-400 text-xs">{lic.owner_username ?? '—'}</span>
              )}
              <span className="text-slate-300 text-sm truncate">{lic.device_name ?? '—'}</span>
              <span>{statusBadge(lic)}</span>
              <span className="text-slate-400 text-xs">{formatDate(lic.expires_at)}</span>
              <div className="flex gap-1">
                {lic.device_id && (
                  <button disabled={busy === lic.id} onClick={() => handleAction(lic.id, 'unbind')}
                    className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-blue-700 text-slate-300 hover:text-white transition-colors">
                    Unbind
                  </button>
                )}
                {isSuperAdmin && (
                  <>
                    <button disabled={busy === lic.id} onClick={() => handleAction(lic.id, 'deactivate')}
                      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-amber-700 text-slate-300 hover:text-white transition-colors">
                      Deactivate
                    </button>
                    <button disabled={busy === lic.id} onClick={() => handleAction(lic.id, 'delete')}
                      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-red-700 text-slate-300 hover:text-white transition-colors">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
