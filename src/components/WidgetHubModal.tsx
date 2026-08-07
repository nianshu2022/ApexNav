import React, { useRef, useState } from 'react';
import { X, LayoutDashboard, GripVertical, ToggleLeft, ToggleRight, Sparkles, CloudSun, Quote, Calendar, Activity, Globe, Timer } from 'lucide-react';
import type { WidgetConfig, WidgetId } from '../types';

interface WidgetHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  showWidgets: boolean;
  onToggleWidgets: () => void;
  widgetConfig: WidgetConfig;
  onWidgetConfigChange: (config: WidgetConfig) => void;
}

interface WidgetMeta {
  name: string;
  desc: string;
  icon: string;
  gradient: string;
  renderPreview: () => React.ReactNode;
}

// Custom Mini UI Previews for each widget type
const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  weather: {
    name: '天气预报',
    desc: '定位天气与未来预报',
    icon: '🌤️',
    gradient: 'from-amber-500/20 to-orange-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 p-3 flex flex-col justify-between border border-amber-500/20 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">北京 · 晴朗</span>
            <p className="text-lg font-black text-slate-800 dark:text-white font-mono leading-none mt-1">24°C</p>
          </div>
          <CloudSun className="w-6 h-6 text-amber-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">体感 26°C</span>
          <span>湿度 45%</span>
        </div>
      </div>
    ),
  },
  quote: {
    name: '每日一言',
    desc: '随机金句与名言警句',
    icon: '💬',
    gradient: 'from-indigo-500/20 to-purple-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-indigo-500/5 p-3 flex flex-col justify-between border border-indigo-500/20 relative overflow-hidden">
        <Quote className="w-4 h-4 text-indigo-400 opacity-60" />
        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 line-clamp-2 leading-tight">
          “生活原本沉闷，但跑起来就有风。”
        </p>
        <p className="text-[9px] text-indigo-500 dark:text-indigo-400 text-right font-medium">—— 一言</p>
      </div>
    ),
  },
  calendar: {
    name: '月历面板',
    desc: '全月日历与节假日',
    icon: '📅',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-500/5 p-2.5 flex flex-col justify-between border border-blue-500/20">
        <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400">
          <span>2026年 8月</span>
          <Calendar className="w-3.5 h-3.5" />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-mono text-slate-400">
          {['日','一','二','三','四','五','六'].map((d) => <span key={d}>{d}</span>)}
          {[1,2,3,4,5].map((n) => (
            <span
              key={n}
              className={`rounded py-0.5 ${n === 5 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200/50 dark:bg-slate-800/50'}`}
            >
              {n}
            </span>
          ))}
          <span className="col-span-2 text-[8px] text-slate-300">...</span>
        </div>
      </div>
    ),
  },
  status: {
    name: '节点监控',
    desc: 'HTTP 存活与延迟检查',
    icon: '⚡',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-3 flex flex-col justify-between border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> 节点存活监控
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-slate-700 dark:text-slate-300 font-bold truncate">Cloudflare DNS</span>
            <span className="text-emerald-500 font-bold">12ms 🟢</span>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-slate-700 dark:text-slate-300 font-bold truncate">HK Main Node</span>
            <span className="text-emerald-500 font-bold">24ms 🟢</span>
          </div>
        </div>
      </div>
    ),
  },
  worldclock: {
    name: '世界时钟',
    desc: '多时区对比与昼夜',
    icon: '🌐',
    gradient: 'from-violet-500/20 to-indigo-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-violet-500/10 via-indigo-500/10 to-violet-500/5 p-2.5 flex flex-col justify-between border border-violet-500/20">
        <div className="flex items-center justify-between text-[10px] font-bold text-violet-600 dark:text-violet-400">
          <span>世界多时区</span>
          <Globe className="w-3.5 h-3.5" />
        </div>
        <div className="space-y-1 text-[9px]">
          <div className="flex justify-between items-center font-mono">
            <span className="font-bold text-slate-700 dark:text-slate-300">🇨🇳 北京</span>
            <span className="font-bold text-slate-900 dark:text-white">16:30 ☀️</span>
          </div>
          <div className="flex justify-between items-center font-mono">
            <span className="font-bold text-slate-700 dark:text-slate-300">🇺🇸 纽约</span>
            <span className="font-bold text-slate-400">04:30 🌙</span>
          </div>
        </div>
      </div>
    ),
  },
  countdown: {
    name: '倒计时',
    desc: '纪念日与节日倒计时',
    icon: '⏱️',
    gradient: 'from-rose-500/20 to-orange-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-rose-500/10 via-orange-500/10 to-rose-500/5 p-3 flex flex-col justify-between border border-rose-500/20 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
            <Timer className="w-3 h-3" /> 目标倒计时
          </span>
          <span className="text-[9px] text-slate-400">🎆</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-800 dark:text-white">元旦节日</p>
            <p className="text-[9px] text-slate-400 font-mono">2027-01-01</p>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-xs font-black font-mono shadow-2xs">
            还有 148 天
          </span>
        </div>
      </div>
    ),
  },
  todo: {
    name: '待办清单',
    desc: '今日待办与快捷备忘',
    icon: '📝',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-2.5 flex flex-col justify-between border border-emerald-500/20 relative overflow-hidden">
        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <span>待办清单 (2/3)</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 line-through">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">完成组件开发</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-700 dark:text-slate-200 font-bold">
            <span className="w-2 h-2 rounded-full border border-slate-300 shrink-0" />
            <span className="truncate">整理常用书签</span>
          </div>
        </div>
      </div>
    ),
  },
  currency: {
    name: '汇率牌价',
    desc: '实时外汇与金价速览',
    icon: '💱',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    renderPreview: () => (
      <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-amber-500/5 p-2.5 flex flex-col justify-between border border-amber-500/20 relative overflow-hidden">
        <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
          <span>外汇牌价</span>
          <span className="text-[9px] text-slate-400">黄金 ¥568/g</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-slate-700 dark:text-slate-200 font-bold">🇺🇸 1 USD</span>
          <span className="text-amber-600 dark:text-amber-400 font-black">¥7.1820</span>
        </div>
      </div>
    ),
  },
};

