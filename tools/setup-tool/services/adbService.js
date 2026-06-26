const { spawn } = require('child_process');
const path = require('path');

function setupAdbHandlers(ipcMain, mainWindow, getAssetPath) {
  const send = (ch, msg) => mainWindow?.webContents?.send(ch, msg);

  function adbExe() {
    return getAssetPath('adb', 'adb.exe');
  }

  function runAdb(args, logChannel = 'adb:log') {
    return new Promise((resolve, reject) => {
      const proc = spawn(adbExe(), args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => {
        const text = d.toString();
        stdout += text;
        send(logChannel, text);
      });
      proc.stderr.on('data', (d) => {
        const text = d.toString();
        stderr += text;
        // adb prints some info to stderr — forward it as a log
        send(logChannel, text);
      });
      proc.on('close', (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(stderr.trim() || stdout.trim() || `adb exited with code ${code}`));
      });
      proc.on('error', (err) => {
        if (err.code === 'ENOENT') {
          reject(new Error('adb.exe not found. Copy adb.exe into assets/adb/ first.'));
        } else {
          reject(err);
        }
      });
    });
  }

  ipcMain.handle('adb:detect', async () => {
    try {
      const out = await runAdb(['devices', '-l']);
      const lines = out.trim().split('\n').slice(1).filter(l => l.includes('\tdevice'));
      if (lines.length === 0) return { connected: false };
      const line = lines[0];
      const serial  = line.split(/\s+/)[0];
      const model   = (line.match(/model:(\S+)/) || [])[1]?.replace(/_/g, ' ') || 'Unknown';
      const product = (line.match(/product:(\S+)/) || [])[1] || '';
      return { connected: true, serial, model, product };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  });

  ipcMain.handle('adb:install', async (_, apkPath) => {
    send('adb:log', `Installing ${path.basename(apkPath)}...\n`);
    try {
      const out = await runAdb(['install', '-r', apkPath]);
      return { success: out.includes('Success') };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('adb:set-owner', async () => {
    try {
      const out = await runAdb([
        'shell', 'dpm', 'set-device-owner',
        'com.pisotab.app/.receiver.DeviceAdminReceiver',
      ]);
      return { success: out.toLowerCase().includes('success') };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('adb:check-owner', async () => {
    try {
      const out = await runAdb(['shell', 'dpm', 'list-owners']);
      return { isOwner: out.includes('com.pisotab.app') };
    } catch {
      return { isOwner: false };
    }
  });

  ipcMain.handle('adb:get-version', async () => {
    try {
      const out = await runAdb([
        'shell', 'dumpsys', 'package', 'com.pisotab.app', '|', 'grep', 'versionName',
      ]);
      const match = out.match(/versionName=(.+)/);
      return { version: match?.[1]?.trim() || null };
    } catch {
      return { version: null };
    }
  });

  ipcMain.handle('adb:push-config', async (_, config) => {
    const args = [
      'shell', 'am', 'broadcast',
      '-a', 'com.pisotab.app.TOOL_CONFIG',
      '--es', 'server_url',  config.serverUrl  || '',
      '--es', 'device_id',   config.deviceId   || '',
      '--es', 'device_name', config.deviceName || '',
      '--es', 'admin_pin',   config.adminPin   || '',
    ];
    try {
      const out = await runAdb(args);
      return { success: out.includes('Broadcast completed') };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('adb:auto-boot', async () => {
    try {
      // Stay on while plugged in to USB, AC, or wireless charger (bitmask: 1|2|4 = 7)
      await runAdb(['shell', 'settings', 'put', 'global', 'stay_on_while_plugged_in', '7']);
      send('adb:log', 'Auto boot on charge: enabled\n');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('adb:factory-reset', async () => {
    try {
      await runAdb(['shell', 'am', 'broadcast', '-a', 'android.intent.action.MASTER_CLEAR']);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { setupAdbHandlers };
