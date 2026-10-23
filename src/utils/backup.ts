import { validateNavigation, validateNodes } from '../../shared/navigation';
import type { MonitoredNode } from '../../shared/navigation';
import { exportProfile, restoreProfile, validateProfile, PROFILE_EVENT } from './profileStorage';
import { getStoredNodes, saveNodes } from './storage';
import { getSyncRecovery, pendingWrites } from './syncState';
import type { Category, Site } from '../types';
import { PREFERENCE_EVENT } from './preferences';

export interface BackupExtras {
  nodes?: MonitoredNode[];
  profile?: Record<string, string>;
  preferences?: Record<string, string>;
}
const PREFERENCES = ['apexnav_dark', 'apexnav_widgets', 'apexnav_bing_bg', 'apexnav_wallpaper_idx', 'apexnav_engine', 'apexnav_open_new_tab', 'apexnav_web_suggestions'];

export function parseBackupExtras(data: Record<string, unknown>): BackupExtras {
  const extras: BackupExtras = {};
  if (data.nodes !== undefined) extras.nodes = validateNodes(data.nodes);
  if (data.profile !== undefined) extras.profile = validateProfile(data.profile);
  if (data.preferences !== undefined) {
    if (!data.preferences || typeof data.preferences !== 'object' || Array.isArray(data.preferences)) throw new Error('偏好配置无效');
    const prefs: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.preferences)) {
      if (!PREFERENCES.includes(key) || typeof value !== 'string') throw new Error('备份包含不支持的偏好配置');
      if (key === 'apexnav_engine' ? !['google', 'bing', 'baidu', 'github'].includes(value)
        : key === 'apexnav_wallpaper_idx' ? !/^\d{1,4}$/.test(value) : !['true', 'false'].includes(value)) throw new Error('偏好配置值无效');
      prefs[key] = value;
    }
    extras.preferences = prefs;
  }
  return extras;
}

export function createWorkspaceBackup(username: string, categories: Category[], sites: Site[]) {
  return {
    version: '2.0', exported_at: new Date().toISOString(),
    ...validateNavigation(categories, sites, true), nodes: getStoredNodes(username), profile: exportProfile(),
    preferences: Object.fromEntries(PREFERENCES.flatMap((key) => {
      const value = localStorage.getItem(key); return value === null ? [] : [[key, value]];
    })),
    recovery: getSyncRecovery(username), pending: pendingWrites(username).map(({ write }) => write),
  };
}

export function restoreBackupExtras(username: string, input: BackupExtras): void {
  const extras = parseBackupExtras(input as Record<string, unknown>);
  if (extras.nodes !== undefined) saveNodes(extras.nodes, username);
  if (extras.profile !== undefined) restoreProfile(extras.profile);
  if (extras.preferences) for (const [key, value] of Object.entries(extras.preferences)) localStorage.setItem(key, value);
  window.dispatchEvent(new Event(PROFILE_EVENT));
  window.dispatchEvent(new Event(PREFERENCE_EVENT));
}

export function downloadWorkspaceBackup(username: string, categories: Category[], sites: Site[]): void {
  const data = createWorkspaceBackup(username, categories, sites);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `ApexNav-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
