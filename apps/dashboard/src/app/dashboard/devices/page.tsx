'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Location, PricingTier } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import DeviceCard from '@/components/DeviceCard';
import AccountFilter from '@/components/AccountFilter';

export default function DevicesPage() {
  const { user }                      = useAuth();
  const searchParams                  = useSearchParams();
  const canManage                     = user?.role === 'admin' || user?.role === 'superadmin';
  const [account, setAccount]         = useState(() => searchParams.get('account') ?? '');
  const { devices, loading, refresh } = useDevices(account || undefined);
  const [tiers, setTiers]             = useState<PricingTier[]>([]);
  const [locations, setLocations]     = useState<Location[]>([]);
  const [showAdd, setShowAdd]         = useState(false);
  const [newName, setNewName]         = useState('');
  const [newLocId, setNewLocId]       = useState('');
  const [filterLocId, setFilterLocId] = useState('');
  const [busy, setBusy]               = useState(false);

  useEffect(() => {
    api.getPricing().then(setTiers).catch(() => {});
    api.getLocations().then(locs => {
      setLocations(locs);
      // Default new device location to first branch, or 'loc_main' fallback
      if (locs.length > 0) setNewLocId(locs[0].id);
    }).catch(() => {});
  }, []);

  async function addDevice() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await api.createDevice({ name: newName.trim(), location_id: newLocId || 'loc_main' });
      setNewName('');
      setShowAdd(false);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const visibleDevices = filterLocId
    ? devices.filter(d => d.location_id === filterLocId)
    : devices;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Devices</h1>
        <div className="flex items-center gap-3">
          <AccountFilter value={account} onChange={setAccount} />
          {canManage && (
            <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
              + Add Device
            </button>
          )}
        </div>
      </div>

      {/* Location filter — only shown when there are multiple branches */}
      {locations.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">Filter by branch:</span>
          <select className="input w-auto"
            value={filterLocId}
            onChange={e => setFilterLocId(e.target.value)}>
            <option value="">All Branches</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}

      {showAdd && canManage && (
        <div className="card flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="block text-sm text-slate-400 mb-1">Device Name</label>
            <input className="input" placeholder="e.g., Phone 01" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDevice()} />
          </div>
          {locations.length > 0 && (
            <div className="flex-1 min-w-40">
              <label className="block text-sm text-slate-400 mb-1">Branch</label>
              <select className="input" value={newLocId} onChange={e => setNewLocId(e.target.value)}>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}
          <button className="btn-primary" onClick={addDevice} disabled={busy}>
            {busy ? 'Adding...' : 'Add'}
          </button>
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400">Loading devices...</div>
      ) : visibleDevices.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-slate-400">
            {filterLocId ? 'No devices in this branch.' : 'No devices registered yet.'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {filterLocId ? 'Try a different branch or add a new device.' : 'Add a device to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleDevices.map(device => (
            <DeviceCard key={device.id} device={device} tiers={tiers} onUpdate={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
