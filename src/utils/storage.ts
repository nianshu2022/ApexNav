import type { Category, Site, TodoItem, WidgetConfig, CountdownEvent } from '../types';
import { authenticatedFetch, clearAuthSession, getAuthSession, isCurrentSession } from './authSession';

const STORAGE_KEYS = {
  todos: 'apexnav_todos',
  notes: 'apexnav_notes',
  theme: 'apexnav_theme',
  engine: 'apexnav_engine',
  widgets: 'apexnav_widget_config',
  countdowns: 'apexnav_countdowns',
  apiBaseUrl: 'apexnav_api_base_url',
};

export const getApiBaseUrl = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.apiBaseUrl);
    if (saved) return saved.replace(/\/+$/, '');
  } catch {}
  return '';
};

export const saveApiBaseUrl = (url: string): void => {
  const clean = url.trim().replace(/\/+$/, '');
  const changed = clean !== getApiBaseUrl();
  localStorage.setItem(STORAGE_KEYS.apiBaseUrl, clean);
  if (changed) clearAuthSession();
};

export const buildApiUrl = (endpointPath: string): string => {
  const base = getApiBaseUrl();
  const path = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  if (base) {
    return `${base}${path}`;
  }
  return path;
};

// ─────────────────────────────────────────────────────────
// Default demo data (generic, open-source friendly)
// Preserved for unauthenticated guests ONLY.
// ─────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'AI',     icon: '🤖', sort_order: 0 },
  { id: '2', name: '开发设计', icon: '💻', sort_order: 1 },
  { id: '3', name: '社区论坛', icon: '💬', sort_order: 2 },
  { id: '4', name: '效率工具', icon: '🛠️', sort_order: 3 },
  { id: '5', name: '学习资源', icon: '📚', sort_order: 4 },
  { id: '6', name: '自媒体',  icon: '📢', sort_order: 5 },
];

