'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, Device } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export function useDevices(account?: string) {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDevices(account);
      setDevices(data);
    } catch (e) {
      console.error('Failed to load devices', e);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on('device:status', ({ device_id, status }: { device_id: string; status: string }) => {
      setDevices(prev => prev.map(d => d.id === device_id ? { ...d, status: status as Device['status'] } : d));
    });

    socket.on('session:started', () => refresh());
    socket.on('session:ended', ({ device_id }: { device_id: string }) => {
      setDevices(prev => prev.map(d => d.id === device_id
        ? { ...d, status: 'online', active_session_id: undefined, time_remaining_secs: undefined }
        : d
      ));
    });

    socket.on('session:updated', ({ device_id, time_remaining_secs }: { device_id: string; time_remaining_secs: number }) => {
      setDevices(prev => prev.map(d => d.id === device_id ? { ...d, time_remaining_secs } : d));
    });

    socket.on('state:devices', (data: Device[]) => setDevices(data));

    return () => {
      socket.off('device:status');
      socket.off('session:started');
      socket.off('session:ended');
      socket.off('session:updated');
      socket.off('state:devices');
    };
  }, [token, refresh]);

  return { devices, loading, refresh };
}
