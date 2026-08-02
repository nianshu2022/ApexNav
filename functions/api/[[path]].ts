// Cloudflare Pages Function API for ApexNav Full D1 Database Backend

interface Env {
  DB?: any;
}

export const onRequest: any = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Check if D1 database is bound
  if (!env.DB) {
    return new Response(
      JSON.stringify({
        success: false,
        isD1Bound: false,
        message: 'D1 Database not bound yet.',
      }),
      { headers, status: 200 }
    );
  }

  try {
    // 1. Auto-ensure tables exist in D1
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

    // 2. REGISTER: POST /api/auth/register
    if (path.endsWith('/auth/register') && request.method === 'POST') {
      const { username, passwordHash } = await request.json();
      if (!username || !passwordHash) {
        return new Response(JSON.stringify({ success: false, message: '用户名和密码不可为空' }), { headers, status: 400 });
      }

      const cleanUn = username.trim().toLowerCase();
      const existingUser = await env.DB.prepare('SELECT username FROM users WHERE username = ?')
        .bind(cleanUn)
        .first();

      if (existingUser) {
        return new Response(JSON.stringify({ success: false, message: '该用户名已存在' }), { headers, status: 400 });
      }

      // Insert user
      await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
        .bind(cleanUn, passwordHash)
        .run();

      // Initialize empty nav data
      await env.DB.prepare(
        "INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json) VALUES (?, '[]', '[]', '[]')"
      )
        .bind(cleanUn)
        .run();

      return new Response(
        JSON.stringify({ success: true, isD1Bound: true, user: cleanUn, message: '账号注册成功，并同步至 D1 数据库！' }),
        { headers }
      );
    }

    // 3. LOGIN: POST /api/auth/login
    if (path.endsWith('/auth/login') && request.method === 'POST') {
      const { username, passwordHash } = await request.json();
      if (!username || !passwordHash) {
        return new Response(JSON.stringify({ success: false, message: '用户名和密码不可为空' }), { headers, status: 400 });
      }

      const cleanUn = username.trim().toLowerCase();
      const user = await env.DB.prepare('SELECT username, password_hash FROM users WHERE username = ?')
        .bind(cleanUn)
        .first();

      if (!user || user.password_hash !== passwordHash) {
        return new Response(JSON.stringify({ success: false, message: '用户名或密码错误' }), { headers, status: 401 });
      }

      // Fetch user's data
      const navRow = await env.DB.prepare(
        'SELECT categories_json, sites_json, nodes_json FROM user_nav_data WHERE username = ?'
      )
        .bind(cleanUn)
        .first();

      const categories = navRow ? JSON.parse(navRow.categories_json) : [];
      const sites = navRow ? JSON.parse(navRow.sites_json) : [];
      const nodes = navRow ? JSON.parse(navRow.nodes_json) : [];

      return new Response(
        JSON.stringify({
          success: true,
          isD1Bound: true,
          user: cleanUn,
          categories,
          sites,
          nodes,
        }),
        { headers }
      );
    }

    // 4. CHANGE PASSWORD: POST /api/auth/change-password
    if (path.endsWith('/auth/change-password') && request.method === 'POST') {
      const { username, oldPasswordHash, newUsername, newPasswordHash } = await request.json();
      const cleanOldUn = username.trim().toLowerCase();
      const cleanNewUn = newUsername ? newUsername.trim().toLowerCase() : cleanOldUn;

      const user = await env.DB.prepare('SELECT username, password_hash FROM users WHERE username = ?')
        .bind(cleanOldUn)
        .first();

      if (!user || user.password_hash !== oldPasswordHash) {
        return new Response(JSON.stringify({ success: false, message: '当前密码错误' }), { headers, status: 401 });
      }

      // Update password hash and username
      await env.DB.prepare('UPDATE users SET username = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?')
        .bind(cleanNewUn, newPasswordHash, cleanOldUn)
        .run();

      if (cleanOldUn !== cleanNewUn) {
        await env.DB.prepare('UPDATE user_nav_data SET username = ? WHERE username = ?')
          .bind(cleanNewUn, cleanOldUn)
          .run();
      }

      return new Response(JSON.stringify({ success: true, isD1Bound: true, message: '密码修改成功，已更新至 D1 数据库！' }), { headers });
    }

    // 5. GET DATA: GET /api/data?username=xxx
    if (request.method === 'GET') {
      const username = url.searchParams.get('username')?.trim().toLowerCase();
      if (!username) {
        return new Response(JSON.stringify({ success: true, categories: null, sites: null, nodes: null }), { headers });
      }

      const row = await env.DB.prepare(
        'SELECT categories_json, sites_json, nodes_json FROM user_nav_data WHERE username = ?'
      )
        .bind(username)
        .first();

      if (!row) {
        return new Response(JSON.stringify({ success: true, isNewUser: true, categories: [], sites: [], nodes: [] }), { headers });
      }

      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: false,
          categories: JSON.parse(row.categories_json),
          sites: JSON.parse(row.sites_json),
          nodes: JSON.parse(row.nodes_json),
        }),
        { headers }
      );
    }

    // 6. POST DATA: POST /api/data
    if (request.method === 'POST') {
      const body = await request.json();
      const { username, categories, sites, nodes } = body;

      if (!username || !Array.isArray(categories) || !Array.isArray(sites)) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid payload' }), { headers, status: 400 });
      }

      const cleanUn = username.trim().toLowerCase();
      const nodesData = Array.isArray(nodes) ? nodes : [];

      await env.DB.prepare(`
        INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(username) DO UPDATE SET
          categories_json = excluded.categories_json,
          sites_json = excluded.sites_json,
          nodes_json = excluded.nodes_json,
          updated_at = CURRENT_TIMESTAMP
      `)
        .bind(cleanUn, JSON.stringify(categories), JSON.stringify(sites), JSON.stringify(nodesData))
        .run();

      return new Response(JSON.stringify({ success: true, message: `Synced ${cleanUn} to Cloudflare D1` }), { headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Not found' }), { headers, status: 404 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers, status: 500 });
  }
};
