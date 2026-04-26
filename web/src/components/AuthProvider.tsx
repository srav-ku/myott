'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api, readStoredUser, writeStoredUser, type StoredUser } from '@/lib/api';

type AuthState = {
  user: StoredUser | null;
  isAdmin: boolean;
  adminMode: 'open' | 'restricted' | null;
  signIn: (u: StoredUser) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState<'open' | 'restricted' | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const stored = readStoredUser();
    setUser(stored);
    if (!stored) {
      setIsAdmin(false);
      setAdminMode(null);
      return;
    }
    const r = await api<{
      isAdmin: boolean;
      adminMode: 'open' | 'restricted';
    }>('/api/user/me');
    if (r.ok) {
      setIsAdmin(r.data.isAdmin);
      setAdminMode(r.data.adminMode);
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (u: StoredUser) => {
      writeStoredUser(u);
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(() => {
    writeStoredUser(null);
    setUser(null);
    setIsAdmin(false);
    setAdminMode(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: hydrated ? user : null,
        isAdmin,
        adminMode,
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
