import { useState } from 'react';
import { Home, Smartphone, Zap, Package, Wand2 } from 'lucide-react';
import HomePage from './pages/Home';
import DeviceSetup from './pages/DeviceSetup';
import EspFlasher from './pages/EspFlasher';
import AppManager from './pages/AppManager';
import Wizard from './pages/Wizard';

const NAV = [
  { id: 'home',   label: 'Home',          Icon: Home },
  { id: 'device', label: 'Device Setup',  Icon: Smartphone },
  { id: 'esp',    label: 'ESP Flasher',   Icon: Zap },
  { id: 'apps',   label: 'App Manager',   Icon: Package },
  { id: 'wizard', label: 'Setup Wizard',  Icon: Wand2 },
];

const PAGES = {
  home:   HomePage,
  device: DeviceSetup,
  esp:    EspFlasher,
  apps:   AppManager,
  wizard: Wizard,
};

export default function App() {
  const [page, setPage] = useState('home');
  const Page = PAGES[page];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 flex flex-col border-r border-gray-800 shrink-0">
        {/* Brand header */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-xs font-bold">J</div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">JJTPisoTab</h1>
              <p className="text-xs text-gray-500 mt-0.5">Setup Tool</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`w-full text-left px-3 py-2.5 rounded text-sm flex items-center gap-3 transition-colors ${
                page === id
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Page />
      </main>
    </div>
  );
}
