export const CATEGORY_ICON_IDS = [
  'folder', 'bot', 'code', 'messages', 'tool', 'book', 'megaphone', 'rocket',
  'zap', 'palette', 'pin', 'star', 'flame', 'game', 'music', 'globe',
  'film', 'newspaper', 'briefcase', 'shopping', 'wallet', 'compass',
] as const;

export type CategoryIconId = typeof CATEGORY_ICON_IDS[number];

const LEGACY_CATEGORY_ICONS: Record<string, CategoryIconId> = {
  '📁': 'folder', '📂': 'folder', '🔖': 'pin', '🤖': 'bot', '💻': 'code',
  '💬': 'messages', '🛠️': 'tool', '🛠': 'tool', '📚': 'book', '📢': 'megaphone',
  '🚀': 'rocket', '⚡': 'zap', '🎨': 'palette', '📌': 'pin', '⭐': 'star',
  '🔥': 'flame', '🎮': 'game', '🎵': 'music', '🌐': 'globe', '🎬': 'film',
  '📰': 'newspaper', '💼': 'briefcase', '🛒': 'shopping', '💰': 'wallet',
  '🍀': 'compass',
};

export function guessCategoryIcon(name: string): CategoryIconId {
  const n = name.trim().toLowerCase();
  if (/ai|人工智能|gpt|claude|deepseek|大模型|llm|openai|prompt/i.test(n)) return 'bot';
  if (/开发|编程|代码|程序|github|前端|后端|git|dev|code|tech|架构|api|linux|npm|vue|react/i.test(n)) return 'code';
  if (/设计|ui|ux|figma|dribbble|图标|素材|插画|壁纸|配色|灵感|design|art|behance/i.test(n)) return 'palette';
  if (/工具|效率|实用|转换|查询|生成|在线|tool|util|productivity/i.test(n)) return 'tool';
  if (/社区|论坛|博客|知乎|贴吧|v2ex|掘金|reddit|social|community|weibo|twitter|x\.com/i.test(n)) return 'messages';
  if (/视频|电影|影视|动漫|动画|b站|bilibili|youtube|media|tv|live|stream/i.test(n)) return 'film';
  if (/音乐|音频|播客|电台|网易云|music|song|audio|podcast/i.test(n)) return 'music';
  if (/资讯|新闻|日报|周刊|订阅|阅读|文章|rss|news|read|feed/i.test(n)) return 'newspaper';
  if (/学习|知识|文档|教程|课程|书籍|大学|考研|learn|study|doc|wiki/i.test(n)) return 'book';
  if (/工作|办公|飞书|钉钉|协作|文档|表格|notion|office|work/i.test(n)) return 'briefcase';
  if (/购物|电商|淘宝|京东|海淘|优惠|买|shop|store|mall|amazon/i.test(n)) return 'shopping';
  if (/游戏|电竞|steam|epic|game|play/i.test(n)) return 'game';
  if (/金融|理财|股票|基金|银行|币|资产|finance|crypto|bank/i.test(n)) return 'wallet';
  if (/生活|健康|旅游|美食|出行|地图|life|travel|food/i.test(n)) return 'compass';
  if (/搜索|引擎|导航|门户|search|nav/i.test(n)) return 'globe';
  if (/书签|常用|收藏|favorite|star|pin|常用推荐/i.test(n)) return 'star';
  return 'folder';
}

export function normalizeCategoryIcon(value: string | undefined, name = ''): CategoryIconId {
  if (value && (CATEGORY_ICON_IDS as readonly string[]).includes(value)) return value as CategoryIconId;
  if (value && LEGACY_CATEGORY_ICONS[value]) return LEGACY_CATEGORY_ICONS[value];
  return guessCategoryIcon(name);
}

export const COUNTDOWN_ICON_IDS = [
  'party', 'cake', 'sparkles', 'heart', 'moon', 'star', 'rocket',
  'umbrella', 'graduation', 'briefcase', 'house', 'calendar',
] as const;

export type CountdownIconId = typeof COUNTDOWN_ICON_IDS[number];

const LEGACY_COUNTDOWN_ICONS: Record<string, CountdownIconId> = {
  '🎆': 'party', '🎉': 'party', '🎊': 'party', '🎂': 'cake',
  '❤️': 'heart', '❤': 'heart', '🌙': 'moon', '⭐': 'star',
  '🚀': 'rocket', '🏖️': 'umbrella', '🏖': 'umbrella',
  '🎓': 'graduation', '💼': 'briefcase', '🏠': 'house',
};

export function normalizeCountdownIcon(value?: string): CountdownIconId {
  if (value && (COUNTDOWN_ICON_IDS as readonly string[]).includes(value)) return value as CountdownIconId;
  return value && LEGACY_COUNTDOWN_ICONS[value] || 'calendar';
}
