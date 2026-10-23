import type { Category, Site } from '../types';
import { escapeHtml, MAX_BACKUP_BYTES, safeWebUrl, validateNavigation } from '../../shared/navigation';
import { parseBackupExtras } from './backup';
import type { BackupExtras } from './backup';
import { guessCategoryIcon, normalizeCategoryIcon } from '../../shared/iconCatalog';

export interface ParsedBookmarkResult extends BackupExtras {
  categories: Category[];
  sites: Site[];
  stats: {
    totalCategories: number;
    totalSites: number;
    skippedCount: number;
  };
}

export { guessCategoryIcon } from '../../shared/iconCatalog';

/**
 * Decode HTML entities like &amp;, &lt;, &gt;, &#39;, &quot;
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return str.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (entity, value: string) => {
    const key = value.toLowerCase();
    if (named[key]) return named[key];
    const point = key.startsWith('#x') ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : entity;
  });
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
      const rawUrl = hrefMatch ? decodeHtmlEntities(hrefMatch[1].trim()) : '';

      // Skip invalid or browser-internal URLs
      if (!/^https?:\/\//i.test(rawUrl)) {
        continue;
      }

      // Extract icon
      const iconMatch = attrString.match(/\bicon=["']([^"']+)["']/i) || attrString.match(/\bicon_uri=["']([^"']+)["']/i);
      const icon = iconMatch ? decodeHtmlEntities(iconMatch[1].trim()) : undefined;

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
      const href = decodeHtmlEntities(fallbackMatch[1].trim());
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
    try { item.url = safeWebUrl(item.url); } catch { skippedCount++; continue; }
    let chosenCatName = '';

    // Preserve meaningful folder paths so unrelated leaf folders stay separate.
    // Filter out generic root folder names if deeper folders exist
    const meaningfulFolders = item.folderPath.filter(
      (f) => !isGenericRootFolder(f)
    );

    if (meaningfulFolders.length > 0) {
      chosenCatName = meaningfulFolders.map((folder) => folder.trim()).join(' / ');
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
        icon: guessCategoryIcon(chosenCatName),
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
    if (json.version !== undefined && !['1.0', '2.0'].includes(String(json.version))) throw new Error('不支持的备份版本');
    const navigation = validateNavigation(json.categories, json.sites);
    return {
      ...navigation, ...parseBackupExtras(json),
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
      if (catItem && typeof catItem.name === 'string' && catItem.name.trim()) {
        const catId = catItem.id || `cat-${Date.now()}-${idx}`;
        categories.push({
          id: catId,
          name: catItem.name,
          icon: normalizeCategoryIcon(catItem.icon, catItem.name),
          sort_order: idx,
        });

        if (Array.isArray(catItem.sites)) {
          catItem.sites.forEach((siteItem: any, sIdx: number) => {
            if (siteItem && typeof siteItem.name === 'string' && typeof siteItem.url === 'string') {
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

    validateNavigation(categories, sites);
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
  if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES) throw new Error('备份文件不能超过 8 MB');
  const trimmed = content.trim();

  // Check if it is HTML (Netscape Bookmark or starts with <)
  const isHtml =
    fileName.toLowerCase().endsWith('.html') ||
    fileName.toLowerCase().endsWith('.htm') ||
    trimmed.startsWith('<');

  if (isHtml) {
    const result = parseNetscapeBookmarksHtml(trimmed);
    validateNavigation(result.categories, result.sites);
    return result;
  }

  // Invalid JSON must not bypass validation through embedded HTML strings.
  return parseBookmarksJson(trimmed);
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
  validateNavigation(newCategories, newSites);
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
      const targetId = mergedCategories.some((cat) => cat.id === newCat.id) ? `cat-${crypto.randomUUID()}` : newCat.id;
      catNameToIdMap.set(key, targetId);
      incomingToTargetCatId.set(newCat.id, targetId);
      mergedCategories.push({
        ...newCat,
        id: targetId,
        sort_order: mergedCategories.length,
      });
    }
  }

  // Merge sites (prevent exact duplicate URLs in the same category)
  const existingUrlInCatSet = new Set<string>();
  existingSites.forEach((s) => {
    existingUrlInCatSet.add(`${s.category_id}::${new URL(s.url.trim()).href}`);
  });

  const mergedSites = [...existingSites];

  for (const site of newSites) {
    const targetCatId = incomingToTargetCatId.get(site.category_id) || mergedCategories[0]?.id || 'default';
    const siteKey = `${targetCatId}::${new URL(site.url.trim()).href}`;

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
  const ids = new Set(categories.map((cat) => cat.id));
  const orphans = sites.filter((site) => !ids.has(site.category_id));
  const recoveryId = `recovered-${crypto.randomUUID()}`;
  if (orphans.length) {
    categories = [...categories, { id: recoveryId, name: '未分类（恢复的网址）' }];
    sites = sites.map((site) => ids.has(site.category_id) ? site : { ...site, category_id: recoveryId });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
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
    html += `        <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${escapeHtml(cat.name)}</H3>\n`;
    html += `        <DL><p>\n`;
    catSites.forEach((site) => {
      const iconAttr = site.icon && site.icon.startsWith('data:image/') ? ` ICON="${escapeHtml(site.icon)}"` : '';
      html += `            <DT><A HREF="${escapeHtml(safeWebUrl(site.url))}" ADD_DATE="${timestamp}"${iconAttr}>${escapeHtml(site.name)}</A>\n`;
    });
    html += `        </DL><p>\n`;
  });

  html += `    </DL><p>\n</DL><p>\n`;
  return html;
}

