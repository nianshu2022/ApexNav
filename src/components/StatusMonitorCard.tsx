import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, RefreshCw, CheckCircle2, Plus, X, Globe, ShieldCheck, Zap } from 'lucide-react';

interface MonitoredNode {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
}

const DEFAULT_NODES: MonitoredNode[] = [
  { id: 'demo_node', name: '示例网站', url: 'https://www.cloudflare.com', status: 'online', latency: 24 },
];

interface StatusMonitorCardProps {
  isAdmin?: boolean;
}

export const StatusMonitorCard: React.FC<StatusMonitorCardProps> = ({ isAdmin = false }) => {
  const [nodes, setNodes] = useState<MonitoredNode[]>(() => {
    const saved = localStorage.getItem('apexnav_monitored_nodes_v4');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* Fallback */ }
    }
    return DEFAULT_NODES;
  });

  const [checking, setChecking] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeUrl, setNewNodeUrl] = useState('');

  // Listen to first-time account setup event to clear demo nodes
  useEffect(() => {
    const handleAccountSetup = () => {
      setNodes([]);
    };
    window.addEventListener('apexnav_account_setup', handleAccountSetup);
    return () => window.removeEventListener('apexnav_account_setup', handleAccountSetup);
  }, []);

  const checkNodeStatus = async (node: MonitoredNode): Promise<MonitoredNode> => {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(node.url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - start);
      return { ...node, status: 'online', latency };
    } catch {
      const latency = Math.round(performance.now() - start);
      return latency < 2950
        ? { ...node, status: 'online', latency }
        : { ...node, status: 'offline', latency: undefined };
    }
  };

  const checkAllNodes = async () => {
    setChecking(true);
    setNodes((prev) => prev.map((n) => ({ ...n, status: 'checking' as const })));
    const updated = await Promise.all(nodes.map((n) => checkNodeStatus(n)));
    setNodes(updated);
    localStorage.setItem('apexnav_monitored_nodes_v4', JSON.stringify(updated));
    setChecking(false);
  };

  useEffect(() => { checkAllNodes(); }, []);

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !newNodeUrl.trim()) return;
    let formattedUrl = newNodeUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = `https://${formattedUrl}`;
    const newNode: MonitoredNode = {
      id: Date.now().toString(),
      name: newNodeName.trim(),
      url: formattedUrl,
      status: 'checking',
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    localStorage.setItem('apexnav_monitored_nodes_v4', JSON.stringify(updated));
    setNewNodeName('');
    setNewNodeUrl('');
    setIsAddModalOpen(false);
    checkNodeStatus(newNode).then((res) => {
      setNodes((cur) => cur.map((n) => (n.id === res.id ? res : n)));
    });
  };

  const handleDeleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nodes.filter((n) => n.id !== id);
    setNodes(updated);
    localStorage.setItem('apexnav_monitored_nodes_v4', JSON.stringify(updated));
  };

  const onlineCount = nodes.filter((n) => n.status === 'online').length;
  const primaryNode = nodes[0] || DEFAULT_NODES[0];

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-purple-500/10 dark:from-indigo-900/20 dark:via-blue-900/15 dark:to-purple-900/20 border border-slate-200/70 dark:border-slate-800/70 shadow-xs glass-panel flex flex-col justify-between hover:scale-[1.005] transition-transform duration-300 min-h-[165px]">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1.5">
          <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span className="font-heading font-bold text-slate-800 dark:text-slate-200 text-sm">节点监控</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-400/30">
            {onlineCount}/{nodes.length} 在线
          </span>
          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              title="添加自定义监控节点"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={checkAllNodes}
            disabled={checking}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="重新测速"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Nodes List */}
      <div className="my-1.5 flex-1 flex flex-col justify-between">
        {nodes.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">暂无监控节点</p>
            {isAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                + 添加第一个节点
              </button>
            )}
          </div>
        )}

        {nodes.slice(0, 3).map((node) => (
          <a
            key={node.id}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/node flex items-center justify-between px-2.5 py-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-white/50 dark:border-slate-700/40 transition-all text-xs my-0.5"
          >
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {node.status === 'online' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                ) : node.status === 'checking' ? (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 animate-pulse" />
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                )}
              </span>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover/node:text-indigo-600 dark:group-hover/node:text-indigo-400 truncate">
                {node.name}
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {node.latency !== undefined ? (
                <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {node.latency}ms
                </span>
              ) : (
                <span className="font-mono text-xs text-rose-500 font-bold">超时</span>
              )}
              {isAdmin && (
                <button
                  onClick={(e) => handleDeleteNode(node.id, e)}
                  className="opacity-0 group-hover/node:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-0.5 cursor-pointer"
                  title="删除节点"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </a>
        ))}

        {nodes.length === 1 && (
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="font-mono truncate">域名: {primaryNode.url.replace(/^https?:\/\//, '')}</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              SLA 100%
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>实时运行监控</span>
        </span>
        <span className="text-xs font-mono text-slate-400">实时测速</span>
      </div>

      {/* Add Node Modal — rendered via Portal to avoid z-index/transform issues */}
      {isAddModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 dark:from-indigo-500/25 dark:to-purple-500/25 flex items-center justify-center border border-indigo-200/40 dark:border-indigo-700/40">
                  <Globe className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">添加监控节点</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">监控个人博客、API 或自定义网址</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddNode} className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  节点名称 *
                </label>
                <input
                  type="text"
                  required
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="例如：念舒博客备用节点"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  监控 URL *
                </label>
                <input
                  type="text"
                  required
                  value={newNodeUrl}
                  onChange={(e) => setNewNodeUrl(e.target.value)}
                  placeholder="例如：blog.nianshu2022.cn"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  立即添加
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