export const DEFAULT_SITES: Site[] = [
  // ── AI ──
  { id: 's01', category_id: '1', name: 'ChatGPT',    url: 'https://chatgpt.com/',              icon: 'https://www.google.com/s2/favicons?sz=128&domain=chatgpt.com',       description: 'chatgpt.com' },
  { id: 's02', category_id: '1', name: 'Gemini',     url: 'https://gemini.google.com/',        icon: 'https://www.google.com/s2/favicons?sz=128&domain=gemini.google.com',  description: 'gemini.google.com' },
  { id: 's03', category_id: '1', name: 'DeepSeek',   url: 'https://chat.deepseek.com/',        icon: 'https://www.google.com/s2/favicons?sz=128&domain=deepseek.com',       description: 'chat.deepseek.com' },
  { id: 's04', category_id: '1', name: 'Claude',     url: 'https://claude.ai/',                icon: 'https://www.google.com/s2/favicons?sz=128&domain=claude.ai',         description: 'claude.ai' },
  { id: 's05', category_id: '1', name: 'Perplexity', url: 'https://www.perplexity.ai/',        icon: 'https://www.google.com/s2/favicons?sz=128&domain=perplexity.ai',     description: 'perplexity.ai' },

  // ── 开发设计 ──
  { id: 's06', category_id: '2', name: 'GitHub',      url: 'https://github.com/',               icon: 'https://www.google.com/s2/favicons?sz=128&domain=github.com',        description: 'github.com' },
  { id: 's07', category_id: '2', name: 'Dribbble',    url: 'https://dribbble.com/',             icon: 'https://www.google.com/s2/favicons?sz=128&domain=dribbble.com',      description: 'dribbble.com' },
  { id: 's08', category_id: '2', name: 'Figma',       url: 'https://figma.com/',                icon: 'https://www.google.com/s2/favicons?sz=128&domain=figma.com',         description: 'figma.com' },
  { id: 's09', category_id: '2', name: 'iconfont',    url: 'https://www.iconfont.cn/',          icon: 'https://www.google.com/s2/favicons?sz=128&domain=iconfont.cn',       description: 'iconfont.cn' },
  { id: 's10', category_id: '2', name: 'Lucide',      url: 'https://lucide.dev/',               icon: 'https://www.google.com/s2/favicons?sz=128&domain=lucide.dev',        description: 'lucide.dev' },
  { id: 's11', category_id: '2', name: 'React Bits',  url: 'https://reactbits.dev/',            icon: 'https://www.google.com/s2/favicons?sz=128&domain=reactbits.dev',     description: 'reactbits.dev' },
  { id: 's12', category_id: '2', name: 'uiverse',     url: 'https://uiverse.io/',               icon: 'https://www.google.com/s2/favicons?sz=128&domain=uiverse.io',        description: 'uiverse.io' },
  { id: 's13', category_id: '2', name: 'Vercel',      url: 'https://vercel.com/',               icon: 'https://www.google.com/s2/favicons?sz=128&domain=vercel.com',        description: 'vercel.com' },
  { id: 's14', category_id: '2', name: 'Cloudflare',  url: 'https://dash.cloudflare.com/',     icon: 'https://www.google.com/s2/favicons?sz=128&domain=cloudflare.com',    description: 'cloudflare.com' },
  { id: 's15', category_id: '2', name: 'MDN',         url: 'https://developer.mozilla.org/',   icon: 'https://www.google.com/s2/favicons?sz=128&domain=mozilla.org',       description: 'developer.mozilla.org' },

  // ── 社区论坛 ──
  { id: 's16', category_id: '3', name: 'LINUX DO',       url: 'https://linux.do/',              icon: 'https://www.google.com/s2/favicons?sz=128&domain=linux.do',          description: 'linux.do' },
  { id: 's17', category_id: '3', name: 'V2EX',           url: 'https://www.v2ex.com/',          icon: 'https://www.google.com/s2/favicons?sz=128&domain=v2ex.com',          description: 'v2ex.com' },
  { id: 's18', category_id: '3', name: 'Discord',        url: 'https://discord.com/',           icon: 'https://www.google.com/s2/favicons?sz=128&domain=discord.com',       description: 'discord.com' },
  { id: 's19', category_id: '3', name: '掘金',           url: 'https://juejin.cn/',             icon: 'https://www.google.com/s2/favicons?sz=128&domain=juejin.cn',         description: 'juejin.cn' },
  { id: 's20', category_id: '3', name: 'Stack Overflow', url: 'https://stackoverflow.com/',     icon: 'https://www.google.com/s2/favicons?sz=128&domain=stackoverflow.com', description: 'stackoverflow.com' },

  // ── 效率工具 ──
  { id: 's21', category_id: '4', name: 'Notion',       url: 'https://notion.so/',               icon: 'https://www.google.com/s2/favicons?sz=128&domain=notion.so',         description: 'notion.so' },
  { id: 's22', category_id: '4', name: 'Excalidraw',   url: 'https://excalidraw.com/',          icon: 'https://www.google.com/s2/favicons?sz=128&domain=excalidraw.com',    description: 'excalidraw.com' },
  { id: 's23', category_id: '4', name: 'Google Drive', url: 'https://drive.google.com/',        icon: 'https://www.google.com/s2/favicons?sz=128&domain=drive.google.com',  description: 'drive.google.com' },
  { id: 's24', category_id: '4', name: 'Poe',          url: 'https://poe.com/',                 icon: 'https://www.google.com/s2/favicons?sz=128&domain=poe.com',           description: 'poe.com' },

  // ── 学习资源 ──
  { id: 's25', category_id: '5', name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/',    icon: 'https://www.google.com/s2/favicons?sz=128&domain=freecodecamp.org',  description: 'freecodecamp.org' },
  { id: 's26', category_id: '5', name: 'Coursera',     url: 'https://www.coursera.org/',        icon: 'https://www.google.com/s2/favicons?sz=128&domain=coursera.org',      description: 'coursera.org' },
  { id: 's27', category_id: '5', name: 'YouTube',      url: 'https://www.youtube.com/',         icon: 'https://www.google.com/s2/favicons?sz=128&domain=youtube.com',       description: 'youtube.com' },
  { id: 's28', category_id: '5', name: 'B站',          url: 'https://www.bilibili.com/',        icon: 'https://www.google.com/s2/favicons?sz=128&domain=bilibili.com',      description: 'bilibili.com' },

  // ── 自媒体 ──
  { id: 's29', category_id: '6', name: '微信公众平台', url: 'https://mp.weixin.qq.com/',        icon: 'https://www.google.com/s2/favicons?sz=128&domain=mp.weixin.qq.com',  description: 'mp.weixin.qq.com' },
  { id: 's30', category_id: '6', name: '抖音创作者',   url: 'https://creator.douyin.com/',      icon: 'https://www.google.com/s2/favicons?sz=128&domain=creator.douyin.com', description: 'creator.douyin.com' },
  { id: 's31', category_id: '6', name: '小红书',       url: 'https://creator.xiaohongshu.com/', icon: 'https://www.google.com/s2/favicons?sz=128&domain=xiaohongshu.com',   description: 'xiaohongshu.com' },
];

export const DEFAULT_NODES = [
  { id: 'demo_node', name: '示例网站', url: 'https://www.cloudflare.com', status: 'online', latency: 24 }
];

export const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', content: '欢迎使用 ApexNav 苹果风极简导航', completed: true },
  { id: '2', content: '体验 4 大搜索引擎与搜索自动联想', completed: false },
];

