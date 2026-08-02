import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CloudSun, MapPin, RefreshCw, Sun, CloudRain, Thermometer, Search, X, Check, Cloud,
  Droplets, Eye
} from 'lucide-react';

const POPULAR_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安', '兰州'];

const WEATHER_TRANSLATIONS: Record<string, string> = {
  'Sunny': '晴朗',
  'Clear': '晴',
  'Partly cloudy': '局部多云',
  'Partly Cloudy': '多云',
  'Cloudy': '多云',
  'Overcast': '阴天',
  'Mist': '薄雾',
  'Fog': '大雾',
  'Patchy rain nearby': '局部阵雨',
  'Patchy rain possible': '阵雨',
  'Light rain': '小雨',
  'Moderate rain': '中雨',
  'Heavy rain': '大雨',
  'Thunderstorm': '雷阵雨',
  'Light snow': '小雪',
  'Heavy snow': '大雪',
  'Windy': '微风',
};

const translateWeatherDesc = (text: string): string => {
  if (!text) return '晴朗';
  const trimmed = text.trim();
  if (WEATHER_TRANSLATIONS[trimmed]) return WEATHER_TRANSLATIONS[trimmed];
  for (const [en, zh] of Object.entries(WEATHER_TRANSLATIONS)) {
    if (trimmed.toLowerCase().includes(en.toLowerCase())) {
      return zh;
    }
  }
  return trimmed;
};

interface HourlyForecast {
  time: string;
  temp: string;
  type: string;
}

interface DayForecast {
  dateStr: string;
  dayLabel: string;
  weatherType: string;
  currentTemp?: string;
  high: string;
  low: string;
  feelsLike?: string;
  humidity?: string;
  uvIndex?: string;
  visibility?: string;
  sunrise?: string;
  sunset?: string;
  hourlyList?: HourlyForecast[];
}

