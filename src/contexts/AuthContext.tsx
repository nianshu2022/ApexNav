import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveCategories, saveSites, saveNodes, syncUserWithD1 } from '../utils/storage';

const STORAGE_KEY_PW_PREFIX = 'apexnav_auth_pw_';
const STORAGE_KEY_UN_PREFIX = 'apexnav_auth_un_';
const STORAGE_KEY_DISPLAY_UN = 'apexnav_username_display';
// ↓ 改用 localStorage（持久化 + 跨 Tab 共享），取代原来的 sessionStorage
const LS_KEY_IS_ADMIN = 'apexnav_is_admin';
const LS_KEY_AUTH_EXPIRES = 'apexnav_auth_expires';
const AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

/** 检查登录态是否仍在有效期内 */
function isAuthValid(): boolean {
  if (localStorage.getItem(LS_KEY_IS_ADMIN) !== 'true') return false;
  const exp = Number(localStorage.getItem(LS_KEY_AUTH_EXPIRES) || '0');
  if (!exp || Date.now() > exp) {
    // 已过期，清除
    localStorage.removeItem(LS_KEY_IS_ADMIN);
    localStorage.removeItem(LS_KEY_AUTH_EXPIRES);
    return false;
  }
  return true;
}

/** 写入登录态，重置过期时间 */
function persistAuth(): void {
  localStorage.setItem(LS_KEY_IS_ADMIN, 'true');
  localStorage.setItem(LS_KEY_AUTH_EXPIRES, String(Date.now() + AUTH_TTL_MS));
}

/** 清除登录态 */
function clearAuth(): void {
  localStorage.removeItem(LS_KEY_IS_ADMIN);
  localStorage.removeItem(LS_KEY_AUTH_EXPIRES);
}

