'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, User } from '@/lib/api';

interface AuthCtx {
  user: User | null;
  token: string;
  login: (username: string, password: string) => Promise<{ requires_totp?: boolean; temp_token?: string }>;
  loginDirect: (token: string, user: User) => void;
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
    const res = await api.login(username, password) as { token?: string; user?: User; requires_totp?: boolean; temp_token?: string };
    if (res.requires_totp) return { requires_totp: true, temp_token: res.temp_token };
    localStorage.setItem('pisotab_token', res.token!);
    localStorage.setItem('pisotab_user', JSON.stringify(res.user!));
    setToken(res.token!);
    setUser(res.user!);
    return {};
  }

  function loginDirect(token: string, user: User) {
    localStorage.setItem('pisotab_token', token);
    localStorage.setItem('pisotab_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('pisotab_token');
    localStorage.removeItem('pisotab_user');
    setToken('');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, token, login, loginDirect, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
