import { useEffect, useState } from 'react';
export const PREFERENCE_EVENT = 'apexnav_preferences_change';
export const linkTarget = (): '_blank' | '_self' => localStorage.getItem('apexnav_open_new_tab') === 'false' ? '_self' : '_blank';
export const openLink = (url: string): void => { window.open(url, linkTarget(), 'noopener,noreferrer'); };
export function usePreferences() {
  const read = () => ({ target: linkTarget(), suggestions: localStorage.getItem('apexnav_web_suggestions') === 'true' });
  const [preferences, setPreferences] = useState(read);
  useEffect(() => {
    const update = () => setPreferences(read());
    window.addEventListener(PREFERENCE_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(PREFERENCE_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  return preferences;
}
