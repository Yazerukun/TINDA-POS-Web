// Cloudflare Pages Function: /api/pro
// GET  /api/pro?username=… → pro state for one account (token required)
// POST /api/pro            → update own pro state (token required)
//
// `owner_bypass` is a server-owned grant. It is never read from the request
// body and an existing row keeps its stored value on update.

import {
  CORS,
  type Env,
  forbidden,
  isAllowedOrigin,
  requireSession,
  unauthorized
  ,logServerError
} from '../_shared/auth'

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  if (!isAllowedOrigin(request)) return unauthorized()

  const session = await requireSession(request, env)
  if (!session) return unauthorized()

  try {
    const url = new URL(request.url)
    const username = url.searchParams.get('username')

    if (username) {
      // Reading someone else's pro state means reading their ad/token history.
      if (username !== session.username && !session.isMaster) return forbidden()
      const state = await env.TINDAPOS_DB.prepare(
        'SELECT * FROM pro_access WHERE username = ? COLLATE NOCASE LIMIT 1'
      )
        .bind(username)
        .first()
      return Response.json({ ok: true, state: state ?? null }, { headers: CORS })
    }

    // Every store's pro state at once is platform-wide data: master only.
    if (!session.isMaster) return forbidden()
    const { results } = await env.TINDAPOS_DB.prepare('SELECT * FROM pro_access ORDER BY updated_at DESC').all()
    return Response.json({ ok: true, states: results }, { headers: CORS })
  } catch (err) {
    logServerError('pro.get', err)
    return Response.json({ ok: false, error: 'Request could not be completed' }, { status: 500, headers: CORS })
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!isAllowedOrigin(request)) return unauthorized()

  const session = await requireSession(request, env)
  if (!session) return unauthorized()

  try {
    const body = (await request.json()) as {
      user_id?: number
      username?: string
      store_name?: string
      pro_expires_at?: number
      tokens?: number
      last_ad_watched_at?: number
      total_ads_watched?: number
    }

    // Always the caller's own account, whatever username the body claims.
    const username = session.username
    const now = new Date().toISOString()

    // A caller cannot mint their own pro access. Only a master or the owner of
    // the account can extend it, and only the server decides by how much.
    const isSelf = body.username === username
    if (!isSelf && !session.isMaster) return forbidden()
    if (body.pro_expires_at && body.pro_expires_at > Date.now() + 1000 && !session.isMaster) {
      return forbidden()
    }

    await env.TINDAPOS_DB.prepare(
      `INSERT INTO pro_access (user_id, username, store_name, pro_expires_at, tokens, last_ad_watched_at, total_ads_watched, owner_bypass, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
       ON CONFLICT(username) DO UPDATE SET
         store_name = excluded.store_name,
         pro_expires_at = excluded.pro_expires_at,
         tokens = excluded.tokens,
         last_ad_watched_at = excluded.last_ad_watched_at,
         total_ads_watched = excluded.total_ads_watched,
         updated_at = excluded.updated_at`
    )
      .bind(
        session.userId,
        username,
        session.storeName,
        body.pro_expires_at ?? 0,
        body.tokens ?? 0,
        body.last_ad_watched_at ?? 0,
        body.total_ads_watched ?? 0,
        now
      )
      .run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    logServerError('pro.post', err)
    return Response.json({ ok: false, error: 'Request could not be completed' }, { status: 500, headers: CORS })
  }
}
