import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUpRight, Globe, Bookmark, ChevronDown } from 'lucide-react';
import type { SearchEngine, SearchEngineKey, Site } from '../types';

export const SEARCH_ENGINES: Record<SearchEngineKey, SearchEngine> = {
  google: {
    key: 'google',
    name: 'Google',
    icon: '🌐',
    url: 'https://www.google.com/search?q=',
    placeholder: '搜索网页、输入关键词可直接查找已保存的书签...',
  },
  bing: {
    key: 'bing',
    name: 'Bing',
    icon: '🔍',
    url: 'https://cn.bing.com/search?q=',
    placeholder: '搜索微软 Bing 全球精选，支持查找已保存书签...',
  },
  baidu: {
    key: 'baidu',
    name: '百度',
    icon: '🐾',
    url: 'https://www.baidu.com/s?wd=',
    placeholder: '百度一下，支持查找已保存书签...',
  },
  github: {
    key: 'github',
    name: 'GitHub',
    icon: '🐙',
    url: 'https://github.com/search?q=',
    placeholder: '搜索开源仓库、代码片段、作者...',
  },
};

interface SearchHeroProps {
  currentEngine: SearchEngineKey;
  sites: Site[];
  onChangeEngine: (engine: SearchEngineKey) => void;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  currentEngine,
  sites,
  onChangeEngine,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [matchedSites, setMatchedSites] = useState<Site[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeEngine = SEARCH_ENGINES[currentEngine] || SEARCH_ENGINES.google;

  // Match local sites & fetch web suggestions
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setMatchedSites([]);
      return;
    }

    const q = query.trim().toLowerCase();
    const matches = sites.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    ).slice(0, 5);
    setMatchedSites(matches);

    const timer = setTimeout(() => {
      const callbackName = `baidu_sug_${Date.now()}`;
      (window as unknown as Record<string, (data: { s?: string[] }) => void>)[callbackName] = (data) => {
        if (data && data.s) {
          setSuggestions(data.s.slice(0, 5));
        }
        delete (window as unknown as Record<string, unknown>)[callbackName];
        document.getElementById(callbackName)?.remove();
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=${callbackName}`;
      document.body.appendChild(script);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, sites]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
      if (engineMenuRef.current && !engineMenuRef.current.contains(e.target as Node)) {
        setIsEngineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchTerm?: string) => {
    const targetQuery = searchTerm || query;
    if (!targetQuery.trim()) return;
    window.open(`${activeEngine.url}${encodeURIComponent(targetQuery)}`, '_blank');
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const hasResults = matchedSites.length > 0 || suggestions.length > 0;

  return (
    <section className={`w-full max-w-4xl mx-auto px-4 my-4 sm:my-6 flex flex-col items-center relative transition-all duration-200 ${
      isFocused ? 'z-40' : 'z-20'
    }`}>
      {/* Main Integrated Search Bar Container */}
      <div ref={containerRef} className="w-full relative z-40">
        <div
          className={`w-full rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 border transition-all duration-300 shadow-xl glass-panel flex items-center p-2 sm:p-2.5 relative z-40 ${
            isFocused
              ? 'border-indigo-500/80 dark:border-indigo-400/80 ring-4 ring-indigo-500/15 shadow-indigo-500/10'
              : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          {/* Fused Engine Dropdown Pill inside search bar */}
          <div ref={engineMenuRef} className="relative shrink-0 mr-2 z-40">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEngineDropdownOpen(!isEngineDropdownOpen);
              }}
              className="px-3 py-2 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="切换搜索引擎"
            >
              <span>{activeEngine.icon}</span>
              <span className="hidden sm:inline">{activeEngine.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isEngineDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* High Z-Index Dropdown Menu */}
            {isEngineDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-40 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 p-1.5 animate-in fade-in slide-in-from-top-1">
                {(Object.keys(SEARCH_ENGINES) as SearchEngineKey[]).map((key) => {
                  const engine = SEARCH_ENGINES[key];
                  const isSelected = currentEngine === key;
                  return (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeEngine(key);
                        setIsEngineDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{engine.icon}</span>
                        <span>{engine.name}</span>
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Icon & Input */}
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500 mr-2 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusedIndex(-1);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={activeEngine.placeholder}
            className="w-full bg-transparent text-slate-900 dark:text-white text-sm sm:text-base placeholder-slate-600 dark:placeholder-slate-300 font-medium outline-none"
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setMatchedSites([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Submit Search Button */}
          <button
            onClick={() => handleSearch()}
            className="px-4 py-2 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm flex items-center gap-1 shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
          >
            <span>搜索</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Suggestions & Matched Local Bookmarks Dropdown (100% Opaque Solid BG, High Z-Index) */}
        {isFocused && hasResults && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Matched Local Bookmarks */}
            {matchedSites.length > 0 && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />
                  <span>匹配已保存的书签 ({matchedSites.length})</span>
                </div>
                {matchedSites.map((site) => (
                  <a
                    key={site.id}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsFocused(false)}
                    className="px-3 py-2 rounded-xl text-sm flex items-center justify-between text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {site.icon ? (
                          <img src={site.icon} alt={site.name} className="w-4 h-4 object-contain" />
                        ) : (
                          <span className="text-xs font-bold">{site.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="font-semibold truncate">{site.name}</span>
                      <span className="text-xs text-slate-400 truncate hidden sm:inline">{site.url}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 shrink-0">
                      直达 ↗
                    </span>
                  </a>
                ))}
              </div>
            )}

            {/* Web Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-1">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setQuery(item);
                      handleSearch(item);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`px-4 py-2.5 rounded-xl cursor-pointer text-sm flex items-center justify-between transition-colors ${
                      idx === focusedIndex
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-slate-400 opacity-70" />
                      <span>{item}</span>
                    </div>
                    <Globe className="w-4 h-4 text-slate-400 opacity-40" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
