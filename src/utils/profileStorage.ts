import { getAuthSession } from './authSession';
import { normalizeCountdownIcon } from '../../shared/iconCatalog';

export const PROFILE_EVENT = 'apexnav_profile_change';
export const PROFILE_KEYS = ['apexnav_todo_items', 'apexnav_todos', 'apexnav_notes', 'apexnav_countdowns',
  'apexnav_favorite_quotes', 'apexnav_worldclock_cities', 'apexnav_user_city', 'apexnav_widget_config'] as const;
const scopedKey = (key: string, username = getAuthSession()?.username) => `${key}:${username ? `user:${encodeURIComponent(username)}` : 'guest'}`;
export const readProfileValue = (key: string): string | null => localStorage.getItem(scopedKey(key));
export const writeProfileValue = (key: string, value: string): void => { localStorage.setItem(scopedKey(key), value); };

export function exportProfile(): Record<string, string> {
  return Object.fromEntries(PROFILE_KEYS.flatMap((key) => {
    const value = readProfileValue(key);
    return value === null ? [] : [[key, key === 'apexnav_countdowns' ? normalizeCountdowns(value) : value]];
  }));
}

function normalizeCountdowns(raw: string): string {
  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return raw;
    return JSON.stringify(items.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const { emoji, ...event } = item;
      return { ...event, icon: normalizeCountdownIcon(event.icon || emoji) };
    }));
  } catch { return raw; }
}

export function validateProfile(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('小组件备份格式无效');
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(PROFILE_KEYS as readonly string[]).includes(key) || typeof raw !== 'string' || raw.length > 1000000) throw new Error('备份包含不支持的小组件配置');
    if (key === 'apexnav_notes' || key === 'apexnav_user_city') { result[key] = raw; continue; }
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length > 10000) throw new Error('小组件条目格式无效');
    for (const item of items) {
      if (key === 'apexnav_worldclock_cities') {
        if (typeof item !== 'string') throw new Error('世界时钟配置无效');
        continue;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('小组件条目格式无效');
      const stringFields = key === 'apexnav_favorite_quotes' ? ['text', 'from']
        : key === 'apexnav_countdowns' ? ['id', 'name', 'date']
        : key === 'apexnav_widget_config' ? ['id'] : ['id', key === 'apexnav_todos' ? 'content' : 'text'];
      if (stringFields.some((field) => typeof item[field] !== 'string')) throw new Error('小组件条目缺少必填字段');
      if (key.includes('todo') && typeof item.completed !== 'boolean') throw new Error('待办状态无效');
      if (key === 'apexnav_countdowns' && (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(Date.parse(item.date)))) throw new Error('倒计时日期无效');
      if (key === 'apexnav_favorite_quotes' && item.enText !== undefined && typeof item.enText !== 'string') throw new Error('收藏语录格式无效');
      if (key === 'apexnav_countdowns' && (item.emoji !== undefined && typeof item.emoji !== 'string' || item.icon !== undefined && typeof item.icon !== 'string')) throw new Error('倒计时图标无效');
      if (key === 'apexnav_widget_config' && (typeof item.enabled !== 'boolean' || !Number.isFinite(item.order))) throw new Error('小组件排序无效');
    }
    result[key] = key === 'apexnav_countdowns' ? normalizeCountdowns(raw) : raw;
  }
  return result;
}

export function restoreProfile(value: unknown): void {
  const profile = validateProfile(value);
  for (const key of PROFILE_KEYS) {
    if (Object.hasOwn(profile, key)) writeProfileValue(key, profile[key]);
    else localStorage.removeItem(scopedKey(key));
  }
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

export function hasLegacyProfile(): boolean {
  return PROFILE_KEYS.some((key) => localStorage.getItem(key) !== null);
}

export function importLegacyProfile(): void {
  if (!getAuthSession()) throw new Error('请先登录');
  const legacy = Object.fromEntries(PROFILE_KEYS.flatMap((key) => {
    const value = localStorage.getItem(key);
    return value === null ? [] : [[key, value]];
  }));
  restoreProfile({ ...exportProfile(), ...validateProfile(legacy) });
  // Keep the original in an explicit archive rather than silently assigning it to every account.
  localStorage.setItem('apexnav_legacy_profile_archive', JSON.stringify(legacy));
  for (const key of PROFILE_KEYS) localStorage.removeItem(key);
}

export function copyProfile(from: string, to: string): void {
  for (const key of PROFILE_KEYS) {
    const value = localStorage.getItem(scopedKey(key, from));
    if (value !== null) localStorage.setItem(scopedKey(key, to), value);
  }
}
