const { SerialPort } = require('serialport');

let openPort = null;

function setupSerialHandlers(ipcMain, mainWindow) {
  const send = (ch, msg) => mainWindow?.webContents?.send(ch, msg);

  ipcMain.handle('serial:list', async () => {
    try {
      const ports = await SerialPort.list();
      return ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer || '',
        description: p.friendlyName || p.pnpId || p.path,
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('serial:open', async (_, portPath, baud) => {
    if (openPort?.isOpen) {
      openPort.close();
      openPort = null;
    }
    try {
      openPort = new SerialPort({ path: portPath, baudRate: baud || 115200 });
      openPort.on('data', (data) => send('serial:data', data.toString()));
      openPort.on('error', (err) => send('serial:data', `[Error: ${err.message}]\n`));
      return { opened: true };
    } catch (err) {
      return { opened: false, error: err.message };
    }
  });

  ipcMain.handle('serial:close', async () => {
    if (openPort?.isOpen) openPort.close();
    openPort = null;
    return { closed: true };
  });
}

module.exports = { setupSerialHandlers };
