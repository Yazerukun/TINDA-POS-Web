// Cloudflare Pages Function: /api/heartbeat
// POST → update last_active_at for a logged-in user in real-time

interface Env {
  TINDAPOS_DB: D1Database
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type D1PreparedStatement = {
  bind: (...args: unknown[]) => D1PreparedStatement
  run: () => Promise<void>
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const body = await request.json() as { username?: string }
    if (!body.username) {
      return Response.json({ ok: false, error: 'Missing username' }, { status: 400, headers: CORS })
    }

    const now = new Date().toISOString()
    await env.TINDAPOS_DB.prepare(`
      UPDATE users SET last_active_at = ? WHERE username = ? COLLATE NOCASE
    `).bind(now, body.username).run()

    return Response.json({ ok: true, timestamp: now }, { headers: CORS })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}
