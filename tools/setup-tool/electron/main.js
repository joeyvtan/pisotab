const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
