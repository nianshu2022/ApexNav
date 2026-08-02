// Cloudflare Pages Function API for ApexNav D1 Cross-Device Sync

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
        message: 'D1 Database not bound yet. Using local fallback.',
      }),
      { headers, status: 200 }
    );
  }

  try {
    // Ensure table exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS nav_data (
        id TEXT PRIMARY KEY,
        categories_json TEXT NOT NULL,
        sites_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // GET /api/data -> Read D1 data
    if (request.method === 'GET') {
      const row = await env.DB.prepare('SELECT categories_json, sites_json FROM nav_data WHERE id = ?')
        .bind('main')
        .first();

      if (!row) {
        return new Response(JSON.stringify({ success: true, categories: null, sites: null }), { headers });
      }

      return new Response(
        JSON.stringify({
          success: true,
          categories: JSON.parse(row.categories_json),
          sites: JSON.parse(row.sites_json),
        }),
        { headers }
      );
    }

    // POST /api/data -> Save D1 data
    if (request.method === 'POST') {
      const body = await request.json();
      const { categories, sites } = body;

      if (!categories || !sites) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid payload' }), {
          headers,
          status: 400,
        });
      }

      await env.DB.prepare(`
        INSERT INTO nav_data (id, categories_json, sites_json, updated_at)
        VALUES ('main', ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          categories_json = excluded.categories_json,
          sites_json = excluded.sites_json,
          updated_at = CURRENT_TIMESTAMP
      `)
        .bind(JSON.stringify(categories), JSON.stringify(sites))
        .run();

      return new Response(JSON.stringify({ success: true, message: 'Synced to Cloudflare D1' }), { headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Not found' }), { headers, status: 44 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers, status: 500 });
  }
};
