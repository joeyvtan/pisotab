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
      // Split on \r\n or \n (Windows ADB uses CRLF), skip the header line
      const lines = out.split(/\r?\n/).slice(1).filter(l => l.trim() !== '');

      // Match lines where the state column is exactly "device" (authorized + connected).
      // adb devices -l uses SPACES (not tabs) for column alignment in long format,
      // so we use \s+ to match one or more of either. The word boundary prevents
      // matching "device:itel-P11002L" (a property key on the same line).
      const deviceLines = lines.filter(l => /^\S+\s+device(\s|$)/.test(l));

      if (deviceLines.length === 0) {
        const unauthorized = lines.some(l => /^\S+\s+unauthorized(\s|$)/.test(l));
        return { connected: false, unauthorized };
      }

      const line    = deviceLines[0];
      const serial  = line.trim().split(/\s+/)[0];
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
      // Check first — calling set-device-owner when already set throws a Java exception
      // and adb shell still exits 0, so we must detect it ourselves before attempting.
      const checkOut = await runAdb(['shell', 'dpm', 'list-owners']);
      if (checkOut.includes('com.pisotab.app')) {
        send('adb:log', 'Device Owner already set to com.pisotab.app\n');
        return { success: true, alreadySet: true };
      }

      const out = await runAdb([
        'shell', 'dpm', 'set-device-owner',
        'com.pisotab.app/.receiver.DeviceAdminReceiver',
      ]);
      const succeeded = out.toLowerCase().includes('success');
      if (!succeeded) {
        // Extract the meaningful error line from the output (skip the Java stack trace)
        const firstLine = out.split(/\r?\n/).find(l => l.trim() && !l.startsWith('\t') && !l.startsWith('at '));
        return { success: false, error: firstLine?.trim() || 'Set Device Owner failed' };
      }
      return { success: true };
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
      // Get full dumpsys output and parse in Node — pipe operators don't work in spawn
      const out = await runAdb(['shell', 'dumpsys', 'package', 'com.pisotab.app']);
      const match = out.match(/versionName=([^\r\n\s]+)/);
      return { version: match?.[1]?.trim() || null };
    } catch {
      return { version: null };
    }
  });

  ipcMain.handle('adb:check-receiver', async () => {
    try {
      // Parse pm dump in Node — pipe/grep operators can't be passed as spawn args
      const out = await runAdb(['shell', 'pm', 'dump', 'com.pisotab.app']);
      const hasReceiver = out.includes('ToolConfigReceiver');
      return { present: hasReceiver };
    } catch (err) {
      return { present: false, error: err.message };
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
      if (!out.includes('Broadcast completed')) {
        return { success: false, error: 'Broadcast not completed' };
      }

      // ToolConfigReceiver (triggered by the broadcast above) starts SyncService internally
      // using the same-package context — identical to the BootReceiver pattern.
      // Additionally, launch MainActivity so the kiosk app is visible and running.
      // SyncService.android:exported=false so it cannot be started from ADB shell directly;
      // MainActivity is exported=true and starts SyncService in its onCreate().
      try {
        await runAdb(['shell', 'am', 'start',
          '-n', 'com.pisotab.app/.ui.MainActivity']);
        send('adb:log', 'Kiosk app launched — SyncService will start and send first heartbeat\n');
      } catch (_) {
        send('adb:log', 'Note: could not launch MainActivity (app may already be in foreground)\n');
      }

      return { success: true };
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