// Helper to strictly sanitize username so "null", "undefined", or empty strings return null (Guest mode)
export function sanitizeUsername(username?: string | null): string | null {
  if (!username) return null;
  const clean = username.trim().toLowerCase();
  if (clean === '' || clean === 'null' || clean === 'undefined') return null;
  return clean;
}

// Account-Scoped Storage Methods
export const getStoredCategories = (username?: string | null): Category[] => {
  const un = sanitizeUsername(username);
  if (!un) return DEFAULT_CATEGORIES;
  try {
    const key = `apexnav_categories_${un}`;
    const data = localStorage.getItem(key);
    if (data !== null) return JSON.parse(data);
    // Initialize new account with clean empty workspace
    saveCategories([], un);
    return [];
  } catch {
    return [];
  }
};

export const saveCategories = (categories: Category[], username?: string | null): void => {
  const un = sanitizeUsername(username);
  if (!un) return;
  const key = `apexnav_categories_${un}`;
  localStorage.setItem(key, JSON.stringify(categories));
};

export const getStoredSites = (username?: string | null): Site[] => {
  const un = sanitizeUsername(username);
  if (!un) return DEFAULT_SITES;
  try {
    const key = `apexnav_sites_${un}`;
    const data = localStorage.getItem(key);
    if (data !== null) return JSON.parse(data);
    // Initialize new account with clean empty workspace
    saveSites([], un);
    return [];
  } catch {
    return [];
  }
};

export const saveSites = (sites: Site[], username?: string | null): void => {
  const un = sanitizeUsername(username);
  if (!un) return;
  const key = `apexnav_sites_${un}`;
  localStorage.setItem(key, JSON.stringify(sites));
};

export const getStoredNodes = (username?: string | null): any[] => {
  const un = sanitizeUsername(username);
  if (!un) return DEFAULT_NODES;
  try {
    const key = `apexnav_nodes_${un}`;
    const data = localStorage.getItem(key);
    if (data !== null) return JSON.parse(data);
    // Initialize new account with clean empty workspace
    saveNodes([], un);
    return [];
  } catch {
    return [];
  }
};

export const saveNodes = (nodes: any[], username?: string | null): void => {
  const un = sanitizeUsername(username);
  if (!un) return;
  const key = `apexnav_nodes_${un}`;
  localStorage.setItem(key, JSON.stringify(nodes));
  window.dispatchEvent(new CustomEvent('apexnav_nodes_change', { detail: { username: un } }));
};

export const getStoredTodos = (): TodoItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.todos);
    return data ? JSON.parse(data) : DEFAULT_TODOS;
  } catch {
    return DEFAULT_TODOS;
  }
};

export const saveTodos = (todos: TodoItem[]): void => {
  localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
};

export const getStoredNotes = (): string => {
  return localStorage.getItem(STORAGE_KEYS.notes) || '📝 在这里记录临时的文字、代码片段或待办想法...';
};

export const saveNotes = (notes: string): void => {
  localStorage.setItem(STORAGE_KEYS.notes, notes);
};

/** Account-bound Cloudflare D1 Sync Helpers */
const writeQueues = new Map<string, Promise<boolean>>();
const revisions = new Map<string, number>();

