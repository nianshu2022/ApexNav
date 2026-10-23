import { readProfileValue, writeProfileValue } from '../utils/profileStorage';
import React, { useState } from 'react';

import { CheckSquare, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

const STORAGE_KEY = 'apexnav_todo_items';

const DEFAULT_TODOS: TodoItem[] = [
  { id: 't1', text: '完成项目组件开发', completed: true },
  { id: 't2', text: '整理常用书签分类', completed: false },
  { id: 't3', text: '阅读一本技术书籍', completed: false },
];

const getStoredTodos = (): TodoItem[] => {
  try {
    const saved = readProfileValue(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_TODOS;
  } catch {
    return DEFAULT_TODOS;
  }
};

const saveTodos = (items: TodoItem[]) => {
  writeProfileValue(STORAGE_KEY, JSON.stringify(items));
};

export const TodoMemoCard: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>(getStoredTodos);
  const [newText, setNewText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleToggle = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTodos(updated);
    saveTodos(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const item: TodoItem = {
      id: `todo_${Date.now()}`,
      text: newText.trim(),
      completed: false,
    };
    const updated = [item, ...todos];
    setTodos(updated);
    saveTodos(updated);
    setNewText('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    saveTodos(updated);
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-900/20 dark:via-teal-900/15 dark:to-cyan-900/20 border border-slate-200/70 dark:border-slate-800/70 shadow-xs glass-panel widget-glass flex flex-col justify-between hover:scale-[1.005] transition-transform duration-300 h-[200px] max-h-[200px] overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center space-x-1.5">
          <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-heading font-bold text-slate-800 dark:text-slate-200 text-sm">
            待办清单
          </span>
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 leading-none">
            {completedCount}/{todos.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="添加待办"
        >
          <Plus className={`w-3.5 h-3.5 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Add Form / Todo List */}
      <div className="flex-1 flex flex-col justify-center min-h-0 my-1 overflow-hidden">
        {isAdding ? (
          <form onSubmit={handleAdd} className="space-y-2 animate-in fade-in duration-150">
            <input
              type="text"
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="输入待办任务..."
              maxLength={20}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-500/30 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold shadow-xs cursor-pointer"
              >
                保存
              </button>
            </div>
          </form>
        ) : todos.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[11px] text-slate-400">暂无待办任务，点击 + 新增</p>
          </div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto max-h-[120px] pr-0.5">
            {todos.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className={`flex items-center justify-between gap-2 p-1.5 rounded-xl transition-all cursor-pointer group ${
                  item.completed
                    ? 'bg-emerald-500/5 text-slate-400 line-through'
                    : 'bg-white/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-emerald-500" />
                  )}
                  <span className="text-xs font-semibold truncate leading-none">{item.text}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-rose-500 transition-opacity cursor-pointer"
                  title="删除任务"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {todos.length > 3 && (
              <p className="text-[9px] text-slate-400 text-center font-mono">
                +{todos.length - 3} 项待办...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-800/40 shrink-0">
        <span>已存本地</span>
        <span className="font-mono inline-flex items-center gap-1">{completedCount === todos.length && todos.length > 0 ? <><CheckCircle2 className="w-3 h-3" aria-hidden />全部完成</> : '点击勾选'}</span>
      </div>
    </div>
  );
};
