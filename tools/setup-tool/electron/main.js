const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn, exec } = require('child_process');
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

  // FIX: Use .NET ZipFile (works on .xapk extension — PowerShell Expand-Archive rejects non-.zip)
  // Uses single-quoted PS strings so backslashes in Windows paths are NOT doubled.
  // Writes a temp .ps1 to avoid any inline-command escaping issues.
  async function extractZip(zipPath, destDir) {
    const ps1 = path.join(getAppsDownloadsDir(), `extract_${Date.now()}.ps1`);
    const script = [
      'Add-Type -Assembly System.IO.Compression.FileSystem',
      // Single-quoted PS strings: no variable substitution, no backslash escaping
      `[System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}', '${destDir}')`,
    ].join('\r\n');
    fs.writeFileSync(ps1, script, 'utf8');
    return new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`,
        { windowsHide: true, timeout: 180_000 },
        (err, _out, stderr) => {
          try { fs.unlinkSync(ps1); } catch (_) {}
          err ? reject(new Error(stderr.trim() || err.message)) : resolve();
        }
      );
    });
  }

  // FIX: Recursive APK finder — readdirSync only reads root; XAPKs often put APKs in subfolders.
  // Skips Android/ because that subtree only contains .obb expansion files, never .apk files.
  function findApkFiles(dir) {
    const results = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'Android') {
          results.push(...findApkFiles(full));
        } else if (!entry.isDirectory() && entry.name.endsWith('.apk')) {
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
    await extractZip(filePath, extractDir);

    // FIX: recursive search — handles XAPKs where APKs are inside subdirectories
    const apkFiles = findApkFiles(extractDir);
    if (!apkFiles.length) throw new Error('No APK found inside archive');

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

  // App icon cache — persisted to disk so icons survive restarts
  const iconCachePath = path.join(app.getPath('userData'), 'app-icons-cache.json');
  let iconCache = {};
  try { iconCache = JSON.parse(fs.readFileSync(iconCachePath, 'utf8')); } catch (_) {}

  // FIX: simple fetch() is blocked by Google's bot detection.
  // Use a hidden BrowserWindow instead — real Chromium renders the page fully,
  // then executeJavaScript extracts the icon URL from the live DOM.
  function fetchIconViaPlayStore(packageName) {
    return new Promise((resolve) => {
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

      // 12-second timeout — Play Store loads fast but some regions are slower
      const timer = setTimeout(() => finish(null), 12_000);

      win.webContents.on('did-finish-load', async () => {
        clearTimeout(timer);
        try {
          const url = await win.webContents.executeJavaScript(`
            (function() {
              const og = document.querySelector('meta[property="og:image"]');
              if (og) return og.getAttribute('content');
              const tw = document.querySelector('meta[name="twitter:image"]');
              if (tw) return tw.getAttribute('content');
              // Fallback: first googleusercontent image on the page (the app icon)
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
  }

  // Background icon fetcher: runs AFTER catalog is returned so it never delays loading.
  // Sends apps:icon-update events to renderer as each icon is found.
  async function fetchIconsInBackground(packages) {
    for (const pkg of packages) {
      if (iconCache[pkg]) continue; // already cached between start and now
      const url = await fetchIconViaPlayStore(pkg);
      if (url) {
        iconCache[pkg] = url;
        try { fs.writeFileSync(iconCachePath, JSON.stringify(iconCache)); } catch (_) {}
        mainWindow?.webContents?.send('apps:icon-update', { package: pkg, icon_url: url });
      }
    }
  }

  let activeDownloadPkg = null;

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
    if (activeDownloadPkg) return { success: false, error: `Already downloading ${activeDownloadPkg}` };

    const savePath = localApkPath(packageName, type);
    if (fs.existsSync(savePath)) return { success: true, path: savePath, cached: true };

    activeDownloadPkg = packageName;
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
          item.on('updated', () => {
            mainWindow?.webContents?.send('apps:download-progress', {
              packageName,
              received: item.getReceivedBytes(),
              total: item.getTotalBytes(),
            });
          });
          item.once('done', (_e, state) => {
            cleanup();
            if (state === 'completed') {
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
      activeDownloadPkg = null;
    }
  });

  ipcMain.handle('apps:install-app', async (_, { packageName, type }) => {
    const send = (msg) => mainWindow?.webContents?.send('apps:install-log', msg);
    const filePath = localApkPath(packageName, type);

    if (!fs.existsSync(filePath)) return { success: false, error: 'File not downloaded' };
    send(`Installing ${path.basename(filePath)}...\n`);

    try {
      // XAPK: always extract first
      if (type.toUpperCase() === 'XAPK') {
        return await installAsXapk(filePath, packageName, send);
      }

      // APK: try direct install
      const out = await runAdbRaw(['install', '-r', filePath]);
      if (out.includes('Success')) { send('✓ Installed successfully\n'); return { success: true }; }

      // APKPure sometimes serves multi-split XAPK even when APK is requested.
      // Detect by: parse failure (XAPK served as .apk), or missing splits (base.apk without configs).
      const needsXapkExtract =
        out.includes('INSTALL_PARSE_FAILED') ||
        out.includes('INSTALL_FAILED_UNEXPECTED_EXCEPTION') ||
        out.includes('INSTALL_FAILED_MISSING_SPLIT') ||
        out.includes('AndroidManifest.xml');
      if (needsXapkExtract) {
        send('Direct install failed — attempting XAPK extraction...\n');
        return await installAsXapk(filePath, packageName, send);
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
