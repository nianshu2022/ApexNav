import type { Category, Site } from '../types';

export interface ParsedBookmarkResult {
  categories: Category[];
  sites: Site[];
  stats: {
    totalCategories: number;
    totalSites: number;
    skippedCount: number;
  };
}

/**
 * Intelligent emoji heuristic based on category name
 */
export function guessCategoryEmoji(name: string): string {
  const n = name.trim().toLowerCase();
  if (/ai|人工智能|gpt|claude|deepseek|大模型|llm|openai|prompt/i.test(n)) return '🤖';
  if (/开发|编程|代码|程序|github|前端|后端|git|dev|code|tech|架构|api|linux|npm|vue|react/i.test(n)) return '💻';
  if (/设计|ui|ux|figma|dribbble|图标|素材|插画|壁纸|配色|灵感|design|art|behance/i.test(n)) return '🎨';
  if (/工具|效率|实用|转换|查询|生成|在线|tool|util|productivity/i.test(n)) return '🛠️';
  if (/社区|论坛|博客|知乎|贴吧|v2ex|掘金|reddit|social|community|weibo|twitter|x\.com/i.test(n)) return '💬';
  if (/视频|电影|影视|动漫|动画|b站|bilibili|youtube|media|tv|live|stream/i.test(n)) return '🎬';
  if (/音乐|音频|播客|电台|网易云|music|song|audio|podcast/i.test(n)) return '🎵';
  if (/资讯|新闻|日报|周刊|订阅|阅读|文章|rss|news|read|feed/i.test(n)) return '📰';
  if (/学习|知识|文档|教程|课程|书籍|大学|考研|learn|study|doc|wiki/i.test(n)) return '📚';
  if (/工作|办公|飞书|钉钉|协作|文档|表格|notion|office|work/i.test(n)) return '💼';
  if (/购物|电商|淘宝|京东|海淘|优惠|买|shop|store|mall|amazon/i.test(n)) return '🛒';
  if (/游戏|电竞|steam|epic|game|play/i.test(n)) return '🎮';
  if (/金融|理财|股票|基金|银行|币|资产|finance|crypto|bank/i.test(n)) return '💰';
  if (/生活|健康|旅游|美食|出行|地图|life|travel|food/i.test(n)) return '🍀';
  if (/搜索|引擎|导航|门户|search|nav/i.test(n)) return '🌐';
  if (/书签|常用|收藏|favorite|star|pin|常用推荐/i.test(n)) return '⭐';
  return '📁';
}

/**
 * Decode HTML entities like &amp;, &lt;, &gt;, &#39;, &quot;
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Clean URL to extract domain name
 */
