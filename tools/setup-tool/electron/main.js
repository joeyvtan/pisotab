const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const { setupAdbHandlers } = require('../services/adbService');
const { setupEspHandlers } = require('../services/espService');
const { setupSerialHandlers } = require('../services/serialService');
const { setupApiHandlers } = require('../services/apiClient');

const isDev = !app.isPackaged;

let mainWindow;

function getAssetPath(...parts) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', ...parts);
  }
  return path.join(__dirname, '..', 'assets', ...parts);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#030712',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'JJTPisoTab Setup Tool',
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // uncomment to debug renderer
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Pass getAssetPath helper to services so they resolve binary paths consistently
  setupAdbHandlers(ipcMain, mainWindow, getAssetPath);
  setupEspHandlers(ipcMain, mainWindow, getAssetPath);
  setupSerialHandlers(ipcMain, mainWindow);
  setupApiHandlers(ipcMain, mainWindow);

  // File-system IPC handlers (need dialog — so kept in main.js)
  ipcMain.handle('fs:select-file', async (_, filters) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('fs:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('fs:list-apks', (_, folder) => {
    if (!folder || !fs.existsSync(folder)) return [];
    return fs.readdirSync(folder)
      .filter(f => f.endsWith('.apk'))
      .map(f => ({
        name: f,
        path: path.join(folder, f),
        size: fs.statSync(path.join(folder, f)).size,
      }));
  });

  ipcMain.handle('fs:firmware-path', (_, chip) => {
    const filename = chip === 'esp8266'
      ? 'pisotab_coin_esp8266.bin'
      : 'pisotab_coin_esp32.bin';
    return getAssetPath('firmware', filename);
  });

  ipcMain.handle('fs:apk-path', () => {
    return getAssetPath('apk', 'pisotab.apk');
  });

  // ─── Apps catalog / download / install handlers ─────────────────────────────
  const Store = require('electron-store');
  const store = new Store({ name: 'pisotab-setup-tool' });

  function getAppsDownloadsDir() {
    const dir = path.join(app.getPath('userData'), 'app-downloads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // Rejects on non-zero exit (used for ADB commands that must succeed)
  function runAdbSilent(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(getAssetPath('adb', 'adb.exe'), args, { windowsHide: true });
      let out = '', err = '';
      proc.stdout.on('data', d => { out += d; });
      proc.stderr.on('data', d => { err += d; });
      proc.on('close', code => code === 0 ? resolve(out) : reject(new Error(err || out)));
      proc.on('error', e => reject(e));
    });
  }

  // Always resolves — used for adb install where we need to inspect failure text
  function runAdbRaw(args) {
    return new Promise((resolve) => {
      const proc = spawn(getAssetPath('adb', 'adb.exe'), args, { windowsHide: true });
      let out = '';
      proc.stdout.on('data', d => { out += d; });
      proc.stderr.on('data', d => { out += d; });
      proc.on('close', () => resolve(out));
      proc.on('error', e => resolve(`ERROR: ${e.message}`));
    });
  }

  function localApkPath(packageName, type) {
    return path.join(getAppsDownloadsDir(), `${packageName}.${type.toLowerCase()}`);
  }

  // Uses bundled 7za.exe for extraction — handles any ZIP variant, any extension, any structure.
  // ZipFile.ExtractToDirectory (old approach) silently failed on DEFLATE64 and some XAPK formats.
  function get7zaPath() {
    return getAssetPath('tools', '7za.exe');
  }

  async function extractZip(zipPath, destDir) {
    return new Promise((resolve, reject) => {
      // -x = extract with full paths, -y = yes to all, -aoa = overwrite all
      const proc = spawn(get7zaPath(), ['x', zipPath, `-o${destDir}`, '-y', '-aoa'], { windowsHide: true });
      let out = '';
      proc.stdout.on('data', d => { out += d; });
      proc.stderr.on('data', d => { out += d; });
      proc.on('close', code => {
        // 7za: 0=OK, 1=Warning (non-fatal), 2+=error
        if (code === 0 || code === 1) resolve();
        else reject(new Error(`Extraction failed (code ${code}): ${out.slice(-300).trim()}`));
      });
      proc.on('error', e => reject(e));
    });
  }

  // Returns true if the archive (ZIP/XAPK/APK) contains any .apk entries inside.
  // Used to distinguish a real XAPK-as-APK from a plain APK that failed install for other reasons.
  async function archiveContainsApk(filePath) {
    return new Promise((resolve) => {
      const proc = spawn(get7zaPath(), ['l', '-slt', filePath], { windowsHide: true });
      let out = '';
      proc.stdout.on('data', d => { out += d; });
      proc.on('close', () => resolve(/Path = .+\.apk/i.test(out)));
      proc.on('error', () => resolve(false));
    });
  }

  // Extracts icon.png/icon.webp from a downloaded APK or XAPK archive.
  // APKPure XAPKs always include icon.png at archive root.
  // Returns a base64 data URL, or null if not found.
  async function extractIconFromArchive(filePath, packageName) {
    const iconDir = path.join(app.getPath('userData'), 'app-icons');
    if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });

    const cached = path.join(iconDir, `${packageName}.png`);
    if (fs.existsSync(cached)) {
      try { return `data:image/png;base64,${fs.readFileSync(cached).toString('base64')}`; } catch (_) {}
    }

    const tmpDir = path.join(iconDir, `_tmp_${packageName}`);
    return new Promise((resolve) => {
      const proc = spawn(get7zaPath(), ['e', filePath, 'icon.png', 'icon.webp', `-o${tmpDir}`, '-y', '-aoa'], { windowsHide: true });
      proc.on('close', () => {
        try {
          for (const name of ['icon.png', 'icon.webp']) {
            const src = path.join(tmpDir, name);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, cached);
              try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
              const mime = name.endsWith('.webp') ? 'image/webp' : 'image/png';
              resolve(`data:${mime};base64,${fs.readFileSync(cached).toString('base64')}`);
              return;
            }
          }
        } catch (_) {}
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        resolve(null);
      });
      proc.on('error', () => resolve(null));
    });
  }

  // Recursive APK finder — searches the entire extracted directory tree.
  // OBB files use the .obb extension, so filtering by .apk is sufficient;
  // skipping Android/ was too aggressive and broke XAPKs that place APKs there.
  function findApkFiles(dir) {
    const results = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...findApkFiles(full));
        } else if (entry.name.toLowerCase().endsWith('.apk')) {
          results.push(full);
        }
      }
    } catch (_) {}
    return results;
  }

  // Extracts XAPK, pushes OBBs, installs APK(s)
  async function installAsXapk(filePath, packageName, send) {
    const extractDir = path.join(getAppsDownloadsDir(), `${packageName}_ext`);
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });

    send('Extracting archive...\n');
    try {
      await extractZip(filePath, extractDir);
    } catch (err) {
      // Corrupted archive (partial download, disk error). Delete it so the UI
      // shows the correct "Available" status and the user can re-download cleanly.
      try { fs.unlinkSync(filePath); } catch (_) {}
      try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (_) {}
      throw new Error(`${err.message}\n⚠ Corrupted file deleted — please re-download.`);
    }

    // FIX: recursive search — handles XAPKs where APKs are inside subdirectories
    const apkFiles = findApkFiles(extractDir);
    if (!apkFiles.length) {
      // Log extracted contents for diagnosis.
      const found = [];
      function listExtracted(d, depth) {
        if (depth > 3 || found.length >= 20) return;
        try {
          for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            found.push(path.relative(extractDir, path.join(d, e.name)) + (e.isDirectory() ? '/' : ''));
            if (e.isDirectory()) listExtracted(path.join(d, e.name), depth + 1);
          }
        } catch (_) {}
      }
      listExtracted(extractDir, 0);
      send(`Archive contents: ${found.length ? found.slice(0, 20).join(', ') : '(empty)'}\n`);

      // APKPure sometimes serves a plain APK through the XAPK download URL.
      // A plain APK extracted as a ZIP always has AndroidManifest.xml at its root.
      const isPlainApk = fs.existsSync(path.join(extractDir, 'AndroidManifest.xml'));
      try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (_) {}

      if (isPlainApk) {
        // Rename .xapk → .apk so ADB accepts it, then install directly.
        // The renamed file is kept on disk so future installs skip re-download.
        const apkPath = filePath.replace(/\.xapk$/i, '.apk');
        fs.renameSync(filePath, apkPath);
        send('Plain APK detected — installing directly...\n');
        const out = await runAdbRaw(['install', '-r', apkPath]);
        if (out.includes('Success')) { send('✓ Installed successfully\n'); return { success: true }; }
        send(`✗ ${out.trim()}\n`);
        return { success: false, error: out.trim() };
      }

      // Truly no APK content — corrupted or unsupported format. Delete so user can re-download cleanly.
      try { fs.unlinkSync(filePath); } catch (_) {}
      throw new Error('No APK found inside archive — file deleted. Please re-download.');
    }

    // Push OBB expansion files if present
    const obbDir = path.join(extractDir, 'Android', 'obb', packageName);
    if (fs.existsSync(obbDir)) {
      for (const obbFile of fs.readdirSync(obbDir)) {
        send(`Pushing OBB: ${obbFile}...\n`);
        await runAdbSilent(['push', path.join(obbDir, obbFile), `/sdcard/Android/obb/${packageName}/${obbFile}`]);
      }
    }

    // FIX: split APK apps (e.g. Clash of Clans) ship base.apk + config.*.apk splits.
    // Installing only base.apk → INSTALL_FAILED_MISSING_SPLIT.
    // Use adb install-multiple to install all splits as one atomic operation.
    let installArgs;
    if (apkFiles.length > 1) {
      send(`Installing ${apkFiles.length} split APKs...\n`);
      installArgs = ['install-multiple', '-r', ...apkFiles];
    } else {
      send(`Installing ${path.basename(apkFiles[0])}...\n`);
      installArgs = ['install', '-r', apkFiles[0]];
    }

    const out = await runAdbRaw(installArgs);
    if (out.includes('Success')) { send('✓ Installed successfully\n'); return { success: true }; }
    send(`✗ ${out.trim()}\n`);
    return { success: false, error: out.trim() };
  }

  // App icon cache — persisted to disk so icons survive restarts.
  // On startup: discard any cached HTTP URLs. Google's CDN rejects requests from Electron's renderer
  // (wrong Referer). Only data: URLs are kept — they always work regardless of network.
  const iconCachePath = path.join(app.getPath('userData'), 'app-icons-cache.json');
  let iconCache = {};
  try {
    const loaded = JSON.parse(fs.readFileSync(iconCachePath, 'utf8'));
    for (const [pkg, url] of Object.entries(loaded)) {
      if (url && url.startsWith('data:')) iconCache[pkg] = url;
    }
  } catch (_) {}

  // Downloads an image URL in the main process and returns a base64 data URL.
  // Must run in main process — no CORS/Referer restrictions here vs. the renderer.
  // Returns null for non-image responses (HTML error pages, 404s, etc.) so they
  // are never written to the icon cache.
  function fetchImageAsDataUrl(imageUrl) {
    if (!imageUrl) return Promise.resolve(null);
    return new Promise((resolve) => {
      const https = require('https');
      const http = require('http');
      const transport = imageUrl.startsWith('https') ? https : http;
      try {
        const req = transport.get(imageUrl, {
          timeout: 10_000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        }, (res) => {
          const mime = (res.headers['content-type'] || '').split(';')[0].trim();
          // Reject non-image responses — APKPure/Google CDN sometimes serves HTML error pages
          if (!mime.startsWith('image/')) { res.resume(); resolve(null); return; }
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => resolve(`data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`));
          res.on('error', () => resolve(null));
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { try { req.destroy(); } catch (_) {} resolve(null); });
      } catch { resolve(null); }
    });
  }

  // Fetches the app icon URL from Google Play via hidden BrowserWindow, then downloads
  // the image bytes in the main process and returns a base64 data URL.
  // Using data URL avoids Google CDN Referer restrictions in the Electron renderer.
  async function fetchIconViaPlayStore(packageName) {
    const iconUrl = await new Promise((resolve) => {
      let win = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true, sandbox: true },
      });

      let settled = false;
      const finish = (url) => {
        if (settled) return;
        settled = true;
        if (win && !win.isDestroyed()) win.destroy();
        win = null;
        resolve(url && url.startsWith('http') ? url : null);
      };

      const timer = setTimeout(() => finish(null), 20_000);

      win.webContents.on('did-finish-load', async () => {
        try {
          // Skip consent/redirect pages — only extract from the actual Play Store app page
          const currentUrl = win.webContents.getURL();
          if (!currentUrl.includes('play.google.com/store/apps/details')) return;
          clearTimeout(timer);
          const url = await win.webContents.executeJavaScript(`
            (function() {
              const og = document.querySelector('meta[property="og:image"]');
              if (og) return og.getAttribute('content');
              const tw = document.querySelector('meta[name="twitter:image"]');
              if (tw) return tw.getAttribute('content');
              const img = document.querySelector('img[src*="googleusercontent.com"]');
              return img ? img.src : null;
            })()
          `);
          finish(url);
        } catch { finish(null); }
      });

      win.webContents.on('did-fail-load', () => { clearTimeout(timer); finish(null); });
      win.loadURL(`https://play.google.com/store/apps/details?id=${packageName}&hl=en`);
    });

    // Download the image in main process and return as data URL (works in renderer with no CORS)
    return fetchImageAsDataUrl(iconUrl);
  }

  // Background icon fetcher: runs AFTER catalog is returned so it never delays loading.
  // Sends apps:icon-update events to renderer as each icon is found.
  // Strategy (in order):
  //   1. Local archive extraction — offline, instant, most reliable for downloaded files
  //   2. APKPure CDN icon URL — fast HTTP request, no browser scraping needed
  //   3. Google Play scraping — slowest fallback; fails on GDPR consent pages
  async function fetchIconsInBackground(packages) {
    const downloadsDir = getAppsDownloadsDir();
    for (const pkg of packages) {
      if (iconCache[pkg]) continue;

      let url = null;

      // 1. Local archive extraction (works offline, no internet required)
      for (const ext of ['xapk', 'apk']) {
        const filePath = path.join(downloadsDir, `${pkg}.${ext}`);
        if (fs.existsSync(filePath)) {
          url = await extractIconFromArchive(filePath, pkg);
          if (url) break;
        }
      }

      // 2. APKPure CDN — direct image fetch, no scraping, no consent page issue
      if (!url) url = await fetchImageAsDataUrl(`https://image.apkpure.net/apk/${pkg}/icon`);

      // 3. Google Play scraping — fallback only; may fail behind GDPR consent pages
      if (!url) url = await fetchIconViaPlayStore(pkg);

      if (url) {
        iconCache[pkg] = url;
        try { fs.writeFileSync(iconCachePath, JSON.stringify(iconCache)); } catch (_) {}
        mainWindow?.webContents?.send('apps:icon-update', { package: pkg, icon_url: url });
      }
    }
  }

  // Per-package download lock — allows concurrent downloads of different packages
  // while preventing duplicate downloads of the same package.
  const activeDownloadPkgs = new Set();

  ipcMain.handle('apps:load-catalog', async () => {
    // Load catalog from server (admin-controlled) or fall back to bundled copy
    let apps = [];
    try {
      const serverUrl = store.get('serverUrl', 'http://localhost:4000');
      const resp = await fetch(`${serverUrl}/api/apps-catalog`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) apps = await resp.json();
    } catch (_) {}
    if (!apps.length) {
      try { apps = JSON.parse(fs.readFileSync(getAssetPath('apps-catalog.json'), 'utf8')); } catch (_) {}
    }

    // Return catalog immediately with whatever is already cached (fast path).
    // Missing icons are fetched in the background and pushed via apps:icon-update events.
    const missing = apps.filter(a => !iconCache[a.package]).map(a => a.package);
    if (missing.length > 0) fetchIconsInBackground(missing); // fire-and-forget

    return apps.map(a => ({ ...a, icon_url: iconCache[a.package] || null }));
  });

  ipcMain.handle('apps:list-downloaded', () => {
    const dir = getAppsDownloadsDir();
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.apk') || f.endsWith('.xapk'))
      .map(f => ({ filename: f, path: path.join(dir, f), size: fs.statSync(path.join(dir, f)).size }));
  });

  ipcMain.handle('apps:check-installed', async () => {
    try {
      const out = await runAdbSilent(['shell', 'pm', 'list', 'packages']);
      return out.split(/\r?\n/).map(l => l.replace(/^package:/, '').trim()).filter(Boolean);
    } catch {
      return [];
    }
  });

  ipcMain.handle('apps:download-apk', async (_, { packageName, type }) => {
    if (activeDownloadPkgs.has(packageName)) return { success: false, error: `Already downloading ${packageName}` };

    const savePath = localApkPath(packageName, type);
    if (fs.existsSync(savePath)) return { success: true, path: savePath, cached: true };

    // A previous install may have detected the XAPK was a plain APK and renamed it to .apk.
    if (type.toLowerCase() === 'xapk') {
      const renamedApkPath = path.join(getAppsDownloadsDir(), `${packageName}.apk`);
      if (fs.existsSync(renamedApkPath)) return { success: true, path: renamedApkPath, cached: true };
    }

    activeDownloadPkgs.add(packageName);
    const url = `https://d.apkpure.com/b/${type}/${packageName}?version=latest`;

    try {
      return await new Promise((resolve) => {
        const sess = mainWindow.webContents.session;

        const hiddenWin = new BrowserWindow({
          show: false,
          webPreferences: { contextIsolation: true, sandbox: true },
        });

        let settled = false;

        const cleanup = () => {
          sess.removeListener('will-download', onWillDownload);
          if (!hiddenWin.isDestroyed()) hiddenWin.destroy();
        };

        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve({ success: false, error: 'Download did not start within 60s. Check internet connection.' });
          }
        }, 60_000);

        function onWillDownload(_e, item) {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          item.setSavePath(savePath);
          const onUpdated = () => {
            try {
              mainWindow?.webContents?.send('apps:download-progress', {
                packageName,
                received: item.getReceivedBytes(),
                total: item.getTotalBytes(),
              });
            } catch (_) {}
          };
          item.on('updated', onUpdated);
          item.once('done', async (_e, state) => {
            item.removeListener('updated', onUpdated);
            cleanup();
            if (state === 'completed') {
              // Extract icon from the downloaded archive so it shows immediately
              if (!iconCache[packageName]) {
                const iconUrl = await extractIconFromArchive(savePath, packageName);
                if (iconUrl) {
                  iconCache[packageName] = iconUrl;
                  try { fs.writeFileSync(iconCachePath, JSON.stringify(iconCache)); } catch (_) {}
                  mainWindow?.webContents?.send('apps:icon-update', { package: packageName, icon_url: iconUrl });
                }
              }
              resolve({ success: true, path: savePath });
            } else {
              try { fs.unlinkSync(savePath); } catch (_) {}
              resolve({ success: false, error: `Download ${state}` });
            }
          });
        }

        sess.on('will-download', onWillDownload);
        hiddenWin.webContents.userAgent =
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
        hiddenWin.loadURL(url);
      });
    } finally {
      activeDownloadPkgs.delete(packageName);
    }
  });

  ipcMain.handle('apps:install-app', async (_, { packageName, type }) => {
    const send = (msg) => mainWindow?.webContents?.send('apps:install-log', msg);
    let filePath = localApkPath(packageName, type);

    if (!fs.existsSync(filePath)) {
      // Catalog type may have changed (e.g. APK→XAPK). Check for a stale wrong-type file.
      const altExt = type.toLowerCase() === 'xapk' ? 'apk' : 'xapk';
      const altPath = path.join(getAppsDownloadsDir(), `${packageName}.${altExt}`);
      if (fs.existsSync(altPath)) {
        if (type.toLowerCase() === 'xapk') {
          // .apk found for an XAPK-typed entry — was renamed from .xapk during a previous install
          // because APKPure served a plain APK through the XAPK URL. Install it directly.
          send(`Installing ${packageName}.apk (plain APK)...\n`);
          const out = await runAdbRaw(['install', '-r', altPath]);
          if (out.includes('Success')) { send('✓ Installed successfully\n'); return { success: true }; }
          send(`✗ ${out.trim()}\n`);
          return { success: false, error: out.trim() };
        }
        // APK type but XAPK found — stale file from a catalog type change. Delete it.
        send(`⚠ Stale XAPK file found. Deleting — please re-download as APK.\n`);
        try { fs.unlinkSync(altPath); } catch (_) {}
        return { success: false, error: `Old file deleted. Re-download as ${type} then try again.` };
      }
      return { success: false, error: 'File not downloaded' };
    }
    send(`Installing ${path.basename(filePath)}...\n`);

    try {
      // XAPK: always extract first
      if (type.toUpperCase() === 'XAPK') {
        return await installAsXapk(filePath, packageName, send);
      }

      // APK: try direct install
      const out = await runAdbRaw(['install', '-r', filePath]);
      if (out.includes('Success')) { send('✓ Installed successfully\n'); return { success: true }; }

      // APKPure sometimes serves a multi-split XAPK even when APK is requested.
      // Guard: before extracting, confirm the file actually contains inner .apk entries.
      // A real APK that fails install for unrelated reasons (compatibility, etc.) has no inner APKs
      // and must NOT be extracted — we'd find only classes.dex, res/, etc. inside.
      const mightBeXapk =
        out.includes('INSTALL_PARSE_FAILED') ||
        out.includes('INSTALL_FAILED_UNEXPECTED_EXCEPTION') ||
        out.includes('INSTALL_FAILED_MISSING_SPLIT') ||
        out.includes('AndroidManifest.xml');
      if (mightBeXapk) {
        const hasInnerApks = await archiveContainsApk(filePath);
        if (hasInnerApks) {
          send('Archive contains splits — extracting as XAPK...\n');
          return await installAsXapk(filePath, packageName, send);
        }
      }

      send(`✗ ${out.trim()}\n`);
      return { success: false, error: out.trim() };
    } catch (err) {
      send(`✗ ${err.message}\n`);
      return { success: false, error: err.message };
    }
  });
  // ────────────────────────────────────────────────────────────────────────────

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
