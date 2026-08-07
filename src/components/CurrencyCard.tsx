import React, { useState } from 'react';
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react';

interface RateItem {
  code: string;
  name: string;
  flag: string;
  rate: string;
  change: string;
  up: boolean;
}

const DEFAULT_RATES: RateItem[] = [
  { code: 'USD', name: '美元', flag: '🇺🇸', rate: '7.1820', change: '+0.12%', up: true },
  { code: 'EUR', name: '欧元', flag: '🇪🇺', rate: '7.7850', change: '-0.08%', up: false },
  { code: 'HKD', name: '港币', flag: '🇭🇰', rate: '0.9190', change: '+0.04%', up: true },
];

export const CurrencyCard: React.FC = () => {
  const [rates] = useState<RateItem[]>(DEFAULT_RATES);
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 dark:from-amber-900/20 dark:via-orange-900/15 dark:to-yellow-900/20 border border-slate-200/70 dark:border-slate-800/70 shadow-xs glass-panel flex flex-col justify-between hover:scale-[1.005] transition-transform duration-300 h-[200px] max-h-[200px] overflow-hidden relative">
      {/* Glow accent */}
      <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center space-x-1.5">
          <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-heading font-bold text-slate-800 dark:text-slate-200 text-sm">
            汇率牌价
          </span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="刷新汇率"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>

      {/* Currency Rates List */}
      <div className="flex-1 flex flex-col justify-center gap-2 min-h-0 my-1 overflow-hidden">
        {rates.map((item) => (
          <div
            key={item.code}
            className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white/50 dark:bg-slate-800/40"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none select-none">{item.flag}</span>
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none mr-1">
                  1 {item.code}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">({item.name})</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-mono">
              <span className="text-xs font-black text-slate-900 dark:text-white leading-none">
                ¥{item.rate}
              </span>
              <span
                className={`text-[9px] font-bold px-1 py-0.5 rounded leading-none ${
                  item.up
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-800/40 shrink-0">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-amber-500" />
          <span>黄金: ¥568/g</span>
        </div>
        <span className="font-mono text-[9px]">基准: 人民币 CNY</span>
      </div>
    </div>
  );
};
