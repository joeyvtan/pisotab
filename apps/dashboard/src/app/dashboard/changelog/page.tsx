'use client';
import { useEffect, useState } from 'react';
import { api, DownloadFile } from '@/lib/api';
import { format, fromUnixTime } from 'date-fns';

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function ChangelogPage() {
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDownloads()
      .then(data => setFiles(data.all))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const apkVersions      = files.filter(f => f.type === 'apk');
  const firmwareVersions = files.filter(f => f.type === 'firmware');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Changelog</h1>
        <p className="text-slate-400 text-sm mt-1">Version history for the Android app and ESP32 firmware.</p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <>
          {/* Android APK */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Android App</h2>
            {apkVersions.length === 0 ? (
              <div className="card text-slate-400 text-sm">No APK versions uploaded yet.</div>
            ) : (
              <div className="space-y-3">
                {apkVersions.map((f, idx) => (
                  <div key={f.id} className="card space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold font-mono">v{f.version}</span>
                        {idx === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">Latest</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs">{formatBytes(f.size)}</span>
                        <span className="text-slate-500 text-xs">
                          {format(fromUnixTime(f.uploaded_at), 'MMM d, yyyy')}
                        </span>
                        <a href={f.download_url} download
                          className="text-xs px-2 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors">
                          Download
                        </a>
                      </div>
                    </div>
                    {f.changelog ? (
                      <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-800 rounded p-3 border border-slate-700">
                        {f.changelog}
                      </div>
                    ) : (
                      <p className="text-slate-600 text-xs italic">No changelog provided.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ESP32 Firmware */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">ESP32 Firmware</h2>
            {firmwareVersions.length === 0 ? (
              <div className="card text-slate-400 text-sm">No firmware versions uploaded yet.</div>
            ) : (
              <div className="space-y-3">
                {firmwareVersions.map((f, idx) => (
                  <div key={f.id} className="card space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold font-mono">v{f.version}</span>
                        {idx === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">Latest</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{formatBytes(f.size)}</span>
                        <span className="text-slate-500 text-xs">
                          {format(fromUnixTime(f.uploaded_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    {f.changelog ? (
                      <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-800 rounded p-3 border border-slate-700">
                        {f.changelog}
                      </div>
                    ) : (
                      <p className="text-slate-600 text-xs italic">No changelog provided.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
