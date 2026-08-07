import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeatherCard } from './WeatherCard';
import { QuoteCard } from './QuoteCard';
import { CalendarCard } from './CalendarCard';
import { StatusMonitorCard } from './StatusMonitorCard';
import { WorldClockCard } from './WorldClockCard';
import { CountdownCard } from './CountdownCard';
import { TodoMemoCard } from './TodoMemoCard';
import { CurrencyCard } from './CurrencyCard';
import type { WidgetConfig, WidgetId } from '../types';

interface WidgetsGridProps {
  isAdmin?: boolean;
  widgetConfig: WidgetConfig;
  onReorder: (config: WidgetConfig) => void;
}

const PAGE_SIZE = 4;

function renderWidget(id: WidgetId, isAdmin: boolean) {
  switch (id) {
    case 'weather':    return <WeatherCard isAdmin={isAdmin} />;
    case 'quote':      return <QuoteCard />;
    case 'calendar':   return <CalendarCard />;
    case 'status':     return <StatusMonitorCard isAdmin={isAdmin} />;
    case 'worldclock': return <WorldClockCard />;
    case 'countdown':  return <CountdownCard />;
    case 'todo':       return <TodoMemoCard />;
    case 'currency':   return <CurrencyCard />;
    default:           return null;
  }
}

export const WidgetsGrid: React.FC<WidgetsGridProps> = ({
  isAdmin = false,
  widgetConfig,
  onReorder,
}) => {
  const enabled = [...widgetConfig]
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const totalPages = Math.ceil(enabled.length / PAGE_SIZE);

  // Auto fallback if currentPageIdx is out of bounds
  useEffect(() => {
    if (currentPageIdx >= totalPages && totalPages > 0) {
      setCurrentPageIdx(totalPages - 1);
    }
  }, [totalPages, currentPageIdx]);

  // Auto Carousel: Turn page every 12s if > 1 page and not hovered
  useEffect(() => {
    if (totalPages <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentPageIdx((prev) => (prev + 1) % totalPages);
    }, 12000);
    return () => clearInterval(timer);
  }, [totalPages, isHovered]);

  // Handle Mouse Wheel Scroll for switching widget pages
  const wheelCooldown = useRef(false);
  const handleWheel = (e: React.WheelEvent) => {
    if (totalPages <= 1 || wheelCooldown.current) return;
    if (Math.abs(e.deltaX) > 30 || Math.abs(e.deltaY) > 30) {
      wheelCooldown.current = true;
      if (e.deltaY > 0 || e.deltaX > 0) {
        setCurrentPageIdx((p) => Math.min(totalPages - 1, p + 1));
      } else {
        setCurrentPageIdx((p) => Math.max(0, p - 1));
      }
      setTimeout(() => {
        wheelCooldown.current = false;
      }, 400);
    }
  };

  const dragId = useRef<WidgetId | null>(null);
  const [draggingOver, setDraggingOver] = useState<WidgetId | null>(null);

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
    const fromItem = enabled.find((w) => w.id === fromId);
    const toItem   = enabled.find((w) => w.id === targetId);
    if (!fromItem || !toItem) { setDraggingOver(null); return; }

    // Swap orders
    const newConfig = widgetConfig.map((w) => {
      if (w.id === fromId) return { ...w, order: toItem.order };
      if (w.id === targetId) return { ...w, order: fromItem.order };
      return w;
    });
    onReorder(newConfig);
    dragId.current = null;
    setDraggingOver(null);
  };

  const handleDragEnd = () => {
    dragId.current = null;
    setDraggingOver(null);
  };

  if (enabled.length === 0) return null;

  const currentWidgets = enabled.slice(currentPageIdx * PAGE_SIZE, (currentPageIdx + 1) * PAGE_SIZE);

  return (
    <section
      className="w-full max-w-7xl mx-auto px-4 my-3 relative group select-none"
      onWheel={handleWheel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Standard Equal-Width Grid (4 Equal Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300">
        {currentWidgets.map((widget) => (
          <div
            key={widget.id}
            draggable
            onDragStart={() => handleDragStart(widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDrop={() => handleDrop(widget.id)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-200 col-span-1 ${
              draggingOver === widget.id
                ? 'scale-[1.03] ring-2 ring-indigo-500/50 rounded-3xl'
                : ''
            }`}
            style={{ cursor: 'grab' }}
          >
            {renderWidget(widget.id, isAdmin)}
          </div>
        ))}
      </div>

      {/* Pagination Navigation (Only when > 4 Widgets Enabled) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          {/* Previous Page Button */}
          <button
            onClick={() => setCurrentPageIdx((p) => Math.max(0, p - 1))}
            disabled={currentPageIdx === 0}
            className={`p-1.5 rounded-full border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md transition-all cursor-pointer ${
              currentPageIdx === 0
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 shadow-sm hover:scale-110 active:scale-95'
            }`}
            title="上一页组件 (可滚轮切页)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* iOS Style Dot Indicators */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-2xs">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPageIdx(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentPageIdx === idx
                    ? 'w-5 h-2 bg-indigo-600 dark:bg-indigo-500 shadow-sm shadow-indigo-500/50'
                    : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
                title={`第 ${idx + 1} 页`}
              />
            ))}
          </div>

          {/* Next Page Button */}
          <button
            onClick={() => setCurrentPageIdx((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPageIdx === totalPages - 1}
            className={`p-1.5 rounded-full border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md transition-all cursor-pointer ${
              currentPageIdx === totalPages - 1
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 shadow-sm hover:scale-110 active:scale-95'
            }`}
            title="下一页组件 (可滚轮切页)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};




