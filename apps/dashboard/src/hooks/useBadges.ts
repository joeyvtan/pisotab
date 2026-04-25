/**
 * Listens to badges:update socket events and exposes live pending counts.
 * Used by the Sidebar to show red bubbles on Users and Purchase Requests.
 */
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

interface Badges {
  pending_users: number;
  pending_requests: number;
}

export function useBadges(): Badges {
  const { token } = useAuth();
  const [badges, setBadges] = useState<Badges>({ pending_users: 0, pending_requests: 0 });

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    function onBadges(data: Badges) {
      setBadges(data);
    }

    socket.on('badges:update', onBadges);
    return () => { socket.off('badges:update', onBadges); };
  }, [token]);

  return badges;
}
