import React from 'react';
import {
  Bot, BookOpen, BriefcaseBusiness, Cake, CalendarDays, Code2, Compass,
  Film, Flame, Folder, Gamepad2, Globe2, GraduationCap, Heart, House,
  Megaphone, MessagesSquare, Moon, Music2, Newspaper, Palette, PartyPopper,
  Pin, Rocket, ShoppingBag, Sparkles, Star, Umbrella, Wallet, Wrench, Zap,
} from 'lucide-react';
import {
  CATEGORY_ICON_IDS, COUNTDOWN_ICON_IDS, normalizeCategoryIcon, normalizeCountdownIcon,
} from '../../shared/iconCatalog';
import type { CategoryIconId, CountdownIconId } from '../../shared/iconCatalog';

const categoryIcons = {
  folder: Folder, bot: Bot, code: Code2, messages: MessagesSquare, tool: Wrench,
  book: BookOpen, megaphone: Megaphone, rocket: Rocket, zap: Zap, palette: Palette,
  pin: Pin, star: Star, flame: Flame, game: Gamepad2, music: Music2,
  globe: Globe2, film: Film, newspaper: Newspaper, briefcase: BriefcaseBusiness,
  shopping: ShoppingBag, wallet: Wallet, compass: Compass,
} satisfies Record<CategoryIconId, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>>;

const countdownIcons = {
  party: PartyPopper, cake: Cake, sparkles: Sparkles, heart: Heart, moon: Moon,
  star: Star, rocket: Rocket, umbrella: Umbrella, graduation: GraduationCap,
  briefcase: BriefcaseBusiness, house: House, calendar: CalendarDays,
} satisfies Record<CountdownIconId, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>>;

const categoryLabels: Record<CategoryIconId, string> = {
  folder: '文件夹', bot: '智能助手', code: '代码', messages: '交流', tool: '工具',
  book: '书籍', megaphone: '公告', rocket: '火箭', zap: '闪电', palette: '设计',
  pin: '固定', star: '星标', flame: '热门', game: '游戏', music: '音乐',
  globe: '网络', film: '影视', newspaper: '新闻', briefcase: '工作',
  shopping: '购物', wallet: '财务', compass: '探索',
};

const countdownLabels: Record<CountdownIconId, string> = {
  party: '庆祝', cake: '生日', sparkles: '特别日子', heart: '纪念日',
  moon: '夜晚', star: '星标', rocket: '目标', umbrella: '假期',
  graduation: '毕业', briefcase: '工作', house: '家庭', calendar: '日历',
};

export function CategoryIcon({ icon, name, className = 'w-4 h-4' }: { icon?: string; name?: string; className?: string }) {
  const Icon = categoryIcons[normalizeCategoryIcon(icon, name)];
  return <Icon className={className} aria-hidden />;
}

export function CountdownIcon({ icon, className = 'w-4 h-4' }: { icon?: string; className?: string }) {
  const Icon = countdownIcons[normalizeCountdownIcon(icon)];
  return <Icon className={className} aria-hidden />;
}

export function CategoryIconPicker({ value, onChange }: { value: string; onChange: (icon: CategoryIconId) => void }) {
  const selected = normalizeCategoryIcon(value);
  return <div className="flex flex-wrap gap-1.5" role="group" aria-label="分类图标">
    {CATEGORY_ICON_IDS.map((id) => {
      const Icon = categoryIcons[id];
      return <button key={id} type="button" title={categoryLabels[id]} aria-label={categoryLabels[id]}
        aria-pressed={selected === id} onClick={() => onChange(id)}
        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${selected === id ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600'}`}>
        <Icon className="w-4 h-4" aria-hidden />
      </button>;
    })}
  </div>;
}

export function CountdownIconPicker({ value, onChange }: { value: string; onChange: (icon: CountdownIconId) => void }) {
  const selected = normalizeCountdownIcon(value);
  return <div className="flex flex-wrap gap-1.5" role="group" aria-label="倒计时图标">
    {COUNTDOWN_ICON_IDS.map((id) => {
      const Icon = countdownIcons[id];
      return <button key={id} type="button" title={countdownLabels[id]} aria-label={countdownLabels[id]}
        aria-pressed={selected === id} onClick={() => onChange(id)}
        className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${selected === id ? 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-400' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:text-rose-500'}`}>
        <Icon className="w-4 h-4" aria-hidden />
      </button>;
    })}
  </div>;
}
