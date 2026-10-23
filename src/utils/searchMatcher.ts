import PinyinMatch from 'pinyin-match';
import type { Site } from '../types';

export type MatchType =
  | 'name_exact'
  | 'name_prefix'
  | 'name_includes'
  | 'name_pinyin'
  | 'alias'
  | 'url_domain'
  | 'url_includes'
  | 'desc';

export interface SiteMatchResult {
  matched: boolean;
  score: number;
  matchType?: MatchType;
  matchLabel?: string;
}

export type MatchedSite = Site & { matchType?: MatchType; matchLabel?: string };

/**
 * Common Chinese website aliases and abbreviations mapping
 */
const COMMON_ALIASES: Record<string, string[]> = {
  'b站': ['bilibili', '哔哩哔哩', 'blbl'],
  '哔哩哔哩': ['bilibili', 'b站', 'blbl'],
  '贴吧': ['tieba', '百度贴吧', 'tb'],
  'qq': ['腾讯', 'tencent', 'tx'],
  '腾讯': ['qq', 'tencent', 'tx'],
  '微信': ['weixin', 'wechat', 'wx'],
  '网易云': ['163', 'music.163', 'wyy', '网易云音乐'],
  '高德': ['amap', '高德地图', 'gddt'],
  '淘宝': ['taobao', 'tb'],
  '京东': ['jd'],
  '小红书': ['xhs', 'xiaohongshu'],
  '抖音': ['douyin', 'dy'],
  '知乎': ['zhihu', 'zh'],
  '掘金': ['juejin', 'jj'],
  '微博': ['weibo', 'wb'],
  '语雀': ['yuque', 'yq'],
  '飞书': ['feishu', 'fs', 'lark'],
  '钉钉': ['dingtalk', 'dingding', 'dd'],
  '阿里云': ['aliyun', 'ali', 'alipan'],
  '百度': ['baidu', 'bd'],
  '谷歌': ['google', 'gg'],
  '必应': ['bing', 'by'],
};

/**
 * Clean URL to extract domain name without protocols and www
 */
export function extractDomain(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase();
  try {
    const formatted = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(formatted).hostname.replace(/^www\./i, '');
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  }
}

/**
 * Match a single site against a query string.
 * Prioritizes Site Name matches (exact, prefix, substring, Pinyin) over URL matches.
 */
export function matchSite(site: Site, query: string): SiteMatchResult {
  if (!query || !query.trim()) {
    return { matched: false, score: 0 };
  }

  const q = query.trim().toLowerCase();
  const name = (site.name || '').trim();
  const nameLower = name.toLowerCase();
  const url = (site.url || '').trim();
  const urlLower = url.toLowerCase();
  const domain = extractDomain(url);
  const desc = (site.description || '').trim();
  const descLower = desc.toLowerCase();

  // 1. Name exact match (e.g. name === '百度' when query === '百度')
  if (nameLower === q) {
    return { matched: true, score: 100, matchType: 'name_exact', matchLabel: '名称完全匹配' };
  }

  // 2. Name starts with query (e.g. 'ChatGPT Plus' starts with 'chatgpt')
  if (nameLower.startsWith(q)) {
    return { matched: true, score: 90, matchType: 'name_prefix', matchLabel: '名称前缀匹配' };
  }

  // 3. Name includes query (e.g. '微信公众平台' includes '微信')
  if (nameLower.includes(q)) {
    return { matched: true, score: 80, matchType: 'name_includes', matchLabel: '名称匹配' };
  }

  // 4. Name Pinyin full or initials match (e.g. '高德地图' matches 'gaode' or 'gddt')
  try {
    const pinyinRes = PinyinMatch.match(name, q);
    if (pinyinRes) {
      const isStart = Array.isArray(pinyinRes) && pinyinRes[0] === 0;
      return {
        matched: true,
        score: isStart ? 75 : 70,
        matchType: 'name_pinyin',
        matchLabel: '拼音匹配',
      };
    }
  } catch {
    // fallback if pinyin matching fails on non-standard input
  }

  // 5. Common Chinese aliases match (e.g. 'B站' matches 'bilibili' or '哔哩哔哩')
  for (const [key, aliases] of Object.entries(COMMON_ALIASES)) {
    if (nameLower.includes(key)) {
      if (aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) {
        return { matched: true, score: 65, matchType: 'alias', matchLabel: '别名匹配' };
      }
    }
    // Also check if query matches key and site has alias
    if (q.includes(key) && aliases.some((a) => nameLower.includes(a))) {
      return { matched: true, score: 65, matchType: 'alias', matchLabel: '别名匹配' };
    }
  }

  // 6. Domain exact or domain starts with query (e.g. domain is 'github.com', query is 'git')
  if (domain === q || domain.startsWith(q)) {
    return { matched: true, score: 50, matchType: 'url_domain', matchLabel: '域名匹配' };
  }

  // 7. Domain includes query (e.g. domain is 'chat.deepseek.com', query is 'deepseek')
  if (domain.includes(q)) {
    return { matched: true, score: 40, matchType: 'url_domain', matchLabel: '域名匹配' };
  }

  // 8. Full URL includes query
  if (urlLower.includes(q)) {
    return { matched: true, score: 30, matchType: 'url_includes', matchLabel: '网址匹配' };
  }

  // 9. Description includes query
  if (descLower && descLower.includes(q)) {
    return { matched: true, score: 20, matchType: 'desc', matchLabel: '描述匹配' };
  }

  // 10. Description Pinyin match
  if (desc) {
    try {
      const descPinyin = PinyinMatch.match(desc, q);
      if (descPinyin) {
        return { matched: true, score: 15, matchType: 'desc', matchLabel: '描述拼音' };
      }
    } catch {}
  }

  return { matched: false, score: 0 };
}

/**
 * Filter and rank sites by matching score.
 * Results with higher scores (Name matches) appear before lower scores (URL matches).
 */
export function filterAndRankSites(sites: Site[], query: string, limit = 8): MatchedSite[] {
  if (!query || !query.trim()) return [];

  const scored: { site: Site; score: number; matchType?: MatchType; matchLabel?: string }[] = [];

  for (const site of sites) {
    const res = matchSite(site, query);
    if (res.matched) {
      scored.push({
        site,
        score: res.score,
        matchType: res.matchType,
        matchLabel: res.matchLabel,
      });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const selected = limit > 0 ? scored.slice(0, limit) : scored;
  return selected.map((item) => ({
    ...item.site,
    matchType: item.matchType,
    matchLabel: item.matchLabel,
  }));
}