export const WidgetHubModal: React.FC<WidgetHubModalProps> = ({
  isOpen,
  onClose,
  showWidgets,
  onToggleWidgets,
  widgetConfig,
  onWidgetConfigChange,
}) => {
  const dragId = useRef<WidgetId | null>(null);
  const [draggingOver, setDraggingOver] = useState<WidgetId | null>(null);

  if (!isOpen) return null;

  const sortedWidgets = [...widgetConfig].sort((a, b) => a.order - b.order);

  const handleDragStart = (id: WidgetId) => {
    dragId.current = id;
  };

  const handleDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    if (dragId.current !== id) setDraggingOver(id);
  };

  const handleDrop = (targetId: WidgetId) => {
    const fromId = dragId.current;
    if (!fromId || fromId === targetId) {
      setDraggingOver(null);
      return;
    }
    const fromIdx = sortedWidgets.findIndex((w) => w.id === fromId);
    const toIdx = sortedWidgets.findIndex((w) => w.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const list = [...sortedWidgets];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const updated = list.map((w, index) => ({ ...w, order: index }));
    onWidgetConfigChange(updated);
    dragId.current = null;
    setDraggingOver(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      {/* 3-Column Apple Glass Modal Container */}
      <div className="w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-none">小组件中心</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">组件实时预览、排序与启用控制</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Master Global Switch */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-indigo-600/30">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                  在主页显示小组件栏
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {showWidgets ? '主页当前已展出 Bento 小组件模块' : '主页小组件已收起（进入纯净极简书签模式）'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleWidgets}
              className={`p-1 rounded-xl transition-all cursor-pointer ${
                showWidgets ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
              }`}
              title={showWidgets ? '点击收起主页组件' : '点击展开主页组件'}
            >
              {showWidgets ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-3">
              <span>卡片列表（拖拽可调整主页显示顺序）：</span>
            </p>

            {/* 3-Column Grid Cards (1 row 3 cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {sortedWidgets.map((widget, idx) => {
                const meta = WIDGET_META[widget.id] || {
                  name: widget.id,
                  desc: '',
                  icon: '🧩',
                  gradient: '',
                  renderPreview: () => null,
                };

                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={() => handleDragStart(widget.id)}
                    onDragOver={(e) => handleDragOver(e, widget.id)}
                    onDrop={() => handleDrop(widget.id)}
                    className={`rounded-3xl border p-4 transition-all duration-200 flex flex-col justify-between relative group cursor-grab active:cursor-grabbing ${
                      widget.enabled
                        ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 hover:shadow-lg dark:hover:border-indigo-500'
                        : 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-50'
                    } ${draggingOver === widget.id ? 'ring-2 ring-indigo-500 scale-[1.02]' : ''}`}
                  >
                    {/* Header bar of each thumbnail card */}
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 shrink-0" />
                        <span className="text-base select-none">{meta.icon}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate leading-none">
                            {meta.name}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-mono">#{idx + 1}</span>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = widgetConfig.map((w) =>
                            w.id === widget.id ? { ...w, enabled: !w.enabled } : w
                          );
                          onWidgetConfigChange(updated);
                        }}
                        className={`p-0.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                          widget.enabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
                        }`}
                        title={widget.enabled ? '点击禁用' : '点击启用'}
                      >
                        {widget.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                    </div>

                    {/* Live Mini UI Preview Thumbnail */}
                    <div className="my-1">
                      {meta.renderPreview()}
                    </div>

                    {/* Card Description Footer */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate">{meta.desc}</span>
                      {widget.enabled ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                          已在主页展示
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 font-bold shrink-0">
                          已隐藏
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400">
            提示：在主页上也可以按住卡片直接拖拽重排顺序
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            完成设置
          </button>
        </div>

      </div>
    </div>
  );
};
