interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check D1 DB binding
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" not found.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // GET /api/categories
    if (request.method === 'GET' && (path === '/categories' || path === '/categories/')) {
      const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // GET /api/sites
    if (request.method === 'GET' && (path === '/sites' || path === '/sites/')) {
      const { results } = await env.DB.prepare('SELECT * FROM sites ORDER BY sort_order ASC').all();
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // POST /api/sites
    if (request.method === 'POST' && (path === '/sites' || path === '/sites/')) {
      const body = await request.json() as any;
      await env.DB.prepare(
        'INSERT INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          body.id || `site_${Date.now()}`,
          body.category_id,
          body.name,
          body.url,
          body.icon || '',
          body.description || '',
          body.sort_order || 0
        )
        .run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // DELETE /api/sites/:id
    if (request.method === 'DELETE' && path.startsWith('/sites/')) {
      const id = path.replace('/sites/', '');
      await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
