'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, FirmwareInfo, Device } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function fmt(bytes: number | null) {
  if (!bytes) return '—';
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

export default function FirmwarePage() {
  const { user } = useAuth();
  const router   = useRouter();

  // Admin-only page
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [user, router]);

  const [info, setInfo]       = useState<FirmwareInfo | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [version, setVersion] = useState('');
  const [file, setFile]       = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [otaStatus, setOtaStatus] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [fw, devs] = await Promise.all([
      api.getFirmware().catch(() => null),
      api.getDevices().catch(() => []),
    ]);
    setInfo(fw);
    // Only ESP32-type devices are OTA candidates (id starts with "esp32" or device has no android_id)
    setDevices(devs);
  }

  useEffect(() => { load(); }, []);

  async function handleUpload() {
    if (!file || !version.trim()) return;
    setUploading(true);
    try {
      await api.uploadFirmware(file, version.trim());
      setFile(null);
      setVersion('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e: unknown) {
      alert('Upload failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setUploading(false); }
  }

  async function handleOta(device_id: string) {
    setOtaStatus(s => ({ ...s, [device_id]: 'sending...' }));
    try {
      await api.triggerOta(device_id);
      setOtaStatus(s => ({ ...s, [device_id]: 'OTA sent ✓' }));
    } catch (e: unknown) {
      setOtaStatus(s => ({ ...s, [device_id]: 'Error: ' + (e instanceof Error ? e.message : String(e)) }));
    }
    // Clear status after 5 s
    setTimeout(() => setOtaStatus(s => { const n = { ...s }; delete n[device_id]; return n; }), 5000);
  }

  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Firmware OTA</h1>

      {/* Current firmware */}
      <div className="card">
        <h2 className="font-bold text-white mb-3">Current Firmware</h2>
        {info?.version ? (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-400 text-xs mb-1">Version</div>
              <div className="text-white font-mono font-semibold">{info.version}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-1">File size</div>
              <div className="text-white">{fmt(info.size)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-1">Uploaded</div>
              <div className="text-white">{fmtDate(info.uploaded_at)}</div>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No firmware uploaded yet.</p>
        )}
      </div>

      {/* Upload new firmware */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">Upload New Firmware</h2>
        <p className="text-slate-400 text-sm">
          Compile your ESP32 sketch in PlatformIO (<span className="font-mono text-slate-300">.pio/build/esp32dev/firmware.bin</span>),
          then upload it here. After uploading, push OTA to any online device below.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Version (e.g. 1.2.0)</label>
            <input className="input text-sm" placeholder="1.0.0"
              value={version} onChange={e => setVersion(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Firmware .bin file</label>
            <input ref={fileRef} type="file" accept=".bin"
              className="block w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-white cursor-pointer"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <button className="btn-primary" onClick={handleUpload}
          disabled={uploading || !file || !version.trim()}>
          {uploading ? 'Uploading...' : 'Upload Firmware'}
        </button>
      </div>

      {/* Push OTA to devices */}
      <div className="space-y-3">
        <h2 className="font-bold text-white">Push OTA to Device</h2>
        {!info?.version && (
          <p className="text-slate-400 text-sm">Upload firmware first before pushing OTA.</p>
        )}
        {devices.length === 0 ? (
          <div className="card text-slate-400 text-sm">No devices registered.</div>
        ) : (
          <div className="space-y-2">
            {devices.map(device => (
              <div key={device.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{device.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{device.id}</div>
                  <div className="text-xs mt-0.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                      device.status === 'online' || device.status === 'in_session'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {otaStatus[device.id] && (
                    <span className="text-xs text-orange-400">{otaStatus[device.id]}</span>
                  )}
                  <button
                    className="btn-primary text-sm"
                    disabled={!info?.version || !!otaStatus[device.id]}
                    onClick={() => handleOta(device.id)}>
                    Push OTA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
