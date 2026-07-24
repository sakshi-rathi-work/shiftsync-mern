// Auth context — stores the current user and access token in React state.
// Provides login/logout helpers used throughout the app.
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setAccessToken } from '@/lib/api-client';
import apiClient from '@/lib/api-client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  organizationId: string;
  teamId: string | null;
  hasOnboarded: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true on mount — we attempt silent refresh

  // On mount: try to restore session via the refresh cookie
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = (await res.json()) as { data: { accessToken: string } };
          setAccessToken(data.data.accessToken);
          const meRes = await apiClient.get<{ data: AuthUser }>('/auth/me');
          setUser(meRes.data);
        }
      } catch {
        // No valid session — user stays null
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ data: { accessToken: string; user: AuthUser } }>(
      '/auth/login',
      { email, password }
    );
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await apiClient.get<{ data: AuthUser }>('/auth/me');
    setUser(res.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
