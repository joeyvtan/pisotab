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
  const [activeTab, setActiveTab] = useState<'android' | 'esp32'>('android');
  const [downloads, setDownloads] = useState<{ apk: DownloadFile | null; firmware: DownloadFile | null }>({ apk: null, firmware: null });

  useEffect(() => {
    api.getDownloads().then(d => setDownloads({ apk: d.apk, firmware: d.firmware })).catch(() => {});
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
          <DownloadCard label="Android APK" icon="📱" file={downloads.apk} />
          <DownloadCard label="ESP32 Firmware (.bin)" icon="🔌" file={downloads.firmware} />
          <ExternalDownloadCard
            label="ESP32 Flash Tool"
            icon="⚡"
            desc="Windows GUI tool by Espressif for flashing .bin firmware to ESP32."
            href="https://www.espressif.com/en/support/download/other-tools"
          />
        </div>
        <p className="text-center text-slate-500 text-sm">
          7-day free trial included · No license key needed to start
        </p>
      </section>

      {/* ── Install Guide ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-800/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Installation Guide</h2>
            <p className="text-slate-400">Step-by-step setup for tablet and coin box</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            {(['android', 'esp32'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}>
                {tab === 'android' ? '📱 Android Tablet' : '🔌 ESP32 Coin Box'}
              </button>
            ))}
          </div>

          {activeTab === 'android' && (
            <ol className="space-y-4">
              {[
                'Download and install the APK on your Android tablet.',
                'Open PisoTab — complete the first-time setup wizard (server URL, device name, admin PIN).',
                'Enable Device Owner mode via ADB:\n`adb shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver`',
                'Enable Kiosk Mode in the app Settings → Security.',
                'Register the device in your web dashboard: Devices → Add Device.',
                'Tablet is now ready — insert a coin or press Start from the dashboard.',
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-400 text-sm font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{step}</p>
                </li>
              ))}
            </ol>
          )}

          {activeTab === 'esp32' && (
            <ol className="space-y-4">
              {[
                'Download the ESP32 Flash Tool and the firmware (.bin) from the Downloads section above.',
                'Install the ESP32 Flash Tool on your PC (Windows/Mac/Linux).',
                'Connect your ESP32 board to your PC via USB cable.',
                'Open the Flash Tool → select your COM port → set address to 0x0 → select the pisotab_esp32.bin file.',
                'Click "Flash" — wait until it shows "Done".',
                'On first boot, connect your phone/PC to the WiFi network named "PisoTab-Coin" (no password).',
                'A setup page will open — enter your WiFi SSID and password, then click Save.',
                'The ESP32 reboots and connects to your network. LED blinks when connected.',
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-400 text-sm font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{step}</p>
                </li>
              ))}
            </ol>
          )}
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
