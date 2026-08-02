// Cloudflare Pages Function API for ApexNav Backend & Authentication

interface Env {
  DB?: any;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_HASH?: string;
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

  // Check if Cloudflare Environment Variable Secrets are configured
  const hasEnvSecrets = Boolean(
    env.ADMIN_USERNAME && (env.ADMIN_PASSWORD || env.ADMIN_PASSWORD_HASH)
  );

  // 1. GET /api/auth/mode: Returns authentication & D1 status
  if (path.endsWith('/auth/mode') && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        success: true,
        isEnvAuth: hasEnvSecrets,
        envUsername: hasEnvSecrets ? env.ADMIN_USERNAME : null,
        isD1Bound: Boolean(env.DB),
      }),
      { headers }
    );
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

    // 2. LOGIN: POST /api/auth/login
    if (path.endsWith('/auth/login') && request.method === 'POST') {
      const { username, password, passwordHash } = await request.json();

      // Mode A: Cloudflare Environment Variables & Secrets Verification
      if (hasEnvSecrets) {
        const cleanEnvUn = env.ADMIN_USERNAME!.trim().toLowerCase();
        const inputUn = (username || '').trim().toLowerCase();

        let isPasswordMatch = false;
        if (env.ADMIN_PASSWORD && password && password === env.ADMIN_PASSWORD) {
          isPasswordMatch = true;
        } else if (env.ADMIN_PASSWORD_HASH && passwordHash && passwordHash === env.ADMIN_PASSWORD_HASH) {
          isPasswordMatch = true;
        } else if (env.ADMIN_PASSWORD && passwordHash) {
          const encoder = new TextEncoder();
          const buf = await crypto.subtle.digest('SHA-256', encoder.encode(env.ADMIN_PASSWORD));
          const expectedHash = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          if (passwordHash === expectedHash) isPasswordMatch = true;
        }

        if (inputUn === cleanEnvUn && isPasswordMatch) {
          let categories: any[] = [];
          let sites: any[] = [];
          let nodes: any[] = [];

          if (env.DB) {
            const navRow = await env.DB.prepare(
              'SELECT categories_json, sites_json, nodes_json FROM user_nav_data WHERE username = ?'
            )
              .bind(cleanEnvUn)
              .first();
            if (navRow) {
              categories = JSON.parse(navRow.categories_json);
              sites = JSON.parse(navRow.sites_json);
              nodes = JSON.parse(navRow.nodes_json);
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              isEnvAuth: true,
              isD1Bound: Boolean(env.DB),
              user: cleanEnvUn,
              categories,
              sites,
              nodes,
            }),
            { headers }
          );
        }

        return new Response(JSON.stringify({ success: false, message: '账号或密码错误（Cloudflare 秘钥校验失败）' }), { headers, status: 401 });
      }

      // Mode B: D1 Database Authentication
      if (env.DB) {
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
            isEnvAuth: false,
            isD1Bound: true,
            user: cleanUn,
            categories,
            sites,
            nodes,
          }),
          { headers }
        );
      }

      return new Response(JSON.stringify({ success: false, message: '未配置 Cloudflare 环境变量或 D1 数据库' }), { headers, status: 400 });
    }

    // 3. REGISTER: POST /api/auth/register
    if (path.endsWith('/auth/register') && request.method === 'POST') {
      if (hasEnvSecrets) {
        return new Response(
          JSON.stringify({ success: false, message: '已启用 Cloudflare 环境变量固定密钥，禁止公网注册账户。' }),
          { headers, status: 403 }
        );
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, message: 'D1 数据库未绑定' }), { headers, status: 400 });
      }

      const { username, passwordHash } = await request.json();
      const cleanUn = username.trim().toLowerCase();

      const existingUser = await env.DB.prepare('SELECT username FROM users WHERE username = ?').bind(cleanUn).first();
      if (existingUser) {
        return new Response(JSON.stringify({ success: false, message: '该用户名已存在' }), { headers, status: 400 });
      }

      await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').bind(cleanUn, passwordHash).run();
      await env.DB.prepare("INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json) VALUES (?, '[]', '[]', '[]')")
        .bind(cleanUn)
        .run();

      return new Response(JSON.stringify({ success: true, user: cleanUn, message: '注册成功' }), { headers });
    }

    // 4. GET DATA: GET /api/data?username=xxx
    if (request.method === 'GET') {
      const username = url.searchParams.get('username')?.trim().toLowerCase();
      if (!username || !env.DB) {
        return new Response(
          JSON.stringify({ success: true, isD1Bound: Boolean(env.DB), categories: null, sites: null, nodes: null }),
          { headers }
        );
      }

      const row = await env.DB.prepare('SELECT categories_json, sites_json, nodes_json FROM user_nav_data WHERE username = ?')
        .bind(username)
        .first();

      if (!row) {
        return new Response(
          JSON.stringify({ success: true, isD1Bound: true, isNewUser: true, categories: [], sites: [], nodes: [] }),
          { headers }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          isD1Bound: true,
          isNewUser: false,
          categories: JSON.parse(row.categories_json),
          sites: JSON.parse(row.sites_json),
          nodes: JSON.parse(row.nodes_json),
        }),
        { headers }
      );
    }

    // 5. POST DATA: POST /api/data (Uses robust SELECT -> UPDATE / INSERT for cross-device D1 sync)
    if (request.method === 'POST') {
      if (!env.DB) {
        return new Response(JSON.stringify({ success: true, isD1Bound: false, message: 'Saved locally (D1 not bound)' }), { headers });
      }

      const body = await request.json();
      const { username, categories, sites, nodes } = body;
      const cleanUn = (username || '').trim().toLowerCase();

      if (!cleanUn || !Array.isArray(categories) || !Array.isArray(sites)) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid payload' }), { headers, status: 400 });
      }

      const nodesData = Array.isArray(nodes) ? nodes : [];
      const catsJson = JSON.stringify(categories);
      const sitesJson = JSON.stringify(sites);
      const nodesJson = JSON.stringify(nodesData);

      const existing = await env.DB.prepare('SELECT username FROM user_nav_data WHERE username = ?')
        .bind(cleanUn)
        .first();

      if (existing) {
        await env.DB.prepare(`
          UPDATE user_nav_data
          SET categories_json = ?, sites_json = ?, nodes_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE username = ?
        `)
          .bind(catsJson, sitesJson, nodesJson, cleanUn)
          .run();
      } else {
        await env.DB.prepare(`
          INSERT INTO user_nav_data (username, categories_json, sites_json, nodes_json, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
          .bind(cleanUn, catsJson, sitesJson, nodesJson)
          .run();
      }

      return new Response(JSON.stringify({ success: true, isD1Bound: true, message: `Synced ${cleanUn} to Cloudflare D1` }), { headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Not found' }), { headers, status: 404 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers, status: 500 });
  }
};
