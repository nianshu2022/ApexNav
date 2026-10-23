import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Timer, Plus, X, Trash2, CalendarDays } from 'lucide-react';
import {
  getCountdownEvents,
  saveCountdownEvents,
  DEFAULT_COUNTDOWN_EVENTS,
} from '../utils/storage';
import type { CountdownEvent } from '../types';
import { CountdownIcon, CountdownIconPicker } from './SvgIcon';

function getDaysRemaining(dateStr: string): { days: number; past: boolean } {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  return { days: Math.abs(days), past: days < 0 };
}

function formatCountdown(days: number, past: boolean): string {
  if (days === 0) return '就是今天';
  return past ? `已过 ${days} 天` : `还有 ${days} 天`;
}

function getAccentStyle(days: number, past: boolean) {
  if (days === 0) return { bg: 'rgba(251,191,36,0.15)', color: '#d97706' };
  if (past) return { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' };
  if (days <= 7) return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' };
  if (days <= 30) return { bg: 'rgba(249,115,22,0.12)', color: '#f97316' };
  return { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' };
}

export const CountdownCard: React.FC = () => {
  const [events, setEvents] = useState<CountdownEvent[]>(getCountdownEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newIcon, setNewIcon] = useState('party');
  const [tick, setTick] = useState(0);

  // Refresh once per minute to keep days-remaining accurate
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDate) return;
    const event: CountdownEvent = {
      id: `cde_${Date.now()}`,
      name: newName.trim(),
      date: newDate,
      icon: newIcon,
    };
    const updated = [...events, event];
    setEvents(updated);
    saveCountdownEvents(updated);
    setNewName('');
    setNewDate('');
    setNewIcon('party');
  };

  const handleDelete = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    saveCountdownEvents(updated);
  };

  const handleReset = () => {
    setEvents(DEFAULT_COUNTDOWN_EVENTS);
    saveCountdownEvents(DEFAULT_COUNTDOWN_EVENTS);
  };

  // Show up to 3 in card body; rest in modal
  const displayEvents = events.slice(0, 3);

  return (
    <div className="glass-card widget-glass bg-white/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl p-4 h-[200px] max-h-[200px] flex flex-col justify-between overflow-hidden relative">



      {/* Glow accent */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-md shadow-rose-500/30">
            <Timer className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-white tracking-wide">倒计时</span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="管理倒计时"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Event List / Single Event Hero Mode */}
      <div className="flex flex-col flex-1 justify-center min-h-0" key={tick}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center">
            <CalendarDays className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            <p className="text-[10px] text-slate-400">暂无倒计时，点击 + 新增</p>
          </div>
        ) : events.length === 1 ? (
          /* Single Event Hero Focus Mode (Large Digit Display) */
          (() => {
            const event = events[0];
            const { days, past } = getDaysRemaining(event.date);
            const accent = getAccentStyle(days, past);
            return (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-orange-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CountdownIcon icon={event.icon || event.emoji} className="w-6 h-6 shrink-0 text-rose-500" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{event.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">{event.date}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none">{days}</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">天</span>
                  </div>
                  <span
                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md mt-1 leading-none"
                    style={{ background: accent.bg, color: accent.color }}
                  >
                    {past ? '已过去' : '倒计时'}
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          /* Multi Event List Mode */
          <div className="space-y-2">
            {displayEvents.map((event) => {
              const { days, past } = getDaysRemaining(event.date);
              const accent = getAccentStyle(days, past);
              return (
                <div key={event.id} className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <CountdownIcon icon={event.icon || event.emoji} className="w-4 h-4 shrink-0 text-rose-500" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 leading-none truncate">
                        {event.name}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 mt-0.5 leading-none">{event.date}</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg leading-none shrink-0 font-mono"
                    style={{ background: accent.bg, color: accent.color }}
                  >
                    {formatCountdown(days, past)}
                  </span>
                </div>
              );
            })}
            {events.length > 3 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer font-medium text-center w-full block mt-1"
              >
                +{events.length - 3} 个更多…
              </button>
            )}
          </div>
        )}
      </div>


      {/* Management Modal Portal */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-in fade-in duration-150"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">管理倒计时</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">记录重要日期与倒计时</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Add Form */}
              <form onSubmit={handleAdd} className="space-y-3 shrink-0">
                <CountdownIconPicker value={newIcon} onChange={setNewIcon} />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">事件名称</label>
                    <input
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="如：生日、高考…"
                      maxLength={12}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-400 border border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">目标日期</label>
                    <input
                      required
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-400 border border-transparent"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加倒计时
                </button>
              </form>

              {/* Divider */}
              <div className="border-t border-slate-200/60 dark:border-slate-800/60 shrink-0" />

              {/* Event list (scrollable) */}
              <div className="overflow-y-auto flex-1 space-y-2 min-h-0">
                {events.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-400 py-4">还没有倒计时事件</p>
                ) : (
                  events.map((event) => {
                    const { days, past } = getDaysRemaining(event.date);
                    const accent = getAccentStyle(days, past);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CountdownIcon icon={event.icon || event.emoji} className="w-4 h-4 shrink-0 text-rose-500" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{event.name}</p>
                            <p className="text-[10px] text-slate-400">{event.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap"
                            style={{ background: accent.bg, color: accent.color }}
                          >
                            {formatCountdown(days, past)}
                          </span>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {events.length > 0 && (
                <button
                  onClick={handleReset}
                  className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer font-medium text-center shrink-0"
                >
                  重置为默认
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
