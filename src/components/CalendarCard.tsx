import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

const HOLIDAYS: Record<string, string> = {
  '1-1': '元旦节',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '4-5': '清明节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '12-25': '圣诞节',
};

const SOLAR_TERMS: Record<string, string> = {
  '2-4': '立春', '2-19': '雨水', '3-5': '惊蛰', '3-20': '春分',
  '4-4': '清明', '4-19': '谷雨', '5-5': '立夏', '5-20': '小满',
  '6-5': '芒种', '6-21': '夏至', '7-7': '小暑', '7-22': '大暑',
  '8-7': '立秋', '8-23': '处暑', '9-7': '白露', '9-23': '秋分',
  '10-8': '寒露', '10-23': '霜降', '11-7': '立冬', '11-22': '小雪',
  '12-7': '大雪', '12-21': '冬至', '1-5': '小寒', '1-20': '大寒',
};

export const CalendarCard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleResetToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (dayNum: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === dayNum
    );
  };

  const getHolidayOrTerm = (dayNum: number) => {
    const key = `${month + 1}-${dayNum}`;
    if (HOLIDAYS[key]) return { text: HOLIDAYS[key], isHoliday: true };
    if (SOLAR_TERMS[key]) return { text: SOLAR_TERMS[key], isHoliday: false };
    return null;
  };

  // Calendar cells
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-900/20 dark:via-teal-900/15 dark:to-cyan-900/20 border border-slate-200/70 dark:border-slate-800/70 shadow-xs glass-panel flex flex-col justify-between hover:scale-[1.005] transition-transform duration-300 min-h-[165px] relative">
      {/* Calendar Header (Enlarged Month Title) */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1.5">
          <CalendarIcon className="w-4 h-4 text-emerald-500" />
          <span className="font-heading font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
            {year}年 {monthNames[month]}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="上个月"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetToday}
            className="px-2 py-0.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-white/60 dark:bg-slate-800/60 hover:bg-white border border-emerald-500/20 transition-colors cursor-pointer"
            title="返回今天"
          >
            <RotateCcw className="w-3 h-3 inline mr-0.5" />
            今天
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="下个月"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Labels Header (Enlarged to 12px) */}
      <div className="grid grid-cols-7 gap-0.5 text-center my-1">
        {weekDays.map((wd, i) => (
          <span
            key={wd}
            className={`text-xs font-black ${
              i === 0 || i === 6
                ? 'text-rose-500 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {wd}
          </span>
        ))}
      </div>

      {/* Days Grid - Enlarged Numbers to 12px-14px */}
      <div className="grid grid-cols-7 gap-1 text-center my-0.5 flex-1">
        {calendarCells.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty_${idx}`} className="h-5.5 sm:h-6" />;
          }

          const todayFlag = isToday(dayNum);
          const event = getHolidayOrTerm(dayNum);

          return (
            <div
              key={dayNum}
              className={`h-5.5 sm:h-6 flex flex-col items-center justify-center rounded-lg text-xs sm:text-sm font-extrabold transition-colors relative overflow-hidden ${
                todayFlag
                  ? 'bg-emerald-600 text-white font-black shadow-sm scale-105 z-10'
                  : event?.isHoliday
                  ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-400/30'
                  : event
                  ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-400/30'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
              title={
                event
                  ? `${month + 1}月${dayNum}日 ${event.text}`
                  : `${year}年${month + 1}月${dayNum}日`
              }
            >
              <span className="leading-none">{dayNum}</span>
              {event && !todayFlag && (
                <span className="text-[8px] leading-none tracking-tighter truncate max-w-full font-bold scale-90">
                  {event.text.replace(/节$/, '')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
