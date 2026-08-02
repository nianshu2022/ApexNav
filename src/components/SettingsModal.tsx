import React, { useRef, useState } from 'react';
import {
  X, Download, Upload, RefreshCw, Database, CheckCircle2,
  Shield, Info, Eye, EyeOff, LogOut, KeyRound, Trash2,
  Layers, Plus, Edit3, Search, ExternalLink, AlertTriangle,
  FolderPlus, Globe, Sparkles, Server, ArrowRight, ChevronDown, Check
} from 'lucide-react';
import type { Category, Site } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { syncUserWithD1, fetchUserD1Data } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  sites: Site[];
  onImportData: (categories: Category[], sites: Site[]) => void;
  onResetDefault: () => void;
  onAddSite: (site: Omit<Site, 'id'>) => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (id: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
}

type Tab = 'sites' | 'categories' | 'cloud' | 'security' | 'about';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

const PRESET_EMOJIS = ['📁', '🤖', '💻', '💬', '🛠️', '📚', '📢', '🚀', '⚡', '🎨', '📌', '⭐', '🔥', '🎮', '🎵', '🌐'];

// Custom Apple-style Glassmorphism Select Dropdown Component
const CustomSelect: React.FC<{
  value: string;
  options: { id: string; label: string; icon?: string; count?: number }[];
  onChange: (val: string) => void;
  className?: string;
}> = ({ value, options, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.id === value) || options[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between gap-2 transition-all hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer shadow-2xs"
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label}</span>
          {selectedOption?.count !== undefined && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-mono text-slate-500 dark:text-slate-400 font-bold">
              {selectedOption.count}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.icon && <span>{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                    {opt.count !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {opt.count}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  sites,
  onImportData,
  onResetDefault,
  onAddSite,
  onEditSite,
  onDeleteSite,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('sites');

  // Search & Filter state for site management
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Inline Site Add/Edit state
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isSiteFormOpen, setIsSiteFormOpen] = useState(false);
  const [siteForm, setSiteForm] = useState({
    name: '',
    url: '',
    icon: '',
    description: '',
    category_id: categories[0]?.id || '',
  });

  // Inline Category Add/Edit state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📁');

  // Account Change Credentials state
  const [oldPassword, setOldPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [credLoading, setCredLoading] = useState(false);

  // Custom Confirm Dialog State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const { logout, changeCredentials, currentUsername, isEnvAuth } = useAuth();

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const askConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger = true,
    confirmText = '确认'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      isDanger,
      onConfirm,
    });
  };

  // Open site add/edit inline form
  const handleOpenSiteForm = (site?: Site) => {
    if (site) {
      setEditingSite(site);
      setSiteForm({
        name: site.name,
        url: site.url,
        icon: site.icon || '',
        description: site.description || '',
        category_id: site.category_id,
      });
    } else {
      setEditingSite(null);
      setSiteForm({
        name: '',
        url: '',
        icon: '',
        description: '',
        category_id: selectedCatId !== 'all' ? selectedCatId : (categories[0]?.id || ''),
      });
    }
    setIsSiteFormOpen(true);
  };

  // Submit site inline form
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
        finalIcon = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
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
      showMsg('网址修改成功！', 'success');
    } else {
      onAddSite({
        name: siteForm.name.trim(),
        url: formattedUrl,
        icon: finalIcon,
        description: siteForm.description.trim(),
        category_id: siteForm.category_id,
      });
      showMsg('新增网址成功！', 'success');
    }
    setIsSiteFormOpen(false);
  };

  // Open Category add/edit
  const handleOpenCategoryForm = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatIcon(cat.icon || '📁');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatIcon('📁');
    }
    setIsAddingCategory(true);
  };

  // Save Category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      if (onEditCategory) {
        onEditCategory({
          ...editingCategory,
          name: catName.trim(),
          icon: catIcon.trim() || '📁',
        });
        showMsg(`分类「${catName.trim()}」修改成功！`, 'success');
      }
    } else {
      onAddCategory({
        name: catName.trim(),
        icon: catIcon.trim() || '📁',
      });
      showMsg(`新增分类「${catName.trim()}」成功！`, 'success');
    }
    setIsAddingCategory(false);
  };

  // Export JSON
  const handleExportJSON = () => {
    const data = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      categories,
      sites,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApexNav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMsg('数据已成功导出 JSON 备份文件！', 'success');
  };

  // Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const importedCategories: Category[] = [];
          const importedSites: Site[] = [];
          json.forEach((catItem: any) => {
            if (catItem.id && catItem.name) {
              importedCategories.push({ id: catItem.id, name: catItem.name, icon: catItem.icon || '📁' });
              if (Array.isArray(catItem.sites)) {
                catItem.sites.forEach((siteItem: any) => {
                  if (siteItem.name && siteItem.url) {
                    importedSites.push({
                      id: siteItem.id || `site_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                      category_id: catItem.id,
                      name: siteItem.name,
                      url: siteItem.url,
                      icon: siteItem.icon || '',
                      description: siteItem.description || '',
                    });
                  }
                });
              }
            }
          });
          onImportData(importedCategories, importedSites);
          showMsg(`导入成功！加载了 ${importedCategories.length} 个分类，${importedSites.length} 个网址。`, 'success');
        } else if (json.categories && json.sites) {
          onImportData(json.categories, json.sites);
          showMsg(`导入成功！加载了 ${json.categories.length} 个分类，${json.sites.length} 个网址。`, 'success');
        } else {
          showMsg('无法识别 JSON 文件格式。', 'error');
        }
      } catch {
        showMsg('JSON 文件解析失败，请检查文件内容。', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Change credentials
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newUsername.trim() || !newPassword) return;
    if (newPassword !== confirmPassword) {
      showMsg('两次输入的次新密码不一致！', 'error');
      return;
    }

    setCredLoading(true);
    const res = await changeCredentials(oldPassword, newUsername.trim(), newPassword);
    setCredLoading(false);

    if (res === 'ok') {
      showMsg('账号名与密码修改成功！', 'success');
      setOldPassword('');
      setNewUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } else if (res === 'wrong_password') {
      showMsg('当前旧密码错误！', 'error');
    } else {
      showMsg('修改失败，请重试。', 'error');
    }
  };

  // Filtered sites
  const filteredSites = sites.filter((site) => {
    const matchesCat = selectedCatId === 'all' || site.category_id === selectedCatId;
    const matchesSearch =
      !searchFilter.trim() ||
      site.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      site.url.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const sidebarNav: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'sites', label: '网址管理', icon: <Globe className="w-4 h-4" />, badge: sites.length },
    { key: 'categories', label: '分类管理', icon: <Layers className="w-4 h-4" />, badge: categories.length },
    { key: 'cloud', label: '云端与数据', icon: <Database className="w-4 h-4" /> },
    { key: 'security', label: '账号安全', icon: <Shield className="w-4 h-4" /> },
    { key: 'about', label: '关于 ApexNav', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200">
      {/* Main Container (macOS Double-Pane Layout) */}
      <div className="w-full max-w-5xl h-[85vh] max-h-[720px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">

        {/* ── 1. Left Sidebar ── */}
        <aside className="w-full md:w-64 bg-slate-100/70 dark:bg-slate-950/60 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">ApexNav</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">控制台 & 全局设置</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {sidebarNav.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    setIsSiteFormOpen(false);
                    setIsAddingCategory(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer (Current User Card) */}
          <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUsername ? currentUsername.charAt(0).toUpperCase() : 'G'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
                    {currentUsername || '未登录'}
                  </p>
                  <span className="text-[9px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    {isEnvAuth ? 'Cloudflare 秘钥保护' : '已登录'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  askConfirm('退出登录', '确定要退出当前管理员账号吗？', () => {
                    logout();
                    onClose();
                  }, true, '确认退出');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                title="退出账号"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── 2. Right Main Content Area ── */}
        <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-white dark:bg-slate-900">

          {/* Top Main Bar */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {sidebarNav.find((s) => s.key === activeTab)?.icon}
                {sidebarNav.find((s) => s.key === activeTab)?.label}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message Alert Notification */}
          {msg && (
            <div className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{msg.text}</span>
            </div>
          )}

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── TAB 1: 网址管理 (Bookmarks Management) ── */}
            {activeTab === 'sites' && (
              <div className="space-y-4">
                {/* Header Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="搜索网址或关键词..."
                        className="w-full pl-8 pr-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <CustomSelect
                      value={selectedCatId}
                      options={[
                        { id: 'all', label: '全部分类', count: sites.length },
                        ...categories.map((c) => ({
                          id: c.id,
                          label: c.name,
                          icon: c.icon,
                          count: sites.filter((s) => s.category_id === c.id).length,
                        })),
                      ]}
                      onChange={(val) => setSelectedCatId(val)}
                    />
                  </div>

                  <button
                    onClick={() => handleOpenSiteForm()}
                    className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增网址
                  </button>
                </div>

                {/* Inline Site Form Drawer (No nested modal popup!) */}
                {isSiteFormOpen && (
                  <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 animate-in slide-in-from-top-3">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                        {editingSite ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingSite ? `修改网址「${editingSite.name}」` : '新增导航网址'}
                      </h4>
                      <button
                        onClick={() => setIsSiteFormOpen(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
                      >
                        取消
                      </button>
                    </div>

                    <form onSubmit={handleSaveSite} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">网站名称 *</label>
                        <input
                          type="text"
                          required
                          value={siteForm.name}
                          onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                          placeholder="例如: GitHub"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">网站 URL 地址 *</label>
                        <input
                          type="text"
                          required
                          value={siteForm.url}
                          onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                          placeholder="github.com"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">所属分类 *</label>
                        <CustomSelect
                          value={siteForm.category_id}
                          options={categories.map((c) => ({
                            id: c.id,
                            label: c.name,
                            icon: c.icon,
                          }))}
                          onChange={(val) => setSiteForm({ ...siteForm, category_id: val })}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">图标 URL (留空自动抓取 128px HD 图标)</label>
                        <input
                          type="text"
                          value={siteForm.icon}
                          onChange={(e) => setSiteForm({ ...siteForm, icon: e.target.value })}
                          placeholder="自定义图标 URL"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsSiteFormOpen(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                        >
                          {editingSite ? '保存修改' : '立即添加'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Sites List Grid */}
                <div className="space-y-2">
                  {filteredSites.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <Globe className="w-8 h-8 mx-auto mb-2 opacity-40 animate-bounce" />
                      暂无匹配的网址
                    </div>
                  ) : (
                    filteredSites.map((site) => {
                      const parentCat = categories.find((c) => c.id === site.category_id);
                      return (
                        <div
                          key={site.id}
                          className="px-4 py-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-2xl bg-slate-100/90 dark:bg-slate-700/80 border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1.5">
                              {site.icon ? (
                                <img src={site.icon} alt="" className="w-full h-full object-contain rounded-md" />
                              ) : (
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase">{site.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {site.name}
                                </span>
                                {parentCat && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-200/40 dark:border-indigo-800/40 shrink-0">
                                    {parentCat.icon} {parentCat.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {site.url}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                              title="访问网址"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleOpenSiteForm(site)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="修改网址"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                askConfirm(
                                  '删除网址',
                                  `确定要删除网址「${site.name}」吗？`,
                                  () => {
                                    onDeleteSite(site.id);
                                    showMsg(`已删除网址「${site.name}」`, 'success');
                                  },
                                  true,
                                  '确认删除'
                                );
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="删除网址"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 2: 分类管理 (Category Management) ── */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    分类可用来归类与收纳你的各类网页书签，点击编辑按钮可随时修改名称或 Emoji 图标。
                  </p>
                  <button
                    onClick={() => handleOpenCategoryForm()}
                    className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    新增分类
                  </button>
                </div>

                {/* Inline Category Creator / Editor Drawer */}
                {isAddingCategory && (
                  <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 animate-in slide-in-from-top-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                        {editingCategory ? <Edit3 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                        {editingCategory ? `编辑分类「${editingCategory.name}」` : '新增导航分类'}
                      </h4>
                      <button
                        onClick={() => setIsAddingCategory(false)}
                        className="text-xs text-slate-400 font-bold cursor-pointer"
                      >
                        取消
                      </button>
                    </div>

                    <form onSubmit={handleSaveCategory} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">分类名称 *</label>
                          <input
                            type="text"
                            required
                            value={catName}
                            onChange={(e) => setCatName(e.target.value)}
                            placeholder="例如: 实用工具"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Emoji 图标</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={catIcon}
                              onChange={(e) => setCatIcon(e.target.value)}
                              placeholder="📁"
                              className="w-16 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-1 overflow-x-auto py-1">
                              {PRESET_EMOJIS.slice(0, 10).map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => setCatIcon(emoji)}
                                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-100 text-xs flex items-center justify-center cursor-pointer shrink-0"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingCategory(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                        >
                          {editingCategory ? '保存修改' : '立即添加'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Categories Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const catSiteCount = sites.filter((s) => s.category_id === cat.id).length;
                    return (
                      <div
                        key={cat.id}
                        className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                            {cat.icon}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {cat.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {catSiteCount} 个网址
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenCategoryForm(cat)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="修改分类"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              askConfirm(
                                '删除分类',
                                `确认要删除分类「${cat.name}」及其包含的所有 ${catSiteCount} 个网址吗？`,
                                () => {
                                  onDeleteCategory(cat.id);
                                  showMsg(`已删除分类「${cat.name}」`, 'success');
                                },
                                true,
                                '确认删除'
                              );
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="删除分类"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 3: 云端与数据 (Cloud Sync & Backup) ── */}
            {activeTab === 'cloud' && (
              <div className="space-y-5">
                {/* Cloud Connection Status Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-800 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-2">
                    <Server className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-white">Cloudflare D1 无服务器数据库绑定状态</h4>
                  </div>
                  <p className="text-xs text-indigo-200 leading-relaxed">
                    已打通 Cloudflare D1 边缘数据库。多设备间可随时进行同步全量覆盖与拉取。
                  </p>
                  {currentUsername && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          showMsg('正在向 Cloudflare D1 数据库上传数据...', 'success');
                          const ok = await syncUserWithD1(currentUsername, categories, sites);
                          if (ok) {
                            showMsg('✅ 已成功将当前所有分类和网址写入 Cloudflare 云端数据库！', 'success');
                          } else {
                            showMsg('❌ 上传失败，请检查 Cloudflare 数据库绑定状态。', 'error');
                          }
                        }}
                        className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5" />
                        一键上传至云端数据库
                      </button>

                      <button
                        onClick={async () => {
                          showMsg('正在从 Cloudflare D1 拉取最新云端数据...', 'success');
                          const cloudData = await fetchUserD1Data(currentUsername);
                          if (cloudData && Array.isArray(cloudData.categories)) {
                            onImportData(cloudData.categories, cloudData.sites || []);
                            showMsg(`✅ 拉取成功！加载了云端 ${cloudData.categories.length} 个分类，${(cloudData.sites || []).length} 个网址。`, 'success');
                          } else {
                            showMsg('ℹ️ 未检测到云端有更新数据或数据库尚无记录。', 'error');
                          }
                        }}
                        className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        从云端数据库拉取最新
                      </button>
                    </div>
                  )}
                </div>

                {/* Local JSON Export & Import Card */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">JSON 文件备份与恢复</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    将你的所有分类和网址导出为本地 `.json` 备份文件，随时可以在其他网站或客户端中导入复原。
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={handleExportJSON}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      导出 JSON 备份文件
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      导入 JSON 备份文件
                    </button>
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-5 rounded-3xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
                  <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    危险操作区域
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        askConfirm(
                          '恢复默认预设',
                          '确定要恢复默认预设导航数据吗？这会覆盖重置当前所有修改。',
                          () => {
                            onResetDefault();
                            showMsg('已恢复默认示例网址。', 'success');
                          },
                          false,
                          '确认恢复'
                        );
                      }}
                      className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      恢复默认预设网址
                    </button>

                    <button
                      onClick={() => {
                        askConfirm(
                          '清空所有数据',
                          '确定要清空所有网址和分类吗？此操作不可撤销，建议先导出备份。',
                          () => {
                            onImportData([], []);
                            showMsg('数据已全部清空。', 'success');
                          },
                          true,
                          '确认清空'
                        );
                      }}
                      className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
                    >
                      清空当前账号所有数据
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: 账号安全 (Account Security) ── */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                {/* User Status Card */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/30">
                      {currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {currentUsername || '未登录'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          ● 当前已登录
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isEnvAuth ? '已启用 Cloudflare 环境变量固定密钥保护' : '使用标准密码加密管理账号'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      askConfirm('退出登录', '确定要退出当前账号吗？', () => {
                        logout();
                        onClose();
                      }, true, '确认退出');
                    }}
                    className="px-4 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    退出登录
                  </button>
                </div>

                {/* Change Credentials Card */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    修改账号密码
                  </h4>

                  {isEnvAuth ? (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                      🛡️ **提示**：当前已开启 Cloudflare 环境变量秘钥固定校验。若需修改密码，请登录 Cloudflare 控制台在 `Environment Variables` 中修改 `ADMIN_PASSWORD` 即可。
                    </div>
                  ) : (
                    <form onSubmit={handleChangeCredentials} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">当前旧密码 *</label>
                        <div className="relative">
                          <input
                            type={showOld ? 'text' : 'password'}
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="输入旧密码"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOld(!showOld)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">新用户名 *</label>
                          <input
                            type="text"
                            required
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="输入新用户名"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">新密码 *</label>
                          <div className="relative">
                            <input
                              type={showNew ? 'text' : 'password'}
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="输入新密码"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNew(!showNew)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">确认新密码 *</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="再次输入新密码"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={credLoading}
                          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                        >
                          {credLoading ? '修改中...' : '保存新账号信息'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 5: 关于 (About System) ── */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/30">
                      A
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">ApexNav</h3>
                      <p className="text-xs text-slate-400 font-medium">苹果风极简响应式导航系统 v2.5.0</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    ApexNav 是一款专为高效工作者打造的极简、无广告、响应式个人网址导航系统。集成了无缝跨设备 Cloudflare D1 数据库同步、实时网络节点监控、多引擎搜素与自动联想功能。
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400">前端框架</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">React 19 + Vite</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400">云端后端</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Cloudflare Pages</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400">云数据库</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Cloudflare D1 (SQLite)</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-xs text-slate-400 font-medium">开源许可证: MIT License</span>
                    <a
                      href="https://github.com/nianshu2022/ApexNav"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      访问 GitHub 仓库
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {confirmModal.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer ${
                  confirmModal.isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                }`}
              >
                {confirmModal.confirmText || '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
