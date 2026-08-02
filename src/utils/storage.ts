import type { Category, Site, TodoItem } from '../types';

const STORAGE_KEYS = {
  todos: 'apexnav_todos',
  notes: 'apexnav_notes',
  theme: 'apexnav_theme',
  engine: 'apexnav_engine',
};

// ─────────────────────────────────────────────────────────
// Default demo data (generic, open-source friendly)
// Preserved for unauthenticated guests. Never deleted!
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
  { id: 's01', category_id: '1', name: 'ChatGPT',    url: 'https://chatgpt.com/',              icon: 'https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com',       description: 'chatgpt.com' },
  { id: 's02', category_id: '1', name: 'Gemini',     url: 'https://gemini.google.com/',        icon: 'https://favicon.im/gemini.google.com?larger=true',                  description: 'gemini.google.com' },
  { id: 's03', category_id: '1', name: 'DeepSeek',   url: 'https://chat.deepseek.com/',        icon: 'https://favicon.im/chat.deepseek.com?larger=true',                  description: 'chat.deepseek.com' },
  { id: 's04', category_id: '1', name: 'Claude',     url: 'https://claude.ai/',                icon: 'https://www.google.com/s2/favicons?sz=64&domain=claude.ai',         description: 'claude.ai' },
  { id: 's05', category_id: '1', name: 'Perplexity', url: 'https://www.perplexity.ai/',        icon: 'https://www.google.com/s2/favicons?sz=64&domain=perplexity.ai',     description: 'perplexity.ai' },

  // ── 开发设计 ──
  { id: 's06', category_id: '2', name: 'GitHub',      url: 'https://github.com/',               icon: 'https://www.google.com/s2/favicons?sz=64&domain=github.com',        description: 'github.com' },
  { id: 's07', category_id: '2', name: 'Dribbble',    url: 'https://dribbble.com/',             icon: 'https://www.google.com/s2/favicons?sz=64&domain=dribbble.com',      description: 'dribbble.com' },
  { id: 's08', category_id: '2', name: 'Figma',       url: 'https://figma.com/',                icon: 'https://www.google.com/s2/favicons?sz=64&domain=figma.com',         description: 'figma.com' },
  { id: 's09', category_id: '2', name: 'iconfont',    url: 'https://www.iconfont.cn/',          icon: 'https://www.google.com/s2/favicons?sz=64&domain=iconfont.cn',       description: 'iconfont.cn' },
  { id: 's10', category_id: '2', name: 'Lucide',      url: 'https://lucide.dev/',               icon: 'https://www.google.com/s2/favicons?sz=64&domain=lucide.dev',        description: 'lucide.dev' },
  { id: 's11', category_id: '2', name: 'React Bits',  url: 'https://reactbits.dev/',            icon: 'https://www.google.com/s2/favicons?sz=64&domain=reactbits.dev',     description: 'reactbits.dev' },
  { id: 's12', category_id: '2', name: 'uiverse',     url: 'https://uiverse.io/',               icon: 'https://www.google.com/s2/favicons?sz=64&domain=uiverse.io',        description: 'uiverse.io' },
  { id: 's13', category_id: '2', name: 'Vercel',      url: 'https://vercel.com/',               icon: 'https://www.google.com/s2/favicons?sz=64&domain=vercel.com',        description: 'vercel.com' },
  { id: 's14', category_id: '2', name: 'Cloudflare',  url: 'https://dash.cloudflare.com/',     icon: 'https://www.google.com/s2/favicons?sz=64&domain=cloudflare.com',    description: 'cloudflare.com' },
  { id: 's15', category_id: '2', name: 'MDN',         url: 'https://developer.mozilla.org/',   icon: 'https://www.google.com/s2/favicons?sz=64&domain=mozilla.org',       description: 'developer.mozilla.org' },

  // ── 社区论坛 ──
  { id: 's16', category_id: '3', name: 'LINUX DO',       url: 'https://linux.do/',              icon: 'https://www.google.com/s2/favicons?sz=64&domain=linux.do',          description: 'linux.do' },
  { id: 's17', category_id: '3', name: 'V2EX',           url: 'https://www.v2ex.com/',          icon: 'https://www.google.com/s2/favicons?sz=64&domain=v2ex.com',          description: 'v2ex.com' },
  { id: 's18', category_id: '3', name: 'Discord',        url: 'https://discord.com/',           icon: 'https://www.google.com/s2/favicons?sz=64&domain=discord.com',       description: 'discord.com' },
  { id: 's19', category_id: '3', name: '掘金',           url: 'https://juejin.cn/',             icon: 'https://www.google.com/s2/favicons?sz=64&domain=juejin.cn',         description: 'juejin.cn' },
  { id: 's20', category_id: '3', name: 'Stack Overflow', url: 'https://stackoverflow.com/',     icon: 'https://www.google.com/s2/favicons?sz=64&domain=stackoverflow.com', description: 'stackoverflow.com' },

  // ── 效率工具 ──
  { id: 's21', category_id: '4', name: 'Notion',       url: 'https://notion.so/',               icon: 'https://www.google.com/s2/favicons?sz=64&domain=notion.so',         description: 'notion.so' },
  { id: 's22', category_id: '4', name: 'Excalidraw',   url: 'https://excalidraw.com/',          icon: 'https://www.google.com/s2/favicons?sz=64&domain=excalidraw.com',    description: 'excalidraw.com' },
  { id: 's23', category_id: '4', name: 'Google Drive', url: 'https://drive.google.com/',        icon: 'https://www.google.com/s2/favicons?sz=64&domain=drive.google.com',  description: 'drive.google.com' },
  { id: 's24', category_id: '4', name: 'Poe',          url: 'https://poe.com/',                 icon: 'https://www.google.com/s2/favicons?sz=64&domain=poe.com',           description: 'poe.com' },

  // ── 学习资源 ──
  { id: 's25', category_id: '5', name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/',    icon: 'https://www.google.com/s2/favicons?sz=64&domain=freecodecamp.org',  description: 'freecodecamp.org' },
  { id: 's26', category_id: '5', name: 'Coursera',     url: 'https://www.coursera.org/',        icon: 'https://www.google.com/s2/favicons?sz=64&domain=coursera.org',      description: 'coursera.org' },
  { id: 's27', category_id: '5', name: 'YouTube',      url: 'https://www.youtube.com/',         icon: 'https://www.google.com/s2/favicons?sz=64&domain=youtube.com',       description: 'youtube.com' },
  { id: 's28', category_id: '5', name: 'B站',          url: 'https://www.bilibili.com/',        icon: 'https://www.google.com/s2/favicons?sz=64&domain=bilibili.com',      description: 'bilibili.com' },

  // ── 自媒体 ──
  { id: 's29', category_id: '6', name: '微信公众平台', url: 'https://mp.weixin.qq.com/',        icon: 'https://www.google.com/s2/favicons?sz=64&domain=mp.weixin.qq.com',  description: 'mp.weixin.qq.com' },
  { id: 's30', category_id: '6', name: '抖音创作者',   url: 'https://creator.douyin.com/',      icon: 'https://www.google.com/s2/favicons?sz=64&domain=creator.douyin.com', description: 'creator.douyin.com' },
  { id: 's31', category_id: '6', name: '小红书',       url: 'https://creator.xiaohongshu.com/', icon: 'https://www.google.com/s2/favicons?sz=64&domain=xiaohongshu.com',   description: 'xiaohongshu.com' },
];

