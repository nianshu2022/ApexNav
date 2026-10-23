import React, { useState, useEffect } from 'react';
import {
  Plus, Globe, ExternalLink, Layers, X, Sparkles, Loader2,
  Pin, PinOff, Search, Edit3, Trash2, Copy, Check,
} from 'lucide-react';
import type { Category, Site } from '../types';
import { filterAndRankSites, type MatchedSite } from '../utils/searchMatcher';
import { fetchSiteMetadata } from '../utils/siteParser';
import { openLink, usePreferences } from '../utils/preferences';
import { CategoryIcon, CategoryIconPicker } from './SvgIcon';

interface BookmarkGridProps {
  categories: Category[];
  sites: Site[];
  isAdmin: boolean;
  onAddSite: (site: Omit<Site, 'id'>) => void;
  onEditSite: (site: Site) => void;
  onDeleteSite?: (id: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory?: (id: string) => void;
  onTogglePin: (site: Site) => void;
  onSiteClick?: (site: Site) => void;
}

export const BookmarkGrid: React.FC<BookmarkGridProps> = ({
  categories,
  sites,
  isAdmin,
  onAddSite,
  onEditSite,
  onDeleteSite,
  onAddCategory,
  onTogglePin,
  onSiteClick,
}) => {


  const [activeCategoryId, setActiveCategoryId] = useState<string>(() => {
    return categories.length > 0 ? categories[0].id : '';
  });

  // Auto-sync activeCategoryId when categories list changes or category is deleted/added
  useEffect(() => {
    if (categories.length > 0) {
      const exists = categories.some((c) => c.id === activeCategoryId);
      if (!exists) {
        setActiveCategoryId(categories[0].id);
      }
    } else {
      setActiveCategoryId('');
    }
  }, [categories, activeCategoryId]);

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiParseTip, setAiParseTip] = useState<{ text: string; isError?: boolean } | null>(null);

  const [siteForm, setSiteForm] = useState({
    name: '',
    url: '',
    icon: '',
    description: '',
    category_id: activeCategoryId || (categories[0]?.id || ''),
  });

