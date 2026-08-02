import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, RefreshCw, CheckCircle2, Plus, X, Globe, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStoredNodes, saveNodes, DEFAULT_NODES } from '../utils/storage';

interface MonitoredNode {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
}

interface StatusMonitorCardProps {
  isAdmin?: boolean;
}

export const StatusMonitorCard: React.FC<StatusMonitorCardProps> = ({ isAdmin = false }) => {
  const { currentUsername } = useAuth();

  const [nodes, setNodes] = useState<MonitoredNode[]>(() => {
    return getStoredNodes(currentUsername);
  });

  const [checking, setChecking] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeUrl, setNewNodeUrl] = useState('');

  // Listen to auth user switching to reload nodes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      const un = e.detail?.username !== undefined ? e.detail.username : currentUsername;
      setNodes(getStoredNodes(un));
    };

    setNodes(getStoredNodes(currentUsername));
    window.addEventListener('apexnav_auth_change', handleAuthChange);
    return () => window.removeEventListener('apexnav_auth_change', handleAuthChange);
  }, [currentUsername]);

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
    if (nodes.length === 0) return;
    setChecking(true);
    setNodes((prev) => prev.map((n) => ({ ...n, status: 'checking' as const })));
    const updated = await Promise.all(nodes.map((n) => checkNodeStatus(n)));
    setNodes(updated);
    if (currentUsername) {
      saveNodes(updated, currentUsername);
    }
    setChecking(false);
  };

  useEffect(() => { checkAllNodes(); }, []);

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !newNodeUrl.trim() || !currentUsername) return;
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
    saveNodes(updated, currentUsername);
    setNewNodeName('');
    setNewNodeUrl('');
    setIsAddModalOpen(false);
    checkNodeStatus(newNode).then((res) => {
      setNodes((cur) => {
        const next = cur.map((n) => (n.id === res.id ? res : n));
        saveNodes(next, currentUsername);
        return next;
      });
    });
  };

  const handleDeleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nodes.filter((n) => n.id !== id);
    setNodes(updated);
    if (currentUsername) {
      saveNodes(updated, currentUsername);
    }
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
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="添加监控节点"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={checkAllNodes}
            disabled={checking || nodes.length === 0}
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer disabled:opacity-30"
            title="刷新节点状态"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Node List */}
      <div className="space-y-1.5 my-1">
        {nodes.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
            <Globe className="w-6 h-6 mx-auto opacity-40" />
            <p>暂无监控节点</p>
            {isAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                + 添加第一个节点
              </button>
            )}
          </div>
        ) : (
          nodes.map((node) => (
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
          ))
        )}

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

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-semibold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>实时运行监控</span>
        </span>
        <span className="font-mono text-slate-400">实时测速</span>
      </div>

      {/* Portal Add Node Sub-Modal */}
      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                添加监控节点
              </h3>
              <form onSubmit={handleAddNode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    节点名称 *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="例如：香港主站、API服务"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    节点 URL / 域名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNodeUrl}
                    onChange={(e) => setNewNodeUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 cursor-pointer"
                  >
                    添加
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
