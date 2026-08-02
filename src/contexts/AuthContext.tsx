import React, { createContext, useContext, useState, useCallback } from 'react';

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

  /** Create or register an account with username + password */
  const setupAccount = useCallback(async (username: string, password: string) => {
    const cleanUn = username.trim();
    const unHash = await hash(cleanUn.toLowerCase());
    const pwHash = await hash(password);

    localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`, unHash);
    localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`, pwHash);
    localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);

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

      const storedUnHash = localStorage.getItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`);
      const storedPwHash = localStorage.getItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`);

      // Legacy single-account fallback check
      const legacyUnHash = localStorage.getItem('apexnav_auth_username');
      const legacyPwHash = localStorage.getItem('apexnav_auth_password');

      let isValid = false;
      if (storedUnHash && storedPwHash) {
        if (inputUnHash === storedUnHash && inputPwHash === storedPwHash) isValid = true;
      } else if (legacyUnHash && legacyPwHash) {
        if (inputUnHash === legacyUnHash && inputPwHash === legacyPwHash) {
          isValid = true;
          // Migrate legacy account
          localStorage.setItem(`${STORAGE_KEY_UN_PREFIX}${cleanUn.toLowerCase()}`, legacyUnHash);
          localStorage.setItem(`${STORAGE_KEY_PW_PREFIX}${cleanUn.toLowerCase()}`, legacyPwHash);
        }
      }

      if (!isValid) return false;

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
      const storedPwHash = localStorage.getItem(`${STORAGE_KEY_PW_PREFIX}${currentUsername.toLowerCase()}`);

      if (!storedPwHash || oldPwHash !== storedPwHash) return 'wrong_password';

      const cleanNewUn = newUsername.trim();
      const newUnHash = await hash(cleanNewUn.toLowerCase());
      const newPwHash = await hash(newPassword);

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