  const handleAiParse = async () => {
    if (!siteForm.url.trim()) {
      setAiParseTip({ text: '请先输入网址 URL', isError: true });
      setTimeout(() => setAiParseTip(null), 3000);
      return;
    }
    if (isAiParsing) return;
    setIsAiParsing(true);
    setAiParseTip(null);
    try {
      const meta = await fetchSiteMetadata(siteForm.url);
      setSiteForm((prev) => ({
        ...prev,
        url: prev.url.startsWith('http') ? prev.url : `https://${prev.url.trim()}`,
        name: meta.name || prev.name,
        description: meta.description || prev.description,
        icon: meta.icon || prev.icon,
      }));
      setAiParseTip({ text: '智能抓取成功！', isError: false });
      setTimeout(() => setAiParseTip(null), 3000);
    } catch (err: any) {
      console.error('AI parse error:', err);
      setAiParseTip({ text: err.message || '抓取失败，请检查网址', isError: true });
      setTimeout(() => setAiParseTip(null), 3000);
    } finally {
      setIsAiParsing(false);
    }
  };

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatForm, setNewCatForm] = useState({
    name: '',
    icon: 'pin',
  });

  const [gridSearch, setGridSearch] = useState('');
  const isSearchActive = Boolean(gridSearch.trim());
  const searchResults = isSearchActive ? filterAndRankSites(sites, gridSearch, 0) : [];
  const filteredSites: MatchedSite[] = isSearchActive
    ? searchResults
    : sites.filter((s) => s.category_id === activeCategoryId);
  const pinnedSites = sites.filter((s) => s.pinned);

  const openInNewTab = usePreferences().target === '_blank';

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    site: Site | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    site: null,
  });

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseMenu();
    };

    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', handleCloseMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('contextmenu', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenContextMenu = (e: React.MouseEvent, site: Site) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 190;
    const menuHeight = 220;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({ isOpen: true, x, y, site });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  // Listen for CommandBar jump-to-category events
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id && categories.some((c) => c.id === id)) {
        setActiveCategoryId(id);
        // Smooth-scroll to the bookmark section
        document.querySelector('#bookmark-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('apexnav_jump_category', handler);
    return () => window.removeEventListener('apexnav_jump_category', handler);
  }, [categories]);

  const handleOpenAddModal = (siteToEdit?: Site) => {
    setAiParseTip(null);
    if (siteToEdit) {
      setEditingSite(siteToEdit);
      setSiteForm({
        name: siteToEdit.name,
        url: siteToEdit.url,
        icon: siteToEdit.icon || '',
        description: siteToEdit.description || '',
        category_id: siteToEdit.category_id,
      });
    } else {
      setEditingSite(null);
      setSiteForm({
        name: '',
        url: '',
        icon: '',
        description: '',
        category_id: activeCategoryId || (categories[0]?.id || ''),
      });
    }
    setIsSiteModalOpen(true);
  };

  const handleSaveSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.name.trim() || !siteForm.url.trim()) return;

    let formattedUrl = siteForm.url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let finalIcon = siteForm.icon.trim();
    if (!finalIcon) {
      try {
        const domain = new URL(formattedUrl).hostname;
        finalIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch {
        finalIcon = '';
      }
    }

    if (editingSite) {
      onEditSite({
        ...editingSite,
        name: siteForm.name.trim(),
        url: formattedUrl,
        icon: finalIcon,
        description: siteForm.description.trim(),
        category_id: siteForm.category_id,
      });
    } else {
      onAddSite({
        name: siteForm.name.trim(),
        url: formattedUrl,
        icon: finalIcon,
        description: siteForm.description.trim(),
        category_id: siteForm.category_id,
      });
    }
    setIsSiteModalOpen(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatForm.name.trim()) return;

    onAddCategory({
      name: newCatForm.name.trim(),
      icon: newCatForm.icon,
    });
    setNewCatForm({ name: '', icon: 'pin' });
    setIsCategoryModalOpen(false);
  };

  return (
    <section id="bookmark-section" className="w-full max-w-7xl mx-auto px-4 my-6 sm:my-8">

      {/* ── Pinned Sites Row ─────────────────────────────────────────────── */}
      {pinnedSites.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">常用书签</span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">({pinnedSites.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pinnedSites.map((site) => (
              <div
                key={`pin-${site.id}`}
                onContextMenu={(e) => handleOpenContextMenu(e, site)}
                className="group/pin relative flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 shadow-xs hover:shadow-md hover:border-amber-400/60 dark:hover:border-amber-500/50 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <a
                  href={site.url}
                  target={typeof window !== 'undefined' && (window as any).electronAPI ? '_self' : openInNewTab ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 min-w-0"
                >
                  <div className="w-5 h-5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-700/40">
                    {site.icon ? (
                      <img src={site.icon} alt={site.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{site.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{site.name}</span>
                </a>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/pin:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenAddModal(site); }}
                      className="p-0.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all cursor-pointer"
                      title="编辑此书签"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onTogglePin(site); }}
                      className="p-0.5 rounded-full text-amber-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all cursor-pointer"
                      title="取消置顶"
                    >
                      <PinOff className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60" />
        </div>
      )}
      {/* Category Tabs & Quick Search Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-1 scrollbar-none pt-2 max-w-full">
          {categories.map((cat) => {
            const isSelected = !isSearchActive && activeCategoryId === cat.id;
            const catSitesCount = sites.filter((s) => s.category_id === cat.id).length;
            return (
              <div key={cat.id} className="relative group/cat overflow-visible">
                <button
                  onClick={() => {
                    setGridSearch('');
                    setActiveCategoryId(cat.id);
                  }}
                  className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg shadow-indigo-500/10 scale-[1.03]'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:scale-[1.02] border border-slate-200/60 dark:border-slate-700/60 shadow-xs'
                  }`}
                >
                  <CategoryIcon icon={cat.icon} name={cat.name} className="w-4 h-4 transition-transform duration-300 group-hover:scale-125" />
                  <span>{cat.name}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {catSitesCount}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Bookmark Filter Input */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={gridSearch}
              onChange={(e) => setGridSearch(e.target.value)}
              placeholder="按名称/拼音/网址筛选..."
              className="w-full pl-8.5 pr-8 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-2xs transition-all font-medium"
            />
            {gridSearch && (
              <button
                onClick={() => setGridSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="清除筛选"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Category / Add Site buttons — admin only */}
          {isAdmin && (
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95 text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                title="添加分类"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">分类</span>
              </button>

              <button
                onClick={() => handleOpenAddModal()}
                className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新增网址</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Filter Active Banner */}
      {isSearchActive && (
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              搜索结果：“<span className="font-bold text-indigo-600 dark:text-indigo-400">{gridSearch}</span>” （已优先按名称/拼音匹配，共找到 <strong className="font-bold">{filteredSites.length}</strong> 个书签）
            </span>
          </div>
          <button
            onClick={() => setGridSearch('')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>清除筛选</span>
          </button>
        </div>
      )}

      {/* Bookmarks Grid (Next-Gen Apple Frosted Glass Pill Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-40 animate-bounce text-indigo-500" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">暂无任何导航分类</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {isAdmin ? '请先添加分类，或在设置中恢复默认预设网址' : '当前导航主页暂未添加分类与网址'}
            </p>
            {isAdmin && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  + 创建第一个分类
                </button>
              </div>
            )}
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500 glass-card liquid-surface rounded-3xl">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-40 animate-bounce" />
            <p className="text-sm font-medium">
              {isSearchActive ? `未找到与 “${gridSearch}” 相关的网址` : '当前分类下暂无网址'}
            </p>
            {isSearchActive ? (
              <button
                onClick={() => setGridSearch('')}
                className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                清除筛选条件
              </button>
            ) : isAdmin ? (
              <button
                onClick={() => handleOpenAddModal()}
                className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                + 立即手动添加第一个网址
              </button>
            ) : null}
          </div>
        ) : (
          filteredSites.map((site) => (
            <div
              key={site.id}
              className={`group relative px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/90 border shadow-xs hover:shadow-xl dark:shadow-slate-900/50 glass-card liquid-surface transition-all duration-300 ease-out hover:-translate-y-1.5 flex items-center min-w-0 ${
                site.pinned
                  ? 'border-amber-300/60 dark:border-amber-600/40 hover:border-amber-400/70 dark:hover:border-amber-500/60'
                  : 'border-slate-200/60 dark:border-slate-600/50 hover:border-indigo-500/40 dark:hover:border-indigo-400/50'
              }`}
            >
              {/* Left Side: Icon + Text Clickable Link */}
              <a
                href={site.url}
                target={typeof window !== 'undefined' && (window as any).electronAPI ? '_self' : openInNewTab ? '_blank' : '_self'}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && (window as any).electronAPI && onSiteClick) {
                    e.preventDefault();
                    onSiteClick(site);
                  }
                }}
                onContextMenu={(e) => handleOpenContextMenu(e, site)}
                className="flex items-center gap-3 min-w-0 w-full group/link cursor-pointer"
              >
                {/* Icon Badge Container */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100/90 dark:bg-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-600/80 shadow-2xs group-hover/link:scale-110 group-hover/link:rotate-3 transition-transform duration-300 ease-out p-1.5">
                  {site.icon ? (
                    <img
                      src={site.icon}
                      alt={site.name}
                      className="w-full h-full object-contain rounded-md"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        (e.target as HTMLElement).nextElementSibling?.removeAttribute('style');
                      }}
                    />
                  ) : null}
                  <span
                    className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 uppercase"
                    style={{ display: site.icon ? 'none' : 'block' }}
                  >
                    {site.name.charAt(0)}
                  </span>
                </div>

                {/* Title and URL/Description */}
                <div className="min-w-0 flex-1 pr-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover/link:text-indigo-600 dark:group-hover/link:text-indigo-400 truncate leading-tight transition-colors">
                      {site.name}
                    </h3>
                    {isSearchActive && site.matchLabel && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-medium shrink-0 leading-tight">
                        {site.matchLabel}
                      </span>
                    )}
                    {site.pinned && <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                    <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all shrink-0" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-300 truncate leading-tight mt-0.5 group-hover/link:text-slate-700 dark:group-hover/link:text-slate-100">
                    {site.description || site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </p>
                </div>
              </a>

              {/* Admin Card Action Cluster: Pin, In-Place Edit, and Delete */}
              {isAdmin && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 p-0.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-md transition-all duration-200 z-10">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTogglePin(site);
                    }}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      site.pinned
                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={site.pinned ? '取消置顶' : '置顶'}
                  >
                    {site.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenAddModal(site);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="编辑书签"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {onDeleteSite && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm(`确定要删除书签「${site.name}」吗？`)) {
                          onDeleteSite(site.id);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="删除书签"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Site Modal */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setIsSiteModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingSite ? '编辑网址' : '添加新网址'}
            </h3>

            <form onSubmit={handleSaveSite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  所属分类
                </label>
                <select
                  value={siteForm.category_id}
                  onChange={(e) => setSiteForm({ ...siteForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  网站名称 *
                </label>
                <input
                  type="text"
                  required
                  value={siteForm.name}
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  placeholder="例如: ChatGPT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      网站 URL *
                    </label>
                    {aiParseTip && (
                      <span className={`text-[11px] font-medium transition-all ${aiParseTip.isError ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                        {aiParseTip.text}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAiParse}
                    disabled={!siteForm.url.trim() || isAiParsing}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {isAiParsing ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {isAiParsing ? '解析中...' : 'AI 智能抓取标题与图标'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={siteForm.url}
                  onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                  onBlur={() => {
                    if (siteForm.url.trim() && !siteForm.icon.trim()) {
                      let u = siteForm.url.trim();
                      if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
                      try {
                        const domain = new URL(u).hostname;
                        setSiteForm((prev) => ({
                          ...prev,
                          icon: prev.icon || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                        }));
                      } catch {}
                    }
                  }}
                  placeholder="例如: chatgpt.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  图标 URL (可选，为空自动获取 Favicon)
                </label>
                <input
                  type="text"
                  value={siteForm.icon}
                  onChange={(e) => setSiteForm({ ...siteForm, icon: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  简短描述 (可选)
                </label>
                <input
                  type="text"
                  value={siteForm.description}
                  onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })}
                  placeholder="一句话介绍该网站"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {editingSite ? '保存修改' : '立即添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              添加新分类
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  分类名称 *
                </label>
                <input
                  type="text"
                  required
                  value={newCatForm.name}
                  onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                  placeholder="例如: 实用工具"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  分类图标
                </label>
                <CategoryIconPicker value={newCatForm.icon} onChange={(icon) => setNewCatForm({ ...newCatForm, icon })} />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  添加分类
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Native macOS Glassmorphism Context Menu */}
      {contextMenu.isOpen && contextMenu.site && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-[999] min-w-[190px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">
              {contextMenu.site.name}
            </span>
          </div>

          <button
            onClick={() => {
              openLink(contextMenu.site!.url);
              setContextMenu((prev) => ({ ...prev, isOpen: false }));
            }}
            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            在新标签页打开
          </button>

          <button
            onClick={() => handleCopyLink(contextMenu.site!.url)}
            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
          >
            {copiedUrl === contextMenu.site.url ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">已复制链接</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                复制链接地址
              </>
            )}
          </button>

          {isAdmin && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  const s = contextMenu.site!;
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  handleOpenAddModal(s);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                编辑书签
              </button>

              <button
                onClick={() => {
                  onTogglePin(contextMenu.site!);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
              >
                {contextMenu.site.pinned ? (
                  <>
                    <PinOff className="w-3.5 h-3.5 text-amber-500" />
                    取消置顶
                  </>
                ) : (
                  <>
                    <Pin className="w-3.5 h-3.5 text-slate-400" />
                    置顶到常用栏
                  </>
                )}
              </button>

              {onDeleteSite && (
                <button
                  onClick={() => {
                    const s = contextMenu.site!;
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                    if (window.confirm(`确定要删除书签「${s.name}」吗？`)) {
                      onDeleteSite(s.id);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 transition-colors cursor-pointer text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  删除此书签
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};

