const { spawn } = require('child_process');

let activeProcess = null;

function setupEspHandlers(ipcMain, mainWindow, getAssetPath) {
  const send = (ch, msg) => mainWindow?.webContents?.send(ch, msg);

  function espExe() {
    return getAssetPath('esptool', 'esptool.exe');
  }

  ipcMain.handle('esp:flash', async (_, opts) => {
    const {
      chip = 'auto',
      port,
      baud = 460800,
      flashMode = 'dio',
      flashFreq = '40m',
      firmwarePath,
    } = opts;

    if (!port)         return { success: false, error: 'No COM port selected' };
    if (!firmwarePath) return { success: false, error: 'No firmware file selected' };

    const args = [
      '--chip', chip,
      '--port', port,
      '--baud', String(baud),
      '--before', 'default_reset',
      '--after', 'hard_reset',
      'write_flash',
      '--flash_mode', flashMode,
      '--flash_freq', flashFreq,
      '--flash_size', 'detect',
      '0x0', firmwarePath,
    ];

    return new Promise((resolve) => {
      try {
        activeProcess = spawn(espExe(), args, { windowsHide: true });
      } catch (err) {
        resolve({ success: false, error: err.message });
        return;
      }

      activeProcess.stdout.on('data', (d) => {
        const text = d.toString();
        send('esp:log', text);
        // Parse "Writing at 0x... (N%)" progress
        const match = text.match(/\((\d+)%\)/);
        if (match) send('esp:progress', parseInt(match[1], 10));
      });

      activeProcess.stderr.on('data', (d) => {
        send('esp:log', d.toString());
      });

      activeProcess.on('close', (code) => {
        activeProcess = null;
        const ok = code === 0;
        send('esp:progress', ok ? 100 : 0);
        send('esp:done', ok);
        resolve({ success: ok, exitCode: code });
      });

      activeProcess.on('error', (err) => {
        activeProcess = null;
        const msg = err.code === 'ENOENT'
          ? 'esptool.exe not found. Copy esptool.exe into assets/esptool/ first.'
          : err.message;
        send('esp:log', `ERROR: ${msg}\n`);
        send('esp:done', false);
        resolve({ success: false, error: msg });
      });
    });
  });

  ipcMain.handle('esp:detect', async (_, port) => {
    if (!port) return { chip: null, error: 'No port specified' };
    return new Promise((resolve) => {
      let output = '';
      const proc = spawn(espExe(), ['--port', port, 'chip_id'], { windowsHide: true });
      proc.stdout.on('data', (d) => { output += d.toString(); send('esp:log', d.toString()); });
      proc.stderr.on('data', (d) => { output += d.toString(); send('esp:log', d.toString()); });
      proc.on('close', () => {
        const chipMatch = output.match(/Chip is (.+)/i);
        resolve({ chip: chipMatch?.[1]?.trim() || null, raw: output });
      });
      proc.on('error', (err) => {
        resolve({ chip: null, error: err.code === 'ENOENT' ? 'esptool.exe not found' : err.message });
      });
    });
  });

  ipcMain.handle('esp:erase', async (_, port) => {
    if (!port) return { success: false, error: 'No port specified' };
    return new Promise((resolve) => {
      activeProcess = spawn(espExe(), ['--chip', 'auto', '--port', port, 'erase_flash'], { windowsHide: true });
      activeProcess.stdout.on('data', (d) => send('esp:log', d.toString()));
      activeProcess.stderr.on('data', (d) => send('esp:log', d.toString()));
      activeProcess.on('close', (code) => {
        activeProcess = null;
        resolve({ success: code === 0 });
      });
      activeProcess.on('error', (err) => {
        activeProcess = null;
        resolve({ success: false, error: err.message });
      });
    });
  });

  ipcMain.handle('esp:stop', () => {
    if (activeProcess) {
      activeProcess.kill('SIGTERM');
      activeProcess = null;
    }
    return { stopped: true };
  });
}

module.exports = { setupEspHandlers };
