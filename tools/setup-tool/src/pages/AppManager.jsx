import { useState, useEffect, useCallback } from 'react';
import { Download, Smartphone, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import LogPanel from '../components/LogPanel';

const CATEGORY_COLORS = {
  Arcade:        'bg-orange-900 text-orange-300',
  Racing:        'bg-blue-900 text-blue-300',
  Simulation:    'bg-green-900 text-green-300',
  Online:        'bg-purple-900 text-purple-300',
  Strategy:      'bg-yellow-900 text-yellow-300',
  Puzzle:        'bg-pink-900 text-pink-300',
  Casual:        'bg-teal-900 text-teal-300',
  Music:         'bg-indigo-900 text-indigo-300',
  Action:        'bg-red-900 text-red-300',
  Social:        'bg-sky-900 text-sky-300',
  Entertainment: 'bg-violet-900 text-violet-300',
};

function AppIcon({ app }) {
  const [failed, setFailed] = useState(false);

  if (app.icon_url && !failed) {
    return (
      <img
        src={app.icon_url}
        alt=""
        className="w-10 h-10 rounded-xl object-cover border border-gray-700 shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-base font-bold text-white border border-gray-700 shrink-0">
      {app.name[0]}
    </div>
  );
}

function AppCard({ app, selected, status, progress, onToggle }) {
  const catCls = CATEGORY_COLORS[app.category] || 'bg-gray-800 text-gray-400';
  const isInstalled  = status === 'installed';
  const isDownloaded = status === 'downloaded';
  const isDownloading = status === 'downloading';

  return (
    <button
      onClick={() => !isDownloading && onToggle(app.package)}
      disabled={isDownloading}
      className={`text-left p-3 rounded-lg border transition-colors ${
        selected ? 'border-red-600 bg-red-950' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
      } ${isDownloading ? 'cursor-wait opacity-80' : ''}`}
    >
      <div className="flex items-start gap-3">
        <AppIcon app={app} />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate leading-tight">{app.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${catCls}`}>
              {app.category}
            </span>
            <span className="text-[10px] text-gray-500">{app.type}</span>
            {app.size_mb && <span className="text-[10px] text-gray-500">~{app.size_mb} MB</span>}
          </div>
        </div>

        <div className="shrink-0 mt-0.5">
          {isInstalled && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-400">
              <CheckCircle size={11} /> Installed
            </span>
          )}
          {isDownloaded && !isInstalled && (
            <span className="text-[10px] font-medium text-blue-400">Downloaded</span>
          )}
          {isDownloading && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-yellow-400">
              <Loader2 size={11} className="animate-spin" />
              {progress > 0 ? `${progress}%` : '…'}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function AppManager() {
  const [catalog,   setCatalog]   = useState([]);
  const [selected,  setSelected]  = useState(new Set());
  const [statuses,  setStatuses]  = useState({});   // package → 'installed'|'downloaded'|''
  const [progress,  setProgress]  = useState({});   // package → 0-100
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [loaded,    setLoaded]    = useState(false);

  const addLog = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${ts}] ${String(msg).trimEnd()}`]);
  }, []);

  // Listen for download progress and install log events
  useEffect(() => {
    window.pisotab.apps.onDownloadProgress(({ packageName, received, total }) => {
      const pct = total > 0 ? Math.round((received / total) * 100) : 0;
      setProgress(prev => ({ ...prev, [packageName]: pct }));
    });
    window.pisotab.apps.onInstallLog((msg) => addLog(msg));
    return () => {
      window.pisotab.apps.offDownloadProgress();
      window.pisotab.apps.offInstallLog();
    };
  }, [addLog]);

  async function refreshStatuses(apps) {
    const list = apps || catalog;
    if (list.length === 0) return;

    const [downloaded, installed] = await Promise.all([
      window.pisotab.apps.listDownloaded(),
      window.pisotab.apps.checkInstalled(),
    ]);

    const downloadedSet = new Set(downloaded.map(f => f.filename.replace(/\.(apk|xapk)$/i, '')));
    const installedSet  = new Set(installed);

    setStatuses(prev => {
      const next = { ...prev };
      for (const app of list) {
        if (next[app.package] === 'downloading') continue; // don't overwrite in-progress
        if (installedSet.has(app.package))   next[app.package] = 'installed';
        else if (downloadedSet.has(app.package)) next[app.package] = 'downloaded';
        else                                 next[app.package] = '';
      }
      return next;
    });
  }

  async function loadApps() {
    setLoading(true);
    addLog('Loading app catalog...');
    try {
      const apps = await window.pisotab.apps.loadCatalog();
      setCatalog(apps);
      setLoaded(true);
      addLog(`Loaded ${apps.length} apps from catalog.`);
      await refreshStatuses(apps);
      addLog('Status check complete.');
    } catch (err) {
      addLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(pkg) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(pkg) ? next.delete(pkg) : next.add(pkg);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(catalog.map(a => a.package)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // Download selected apps one by one (sequential to avoid bandwidth overload)
  async function downloadSelected() {
    const toDownload = catalog.filter(a =>
      selected.has(a.package) && statuses[a.package] !== 'downloaded' && statuses[a.package] !== 'installed'
    );
    if (toDownload.length === 0) { addLog('All selected apps are already downloaded or installed.'); return; }

    for (const app of toDownload) {
      setStatuses(prev => ({ ...prev, [app.package]: 'downloading' }));
      setProgress(prev => ({ ...prev, [app.package]: 0 }));
      addLog(`Downloading ${app.name} (${app.type})...`);

      const result = await window.pisotab.apps.downloadApk({ packageName: app.package, type: app.type });

      if (result.success) {
        addLog(result.cached ? `${app.name} already cached.` : `✓ ${app.name} downloaded.`);
        setStatuses(prev => ({ ...prev, [app.package]: 'downloaded' }));
      } else {
        addLog(`✗ ${app.name}: ${result.error}`);
        setStatuses(prev => ({ ...prev, [app.package]: '' }));
      }
      setProgress(prev => ({ ...prev, [app.package]: 0 }));
    }
  }

  // Install selected downloaded/installed-eligible apps
  async function installSelected() {
    const toInstall = catalog.filter(a =>
      selected.has(a.package) &&
      (statuses[a.package] === 'downloaded' || statuses[a.package] === 'installed')
    );
    if (toInstall.length === 0) { addLog('No downloaded apps selected. Download first.'); return; }

    for (const app of toInstall) {
      addLog(`Installing ${app.name}...`);
      const result = await window.pisotab.apps.installApp({ packageName: app.package, type: app.type });
      if (result.success) {
        setStatuses(prev => ({ ...prev, [app.package]: 'installed' }));
      }
    }
    addLog('Install batch complete.');
  }

  const downloadCount = [...selected].filter(pkg => {
    const s = statuses[pkg];
    return s !== 'downloaded' && s !== 'installed' && s !== 'downloading';
  }).length;

  const installCount = [...selected].filter(pkg =>
    statuses[pkg] === 'downloaded' || statuses[pkg] === 'installed'
  ).length;

  const isDownloading = Object.values(statuses).some(s => s === 'downloading');

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">App Manager</h2>
        {loaded && (
          <button
            onClick={() => refreshStatuses()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 transition-colors"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh Status
          </button>
        )}
      </div>

      {/* Load button (shown before catalog is loaded) */}
      {!loaded && (
        <div className="flex flex-col items-start gap-2">
          <button
            onClick={loadApps}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded text-sm text-white font-medium transition-colors"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Download size={15} />
            }
            {loading ? 'Loading...' : 'Load Apps'}
          </button>
          <p className="text-xs text-gray-500">
            Fetches the app catalog from the server. Works on any PC.
          </p>
        </div>
      )}

      {/* App grid */}
      {loaded && catalog.length > 0 && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">{catalog.length} apps</span>
            <button onClick={selectAll}
              className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors">
              Select All
            </button>
            <button onClick={clearSelection}
              className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors">
              Clear
            </button>
            <div className="flex-1" />
            <button
              onClick={downloadSelected}
              disabled={isDownloading || downloadCount === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-white transition-colors font-medium"
            >
              <Download size={12} />
              Download ({downloadCount})
            </button>
            <button
              onClick={installSelected}
              disabled={isDownloading || installCount === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-white transition-colors font-medium"
            >
              <Smartphone size={12} />
              Install ({installCount})
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3">
            {catalog.map((app) => (
              <AppCard
                key={app.package}
                app={app}
                selected={selected.has(app.package)}
                status={statuses[app.package] || ''}
                progress={progress[app.package] || 0}
                onToggle={toggleSelect}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-gray-600 pt-1">
            <span className="flex items-center gap-1"><CheckCircle size={10} className="text-green-600" /> Installed on tablet</span>
            <span className="text-blue-600">Blue = Downloaded on PC</span>
            <span className="text-gray-500">Download once → Install to many tablets</span>
          </div>
        </div>
      )}

      {loaded && catalog.length === 0 && (
        <p className="text-sm text-gray-500">No apps in catalog. Add entries to apps-catalog.json on the server.</p>
      )}

      <LogPanel logs={logs} onClear={() => setLogs([])} maxHeight="180px" />
    </div>
  );
}
