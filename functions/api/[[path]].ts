// Cloudflare Pages Function API for ApexNav Backend & Authentication

import { authenticate, createSession, getCredentialHash, hasEnvAuth, hashPassword, normalizeUsername } from '../_shared/auth';
import type { AuthEnv as Env } from '../_shared/auth';
import { MAX_BACKUP_BYTES, validateNavigation, validateNodes } from '../../shared/navigation';
import { parseSuggestions, readLimitedText } from '../_shared/external';

const rowVersion = (row: any): Promise<string> => hashPassword(JSON.stringify(row
  ? [row.categories_json, row.sites_json, row.nodes_json] : null));

export const onRequest: any = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Check if Cloudflare Environment Variable Secrets are configured
  const hasEnvSecrets = hasEnvAuth(env);
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { headers, status });
  const routes: Record<string, string[]> = {
    '/api/auth/mode': ['GET'], '/api/auth/login': ['POST'], '/api/auth/register': ['POST'],
    '/api/auth/change-password': ['POST'], '/api/ai/parse': ['POST'], '/api/data': ['GET', 'POST'],
    '/api/search/suggestions': ['GET'],
  };
  if (!routes[path]) return reply({ success: false, message: 'Not found' }, 404);
  if (!routes[path].includes(request.method)) return reply({ success: false, message: 'Method not allowed' }, 405);

  if (path === '/api/search/suggestions') {
    const query = url.searchParams.get('q')?.trim() || '';
    if (!query || query.length > 200) return reply({ suggestions: [] });
    try {
      const response = await fetch(`https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=apexnav`, {
        signal: AbortSignal.timeout(2500), redirect: 'error',
      });
      return reply({ suggestions: response.ok ? parseSuggestions(await readLimitedText(response, 65536)) : [] });
    } catch { return reply({ suggestions: [] }); }
  }

  // 1. GET /api/auth/mode: Returns authentication & D1 status
  if (path.endsWith('/auth/mode') && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        success: true,
        isEnvAuth: hasEnvSecrets,
        isD1Bound: Boolean(env.DB),
      }),
      { headers }
    );
  }

  // 1.5 POST /api/ai/parse: AI & Smart metadata parser for URLs
  if (path.endsWith('/ai/parse') && request.method === 'POST') {
    try {
      const { url: targetUrl } = await request.json();
      if (!targetUrl) {
        return new Response(JSON.stringify({ success: false, message: 'URL is required' }), { headers, status: 400 });
      }

      let formattedUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const domain = new URL(formattedUrl).hostname;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      let parsedTitle = domain;
      let parsedDesc = '';
      let parsedIcon = faviconUrl;

      try {
        const resp = await fetch(formattedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApexNav/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(3500),
        });
        if (resp.ok) {
          const text = await resp.text();
          const ogTitleMatch = text.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                               text.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
          const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (ogTitleMatch && ogTitleMatch[1]) {
            parsedTitle = ogTitleMatch[1].trim();
          } else if (titleMatch && titleMatch[1]) {
            parsedTitle = titleMatch[1].trim();
          }

          const descMatch = text.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                            text.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
                            text.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                            text.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
          if (descMatch && descMatch[1]) {
            parsedDesc = descMatch[1].trim();
          }

          const iconMatch = text.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
                            text.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i) ||
                            text.match(/<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i);
          if (iconMatch && iconMatch[1]) {
            try {
              parsedIcon = new URL(iconMatch[1].trim(), formattedUrl).href;
            } catch {}
          }
        }
      } catch {
        const namePart = domain.replace(/^www\./i, '').split('.')[0];
        parsedTitle = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            name: parsedTitle.length > 50 ? parsedTitle.slice(0, 50) + '...' : parsedTitle,
            description: parsedDesc.length > 120 ? parsedDesc.slice(0, 120) + '...' : parsedDesc,
            icon: parsedIcon,
            domain,
          },
        }),
        { headers }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { headers, status: 500 });
    }
  }

  try {
    // Ensure D1 database tables exist if D1 is bound
    if (env.DB) {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_nav_data (
          username TEXT PRIMARY KEY,
          categories_json TEXT NOT NULL,
          sites_json TEXT NOT NULL,
          nodes_json TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    }

    const navData = async (username: string) => {
      const row = env.DB ? await env.DB.prepare(
        'SELECT categories_json, sites_json, nodes_json FROM user_nav_data WHERE username = ?'
      ).bind(username).first() : null;
      return row ? {
        isNewUser: false, version: await rowVersion(row),
        categories: JSON.parse(row.categories_json), sites: JSON.parse(row.sites_json), nodes: JSON.parse(row.nodes_json),
      } : { isNewUser: true, categories: [], sites: [], nodes: [], version: await rowVersion(null) };
    };
    const loginReply = async (username: string, credentialHash: string) => reply({
      success: true, user: username, isEnvAuth: hasEnvSecrets, isD1Bound: Boolean(env.DB),
      ...await navData(username), ...await createSession(username, credentialHash, url.origin),
    });

    if (path === '/api/auth/login') {
      const body = await request.json();
      const username = normalizeUsername(body.username);
      const inputHash = typeof body.passwordHash === 'string' ? body.passwordHash
        : typeof body.password === 'string' ? await hashPassword(body.password) : '';
      const expected = username ? await getCredentialHash(env, username) : null;
      if (!expected || inputHash !== expected) {
        return reply({ success: false, message: '用户名或密码错误' }, 401);
      }
      return loginReply(username, expected);
    }

    if (path === '/api/auth/register') {
      if (hasEnvSecrets) return reply({ success: false, message: '已启用固定管理员账号，禁止公网注册。' }, 403);
      if (!env.DB) return reply({ success: false, message: 'D1 数据库未绑定' }, 503);
      const { username: rawUsername, passwordHash } = await request.json();
      const username = normalizeUsername(rawUsername);
      if (username.length < 2 || username.length > 100 || !/^[a-f0-9]{64}$/.test(passwordHash || '')) {
        return reply({ success: false, message: '账号或密码格式错误' }, 400);
      }
      const existing = await env.DB.prepare('SELECT username FROM users WHERE username = ?').bind(username).first();
      if (existing) return reply({ success: false, message: '该用户名已存在' }, 409);
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').bind(username, passwordHash),
        env.DB.prepare("INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json) VALUES (?, '[]', '[]', '[]')").bind(username),
      ]);
      return loginReply(username, passwordHash);
    }

    // All remaining routes require a signed session; a client-supplied username is never an identity.
    const username = await authenticate(request, env);
    if (!username) return reply({ success: false, message: '登录已失效，请重新登录' }, 401);
    const rawBody = request.method === 'POST' ? await request.text() : '{}';
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BACKUP_BYTES) return reply({ success: false, message: '数据超过 8 MB 限制' }, 413);
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ success: false, message: 'Invalid payload' }, 400);
    const requestedUser = request.method === 'GET' ? url.searchParams.get('username') : body.username;
    if (requestedUser != null && normalizeUsername(requestedUser) !== username) {
      return reply({ success: false, message: '无权访问其他账号的数据' }, 403);
    }

    if (path === '/api/auth/change-password') {
      if (hasEnvSecrets) return reply({ success: false, message: '请在 Cloudflare 环境变量中修改管理员账号密码' }, 403);
      if (!env.DB) return reply({ success: false, message: 'D1 数据库未绑定' }, 503);
      if (body.oldPasswordHash !== await getCredentialHash(env, username)) {
        return reply({ success: false, code: 'wrong_password', message: '当前密码错误' }, 400);
      }
      const newUsername = normalizeUsername(body.newUsername);
      if (newUsername.length < 2 || newUsername.length > 100 || !/^[a-f0-9]{64}$/.test(body.newPasswordHash || '')) {
        return reply({ success: false, message: '新账号或密码格式错误' }, 400);
      }
      if (newUsername === username) {
        await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?')
          .bind(body.newPasswordHash, username).run();
      } else {
        const existing = await env.DB.prepare('SELECT username FROM users WHERE username = ?').bind(newUsername).first();
        if (existing) return reply({ success: false, message: '该用户名已存在' }, 409);
        // Insert the new parent before moving data, so both deployed schemas (with/without FK) work.
        await env.DB.batch([
          env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').bind(newUsername, body.newPasswordHash),
          env.DB.prepare('INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json) SELECT ?, categories_json, sites_json, nodes_json FROM user_nav_data WHERE username = ?').bind(newUsername, username),
          env.DB.prepare('DELETE FROM user_nav_data WHERE username = ?').bind(username),
          env.DB.prepare('DELETE FROM users WHERE username = ?').bind(username),
        ]);
      }
      return loginReply(newUsername, body.newPasswordHash);
    }

    if (!env.DB) return reply({ success: false, isD1Bound: false, message: 'D1 数据库未绑定，数据仅保存在本地' }, 503);

    if (request.method === 'GET') {
      return reply({ success: true, isD1Bound: true, ...await navData(username) });
    }

    const fields = ['categories', 'sites', 'nodes'] as const;
    const supplied = fields.map((field) => Object.prototype.hasOwnProperty.call(body, field));
    if (!supplied.some(Boolean) || fields.some((field, i) => supplied[i] && !Array.isArray(body[field]))) {
      return reply({ success: false, message: 'Invalid payload' }, 400);
    }
    if (typeof body.baseVersion !== 'string') return reply({ success: false, message: '同步协议已更新，请刷新页面后重试' }, 428);
    const current = await env.DB.prepare('SELECT categories_json, sites_json, nodes_json FROM user_nav_data WHERE username = ?').bind(username).first();
    let next: { categories: unknown[]; sites: unknown[]; nodes: unknown[] };
    try {
      next = {
        ...validateNavigation(body.categories ?? JSON.parse(current?.categories_json || '[]'), body.sites ?? JSON.parse(current?.sites_json || '[]')),
        nodes: validateNodes(body.nodes ?? JSON.parse(current?.nodes_json || '[]')),
      };
    } catch (error) { return reply({ success: false, message: error instanceof Error ? error.message : '数据格式错误' }, 400); }
    const serialized = fields.map((field, i) => supplied[i] ? JSON.stringify(next[field]) : current?.[`${field}_json`] ?? '[]');
    const version = await rowVersion(current);
    if (body.baseVersion !== version) {
      // A response may have been lost after a successful write. An identical retry is safe to acknowledge.
      if (current && fields.every((field, i) => !supplied[i] || current[`${field}_json`] === serialized[i])) {
        return reply({ success: true, isD1Bound: true, version });
      }
      return reply({ success: false, message: '其他设备已更新云端数据，本地修改已保留。请在设置中选择如何处理。' }, 409);
    }
    if (hasEnvSecrets) {
      await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?) ON CONFLICT(username) DO NOTHING')
        .bind(username, await getCredentialHash(env, username)).run();
    }
    // Compare the exact snapshot inside the write statement; concurrent requests cannot both overwrite it.
    const result = await env.DB.prepare(`
      INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        categories_json = CASE WHEN ? THEN excluded.categories_json ELSE user_nav_data.categories_json END,
        sites_json = CASE WHEN ? THEN excluded.sites_json ELSE user_nav_data.sites_json END,
        nodes_json = CASE WHEN ? THEN excluded.nodes_json ELSE user_nav_data.nodes_json END,
        updated_at = CURRENT_TIMESTAMP
      WHERE ? AND user_nav_data.categories_json = ? AND user_nav_data.sites_json = ? AND user_nav_data.nodes_json = ?
    `).bind(username, ...serialized, ...supplied.map(Number), current ? 1 : 0,
      current?.categories_json ?? '', current?.sites_json ?? '', current?.nodes_json ?? '').run();
    if (result.meta?.changes !== 1) return reply({ success: false, message: '云端数据刚刚发生变化，请先处理同步冲突' }, 409);
    return reply({ success: true, isD1Bound: true, version: await rowVersion({ categories_json: serialized[0], sites_json: serialized[1], nodes_json: serialized[2] }) });
  } catch (err: any) {
    return reply({ success: false, message: err instanceof SyntaxError ? 'Invalid JSON' : '服务暂时不可用' },
      err instanceof SyntaxError ? 400 : 500);
  }
};
