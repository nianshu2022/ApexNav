import React, { useState, useEffect } from 'react';
import { Quote as QuoteIcon, RefreshCw, Copy, Check, Heart } from 'lucide-react';

interface FavoriteQuote {
  text: string;
  enText?: string;
  from: string;
}

const CATEGORIES = [
  { key: 'd', label: '文学', code: 'd' },
  { key: 'a', label: '动漫', code: 'a' },
  { key: 'i', label: '诗词', code: 'i' },
  { key: 'k', label: '哲学', code: 'k' },
];

export const QuoteCard: React.FC = () => {
  const [quote, setQuote] = useState({
    hitokoto: '循此苦旅，直抵群星。',
    enText: 'Through hardships to the stars.',
    from: '《SCP基金会》',
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState('d');
  const [favorites, setFavorites] = useState<FavoriteQuote[]>(() => {
    const saved = localStorage.getItem('apexnav_favorite_quotes');
    return saved ? JSON.parse(saved) : [];
  });

  // Real-time dynamic translation API (MyMemory + VVHan Translation fallback)
  const translateZhToEn = async (text: string): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh|en`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
          const translated = data.responseData.translatedText.trim();
          if (translated && !translated.includes('MYMEMORY WARNING')) {
            return translated;
          }
        }
      }
    } catch {
      // Fallthrough
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`https://api.vvhan.com/api/fy?text=${encodeURIComponent(text)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.fanyi) {
          return data.data.fanyi;
        }
      }
    } catch {
      // Fallthrough
    }

    return '';
  };

  const fetchQuote = async (catCode = category) => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://v1.hitokoto.cn/?c=${catCode}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const rawZh = data.hitokoto || '只要你在，我便无所不能。';
        const fromSource = data.from ? `《${data.from}》` : '—— 佚名';

        setQuote({
          hitokoto: rawZh,
          enText: 'Translating...',
          from: fromSource,
        });

        const liveEn = await translateZhToEn(rawZh);
        setQuote((prev) => ({
          ...prev,
          enText: liveEn || 'Every step shapes your journey.',
        }));
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote(category);
  }, [category]);

  const handleCopy = () => {
    const text = quote.enText ? `“${quote.hitokoto}”\n"${quote.enText}"\n${quote.from}` : `“${quote.hitokoto}”\n${quote.from}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCurrentFavorited = favorites.some((f) => f.text === quote.hitokoto);

  const handleToggleFavorite = () => {
    let updated: FavoriteQuote[];
    if (isCurrentFavorited) {
      updated = favorites.filter((f) => f.text !== quote.hitokoto);
    } else {
      updated = [...favorites, { text: quote.hitokoto, enText: quote.enText, from: quote.from }];
    }
    setFavorites(updated);
    localStorage.setItem('apexnav_favorite_quotes', JSON.stringify(updated));
  };

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-rose-500/10 dark:from-purple-900/20 dark:via-pink-900/15 dark:to-rose-900/20 border border-slate-200/70 dark:border-slate-800/70 shadow-xs glass-panel flex flex-col justify-between hover:scale-[1.005] transition-transform duration-300 min-h-[165px] relative">
      {/* Header Bar: Icon, Title & Category Pills */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1.5">
          <QuoteIcon className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="font-heading font-bold text-slate-800 dark:text-slate-200 text-sm">
            每日一言
          </span>
        </div>

        {/* 4 Standard Category Pills */}
        <div className="flex items-center space-x-1 p-0.5 rounded-xl bg-purple-500/10 dark:bg-purple-950/40">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.code)}
              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                category === cat.code
                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-purple-600 dark:hover:text-purple-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Bilingual Quote Content Block */}
      <div className="my-1.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <p
            style={{
              fontFamily: "'STXingkai', '华文行楷', 'Xingkai SC', 'FZShuTi', '方正舒体', 'STKaiti', 'KaiTi', cursive, serif",
            }}
            className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed tracking-wider px-0.5"
          >
            “{quote.hitokoto}”
          </p>

          {quote.enText && (
            <p className="text-xs sm:text-[13px] font-sans font-medium italic text-slate-600 dark:text-slate-300 leading-snug tracking-normal px-0.5 opacity-90">
              "{quote.enText}"
            </p>
          )}
        </div>

        <p
          style={{
            fontFamily: "'STXingkai', '华文行楷', 'Xingkai SC', 'STKaiti', 'KaiTi', cursive, serif",
          }}
          className="text-xs text-right text-purple-600 dark:text-purple-400 font-extrabold mt-1.5"
        >
          {quote.from}
        </p>
      </div>

      {/* Action Footer Bar */}
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/40 dark:border-slate-800/40">
        <button
          onClick={handleToggleFavorite}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            isCurrentFavorited
              ? 'bg-rose-500 text-white'
              : 'bg-white/50 dark:bg-slate-800/50 hover:bg-rose-50 text-slate-600 dark:text-slate-300 hover:text-rose-500'
          }`}
          title={isCurrentFavorited ? '已收藏此金句' : '收藏此金句'}
        >
          <Heart className={`w-3 h-3 ${isCurrentFavorited ? 'fill-current' : ''}`} />
          <span>{isCurrentFavorited ? '已收藏' : '收藏'}</span>
        </button>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="一键复制中英双语金句"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => fetchQuote()}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="换一换"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