export const WeatherCard: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const [userCity, setUserCity] = useState<string>(() => localStorage.getItem('apexnav_user_city') || '');
  const [city, setCity] = useState<string>('兰州');
  const [loading, setLoading] = useState<boolean>(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [inputCity, setInputCity] = useState('');
  const [wind, setWind] = useState<string>('微风 2级');

  // Active Day Switcher (0 = 今天, 1 = 明天, 2 = 后天)
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);

  // Hovered Day for Lightweight Floating Card Tooltip (null or DayForecast)
  const [hoveredDay, setHoveredDay] = useState<DayForecast | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const [forecast, setForecast] = useState<DayForecast[]>([
    {
      dateStr: '8月2日',
      dayLabel: '今天',
      weatherType: '多云',
      currentTemp: '20',
      high: '23°C',
      low: '18°C',
      feelsLike: '21°C',
      humidity: '58%',
      uvIndex: '4 (中等)',
      visibility: '10 km',
      sunrise: '06:12',
      sunset: '19:48',
      hourlyList: [
        { time: '08:00', temp: '19°', type: '多云' },
        { time: '11:00', temp: '22°', type: '晴' },
        { time: '14:00', temp: '23°', type: '晴' },
        { time: '17:00', temp: '22°', type: '多云' },
        { time: '20:00', temp: '19°', type: '阴天' },
        { time: '23:00', temp: '18°', type: '多云' },
      ],
    },
    {
      dateStr: '8月3日',
      dayLabel: '明天',
      weatherType: '晴',
      currentTemp: '29',
      high: '29°C',
      low: '15°C',
      feelsLike: '28°C',
      humidity: '45%',
      uvIndex: '7 (强)',
      visibility: '12 km',
      sunrise: '06:13',
      sunset: '19:47',
      hourlyList: [
        { time: '08:00', temp: '18°', type: '晴' },
        { time: '11:00', temp: '25°', type: '晴' },
        { time: '14:00', temp: '29°', type: '晴' },
        { time: '17:00', temp: '27°', type: '晴' },
        { time: '20:00', temp: '22°', type: '晴' },
        { time: '23:00', temp: '17°', type: '晴' },
      ],
    },
    {
      dateStr: '8月4日',
      dayLabel: '后天',
      weatherType: '晴',
      currentTemp: '30',
      high: '30°C',
      low: '18°C',
      feelsLike: '31°C',
      humidity: '50%',
      uvIndex: '8 (强)',
      visibility: '10 km',
      sunrise: '06:14',
      sunset: '19:46',
      hourlyList: [
        { time: '08:00', temp: '20°', type: '晴' },
        { time: '11:00', temp: '27°', type: '晴' },
        { time: '14:00', temp: '30°', type: '晴' },
        { time: '17:00', temp: '28°', type: '多云' },
        { time: '20:00', temp: '23°', type: '多云' },
        { time: '23:00', temp: '19°', type: '多云' },
      ],
    },
  ]);

  // Resilient multi-endpoint weather fetch
  const fetchWeather = async (targetCity?: string) => {
    setLoading(true);
    const target = targetCity || userCity || '兰州';

    // Endpoint 1: VVHan API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const cityParam = target ? `?city=${encodeURIComponent(target)}` : '';
      const res = await fetch(`https://api.vvhan.com/api/weather${cityParam}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.info) {
          setCity(data.city || target);
          const cTemp = data.info.temp ? String(data.info.temp) : '20';
          const wType = translateWeatherDesc(data.info.type || '晴朗');
          const hT = data.info.high ? data.info.high.replace(/[^0-9°C]/g, '') + '°C' : '23°C';
          const lT = data.info.low ? data.info.low.replace(/[^0-9°C]/g, '') + '°C' : '18°C';
          if (data.info.fengxiang) setWind(`${data.info.fengxiang} ${data.info.fengli || ''}`);

          setForecast((prev) => [
            { ...prev[0], currentTemp: cTemp, weatherType: wType, high: hT, low: lT },
            prev[1],
            prev[2],
          ]);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Endpoint 1 failed
    }

    // Endpoint 2: wttr.in
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://wttr.in/${encodeURIComponent(target)}?format=j1`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.current_condition && data.current_condition[0]) {
          const current = data.current_condition[0];
          setCity(target);
          if (current.winddir16Point && current.windspeedKmph) {
            setWind(`${current.winddir16Point} ${current.windspeedKmph}km/h`);
          }

          if (data.weather && Array.isArray(data.weather) && data.weather.length >= 3) {
            const dayLabels = ['今天', '明天', '后天'];
            const newForecast: DayForecast[] = data.weather.slice(0, 3).map((wItem: {
              date: string; maxtempC: string; mintempC: string; uvIndex?: string; astronomy?: { sunrise?: string; sunset?: string }[]; hourly?: { time: string; tempC: string; weatherDesc?: { value: string }[]; humidity?: string; FeelsLikeC?: string }[]
            }, idx: number) => {
              const astronomy = wItem.astronomy && wItem.astronomy[0] ? wItem.astronomy[0] : {};
              const hourly = wItem.hourly || [];
              const midDesc = hourly[4]?.weatherDesc ? hourly[4]?.weatherDesc[0]?.value : '晴';

              const formattedHourly: HourlyForecast[] = [
                { time: '08:00', temp: `${hourly[2]?.tempC || 19}°`, type: translateWeatherDesc(hourly[2]?.weatherDesc?.[0]?.value || '晴') },
                { time: '11:00', temp: `${hourly[3]?.tempC || 23}°`, type: translateWeatherDesc(hourly[3]?.weatherDesc?.[0]?.value || '晴') },
                { time: '14:00', temp: `${hourly[4]?.tempC || 28}°`, type: translateWeatherDesc(hourly[4]?.weatherDesc?.[0]?.value || '晴') },
                { time: '17:00', temp: `${hourly[5]?.tempC || 26}°`, type: translateWeatherDesc(hourly[5]?.weatherDesc?.[0]?.value || '多云') },
                { time: '20:00', temp: `${hourly[6]?.tempC || 21}°`, type: translateWeatherDesc(hourly[6]?.weatherDesc?.[0]?.value || '多云') },
                { time: '23:00', temp: `${hourly[7]?.tempC || 18}°`, type: translateWeatherDesc(hourly[7]?.weatherDesc?.[0]?.value || '多云') },
              ];

              const isToday = idx === 0;
              const mainTemp = isToday ? (current.temp_C || wItem.maxtempC) : wItem.maxtempC;
              const mainType = isToday
                ? translateWeatherDesc(current.lang_zh ? current.lang_zh[0]?.value : current.weatherDesc?.[0]?.value || '多云')
                : translateWeatherDesc(midDesc);

              return {
                dateStr: wItem.date || `8月${idx + 2}日`,
                dayLabel: dayLabels[idx] || `+${idx}天`,
                weatherType: mainType,
                currentTemp: mainTemp,
                high: `${wItem.maxtempC}°C`,
                low: `${wItem.mintempC}°C`,
                feelsLike: `${hourly[4]?.FeelsLikeC || wItem.maxtempC}°C`,
                humidity: `${current.humidity || hourly[4]?.humidity || '55'}%`,
                uvIndex: wItem.uvIndex ? `${wItem.uvIndex}` : '中等',
                visibility: '10 km',
                sunrise: astronomy.sunrise || '06:12',
                sunset: astronomy.sunset || '19:48',
                hourlyList: formattedHourly,
              };
            });
            setForecast(newForecast);
          }

          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setCity(target);
    setLoading(false);
  };

  useEffect(() => {
    fetchWeather(userCity);
  }, [userCity]);

  const handleSaveCity = (cityToSave: string) => {
    const trimmed = cityToSave.trim();
    setUserCity(trimmed);
    if (trimmed) {
      localStorage.setItem('apexnav_user_city', trimmed);
    } else {
      localStorage.removeItem('apexnav_user_city');
    }
    fetchWeather(trimmed);
    setIsCityModalOpen(false);
  };

  const getWeatherIcon = (type: string, small = false) => {
    const sizeClass = small ? "w-4 h-4" : "w-7 h-7";
    if (type.includes('雨')) return <CloudRain className={`${sizeClass} text-blue-500 animate-pulse`} />;
    if (type.includes('阴') || type.includes('云')) return <CloudSun className={`${sizeClass} text-amber-500`} />;
    if (type.includes('雾')) return <Cloud className={`${sizeClass} text-slate-400`} />;
    return <Sun className={`${sizeClass} text-amber-400 animate-spin-slow`} />;
  };

  const currentActiveDay = forecast[activeDayIndex] || forecast[0];

  const handleMouseEnterDay = (e: React.MouseEvent, fItem: DayForecast) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setHoveredDay(fItem);
  };

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-cyan-500/10 dark:from-sky-900/20 dark:via-blue-900/15 dark:to-cyan-900/20 border border-slate-200/70 dark:border-slate-800/70 shadow-xs glass-panel flex flex-col justify-between hover:scale-[1.005] transition-transform duration-300 min-h-[165px] relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <CloudSun className="w-4 h-4 text-sky-500" />
          <span className="font-heading font-bold text-slate-800 dark:text-slate-200 text-sm">
            实时天气
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {isAdmin && (
            <button
              onClick={() => {
                setInputCity(userCity);
                setIsCityModalOpen(true);
              }}
              className="px-2 py-0.5 rounded-lg bg-white/60 dark:bg-slate-800/60 hover:bg-white text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1 transition-colors cursor-pointer"
              title="切换定位城市"
            >
              <MapPin className="w-3 h-3 text-sky-500" />
              <span>{city}</span>
            </button>
          )}
          {!isAdmin && (
            <span className="px-2 py-0.5 rounded-lg bg-white/40 dark:bg-slate-800/40 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-sky-500" />
              <span>{city}</span>
            </span>
          )}
          <button
            onClick={() => fetchWeather(userCity)}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="刷新实时天气"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Temperature Display (Enlarged to 4xl/5xl for Apple Widget feel) */}
      <div
        onMouseEnter={(e) => handleMouseEnterDay(e, currentActiveDay)}
        onMouseLeave={() => setHoveredDay(null)}
        className="flex items-center justify-between my-1 cursor-pointer group/temp relative"
      >
        <div className="flex items-baseline space-x-1">
          <span className="text-4xl sm:text-5xl font-black font-heading text-slate-900 dark:text-white tracking-tight group-hover/temp:text-sky-600 transition-colors">
            {currentActiveDay.currentTemp || currentActiveDay.high.replace(/[^0-9]/g, '')}
          </span>
          <span className="text-base font-bold text-slate-500 dark:text-slate-400">°C</span>
          <span className="ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-400/30">
            {currentActiveDay.weatherType}
          </span>
        </div>
        <div className="p-2 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/60 shadow-2xs group-hover/temp:scale-110 transition-transform">
          {getWeatherIcon(currentActiveDay.weatherType)}
        </div>
      </div>

      {/* 3-Day Forecast Switcher (Enlarged Day Labels & Temp Ranges) */}
      <div className="grid grid-cols-3 gap-1.5 my-1 text-center">
        {forecast.map((fItem, idx) => {
          const isSelected = activeDayIndex === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveDayIndex(idx)}
              onMouseEnter={(e) => handleMouseEnterDay(e, fItem)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`flex flex-col items-center justify-between py-1.5 px-1 rounded-2xl transition-all cursor-pointer group/fday border shadow-2xs ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-400 font-extrabold scale-102 shadow-md shadow-sky-500/20'
                  : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border-white/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
              }`}
              title={`点击切换为 ${fItem.dayLabel}，悬停浮现气象详情`}
            >
              <div className="flex items-center gap-1">
                <span className={`text-xs ${isSelected ? 'font-black text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`}>
                  {fItem.dayLabel}
                </span>
              </div>
              <div className="my-0.5 group-hover/fday:scale-110 transition-transform">
                {getWeatherIcon(fItem.weatherType, true)}
              </div>
              <span className={`font-mono font-extrabold text-[11px] ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                {fItem.high}/{fItem.low}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clean Footer Info (Enlarged to 12px) */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
        <div className="flex items-center space-x-1">
          <Thermometer className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {currentActiveDay.dayLabel}: 高 {currentActiveDay.high} / 低 {currentActiveDay.low}
          </span>
        </div>
        <div className="flex items-center space-x-1 font-mono text-[11px]">
          <span>{wind}</span>
        </div>
      </div>

      {/* Smooth Mouse Hover Floating Glass Tooltip Card */}
      {hoveredDay && hoverPos &&
        createPortal(
          <div
            style={{
              left: `${hoverPos.x}px`,
              top: `${hoverPos.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="fixed z-[9999] pointer-events-none w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-3.5 border border-sky-200/60 dark:border-slate-700/60 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left"
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                  {city} · {hoveredDay.dayLabel} ({hoveredDay.dateStr})
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-400/30 self-start">
                  {hoveredDay.weatherType}
                </span>
              </div>
              <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white shrink-0">
                {hoveredDay.high}/{hoveredDay.low}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-center mb-2">
              {(hoveredDay.hourlyList || []).map((h, i) => (
                <div key={i} className="flex flex-col items-center text-[9px]">
                  <span className="text-slate-400 font-mono scale-90">{h.time}</span>
                  <div className="my-0.5">{getWeatherIcon(h.type, true)}</div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                    {h.temp}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div className="p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="text-slate-500 truncate">湿度: {hoveredDay.humidity || '58%'}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-slate-500 truncate">紫外线: {hoveredDay.uvIndex || '中等'}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-slate-500 truncate">能见度: {hoveredDay.visibility || '10km'}</span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* City Selector Glass Modal */}
      {isCityModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative text-left">
              <button
                onClick={() => setIsCityModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-5">
                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-500">
                  <CloudSun className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    设置天气定位城市
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    手动输入或选择热门城市
                  </p>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputCity}
                  onChange={(e) => setInputCity(e.target.value)}
                  placeholder="输入城市名称（如：北京、上海、广州...）"
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  热门常用城市
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {POPULAR_CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleSaveCity(c)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                        city === c
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600'
                      }`}
                    >
                      📍 {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSaveCity('')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                >
                  恢复自动 IP 定位
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCityModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveCity(inputCity)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>保存设置</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
