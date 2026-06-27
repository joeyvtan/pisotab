const Store = require('electron-store');
const store = new Store({ name: 'pisotab-setup-tool' });

function setupApiHandlers(ipcMain) {
  ipcMain.handle('api:login', async (_, serverUrl, email, password) => {
    const res = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Backend auth route reads req.body.username (not email)
      body: JSON.stringify({ username: email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Login failed (${res.status})`);
    }
    const data = await res.json();
    store.set('token', data.token);
    store.set('serverUrl', serverUrl);
    return { token: data.token, user: data.user };
  });

  ipcMain.handle('api:register-device', async (_, serverUrl, token, name) => {
    const res = await fetch(`${serverUrl}/api/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Register failed (${res.status})`);
    }
    return await res.json();
  });

  ipcMain.handle('api:device-status', async (_, serverUrl, token, deviceId) => {
    const res = await fetch(`${serverUrl}/api/devices/${deviceId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Status check failed (${res.status})`);
    return await res.json();
  });

  ipcMain.handle('api:get-settings', () => {
    return {
      serverUrl: store.get('serverUrl', 'https://api.jjtpisotab.com'),
      token:     store.get('token',     ''),
      lastPort:  store.get('lastPort',  ''),
      lastBaud:  store.get('lastBaud',  460800),
      email:     store.get('email',     ''),
    };
  });

  ipcMain.handle('api:save-settings', (_, s) => {
    if (s.serverUrl !== undefined) store.set('serverUrl', s.serverUrl);
    if (s.token     !== undefined) store.set('token',     s.token);
    if (s.lastPort  !== undefined) store.set('lastPort',  s.lastPort);
    if (s.lastBaud  !== undefined) store.set('lastBaud',  s.lastBaud);
    if (s.email     !== undefined) store.set('email',     s.email);
    return { saved: true };
  });
}

module.exports = { setupApiHandlers };
