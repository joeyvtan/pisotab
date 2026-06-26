import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Play, Square, Trash2, Search, Terminal } from 'lucide-react';
import LogPanel from '../components/LogPanel';
import ProgressBar from '../components/ProgressBar';

const CHIP_OPTIONS  = ['auto', 'esp32', 'esp8266'];
const BAUD_OPTIONS  = [115200, 230400, 460800, 921600, 1500000];
const MODE_OPTIONS  = ['dio', 'qio', 'dout', 'qout'];
const FREQ_OPTIONS  = ['40m', '80m', '26m', '20m'];

export default function EspFlasher() {
  const [ports,        setPorts]        = useState([]);
  const [port,         setPort]         = useState('');
  const [chip,         setChip]         = useState('auto');
  const [baud,         setBaud]         = useState(460800);
  const [flashMode,    setFlashMode]    = useState('dio');
  const [flashFreq,    setFlashFreq]    = useState('40m');
  const [firmwareSrc,  setFirmwareSrc]  = useState('bundled'); // bundled | browse
  const [espTarget,    setEspTarget]    = useState('esp32');   // for bundled firmware selection
  const [firmwarePath, setFirmwarePath] = useState('');
  const [flashLog,     setFlashLog]     = useState([]);
  const [progress,     setProgress]     = useState(0);
  const [flashing,     setFlashing]     = useState(false);
  const [serialOpen,   setSerialOpen]   = useState(false);
  const [serialLog,    setSerialLog]    = useState([]);
  const [serialBaud,   setSerialBaud]   = useState(115200);

  const addLog = useCallback((msg) => {
    setFlashLog(prev => [...prev, msg.trimEnd()]);
  }, []);

  // Load saved last port
  useEffect(() => {
    window.pisotab.api.getSettings().then(s => {
      if (s.lastPort) setPort(s.lastPort);
      if (s.lastBaud) setBaud(s.lastBaud);
    }).catch(() => {});
  }, []);

  // Subscribe to ESP events from main process
  useEffect(() => {
    window.pisotab.esp.onLog(addLog);
    window.pisotab.esp.onProgress(setProgress);
    window.pisotab.esp.onDone((ok) => {
      setFlashing(false);
      addLog(ok ? '\n✓ Flash complete!' : '\n✗ Flash failed.');
    });
    return () => {
      window.pisotab.esp.offLog();
      window.pisotab.esp.offProgress();
      window.pisotab.esp.offDone();
    };
  }, [addLog]);

  // Subscribe to serial monitor data
  useEffect(() => {
    window.pisotab.serial.onData((data) => {
      setSerialLog(prev => [...prev, data]);
    });
    return () => window.pisotab.serial.offData();
  }, []);

  async function refreshPorts() {
    const list = await window.pisotab.serial.listPorts();
    setPorts(list);
    if (list.length > 0 && !port) setPort(list[0].path);
  }

  useEffect(() => { refreshPorts(); }, []);

  async function resolveFirmwarePath() {
    if (firmwareSrc === 'bundled') {
      return window.pisotab.fs.getBundledFirmwarePath(espTarget);
    }
    return firmwarePath;
  }

  async function handleFlash() {
    const resolved = await resolveFirmwarePath();
    if (!resolved) { addLog('ERROR: No firmware file selected.'); return; }
    setFlashLog([]);
    setProgress(0);
    setFlashing(true);
    window.pisotab.api.saveSettings({ lastPort: port, lastBaud: baud }).catch(() => {});
    // Fire-and-forget: result comes via esp:done event
    window.pisotab.esp.flash({ chip, port, baud, flashMode, flashFreq, firmwarePath: resolved });
  }

  async function handleStop() {
    await window.pisotab.esp.stop();
    setFlashing(false);
    addLog('[Stopped by user]');
  }

  async function handleDetect() {
    if (!port) { addLog('Select a COM port first.'); return; }
    setFlashLog([]);
    const result = await window.pisotab.esp.detect(port);
    if (result.chip) {
      addLog(`Detected: ${result.chip}`);
      // Auto-select chip type
      if (result.chip.toLowerCase().includes('esp32'))   setChip('esp32');
      if (result.chip.toLowerCase().includes('esp8266')) setChip('esp8266');
    } else {
      addLog('Could not detect chip. Check port and hold BOOT button.');
    }
  }

  async function handleErase() {
    if (!port) { addLog('Select a COM port first.'); return; }
    setFlashLog([]);
    setFlashing(true);
    const result = await window.pisotab.esp.erase(port);
    setFlashing(false);
    addLog(result.success ? '✓ Erase complete!' : `✗ Erase failed: ${result.error}`);
  }

  async function handleBrowse() {
    const selected = await window.pisotab.fs.selectFile([
      { name: 'Firmware Binary', extensions: ['bin'] },
    ]);
    if (selected) {
      setFirmwarePath(selected);
      setFirmwareSrc('browse');
    }
  }

  async function toggleSerial() {
    if (serialOpen) {
      await window.pisotab.serial.close();
      setSerialOpen(false);
    } else {
      if (!port) { addLog('Select a COM port first.'); return; }
      await window.pisotab.serial.open(port, serialBaud);
      setSerialOpen(true);
    }
  }

  const bundledLabel = espTarget === 'esp32'
    ? 'Bundled — ESP32 firmware'
    : 'Bundled — ESP8266 firmware';

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h2 className="text-lg font-semibold text-white">ESP Flasher</h2>

      {/* Port + Chip row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">COM Port</label>
          <div className="flex gap-2">
            <Select value={port} onChange={e => setPort(e.target.value)} className="flex-1">
              {ports.length === 0 && <option value="">No ports found</option>}
              {ports.map(p => (
                <option key={p.path} value={p.path}>
                  {p.path}{p.manufacturer ? ` — ${p.manufacturer}` : ''}
                </option>
              ))}
            </Select>
            <Btn onClick={refreshPorts} title="Refresh ports" icon={<RefreshCw size={14} />} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Chip Type</label>
          <Select value={chip} onChange={e => setChip(e.target.value)}>
            {CHIP_OPTIONS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </Select>
        </div>
      </div>

      {/* Firmware source */}
      <div className="bg-gray-900 rounded-lg p-4 space-y-3 border border-gray-800">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Firmware Source</p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="src" value="bundled" checked={firmwareSrc === 'bundled'}
            onChange={() => setFirmwareSrc('bundled')} className="mt-0.5 accent-red-600" />
          <div>
            <p className="text-sm text-white">{bundledLabel}</p>
            {firmwareSrc === 'bundled' && (
              <div className="mt-2 flex gap-2">
                {['esp32', 'esp8266'].map(t => (
                  <button key={t} onClick={() => setEspTarget(t)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      espTarget === t ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="src" value="browse" checked={firmwareSrc === 'browse'}
            onChange={() => setFirmwareSrc('browse')} className="mt-0.5 accent-red-600" />
          <div className="flex-1">
            <p className="text-sm text-white">Browse local .bin file</p>
            {firmwareSrc === 'browse' && (
              <div className="mt-2 flex gap-2 items-center">
                <p className="text-xs text-gray-500 truncate flex-1">
                  {firmwarePath || 'No file selected'}
                </p>
                <button onClick={handleBrowse}
                  className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300">
                  Browse
                </button>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Flash settings */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Baud Rate</label>
          <Select value={baud} onChange={e => setBaud(Number(e.target.value))}>
            {BAUD_OPTIONS.map(b => <option key={b} value={b}>{b.toLocaleString()}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Flash Mode</label>
          <Select value={flashMode} onChange={e => setFlashMode(e.target.value)}>
            {MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Flash Freq</label>
          <Select value={flashFreq} onChange={e => setFlashFreq(e.target.value)}>
            {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </Select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={handleFlash} disabled={flashing || !port}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors">
          <Play size={14} /> Flash
        </button>
        <button onClick={handleStop} disabled={!flashing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors">
          <Square size={14} /> Stop
        </button>
        <button onClick={handleErase} disabled={flashing || !port}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors">
          <Trash2 size={14} /> Erase
        </button>
        <button onClick={handleDetect} disabled={flashing || !port}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors">
          <Search size={14} /> Detect Chip
        </button>
      </div>

      {/* Progress */}
      {(flashing || progress > 0) && (
        <ProgressBar percent={progress} label={flashing ? 'Flashing...' : 'Done'} />
      )}

      {/* Flash log */}
      <LogPanel logs={flashLog} onClear={() => { setFlashLog([]); setProgress(0); }} maxHeight="220px" />

      {/* Serial monitor */}
      <div className="border-t border-gray-800 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium flex items-center gap-1.5">
            <Terminal size={13} /> Serial Monitor
          </p>
          <div className="flex items-center gap-2">
            <Select value={serialBaud} onChange={e => setSerialBaud(Number(e.target.value))} className="!py-1 !text-xs">
              {[9600, 115200, 230400, 460800].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
            <button onClick={toggleSerial}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                serialOpen
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-green-700 hover:bg-green-600 text-white'
              }`}>
              {serialOpen ? 'Close' : 'Open Monitor'}
            </button>
            {serialOpen && (
              <button onClick={() => setSerialLog([])}
                className="text-gray-600 hover:text-gray-400" title="Clear">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        {serialOpen && (
          <LogPanel logs={serialLog} maxHeight="180px" />
        )}
      </div>
    </div>
  );
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      {...props}
      className={`bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 w-full focus:outline-none focus:border-red-500 ${className}`}
    >
      {children}
    </select>
  );
}

function Btn({ onClick, title, icon, disabled }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className="px-2 py-2 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 transition-colors disabled:opacity-50">
      {icon}
    </button>
  );
}
