import { getApiBaseUrl, buildApiUrl } from './storage';

export interface SiteMetadata {
  name: string;
  description: string;
  icon: string;
  domain: string;
}

// 常见热门网站预设库（离线/网络受限时极速匹配）
const POPULAR_SITES_MAP: Record<string, { name: string; description: string }> = {
  'chatgpt.com': { name: 'ChatGPT', description: 'OpenAI 对话式人工智能' },
  'deepseek.com': { name: 'DeepSeek', description: '深度求索通用人工智能平台' },
  'claude.ai': { name: 'Claude', description: 'Anthropic AI 对话助手' },
  'gemini.google.com': { name: 'Google Gemini', description: 'Google 智能多模态 AI 助手' },
  'perplexity.ai': { name: 'Perplexity', description: 'AI 对话式搜索引擎' },
  'github.com': { name: 'GitHub', description: '全球最大的开源代码托管与协作平台' },
  'mdnice.com': { name: '墨滴 mdnice', description: 'Markdown 微信排版与格式转换工具' },
  'bilibili.com': { name: '哔哩哔哩', description: '国内知名弹幕视频与青年文化社区' },
  'v2ex.com': { name: 'V2EX', description: '创意工作者与技术讨论社区' },
  'linux.do': { name: 'LINUX DO', description: '新的技术讨论与开源社区' },
  'juejin.cn': { name: '稀土掘金', description: '面向全球开发者的技术内容分享社区' },
  'zhihu.com': { name: '知乎', description: '中文互联网高质量问答与知识社区' },
  'notion.so': { name: 'Notion', description: '全功能数字笔记与团队协作工作台' },
  'figma.com': { name: 'Figma', description: '云端协作式界面与原型设计工具' },
  'dribbble.com': { name: 'Dribbble', description: '全球顶尖设计师作品与创意灵感展示' },
  'iconfont.cn': { name: 'iconfont', description: '阿里巴巴矢量图标库' },
  'lucide.dev': { name: 'Lucide Icons', description: '优美现代的一致性开源矢量图标库' },
  'reactbits.dev': { name: 'React Bits', description: '轻量优雅的 React 动画动效组件库' },
  'uiverse.io': { name: 'uiverse', description: '精美开源 UI 交互组件与动画库' },
  'vercel.com': { name: 'Vercel', description: '现代前端与全栈部署托管平台' },
  'cloudflare.com': { name: 'Cloudflare', description: '全球云加速、安全防护与边缘计算平台' },
  'dash.cloudflare.com': { name: 'Cloudflare 控制台', description: 'Cloudflare 全球云网络与控制台' },
  'developer.mozilla.org': { name: 'MDN Web Docs', description: '权威的 Web 开发者技术文档' },
  'stackoverflow.com': { name: 'Stack Overflow', description: '全球开发者问答与技术交流平台' },
  'excalidraw.com': { name: 'Excalidraw', description: '极简手绘风格白板与画图协作工具' },
  'drive.google.com': { name: 'Google Drive', description: 'Google 云端硬盘与文档存储服务' },
  'poe.com': { name: 'Poe', description: '多合一 AI 模型对话探索平台' },
  'freecodecamp.org': { name: 'freeCodeCamp', description: '完全免费的学习编程与技术认证社区' },
  'coursera.org': { name: 'Coursera', description: '全球知名大学与在线课程平台' },
  'youtube.com': { name: 'YouTube', description: '全球知名视频分享与观看平台' },
  'mp.weixin.qq.com': { name: '微信公众平台', description: '微信公众号创作与内容运营平台' },
  'creator.douyin.com': { name: '抖音创作者服务平台', description: '抖音短视频与直播创作服务后台' },
  'creator.xiaohongshu.com': { name: '小红书创作服务平台', description: '小红书内容创作者官方工作台' },
  'huggingface.co': { name: 'Hugging Face', description: '开源 AI 模型、数据集与开源社区' },
  'gitlab.com': { name: 'GitLab', description: '全生命周期 DevOps 代码平台' },
  'gitee.com': { name: 'Gitee 码云', description: '国内知名代码托管与研发协作平台' },
  'feishu.cn': { name: '飞书', description: '先进企业协作与协同办公套件' },
  'yuque.com': { name: '语雀', description: '专业云端知识库与文档协作工具' },
  'csdn.net': { name: 'CSDN', description: '中文 IT 技术交流与博客社区' },
};

/**
 * 解码 HTML 实体字符
 */
