import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, X, LogIn, ShieldPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, needsSetup, setupAccount } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setShowPassword(false);
      setTimeout(() => usernameRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || loading) return;

    if (needsSetup) {
      if (username.trim().length < 2) {
        setError('用户名至少需要 2 个字符');
        return;
      }
      if (password.length < 4) {
        setError('密码至少需要 4 位字符');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      setLoading(true);
      setError('');
      await setupAccount(username.trim(), password);
      setLoading(false);
      onSuccess();
      onClose();
      return;
    }

    setLoading(true);
    setError('');
    const success = await login(username, password);
    setLoading(false);

    if (success) {
      onSuccess();
      onClose();
    } else {
      setError('用户名或密码错误，请重试');
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 dark:from-indigo-500/25 dark:to-purple-500/25 flex items-center justify-center border border-indigo-200/40 dark:border-indigo-700/40">
              {needsSetup ? <ShieldPlus className="w-5 h-5 text-indigo-500" /> : <LogIn className="w-5 h-5 text-indigo-500" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {needsSetup ? '设置管理账号' : '登录'}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {needsSetup ? '首次使用请自定义账号密码' : '登录后可编辑书签与数据'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              用户名
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder={needsSetup ? '自定义用户名' : '请输入用户名'}
              autoComplete="username"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder={needsSetup ? '自定义密码（至少4位）' : '请输入密码'}
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-lg"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (if setup) */}
          {needsSetup && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="再次输入密码"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
              <span className="text-base leading-none">⚠</span>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!username.trim() || !password.trim() || (needsSetup && !confirmPassword.trim()) || loading}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-1"
          >
            {needsSetup ? <ShieldPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {loading ? '处理中...' : needsSetup ? '完成设置并登录' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};
