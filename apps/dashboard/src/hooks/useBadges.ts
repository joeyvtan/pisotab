/**
 * Listens to badges:update socket events and exposes live pending counts.
 * Also polls unread notification count every 30 seconds.
 */
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Badges {
  pending_users: number;
  pending_requests: number;
  unread_notifications: number;
}

export function useBadges(): Badges {
  const { token } = useAuth();
  const [badges, setBadges] = useState<Badges>({ pending_users: 0, pending_requests: 0, unread_notifications: 0 });

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    function onBadges(data: { pending_users: number; pending_requests: number }) {
      setBadges(prev => ({ ...prev, ...data }));
    }

    socket.on('badges:update', onBadges);
    return () => { socket.off('badges:update', onBadges); };
  }, [token]);

  // Poll unread notification count every 30 seconds
  useEffect(() => {
    if (!token) return;
    function fetchUnread() {
      api.getUnreadCount().then(r => setBadges(prev => ({ ...prev, unread_notifications: r.count }))).catch(() => {});
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [token]);

  return badges;
}
