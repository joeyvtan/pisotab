import { useState } from 'react';
import { FolderOpen, Package, HardDrive } from 'lucide-react';
import LogPanel from '../components/LogPanel';

function formatSize(bytes) {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export default function AppManager() {
  const [folder,   setFolder]   = useState('');
  const [apks,     setApks]     = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(false);

  const addLog = (msg) => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${ts}] ${String(msg).trim()}`]);
  };

  async function browseFolder() {
    const dir = await window.pisotab.fs.selectFolder();
    if (!dir) return;
    setFolder(dir);
    const list = await window.pisotab.fs.listApks(dir);
    setApks(list);
    setSelected(new Set());
    addLog(`Found ${list.length} APK${list.length !== 1 ? 's' : ''} in ${dir}`);
  }

  function toggleSelect(path) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(apks.map(a => a.path)));
  }

  async function installSelected() {
    const toInstall = apks.filter(a => selected.has(a.path));
    if (toInstall.length === 0) { addLog('No APKs selected.'); return; }
    setLoading(true);
    window.pisotab.adb.onLog((msg) => addLog(msg));
    for (const apk of toInstall) {
      addLog(`Installing ${apk.name}...`);
      const result = await window.pisotab.adb.installApk(apk.path);
      addLog(result.success ? `✓ ${apk.name} installed` : `✗ ${apk.name} failed: ${result.error}`);
    }
    window.pisotab.adb.offLog();
    setLoading(false);
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h2 className="text-lg font-semibold text-white">App Manager</h2>

      {/* Folder picker */}
      <div className="flex items-center gap-3">
        <button onClick={browseFolder}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm text-gray-300 transition-colors">
          <FolderOpen size={15} />
          Load APKs from Folder
        </button>
        {folder && <p className="text-xs text-gray-500 truncate flex-1">{folder}</p>}
      </div>

      {/* APK grid */}
      {apks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{apks.length} APK{apks.length !== 1 ? 's' : ''} found</p>
            <div className="flex gap-2">
              <button onClick={selectAll}
                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300">
                Select All
              </button>
              <button onClick={installSelected} disabled={loading || selected.size === 0}
                className="flex items-center gap-1.5 text-xs px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-white transition-colors">
                Install Selected ({selected.size})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {apks.map((apk) => (
              <button
                key={apk.path}
                onClick={() => toggleSelect(apk.path)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selected.has(apk.path)
                    ? 'border-red-600 bg-red-950'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Package size={20} className="text-gray-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{apk.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <HardDrive size={10} />
                      {formatSize(apk.size)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {apks.length === 0 && folder && (
        <p className="text-sm text-gray-600">No APK files found in this folder.</p>
      )}

      <LogPanel logs={logs} onClear={() => setLogs([])} maxHeight="180px" />
    </div>
  );
}
