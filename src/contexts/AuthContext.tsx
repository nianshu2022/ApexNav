import React, { createContext, useContext, useState, useCallback } from 'react';
import { saveCategories, saveSites, saveNodes } from '../utils/storage';

const STORAGE_KEY_PW_PREFIX = 'apexnav_auth_pw_';
const STORAGE_KEY_UN_PREFIX = 'apexnav_auth_un_';
const STORAGE_KEY_DISPLAY_UN = 'apexnav_username_display';
const SESSION_KEY_IS_ADMIN = 'apexnav_is_admin';

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
  currentUsername: null,
  login: async () => false,
  logout: () => {},
  setupAccount: async () => {},
  changeCredentials: async () => 'error',
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY_IS_ADMIN) === 'true';
  });

  const [currentUsername, setCurrentUsername] = useState<string | null>(() => {
    if (sessionStorage.getItem(SESSION_KEY_IS_ADMIN) === 'true') {
      return localStorage.getItem(STORAGE_KEY_DISPLAY_UN) || 'admin';
    }
    return null;
  });

  const [needsSetup] = useState<boolean>(false);

  /** Register or setup an account with username + password (D1 + LocalStorage fallback) */
  const setupAccount = useCallback(async (username: string, password: string) => {
    const cleanUn = username.trim();
    const unHash = await hash(cleanUn.toLowerCase());
    const pwHash = await hash(password);

    // Save in LocalStorage
    localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`, unHash);
    localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`, pwHash);
    localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);

    // Initialize fresh empty workspace for the new account
    saveCategories([], cleanUn);
    saveSites([], cleanUn);
    saveNodes([], cleanUn);

    // Attempt D1 Register API
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUn, passwordHash: pwHash }),
      });
    } catch {
      /* Standalone LocalStorage fallback */
    }

    sessionStorage.setItem(SESSION_KEY_IS_ADMIN, 'true');
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

      // Attempt D1 Login API first
      let d1Success = false;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUn, passwordHash: inputPwHash }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            d1Success = true;
            // Hydrate local storage with D1 user data
            if (Array.isArray(data.categories)) saveCategories(data.categories, cleanUn);
            if (Array.isArray(data.sites)) saveSites(data.sites, cleanUn);
            if (Array.isArray(data.nodes)) saveNodes(data.nodes, cleanUn);

            localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`, inputUnHash);
            localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`, inputPwHash);
            localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);
          }
        }
      } catch {
        /* D1 API offline / not bound -> fallback to local storage */
      }

      if (!d1Success) {
        // LocalStorage authentication fallback
        const storedUnHash = localStorage.getItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`);
        const storedPwHash = localStorage.getItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`);

        const legacyUnHash = localStorage.getItem('apexnav_auth_username');
        const legacyPwHash = localStorage.getItem('apexnav_auth_password');

        let isValid = false;
        if (storedUnHash && storedPwHash) {
          if (inputUnHash === storedUnHash && inputPwHash === storedPwHash) isValid = true;
        } else if (legacyUnHash && legacyPwHash) {
          if (inputUnHash === legacyUnHash && inputPwHash === legacyPwHash) {
            isValid = true;
            localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`, legacyUnHash);
            localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`, legacyPwHash);
          }
        }

        if (!isValid) return false;
      }

      localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);
      sessionStorage.setItem(SESSION_KEY_IS_ADMIN, 'true');
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
    sessionStorage.removeItem(SESSION_KEY_IS_ADMIN);
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
        const storedPwHash = localStorage.getItem(`${STORAGE_KEY_PW_PREFIX}${currentUsername.toLowerCase()}`);
        if (!storedPwHash || oldPwHash !== storedPwHash) return 'wrong_password';
      }

      localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanNewUn.toLowerCase()}`, newUnHash);
      localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanNewUn.toLowerCase()}`, newPwHash);
      localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanNewUn);

      setCurrentUsername(cleanNewUn);
      window.dispatchEvent(new CustomEvent('apexnav_auth_change', { detail: { username: cleanNewUn } }));
      return 'ok';
    } catch {
      return 'error';
    }
  }, [currentUsername]);

  return (
    <AuthContext.Provider value={{ isAdmin, needsSetup, currentUsername, login, logout, setupAccount, changeCredentials }}>
      {children}
    </AuthContext.Provider>
  );
};
