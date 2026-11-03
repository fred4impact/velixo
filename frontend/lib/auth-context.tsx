'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './token-storage';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return null;
    }
    try {
      const profile = await usersService.getProfile();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await authService.login({ email, password });
      setTokens(tokens.accessToken, tokens.refreshToken);
      const profile = await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      return profile;
    },
    [refreshUser, queryClient],
  );

  const register = useCallback(
    async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
      const tokens = await authService.register(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      const profile = await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      return profile;
    },
    [refreshUser, queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await authService.logout(refreshToken).catch(() => undefined);
    }
    clearTokens();
    setUser(null);
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.removeQueries({ queryKey: ['wishlist'] });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
