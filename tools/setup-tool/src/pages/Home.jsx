import { useState, useEffect } from 'react';
import { Smartphone, Zap, Wifi, RefreshCw } from 'lucide-react';

export default function Home() {
  const [device,    setDevice]    = useState(null);
  const [ports,     setPorts]     = useState([]);
  const [settings,  setSettings]  = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const [s, portList, dev] = await Promise.all([
        window.pisotab.api.getSettings(),
        window.pisotab.serial.listPorts(),
        window.pisotab.adb.detectDevice(),
      ]);
      setSettings(s);
      setPorts(portList);
      setDevice(dev);
    } catch {
      // silently ignore — user hasn't set up assets yet
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Overview</h2>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Android device card */}
        <StatusCard
          Icon={Smartphone}
          title="Android Device"
          status={device?.connected ? 'connected' : 'disconnected'}
          label={device?.connected ? device.model : 'No device found'}
          sub={device?.connected ? `Serial: ${device.serial}` : 'Connect via USB + enable ADB'}
        />

        {/* COM ports card */}
        <StatusCard
          Icon={Zap}
          title="COM Ports"
          status={ports.length > 0 ? 'connected' : 'disconnected'}
          label={ports.length > 0 ? `${ports.length} port${ports.length > 1 ? 's' : ''} found` : 'No ports found'}
          sub={ports.length > 0 ? ports.map(p => p.path).join(', ') : 'Connect ESP32/ESP8266 via USB'}
        />

        {/* Backend card */}
        <StatusCard
          Icon={Wifi}
          title="Backend"
          status={settings?.serverUrl ? 'connected' : 'disconnected'}
          label={settings?.token ? 'Logged in' : 'Not logged in'}
          sub={settings?.serverUrl || 'Set server URL in Wizard'}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction title="Flash ESP Firmware" desc="Update ESP32 or ESP8266 firmware" page="esp" />
          <QuickAction title="Install APK" desc="Install PisoTab app to tablet" page="device" />
          <QuickAction title="New Device Wizard" desc="One-click complete kiosk setup" page="wizard" />
          <QuickAction title="Install Apps" desc="Add games and apps to tablet" page="apps" />
        </div>
      </div>

      {/* Setup checklist */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">Asset Checklist</h3>
        <div className="space-y-2 text-xs text-gray-400">
          <p className="text-gray-500 text-xs mb-2">
            Copy these files into the <code className="text-red-400">tools/setup-tool/assets/</code> folder before use:
          </p>
          <CheckItem label="assets/adb/adb.exe" desc="From Android SDK platform-tools" />
          <CheckItem label="assets/esptool/esptool.exe" desc="From esptool releases (Windows)" />
          <CheckItem label="assets/firmware/pisotab_coin_esp32.bin" desc="ESP32 firmware binary" />
          <CheckItem label="assets/firmware/pisotab_coin_esp8266.bin" desc="ESP8266 firmware binary" />
          <CheckItem label="assets/apk/pisotab.apk" desc="PisoTab Android APK" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ Icon, title, status, label, sub }) {
  const isOk = status === 'connected';
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Icon size={16} className="text-gray-500" />
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
          isOk ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'
        }`}>
          {isOk ? 'OK' : 'N/A'}
        </span>
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-sm text-white font-medium">{label}</p>
      <p className="text-xs text-gray-600 truncate">{sub}</p>
    </div>
  );
}

function QuickAction({ title, desc, page }) {
  return (
    <button className="text-left bg-gray-900 border border-gray-800 hover:border-red-700 rounded-lg p-3 transition-colors">
      <p className="text-sm text-white font-medium">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </button>
  );
}

function CheckItem({ label, desc }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-700 mt-0.5">□</span>
      <div>
        <code className="text-gray-300">{label}</code>
        <span className="text-gray-600 ml-2">{desc}</span>
      </div>
    </div>
  );
}
