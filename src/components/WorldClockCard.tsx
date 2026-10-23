import { readProfileValue, writeProfileValue } from '../utils/profileStorage';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Plus, X, Check, MapPin, Sun, Moon } from 'lucide-react';

interface ClockCity {
  id: string;
  name: string;
  timezone: string;
}

const PRESET_CITIES: ClockCity[] = [
  { id: 'beijing',   name: '北京',   timezone: 'Asia/Shanghai' },
  { id: 'tokyo',     name: '东京',   timezone: 'Asia/Tokyo' },
  { id: 'london',    name: '伦敦',   timezone: 'Europe/London' },
  { id: 'newyork',   name: '纽约',   timezone: 'America/New_York' },
  { id: 'paris',     name: '巴黎',   timezone: 'Europe/Paris' },
  { id: 'sydney',    name: '悉尼',   timezone: 'Australia/Sydney' },
  { id: 'dubai',     name: '迪拜',   timezone: 'Asia/Dubai' },
  { id: 'moscow',    name: '莫斯科', timezone: 'Europe/Moscow' },
  { id: 'singapore', name: '新加坡', timezone: 'Asia/Singapore' },
  { id: 'losangeles',name: '洛杉矶', timezone: 'America/Los_Angeles' },
];

const DEFAULT_CITY_IDS = ['beijing', 'newyork', 'london'];
const STORAGE_KEY = 'apexnav_worldclock_cities';

const getStoredCities = (): ClockCity[] => {
  try {
    const data = readProfileValue(STORAGE_KEY);
    if (!data) return PRESET_CITIES.filter((c) => DEFAULT_CITY_IDS.includes(c.id));
    const ids: string[] = JSON.parse(data);
    return ids.map((id) => PRESET_CITIES.find((c) => c.id === id)).filter(Boolean) as ClockCity[];
  } catch {
    return PRESET_CITIES.filter((c) => DEFAULT_CITY_IDS.includes(c.id));
  }
};

const saveCities = (cities: ClockCity[]) => {
  writeProfileValue(STORAGE_KEY, JSON.stringify(cities.map((c) => c.id)));
};

function getTimeInZone(timezone: string): { hm: string; ss: string } {
  try {
    const full = new Date().toLocaleTimeString('zh-CN', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = full.split(':');
    return { hm: `${parts[0]}:${parts[1]}`, ss: parts[2] ?? '00' };
  } catch {
    return { hm: '--:--', ss: '--' };
  }
}

function getDateInZone(timezone: string): string {
  try {
    return new Date().toLocaleDateString('zh-CN', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return '';
  }
}

function isDaytimeInZone(timezone: string): boolean {
  try {
    const hourStr = new Date().toLocaleString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    });
    const hour = parseInt(hourStr, 10);
    return hour >= 6 && hour < 20;
  } catch {
    return true;
  }
}

export const WorldClockCard: React.FC = () => {
  const [cities, setCities] = useState<ClockCity[]>(getStoredCities);
  const [tick, setTick] = useState(0);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleCity = (city: ClockCity) => {
    const exists = cities.find((c) => c.id === city.id);
    let updated: ClockCity[];
    if (exists) {
      if (cities.length <= 1) return;
      updated = cities.filter((c) => c.id !== city.id);
    } else {
      if (cities.length >= 4) return;
      updated = [...cities, city];
    }
    setCities(updated);
    saveCities(updated);
  };

  return (
    <div className="glass-card widget-glass bg-white/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl p-4 h-[200px] max-h-[200px] flex flex-col justify-between overflow-hidden relative">



      {/* Glow accent */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-violet-400/15 to-indigo-400/15 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-md shadow-violet-500/30">
            <Globe className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-white tracking-wide">世界时钟</span>
        </div>
        <button
          onClick={() => setIsPickerOpen(true)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors cursor-pointer"
          title="管理城市"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clock Rows - Vertically Centered */}
      <div className="flex flex-col gap-2.5 flex-1 justify-center" key={tick}>
        {cities.map((city) => {
          const { hm, ss } = getTimeInZone(city.timezone);
          const dateStr = getDateInZone(city.timezone);
          const isDay = isDaytimeInZone(city.timezone);
          return (
            <div key={city.id} className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-violet-500 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-none truncate">{city.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-none">{dateStr}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-baseline gap-0.5 font-mono">
                  <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-none">{hm}</span>
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums leading-none">:{ss}</span>
                </div>
                <span
                  className="text-[10px] px-1 py-0.5 rounded-md font-bold leading-none select-none"
                  style={{
                    background: isDay ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)',
                    color: isDay ? '#d97706' : '#818cf8',
                  }}
                >
                  {isDay ? <Sun className="w-3 h-3" aria-label="白天" /> : <Moon className="w-3 h-3" aria-label="夜晚" />}
                </span>
              </div>
            </div>
          );
        })}
      </div>


      {/* City Picker Portal */}
      {isPickerOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-in fade-in duration-150"
            onClick={() => setIsPickerOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">选择时区城市</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">最多 4 个，至少保留 1 个</p>
                </div>
                <button
                  onClick={() => setIsPickerOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_CITIES.map((city) => {
                  const selected = !!cities.find((c) => c.id === city.id);
                  const disabled = !selected && cities.length >= 4;
                  return (
                    <button
                      key={city.id}
                      onClick={() => !disabled && handleToggleCity(city)}
                      disabled={disabled}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                        selected
                          ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/25'
                          : disabled
                          ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-200/50 dark:border-slate-700/50 cursor-not-allowed opacity-50'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400'
                      }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0" aria-hidden />
                      <span className="flex-1 text-left truncate">{city.name}</span>
                      {selected && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
