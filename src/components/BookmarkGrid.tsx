import React, { useState } from 'react';
import { Plus, Globe, ExternalLink, Layers, X } from 'lucide-react';
import type { Category, Site } from '../types';

interface BookmarkGridProps {
  categories: Category[];
  sites: Site[];
  isAdmin: boolean;
  onAddSite: (site: Omit<Site, 'id'>) => void;
  onEditSite: (site: Site) => void;
  onDeleteSite?: (id: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory?: (id: string) => void;
}

export const BookmarkGrid: React.FC<BookmarkGridProps> = ({
  categories,
  sites,
  isAdmin,
  onAddSite,
  onEditSite,
  onAddCategory,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(() => {
    return categories.length > 0 ? categories[0].id : '';
  });

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [siteForm, setSiteForm] = useState({
    name: '',
    url: '',
    icon: '',
    description: '',
    category_id: activeCategoryId || (categories[0]?.id || ''),
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatForm, setNewCatForm] = useState({
    name: '',
    icon: '🔖',
  });

  const filteredSites = sites.filter((s) => s.category_id === activeCategoryId);

  const handleOpenAddModal = (siteToEdit?: Site) => {
    if (siteToEdit) {
      setEditingSite(siteToEdit);
      setSiteForm({
        name: siteToEdit.name,
        url: siteToEdit.url,
        icon: siteToEdit.icon || '',
        description: siteToEdit.description || '',
        category_id: siteToEdit.category_id,
      });
    } else {
      setEditingSite(null);
      setSiteForm({
        name: '',
        url: '',
        icon: '',
        description: '',
        category_id: activeCategoryId || (categories[0]?.id || ''),
      });
    }
    setIsSiteModalOpen(true);
  };

  const handleSaveSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.name.trim() || !siteForm.url.trim()) return;

    let formattedUrl = siteForm.url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let finalIcon = siteForm.icon.trim();
    if (!finalIcon) {
      try {
        const domain = new URL(formattedUrl).hostname;
        finalIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch {
        finalIcon = '';
      }
    }

    if (editingSite) {
      onEditSite({
        ...editingSite,
        name: siteForm.name.trim(),
        url: formattedUrl,
        icon: finalIcon,
        description: siteForm.description.trim(),
        category_id: siteForm.category_id,
      });
    } else {
      onAddSite({
        name: siteForm.name.trim(),
        url: formattedUrl,
        icon: finalIcon,
        description: siteForm.description.trim(),
        category_id: siteForm.category_id,
      });
    }
    setIsSiteModalOpen(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatForm.name.trim()) return;

    onAddCategory({
      name: newCatForm.name.trim(),
      icon: newCatForm.icon.trim() || '🔖',
    });
    setNewCatForm({ name: '', icon: '🔖' });
    setIsCategoryModalOpen(false);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-6 sm:my-8">
      {/* Category Tabs Bar */}
      <div className="flex items-center justify-between gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 overflow-visible pt-2">
          {categories.map((cat) => {
            const isSelected = activeCategoryId === cat.id;
            const catSitesCount = sites.filter((s) => s.category_id === cat.id).length;
            return (
              <div key={cat.id} className="relative group/cat overflow-visible">
                <button
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-[1.02]'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {catSitesCount}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Category / Add Site buttons — admin only */}
        {isAdmin && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
              title="添加分类"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">分类</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新增网址</span>
            </button>
          </div>
        )}
      </div>

      {/* Bookmarks Grid (Next-Gen Apple Frosted Glass Pill Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-40 animate-bounce text-indigo-500" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">暂无任何导航分类</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {isAdmin ? '请先添加分类，或在设置中恢复默认预设网址' : '当前导航主页暂未添加分类与网址'}
            </p>
            {isAdmin && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  + 创建第一个分类
                </button>
              </div>
            )}
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-40 animate-bounce" />
            <p className="text-sm font-medium">当前分类下暂无网址</p>
            {isAdmin && (
              <button
                onClick={() => handleOpenAddModal()}
                className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                + 立即手动添加第一个网址
              </button>
            )}
          </div>
        ) : (
          filteredSites.map((site) => (
            <div
              key={site.id}
              className="group relative px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-600/50 shadow-sm hover:shadow-md hover:border-indigo-500/40 dark:hover:border-indigo-400/50 dark:shadow-slate-900/50 glass-card transition-all duration-200 hover:-translate-y-1 flex items-center min-w-0"
            >
              {/* Left Side: Icon + Text Clickable Link */}
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 min-w-0 w-full group/link"
              >
                {/* Icon Badge Container */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/90 dark:from-slate-700 dark:to-slate-600/80 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-500/40 shadow-2xs group-hover/link:scale-105 transition-transform">
                  {site.icon ? (
                    <img
                      src={site.icon}
                      alt={site.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        (e.target as HTMLElement).nextElementSibling?.removeAttribute('style');
                      }}
                    />
                  ) : null}
                  <span
                    className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 uppercase"
                    style={{ display: site.icon ? 'none' : 'block' }}
                  >
                    {site.name.charAt(0)}
                  </span>
                </div>

                {/* Title and URL/Description */}
                <div className="min-w-0 flex-1 pr-1">
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover/link:text-indigo-600 dark:group-hover/link:text-indigo-400 truncate leading-tight">
                      {site.name}
                    </h3>
                    <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-300 truncate leading-tight mt-0.5 group-hover/link:text-slate-700 dark:group-hover/link:text-slate-100">
                    {site.description || site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </p>
                </div>
              </a>

            </div>
          ))
        )}
      </div>

      {/* Add/Edit Site Modal */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setIsSiteModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingSite ? '编辑网址' : '添加新网址'}
            </h3>

            <form onSubmit={handleSaveSite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  所属分类
                </label>
                <select
                  value={siteForm.category_id}
                  onChange={(e) => setSiteForm({ ...siteForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  网站名称 *
                </label>
                <input
                  type="text"
                  required
                  value={siteForm.name}
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  placeholder="例如: ChatGPT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  网站 URL *
                </label>
                <input
                  type="text"
                  required
                  value={siteForm.url}
                  onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                  placeholder="例如: chatgpt.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  图标 URL (可选，为空自动获取 Favicon)
                </label>
                <input
                  type="text"
                  value={siteForm.icon}
                  onChange={(e) => setSiteForm({ ...siteForm, icon: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  简短描述 (可选)
                </label>
                <input
                  type="text"
                  value={siteForm.description}
                  onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })}
                  placeholder="一句话介绍该网站"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {editingSite ? '保存修改' : '立即添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              添加新分类
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  分类名称 *
                </label>
                <input
                  type="text"
                  required
                  value={newCatForm.name}
                  onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                  placeholder="例如: 实用工具"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  分类 Emoji 图标
                </label>
                <input
                  type="text"
                  value={newCatForm.icon}
                  onChange={(e) => setNewCatForm({ ...newCatForm, icon: e.target.value })}
                  placeholder="例如: 🛠️"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  添加分类
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
