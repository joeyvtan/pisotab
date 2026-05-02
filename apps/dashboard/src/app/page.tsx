'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import JjtLogo from '@/components/JjtLogo';
import { api, DownloadFile } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}
function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-PH', { dateStyle: 'medium' });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 shadow-lg backdrop-blur' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <JjtLogo size={36} />
          <span className="font-bold text-white text-lg">JJT PisoTab</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#downloads" className="hover:text-white transition-colors">Downloads</a>
          <a href="#setup-guide" className="hover:text-white transition-colors">Setup Guide</a>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard"
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/register"
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 hover:border-red-600/50 transition-colors">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
        {step}
      </div>
      <div>
        <h3 className="text-white font-semibold mb-1">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{desc}</p>
      </div>
    </div>
  );
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-start gap-2 bg-slate-900 border border-slate-600 rounded-lg p-3 group">
      <code className="flex-1 text-red-300 font-mono text-xs break-all leading-relaxed">{command}</code>
      <button onClick={copy}
        className="shrink-0 px-2 py-1 rounded text-xs font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-slate-300">
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function ExternalDownloadCard({ label, icon, desc, href }: { label: string; icon: string; desc: string; href: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="text-4xl mb-2">{icon}</div>
      <h3 className="text-white font-semibold mb-1">{label}</h3>
      <p className="text-slate-400 text-xs mb-4">{desc}</p>
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="w-full block text-center py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
        Download
      </a>
    </div>
  );
}

