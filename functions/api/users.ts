// Cloudflare Pages Function: /api/users
// GET  → list all users (or filter by ?store_name= or ?username=)
// POST → upsert user account from any device

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
    const storeName = url.searchParams.get('store_name')

    let stmt: D1PreparedStatement
    if (username) {
      stmt = env.TINDAPOS_DB.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE LIMIT 1').bind(username)
    } else if (storeName) {
      stmt = env.TINDAPOS_DB.prepare('SELECT * FROM users WHERE store_name = ? ORDER BY created_at ASC').bind(storeName)
    } else {
      stmt = env.TINDAPOS_DB.prepare('SELECT id, username, name, email, role, status, store_name, is_owner, avatar_url, created_at, updated_at, last_active_at FROM users ORDER BY created_at ASC')
    }

    const { results } = await stmt.all()
    return Response.json({ ok: true, users: results }, { headers: CORS })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const body = await request.json() as {
      username: string; name: string; email?: string; role: string; pin: string;
      status: string; store_name?: string; is_owner?: boolean; avatar_url?: string; created_at: string;
    }

    if (!body.username || !body.name || !body.pin) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400, headers: CORS })
    }

    const now = new Date().toISOString()
    await env.TINDAPOS_DB.prepare(`
      INSERT INTO users (username, name, email, role, pin, status, store_name, is_owner, avatar_url, created_at, updated_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        status = excluded.status,
        store_name = excluded.store_name,
        is_owner = excluded.is_owner,
        avatar_url = excluded.avatar_url,
        updated_at = excluded.updated_at,
        last_active_at = excluded.last_active_at
    `).bind(
      body.username, body.name, body.email ?? null, body.role ?? 'CASHIER', body.pin,
      body.status ?? 'ACTIVE', body.store_name ?? null, body.is_owner ? 1 : 0,
      body.avatar_url ?? null, body.created_at ?? now, now, now
    ).run()

    // Register the store automatically if this is an owner signup
    if (body.store_name && body.is_owner) {
      await env.TINDAPOS_DB.prepare(`
        INSERT INTO stores (store_name, owner_username, owner_name, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(store_name) DO NOTHING
      `).bind(body.store_name, body.username, body.name, body.created_at ?? now).run()
    }

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}
