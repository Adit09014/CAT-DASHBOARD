import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { LoginResponse, TokenPayload, User } from '../types';

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<TokenPayload>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('catguardian_user');
    const token = localStorage.getItem('catguardian_token');
    if (raw && token) setUser(JSON.parse(raw) as User);
    setIsReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isReady,
    login: async (email: string, password: string) => {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
      localStorage.setItem('catguardian_token', data.access_token);
      localStorage.setItem('catguardian_user', JSON.stringify(data.user));
      setUser(data.user);
      return { accessToken: data.access_token, user: data.user };
    },
    logout: () => {
      localStorage.removeItem('catguardian_token');
      localStorage.removeItem('catguardian_user');
      setUser(null);
    },
  }), [isReady, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