function DownloadCard({ label, icon, file }: { label: string; icon: string; file: DownloadFile | null }) {
  if (!file) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-white font-semibold mb-1">{label}</h3>
        <p className="text-slate-500 text-sm">Not yet available</p>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-4xl mb-2">{icon}</div>
          <h3 className="text-white font-semibold">{label}</h3>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-red-900/60 text-red-300 font-mono">
          v{file.version}
        </span>
      </div>
      <div className="text-slate-400 text-xs mb-4 space-y-1">
        <div>Size: {formatBytes(file.size)}</div>
        <div>Updated: {formatDate(file.uploaded_at)}</div>
      </div>
      <a href={file.download_url}
        className="w-full block text-center py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
        Download
      </a>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading } = useAuth();
  const [downloads, setDownloads] = useState<{ apk: DownloadFile | null; firmware: DownloadFile | null }>({ apk: null, firmware: null });
  const [apkUrl, setApkUrl]           = useState('');
  const [firmwareUrl, setFirmwareUrl] = useState('');
  const [flasherUrl, setFlasherUrl]   = useState('');

  useEffect(() => {
    api.getDownloads().then(d => setDownloads({ apk: d.apk, firmware: d.firmware })).catch(() => {});
    api.getAppSettings().then(s => {
      setApkUrl(s['apk_download_url'] || '');
      setFirmwareUrl(s['firmware_download_url'] || '');
      setFlasherUrl(s['flasher_download_url'] || '');
    }).catch(() => {});
  }, []);

  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar isLoggedIn={isLoggedIn} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16"
        style={{ background: 'radial-gradient(ellipse at top, #1e0a0a 0%, #0f172a 60%)' }}>
        <JjtLogo size={120} className="mb-8 drop-shadow-lg" />
        <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
          <span className="text-white">Smart </span>
          <span className="text-red-500">Coin-Operated</span>
          <br />
          <span className="text-white">Phone Rental System</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mb-10 leading-relaxed">
          Turn any Android tablet into a self-service rental kiosk.
          Coin-operated, web-managed, offline-ready — built for Philippine internet shops and rental businesses.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/register"
            className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-lg transition-colors">
            Start Free Trial
          </Link>
          <a href="#downloads"
            className="px-8 py-3.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-lg transition-colors">
            Download App
          </a>
        </div>
        <p className="text-slate-600 text-sm mt-6">7-day free trial · No credit card required</p>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1 text-slate-600 text-xs animate-bounce">
          <span>Scroll</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Everything you need</h2>
          <p className="text-slate-400">Purpose-built for coin-operated phone rental shops</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard icon="⏱" title="Real-time Timer"
            desc="Countdown timer on device, live sync to web dashboard. Pause, resume, and add time remotely." />
          <FeatureCard icon="🪙" title="Coin Operated"
            desc="ESP32 coin acceptor with MQTT integration. Auto-starts session on first coin, adds time on subsequent coins." />
          <FeatureCard icon="🔌" title="USB Mode"
            desc="Charge-based time tracking. Timer starts when USB power connects, stops when disconnected." />
          <FeatureCard icon="📊" title="Web Dashboard"
            desc="Manage all devices and sessions remotely from any browser. Real-time updates via WebSocket." />
          <FeatureCard icon="🔒" title="Kiosk Lock"
            desc="Full Android lockdown via Device Owner API. Users cannot exit, install apps, or tamper with the device." />
          <FeatureCard icon="📡" title="Offline Ready"
            desc="Stores sessions locally, syncs when connection restores. Works even without internet." />
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">How it works</h2>
            <p className="text-slate-400">Get up and running in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connector line — desktop only */}
            <div className="hidden md:block absolute top-6 left-1/4 right-1/4 h-0.5 bg-slate-700" />
            <StepCard step={1} title="Register & Install"
              desc="Create your free account, download the APK, and install it on your Android tablet." />
            <StepCard step={2} title="Configure"
              desc="Set up your devices, pricing tiers, and optionally connect an ESP32 coin acceptor." />
            <StepCard step={3} title="Start Earning"
              desc="Customers insert coins or connect USB — the timer starts automatically. You monitor from the web." />
          </div>
        </div>
      </section>

      {/* ── Downloads ─────────────────────────────────────────────────────── */}
      <section id="downloads" className="py-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Downloads</h2>
          <p className="text-slate-400">Get the latest version of the kiosk app and ESP32 firmware</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {apkUrl
            ? <ExternalDownloadCard label="Android APK" icon="📱" desc="PisoTab kiosk app for Android tablets." href={apkUrl} />
            : <DownloadCard label="Android APK" icon="📱" file={downloads.apk} />}
          {firmwareUrl
            ? <ExternalDownloadCard label="ESP32 Firmware (.bin)" icon="🔌" desc="Latest firmware for the coin acceptor module." href={firmwareUrl} />
            : <DownloadCard label="ESP32 Firmware (.bin)" icon="🔌" file={downloads.firmware} />}
          <ExternalDownloadCard
            label="ESP32 Flash Tool"
            icon="⚡"
            desc="Windows GUI tool by Espressif for flashing .bin firmware to ESP32."
            href={flasherUrl || 'https://www.espressif.com/en/support/download/other-tools'}
          />
        </div>
        <p className="text-center text-slate-500 text-sm">
          7-day free trial included · No license key needed to start
        </p>
      </section>

      {/* ── Setup Guide ───────────────────────────────────────────────────── */}
      <section id="setup-guide" className="py-24 px-6 bg-slate-800/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Complete Setup Guide</h2>
            <p className="text-slate-400">Full step-by-step installation from registration to kiosk mode</p>
          </div>

          <div className="space-y-4 text-sm">

            {/* Step 1 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">1</span>
                <h3 className="text-white font-semibold">Register &amp; Get Approved</h3>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 ml-10">
                <li>Go to the dashboard and register your admin account.</li>
                <li>Wait for superadmin approval — you'll be able to log in once approved.</li>
                <li>After approval, log in and go to <strong className="text-slate-300">Devices</strong> to add your tablet.</li>
                <li>Copy the generated <strong className="text-slate-300">Device ID</strong> — you'll need it in the Android app.</li>
              </ol>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">2</span>
                <h3 className="text-white font-semibold">Flash the ESP32 Firmware (.bin)</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-900/60 text-yellow-300 font-medium shrink-0">ESP32 / Coin mode only</span>
              </div>
              <p className="text-yellow-400/80 text-xs mb-3 ml-10">⚡ Skip this step if you are using <strong>USB mode</strong> (charge-based timer) — no ESP32 hardware required.</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 ml-10">
                <li>Download the <strong className="text-slate-300">ESP32 Firmware (.bin)</strong> and <strong className="text-slate-300">Flash Download Tool</strong> from the Downloads section above.</li>
                <li>Install and open the <strong className="text-slate-300">ESP32 Flash Download Tool</strong>.</li>
                <li>When prompted, select chip type: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">ESP32</code>, work mode: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">Develop</code>, load mode: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">USB</code>.</li>
                <li>In the SPIDownload tab, click <strong className="text-slate-300">...</strong> and select your <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">.bin</code> firmware file.</li>
                <li>Set flash address to <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">0x0</code> and check the checkbox next to the file row.</li>
                <li>Connect ESP32 to your PC via USB, select the correct <strong className="text-slate-300">COM port</strong>.</li>
                <li>Set SPI speed: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">40MHz</code>, SPI mode: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">DIO</code>.</li>
                <li>Click <strong className="text-slate-300">START</strong> — wait for the progress bar to reach 100% and show <span className="text-green-400">FINISH</span>.</li>
              </ol>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">3</span>
                <h3 className="text-white font-semibold">Configure the ESP32 (WiFi + Backend)</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-900/60 text-yellow-300 font-medium shrink-0">ESP32 / Coin mode only</span>
              </div>
              <p className="text-yellow-400/80 text-xs mb-3 ml-10">⚡ Skip this step if you are using <strong>USB mode</strong> — go directly to Step 4.</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 ml-10">
                <li>After powering on, the ESP32 creates a hotspot: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">PisoTab-Coin</code> (no password).</li>
                <li>Connect your phone or PC to that WiFi network.</li>
                <li>Open a browser and go to <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">192.168.4.1</code>.</li>
                <li>Enter your local WiFi <strong className="text-slate-300">SSID</strong> and <strong className="text-slate-300">Password</strong>.</li>
                <li>Enter the Backend URL from your dashboard.</li>
                <li>Click <strong className="text-slate-300">Save</strong> — ESP32 reboots and connects to your WiFi. LED blinks green when connected.</li>
              </ol>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">4</span>
                <h3 className="text-white font-semibold">Install the Android Kiosk App (APK)</h3>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 ml-10">
                <li>Download the APK from the Downloads section above and install it on your Android tablet.</li>
                <li>On your tablet go to <strong className="text-slate-300">Settings → Security</strong> and enable <strong className="text-slate-300">Install Unknown Apps</strong>.</li>
                <li>Launch <strong className="text-slate-300">PisoTab</strong> — the idle screen will appear.</li>
                <li>Long-press the <strong className="text-slate-300">bottom-right corner</strong> for 2 seconds → enter Admin PIN <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">1234</code>.</li>
                <li>Go to <strong className="text-slate-300">Connection Settings</strong> → enter the Backend URL from your dashboard.</li>
                <li>Go to <strong className="text-slate-300">Device Settings</strong> → paste your Device ID from the dashboard.</li>
                <li>Tap <strong className="text-slate-300">Connect</strong> — status should change to <span className="text-green-400">Connected</span>.</li>
              </ol>
            </div>

            {/* Step 5 — ADB Commands */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">5</span>
                <h3 className="text-white font-semibold">ADB Setup — Device Owner &amp; Permissions</h3>
              </div>
              <p className="text-slate-400 mb-4 ml-10">
                These commands grant the app the system-level permissions required for Kiosk Mode, floating timer, and secure settings.
                Connect the tablet to your PC via USB and run the commands below in <strong className="text-slate-300">Command Prompt (CMD)</strong>.
              </p>

              {/* Prerequisites */}
              <div className="ml-10 mb-4">
                <p className="text-slate-300 font-medium mb-2">Prerequisites — enable USB Debugging on the tablet:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Go to <strong className="text-slate-300">Settings → About phone</strong> and tap <strong className="text-slate-300">Build number</strong> 7 times.</li>
                  <li>Go to <strong className="text-slate-300">Settings → Developer options</strong> and enable <strong className="text-slate-300">USB Debugging</strong>.</li>
                  <li>Connect the tablet to your PC via USB — accept the "Allow USB debugging" prompt on the tablet.</li>
                </ol>
              </div>

              {/* ADB path note */}
              <div className="ml-10 mb-4 p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg">
                <p className="text-blue-300 text-xs leading-relaxed">
                  <strong>Full-path commands below work from any CMD window</strong> — no need to navigate to platform-tools first.
                  The path <code className="bg-slate-800 px-1 rounded font-mono">%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe</code> is the default Android Studio install location.
                  If you installed ADB elsewhere, replace that path with the folder where <code className="bg-slate-800 px-1 rounded font-mono">adb.exe</code> is located.
                </p>
              </div>

              <div className="ml-10 space-y-5">

                {/* Set Device Owner */}
                <div>
                  <p className="text-slate-300 font-medium mb-1">
                    1. Set Device Owner <span className="text-red-400 font-normal">(required for Kiosk Mode)</span>
                  </p>
                  <p className="text-slate-500 text-xs mb-2">Run this once on a fresh install. The app must be the only accounts-capable app and no Google accounts should be added to the tablet before running.</p>
                  <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver`} />
                  <p className="text-slate-500 text-xs mt-1">Expected output: <span className="text-green-400">Success: Device owner set to package com.pisotab.app</span></p>
                </div>

                {/* System Alert Window */}
                <div>
                  <p className="text-slate-300 font-medium mb-1">
                    2. Grant System Alert Window <span className="text-slate-400 font-normal">(required for Floating Timer overlay)</span>
                  </p>
                  <p className="text-slate-500 text-xs mb-2">Allows the countdown timer to appear on top of other apps.</p>
                  <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell appops set com.pisotab.app SYSTEM_ALERT_WINDOW allow`} />
                </div>

                {/* Write Secure Settings */}
                <div>
                  <p className="text-slate-300 font-medium mb-1">
                    3. Grant Write Secure Settings <span className="text-slate-400 font-normal">(required for lock screen &amp; kiosk controls)</span>
                  </p>
                  <p className="text-slate-500 text-xs mb-2">Allows the app to control screen lock behavior and system UI settings.</p>
                  <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell pm grant com.pisotab.app android.permission.WRITE_SECURE_SETTINGS`} />
                </div>

                {/* Verify Device Owner */}
                <div>
                  <p className="text-slate-300 font-medium mb-1">
                    4. Verify Device Owner <span className="text-slate-400 font-normal">(optional — confirm it was set)</span>
                  </p>
                  <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm list-owners`} />
                  <p className="text-slate-500 text-xs mt-1">Should show <span className="text-green-400">com.pisotab.app</span> as the device owner.</p>
                </div>

                {/* Remove Device Owner */}
                <div>
                  <p className="text-slate-300 font-medium mb-1">
                    5. Remove Device Owner <span className="text-slate-400 font-normal">(only if you need to uninstall or reset)</span>
                  </p>
                  <p className="text-slate-500 text-xs mb-2">You can also remove it from Admin panel → Kiosk Mode → Deactivate. Use ADB only if the app is inaccessible.</p>
                  <CopyCommand command={`"%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" shell dpm remove-active-admin com.pisotab.app/.receiver.DeviceAdminReceiver`} />
                </div>

              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">6</span>
                <h3 className="text-white font-semibold">Final Configuration &amp; Kiosk Mode</h3>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 ml-10">
                <li>In the Admin panel, go to <strong className="text-slate-300">Pricing</strong> — set your per-minute or per-session rates.</li>
                <li>Go to <strong className="text-slate-300">Allowed Apps</strong> — enable only the apps customers should access.</li>
                <li>Test a session: insert coins (ESP32 mode) or connect USB power (USB mode) — verify the timer starts on the tablet.</li>
                <li>Once everything works, go to <strong className="text-slate-300">Kiosk Mode</strong> and enable it — this locks the tablet to the app.</li>
                <li>Change the Admin PIN from the default <code className="bg-slate-700 px-1.5 py-0.5 rounded text-red-300 font-mono">1234</code> to a secure PIN.</li>
              </ol>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #1e1b4b 100%)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start?</h2>
          <p className="text-slate-300 mb-8">
            Join businesses already using JJT PisoTab to manage their phone rental kiosks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <Link href="/dashboard"
                className="px-8 py-3.5 rounded-xl bg-white text-red-700 font-semibold hover:bg-red-50 transition-colors">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/register"
                  className="px-8 py-3.5 rounded-xl bg-white text-red-700 font-semibold hover:bg-red-50 transition-colors">
                  Create Free Account
                </Link>
                <Link href="/login"
                  className="px-8 py-3.5 rounded-xl border border-white/40 text-white hover:border-white transition-colors">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-800 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <JjtLogo size={32} />
            <span className="text-slate-400 text-sm">JJT PisoTab</span>
          </div>
          <div className="text-slate-600 text-sm">
            © {new Date().getFullYear()} JJT PisoTab. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-300 transition-colors">Dashboard</Link>
            <a href="#downloads" className="hover:text-slate-300 transition-colors">Downloads</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
