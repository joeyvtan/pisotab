import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import LogPanel from '../components/LogPanel';

export default function DeviceSetup() {
  const [device,      setDevice]      = useState(null);
  const [ownerStatus, setOwnerStatus] = useState(null); // null | true | false
  const [apkSrc,      setApkSrc]      = useState('bundled');
  const [apkPath,     setApkPath]     = useState('');
  const [serverUrl,   setServerUrl]   = useState('https://api.jjtpisotab.com');
  const [deviceId,    setDeviceId]    = useState('');
  const [deviceName,  setDeviceName]  = useState('');
  const [adminPin,    setAdminPin]    = useState('');
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(false);

  const addLog = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${ts}] ${String(msg).trim()}`]);
  }, []);

  useEffect(() => {
    window.pisotab.adb.onLog(addLog);
    window.pisotab.api.getSettings().then(s => {
      if (s.serverUrl) setServerUrl(s.serverUrl);
    }).catch(() => {});
    return () => window.pisotab.adb.offLog();
  }, [addLog]);

  async function detectDevice() {
    setLoading(true);
    const result = await window.pisotab.adb.detectDevice();
    setDevice(result.connected ? result : null);
    if (!result.connected) {
      if (result.unauthorized) {
        addLog('Device found but not authorized — check the "Trust this computer?" dialog on the tablet.');
      } else if (result.error) {
        addLog(`Error: ${result.error}`);
      } else {
        addLog('No device found. Connect via USB and enable USB debugging.');
      }
    } else {
      addLog(`✓ Connected: ${result.model} (${result.serial})`);
    }
    setLoading(false);
  }

  async function checkOwner() {
    const result = await window.pisotab.adb.checkDeviceOwner();
    setOwnerStatus(result.isOwner);
    addLog(result.isOwner ? '✓ Device Owner: com.pisotab.app' : '✗ Device Owner not set');
  }

  async function setDeviceOwner() {
    setLoading(true);
    addLog('Setting Device Owner...');
    const result = await window.pisotab.adb.setDeviceOwner();
    if (result.success) {
      setOwnerStatus(true);
      addLog('✓ Device Owner set successfully!');
    } else {
      addLog(`✗ Failed: ${result.error}`);
      addLog('Tip: Remove all Google accounts from the device before setting Device Owner.');
    }
    setLoading(false);
  }

  async function installApk() {
    let path = apkSrc === 'bundled'
      ? await window.pisotab.fs.getBundledApkPath()
      : apkPath;
    if (!path) { addLog('No APK selected.'); return; }
    setLoading(true);
    const result = await window.pisotab.adb.installApk(path);
    addLog(result.success ? '✓ APK installed!' : `✗ Install failed: ${result.error}`);
    setLoading(false);
  }

  async function browseApk() {
    const selected = await window.pisotab.fs.selectFile([{ name: 'Android APK', extensions: ['apk'] }]);
    if (selected) { setApkPath(selected); setApkSrc('browse'); }
  }

  async function pushConfig() {
    setLoading(true);
    addLog('Pushing config to tablet...');
    const result = await window.pisotab.adb.pushConfig({ serverUrl, deviceId, deviceName, adminPin });
    if (result.success) {
      addLog('✓ Config pushed! App will restart with new settings.');
    } else {
      addLog(`✗ Push failed: ${result.error}`);
      addLog('Note: The Android app needs ToolConfigReceiver (Phase 18b) to accept this broadcast.');
    }
    setLoading(false);
  }

  async function autoBootOnCharge() {
    await window.pisotab.adb.autoBootOnCharge();
    addLog('✓ Auto boot on charge enabled.');
  }

  async function factoryReset() {
    if (!confirm('Factory reset the connected tablet? This cannot be undone.')) return;
    await window.pisotab.adb.factoryReset();
    addLog('Factory reset initiated.');
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h2 className="text-lg font-semibold text-white">Device Setup</h2>

      {/* Connected device */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Connected Device</p>
          <button onClick={detectDevice} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        {device ? (
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            <div>
              <p className="text-sm text-white font-medium">{device.model}</p>
              <p className="text-xs text-gray-500">Serial: {device.serial}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <XCircle size={16} />
            <p className="text-sm">No device. Connect via USB + enable USB debugging.</p>
          </div>
        )}
      </div>

      {/* Install APK */}
      <Section title="Install App">
        <div className="space-y-2">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="apksrc" value="bundled" checked={apkSrc === 'bundled'}
                onChange={() => setApkSrc('bundled')} className="accent-red-600" />
              Bundled APK
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="apksrc" value="browse" checked={apkSrc === 'browse'}
                onChange={() => setApkSrc('browse')} className="accent-red-600" />
              Browse file
            </label>
          </div>
          {apkSrc === 'browse' && (
            <div className="flex gap-2 items-center">
              <p className="text-xs text-gray-500 truncate flex-1">{apkPath || 'No file selected'}</p>
              <button onClick={browseApk} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300">
                Browse
              </button>
            </div>
          )}
          <button onClick={installApk} disabled={loading || !device}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-sm font-medium transition-colors">
            Install APK
          </button>
        </div>
      </Section>

      {/* Device Owner */}
      <Section title="Device Owner">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {ownerStatus === null && <AlertCircle size={15} className="text-gray-500" />}
            {ownerStatus === true  && <CheckCircle size={15} className="text-green-500" />}
            {ownerStatus === false && <XCircle     size={15} className="text-red-500"   />}
            <span className="text-sm text-gray-400">
              {ownerStatus === null  ? 'Unknown' : ownerStatus ? 'Set' : 'Not set'}
            </span>
          </div>
          <button onClick={checkOwner} disabled={!device}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-xs transition-colors">
            Check
          </button>
          <button onClick={setDeviceOwner} disabled={loading || !device || ownerStatus === true}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-xs transition-colors">
            Set Device Owner
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          Remove all Google accounts from the device before setting Device Owner.
        </p>
      </Section>

      {/* Quick Config */}
      <Section title="Push Config to Tablet">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Server URL"   value={serverUrl}  onChange={setServerUrl}  placeholder="https://api.jjtpisotab.com" />
          <Field label="Device ID"    value={deviceId}   onChange={setDeviceId}   placeholder="dev_xxxx" />
          <Field label="Device Name"  value={deviceName} onChange={setDeviceName} placeholder="Store Unit 1" />
          <Field label="Admin PIN"    value={adminPin}   onChange={setAdminPin}   placeholder="1234" type="password" />
        </div>
        <button onClick={pushConfig} disabled={loading || !device}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-sm font-medium transition-colors">
          Push Config to Tablet
        </button>
        <p className="text-xs text-gray-600 mt-1">
          Requires Phase 18b (ToolConfigReceiver) in the Android app.
        </p>
      </Section>

      {/* Power / Kiosk */}
      <Section title="Power / Kiosk">
        <div className="flex gap-2">
          <button onClick={autoBootOnCharge} disabled={!device}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-xs transition-colors">
            Auto Boot on Charge
          </button>
          <button onClick={factoryReset} disabled={loading || !device}
            className="px-3 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-50 rounded text-xs transition-colors text-red-300">
            Factory Reset
          </button>
        </div>
      </Section>

      <LogPanel logs={logs} onClear={() => setLogs([])} maxHeight="200px" />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium border-b border-gray-800 pb-2">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 selectable"
      />
    </div>
  );
}
