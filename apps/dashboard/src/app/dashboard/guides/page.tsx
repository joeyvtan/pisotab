'use client';
import { useState, useEffect } from 'react';
import { api, FirmwareInfo } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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

      {/* Quick Setup Reference */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">Quick Setup Reference</h2>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-300 font-medium mb-1">Android App Setup</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Install the APK on your Android tablet</li>
              <li>Long-press bottom-right corner → enter PIN <code className="bg-slate-700 px-1 rounded">1234</code></li>
              <li>Set Backend URL to <code className="bg-slate-700 px-1 rounded">{BASE_URL}</code></li>
              <li>Copy the Device ID from the Devices page and paste it in the app</li>
              <li>Enable Kiosk Mode last, after everything is working</li>
            </ol>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-300 font-medium mb-1">ESP32 Flashing</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Download ESP32 Flash Tool and firmware (.bin) above</li>
              <li>Connect ESP32 to PC via USB</li>
              <li>Open Flash Tool → select COM port → set address <code className="bg-slate-700 px-1 rounded">0x0</code> → select .bin file → Flash</li>
              <li>Connect to <code className="bg-slate-700 px-1 rounded">PisoTab-Coin</code> WiFi → enter your network credentials</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
