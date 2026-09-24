// Cloudflare Pages Function: /api/pro
// GET  /api/pro?username=... → fetch cloud pro state
// POST /api/pro             → upsert pro state (called after every ad watch/redeem)

interface Env {
  TINDAPOS_DB: D1Database
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type D1PreparedStatement = {
  bind: (...args: unknown[]) => D1PreparedStatement
  all: () => Promise<{ results: unknown[] }>
  first: () => Promise<unknown>
  run: () => Promise<void>
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  try {
    const url = new URL(request.url)
    const username = url.searchParams.get('username')
    if (!username) return Response.json({ ok: false, error: 'username required' }, { status: 400, headers: CORS })

    const state = await env.TINDAPOS_DB.prepare(
      'SELECT * FROM pro_access WHERE username = ? COLLATE NOCASE LIMIT 1'
    ).bind(username).first()

    return Response.json({ ok: true, state: state ?? null }, { headers: CORS })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const body = await request.json() as {
      user_id?: number; username: string; store_name?: string;
      pro_expires_at: number; tokens: number; last_ad_watched_at: number;
      total_ads_watched: number; owner_bypass: boolean;
    }

    if (!body.username) return Response.json({ ok: false, error: 'username required' }, { status: 400, headers: CORS })

    const now = new Date().toISOString()
    await env.TINDAPOS_DB.prepare(`
      INSERT INTO pro_access (user_id, username, store_name, pro_expires_at, tokens, last_ad_watched_at, total_ads_watched, owner_bypass, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        pro_expires_at = excluded.pro_expires_at,
        tokens = excluded.tokens,
        last_ad_watched_at = excluded.last_ad_watched_at,
        total_ads_watched = excluded.total_ads_watched,
        owner_bypass = excluded.owner_bypass,
        updated_at = excluded.updated_at
    `).bind(
      body.user_id ?? 0, body.username, body.store_name ?? null,
      body.pro_expires_at ?? 0, body.tokens ?? 0, body.last_ad_watched_at ?? 0,
      body.total_ads_watched ?? 0, body.owner_bypass ? 1 : 0, now
    ).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}
