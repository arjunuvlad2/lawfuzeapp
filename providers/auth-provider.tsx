'use client';

/**
 * AuthProvider (token in localStorage)
 * -----------------------------------
 * - login(email, password)  -> POST /api/auth/login  -> { access_token }
 * - loginWithGoogleIdToken  -> POST /api/auth/callback/google -> { access_token }
 * - fetchMe()               -> GET /api/auth/me (Bearer)
 * - logout/signOut          -> clear token + user
 * - refresh()               -> force /me re-check (e.g., after manual token set)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';

type BackendMe = {
  user_id: string;
  org_id: string;
  role: 'client' | 'admin' | 'solicitor' | 'staff';
  perms: string[];
  twofa: boolean;
  exp: number; // unix seconds
};

interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  orgId?: string;
  role?: BackendMe['role'];
  perms?: string[];
  twofa?: boolean;
  exp?: number;
}

type Status = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextType = {
  status: Status;
  user: User | null;
  isLoading: boolean;

  // primary actions
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogleIdToken: (idToken: string) => Promise<boolean>;
  logout: () => void;
  signOut: () => void; // alias for compatibility

  // helpers
  getToken: () => string | null;
  refresh: () => Promise<void>;

  // compatibility with parts of your UI that expect NextAuth-ish shape
  data: { user: User | null } | null;
};

// ─── storage helpers ───────────────────────────────────────────────────────

function readToken(): string | null {
  try {
    return localStorage.getItem('lf_token');
  } catch {
    return null;
  }
}
function writeToken(token: string) {
  localStorage.setItem('lf_token', token);
}
function clearToken() {
  localStorage.removeItem('lf_token');
}

// GET /api/auth/me with Bearer <token>
async function fetchMeWith(token: string): Promise<BackendMe> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({} as any));
    const msg = j?.message || j?.detail || 'Failed to load profile';
    throw new Error(msg);
  }
  return res.json();
}

// ─── context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const isLoading = status === 'loading';

  const getToken = useCallback(readToken, []);

  const hydrateFromMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      // Back-compat: if you previously cached the user, keep it
      const cached = localStorage.getItem('auth-user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
          setStatus('authenticated');
          return;
        } catch {
          /* ignore */
        }
      }
      setUser(null);
      setStatus('unauthenticated');
      return;
    }

    try {
      const me = await fetchMeWith(token);
      const u: User = {
        id: me.user_id,
        orgId: me.org_id,
        role: me.role,
        perms: me.perms,
        twofa: me.twofa,
        exp: me.exp,
      };
      setUser(u);
      localStorage.setItem('auth-user', JSON.stringify(u));
      setStatus('authenticated');
    } catch {
      clearToken();
      localStorage.removeItem('auth-user');
      setUser(null);
      setStatus('unauthenticated');
    }
  }, [getToken]);

  // Bootstrap + listen for token changes from other tabs
  useEffect(() => {
    hydrateFromMe();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lf_token') void hydrateFromMe();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [hydrateFromMe]);

  // ─── actions ────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string) => {
      setStatus('loading');
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!resp.ok) return false;

        const data = (await resp.json().catch(() => ({}))) as {
          access_token?: string;
        };
        if (!data?.access_token) return false;

        writeToken(data.access_token);
        await hydrateFromMe();
        return true;
      } catch {
        clearToken();
        localStorage.removeItem('auth-user');
        setUser(null);
        setStatus('unauthenticated');
        return false;
      }
    },
    [hydrateFromMe]
  );

  const loginWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      setStatus('loading');
      try {
        const resp = await fetch('/api/auth/callback/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        if (!resp.ok) return false;

        const data = (await resp.json().catch(() => ({}))) as {
          access_token?: string;
        };
        if (!data?.access_token) return false;

        writeToken(data.access_token);
        await hydrateFromMe();
        return true;
      } catch {
        clearToken();
        localStorage.removeItem('auth-user');
        setUser(null);
        setStatus('unauthenticated');
        return false;
      }
    },
    [hydrateFromMe]
  );

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('auth-user');
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // alias for components importing signOut directly
  const signOut = logout;

  const refresh = useCallback(async () => {
    setStatus('loading');
    await hydrateFromMe();
  }, [hydrateFromMe]);

  const data = useMemo(() => (user ? { user } : null), [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      status,
      user,
      isLoading,
      login,
      loginWithGoogleIdToken,
      logout,
      signOut,
      getToken,
      refresh,
      data,
    }),
    [
      status,
      user,
      isLoading,
      login,
      loginWithGoogleIdToken,
      logout,
      signOut,
      getToken,
      refresh,
      data,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook API
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Back-compat helpers some components may import
export function useSession() {
  const { data, status } = useAuth();
  return { data, status };
}

export async function signIn(provider: string) {
  // Your UI calls GIS directly; keep this no-op to avoid breaking imports.
  if (provider === 'credentials' || provider === 'google') return { error: null };
  return { error: 'Provider not supported' };
}

export function signOut() {
  // Compatibility export — delegate to context behavior
  localStorage.removeItem('lf_token');
  localStorage.removeItem('auth-user');
  // if you want to hard navigate, uncomment:
  // window.location.assign('/signin');
  window.location.reload();
}
