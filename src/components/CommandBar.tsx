import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Globe, ExternalLink, X, Command, Hash, ArrowRight } from 'lucide-react';
import type { Category, Site, SearchEngineKey } from '../types';
import { filterAndRankSites } from '../utils/searchMatcher';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultType = 'site' | 'category' | 'action';

interface CommandResult {
  id: string;
  type: ResultType;
  label: string;
  sublabel?: string;
  icon?: string;
  emoji?: string;
  action: () => void;
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  categories: Category[];
  darkMode: boolean;
  showWidgets: boolean;
  onToggleDarkMode: () => void;
  onToggleWidgets: () => void;
  onOpenSettings: () => void;
  onChangeEngine: (engine: SearchEngineKey) => void;
  onSiteClick?: (site: Site) => void;
}


// ─── Static actions ────────────────────────────────────────────────────────────

const SEARCH_ENGINE_ACTIONS = (
  onChangeEngine: (e: SearchEngineKey) => void,
  onClose: () => void
): CommandResult[] => [
  {
    id: 'engine-google',
    type: 'action',
    label: '切换搜索引擎 → Google',
    emoji: '🌐',
    action: () => { onChangeEngine('google'); onClose(); },
  },
  {
    id: 'engine-bing',
    type: 'action',
    label: '切换搜索引擎 → Bing',
    emoji: '🔍',
    action: () => { onChangeEngine('bing'); onClose(); },
  },
  {
    id: 'engine-baidu',
    type: 'action',
    label: '切换搜索引擎 → 百度',
    emoji: '🐾',
    action: () => { onChangeEngine('baidu'); onClose(); },
  },
  {
    id: 'engine-github',
    type: 'action',
    label: '切换搜索引擎 → GitHub',
    emoji: '🐙',
    action: () => { onChangeEngine('github'); onClose(); },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const CommandBar: React.FC<CommandBarProps> = ({
  isOpen,
  onClose,
  sites,
  categories,
  darkMode,
  showWidgets,
  onToggleDarkMode,
  onToggleWidgets,
  onOpenSettings,
  onChangeEngine,
  onSiteClick,
}) => {

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Build results ──────────────────────────────────────────────────────────
  const buildResults = useCallback((): CommandResult[] => {
    const q = query.trim().toLowerCase();

    // Static system actions (always available or matched)
    const systemActions: CommandResult[] = [
      {
        id: 'action-dark',
        type: 'action',
        label: darkMode ? '切换为浅色模式' : '切换为深色模式',
        sublabel: '外观',
        emoji: darkMode ? '☀️' : '🌙',
        action: () => { onToggleDarkMode(); onClose(); },
      },
      {
        id: 'action-widgets',
        type: 'action',
        label: showWidgets ? '隐藏小组件' : '展开小组件',
        sublabel: '布局',
        emoji: '⚡',
        action: () => { onToggleWidgets(); onClose(); },
      },
      {
        id: 'action-settings',
        type: 'action',
        label: '打开设置与管理',
        sublabel: '管理',
        emoji: '⚙️',
        action: () => { onOpenSettings(); onClose(); },
      },
      ...SEARCH_ENGINE_ACTIONS(onChangeEngine, onClose),
    ];

    // Category results
    const categoryResults: CommandResult[] = categories.map((cat) => ({
      id: `cat-${cat.id}`,
      type: 'category' as ResultType,
      label: cat.name,
      sublabel: '跳转分类',
      emoji: cat.icon || '📂',
      action: () => {
        // Dispatch custom event for BookmarkGrid to handle active tab
        window.dispatchEvent(new CustomEvent('apexnav_jump_category', { detail: { id: cat.id } }));
        onClose();
      },
    }));

    // Site results
    const siteResults: CommandResult[] = sites.map((site) => ({
      id: `site-${site.id}`,
      type: 'site' as ResultType,
      label: site.name,
      sublabel: site.url,
      icon: site.icon,
      action: () => {
        if (onSiteClick) {
          onSiteClick(site);
        } else {
          window.open(site.url, '_blank', 'noopener,noreferrer');
        }
        onClose();
      },
    }));


    if (!q) {
      // No query: show categories first, then top sites (max 5), then actions
      return [
        ...categoryResults.slice(0, 6),
        ...siteResults.slice(0, 5),
        ...systemActions,
      ];
    }

    // With query: intelligent rank sites (name > pinyin > url) & categories & actions
    const rankedSites = filterAndRankSites(sites, q, 12);
    const matchedSites: CommandResult[] = rankedSites.map((site) => ({
      id: `site-${site.id}`,
      type: 'site' as ResultType,
      label: site.name,
      sublabel: `${site.matchLabel ? `[${site.matchLabel}] ` : ''}${site.url}`,
      icon: site.icon,
      action: () => {
        if (onSiteClick) {
          onSiteClick(site);
        } else {
          window.open(site.url, '_blank', 'noopener,noreferrer');
        }
        onClose();
      },
    }));
    const matchedCats = categoryResults.filter((r) => r.label.toLowerCase().includes(q));
    const matchedActions = systemActions.filter(
      (r) => r.label.toLowerCase().includes(q) || (r.sublabel && r.sublabel.toLowerCase().includes(q))
    );

    return [...matchedSites, ...matchedCats, ...matchedActions];
  }, [query, sites, categories, darkMode, showWidgets, onToggleDarkMode, onToggleWidgets, onOpenSettings, onChangeEngine, onClose, onSiteClick]);

  const results = buildResults();

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        results[selectedIndex]?.action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, selectedIndex, onClose]);

  // ── Auto-scroll selected item into view ───────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Reset on open/close ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Reset selected index when results change ───────────────────────────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  // ── Result icon renderer ───────────────────────────────────────────────────
  const renderIcon = (result: CommandResult) => {
    if (result.type === 'site' && result.icon) {
      return (
        <img
          src={result.icon}
          alt={result.label}
          className="w-5 h-5 object-contain rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      );
    }
    if (result.emoji) {
      return <span className="text-base leading-none">{result.emoji}</span>;
    }
    // Fallback by type
    if (result.type === 'site') return <Globe className="w-4 h-4 text-slate-400" />;
    if (result.type === 'category') return <Hash className="w-4 h-4 text-indigo-400" />;
    return <Command className="w-4 h-4 text-violet-400" />;
  };

  // ── Section header label ───────────────────────────────────────────────────
  const getSectionLabel = (type: ResultType): string => {
    if (type === 'site') return '书签';
    if (type === 'category') return '分类';
    return '操作';
  };

  // Group results for section headers
  const grouped: { label: string; items: CommandResult[] }[] = [];
  let lastType: ResultType | null = null;
  for (const result of results) {
    if (result.type !== lastType) {
      grouped.push({ label: getSectionLabel(result.type), items: [result] });
      lastType = result.type;
    } else {
      grouped[grouped.length - 1].items.push(result);
    }
  }

  // Flat index offset map for keyboard nav
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        className="fixed inset-x-0 top-[12vh] z-[201] mx-auto w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-700/60 shadow-2xl backdrop-blur-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">

          {/* Search input row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索书签、跳转分类、执行操作..."
              className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 outline-none font-medium"
              id="command-bar-input"
              autoComplete="off"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="清空"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                Esc
              </kbd>
            </div>
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            className="max-h-[min(480px,60vh)] overflow-y-auto overscroll-contain p-2"
          >
            {results.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>没有找到匹配的结果</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label} className="mb-1">
                  {/* Section header */}
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 select-none">
                    {group.label}
                  </div>
                  {group.items.map((result) => {
                    const idx = flatIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={result.id}
                        data-index={idx}
                        onClick={result.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 cursor-pointer group ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Icon */}
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                          isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-700/50'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}>
                          {renderIcon(result)}
                        </span>

                        {/* Labels */}
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate leading-snug">
                            {result.label}
                          </span>
                          {result.sublabel && (
                            <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {result.sublabel}
                            </span>
                          )}
                        </span>

                        {/* Type badge / arrow */}
                        <span className={`shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
                          {result.type === 'site' ? (
                            <ExternalLink className="w-4 h-4 text-indigo-400" />
                          ) : result.type === 'category' ? (
                            <ArrowRight className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-violet-400" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">↑↓</kbd>
                导航
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">↵</kbd>
                确认
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Esc</kbd>
                关闭
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 dark:text-slate-600">
              <Command className="w-3 h-3" />
              <span>ApexNav</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