async function syncFields(username: string | null, fields: { categories?: Category[]; sites?: Site[]; nodes?: any[] }): Promise<boolean> {
  const un = sanitizeUsername(username);
  const session = getAuthSession();
  if (!un || !session || session.username !== un) return false;
  const key = `${session.apiBaseUrl}::${un}`;
  revisions.set(key, (revisions.get(key) || 0) + 1);
  const body = JSON.stringify({ username: un, ...fields });
  const pending = (writeQueues.get(key) || Promise.resolve(true)).then(async () => {
    try {
      const res = await authenticatedFetch('/api/data', session, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      });
      if (!res?.ok) return false;
      const data = await res.json();
      return data.success === true && data.isD1Bound === true;
    } catch { return false; }
  });
  writeQueues.set(key, pending);
  void pending.finally(() => { if (writeQueues.get(key) === pending) writeQueues.delete(key); });
  return pending;
}

export const syncUserWithD1 = (
  username: string | null, categories: Category[], sites: Site[], nodes?: any[]
): Promise<boolean> => syncFields(username, { categories, sites, ...(nodes === undefined ? {} : { nodes }) });

export const syncNodesWithD1 = (username: string | null, nodes: any[]): Promise<boolean> =>
  syncFields(username, { nodes });

export const fetchUserD1Data = async (
  username: string | null, signal?: AbortSignal
): Promise<{ categories: Category[]; sites: Site[]; nodes: any[] } | null> => {
  const un = sanitizeUsername(username);
  const session = getAuthSession();
  if (!un || !session || session.username !== un || signal?.aborted) return null;
  const key = `${session.apiBaseUrl}::${un}`;
  // Let already queued edits finish before reading; ignore reads overtaken by a later local edit.
  while (writeQueues.has(key)) {
    if (!await writeQueues.get(key) || signal?.aborted || !isCurrentSession(session)) return null;
  }
  const revision = revisions.get(key) || 0;
  try {
    const res = await authenticatedFetch(`/api/data?username=${encodeURIComponent(un)}`, session, { signal });
    if (!res?.ok) return null;
    const data = await res.json();
    if (signal?.aborted || !isCurrentSession(session) || revision !== (revisions.get(key) || 0)) return null;
    if (data.success && data.isD1Bound && !data.isNewUser && Array.isArray(data.categories) && Array.isArray(data.sites)) {
      saveCategories(data.categories, un);
      saveSites(data.sites, un);
      if (Array.isArray(data.nodes)) saveNodes(data.nodes, un);
      return { categories: data.categories, sites: data.sites, nodes: data.nodes || [] };
    }
    return null;
  } catch { return null; }
};

// ── Widget Config ──────────────────────────────────────────
const DEFAULT_WIDGET_CONFIG: WidgetConfig = [
  { id: 'weather',    enabled: true, order: 0 },
  { id: 'quote',      enabled: true, order: 1 },
  { id: 'calendar',   enabled: true, order: 2 },
  { id: 'status',     enabled: true, order: 3 },
  { id: 'worldclock', enabled: true, order: 4 },
  { id: 'countdown',  enabled: true, order: 5 },
  { id: 'todo',       enabled: true, order: 6 },
  { id: 'currency',   enabled: true, order: 7 },
];


export const getWidgetConfig = (): WidgetConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.widgets);
    if (!data) return DEFAULT_WIDGET_CONFIG;
    const parsed: WidgetConfig = JSON.parse(data);
    // Merge: ensure all known widget IDs exist (forward-compat with new widgets)
    const knownIds = DEFAULT_WIDGET_CONFIG.map((w) => w.id);
    const parsedIds = parsed.map((w) => w.id);
    const merged = [...parsed];
    knownIds.forEach((id) => {
      if (!parsedIds.includes(id)) {
        const def = DEFAULT_WIDGET_CONFIG.find((w) => w.id === id)!;
        merged.push(def);
      }
    });
    return merged;
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
};

export const saveWidgetConfig = (config: WidgetConfig): void => {
  localStorage.setItem(STORAGE_KEYS.widgets, JSON.stringify(config));
};

// ── Countdown Events ───────────────────────────────────────
export const DEFAULT_COUNTDOWN_EVENTS: CountdownEvent[] = [
  { id: 'cde_1', name: '元旦', date: `${new Date().getFullYear() + 1}-01-01`, emoji: '🎆' },
];

export const getCountdownEvents = (): CountdownEvent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.countdowns);
    return data ? JSON.parse(data) : DEFAULT_COUNTDOWN_EVENTS;
  } catch {
    return DEFAULT_COUNTDOWN_EVENTS;
  }
};

export const saveCountdownEvents = (events: CountdownEvent[]): void => {
  localStorage.setItem(STORAGE_KEYS.countdowns, JSON.stringify(events));
};