function extractDomain(url: string): string {
  try {
    const formatted = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(formatted).hostname.replace(/^www\./i, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || '';
  }
}

/**
 * Generic root folder names in browsers (Netscape Bookmark standard)
 */
const GENERIC_ROOTS = new Set([
  '书签栏',
  '收藏夹栏',
  'bookmarks bar',
  'bookmarks',
  'favorites bar',
  'favorites',
  'personal toolbar folder',
  'other bookmarks',
  '其他书签',
  '其他收藏夹',
  'mobile bookmarks',
  '移动设备书签',
  'imported',
  '导入的书签',
]);

function isGenericRootFolder(folderName: string): boolean {
  const clean = folderName.trim().toLowerCase();
  if (GENERIC_ROOTS.has(clean)) return true;
  if (/^(apexnav\s*)?(书签栏|收藏夹栏|bookmarks\s*bar|favorites\s*bar)$/i.test(clean)) return true;
  return false;
}

interface RawParsedItem {
  title: string;
  url: string;
  icon?: string;
  folderPath: string[];
}

/**
 * Parse standard Netscape Bookmark HTML file (Chrome, Edge, Safari, Firefox, Arc, etc.)
 */
export function parseNetscapeBookmarksHtml(htmlContent: string): ParsedBookmarkResult {
  const folderStack: string[] = [];
  let pendingFolderName = '';
  const rawItems: RawParsedItem[] = [];

  // Match tags of interest:
  // 1: <H3 ...>Title</H3>
  // 2: <A HREF="..." ...>Title</A>
  // 3: <DL>
  // 4: </DL>
  const tagRegex = /<h3[^>]*>([\s\S]*?)<\/h3>|<a\s+([\s\S]*?)>([\s\S]*?)<\/a>|<dl\b[^>]*>|<\/dl>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const fullMatch = match[0];

    if (/^<h3/i.test(fullMatch)) {
      const folderTitle = decodeHtmlEntities((match[1] || '').trim().replace(/<[^>]+>/g, ''));
      pendingFolderName = folderTitle;
    } else if (/^<dl\b/i.test(fullMatch)) {
      // Enter folder
      folderStack.push(pendingFolderName || '');
      pendingFolderName = '';
    } else if (/^<\/dl/i.test(fullMatch)) {
      // Exit folder
      if (folderStack.length > 0) {
        folderStack.pop();
      }
    } else if (/^<a\b/i.test(fullMatch)) {
      const attrString = match[2] || '';
      const textContent = match[3] || '';

      // Extract href
      const hrefMatch = attrString.match(/\bhref=["']([^"']+)["']/i);
      const rawUrl = hrefMatch ? hrefMatch[1].trim() : '';

      // Skip invalid or browser-internal URLs
      if (!rawUrl || /^(javascript:|place:|data:text\/html|about:|chrome:|edge:)/i.test(rawUrl)) {
        continue;
      }

      // Extract icon
      const iconMatch = attrString.match(/\bicon=["']([^"']+)["']/i) || attrString.match(/\bicon_uri=["']([^"']+)["']/i);
      const icon = iconMatch ? iconMatch[1].trim() : undefined;

      const title = decodeHtmlEntities(textContent.trim().replace(/<[^>]+>/g, '')) || extractDomain(rawUrl);

      // Snapshot current folder path (filtering out empty ones)
      const currentPath = folderStack.filter(Boolean);

      rawItems.push({
        title,
        url: rawUrl,
        icon,
        folderPath: currentPath,
      });
    }
  }

  // Fallback: If tagRegex found nothing (e.g. malformed HTML or single-line HTML without dl tags),
  // extract all <a href="..."> elements directly.
  if (rawItems.length === 0) {
    const simpleAnchorRegex = /<a\s+[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let fallbackMatch: RegExpExecArray | null;
    while ((fallbackMatch = simpleAnchorRegex.exec(htmlContent)) !== null) {
      const href = fallbackMatch[1].trim();
      const text = decodeHtmlEntities(fallbackMatch[2].trim().replace(/<[^>]+>/g, ''));
      if (href && !/^(javascript:|place:|about:)/i.test(href)) {
        rawItems.push({
          title: text || extractDomain(href),
          url: href,
          folderPath: ['书签导入'],
        });
      }
    }
  }

  // ── Group by Categories ───────────────────────────────────
  const categoryMap = new Map<string, { id: string; name: string; icon: string; sites: Site[] }>();

  let skippedCount = 0;
  let catIndex = 0;

  for (const item of rawItems) {
    let chosenCatName = '';

    // Smart category resolution:
    // Filter out generic root folder names if deeper folders exist
    const meaningfulFolders = item.folderPath.filter(
      (f) => !isGenericRootFolder(f)
    );

    if (meaningfulFolders.length > 0) {
      // Use the deepest (leaf) user folder where the link actually resides
      chosenCatName = meaningfulFolders[meaningfulFolders.length - 1].trim();
    } else if (item.folderPath.length > 0) {
      // If only generic folders exist (e.g. root "书签栏"), use it nicely
      chosenCatName = item.folderPath[item.folderPath.length - 1].trim();
    } else {
      chosenCatName = '常用书签';
    }

    if (!chosenCatName) chosenCatName = '常用书签';

    let catRecord = categoryMap.get(chosenCatName);
    if (!catRecord) {
      const catId = `cat-import-${Date.now()}-${catIndex++}-${Math.random().toString(36).substring(2, 5)}`;
      catRecord = {
        id: catId,
        name: chosenCatName,
        icon: guessCategoryEmoji(chosenCatName),
        sites: [],
      };
      categoryMap.set(chosenCatName, catRecord);
    }

    // Process site icon
    const domain = extractDomain(item.url);
    let siteIcon = item.icon;
    if (!siteIcon || (!siteIcon.startsWith('data:image/') && !siteIcon.startsWith('http'))) {
      siteIcon = domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : '';
    }

    const siteId = `site-import-${Date.now()}-${catRecord.sites.length}-${Math.random().toString(36).substring(2, 6)}`;

    catRecord.sites.push({
      id: siteId,
      category_id: catRecord.id,
      name: item.title,
      url: item.url,
      icon: siteIcon,
      description: domain,
      sort_order: catRecord.sites.length,
    });
  }

  const resultCategories: Category[] = [];
  const resultSites: Site[] = [];

  categoryMap.forEach((entry) => {
    // Only include categories that actually have sites
    if (entry.sites.length > 0) {
      resultCategories.push({
        id: entry.id,
        name: entry.name,
        icon: entry.icon,
        sort_order: resultCategories.length,
      });
      resultSites.push(...entry.sites);
    }
  });

  return {
    categories: resultCategories,
    sites: resultSites,
    stats: {
      totalCategories: resultCategories.length,
      totalSites: resultSites.length,
      skippedCount,
    },
  };
}

/**
 * Parse JSON backup file
 */
export function parseBookmarksJson(jsonContent: string): ParsedBookmarkResult {
  const json = JSON.parse(jsonContent);

  // Format 1: Standard ApexNav Export { version, categories, sites }
  if (json && Array.isArray(json.categories) && Array.isArray(json.sites)) {
    return {
      categories: json.categories,
      sites: json.sites,
      stats: {
        totalCategories: json.categories.length,
        totalSites: json.sites.length,
        skippedCount: 0,
      },
    };
  }

  // Format 2: Grouped Array [{ id, name, icon, sites: [...] }]
  if (Array.isArray(json)) {
    const categories: Category[] = [];
    const sites: Site[] = [];

    json.forEach((catItem: any, idx: number) => {
      if (catItem.name) {
        const catId = catItem.id || `cat-${Date.now()}-${idx}`;
        categories.push({
          id: catId,
          name: catItem.name,
          icon: catItem.icon || guessCategoryEmoji(catItem.name),
          sort_order: idx,
        });

        if (Array.isArray(catItem.sites)) {
          catItem.sites.forEach((siteItem: any, sIdx: number) => {
            if (siteItem.name && siteItem.url) {
              const domain = extractDomain(siteItem.url);
              sites.push({
                id: siteItem.id || `site-${Date.now()}-${sIdx}-${Math.random().toString(36).substring(2, 5)}`,
                category_id: catId,
                name: siteItem.name,
                url: siteItem.url,
                icon: siteItem.icon || (domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : ''),
                description: siteItem.description || domain,
                sort_order: sIdx,
              });
            }
          });
        }
      }
    });

    return {
      categories,
      sites,
      stats: {
        totalCategories: categories.length,
        totalSites: sites.length,
        skippedCount: 0,
      },
    };
  }

  throw new Error('无法识别的 JSON 书签数据格式');
}

/**
 * Universal Bookmark File Parser (Autodetects HTML vs JSON)
 */
export function parseBookmarkFileContent(
  content: string,
  fileName = ''
): ParsedBookmarkResult {
  const trimmed = content.trim();

  // Check if it is HTML (Netscape Bookmark or starts with <)
  const isHtml =
    fileName.toLowerCase().endsWith('.html') ||
    fileName.toLowerCase().endsWith('.htm') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<DL>') ||
    trimmed.startsWith('<dl>') ||
    /NETSCAPE-Bookmark-file/i.test(trimmed);

  if (isHtml) {
    return parseNetscapeBookmarksHtml(trimmed);
  }

  // Otherwise try JSON
  try {
    return parseBookmarksJson(trimmed);
  } catch (err: any) {
    // If JSON parsing fails, fallback to HTML parsing in case file had no extension
    try {
      const htmlResult = parseNetscapeBookmarksHtml(trimmed);
      if (htmlResult.sites.length > 0) {
        return htmlResult;
      }
    } catch {}
    throw new Error(err.message || '文件格式不支持，请上传有效的 .html 或 .json 书签文件');
  }
}

/**
 * Merge newly imported categories & sites into existing dataset without loss
 */
export function mergeBookmarks(
  existingCategories: Category[],
  existingSites: Site[],
  newCategories: Category[],
  newSites: Site[]
): { categories: Category[]; sites: Site[] } {
  const mergedCategories = [...existingCategories];
  const catNameToIdMap = new Map<string, string>();

  // Map existing category names (lowercase) to their existing IDs
  existingCategories.forEach((c) => {
    catNameToIdMap.set(c.name.trim().toLowerCase(), c.id);
  });

  // Track ID remapping for incoming categories
  const incomingToTargetCatId = new Map<string, string>();

  for (const newCat of newCategories) {
    const key = newCat.name.trim().toLowerCase();
    if (catNameToIdMap.has(key)) {
      // Reuse existing category
      incomingToTargetCatId.set(newCat.id, catNameToIdMap.get(key)!);
    } else {
      // Create new category in merged list
      const targetId = newCat.id;
      catNameToIdMap.set(key, targetId);
      incomingToTargetCatId.set(newCat.id, targetId);
      mergedCategories.push({
        ...newCat,
        sort_order: mergedCategories.length,
      });
    }
  }

  // Merge sites (prevent exact duplicate URLs in the same category)
  const existingUrlInCatSet = new Set<string>();
  existingSites.forEach((s) => {
    existingUrlInCatSet.add(`${s.category_id}::${s.url.trim().toLowerCase()}`);
  });

  const mergedSites = [...existingSites];

  for (const site of newSites) {
    const targetCatId = incomingToTargetCatId.get(site.category_id) || mergedCategories[0]?.id || 'default';
    const siteKey = `${targetCatId}::${site.url.trim().toLowerCase()}`;

    if (!existingUrlInCatSet.has(siteKey)) {
      existingUrlInCatSet.add(siteKey);
      mergedSites.push({
        ...site,
        id: `site-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category_id: targetCatId,
        sort_order: mergedSites.length,
      });
    }
  }

  return {
    categories: mergedCategories,
    sites: mergedSites,
  };
}

/**
 * Generate standard Netscape Bookmark HTML file (compatible with Chrome, Edge, Safari, Firefox, Arc)
 */
export function generateNetscapeBookmarksHtml(categories: Category[], sites: Site[]): string {
  const timestamp = Math.floor(Date.now() / 1000);
  let html = `<!DOCTYPE NETSCAPE-Bookmark-group-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}" PERSONAL_TOOLBAR_FOLDER="true">ApexNav 书签栏</H3>
    <DL><p>
`;

  categories.forEach((cat) => {
    const catSites = sites.filter((s) => s.category_id === cat.id);
    if (catSites.length === 0) return;
    html += `        <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${cat.name}</H3>\n`;
    html += `        <DL><p>\n`;
    catSites.forEach((site) => {
      const iconAttr = site.icon && site.icon.startsWith('data:image/') ? ` ICON="${site.icon}"` : '';
      html += `            <DT><A HREF="${site.url}" ADD_DATE="${timestamp}"${iconAttr}>${site.name}</A>\n`;
    });
    html += `        </DL><p>\n`;
  });

  html += `    </DL><p>\n</DL><p>\n`;
  return html;
}