function decodeHtmlEntities(str: string): string {
  if (typeof document !== 'undefined') {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * 从 HTML 源码解析 title、description 与 favicon
 */
export function parseHtmlMetadata(html: string, targetUrl: string) {
  let title = '';
  let description = '';
  let icon = '';

  // 1. Title
  const ogTitleMatch =
    html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  if (ogTitleMatch && ogTitleMatch[1]) {
    title = ogTitleMatch[1].trim();
  } else if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // 2. Description
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  // 3. Icon
  const iconMatch =
    html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i) ||
    html.match(/<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i);
  if (iconMatch && iconMatch[1]) {
    const rawIcon = iconMatch[1].trim();
    try {
      icon = new URL(rawIcon, targetUrl).href;
    } catch {
      icon = rawIcon;
    }
  }

  if (title) title = decodeHtmlEntities(title);
  if (description) description = decodeHtmlEntities(description);

  return { title, description, icon };
}

/**
 * 根据域名智能推导友好的名称与描述（兜底策略）
 */
function getFallbackMetadata(domain: string, _url: string) {
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

  // 匹配已知常用网站
  if (POPULAR_SITES_MAP[cleanDomain]) {
    return {
      fallbackName: POPULAR_SITES_MAP[cleanDomain].name,
      fallbackDesc: POPULAR_SITES_MAP[cleanDomain].description,
    };
  }

  // 二级域名匹配（例如 editor.mdnice.com -> mdnice.com）
  const parts = cleanDomain.split('.');
  if (parts.length >= 2) {
    const rootDomain = parts.slice(-2).join('.');
    if (POPULAR_SITES_MAP[rootDomain]) {
      const parent = POPULAR_SITES_MAP[rootDomain];
      const sub = parts[0];
      const subName = sub.charAt(0).toUpperCase() + sub.slice(1);
      return {
        fallbackName: `${parent.name} (${subName})`,
        fallbackDesc: parent.description,
      };
    }
  }

  // 默认域名分段推导
  const mainPart = parts.length > 2 && ['app', 'web', 'editor', 'docs', 'console', 'api'].includes(parts[0])
    ? parts[1]
    : parts[0];

  const derivedName = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  return {
    fallbackName: derivedName,
    fallbackDesc: domain,
  };
}

/**
 * 核心：多级容灾的网站元信息智能抓取（支持 Chrome 扩展、远端 Cloudflare 后端、直连 Fetch、公共代理与离线兜底）
 */
export async function fetchSiteMetadata(rawUrl: string): Promise<SiteMetadata> {
  let formattedUrl = rawUrl.trim();
  if (!formattedUrl) {
    throw new Error('请输入网址 URL');
  }

  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  let domain = '';
  try {
    const urlObj = new URL(formattedUrl);
    domain = urlObj.hostname;
  } catch {
    throw new Error('无效的网址格式');
  }

  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const { fallbackName, fallbackDesc } = getFallbackMetadata(domain, formattedUrl);

  let resultName = '';
  let resultDesc = '';
  let resultIcon = '';

  // 1. 若配置了 API Base URL，或运行在 Web HTTP(S) 环境，尝试 Cloudflare Pages 后端
  const apiBase = getApiBaseUrl();
  const isWebHttp = typeof window !== 'undefined' && window.location.protocol.startsWith('http');
  if (apiBase || isWebHttp) {
    try {
      const res = await fetch(buildApiUrl('/api/ai/parse'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return {
            name: json.data.name || fallbackName,
            description: json.data.description || fallbackDesc,
            icon: json.data.icon || defaultFavicon,
            domain,
          };
        }
      }
    } catch {
      // 后端不可用或离线，平滑降级到客户端提取
    }
  }

  // 2. 客户端直连 Fetch（在 Chrome 扩展声明 host_permissions 下可免跨域直接读取 HTML）
  try {
    const resp = await fetch(formattedUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (resp.ok) {
      const html = await resp.text();
      const parsed = parseHtmlMetadata(html, formattedUrl);
      if (parsed.title) resultName = parsed.title;
      if (parsed.description) resultDesc = parsed.description;
      if (parsed.icon) resultIcon = parsed.icon;
    }
  } catch {
    // 直连失败（CORS 限制或超时）
  }

  // 3. 若直连未能获取标题，尝试免鉴权的公共元数据抓取服务 Microlink
  if (!resultName) {
    try {
      const mUrl = `https://api.microlink.io/?url=${encodeURIComponent(formattedUrl)}`;
      const resp = await fetch(mUrl, { signal: AbortSignal.timeout(3500) });
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === 'success' && json.data) {
          if (json.data.title) resultName = json.data.title;
          if (json.data.description) resultDesc = json.data.description;
          if (json.data.logo?.url) resultIcon = json.data.logo.url;
          else if (json.data.image?.url && !resultIcon) resultIcon = json.data.image.url;
        }
      }
    } catch {
      // Microlink 失败
    }
  }

  // 4. 清理格式并组合最终结果
  let finalName = (resultName || fallbackName).trim();
  if (finalName.length > 50) {
    finalName = finalName.slice(0, 50) + '...';
  }

  let finalDesc = (resultDesc || fallbackDesc).trim();
  if (finalDesc.length > 120) {
    finalDesc = finalDesc.slice(0, 120) + '...';
  }

  const finalIcon = resultIcon || defaultFavicon;

  return {
    name: finalName,
    description: finalDesc,
    icon: finalIcon,
    domain,
  };
}
