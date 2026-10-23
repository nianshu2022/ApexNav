import React, { useRef, useState, useEffect } from 'react';

import {
  X, Download, Upload, RefreshCw, Database, CheckCircle2,
  Shield, Info, Eye, EyeOff, LogOut, KeyRound, Trash2,
  Layers, Plus, Edit3, Search, ExternalLink, AlertTriangle,
  FolderPlus, Globe, Sparkles, Server, ArrowRight, ChevronDown, Check,
} from 'lucide-react';
import type { Category, Site } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { syncUserWithD1, fetchUserD1Data, getApiBaseUrl, saveApiBaseUrl, resolveCloudConflict, getStoredNodes } from '../utils/storage';
import { downloadInvalidCloudSnapshot, downloadWorkspaceBackup } from '../utils/backup';
import type { BackupExtras } from '../utils/backup';
import { hasInvalidCloudData, pendingWrites } from '../utils/syncState';
import { hasLegacyProfile, importLegacyProfile } from '../utils/profileStorage';
import { MAX_BACKUP_BYTES } from '../../shared/navigation';
import { PREFERENCE_EVENT, usePreferences } from '../utils/preferences';
import { matchSite } from '../utils/searchMatcher';
import { CategoryIcon, CategoryIconPicker } from './SvgIcon';
import {
  parseBookmarkFileContent,
  mergeBookmarks,
  generateNetscapeBookmarksHtml,
  type ParsedBookmarkResult,
} from '../utils/bookmarkParser';
import { fetchSiteMetadata } from '../utils/siteParser';



interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: 'sites' | 'cloud';
  onClose: () => void;
  categories: Category[];
  sites: Site[];
  onImportData: (categories: Category[], sites: Site[], syncCloud?: boolean, extras?: BackupExtras) => void;
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
  initialTab = 'sites',
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
  const preferences = usePreferences();
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('sites');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Search & Filter state for site management
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState<string>(() => getApiBaseUrl());


  // Inline Site Add/Edit state
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isSiteFormOpen, setIsSiteFormOpen] = useState(false);
  const [isAiParsingSite, setIsAiParsingSite] = useState(false);
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
  const [catIcon, setCatIcon] = useState('folder');

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

  // Import Preview Modal State
  const [importPreview, setImportPreview] = useState<{
    isOpen: boolean;
    fileName: string;
    fileType: 'html' | 'json';
    result: ParsedBookmarkResult | null;
    mode: 'append' | 'replace';
  }>({
    isOpen: false,
    fileName: '',
    fileType: 'html',
    result: null,
    mode: 'append',
  });

  const [openInNewTabPref, setOpenInNewTabPref] = useState<boolean>(() => {
    return localStorage.getItem('apexnav_open_new_tab') !== 'false';
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
      setCatIcon(cat.icon || 'folder');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatIcon('folder');
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
          icon: catIcon,
        });
        showMsg(`分类「${catName.trim()}」修改成功！`, 'success');
      }
    } else {
      onAddCategory({
        name: catName.trim(),
        icon: catIcon,
      });
      showMsg(`新增分类「${catName.trim()}」成功！`, 'success');
    }
    setIsAddingCategory(false);
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!currentUsername) return;
    try {
      downloadWorkspaceBackup(currentUsername, categories, sites);
      showMsg('已发起 JSON 备份下载，请确认文件已保存。', 'success');
    } catch (error) { showMsg(error instanceof Error ? error.message : '备份导出失败', 'error'); }
  };

  // Export standard browser HTML bookmarks (Netscape Bookmark format)
  const handleExportHTML = () => {
    try {
      const html = generateNetscapeBookmarksHtml(categories, sites);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ApexNav-bookmarks-${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg('已成功导出为 Chrome / Edge / Safari 标准 HTML 书签文件！', 'success');
    } catch {
      showMsg('导出 HTML 书签失败，请重试。', 'error');
    }
  };

  // Import file (HTML or JSON)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) { showMsg('备份文件不能超过 8 MB', 'error'); e.target.value = ''; return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseBookmarkFileContent(text, file.name);

        if (parsed.stats.totalSites === 0 && !file.name.toLowerCase().endsWith('.json')) {
          showMsg('未在该文件中解析到任何有效书签，请检查文件格式。', 'error');
          return;
        }

        const isHtml =
          file.name.toLowerCase().endsWith('.html') ||
          file.name.toLowerCase().endsWith('.htm') ||
          text.includes('<DL>') ||
          text.includes('<dl>');

        setImportPreview({
          isOpen: true,
          fileName: file.name,
          fileType: isHtml ? 'html' : 'json',
          result: parsed,
          mode: 'append',
        });
      } catch (err: any) {
        showMsg(err.message || '文件解析失败，请检查文件格式。', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Confirm import action from preview dialog
  const handleConfirmImport = () => {
    if (!importPreview.result) return;
    try {
    const { categories: newCats, sites: newSites, stats } = importPreview.result;

    if (importPreview.mode === 'append') {
      const merged = mergeBookmarks(categories, sites, newCats, newSites);
      onImportData(merged.categories, merged.sites);
      showMsg(`成功合并导入 ${stats.totalSites} 个书签！现有 ${merged.categories.length} 个分类，${merged.sites.length} 个网址。`, 'success');
    } else {
      if (currentUsername) downloadWorkspaceBackup(currentUsername, categories, sites);
      onImportData(newCats, newSites, true, importPreview.result);
      showMsg(`全新导入成功！已加载 ${stats.totalCategories} 个分类，${stats.totalSites} 个网址。`, 'success');
    }

    setImportPreview((prev) => ({ ...prev, isOpen: false }));
    } catch (error) { showMsg(error instanceof Error ? error.message : '导入失败，原数据已保留', 'error'); }
  };

  const handleResolveConflict = (keepLocal: boolean) => {
    if (!currentUsername) return;
    askConfirm(keepLocal ? '使用本地数据覆盖云端' : '保留云端数据',
      '将先下载当前完整备份，并归档待同步记录。确认后以所选数据为准；请保留下载的备份。', async () => {
        try {
          downloadWorkspaceBackup(currentUsername, categories, sites);
          const result = await resolveCloudConflict(currentUsername, keepLocal, { categories, sites, nodes: getStoredNodes(currentUsername) });
          if (result) onImportData(result.categories, result.sites, false);
          showMsg('同步冲突已处理，个人小组件保持不变', 'success');
        } catch (error) { showMsg(error instanceof Error ? error.message : '处理失败', 'error'); }
      }, true, '确认处理');
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

  // Filtered sites (intelligently matches Name, Pinyin, and URL with Name priority)
  const filteredSites = sites
    .map((site) => ({
      site,
      catMatch: selectedCatId === 'all' || site.category_id === selectedCatId,
      searchRes: searchFilter.trim() ? matchSite(site, searchFilter) : { matched: true, score: 0 },
    }))
    .filter((item) => item.catMatch && item.searchRes.matched)
    .sort((a, b) => (b.searchRes.score || 0) - (a.searchRes.score || 0))
    .map((item) => item.site);

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
                        placeholder="搜索书签（按名称、拼音或网址）..."
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">网站 URL 地址 *</label>
                          <button
                            type="button"
                            disabled={isAiParsingSite}
                            onClick={async () => {
                              if (!siteForm.url.trim()) {
                                showMsg('请先填写网址 URL 地址', 'error');
                                return;
                              }
                              setIsAiParsingSite(true);
                              try {
                                const meta = await fetchSiteMetadata(siteForm.url);
                                setSiteForm((prev) => ({
                                  ...prev,
                                  url: prev.url.startsWith('http') ? prev.url : `https://${prev.url.trim()}`,
                                  name: prev.name.trim() || meta.name,
                                  icon: meta.icon,
                                  description: prev.description.trim() || meta.description,
                                }));
                                showMsg('AI 智能抓取网站信息成功！', 'success');
                              } catch (err: any) {
                                showMsg(err.message || '抓取失败，请检查网址格式', 'error');
                              } finally {
                                setIsAiParsingSite(false);
                              }
                            }}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-3 h-3 ${isAiParsingSite ? 'animate-spin' : ''}`} />
                            {isAiParsingSite ? '解析中...' : 'AI 智能识别'}
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={siteForm.url}
                          onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                          onBlur={() => {
                            if (siteForm.url.trim() && !siteForm.icon.trim()) {
                              let urlStr = siteForm.url.trim();
                              if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`;
                              try {
                                const parsedUrl = new URL(urlStr);
                                const domain = parsedUrl.hostname;
                                const hdIcon = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
                                setSiteForm((prev) => ({ ...prev, icon: hdIcon }));
                              } catch {}
                            }
                          }}
                          placeholder="github.com 或 https://github.com"
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
                    分类可用来归类与收纳你的各类网页书签，点击编辑按钮可随时修改名称或 SVG 图标。
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
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">分类图标</label>
                          <CategoryIconPicker value={catIcon} onChange={setCatIcon} />
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
                          <span className="inline-flex items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs text-indigo-600 dark:text-indigo-300">
                            <CategoryIcon icon={cat.icon} name={cat.name} className="w-5 h-5" />
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
                {currentUsername && hasInvalidCloudData(currentUsername) && (
                  <div role="alert" className="p-4 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 space-y-3 text-sm">
                    <p>云端书签或监控节点包含不符合当前规则的网址或图标地址。登录已恢复，但自动同步已暂停，云端原始数据不会被覆盖。</p>
                    <p>请先保存原始数据，再检查其中的网址；修复云端数据后可点击下方“从云端数据库拉取最新”。</p>
                    <button type="button" className="underline cursor-pointer" onClick={() => {
                      try { downloadInvalidCloudSnapshot(currentUsername); showMsg('已发起云端原始数据下载，请确认文件已保存。', 'success'); }
                      catch (error) { showMsg(error instanceof Error ? error.message : '原始数据下载失败', 'error'); }
                    }}>下载云端原始数据</button>
                  </div>
                )}
                {/* Extension & Remote Endpoint Configuration Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Chrome/Edge 扩展 远程 Cloudflare 服务器域名绑定
                      </h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                      扩展/跨域必填
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    在 Chrome/Edge 离线扩展中，请填写你在 Cloudflare Pages / Workers 部署的后端地址（如 <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">https://apexnav.pages.dev</code>），即可打通远端 D1 数据库秒级全量同步！
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={apiBaseUrlInput}
                      onChange={(e) => setApiBaseUrlInput(e.target.value)}
                      placeholder="https://your-apexnav-domain.pages.dev"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => {
                        saveApiBaseUrl(apiBaseUrlInput);
                        showMsg('已保存远程 Cloudflare API 服务器域名！', 'success');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      保存设置
                    </button>
                  </div>
                </div>

                {/* Cloud Connection Status Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-800 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-2">
                    <Server className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-white">Cloudflare D1 无服务器数据库绑定状态</h4>
                  </div>
                  <p className="text-xs text-indigo-200 leading-relaxed">
                    配置并登录 Cloudflare 后端后，可上传或拉取分类与网址。操作结果会显示同步是否成功。
                  </p>

                  {currentUsername && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          showMsg('正在向 Cloudflare D1 数据库上传数据...', 'success');
                          const ok = await syncUserWithD1(currentUsername, categories, sites);
                          if (ok) {
                            showMsg('已成功将当前所有分类和网址写入 Cloudflare 云端数据库！', 'success');
                          } else {
                            showMsg('上传未完成，本地修改已保留。请检查网络或处理同步冲突。', 'error');
                          }
                        }}
                        disabled={hasInvalidCloudData(currentUsername)}
                        className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Database className="w-3.5 h-3.5" />
                        一键上传至云端数据库
                      </button>

                      <button
                        onClick={async () => {
                          showMsg('正在从 Cloudflare D1 拉取最新云端数据...', 'success');
                          const cloudData = await fetchUserD1Data(currentUsername);
                          if (cloudData && Array.isArray(cloudData.categories)) {
                            onImportData(cloudData.categories, cloudData.sites || [], false);
                            showMsg(`拉取成功！加载了云端 ${cloudData.categories.length} 个分类，${(cloudData.sites || []).length} 个网址。`, 'success');
                          } else {
                            showMsg('未能拉取。若有待同步修改，请先完成上传或选择如何处理冲突。', 'error');
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

                {currentUsername && !hasInvalidCloudData(currentUsername) && pendingWrites(currentUsername).length > 0 && (
                  <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 space-y-3 text-sm">
                    <p>本地还有待同步修改。普通拉取不会覆盖这些内容；需要选择版本时，请先保留备份。</p>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="underline cursor-pointer" onClick={handleExportJSON}>导出当前完整备份</button>
                      <button type="button" className="underline cursor-pointer" onClick={() => handleResolveConflict(true)}>以本地为准</button>
                      <button type="button" className="underline cursor-pointer" onClick={() => handleResolveConflict(false)}>以云端为准</button>
                    </div>
                  </div>
                )}
                {currentUsername && hasLegacyProfile() && (
                  <div className="p-4 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-2 text-sm">
                    <p>检测到旧版未区分账号的小组件数据。可将它导入当前账号；其他账号和访客不会自动读取。</p>
                    <button type="button" className="underline cursor-pointer" onClick={() => askConfirm('导入旧版小组件', '确认这些待办、倒计时和收藏属于当前账号？导入前将备份当前数据。', () => {
                      try { handleExportJSON(); importLegacyProfile(); showMsg('旧版小组件已导入当前账号', 'success'); }
                      catch (error) { showMsg(error instanceof Error ? error.message : '导入失败', 'error'); }
                    })}>导入到当前账号</button>
                  </div>
                )}
                {/* Bookmark Migration, Backup & Restore Card */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-indigo-500" />
                      书签数据迁移、备份与导入
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      支持 HTML / JSON
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    支持一键导入 Chrome、Edge、Safari、Firefox、Arc 等浏览器导出的标准 HTML 书签文件，或 ApexNav JSON 备份；导入时支持智能合并追加或全新替换。
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer hover:scale-[1.02]"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      导入书签 (HTML / JSON)
                    </button>
                    <button
                      onClick={handleExportHTML}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="导出为标准浏览器书签文件，可直接导入回 Chrome/Edge/Safari/Firefox"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-500" />
                      导出 HTML 书签文件
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="导出分类、网址、节点、个人小组件和界面偏好，不包含登录凭据"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      导出完整 JSON 备份
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".html,.htm,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-sm">
                  <input type="checkbox" checked={preferences.suggestions} onChange={(event) => {
                    localStorage.setItem('apexnav_web_suggestions', String(event.target.checked));
                    window.dispatchEvent(new Event(PREFERENCE_EVENT));
                  }} />
                  <span>启用网络搜索联想<span className="block mt-1 text-xs text-slate-500">开启后，输入内容经当前后端发送给百度获取联想词，与所选搜索引擎无关。关闭时仍可搜索本地书签。</span></span>
                </label>
                {/* Browsing & Link Opening Preference Card */}
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ExternalLink className="w-4 h-4 text-indigo-500" />
                        网址打开方式偏好
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        自定义点击书签或搜索跳转时，是在全新标签页还是在当前标签页打开
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = localStorage.getItem('apexnav_open_new_tab') !== 'false';
                        const next = !current;
                        localStorage.setItem('apexnav_open_new_tab', String(next));
                        window.dispatchEvent(new Event(PREFERENCE_EVENT));
                        setOpenInNewTabPref(next);
                        showMsg(next ? '已开启：在新标签页中打开网址' : '已设置为：在当前标签页中打开网址', 'success');
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        openInNewTabPref ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          openInNewTabPref ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>当前状态：</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {openInNewTabPref ? '在新标签页打开 (推荐)' : '在当前标签页打开'}
                    </span>
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
                      <Shield className="w-4 h-4 inline-block align-text-bottom mr-1" aria-hidden />提示：当前已开启 Cloudflare 环境变量秘钥固定校验。若需修改密码，请登录 Cloudflare 控制台在 `Environment Variables` 中修改 `ADMIN_PASSWORD` 即可。
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

      {/* Import Preview Modal (Vision Pro Glassmorphism Card) */}
      {importPreview.isOpen && importPreview.result && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shadow-xs">
                  {importPreview.fileType === 'html' ? <Globe className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    导入书签预览
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                      {importPreview.fileType === 'html' ? 'HTML 浏览器书签' : 'JSON 备份'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs" title={importPreview.fileName}>
                    文件: {importPreview.fileName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportPreview((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">检测到分类</div>
                  <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {importPreview.result.stats.totalCategories} <span className="text-xs font-normal text-slate-400">个</span>
                  </div>
                </div>
                <FolderPlus className="w-6 h-6 text-slate-400" aria-hidden />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">有效书签网址</div>
                  <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {importPreview.result.stats.totalSites} <span className="text-xs font-normal text-slate-400">个</span>
                  </div>
                </div>
                <Layers className="w-6 h-6 text-indigo-400" aria-hidden />
              </div>
            </div>

            {/* Category breakdown preview */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>分类树与分布预览</span>
                <span className="text-[11px] text-slate-400 font-mono">共 {importPreview.result.categories.length} 个分类</span>
              </div>
              <div className="max-h-36 overflow-y-auto p-2.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex flex-wrap gap-1.5 custom-scrollbar">
                {importPreview.result.categories.map((cat) => {
                  const count = importPreview.result!.sites.filter((s) => s.category_id === cat.id).length;
                  return (
                    <span
                      key={cat.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200/60 dark:border-slate-600/50 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs"
                    >
                      <CategoryIcon icon={cat.icon} name={cat.name} className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        {count}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Import Mode Radio */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                请选择导入方式（合并只导入书签；替换同时恢复备份中的节点、小组件和偏好）：
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setImportPreview((prev) => ({ ...prev, mode: 'append' }))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    importPreview.mode === 'append'
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                      追加合并
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      推荐
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    保留现有书签，同名分类智能合并，自动忽略已存在的重复网址。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportPreview((prev) => ({ ...prev, mode: 'replace' }))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    importPreview.mode === 'replace'
                      ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-rose-500" aria-hidden />
                      全新覆盖
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
                      覆盖
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    替换分类和网址，并恢复文件中包含的节点、小组件及偏好；操作前自动下载当前备份。
                  </p>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setImportPreview((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] ${
                  importPreview.mode === 'append'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  确认{importPreview.mode === 'append' ? '合并追加' : '覆盖导入'} ({importPreview.result.stats.totalSites} 个书签)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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
