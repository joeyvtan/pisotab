'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, User } from '@/lib/api';

interface AuthCtx {
  user: User | null;
  token: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('pisotab_token');
    const u = localStorage.getItem('pisotab_user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const res = await api.login(username, password);
    localStorage.setItem('pisotab_token', res.token);
    localStorage.setItem('pisotab_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem('pisotab_token');
    localStorage.removeItem('pisotab_user');
    setToken('');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, token, login, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
