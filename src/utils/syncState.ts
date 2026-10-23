import { currentApiBase } from './authSession';
import type { Category, Site } from '../types';

export interface SyncFields { categories?: Category[]; sites?: Site[]; nodes?: any[] }
export interface PendingWrite {
  id: string; fields: SyncFields; baseVersion?: string;
  createdAt: number; state: 'pending' | 'conflict'; message?: string; raw?: string;
}
export const SYNC_EVENT = 'apexnav_sync_change';
const writerId = crypto.randomUUID();
const viewVersions = new Map<string, string>();
const prefix = (username: string, base = currentApiBase()) => `apexnav_sync_${encodeURIComponent(JSON.stringify([base, username]))}`;
const invalidCloudScopes = new WeakMap<Storage, Set<string>>();
const invalidCloudForThisStore = () => {
  let scopes = invalidCloudScopes.get(localStorage);
  if (!scopes) { scopes = new Set<string>(); invalidCloudScopes.set(localStorage, scopes); }
  return scopes;
};

export interface InvalidCloudSnapshot {
  savedAt: string;
  reason: string;
  version: unknown;
  categories: unknown;
  sites: unknown;
  nodes: unknown;
}

export function hasInvalidCloudData(username: string, base = currentApiBase()): boolean {
  const scope = prefix(username, base);
  return invalidCloudForThisStore().has(scope) || localStorage.getItem(`${scope}:invalid-cloud`) === '1';
}

export function getInvalidCloudSnapshot(username: string, base = currentApiBase()): InvalidCloudSnapshot | null {
  const raw = localStorage.getItem(`${prefix(username, base)}:invalid-cloud-recovery`);
  if (!raw) return null;
  try { return JSON.parse(raw) as InvalidCloudSnapshot; } catch { return null; }
}

export function quarantineCloudData(username: string, data: Record<string, unknown>, reason: string, base = currentApiBase()): void {
  const scope = prefix(username, base);
  invalidCloudForThisStore().add(scope);
  viewVersions.delete(scope);
  try { localStorage.removeItem(`${scope}:version`); } catch {}
  try { localStorage.setItem(`${scope}:invalid-cloud`, '1'); } catch {}
  // Preserve the server's original fields separately from validated, renderable local data.
  try {
    localStorage.setItem(`${scope}:invalid-cloud-recovery`, JSON.stringify({
      savedAt: new Date().toISOString(), reason, version: data.version,
      categories: data.categories, sites: data.sites, nodes: data.nodes,
    } satisfies InvalidCloudSnapshot));
  } catch { /* The original remains on the server if local storage is full. */ }
  notifySync();
}

export function clearInvalidCloudData(username: string, base = currentApiBase()): void {
  const scope = prefix(username, base);
  invalidCloudForThisStore().delete(scope);
  localStorage.removeItem(`${scope}:invalid-cloud`);
  // Keep the recovery copy after a repair until the user chooses to remove browser data.
  notifySync();
}

export function notifySync(): void { window.dispatchEvent(new Event(SYNC_EVENT)); }

export function pendingWrites(username: string, base = currentApiBase()): { key: string; write: PendingWrite }[] {
  const start = `${prefix(username, base)}:pending:`;
  const result: { key: string; write: PendingWrite }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(start)) continue;
    // Corrupt pending records must block cloud hydration, never silently erase an unsynced edit.
    const raw = localStorage.getItem(key)!;
    try {
      const write = JSON.parse(raw);
      if (!write || typeof write.id !== 'string' || !Number.isFinite(write.createdAt)
        || !['pending', 'conflict'].includes(write.state)
        || !write.fields || typeof write.fields !== 'object' || Array.isArray(write.fields)
        || (write.baseVersion !== undefined && typeof write.baseVersion !== 'string')
        || Object.entries(write.fields).some(([field, value]) => !['categories', 'sites', 'nodes'].includes(field) || !Array.isArray(value))) {
        throw new Error('Invalid outbox');
      }
      result.push({ key, write });
    }
    catch { result.push({ key, write: { id: key, fields: {}, createdAt: 0, state: 'conflict', raw, message: '待同步记录损坏，请先导出本地备份' } }); }
  }
  return result.sort((a, b) => a.write.createdAt - b.write.createdAt);
}

export function rememberCloudVersion(username: string, version: unknown, base = currentApiBase()): void {
  if (typeof version !== 'string') return;
  const scope = prefix(username, base);
  viewVersions.set(scope, version);
  localStorage.setItem(`${scope}:version`, version);
}

export function enqueueWrite(username: string, fields: SyncFields, base = currentApiBase()): void {
  const scope = prefix(username, base);
  const key = `${scope}:pending:${writerId}`;
  const previous = pendingWrites(username, base).find((entry) => entry.key === key)?.write;
  // Only a version observed by this page describes the data currently being edited.
  const version = viewVersions.get(scope);
  // Each tab owns a separate durable outbox, so a stale tab cannot erase another tab's queued edits.
  const write: PendingWrite = {
    id: crypto.randomUUID(), fields: { ...previous?.fields, ...fields },
    baseVersion: previous ? previous.baseVersion : version,
    createdAt: previous?.createdAt ?? Date.now(), state: previous?.state ?? 'pending', message: previous?.message,
    ...(previous?.raw === undefined ? {} : { raw: previous.raw }),
  };
  localStorage.setItem(key, JSON.stringify(write));
  notifySync();
}

export function isOwnPendingKey(key: string): boolean { return key.endsWith(`:pending:${writerId}`); }

export function updatePending(key: string, write: PendingWrite): void {
  localStorage.setItem(key, JSON.stringify(write));
  notifySync();
}

export function syncStatus(username: string | null): { state: 'idle' | 'pending' | 'conflict'; message: string } {
  if (username && hasInvalidCloudData(username)) return { state: 'conflict', message: '云端书签或监控节点包含不符合当前规则的数据；已保留原始内容并暂停同步。请到备份与同步设置下载云端原始数据。' };
  const writes = username ? pendingWrites(username) : [];
  const conflict = writes.find(({ write }) => write.state === 'conflict');
  if (conflict) return { state: 'conflict', message: conflict.write.message || '云端已发生变化，本地修改已保留，请在设置中处理同步冲突' };
  if (writes.length) return { state: 'pending', message: '修改已保存在此设备，正在等待上传；恢复网络后会重试' };
  return { state: 'idle', message: '' };
}

export function archivePending(username: string): void {
  const entries = pendingWrites(username);
  if (!entries.length) return;
  const key = `${prefix(username)}:recovery`;
  const previous = getSyncRecovery(username);
  localStorage.setItem(key, JSON.stringify([...previous, { savedAt: new Date().toISOString(), writes: entries.map(({ write }) => write) }]));
  for (const entry of entries) localStorage.removeItem(entry.key);
  notifySync();
}

export function getSyncRecovery(username: string): unknown[] {
  const raw = localStorage.getItem(`${prefix(username)}:recovery`);
  if (raw === null) return [];
  try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; } catch {}
  return [{ raw, message: '恢复归档格式损坏，保留原始文本供人工恢复' }];
}
