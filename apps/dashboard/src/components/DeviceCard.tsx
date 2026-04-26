'use client';
import { useState } from 'react';
import { Device, PricingTier } from '@/lib/api';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatTime, formatPeso, timeSince } from '@/lib/utils';
import RemoteAdminModal from './RemoteAdminModal';

interface Props {
  device: Device;
  tiers: PricingTier[];
  onUpdate: () => void;
}

export default function DeviceCard({ device, tiers, onUpdate }: Props) {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'superadmin';

  const [showStart, setShowStart]         = useState(false);
  const [showAddTime, setShowAddTime]     = useState(false);
  const [showTrial, setShowTrial]         = useState(false);
  const [showRemoteAdmin, setShowRemoteAdmin] = useState(false);
  const [selectedTier, setSelectedTier] = useState(tiers[0]?.id || '');
  const [customMins, setCustomMins]     = useState('');
  const [addMins, setAddMins]           = useState('5');
  const [trialDays, setTrialDays]       = useState(String(device.trial_days_override ?? 7));
  const [busy, setBusy]                 = useState(false);
  const [trialBusy, setTrialBusy]       = useState(false);

  const isActive   = device.status === 'in_session';
  const isUsbMode  = device.session_payment_method === 'usb';
  const timeLeft   = device.time_remaining_secs || 0;
  const isUrgent   = timeLeft > 0 && timeLeft <= 60;
  const hasLicense = device.license_status === 'active';

  async function startSession() {
    const tier = tiers.find(t => t.id === selectedTier);
    const mins = customMins ? Number(customMins) : tier?.duration_mins || 5;
    const amount = tier?.amount_pesos || 0;
    setBusy(true);
    try {
      await api.startSession(device.id, mins, amount, tier?.id);
      setShowStart(false);
      onUpdate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to start session');
    } finally { setBusy(false); }
  }

  async function endSession() {
    if (!device.active_session_id) return;
    if (!confirm('End this session?')) return;
    setBusy(true);
    try { await api.endSession(device.active_session_id); onUpdate(); }
    finally { setBusy(false); }
  }

  async function pauseResume() {
    if (!device.active_session_id) return;
    setBusy(true);
    try {
      if (device.session_status === 'paused') await api.resumeSession(device.active_session_id);
      else await api.pauseSession(device.active_session_id);
      onUpdate();
    } finally { setBusy(false); }
  }

  async function doAddTime() {
    if (!device.active_session_id) return;
    setBusy(true);
    try {
      await api.addTime(device.active_session_id, Number(addMins), 0);
      setShowAddTime(false);
      onUpdate();
    } finally { setBusy(false); }
  }

  async function deleteDevice() {
    if (!confirm(`Delete device "${device.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteDevice(device.id);
      onUpdate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete device');
    } finally { setBusy(false); }
  }

  async function resetTrial() {
    setTrialBusy(true);
    try {
      await api.manageTrial(device.id, { reset: true, trial_days: Number(trialDays) });
      setShowTrial(false);
      onUpdate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally { setTrialBusy(false); }
  }

  function licenseBadge() {
    const s = device.license_status;
    if (!s) return null;
    if (s === 'active') {
      const label = device.license_days_left != null ? `Licensed (${device.license_days_left}d)` : 'Licensed';
      return <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">{label}</span>;
    }
    if (s === 'trial') {
      return <span className="text-xs px-2 py-0.5 rounded bg-amber-900 text-amber-300">Trial — {device.license_days_left}d left</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">Trial Expired</span>;
  }

  return (
    <div className={`card flex flex-col gap-3 ${isUrgent ? 'border-red-500' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-lg">{device.name}</h3>
          <p className="text-xs text-slate-400">{device.location_name || 'No location'}</p>
          <div className="mt-1">{licenseBadge()}</div>
        </div>
        <span className={`badge-${device.status}`}>
          {device.status.replace('_', ' ')}
        </span>
      </div>

      {/* Timer */}
      {isActive && (
        <div className="text-center py-3 rounded-lg bg-slate-700">
          <div className="text-3xl font-mono font-bold text-orange-400">
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {isUsbMode ? '🔌 elapsed' : device.session_status === 'paused' ? '⏸ PAUSED' : 'remaining'}
          </div>
        </div>
      )}

      {/* Device ID — needed for Android app setup */}
      <div className="flex items-center justify-between bg-slate-800 rounded px-2 py-1.5 gap-2">
        <span className="text-xs text-slate-500 shrink-0">Device ID:</span>
        <span className="text-xs font-mono text-slate-300 truncate">{device.id}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(device.id); }}
          className="text-xs text-slate-500 hover:text-orange-400 transition-colors shrink-0"
          title="Copy Device ID">
          📋
        </button>
      </div>

      {/* Last seen / IP */}
      {device.last_seen && (
        <p className="text-xs text-slate-500">Last seen: {timeSince(device.last_seen)}</p>
      )}
      {device.ip_address && (
        <p className="text-xs text-slate-500">IP: {device.ip_address}</p>
      )}

      {/* Session controls */}
      {isUsbMode && (
        <div className="text-xs text-center py-1 rounded bg-slate-700 text-slate-400">
          🔌 USB Mode — controls managed by device
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {!isActive ? (
          <button className="btn-primary text-sm flex-1" onClick={() => setShowStart(!showStart)} disabled={isUsbMode}>
            ▶ Start
          </button>
        ) : (
          <>
            <button className="btn-secondary text-sm flex-1" onClick={pauseResume} disabled={busy || isUsbMode}>
              {device.session_status === 'paused' ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button className="btn-secondary text-sm" onClick={() => setShowAddTime(!showAddTime)} disabled={isUsbMode}>+⏱</button>
            <button className="btn-danger text-sm" onClick={endSession} disabled={busy || isUsbMode}>■ End</button>
          </>
        )}
      </div>

      {/* Delete device (admin + superadmin) + Trial settings (superadmin only) */}
      {canManage && (
        <div className="flex items-center justify-between flex-wrap gap-1">
          <button
            className="text-xs text-slate-500 hover:text-orange-400 transition-colors"
            onClick={() => setShowRemoteAdmin(true)}>
            ⚙ Remote Admin
          </button>
          {user?.role === 'superadmin' && !hasLicense && (
            <button
              className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
              onClick={() => setShowTrial(!showTrial)}>
              ⚙ Trial settings
            </button>
          )}
          <button
            className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-auto"
            onClick={deleteDevice}
            disabled={busy}
            title="Delete device">
            🗑 Delete
          </button>
        </div>
      )}

      {showRemoteAdmin && (
        <RemoteAdminModal
          deviceId={device.id}
          deviceName={device.name}
          onClose={() => setShowRemoteAdmin(false)}
        />
      )}

      {/* Start session panel */}
      {showStart && (
        <div className="bg-slate-700 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-300 font-medium">Select pricing tier</p>
          <select className="input text-sm" value={selectedTier} onChange={e => setSelectedTier(e.target.value)}>
            {tiers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.duration_mins} mins ({formatPeso(t.amount_pesos)})
              </option>
            ))}
            <option value="">Custom</option>
          </select>
          {selectedTier === '' && (
            <input className="input text-sm" type="number" placeholder="Custom minutes"
              value={customMins} onChange={e => setCustomMins(e.target.value)} />
          )}
          <button className="btn-primary w-full text-sm" onClick={startSession} disabled={busy}>
            {busy ? 'Starting...' : 'Start Session'}
          </button>
        </div>
      )}

      {/* Add time panel */}
      {showAddTime && (
        <div className="bg-slate-700 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-300 font-medium">Add time (mins)</p>
          <input className="input text-sm" type="number" value={addMins}
            onChange={e => setAddMins(e.target.value)} />
          <button className="btn-primary w-full text-sm" onClick={doAddTime} disabled={busy}>
            Add {addMins} min
          </button>
        </div>
      )}

      {/* Trial management panel */}
      {showTrial && user?.role === 'superadmin' && !hasLicense && (
        <div className="bg-slate-800 border border-amber-700/40 rounded-lg p-3 space-y-3">
          <p className="text-xs text-amber-400 font-medium">Trial Settings</p>
          <p className="text-xs text-slate-400">
            Current: {device.license_status === 'trial_expired' ? 'Expired' : `${device.license_days_left} days left`}
          </p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Trial duration (days)</label>
            <input className="input text-sm" type="number" min="1" value={trialDays}
              onChange={e => setTrialDays(e.target.value)} />
          </div>
          <button
            className="w-full text-sm py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            onClick={resetTrial} disabled={trialBusy}>
            {trialBusy ? 'Applying...' : 'Reset Trial with these days'}
          </button>
          <p className="text-xs text-slate-500">
            Resets the trial clock — device gets the entered number of days from now.
          </p>
        </div>
      )}
    </div>
  );
}
