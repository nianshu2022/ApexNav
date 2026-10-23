import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { saveCategories, saveSites, saveNodes, getStoredCategories, getStoredSites, getStoredNodes, buildApiUrl } from '../utils/storage';
import { authenticatedFetch, clearAuthSession, currentApiBase, getAuthSession, isCurrentSession, saveAuthSession, SESSION_EVENT, SESSION_KEY } from '../utils/authSession';
import type { AuthSession } from '../utils/authSession';

async function hash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

interface AuthContextType {
  isAdmin: boolean;
  needsSetup: boolean;
  isEnvAuth: boolean;
  currentUsername: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setupAccount: (username: string, password: string) => Promise<void>;
  changeCredentials: (oldPassword: string, newUsername: string, newPassword: string) => Promise<'ok' | 'wrong_password' | 'error'>;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false, needsSetup: false, isEnvAuth: false, currentUsername: null,
  login: async () => false, logout: () => {}, setupAccount: async () => {},
  changeCredentials: async () => 'error',
});

export const useAuth = () => useContext(AuthContext);

function acceptLogin(data: any, apiBaseUrl: string): void {
  if (!data.success || typeof data.user !== 'string' || !data.user
    || typeof data.token !== 'string' || !data.token || !Number.isFinite(data.expiresAt)
    || data.expiresAt <= Date.now()) throw new Error('登录响应无效，请更新后端后重试');
  // Empty arrays are valid cloud data. Do not resurrect data deleted on another device.
  if (data.isD1Bound && !data.isNewUser) {
    if (Array.isArray(data.categories)) saveCategories(data.categories, data.user);
    if (Array.isArray(data.sites)) saveSites(data.sites, data.user);
    if (Array.isArray(data.nodes)) saveNodes(data.nodes, data.user);
  }
  saveAuthSession({ username: data.user, token: data.token, expiresAt: data.expiresAt, apiBaseUrl });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(getAuthSession);
  const [apiBase, setApiBase] = useState(currentApiBase);
  const [isEnvAuth, setIsEnvAuth] = useState(false);
  const operation = useRef(0);

  useEffect(() => {
    const refresh = () => {
      const next = getAuthSession();
      setApiBase(currentApiBase());
      if (next?.token === session?.token && next?.username === session?.username
        && next?.apiBaseUrl === session?.apiBaseUrl) return;
      operation.current++;
      setSession(next);
      window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: next?.username ?? null } }));
    };
    const storage = (event: StorageEvent) => {
      if (!event.key || event.key === SESSION_KEY || event.key === 'apexnav_api_base_url') refresh();
    };
    window.addEventListener(SESSION_EVENT, refresh);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', refresh);
    // setTimeout has a 32-bit maximum delay, shorter than our 30-day session.
    const timer = setInterval(() => { if (!getAuthSession() && session) refresh(); }, 30_000);
    return () => {
      window.removeEventListener(SESSION_EVENT, refresh);
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
  }, [session]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(buildApiUrl('/api/auth/mode'), { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { if (!controller.signal.aborted) setIsEnvAuth(Boolean(data.success && data.isEnvAuth)); })
      .catch(() => {});
    return () => controller.abort();
  }, [apiBase]);

  const authenticate = useCallback(async (path: string, username: string, password: string) => {
    const id = ++operation.current;
    const base = currentApiBase();
    const response = await fetch(`${base}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ username: username.trim().toLowerCase(), passwordHash: await hash(password) }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || '登录失败');
    if (id !== operation.current || base !== currentApiBase()) throw new Error('登录操作已取消');
    acceptLogin(data, base);
    setIsEnvAuth(Boolean(data.isEnvAuth));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try { await authenticate('/api/auth/login', username, password); return true; }
    catch { return false; }
  }, [authenticate]);

  const setupAccount = useCallback(async (username: string, password: string) => {
    // Never create local credentials or upload an empty workspace before registration succeeds.
    await authenticate('/api/auth/register', username, password);
  }, [authenticate]);

  const logout = useCallback(() => {
    operation.current++;
    clearAuthSession();
    setSession(null);
  }, []);

  const changeCredentials = useCallback(async (
    oldPassword: string, newUsername: string, newPassword: string
  ): Promise<'ok' | 'wrong_password' | 'error'> => {
    const active = getAuthSession();
    if (!active) return 'error';
    try {
      const res = await authenticatedFetch('/api/auth/change-password', active, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: active.username, oldPasswordHash: await hash(oldPassword),
          newUsername: newUsername.trim().toLowerCase(), newPasswordHash: await hash(newPassword),
        }),
      });
      if (!res) return 'error';
      const data = await res.json();
      if (data.code === 'wrong_password') return 'wrong_password';
      if (!res.ok || !data.success || !isCurrentSession(active)) return 'error';
      // Preserve any local-only workspace when renaming, then accept authoritative cloud data.
      saveCategories(getStoredCategories(active.username), data.user);
      saveSites(getStoredSites(active.username), data.user);
      saveNodes(getStoredNodes(active.username), data.user);
      acceptLogin(data, active.apiBaseUrl);
      return 'ok';
    } catch { return 'error'; }
  }, []);

  return (
    <AuthContext.Provider value={{
      isAdmin: Boolean(session), currentUsername: session?.username ?? null,
      needsSetup: false, isEnvAuth, login, logout, setupAccount, changeCredentials,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