export const DEFAULT_NODES = [
  { id: 'demo_node', name: '示例网站', url: 'https://www.cloudflare.com', status: 'online', latency: 24 }
];

export const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', content: '欢迎使用 ApexNav 苹果风极简导航', completed: true },
  { id: '2', content: '体验 4 大搜索引擎与搜索自动联想', completed: false },
];

// Account-Scoped Storage Methods
export const getStoredCategories = (username?: string | null): Category[] => {
  if (!username) return DEFAULT_CATEGORIES;
  try {
    const key = `apexnav_categories_${username.toLowerCase()}`;
    const data = localStorage.getItem(key);
    return data !== null ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveCategories = (categories: Category[], username?: string | null): void => {
  if (!username) return;
  const key = `apexnav_categories_${username.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(categories));
};

export const getStoredSites = (username?: string | null): Site[] => {
  if (!username) return DEFAULT_SITES;
  try {
    const key = `apexnav_sites_${username.toLowerCase()}`;
    const data = localStorage.getItem(key);
    return data !== null ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveSites = (sites: Site[], username?: string | null): void => {
  if (!username) return;
  const key = `apexnav_sites_${username.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(sites));
};

export const getStoredNodes = (username?: string | null): any[] => {
  if (!username) return DEFAULT_NODES;
  try {
    const key = `apexnav_nodes_${username.toLowerCase()}`;
    const data = localStorage.getItem(key);
    return data !== null ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveNodes = (nodes: any[], username?: string | null): void => {
  if (!username) return;
  const key = `apexnav_nodes_${username.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(nodes));
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
export const syncUserWithD1 = async (
  username: string | null,
  categories: Category[],
  sites: Site[],
  nodes: any[] = []
): Promise<boolean> => {
  if (!username) return false;
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, categories, sites, nodes }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
};

export const fetchUserD1Data = async (
  username: string | null
): Promise<{ categories: Category[]; sites: Site[]; nodes: any[] } | null> => {
  if (!username) return null;
  try {
    const res = await fetch(`/api/data?username=${encodeURIComponent(username.toLowerCase())}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.categories) && Array.isArray(data.sites)) {
      saveCategories(data.categories, username);
      saveSites(data.sites, username);
      if (Array.isArray(data.nodes)) {
        saveNodes(data.nodes, username);
      }
      return { categories: data.categories, sites: data.sites, nodes: data.nodes || [] };
    }
    return null;
  } catch {
    return null;
  }
};