async function hash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface AuthContextType {
  isAdmin: boolean;
  needsSetup: boolean;
  isEnvAuth: boolean;
  currentUsername: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setupAccount: (username: string, password: string) => Promise<void>;
  changeCredentials: (
    oldPassword: string,
    newUsername: string,
    newPassword: string
  ) => Promise<'ok' | 'wrong_password' | 'error'>;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  needsSetup: false,
  isEnvAuth: false,
  currentUsername: null,
  login: async () => false,
  logout: () => {},
  setupAccount: async () => {},
  changeCredentials: async () => 'error',
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAuthValid());

  const [currentUsername, setCurrentUsername] = useState<string | null>(() => {
    if (isAuthValid()) {
      const displayUn = localStorage.getItem(STORAGE_KEY_DISPLAY_UN);
      return (displayUn && displayUn !== 'null' && displayUn !== 'undefined') ? displayUn : 'admin';
    }
    return null;
  });

  const [isEnvAuth, setIsEnvAuth] = useState<boolean>(false);
  const [needsSetup] = useState<boolean>(false);

  // Check Cloudflare Auth Mode
  useEffect(() => {
    fetch('/api/auth/mode')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.isEnvAuth) {
          setIsEnvAuth(true);
        }
      })
      .catch(() => {});
  }, []);

  // 跨 Tab 登录态同步：监听 localStorage storage 事件
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY_IS_ADMIN) {
        const nowValid = isAuthValid();
        setIsAdmin(nowValid);
        if (nowValid) {
          const displayUn = localStorage.getItem(STORAGE_KEY_DISPLAY_UN);
          const un = (displayUn && displayUn !== 'null' && displayUn !== 'undefined') ? displayUn : 'admin';
          setCurrentUsername(un);
          window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: un } }));
        } else {
          setCurrentUsername(null);
          window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: null } }));
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  /** Register or setup an account with username + password */
  const setupAccount = useCallback(async (username: string, password: string) => {
    const cleanUn = username.trim();
    const unHash = await hash(cleanUn.toLowerCase());
    const pwHash = await hash(password);

    // Save in LocalStorage
    localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`, unHash);
    localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`, pwHash);
    localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);
    localStorage.setItem('apexnav_auth_username', unHash);
    localStorage.setItem('apexnav_auth_password', pwHash);

    // Initialize new account with clean empty workspace
    saveCategories([], cleanUn);
    saveSites([], cleanUn);
    saveNodes([], cleanUn);
    syncUserWithD1(cleanUn, [], [], []);

    // Attempt D1 Register API
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUn, passwordHash: pwHash }),
      });
    } catch {
      /* Local fallback */
    }

    persistAuth();
    setCurrentUsername(cleanUn);
    setIsAdmin(true);

    // Notify components to load user's data
    window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: cleanUn } }));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const cleanUn = username.trim();
      const inputUnHash = await hash(cleanUn.toLowerCase());
      const inputPwHash = await hash(password);

      // Attempt Cloudflare Function / D1 Login API
      let apiSuccess = false;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUn, password, passwordHash: inputPwHash }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            apiSuccess = true;
            const authenticatedUser = data.user || cleanUn;

            // Hydrate local storage with Cloudflare / D1 user data ONLY if non-empty
            if (Array.isArray(data.categories) && data.categories.length > 0) {
              saveCategories(data.categories, authenticatedUser);
            }
            if (Array.isArray(data.sites) && data.sites.length > 0) {
              saveSites(data.sites, authenticatedUser);
            }
            if (Array.isArray(data.nodes) && data.nodes.length > 0) {
              saveNodes(data.nodes, authenticatedUser);
            }

            localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${authenticatedUser.toLowerCase()}`, await hash(authenticatedUser.toLowerCase()));
            localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${authenticatedUser.toLowerCase()}`, inputPwHash);
            localStorage.setItem(STORAGE_KEY_DISPLAY_UN, authenticatedUser);

            persistAuth();
            setCurrentUsername(authenticatedUser);
            setIsAdmin(true);

            window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: authenticatedUser } }));
            return true;
          }
        }
      } catch {
        /* API offline / not bound -> fallback to local storage */
      }

      if (!apiSuccess) {
        // LocalStorage authentication fallback
        const storedUnHash = localStorage.getItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`);
        const storedPwHash = localStorage.getItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`);
        const legacyPwHash = localStorage.getItem('apexnav_auth_password');

        let isValid = false;
        if (storedUnHash && storedPwHash) {
          if (inputUnHash === storedUnHash && inputPwHash === storedPwHash) isValid = true;
        } else if (legacyPwHash) {
          if (inputPwHash === legacyPwHash) {
            isValid = true;
            localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`, inputUnHash);
            localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`, inputPwHash);
          }
        }

        if (!isValid) return false;
      }

      localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);
      persistAuth();
      setCurrentUsername(cleanUn);
      setIsAdmin(true);

      // Notify components to load user's data
      window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: cleanUn } }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setIsAdmin(false);
    setCurrentUsername(null);

    // Notify components to revert to DEMO preview data
    window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: null } }));
  }, []);

  const changeCredentials = useCallback(async (
    oldPassword: string,
    newUsername: string,
    newPassword: string
  ): Promise<'ok' | 'wrong_password' | 'error'> => {
    try {
      if (!currentUsername) return 'error';
      const oldPwHash = await hash(oldPassword);
      const cleanNewUn = newUsername.trim();
      const newUnHash = await hash(cleanNewUn.toLowerCase());
      const newPwHash = await hash(newPassword);

      // Attempt D1 Change Password API
      let d1Handled = false;
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUsername,
            oldPasswordHash: oldPwHash,
            newUsername: cleanNewUn,
            newPasswordHash: newPwHash,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            d1Handled = true;
          } else if (data.message === '当前密码错误') {
            return 'wrong_password';
          }
        }
      } catch {
        /* D1 API offline */
      }

      if (!d1Handled) {
        const storedPwHash = localStorage.getItem(`${STORAGE_KEY_PW_PREFIX}${currentUsername.toLowerCase()}`) || localStorage.getItem('apexnav_auth_password');
        if (!storedPwHash || oldPwHash !== storedPwHash) return 'wrong_password';
      }

      localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanNewUn.toLowerCase()}`, newUnHash);
      localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanNewUn.toLowerCase()}`, newPwHash);
      localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanNewUn);
      localStorage.setItem('apexnav_auth_username', newUnHash);
      localStorage.setItem('apexnav_auth_password', newPwHash);

      setCurrentUsername(cleanNewUn);
      window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: cleanNewUn } }));
      return 'ok';
    } catch {
      return 'error';
    }
  }, [currentUsername]);

  return (
    <AuthContext.Provider value={{ isAdmin, needsSetup, isEnvAuth, currentUsername, login, logout, setupAccount, changeCredentials }}>
      {children}
    </AuthContext.Provider>
  );
};
