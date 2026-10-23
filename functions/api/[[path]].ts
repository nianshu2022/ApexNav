// Cloudflare Pages Function API for ApexNav Backend & Authentication

import { authenticate, createSession, getCredentialHash, hasEnvAuth, hashPassword, normalizeUsername } from '../_shared/auth';
import type { AuthEnv as Env } from '../_shared/auth';

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
  };
  if (!routes[path]) return reply({ success: false, message: 'Not found' }, 404);
  if (!routes[path].includes(request.method)) return reply({ success: false, message: 'Method not allowed' }, 405);

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
        isNewUser: false,
        categories: JSON.parse(row.categories_json), sites: JSON.parse(row.sites_json), nodes: JSON.parse(row.nodes_json),
      } : { isNewUser: true, categories: [], sites: [], nodes: [] };
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
    const body = request.method === 'POST' ? await request.json() : {};
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
    if (hasEnvSecrets) {
      await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?) ON CONFLICT(username) DO NOTHING')
        .bind(username, await getCredentialHash(env, username)).run();
    }
    // Omitted fields are preserved atomically; an explicit [] intentionally clears that field.
    await env.DB.prepare(`
      INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        categories_json = CASE WHEN ? THEN excluded.categories_json ELSE user_nav_data.categories_json END,
        sites_json = CASE WHEN ? THEN excluded.sites_json ELSE user_nav_data.sites_json END,
        nodes_json = CASE WHEN ? THEN excluded.nodes_json ELSE user_nav_data.nodes_json END,
        updated_at = CURRENT_TIMESTAMP
    `).bind(username, ...fields.map((field) => JSON.stringify(body[field] ?? [])), ...supplied.map(Number)).run();
    return reply({ success: true, isD1Bound: true });
  } catch (err: any) {
    return reply({ success: false, message: err instanceof SyntaxError ? 'Invalid JSON' : '服务暂时不可用' },
      err instanceof SyntaxError ? 400 : 500);
  }
};
