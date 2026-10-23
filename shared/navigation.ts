import type { Category, Site } from '../src/types';
import { normalizeCategoryIcon } from './iconCatalog';

export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
export interface NavigationData { categories: Category[]; sites: Site[] }
export interface MonitoredNode {
  id: string; name: string; url: string;
  status: 'online' | 'offline' | 'checking'; latency?: number;
}

function record(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('数据条目必须是对象');
  return value as Record<string, any>;
}

function text(value: unknown, field: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${field}格式无效`);
  return value;
}

export function safeWebUrl(value: unknown): string {
  const input = text(value, '网址', 8192).trim();
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('网址必须是完整的 HTTP 或 HTTPS 地址'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('网址必须使用 HTTP 或 HTTPS，且不能包含账号密码');
  return input;
}

function optionalText(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field}格式无效`);
  return value;
}

function order(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('排序值无效');
  return value;
}

function unique<T extends { id: string }>(values: unknown, limit: number, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(values) || values.length > limit) throw new Error(`数据必须是数组且不超过 ${limit} 条`);
  const ids = new Set<string>();
  return values.map((value) => {
    const item = parse(value);
    if (ids.has(item.id)) throw new Error(`存在重复 ID：${item.id}`);
    ids.add(item.id);
    return item;
  });
}

export function validateCategories(value: unknown): Category[] {
  return unique(value, 2000, (item) => {
    const r = record(item);
    return { id: text(r.id, '分类 ID', 200), name: text(r.name, '分类名称'),
      icon: r.icon === undefined ? undefined : normalizeCategoryIcon(optionalText(r.icon, '分类图标', 256), r.name), sort_order: order(r.sort_order) };
  });
}

export function validateSites(value: unknown): Site[] {
  return unique(value, 10000, (item) => {
    const r = record(item);
    const icon = optionalText(r.icon, '网址图标', 200000);
    if (icon && !/^data:image\/(?:png|jpeg|jpg|gif|webp|x-icon|vnd\.microsoft\.icon);base64,[a-z0-9+/=\s]+$/i.test(icon)) safeWebUrl(icon);
    if (r.pinned !== undefined && typeof r.pinned !== 'boolean') throw new Error('置顶状态无效');
    return { id: text(r.id, '网址 ID', 200), category_id: text(r.category_id, '分类 ID', 200),
      name: text(r.name, '网址名称'), url: safeWebUrl(r.url), icon,
      description: optionalText(r.description, '网址描述', 5000), sort_order: order(r.sort_order), pinned: r.pinned };
  });
}

export function validateNavigation(categories: unknown, sites: unknown, recoverOrphans = false): NavigationData {
  const result = { categories: validateCategories(categories), sites: validateSites(sites) };
  const ids = new Set(result.categories.map((c) => c.id));
  if (result.sites.some((site) => !ids.has(site.category_id))) {
    if (!recoverOrphans) throw new Error('存在未归属到有效分类的网址，请先修复分类');
    // Older versions could delete a category without its sites. Recover their original category IDs without losing links.
    for (const site of result.sites) if (!ids.has(site.category_id)) {
      result.categories.push({ id: site.category_id, name: '未分类（恢复的网址）', icon: 'folder' });
      ids.add(site.category_id);
    }
  }
  return result;
}

export function validateNodes(value: unknown): MonitoredNode[] {
  return unique(value, 200, (item) => {
    const r = record(item);
    if (!['online', 'offline', 'checking'].includes(r.status)) throw new Error('节点状态无效');
    if (r.latency !== undefined && (typeof r.latency !== 'number' || !Number.isFinite(r.latency) || r.latency < 0)) throw new Error('节点延迟无效');
    return { id: text(r.id, '节点 ID', 200), name: text(r.name, '节点名称'), url: safeWebUrl(r.url), status: r.status, latency: r.latency };
  });
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
