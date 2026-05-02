'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, FirmwareInfo } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [command]);
  return (
    <div className="flex items-start gap-2 bg-slate-900 border border-slate-600 rounded-lg p-2.5 mt-1.5">
      <code className="flex-1 text-red-300 font-mono text-xs break-all leading-relaxed">{command}</code>
      <button onClick={copy}
        className="shrink-0 px-2 py-1 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}

const STORAGE_KEY = 'pisotab_guide_links';

interface GuideLink {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'document' | 'other';
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

const TYPE_ICONS: Record<string, string> = { video: '🎬', document: '📄', other: '🔗' };

interface UrlFieldProps {
  label: string;
  settingKey: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function UrlField({ label, settingKey, value, onChange, placeholder }: UrlFieldProps) {
  const [input, setInput] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setInput(value); }, [value]);

  async function save() {
    setSaving(true);
    try {
      await api.updateAppSetting(settingKey, input.trim());
      onChange(input.trim());
    } catch (e: unknown) {
      alert('Failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  }

  async function clear() {
    setInput('');
    await api.updateAppSetting(settingKey, '').catch(() => {});
    onChange('');
  }

  return (
    <div className="mt-3 space-y-1">
      <label className="block text-xs text-slate-400">{label}</label>
      <div className="flex gap-2">
        <input className="input text-xs flex-1" placeholder={placeholder || 'https://...'}
          value={input} onChange={e => setInput(e.target.value)} />
        <button className="btn-primary text-xs shrink-0" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {value && (
          <button className="btn-secondary text-xs shrink-0" onClick={clear}>Clear</button>
        )}
      </div>
    </div>
  );
}

export default function GuidesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [firmware, setFirmware]         = useState<FirmwareInfo | null>(null);
  const [apkUrl, setApkUrl]             = useState('');
  const [firmwareUrl, setFirmwareUrl]   = useState('');
  const [flasherUrl, setFlasherUrl]     = useState('');
  const [links, setLinks]               = useState<GuideLink[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ title: '', url: '', type: 'video' as GuideLink['type'] });
  const [editId, setEditId]   = useState<string | null>(null);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.jjtpisotab.com';

  useEffect(() => {
    api.getFirmware().then(f => setFirmware(f)).catch(() => {});
    api.getAppSettings().then(s => {
      setApkUrl(s['apk_download_url'] || '');
      setFirmwareUrl(s['firmware_download_url'] || '');
      setFlasherUrl(s['flasher_download_url'] || '');
    }).catch(() => {});
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setLinks(JSON.parse(saved));
  }, []);

  function saveLinks(updated: GuideLink[]) {
    setLinks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addLink() {
    if (!form.title.trim() || !form.url.trim()) return;
    const url = form.url.startsWith('http') ? form.url : 'https://' + form.url;
    if (editId) {
      saveLinks(links.map(l => l.id === editId ? { ...l, ...form, url } : l));
      setEditId(null);
    } else {
      saveLinks([...links, { id: Date.now().toString(), ...form, url }]);
    }
    setForm({ title: '', url: '', type: 'video' });
    setShowAdd(false);
  }

  function startEdit(link: GuideLink) {
    setForm({ title: link.title, url: link.url, type: link.type });
    setEditId(link.id);
    setShowAdd(true);
  }

  function removeLink(id: string) {
    if (!confirm('Remove this link?')) return;
    saveLinks(links.filter(l => l.id !== id));
  }

  // Resolve firmware download: prefer external URL, fallback to backend
  const firmwareDownloadUrl = firmwareUrl || (firmware?.version ? `${BASE_URL}/api/firmware/download` : '');

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">User Guides & Downloads</h1>

      {/* Downloads */}
      <div className="card">
        <h2 className="font-bold text-white mb-4">Downloads</h2>

        {/* APK */}
        <div className="py-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <div className="text-white text-sm font-medium">Android Kiosk App (APK)</div>
                <div className="text-slate-500 text-xs">
                  {apkUrl ? 'Hosted on Google Drive' : 'No download URL set'}
                </div>
              </div>
            </div>
            {apkUrl && (
              <a href={apkUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors">
                Download
              </a>
            )}
          </div>
          {isSuperAdmin && (
            <UrlField
              label="APK Download URL (Google Drive)"
              settingKey="apk_download_url"
              value={apkUrl}
              onChange={setApkUrl}
              placeholder="https://drive.usercontent.google.com/download?id=..."
            />
          )}
        </div>

        {/* Firmware */}
        <div className="py-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔌</span>
              <div>
                <div className="text-white text-sm font-medium">ESP32 Firmware (.bin)</div>
                <div className="text-slate-500 text-xs">
                  {firmwareUrl
                    ? 'Hosted on Google Drive'
                    : firmware?.version
                      ? `v${firmware.version}${firmware.size ? ' · ' + formatBytes(firmware.size) : ''}`
                      : 'Not yet uploaded'}
                </div>
              </div>
            </div>
            {firmwareDownloadUrl && (
              <a href={firmwareDownloadUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors">
                Download
              </a>
            )}
          </div>
          {isSuperAdmin && (
            <UrlField
              label="Firmware Download URL (Google Drive)"
              settingKey="firmware_download_url"
              value={firmwareUrl}
              onChange={setFirmwareUrl}
              placeholder="https://drive.usercontent.google.com/download?id=..."
            />
          )}
        </div>

        {/* Flash Tool */}
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="text-white text-sm font-medium">ESP32 Flash Tool</div>
                <div className="text-slate-500 text-xs">
                  {flasherUrl ? 'Hosted on Google Drive' : 'Espressif official website'}
                </div>
              </div>
            </div>
            <a href={flasherUrl || 'https://www.espressif.com/en/support/download/other-tools'}
              target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors">
              Download
            </a>
          </div>
          {isSuperAdmin && (
            <UrlField
              label="Flash Tool URL (Google Drive folder or file)"
              settingKey="flasher_download_url"
              value={flasherUrl}
              onChange={setFlasherUrl}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          )}
        </div>
      </div>

      {/* Video / Document / PDF Links */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-white">Guides & Resources</h2>
            <p className="text-slate-500 text-xs mt-0.5">Videos, PDF guides, Google Drive documents — any link</p>
          </div>
          {isSuperAdmin && (
            <button className="btn-primary text-sm"
              onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({ title: '', url: '', type: 'video' }); }}>
              + Add Link
            </button>
          )}
        </div>

        {isSuperAdmin && showAdd && (
          <div className="bg-slate-800 rounded-lg p-4 space-y-3 mb-4">
            <h3 className="text-white text-sm font-medium">{editId ? 'Edit Link' : 'Add New Link'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Title *</label>
                <input className="input text-sm" placeholder="e.g., ESP32 Wiring Guide"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select className="input text-sm" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as GuideLink['type'] }))}>
                  <option value="video">Video</option>
                  <option value="document">Document / PDF</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">URL * (YouTube, Google Drive, any link)</label>
              <input className="input text-sm" placeholder="https://youtube.com/... or https://drive.google.com/..."
                value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={addLink}>{editId ? 'Save' : 'Add'}</button>
              <button className="btn-secondary text-sm" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</button>
            </div>
          </div>
        )}

        {links.length === 0 ? (
          <p className="text-slate-500 text-sm">
            {isSuperAdmin
              ? 'No links added yet. Click "+ Add Link" to add a video, PDF, or document guide.'
              : 'No guides available yet.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-700">
            {links.map(link => (
              <div key={link.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{TYPE_ICONS[link.type]}</span>
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{link.title}</div>
                    <div className="text-slate-500 text-xs truncate">{link.url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors">
                    Open
                  </a>
                  {isSuperAdmin && (
                    <>
                      <button onClick={() => startEdit(link)}
                        className="text-xs text-slate-500 hover:text-orange-400 transition-colors">✏️</button>
                      <button onClick={() => removeLink(link.id)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors">🗑</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Guide */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-white">Setup Guide</h2>
          <button
            onClick={downloadSetupPDF}
            className="text-xs px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors flex items-center gap-1.5">
            ⬇ Download PDF
          </button>
        </div>

        <div className="space-y-3 text-sm">

          {/* Step 1 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-slate-200 font-semibold">Register &amp; Get Approved</p>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400 ml-8">
              <li>Go to the dashboard and register your admin account</li>
              <li>Wait for superadmin approval — you'll be able to log in once approved</li>
              <li>After approval, log in and navigate to <strong className="text-slate-300">Devices</strong> to add your tablet</li>
              <li>Copy the generated <strong className="text-slate-300">Device ID</strong> — you'll need it in the app</li>
            </ol>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-slate-200 font-semibold">Flash the ESP32 Firmware (.bin)</p>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-900/60 text-yellow-300 font-medium shrink-0">ESP32 / Coin mode only</span>
            </div>
            <p className="text-yellow-400/80 text-xs mb-2 ml-8">⚡ Skip if using <strong>USB mode</strong> — no ESP32 hardware required.</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400 ml-8">
              <li>Download the <strong className="text-slate-300">ESP32 Firmware (.bin)</strong> and <strong className="text-slate-300">Flash Download Tool</strong> from the Downloads section above</li>
              <li>Install and open the <strong className="text-slate-300">ESP32 Flash Download Tool</strong></li>
              <li>When prompted, select chip type: <code className="bg-slate-700 px-1 rounded">ESP32</code>, work mode: <code className="bg-slate-700 px-1 rounded">Develop</code>, load mode: <code className="bg-slate-700 px-1 rounded">USB</code></li>
              <li>In the SPIDownload tab, click the <strong className="text-slate-300">...</strong> button and browse to select your <code className="bg-slate-700 px-1 rounded">.bin</code> firmware file</li>
              <li>Set the flash address to <code className="bg-slate-700 px-1 rounded">0x0</code> and check the checkbox next to the file row</li>
              <li>Connect the ESP32 board to your PC via USB cable</li>
              <li>Select the correct <strong className="text-slate-300">COM port</strong> from the dropdown (check Device Manager if unsure)</li>
              <li>Set SPI speed: <code className="bg-slate-700 px-1 rounded">40MHz</code>, SPI mode: <code className="bg-slate-700 px-1 rounded">DIO</code></li>
              <li>Click <strong className="text-slate-300">START</strong> — the progress bar will fill to 100% when done</li>
              <li>When complete, the tool shows <strong className="text-green-400">FINISH</strong> — unplug and replug the ESP32</li>
            </ol>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <p className="text-slate-200 font-semibold">Configure the ESP32 (WiFi + Backend)</p>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-900/60 text-yellow-300 font-medium shrink-0">ESP32 / Coin mode only</span>
            </div>
            <p className="text-yellow-400/80 text-xs mb-2 ml-8">⚡ Skip if using <strong>USB mode</strong> — go directly to Step 4.</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400 ml-8">
              <li>After powering on, the ESP32 creates a hotspot: <code className="bg-slate-700 px-1 rounded">PisoTab-Coin</code></li>
              <li>Connect your phone or PC to that WiFi network (no password)</li>
              <li>Open a browser and go to <code className="bg-slate-700 px-1 rounded">192.168.4.1</code></li>
              <li>Enter your local WiFi <strong className="text-slate-300">SSID</strong> and <strong className="text-slate-300">Password</strong></li>
              <li>Enter the Backend URL: <code className="bg-slate-700 px-1 rounded">{BASE_URL}</code></li>
              <li>Click <strong className="text-slate-300">Save</strong> — the ESP32 reboots and connects to your WiFi</li>
              <li>The LED will blink green when connected and communicating with the backend</li>
            </ol>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
              <p className="text-slate-200 font-semibold">Install the Android Kiosk App (APK)</p>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400 ml-8">
              <li>Download the APK from the Downloads section above</li>
              <li>On your Android tablet, go to <strong className="text-slate-300">Settings → Security</strong> and enable <strong className="text-slate-300">Install Unknown Apps</strong></li>
              <li>Open the downloaded APK file and install it</li>
              <li>Launch <strong className="text-slate-300">PisoTab</strong> — the idle screen will appear</li>
              <li>Long-press the <strong className="text-slate-300">bottom-right corner</strong> of the screen for 2 seconds → enter Admin PIN <code className="bg-slate-700 px-1 rounded">1234</code></li>
              <li>Go to <strong className="text-slate-300">Connection Settings</strong> → enter the Backend URL: <code className="bg-slate-700 px-1 rounded">{BASE_URL}</code></li>
              <li>Go to <strong className="text-slate-300">Device Settings</strong> → paste your Device ID from the dashboard</li>
              <li>Tap <strong className="text-slate-300">Connect</strong> — the status should change to <span className="text-green-400">Connected</span></li>
            </ol>
          </div>

          {/* Step 5 — ADB */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">5</span>
              <p className="text-slate-200 font-semibold">ADB Setup — Device Owner &amp; Permissions</p>
            </div>
            <p className="text-slate-400 text-xs mb-3 ml-8">
              These commands grant the app system-level permissions required for Kiosk Mode, floating timer, and secure settings.
              Connect the tablet to your PC via USB and run in <strong className="text-slate-300">Command Prompt (CMD)</strong>.
            </p>

            {/* USB Debugging prereqs */}
            <div className="ml-8 mb-3">
              <p className="text-slate-300 text-xs font-medium mb-1">Enable USB Debugging on the tablet first:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs text-slate-400">
                <li>Go to <strong className="text-slate-300">Settings → About phone</strong>, tap <strong className="text-slate-300">Build number</strong> 7 times</li>
                <li>Go to <strong className="text-slate-300">Settings → Developer options</strong>, enable <strong className="text-slate-300">USB Debugging</strong></li>
                <li>Connect tablet to PC via USB — accept the debugging prompt on the tablet</li>
              </ol>
            </div>

            <div className="ml-8 mb-3 p-2.5 bg-blue-950/40 border border-blue-800/50 rounded-lg">
              <p className="text-blue-300 text-xs leading-relaxed">
                <strong>These commands include the full path</strong> — paste directly into any CMD window, no need to navigate to platform-tools.
                Default path assumes Android Studio installation. If ADB is elsewhere, replace the path up to <code className="bg-slate-900 px-1 rounded font-mono">adb.exe</code>.
              </p>
            </div>

            <div className="ml-8 space-y-4 text-xs">
              <div>
                <p className="text-slate-300 font-medium">1. Set Device Owner <span className="text-red-400 font-normal">(required for Kiosk Mode)</span></p>
                <p className="text-slate-500 text-xs mt-0.5 mb-1">Run once on a fresh install. Remove any Google accounts from the tablet first.</p>
                <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver`} />
                <p className="text-slate-500 mt-1">Expected: <span className="text-green-400">Success: Device owner set to package com.pisotab.app</span></p>
              </div>
              <div>
                <p className="text-slate-300 font-medium">2. Grant System Alert Window <span className="text-slate-400 font-normal">(required for Floating Timer overlay)</span></p>
                <p className="text-slate-500 text-xs mt-0.5 mb-1">Allows the countdown timer to appear on top of other apps.</p>
                <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell appops set com.pisotab.app SYSTEM_ALERT_WINDOW allow`} />
              </div>
              <div>
                <p className="text-slate-300 font-medium">3. Grant Write Secure Settings <span className="text-slate-400 font-normal">(required for lock screen &amp; kiosk controls)</span></p>
                <p className="text-slate-500 text-xs mt-0.5 mb-1">Allows the app to control screen lock behavior and system UI settings.</p>
                <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell pm grant com.pisotab.app android.permission.WRITE_SECURE_SETTINGS`} />
              </div>
              <div>
                <p className="text-slate-300 font-medium">4. Verify Device Owner <span className="text-slate-400 font-normal">(confirm it was set correctly)</span></p>
                <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm list-owners`} />
                <p className="text-slate-500 mt-1">Should show <span className="text-green-400">com.pisotab.app</span> as device owner.</p>
              </div>
              <div>
                <p className="text-slate-300 font-medium">5. Remove Device Owner <span className="text-slate-400 font-normal">(only if uninstalling or resetting)</span></p>
                <p className="text-slate-500 text-xs mt-0.5 mb-1">Prefer Admin panel → Kiosk Mode → Deactivate. Use ADB only if the app is inaccessible.</p>
                <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm remove-active-admin com.pisotab.app/.receiver.DeviceAdminReceiver`} />
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">6</span>
              <p className="text-slate-200 font-semibold">Final Configuration &amp; Kiosk Mode</p>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400 ml-8">
              <li>In the Admin panel, go to <strong className="text-slate-300">Pricing</strong> — set your per-minute or per-session rates</li>
              <li>Go to <strong className="text-slate-300">Allowed Apps</strong> — enable only the apps customers should access</li>
              <li>Go to <strong className="text-slate-300">Appearance</strong> — set wallpaper, animation, and accent color</li>
              <li>Test a session: insert coins (ESP32 mode) or connect USB power (USB mode) — verify the timer starts</li>
              <li>Once everything works, go to <strong className="text-slate-300">Kiosk Mode</strong> and enable it — this locks the tablet to the app</li>
              <li>Change the Admin PIN from the default <code className="bg-slate-700 px-1 rounded">1234</code> to a secure PIN</li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  );
}

function downloadSetupPDF() {
  const win = window.open('', '_blank');
  if (!win) return;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.jjtpisotab.com';
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>PisoTab Setup Guide</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 20pt; color: #ea580c; margin-bottom: 4px; }
  .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 24px; }
  .step { margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
  .step-header { background: #fff7ed; padding: 10px 14px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #fed7aa; }
  .step-num { width: 24px; height: 24px; border-radius: 50%; background: #ea580c; color: white; font-weight: bold; font-size: 11pt; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-title { font-weight: bold; font-size: 12pt; color: #1e293b; }
  .step-badge { font-size: 8.5pt; background: #fef3c7; color: #92400e; border-radius: 99px; padding: 1px 8px; margin-left: 8px; }
  .step-note { font-size: 9.5pt; color: #b45309; background: #fffbeb; border-left: 3px solid #fcd34d; padding: 4px 10px; margin: 0 0 8px 0; border-radius: 0 4px 4px 0; }
  .step-body { padding: 12px 14px 12px 48px; }
  ol { padding-left: 18px; }
  li { margin-bottom: 5px; line-height: 1.5; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 9pt; color: #c2410c; }
  .cmd { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; font-family: monospace; font-size: 8.5pt; color: #c2410c; word-break: break-all; margin: 4px 0; }
  .cmd-label { font-weight: bold; color: #1e293b; margin-top: 10px; margin-bottom: 2px; }
  .cmd-note { font-size: 9pt; color: #64748b; margin-bottom: 2px; }
  .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px 12px; font-size: 9.5pt; color: #1e40af; margin-bottom: 10px; }
  strong { color: #1e293b; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #94a3b8; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>PisoTab Setup Guide</h1>
<p class="subtitle">Complete step-by-step installation and configuration guide</p>

<div class="step">
  <div class="step-header"><div class="step-num">1</div><div class="step-title">Register &amp; Get Approved</div></div>
  <div class="step-body">
    <ol>
      <li>Go to the dashboard and register your admin account.</li>
      <li>Wait for superadmin approval — you'll be able to log in once approved.</li>
      <li>After approval, log in and go to <strong>Devices</strong> to add your tablet.</li>
      <li>Copy the generated <strong>Device ID</strong> — you'll need it in the Android app.</li>
    </ol>
  </div>
</div>

<div class="step">
  <div class="step-header"><div class="step-num">2</div><div class="step-title">Flash the ESP32 Firmware (.bin)<span class="step-badge">ESP32 / Coin mode only</span></div></div>
  <div class="step-body">
    <div class="step-note">⚡ Skip this step if you are using USB mode — no ESP32 hardware required.</div>
    <ol>
      <li>Download the <strong>ESP32 Firmware (.bin)</strong> and <strong>Flash Download Tool</strong> from the Guides &amp; Downloads page.</li>
      <li>Install and open the <strong>ESP32 Flash Download Tool</strong>.</li>
      <li>When prompted, select chip type: <code>ESP32</code>, work mode: <code>Develop</code>, load mode: <code>USB</code>.</li>
      <li>In the SPIDownload tab, click <strong>...</strong> and select your <code>.bin</code> firmware file.</li>
      <li>Set the flash address to <code>0x0</code> and check the checkbox next to the file row.</li>
      <li>Connect the ESP32 board to your PC via USB cable.</li>
      <li>Select the correct <strong>COM port</strong> from the dropdown (check Device Manager if unsure).</li>
      <li>Set SPI speed: <code>40MHz</code>, SPI mode: <code>DIO</code>.</li>
      <li>Click <strong>START</strong> — the progress bar fills to 100% when done.</li>
      <li>When the tool shows <strong>FINISH</strong>, unplug and replug the ESP32.</li>
    </ol>
  </div>
</div>

<div class="step">
  <div class="step-header"><div class="step-num">3</div><div class="step-title">Configure the ESP32 (WiFi + Backend)<span class="step-badge">ESP32 / Coin mode only</span></div></div>
  <div class="step-body">
    <div class="step-note">⚡ Skip this step if you are using USB mode — go directly to Step 4.</div>
    <ol>
      <li>After powering on, the ESP32 creates a hotspot: <code>PisoTab-Coin</code>.</li>
      <li>Connect your phone or PC to that WiFi (no password).</li>
      <li>Open a browser and go to <code>192.168.4.1</code>.</li>
      <li>Enter your local WiFi <strong>SSID</strong> and <strong>Password</strong>.</li>
      <li>Enter the Backend URL: <code>${apiUrl}</code>.</li>
      <li>Click <strong>Save</strong> — the ESP32 reboots and connects to your WiFi.</li>
      <li>The LED will blink green when connected and communicating with the backend.</li>
    </ol>
  </div>
</div>

<div class="step">
  <div class="step-header"><div class="step-num">4</div><div class="step-title">Install the Android Kiosk App (APK)</div></div>
  <div class="step-body">
    <ol>
      <li>Download the APK from the Guides &amp; Downloads page.</li>
      <li>On your Android tablet, go to <strong>Settings → Security</strong> and enable <strong>Install Unknown Apps</strong>.</li>
      <li>Open the downloaded APK file and install it.</li>
      <li>Launch <strong>PisoTab</strong> — the idle screen will appear.</li>
      <li>Long-press the <strong>bottom-right corner</strong> for 2 seconds → enter Admin PIN <code>1234</code>.</li>
      <li>Go to <strong>Connection Settings</strong> → enter Backend URL: <code>${apiUrl}</code>.</li>
      <li>Go to <strong>Device Settings</strong> → paste your Device ID from the dashboard.</li>
      <li>Tap <strong>Connect</strong> — status should change to <strong>Connected</strong>.</li>
    </ol>
  </div>
</div>

<div class="step">
  <div class="step-header"><div class="step-num">5</div><div class="step-title">ADB Setup — Device Owner &amp; Permissions</div></div>
  <div class="step-body">
    <p style="margin-bottom:8px;font-size:10pt;color:#475569;">Grant the app system-level permissions for Kiosk Mode, floating timer, and secure settings. Connect tablet to PC via USB first.</p>
    <p style="font-weight:bold;margin-bottom:4px;font-size:10pt;">Enable USB Debugging on tablet:</p>
    <ol style="margin-bottom:10px;">
      <li>Go to <strong>Settings → About phone</strong>, tap <strong>Build number</strong> 7 times to unlock Developer options.</li>
      <li>Go to <strong>Settings → Developer options</strong> and enable <strong>USB Debugging</strong>.</li>
      <li>Connect tablet to PC via USB — accept the debugging prompt on the tablet.</li>
    </ol>
    <div class="info-box">Full-path commands — paste into any CMD window (no need to navigate to platform-tools). Default path is Android Studio install location. Replace path if ADB is installed elsewhere.</div>
    <p class="cmd-label">1. Set Device Owner (required for Kiosk Mode)</p>
    <p class="cmd-note">Run once on a fresh install. Remove any Google accounts from the tablet first.</p>
    <div class="cmd">"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver</div>
    <p style="font-size:9pt;color:#16a34a;margin-top:2px;">Expected: Success: Device owner set to package com.pisotab.app</p>
    <p class="cmd-label">2. Grant System Alert Window (required for Floating Timer overlay)</p>
    <div class="cmd">"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell appops set com.pisotab.app SYSTEM_ALERT_WINDOW allow</div>
    <p class="cmd-label">3. Grant Write Secure Settings (required for lock screen &amp; kiosk controls)</p>
    <div class="cmd">"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell pm grant com.pisotab.app android.permission.WRITE_SECURE_SETTINGS</div>
    <p class="cmd-label">4. Verify Device Owner (optional — confirm it was set)</p>
    <div class="cmd">"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm list-owners</div>
    <p class="cmd-label">5. Remove Device Owner (only if uninstalling or resetting)</p>
    <p class="cmd-note">Prefer Admin panel → Kiosk Mode → Deactivate. Use ADB only if the app is inaccessible.</p>
    <div class="cmd">"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm remove-active-admin com.pisotab.app/.receiver.DeviceAdminReceiver</div>
  </div>
</div>

<div class="step">
  <div class="step-header"><div class="step-num">6</div><div class="step-title">Final Configuration &amp; Kiosk Mode</div></div>
  <div class="step-body">
    <ol>
      <li>In the Admin panel, go to <strong>Pricing</strong> and set your per-minute or per-session rates.</li>
      <li>Go to <strong>Allowed Apps</strong> — enable only the apps customers should access.</li>
      <li>Go to <strong>Appearance</strong> — set wallpaper, animation, and accent color.</li>
      <li>Test a session: insert coins (ESP32 mode) or connect USB power (USB mode) — verify the timer starts.</li>
      <li>Once everything works, go to <strong>Kiosk Mode</strong> and enable it.</li>
      <li>Change the Admin PIN from the default <code>1234</code> to a secure PIN.</li>
    </ol>
  </div>
</div>

<div class="footer">PisoTab &mdash; ${apiUrl} &mdash; Generated ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
