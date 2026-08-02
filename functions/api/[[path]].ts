// Cloudflare Pages Function API for Multi-Account D1 Cross-Device Sync

interface Env {
  DB?: any;
}

export const onRequest: any = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);

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
        message: 'D1 Database not bound yet.',
      }),
      { headers, status: 200 }
    );
  }

  try {
    // Ensure table exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_nav_data (
        username TEXT PRIMARY KEY,
        categories_json TEXT NOT NULL,
        sites_json TEXT NOT NULL,
        nodes_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // GET /api/data?username=xxx -> Fetch account-specific data from D1
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
        return new Response(
          JSON.stringify({ success: true, isNewUser: true, categories: [], sites: [], nodes: [] }),
          { headers }
        );
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

    // POST /api/data -> Save account-specific data into D1
    if (request.method === 'POST') {
      const body = await request.json();
      const { username, categories, sites, nodes } = body;

      if (!username || !Array.isArray(categories) || !Array.isArray(sites)) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid payload' }), {
          headers,
          status: 400,
        });
      }

      const cleanUsername = username.trim().toLowerCase();
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
        .bind(cleanUsername, JSON.stringify(categories), JSON.stringify(sites), JSON.stringify(nodesData))
        .run();

      return new Response(
        JSON.stringify({ success: true, message: `Synced ${cleanUsername} data to Cloudflare D1` }),
        { headers }
      );
    }

    return new Response(JSON.stringify({ success: false, message: 'Not found' }), { headers, status: 404 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers, status: 500 });
  }
};
