'use client';
import { useEffect, useState } from 'react';
import { api, DeviceConfig, CoinRate } from '@/lib/api';

interface Props {
  deviceId: string;
  deviceName: string;
  onClose: () => void;
}

function parseCoinRates(json: string): CoinRate[] {
  try { return JSON.parse(json) || []; } catch { return []; }
}

export default function RemoteAdminModal({ deviceId, deviceName, onClose }: Props) {
  const [cfg, setCfg]       = useState<DeviceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [cmdBusy, setCmdBusy] = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  // Editable fields
  const [mode, setMode]               = useState<'esp32' | 'usb'>('esp32');
  const [ratePerMin, setRatePerMin]   = useState('1');
  const [secsPerCoin, setSecsPerCoin] = useState('300');
  const [coinRates, setCoinRates]     = useState<CoinRate[]>([]);
  const [kioskMode, setKioskMode]     = useState(false);
  const [floatingTimer, setFloatingTimer] = useState(false);
  const [deepFreeze, setDeepFreeze]   = useState(false);
  const [deepFreezeGrace, setDeepFreezeGrace] = useState('30');
  const [alarmWifi, setAlarmWifi]     = useState(false);
  const [alarmCharger, setAlarmCharger] = useState(false);
  const [alarmSessionOnly, setAlarmSessionOnly] = useState(true);
  const [alarmDelay, setAlarmDelay]   = useState('30');
  const [newPin, setNewPin]           = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function populateForm(c: DeviceConfig) {
    setMode(c.connection_mode as 'esp32' | 'usb');
    setRatePerMin(String(c.rate_per_min));
    setSecsPerCoin(String(c.secs_per_coin));
    setCoinRates(parseCoinRates(c.coin_rates));
    setKioskMode(c.kiosk_mode);
    setFloatingTimer(c.floating_timer);
    setDeepFreeze(c.deep_freeze);
    setDeepFreezeGrace(String(c.deep_freeze_grace));
    setAlarmWifi(c.alarm_wifi);
    setAlarmCharger(c.alarm_charger);
    setAlarmSessionOnly(c.alarm_session_only);
    setAlarmDelay(String(c.alarm_delay_secs));
  }

  useEffect(() => {
    api.getDeviceConfig(deviceId)
      .then(c => { setCfg(c); populateForm(c); })
      .catch(() => showToast('Failed to load config'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  async function save() {
    setSaving(true);
    try {
      const result = await api.updateDeviceConfig(deviceId, {
        connection_mode:    mode,
        rate_per_min:       parseFloat(ratePerMin) || 1,
        secs_per_coin:      parseInt(secsPerCoin) || 300,
        coin_rates:         JSON.stringify(coinRates),
        kiosk_mode:         kioskMode,
        floating_timer:     floatingTimer,
        deep_freeze:        deepFreeze,
        deep_freeze_grace:  parseInt(deepFreezeGrace) || 30,
        alarm_wifi:         alarmWifi,
        alarm_charger:      alarmCharger,
        alarm_session_only: alarmSessionOnly,
        alarm_delay_secs:   parseInt(alarmDelay) || 30,
        ...(newPin.trim() ? { admin_pin: newPin.trim() } : {}),
      });
      if (newPin.trim()) setNewPin('');
      setCfg(result);
      showToast(result.pushed ? '✓ Config saved and pushed to device' : '✓ Config saved — will apply on next heartbeat');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  }

  async function sendCmd(cmd: 'restart_app' | 'restart_device' | 'lock_screen') {
    if (!confirm(`Send "${cmd}" to ${deviceName}?`)) return;
    setCmdBusy(cmd);
    try {
      const result = await api.sendRemoteCmd(deviceId, cmd);
      showToast(result.sent ? `✓ Command sent: ${cmd}` : `Device offline — command not delivered`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Command failed');
    } finally { setCmdBusy(null); }
  }

  function addCoinRate() {
    setCoinRates(r => [...r, { coin: 1, minutes: 5 }]);
  }
  function updateCoinRate(i: number, field: 'coin' | 'minutes', val: string) {
    setCoinRates(r => r.map((row, idx) => idx === i ? { ...row, [field]: parseFloat(val) || 0 } : row));
  }
  function removeCoinRate(i: number) {
    setCoinRates(r => r.filter((_, idx) => idx !== i));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div>
            <h2 className="font-bold text-white text-lg">Remote Admin</h2>
            <p className="text-xs text-slate-400">{deviceName}</p>
          </div>
          <div className="flex items-center gap-3">
            {cfg && (
              <span className={`text-xs px-2 py-0.5 rounded ${cfg.config_pending ? 'bg-amber-900 text-amber-300' : 'bg-green-900 text-green-300'}`}>
                {cfg.config_pending ? '● Pending' : '✓ Applied'}
              </span>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading config…</div>
        ) : (
          <div className="p-5 space-y-5">

            {/* Connection */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Connection</h3>
              <div className="flex gap-2">
                {(['esp32', 'usb'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${mode === m ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {m === 'esp32' ? '📡 ESP32 Coin Slot' : '🔌 USB Timer'}
                  </button>
                ))}
              </div>
            </section>

            {/* Coin Timer */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Coin Timer</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-300 w-32">Rate (₱/min)</label>
                  <input className="input flex-1 text-sm" type="number" step="0.1" min="0"
                    value={ratePerMin} onChange={e => setRatePerMin(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-300 w-32">Secs/coin</label>
                  <input className="input flex-1 text-sm" type="number" min="1"
                    value={secsPerCoin} onChange={e => setSecsPerCoin(e.target.value)} />
                </div>
              </div>

              {/* Coin Rates */}
              <div className="mt-3">
                <div className="mb-1">
                  <span className="text-xs text-slate-400">Coin rates (₱ → minutes)</span>
                </div>
                {coinRates.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No rates configured</p>
                )}
                {coinRates.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">₱</span>
                    <input className="input text-sm w-16" type="number" min="0" step="0.5"
                      value={r.coin} onChange={e => updateCoinRate(i, 'coin', e.target.value)} />
                    <span className="text-xs text-slate-400">=</span>
                    <input className="input text-sm w-16" type="number" min="1"
                      value={r.minutes} onChange={e => updateCoinRate(i, 'minutes', e.target.value)} />
                    <span className="text-xs text-slate-400">min</span>
                    <button onClick={() => removeCoinRate(i)} className="text-red-400 hover:text-red-300 text-sm ml-auto">×</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Kiosk */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kiosk</h3>
              <div className="space-y-2">
                <Toggle label="Kiosk mode (lock home button)" checked={kioskMode} onChange={setKioskMode} />
                <Toggle label="Floating timer overlay" checked={floatingTimer} onChange={setFloatingTimer} />
              </div>
            </section>

            {/* Deep Freeze */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deep Freeze</h3>
              <div className="space-y-2">
                <Toggle label="Enable deep freeze" checked={deepFreeze} onChange={setDeepFreeze} />
                {deepFreeze && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-300 w-32">Grace period (s)</label>
                    <input className="input flex-1 text-sm" type="number" min="0"
                      value={deepFreezeGrace} onChange={e => setDeepFreezeGrace(e.target.value)} />
                  </div>
                )}
              </div>
            </section>

            {/* Anti-Theft */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Anti-Theft Alarm</h3>
              <div className="space-y-2">
                <Toggle label="Alarm on WiFi disconnect" checked={alarmWifi} onChange={setAlarmWifi} />
                <Toggle label="Alarm on charger unplug" checked={alarmCharger} onChange={setAlarmCharger} />
                <Toggle label="Only during active session" checked={alarmSessionOnly} onChange={setAlarmSessionOnly} />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-300 w-32">Alarm delay (s)</label>
                  <input className="input flex-1 text-sm" type="number" min="0"
                    value={alarmDelay} onChange={e => setAlarmDelay(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Admin PIN Reset */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin PIN Reset</h3>
              <p className="text-xs text-slate-500 mb-2">
                Set a new PIN for the tablet setup screen. Leave blank to keep current PIN.
                {cfg?.admin_pin && <span className="text-amber-400"> Current PIN has been set remotely.</span>}
              </p>
              <input
                className="input text-sm"
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="Enter new PIN (e.g. 1234)"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              />
            </section>

            {/* Save button */}
            <button className="btn-primary w-full" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save & Push Config'}
            </button>

            {/* Remote Commands */}
            <section className="border-t border-slate-700 pt-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remote Commands</h3>
              <div className="flex gap-2 flex-wrap">
                {([
                  { cmd: 'restart_app',    label: '↺ Restart App' },
                  { cmd: 'restart_device', label: '⟳ Reboot Device' },
                  { cmd: 'lock_screen',    label: '🔒 Lock Screen' },
                ] as const).map(({ cmd, label }) => (
                  <button key={cmd}
                    className="btn-secondary text-sm flex-1"
                    onClick={() => sendCmd(cmd)}
                    disabled={cmdBusy !== null}>
                    {cmdBusy === cmd ? 'Sending…' : label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Commands are fire-and-forget — device must be online to receive them.</p>
            </section>

          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-orange-500' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}
