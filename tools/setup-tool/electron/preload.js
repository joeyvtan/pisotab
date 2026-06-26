const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, typed API to the renderer (React) process.
// The renderer has NO direct access to Node.js or Electron APIs —
// all privileged operations go through this bridge.
contextBridge.exposeInMainWorld('pisotab', {

  adb: {
    detectDevice:    ()       => ipcRenderer.invoke('adb:detect'),
    installApk:      (path)   => ipcRenderer.invoke('adb:install', path),
    setDeviceOwner:  ()       => ipcRenderer.invoke('adb:set-owner'),
    checkDeviceOwner:()       => ipcRenderer.invoke('adb:check-owner'),
    pushConfig:      (config) => ipcRenderer.invoke('adb:push-config', config),
    autoBootOnCharge:()       => ipcRenderer.invoke('adb:auto-boot'),
    factoryReset:    ()       => ipcRenderer.invoke('adb:factory-reset'),
    getInstalledVersion: ()   => ipcRenderer.invoke('adb:get-version'),
    onLog:    (cb) => ipcRenderer.on('adb:log',  (_, msg) => cb(msg)),
    offLog:   ()   => ipcRenderer.removeAllListeners('adb:log'),
  },

  esp: {
    flash:   (opts) => ipcRenderer.invoke('esp:flash', opts),
    detect:  (port) => ipcRenderer.invoke('esp:detect', port),
    erase:   (port) => ipcRenderer.invoke('esp:erase', port),
    stop:    ()     => ipcRenderer.invoke('esp:stop'),
    onLog:      (cb) => ipcRenderer.on('esp:log',      (_, msg) => cb(msg)),
    offLog:     ()   => ipcRenderer.removeAllListeners('esp:log'),
    onProgress: (cb) => ipcRenderer.on('esp:progress', (_, pct) => cb(pct)),
    offProgress:()   => ipcRenderer.removeAllListeners('esp:progress'),
    onDone:     (cb) => ipcRenderer.on('esp:done',     (_, ok)  => cb(ok)),
    offDone:    ()   => ipcRenderer.removeAllListeners('esp:done'),
  },

  serial: {
    listPorts: ()             => ipcRenderer.invoke('serial:list'),
    open:      (port, baud)   => ipcRenderer.invoke('serial:open', port, baud),
    close:     ()             => ipcRenderer.invoke('serial:close'),
    onData:  (cb) => ipcRenderer.on('serial:data', (_, data) => cb(data)),
    offData: ()   => ipcRenderer.removeAllListeners('serial:data'),
  },

  api: {
    login:          (serverUrl, email, password) => ipcRenderer.invoke('api:login', serverUrl, email, password),
    registerDevice: (serverUrl, token, name)     => ipcRenderer.invoke('api:register-device', serverUrl, token, name),
    getDeviceStatus:(serverUrl, token, deviceId) => ipcRenderer.invoke('api:device-status', serverUrl, token, deviceId),
    getSettings:    ()                           => ipcRenderer.invoke('api:get-settings'),
    saveSettings:   (s)                          => ipcRenderer.invoke('api:save-settings', s),
  },

  fs: {
    selectFile:          (filters) => ipcRenderer.invoke('fs:select-file', filters),
    selectFolder:        ()        => ipcRenderer.invoke('fs:select-folder'),
    listApks:            (folder)  => ipcRenderer.invoke('fs:list-apks', folder),
    getBundledFirmwarePath: (chip) => ipcRenderer.invoke('fs:firmware-path', chip),
    getBundledApkPath:   ()        => ipcRenderer.invoke('fs:apk-path'),
  },

});
