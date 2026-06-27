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

  function localApkPath(packageName, type) {
    return path.join(getAppsDownloadsDir(), `${packageName}.${type.toLowerCase()}`);
  }

  let activeDownloadPkg = null;

  ipcMain.handle('apps:load-catalog', async () => {
    try {
      const serverUrl = store.get('serverUrl', 'http://localhost:4000');
      const resp = await fetch(`${serverUrl}/api/apps-catalog`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) return await resp.json();
    } catch (_) {}
    try {
      return JSON.parse(fs.readFileSync(getAssetPath('apps-catalog.json'), 'utf8'));
    } catch (_) {}
    return [];
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
      let apkPath = filePath;

      if (type.toUpperCase() === 'XAPK') {
        const extractDir = path.join(getAppsDownloadsDir(), `${packageName}_ext`);
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });

        send('Extracting XAPK...\n');
        await new Promise((resolve, reject) => {
          exec(
            `powershell -NoProfile -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${extractDir}' -Force"`,
            { windowsHide: true },
            (err, _out, stderr) => err ? reject(new Error(stderr || err.message)) : resolve()
          );
        });

        const apkFiles = fs.readdirSync(extractDir).filter(f => f.endsWith('.apk'));
        if (apkFiles.length === 0) throw new Error('No APK found inside XAPK');
        apkPath = path.join(extractDir, apkFiles.find(f => f === `${packageName}.apk`) || apkFiles[0]);

        const obbDir = path.join(extractDir, 'Android', 'obb', packageName);
        if (fs.existsSync(obbDir)) {
          for (const obbFile of fs.readdirSync(obbDir)) {
            send(`Pushing OBB: ${obbFile}...\n`);
            await runAdbSilent(['push', path.join(obbDir, obbFile), `/sdcard/Android/obb/${packageName}/${obbFile}`]);
          }
        }
      }

      const out = await runAdbSilent(['install', '-r', apkPath]);
      if (out.includes('Success')) {
        send('✓ Installed successfully\n');
        return { success: true };
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
