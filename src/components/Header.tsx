import React, { useState, useEffect } from 'react';
import { Sun, Moon, Settings, Compass, LayoutGrid, Image as ImageIcon, RefreshCw, Clock, Lock } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  showWidgets: boolean;
  bingBg: boolean;
  isAdmin: boolean;
  onToggleDarkMode: () => void;
  onToggleWidgets: () => void;
  onToggleBingBg: () => void;
  onChangeWallpaper: () => void;
  onOpenSettings: () => void;
  onLoginRequest: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  showWidgets,
  bingBg,
  isAdmin,
  onToggleDarkMode,
  onToggleWidgets,
  onToggleBingBg,
  onChangeWallpaper,
  onOpenSettings,
  onLoginRequest,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');

  // Update clock & localized greeting
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}`);

      if (hours >= 5 && hours < 11) setGreeting('早上好 🌅');
      else if (hours >= 11 && hours < 13) setGreeting('中午好 ☀️');
      else if (hours >= 13 && hours < 18) setGreeting('下午好 ☕');
      else setGreeting('晚上好 🌙');
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between transition-colors relative z-50">
      {/* Brand Logo & High-Contrast Greeting Status Bar */}
      <div className="flex items-center space-x-3">
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
            {greeting}
          </p>
        </div>
      </div>

      {/* Clock & Action Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Prominent Apple-style Digital Clock Glass Badge (Enlarged to 16px-18px) */}
        <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-md shadow-2xs font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>{timeStr}</span>
        </div>

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

        {/* Toggle Widgets Button */}
        <button
          onClick={onToggleWidgets}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 glass-panel flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
            showWidgets
              ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80'
              : bingBg
              ? 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border-white/40 dark:border-slate-700'
              : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
          }`}
          title={showWidgets ? '隐藏小组件（纯净书签）' : '展开小组件'}
          aria-label="Toggle widgets"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">{showWidgets ? '收起组件' : '展开组件'}</span>
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
