import React, { useState, useEffect } from 'react';
import { Sun, Moon, Settings, Compass, LayoutGrid, Image as ImageIcon, RefreshCw, Clock, Lock, Search, Coffee, Sunrise } from 'lucide-react';

const LiquidGlass = React.lazy(() => import('liquid-glass-react'));

interface HeaderProps {
  darkMode: boolean;
  showWidgets: boolean;
  bingBg: boolean;
  isAdmin: boolean;
  onToggleDarkMode: () => void;
  onOpenWidgets: () => void;
  onToggleBingBg: () => void;
  onChangeWallpaper: () => void;
  onOpenSettings: () => void;
  onLoginRequest: () => void;
  onOpenCommandBar: () => void;
}


export const Header: React.FC<HeaderProps> = ({
  darkMode,
  showWidgets,
  bingBg,
  isAdmin,
  onToggleDarkMode,
  onOpenWidgets,
  onToggleBingBg,
  onChangeWallpaper,
  onOpenSettings,
  onLoginRequest,
  onOpenCommandBar,
}) => {

  const [timeStr, setTimeStr] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener?.('change', update);
    return () => preference.removeEventListener?.('change', update);
  }, []);

  // Update clock & localized greeting
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}`);

      if (hours >= 5 && hours < 11) setGreeting('早上好');
      else if (hours >= 11 && hours < 13) setGreeting('中午好');
      else if (hours >= 13 && hours < 18) setGreeting('下午好');
      else setGreeting('晚上好');
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-y-3 transition-colors relative z-50">
      {/* Brand Logo & High-Contrast Greeting Status Bar */}
      <div className="flex w-full sm:w-auto items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <div>
          <h1 className={`text-lg sm:text-xl font-bold font-heading tracking-tight ${
            bingBg ? 'text-white drop-shadow-md' : 'text-slate-900 dark:text-white'
          }`}>
            ApexNav
          </h1>
          <p className={`text-xs font-semibold ${
            bingBg ? 'text-white/90 drop-shadow-sm' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <span className="inline-flex items-center gap-1">{greeting}
              {greeting === '早上好' ? <Sunrise className="w-3 h-3" aria-hidden /> : greeting === '中午好' ? <Sun className="w-3 h-3" aria-hidden /> : greeting === '下午好' ? <Coffee className="w-3 h-3" aria-hidden /> : <Moon className="w-3 h-3" aria-hidden />}
            </span>
          </p>
        </div>
      </div>

      {/* Clock & Action Controls */}
      <div className="header-actions flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 sm:gap-3">
        {/* Prominent Apple-style Digital Clock Glass Badge (Enlarged to 16px-18px) */}
        <div className="hidden md:block relative w-[126px] h-10 shrink-0">
          {bingBg && !reducedMotion ? (
            <React.Suspense fallback={
              <div className="flex h-full items-center gap-2 px-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-md liquid-surface font-mono font-black text-base text-slate-900 dark:text-white">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                <span>{timeStr}</span>
              </div>
            }>
              <LiquidGlass
                className="apex-liquid-clock"
                displacementScale={32}
                blurAmount={0.15}
                aberrationIntensity={0.8}
                elasticity={0.08}
                cornerRadius={16}
                padding="7px 13px"
                overLight={!darkMode}
                style={{ position: 'absolute', top: '50%', left: '50%' }}
              >
                <span className="flex items-center gap-2 font-mono font-black text-base text-slate-900 dark:text-white">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                  {timeStr}
                </span>
              </LiquidGlass>
            </React.Suspense>
          ) : (
            <div className="flex h-full items-center gap-2 px-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-md liquid-surface font-mono font-black text-base text-slate-900 dark:text-white">
              <Clock className="w-4 h-4 text-indigo-500" aria-hidden="true" />
              <span>{timeStr}</span>
            </div>
          )}
        </div>

        {/* Ctrl+K Command Bar Trigger */}
        <button
          onClick={onOpenCommandBar}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 glass-panel flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
            bingBg
              ? 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border-white/40 dark:border-slate-700'
              : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
          }`}
          title="打开命令面板 (Ctrl+K)"
          aria-label="Open command bar"
        >
          <Search className="w-4 h-4" />
          <span className="hidden lg:flex items-center gap-1">
            命令
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400">Ctrl+K</kbd>
          </span>
        </button>

        {/* Next Wallpaper Switch Button (Visible when Wallpaper Mode Active) */}
        {bingBg && (
          <button
            onClick={onChangeWallpaper}
            className="p-2.5 sm:p-3 rounded-2xl bg-black/30 hover:bg-black/50 text-white border border-white/20 shadow-xs hover:scale-105 active:scale-95 transition-all duration-200 glass-panel flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="切换下一张 macOS 官方 5K 壁纸"
          >
            <RefreshCw className="w-4 h-4 text-indigo-300" />
            <span className="hidden sm:inline">换壁纸</span>
          </button>
        )}

        {/* Mac Wallpaper Toggle Button (Single Clean Icon, No Duplicate Apple Symbol) */}
        <button
          onClick={onToggleBingBg}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 glass-panel flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
            bingBg
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/30'
              : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
          }`}
          title={bingBg ? '关闭 macOS 壁纸模式' : '开启 macOS 官方原生 5K 高清壁纸模式'}
          aria-label="Toggle macOS Wallpaper"
        >
          <ImageIcon className="w-4 h-4" />
          <span className="hidden lg:inline flex items-center gap-1">
            壁纸
            {bingBg && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 shadow-sm shadow-emerald-400/60" />}
          </span>
        </button>

        {/* Open Widgets Settings Button */}
        <button
          onClick={onOpenWidgets}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 glass-panel flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
            showWidgets
              ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80'
              : bingBg
              ? 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border-white/40 dark:border-slate-700'
              : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
          }`}
          title="小组件管理与定制"
          aria-label="Manage widgets"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">小组件</span>
        </button>


        {/* Theme Toggle Button */}
        <button
          onClick={onToggleDarkMode}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 glass-panel cursor-pointer ${
            bingBg
              ? 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border-white/40 dark:border-slate-700'
              : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
          }`}
          title="切换主题"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Settings / Login Button */}
        <button
          onClick={isAdmin ? onOpenSettings : onLoginRequest}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 glass-panel cursor-pointer relative ${
            bingBg
              ? 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border-white/40 dark:border-slate-700'
              : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
          }`}
          title={isAdmin ? '设置与管理' : '点击登录'}
          aria-label={isAdmin ? 'Open settings' : 'Login'}
        >
          {isAdmin ? (
            <Settings className="w-5 h-5 hover:rotate-90 transition-transform duration-300" />
          ) : (
            <Lock className="w-5 h-5" />
          )}
          {isAdmin && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900" title="已登录管理员" />
          )}
        </button>
      </div>
    </header>
  );
};
