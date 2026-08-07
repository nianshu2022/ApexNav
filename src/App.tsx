import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchHero } from './components/SearchHero';
import { WidgetsGrid } from './components/WidgetsGrid';
import { BookmarkGrid } from './components/BookmarkGrid';
import { SettingsModal } from './components/SettingsModal';
import { WidgetHubModal } from './components/WidgetHubModal';
import { PinModal } from './components/PinModal';

import { CommandBar } from './components/CommandBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { SearchEngineKey, Category, Site } from './types';
import {
  getStoredCategories,
  saveCategories,
  getStoredSites,
  saveSites,
  DEFAULT_CATEGORIES,
  DEFAULT_SITES,
  fetchUserD1Data,
  syncUserWithD1,
  getWidgetConfig,
  saveWidgetConfig,
} from './utils/storage';
import type { WidgetConfig } from './types';


// Official Apple Latest MacBook M3/M4 & macOS 5K Original Quality Wallpapers
const APPLE_MACOS_WALLPAPERS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2560&auto=format&fit=crop',
];

// Inner app component — uses AuthContext
function AppInner() {
  const { isAdmin, currentUsername } = useAuth();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('apexnav_dark');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [showWidgets, setShowWidgets] = useState<boolean>(() => {
    const saved = localStorage.getItem('apexnav_widgets');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [bingBg, setBingBg] = useState<boolean>(() => {
    const saved = localStorage.getItem('apexnav_bing_bg');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [wallpaperIdx, setWallpaperIdx] = useState<number>(() => {
    const saved = localStorage.getItem('apexnav_wallpaper_idx');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [currentEngine, setCurrentEngine] = useState<SearchEngineKey>(() => {
    return (localStorage.getItem('apexnav_engine') as SearchEngineKey) || 'google';
  });

  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories(currentUsername));
  const [sites, setSites] = useState<Site[]>(() => getStoredSites(currentUsername));
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(getWidgetConfig);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWidgetHubOpen, setIsWidgetHubOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  // Sync dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('apexnav_dark', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleWidgetConfigChange = (newConfig: WidgetConfig) => {
    setWidgetConfig(newConfig);
    saveWidgetConfig(newConfig);
  };

  const handleToggleWidgets = () => {
    const next = !showWidgets;
    setShowWidgets(next);
    localStorage.setItem('apexnav_widgets', JSON.stringify(next));
  };

  const handleToggleBingBg = () => {
    const next = !bingBg;
    setBingBg(next);
    localStorage.setItem('apexnav_bing_bg', JSON.stringify(next));
  };

  const handleChangeWallpaper = (idx: number) => {
    setWallpaperIdx(idx);
    localStorage.setItem('apexnav_wallpaper_idx', idx.toString());
  };

  const handleChangeEngine = (engineKey: SearchEngineKey) => {
    setCurrentEngine(engineKey);
    localStorage.setItem('apexnav_engine', engineKey);
  };

  // Sync D1 data on user change
  useEffect(() => {
    fetchUserD1Data(currentUsername || "").then((remote) => {
      if (remote) {
        setCategories(remote.categories);
        setSites(remote.sites);
      }
    });
  }, [currentUsername]);

  const handleImportData = (importedCats: Category[], importedSites: Site[]) => {
    if (!currentUsername) return;
    setCategories(importedCats);
    setSites(importedSites);
    saveCategories(importedCats, currentUsername);
    saveSites(importedSites, currentUsername);
    syncUserWithD1(currentUsername, importedCats, importedSites);
  };

  const handleResetDefault = () => {
    if (!currentUsername) return;
    setCategories(DEFAULT_CATEGORIES);
    setSites(DEFAULT_SITES);
    saveCategories(DEFAULT_CATEGORIES, currentUsername);
    saveSites(DEFAULT_SITES, currentUsername);
    syncUserWithD1(currentUsername, DEFAULT_CATEGORIES, DEFAULT_SITES);
  };

  const handleAddSite = (newSiteData: Omit<Site, 'id'>) => {
    if (!currentUsername) return;
    const newSite: Site = {
      ...newSiteData,
      id: `site-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...sites, newSite];
    setSites(updated);
    saveSites(updated, currentUsername);
    syncUserWithD1(currentUsername, categories, updated);
  };

  const handleEditSite = (updatedSite: Site) => {
    if (!currentUsername) return;
    const updated = sites.map((s) => (s.id === updatedSite.id ? updatedSite : s));
    setSites(updated);
    saveSites(updated, currentUsername);
    syncUserWithD1(currentUsername, categories, updated);
  };

  const handleDeleteSite = (id: string) => {
    if (!currentUsername) return;
    const updated = sites.filter((s) => s.id !== id);
    setSites(updated);
    saveSites(updated, currentUsername);
    syncUserWithD1(currentUsername, categories, updated);
  };

  const handleAddCategory = (newCatData: Omit<Category, 'id'>) => {
    if (!currentUsername) return;
    const newCat: Category = {
      ...newCatData,
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(updated, currentUsername);
    syncUserWithD1(currentUsername, updated, sites);
  };

  const handleEditCategory = (updatedCat: Category) => {
    if (!currentUsername) return;
    const updated = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setCategories(updated);
    saveCategories(updated, currentUsername);
    syncUserWithD1(currentUsername, updated, sites);
  };

  const handleDeleteCategory = (id: string) => {
    if (!currentUsername) return;
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    saveCategories(updated, currentUsername);
    syncUserWithD1(currentUsername, updated, sites);
  };

  const handleTogglePin = (site: Site) => {
    if (!currentUsername) return;
    const updated = sites.map((s) =>
      s.id === site.id ? { ...s, pinned: !s.pinned } : s
    );
    setSites(updated);
    saveSites(updated, currentUsername);
    syncUserWithD1(currentUsername, categories, updated);
  };

  useKeyboardShortcuts({
    onOpenCommandBar: () => setIsCommandBarOpen(true),
    onToggleDarkMode: () => setDarkMode(!darkMode),
    onToggleWidgets: handleToggleWidgets,
    onOpenSettings: () => setIsSettingsOpen(true),
    categories,
  });

  const activeWallpaperUrl = APPLE_MACOS_WALLPAPERS[wallpaperIdx % APPLE_MACOS_WALLPAPERS.length];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative selection:bg-indigo-500 selection:text-white transition-colors duration-300 flex flex-col ${
      bingBg ? 'wallpaper-active' : ''
    }`}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {bingBg ? (
          <>
            <div
              key={activeWallpaperUrl}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-500 ease-in-out animate-in fade-in"
              style={{ backgroundImage: `url('${activeWallpaperUrl}')` }}
            />
            <div className="absolute inset-0 bg-slate-950/25 dark:bg-slate-950/50 backdrop-blur-[3px]" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/35 dark:to-purple-500/35 blur-3xl animate-float-slow pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 dark:from-violet-500/30 dark:to-fuchsia-500/30 blur-3xl animate-float-reverse pointer-events-none" />
            <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 dark:from-cyan-500/25 dark:to-blue-500/30 blur-3xl animate-float-slow pointer-events-none" />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <Header
          darkMode={darkMode}
          showWidgets={showWidgets}
          bingBg={bingBg}
          isAdmin={isAdmin}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onOpenWidgets={() => setIsWidgetHubOpen(true)}
          onToggleBingBg={handleToggleBingBg}
          onChangeWallpaper={handleChangeWallpaper}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLoginRequest={() => setIsPinModalOpen(true)}
          onOpenCommandBar={() => setIsCommandBarOpen(true)}
        />

        <SearchHero
          currentEngine={currentEngine}
          sites={sites}
          onChangeEngine={handleChangeEngine}
          onSearchSubmit={(url: string) => window.open(url, '_blank')}
        />

        {showWidgets && (
          <WidgetsGrid
            isAdmin={isAdmin}
            widgetConfig={widgetConfig}
            onReorder={handleWidgetConfigChange}
          />
        )}

        <BookmarkGrid
          categories={categories}
          sites={sites}
          isAdmin={isAdmin}
          onAddSite={handleAddSite}
          onEditSite={handleEditSite}
          onDeleteSite={handleDeleteSite}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onTogglePin={handleTogglePin}
          onSiteClick={(site) => window.open(site.url, '_blank')}
        />
      </div>

      {/* Footer */}
      <footer className={`relative z-10 py-6 text-center text-xs ${
        bingBg ? 'text-white/80 drop-shadow-sm' : 'text-slate-500 dark:text-slate-400'
      }`}>
        <p className="flex items-center justify-center gap-1.5 tracking-wide">
          <span>ApexNav © {new Date().getFullYear()}</span>
          <span className="opacity-40">·</span>
          <span>Made with <span className="text-rose-400">♥</span> by 念舒</span>
          <span className="opacity-40">·</span>
          <span className={bingBg ? 'text-indigo-300 font-semibold' : 'text-indigo-600 dark:text-indigo-400 font-semibold'}>Cloudflare</span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>累计访问 <span id="busuanzi_value_site_pv" className={`font-mono font-bold ${bingBg ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>--</span> 次</span>
          </span>
        </p>
      </footer>

      {/* Command Bar (Ctrl+K) */}
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        sites={sites}
        categories={categories}
        darkMode={darkMode}
        showWidgets={showWidgets}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onToggleWidgets={handleToggleWidgets}
        onOpenSettings={() => { setIsSettingsOpen(true); setIsCommandBarOpen(false); }}
        onChangeEngine={handleChangeEngine}
        onSiteClick={(site) => window.open(site.url, '_blank')}
      />

      {/* Standalone Widget Hub Modal */}
      <WidgetHubModal
        isOpen={isWidgetHubOpen}
        onClose={() => setIsWidgetHubOpen(false)}
        showWidgets={showWidgets}
        onToggleWidgets={handleToggleWidgets}
        widgetConfig={widgetConfig}
        onWidgetConfigChange={handleWidgetConfigChange}
      />

      {/* PIN Login Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => setIsPinModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories}
        sites={sites}
        onImportData={handleImportData}
        onResetDefault={handleResetDefault}
        onAddSite={handleAddSite}
        onEditSite={handleEditSite}
        onDeleteSite={handleDeleteSite}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
