import React, { useRef, useState } from 'react';
import {
  X, Download, Upload, RefreshCw, Database, CheckCircle2,
  Shield, Info, Eye, EyeOff, LogOut, KeyRound, Trash2,
  Layers, Plus, Edit3, Search, ExternalLink, ChevronDown, Check, AlertTriangle
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

type Tab = 'manage' | 'data' | 'security' | 'about';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

const PRESET_EMOJIS = ['📁', '🤖', '💻', '💬', '🛠️', '📚', '📢', '🚀', '⚡', '🎨', '📌', '⭐', '🔥', '🎮', '🎵', '🌐'];

// Custom Apple-style Dropdown Component
const CustomSelect: React.FC<{
  value: string;
  options: { id: string; label: string; icon?: string; count?: number }[];
  onChange: (val: string) => void;
}> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.id === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between gap-2 transition-all hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer min-w-[140px] shadow-2xs"
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label}</span>
          {selectedOption?.count !== undefined && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-mono text-slate-500 dark:text-slate-400">
              {selectedOption.count}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
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
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.icon && <span>{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                    {opt.count !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-400">
                        {opt.count}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
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
  onDeleteCategory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('manage');

  // Custom Confirm Dialog State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
      onConfirm,
      isDanger,
      confirmText,
    });
  };

  // Site / Category Manage Tab States
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  // Category inline form state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📁');

  // Site inline modal state
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [siteForm, setSiteForm] = useState({
    name: '',
    url: '',
    icon: '',
    description: '',
    category_id: categories[0]?.id || '1',
  });

  // Change credentials state
  const [oldPassword, setOldPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [credLoading, setCredLoading] = useState(false);

  const { logout, changeCredentials, currentUsername } = useAuth();

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
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
    if (newPassword.length < 4) { showMsg('新密码至少需要 4 位字符。', 'error'); return; }
    if (newPassword !== confirmPassword) { showMsg('两次输入的新密码不一致。', 'error'); return; }

    setCredLoading(true);
    const result = await changeCredentials(oldPassword, newUsername, newPassword);
    setCredLoading(false);

    if (result === 'ok') {
      showMsg('账号信息修改成功！', 'success');
      setOldPassword(''); setNewUsername(''); setNewPassword(''); setConfirmPassword('');
    } else if (result === 'wrong_password') {
      showMsg('当前密码错误，请重新输入。', 'error');
    } else {
      showMsg('修改失败，请稍后重试。', 'error');
    }
  };

  // Add Category Handler
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory({ name: newCatName.trim(), icon: newCatIcon.trim() || '📁' });
    setNewCatName('');
    setNewCatIcon('📁');
    setIsAddingCategory(false);
    showMsg('新增分类成功！', 'success');
  };

  // Add/Edit Site Modal Handler
  const handleOpenSiteModal = (site?: Site) => {
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
        category_id: selectedCatId !== 'all' ? selectedCatId : categories[0]?.id || '1',
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

    if (editingSite) {
      onEditSite({
        ...editingSite,
        ...siteForm,
        url: formattedUrl,
      });
      showMsg('网址修改成功！', 'success');
    } else {
      onAddSite({
        ...siteForm,
        url: formattedUrl,
      });
      showMsg('新增网址成功！', 'success');
    }
    setIsSiteModalOpen(false);
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

  const categoryFilterOptions = [
    { id: 'all', label: '全部分类', count: sites.length },
    ...categories.map((c) => ({
      id: c.id,
      label: c.name,
      icon: c.icon,
      count: sites.filter((s) => s.category_id === c.id).length,
    })),
  ];

  const categorySelectOptions = categories.map((c) => ({
    id: c.id,
    label: c.name,
    icon: c.icon,
  }));

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'manage', label: '网址管理', icon: <Layers className="w-4 h-4" /> },
    { key: 'data', label: '数据备份', icon: <Database className="w-4 h-4" /> },
    { key: 'security', label: '账号安全', icon: <Shield className="w-4 h-4" /> },
    { key: 'about', label: '关于', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-0 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">设置与管理</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 pt-4 pb-0 flex gap-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setMsg(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status Toast Message */}
          {msg && (
            <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
              msg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{msg.text}</span>
            </div>
          )}

          {/* ── 1. 网址与分类管理 ── */}
          {activeTab === 'manage' && (
            <div className="space-y-5">
              {/* Category Management Block */}
              <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    分类列表（{categories.length} 个）
                  </h4>
                  <button
                    onClick={() => {
                      setNewCatName('');
                      setNewCatIcon('📁');
                      setIsAddingCategory(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增分类
                  </button>
                </div>

                {/* Categories Pills Grid */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map((cat) => {
                    const catSiteCount = sites.filter((s) => s.category_id === cat.id).length;
                    return (
                      <div
                        key={cat.id}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium flex items-center gap-2 group shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                      >
                        <span className="text-sm">{cat.icon}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 font-mono font-bold text-slate-500 dark:text-slate-400">
                          {catSiteCount}
                        </span>
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
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer ml-0.5"
                          title="删除分类"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Site Management Header Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <CustomSelect
                    value={selectedCatId}
                    options={categoryFilterOptions}
                    onChange={(val) => setSelectedCatId(val)}
                  />

                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="搜索网址或链接..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 font-medium"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleOpenSiteModal()}
                  className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  新增网址
                </button>
              </div>

              {/* Sites List */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredSites.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
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
                            onClick={() => handleOpenSiteModal(site)}
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

          {/* ── 2. 数据备份 ── */}
          {activeTab === 'data' && (
            <>
              <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">备份与导入</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  导出当前所有书签数据为 JSON 文件，或从备份文件中恢复数据。
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleExportJSON}
                    className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    导出备份 JSON
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    导入备份 JSON
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

                  {currentUsername && (
                    <>
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
                        className="px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5" />
                        上传当前数据至云端
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
                        className="px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        从云端拉取最新数据
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
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
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    恢复默认预设
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
                    className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    清空所有数据
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 dark:text-slate-600 font-mono">
                  {categories.length} 分类 · {sites.length} 网址
                </span>
              </div>
            </>
          )}

          {/* ── 3. 账号安全 ── */}
          {activeTab === 'security' && (
            <>
              {/* Currently Logged In User Badge */}
              <div className="p-4 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md shrink-0">
                    {(currentUsername || 'Admin').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{currentUsername || 'Admin'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-400/30">
                        ● 当前在线
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">拥有全站管理与数据编辑权限</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangeCredentials} className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  修改账号信息
                </h4>

                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="当前密码"
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:ring-2 focus:ring-indigo-400/40 font-medium transition-all"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="新用户名"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:ring-2 focus:ring-indigo-400/40 font-medium transition-all"
                />

                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="新密码（至少 4 位）"
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:ring-2 focus:ring-indigo-400/40 font-medium transition-all"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="确认新密码"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:ring-2 focus:ring-indigo-400/40 font-medium transition-all"
                />

                <button
                  type="submit"
                  disabled={!oldPassword || !newUsername.trim() || !newPassword || !confirmPassword || credLoading}
                  className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {credLoading ? '保存中...' : '保存账号信息'}
                </button>
              </form>

              <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">退出登录</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">退出后恢复访客只读状态</p>
                </div>
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  退出登录
                </button>
              </div>
            </>
          )}

          {/* ── 4. 关于 ── */}
          {activeTab === 'about' && (
            <div className="space-y-3">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/40 dark:border-indigo-800/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <span className="text-white font-black text-sm">A</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">ApexNav</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">苹果风格极简个人导航主页</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <p>🚀 <span className="font-bold text-slate-700 dark:text-slate-300">技术栈</span>：React + TypeScript + Tailwind CSS v4</p>
                  <p>☁️ <span className="font-bold text-slate-700 dark:text-slate-300">部署</span>：Cloudflare Pages</p>
                  <p>🔒 <span className="font-bold text-slate-700 dark:text-slate-300">数据存储</span>：localStorage（本地加密优先）</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            完成
          </button>
        </div>

        {/* Inline Add/Edit Site Sub-Modal */}
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
                {editingSite ? '修改网址' : '新增网址'}
              </h3>

              <form onSubmit={handleSaveSite} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    所属分类 *
                  </label>
                  <CustomSelect
                    value={siteForm.category_id}
                    options={categorySelectOptions}
                    onChange={(val) => setSiteForm({ ...siteForm, category_id: val })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    网站名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={siteForm.name}
                    onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                    placeholder="例如：Google"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    网站 URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={siteForm.url}
                    onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                    placeholder="https://google.com"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    图标 URL <span className="text-slate-400 font-normal">（留空自动抓取）</span>
                  </label>
                  <input
                    type="text"
                    value={siteForm.icon}
                    onChange={(e) => setSiteForm({ ...siteForm, icon: e.target.value })}
                    placeholder="可选图标地址"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSiteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 cursor-pointer"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inline Add/Edit Category Sub-Modal */}
        {isAddingCategory && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
              <button
                onClick={() => setIsAddingCategory(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                新增分类
              </h3>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    分类名称 *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="例如：AI 工具、开发用具"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    分类图标 (Emoji)
                  </label>
                  <div className="flex items-center gap-2 mb-2.5">
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-14 px-2 py-2 text-center text-base font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <span className="text-xs text-slate-400 font-medium">可自定义或从下方选图标</span>
                  </div>

                  <div className="grid grid-cols-8 gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    {PRESET_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCatIcon(emoji)}
                        className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all cursor-pointer ${
                          newCatIcon === emoji
                            ? 'bg-indigo-600 text-white shadow-md scale-110'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 cursor-pointer"
                  >
                    保存分类
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Apple-Style Confirm Modal */}
        {confirmModal.isOpen && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal({ ...confirmModal, isOpen: false }); }}
          >
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
                  confirmModal.isDanger
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border-rose-200/60 dark:border-rose-800/60'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border-amber-200/60 dark:border-amber-800/60'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{confirmModal.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal({ ...confirmModal, isOpen: false });
                  }}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] cursor-pointer ${
                    confirmModal.isDanger
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                  }`}
                >
                  {confirmModal.confirmText || '确定'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
