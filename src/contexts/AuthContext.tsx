import React, { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY_UN = 'apexnav_auth_username';
const STORAGE_KEY_PW = 'apexnav_auth_password';
const STORAGE_KEY_DISPLAY_UN = 'apexnav_username_display';
const SESSION_KEY = 'apexnav_is_admin';

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
  currentUsername: string;
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
  currentUsername: 'admin',
  login: async () => false,
  logout: () => {},
  setupAccount: async () => {},
  changeCredentials: async () => 'error',
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [needsSetup, setNeedsSetup] = useState<boolean>(() => {
    return !localStorage.getItem(STORAGE_KEY_PW);
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });

  const [currentUsername, setCurrentUsername] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_DISPLAY_UN) || 'admin';
  });

  /** Called once when a new deployer first sets up their account */
  const setupAccount = useCallback(async (username: string, password: string) => {
    const cleanUn = username.trim();
    const unHash = await hash(cleanUn.toLowerCase());
    const pwHash = await hash(password);
    localStorage.setItem(STORAGE_KEY_UN, unHash);
    localStorage.setItem(STORAGE_KEY_PW, pwHash);
    localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);

    // Initialize fresh empty workspace for the new admin
    localStorage.setItem('apexnav_categories', JSON.stringify([]));
    localStorage.setItem('apexnav_sites', JSON.stringify([]));
    localStorage.setItem('apexnav_monitored_nodes_v4', JSON.stringify([]));

    // Dispatch custom event to notify components to clear state
    window.dispatchEvent(new Event('apexnav_account_setup'));

    setNeedsSetup(false);
    setCurrentUsername(cleanUn);
    sessionStorage.setItem(SESSION_KEY, 'true');
    setIsAdmin(true);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const cleanUn = username.trim();
      const inputUnHash = await hash(cleanUn.toLowerCase());
      const inputPwHash = await hash(password);
      const storedUnHash = localStorage.getItem(STORAGE_KEY_UN);
      const storedPwHash = localStorage.getItem(STORAGE_KEY_PW);

      if (!storedUnHash || !storedPwHash) return false;
      if (inputUnHash !== storedUnHash || inputPwHash !== storedPwHash) return false;

      localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);
      setCurrentUsername(cleanUn);
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAdmin(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  }, []);

  const changeCredentials = useCallback(async (
    oldPassword: string,
    newUsername: string,
    newPassword: string
  ): Promise<'ok' | 'wrong_password' | 'error'> => {
    try {
      const oldPwHash = await hash(oldPassword);
      const storedPwHash = localStorage.getItem(STORAGE_KEY_PW);
      if (!storedPwHash || oldPwHash !== storedPwHash) return 'wrong_password';

      const cleanUn = newUsername.trim();
      const newUnHash = await hash(cleanUn.toLowerCase());
      const newPwHash = await hash(newPassword);
      localStorage.setItem(STORAGE_KEY_UN, newUnHash);
      localStorage.setItem(STORAGE_KEY_PW, newPwHash);
      localStorage.setItem(STORAGE_KEY_DISPLAY_UN, cleanUn);
      setCurrentUsername(cleanUn);
      return 'ok';
    } catch {
      return 'error';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, needsSetup, currentUsername, login, logout, setupAccount, changeCredentials }}>
      {children}
    </AuthContext.Provider>
  );
};
