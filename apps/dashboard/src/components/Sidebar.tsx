'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useBadges } from '@/hooks/useBadges';

// badge key maps nav href to a badge count field from useBadges()
type BadgeKey = 'pending_users' | 'pending_requests';

// visibleTo: 'all' | 'admin' | 'superadmin'
// 'admin' means both admin and superadmin can see it
// 'superadmin' means only superadmin can see it
const NAV: { href: string; icon: string; label: string; visibleTo: string; badge?: BadgeKey }[] = [
  { href: '/dashboard',                   icon: '📊', label: 'Overview',          visibleTo: 'all'        },
  { href: '/dashboard/devices',           icon: '📱', label: 'Devices',           visibleTo: 'all'        },
  { href: '/dashboard/branches',          icon: '🏪', label: 'Branches',          visibleTo: 'all'        },
  { href: '/dashboard/sessions',          icon: '⏱',  label: 'Sessions',          visibleTo: 'all'        },
  { href: '/dashboard/logs',              icon: '📋', label: 'Logs & Revenue',    visibleTo: 'all'        },
  { href: '/dashboard/analytics',         icon: '📈', label: 'Analytics',         visibleTo: 'all'        },
  { href: '/dashboard/pricing',           icon: '💰', label: 'Pricing',           visibleTo: 'all'        },
  { href: '/dashboard/buy-license',       icon: '🛒', label: 'Buy License',       visibleTo: 'adminOnly'  },
  { href: '/dashboard/purchase-requests', icon: '📨', label: 'Purchase Requests', visibleTo: 'admin',      badge: 'pending_requests' },
  { href: '/dashboard/users',             icon: '👥', label: 'Users',             visibleTo: 'admin',      badge: 'pending_users'    },
  { href: '/dashboard/licenses',          icon: '🔑', label: 'Licenses',          visibleTo: 'admin'      },
  { href: '/dashboard/gcash-settings',    icon: '💳', label: 'GCash Settings',    visibleTo: 'superadmin' },
  { href: '/dashboard/firmware',          icon: '🔧', label: 'Firmware OTA',      visibleTo: 'admin'      },
  { href: '/dashboard/guides',            icon: '📖', label: 'User Guides',        visibleTo: 'all'        },
  { href: '/dashboard/settings',          icon: '⚙️', label: 'Settings',          visibleTo: 'all'        },
];

function canSee(visibleTo: string, role: string | undefined) {
  if (!role) return false;
  if (visibleTo === 'all') return true;
  if (visibleTo === 'superadmin') return role === 'superadmin';
  if (visibleTo === 'admin') return role === 'admin' || role === 'superadmin';
  if (visibleTo === 'adminOnly') return role === 'admin'; // not visible to superadmin
  return false;
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const badges = useBadges();

  function handleLogout() { logout(); router.push('/login'); }

  const roleBadge: Record<string, string> = {
    superadmin: 'text-purple-400',
    admin:      'text-orange-400',
    staff:      'text-slate-400',
  };

  return (
    <aside className="w-60 h-screen bg-slate-900 border-r border-slate-700 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jjt-logo.png" alt="JJT Logo" className="w-9 h-9 rounded-full object-contain flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-base leading-none">JJT PisoTab</div>
            <div className="text-xs text-slate-400">Admin Panel</div>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white text-xl leading-none ml-1">
              ×
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV.filter(item => canSee(item.visibleTo, user?.role)).map(item => {
          const badgeCount = item.badge ? badges[item.badge] : 0;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                pathname === item.href
                  ? 'bg-orange-500 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}>
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm text-white font-medium">{user?.username}</div>
            <div className={`text-xs capitalize font-medium ${roleBadge[user?.role ?? ''] ?? 'text-slate-400'}`}>
              {user?.role}
            </div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  );
}
