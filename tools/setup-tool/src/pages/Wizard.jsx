import { useState, useRef } from 'react';
import { CheckCircle, Circle, Loader, XCircle } from 'lucide-react';
import LogPanel from '../components/LogPanel';

const STEPS = [
  { id: 'detect',  label: 'Detect Android device'         },
  { id: 'install', label: 'Install PisoTab APK'           },
  { id: 'owner',   label: 'Set Device Owner'              },
  { id: 'details', label: 'Enter device details'          },
  { id: 'register',label: 'Register device on backend'    },
  { id: 'config',  label: 'Push config to tablet'         },
  { id: 'verify',  label: 'Verify device online'          },
];

function initialStepState() {
  return Object.fromEntries(STEPS.map(s => [s.id, 'pending']));
  // states: pending | running | done | failed
}

export default function Wizard() {
  const [stepState,   setStepState]   = useState(initialStepState);
  const [stepData,    setStepData]    = useState({}); // { detect: {...}, register: { id } }
  const stepDataRef = useRef({});                    // mirrors stepData — readable synchronously between steps
  const [logs,        setLogs]        = useState([]);
  const [serverUrl,   setServerUrl]   = useState('https://api.jjtpisotab.com');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [token,       setToken]       = useState('');
  const [deviceName,  setDeviceName]  = useState('');
  const [adminPin,    setAdminPin]    = useState('');
  const [running,     setRunning]     = useState(false);

  const addLog = (msg) => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${ts}] ${String(msg).trim()}`]);
  };

  const setStep = (id, state) => setStepState(prev => ({ ...prev, [id]: state }));

  async function runStep(id) {
    setStep(id, 'running');
    try {
      switch (id) {
        case 'detect': {
          const result = await window.pisotab.adb.detectDevice();
          if (!result.connected) throw new Error('No authorized device found. Connect via USB + enable debugging.');
          setStepData(prev => ({ ...prev, detect: result }));
          addLog(`✓ Detected: ${result.model} (${result.serial})`);
          break;
        }
        case 'install': {
          const apkPath = await window.pisotab.fs.getBundledApkPath();
          window.pisotab.adb.onLog(addLog);
          const result = await window.pisotab.adb.installApk(apkPath);
          window.pisotab.adb.offLog();
          if (!result.success) throw new Error(result.error || 'Install failed');
          addLog('✓ PisoTab APK installed');
          break;
        }
        case 'owner': {
          window.pisotab.adb.onLog(addLog);
          const result = await window.pisotab.adb.setDeviceOwner();
          window.pisotab.adb.offLog();
          if (!result.success) throw new Error(result.error || 'Set Device Owner failed. Remove all Google accounts first.');
          addLog(result.alreadySet ? '✓ Device Owner already set (skipped)' : '✓ Device Owner set');
          break;
        }
        case 'details': {
          if (!deviceName.trim()) throw new Error('Device name is required');
          if (!adminPin.trim())   throw new Error('Admin PIN is required');
          addLog(`✓ Details saved: "${deviceName}", PIN: ****`);
          break;
        }
        case 'register': {
          if (!token) {
            addLog('Logging in to backend...');
            const auth = await window.pisotab.api.login(serverUrl, email, password);
            setToken(auth.token);
            addLog(`✓ Logged in as ${auth.user?.email || email}`);
            const device = await window.pisotab.api.registerDevice(serverUrl, auth.token, deviceName);
            stepDataRef.current = { ...stepDataRef.current, register: device };
            setStepData({ ...stepDataRef.current });
            addLog(`✓ Device registered: ${device.id}`);
          } else {
            const device = await window.pisotab.api.registerDevice(serverUrl, token, deviceName);
            stepDataRef.current = { ...stepDataRef.current, register: device };
            setStepData({ ...stepDataRef.current });
            addLog(`✓ Device registered: ${device.id}`);
          }
          break;
        }
        case 'config': {
          const deviceId = stepDataRef.current.register?.id;
          if (!deviceId) throw new Error('No device ID from registration step');
          window.pisotab.adb.onLog(addLog);
          const result = await window.pisotab.adb.pushConfig({ serverUrl, deviceId, deviceName, adminPin });
          window.pisotab.adb.offLog();
          if (!result.success) throw new Error(result.error || 'Config push failed');
          addLog(`✓ Config pushed (device ID: ${deviceId})`);
          break;
        }
        case 'verify': {
          const deviceId = stepDataRef.current.register?.id;
          if (!deviceId) throw new Error('No device ID to verify');
          addLog('Waiting for device to come online...');
          // Poll up to 5 times (every 3s)
          let online = false;
          for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 3000));
            try {
              const dev = await window.pisotab.api.getDeviceStatus(serverUrl, token, deviceId);
              if (dev.status === 'online' || dev.last_seen) {
                online = true;
                break;
              }
            } catch { /* keep polling */ }
            addLog(`Check ${i + 1}/5...`);
          }
          if (!online) throw new Error('Device did not come online within 15 seconds');
          addLog('✓ Device is online!');
          break;
        }
        default:
          break;
      }
      setStep(id, 'done');
      return true;
    } catch (err) {
      setStep(id, 'failed');
      addLog(`✗ ${err.message}`);
      return false;
    }
  }

  // Index of first non-done step
  const nextStepIndex = STEPS.findIndex(s => stepState[s.id] !== 'done');
  const nextStep = nextStepIndex >= 0 ? STEPS[nextStepIndex] : null;
  const allDone = STEPS.every(s => stepState[s.id] === 'done');

  async function runNextStep() {
    if (!nextStep || running) return;
    setRunning(true);
    await runStep(nextStep.id);
    setRunning(false);
  }

  async function runAll() {
    if (running) return;
    setRunning(true);
    for (const step of STEPS) {
      if (stepState[step.id] === 'done') continue;
      const ok = await runStep(step.id);
      if (!ok) break;
    }
    setRunning(false);
  }

  function reset() {
    setStepState(initialStepState());
    stepDataRef.current = {};
    setStepData({});
    setLogs([]);
    setToken('');
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h2 className="text-lg font-semibold text-white">New Device Setup Wizard</h2>

      {/* Backend credentials */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Backend Login</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 space-y-1">
            <label className="text-xs text-gray-500">Server URL</label>
            <input value={serverUrl} onChange={e => setServerUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 selectable"
              placeholder="https://api.jjtpisotab.com" />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-gray-500">Username</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="text"
              placeholder="your username"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 selectable" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
          </div>
        </div>
      </div>

      {/* Device details (needed for step 4+) */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Device Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Device Name</label>
            <input value={deviceName} onChange={e => setDeviceName(e.target.value)}
              placeholder="Store Unit 1"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 selectable" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Admin PIN</label>
            <input value={adminPin} onChange={e => setAdminPin(e.target.value)}
              placeholder="1234" type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Wizard Steps</p>
        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const state = stepState[step.id];
            return (
              <div key={step.id} className="flex items-center gap-3">
                <StepIcon state={state} />
                <p className={`text-sm ${
                  state === 'done'    ? 'text-green-400' :
                  state === 'failed'  ? 'text-red-400'   :
                  state === 'running' ? 'text-white'     :
                  'text-gray-500'
                }`}>
                  Step {i + 1}: {step.label}
                </p>
                {state === 'done' && step.id === 'register' && stepData.register && (
                  <code className="text-xs text-gray-500 ml-auto">{stepData.register.id}</code>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {!allDone && (
          <>
            <button onClick={runNextStep} disabled={running || !nextStep}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm transition-colors">
              {running ? 'Running...' : `Run Step ${nextStepIndex + 1}`}
            </button>
            <button onClick={runAll} disabled={running}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-sm font-medium transition-colors">
              Complete Setup
            </button>
          </>
        )}
        {allDone && (
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-500" />
            <p className="text-sm text-green-400 font-medium">Setup complete!</p>
            <button onClick={reset} className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300">
              Reset
            </button>
          </div>
        )}
      </div>

      <LogPanel logs={logs} onClear={() => setLogs([])} maxHeight="200px" />
    </div>
  );
}

function StepIcon({ state }) {
  if (state === 'done')    return <CheckCircle size={16} className="text-green-500 shrink-0" />;
  if (state === 'failed')  return <XCircle     size={16} className="text-red-500 shrink-0"   />;
  if (state === 'running') return <Loader      size={16} className="text-white shrink-0 animate-spin" />;
  return <Circle size={16} className="text-gray-700 shrink-0" />;
}
