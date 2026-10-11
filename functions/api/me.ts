// Cloudflare Pages Function: /api/me
// GET /api/me → the signed-in account's own profile (token required).
//
// Used by the client to revalidate a restored session on reload. Mirrors the
// public shape of /api/login but reads the identity from the bearer token, so a
// tampered localStorage snapshot cannot claim another account or master rights.

import {
  CORS,
  type Env,
  type UserRow,
  isAllowedOrigin,
  logServerError,
  requireSession,
  unauthorized
} from '../_shared/auth'

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  if (!isAllowedOrigin(request)) return unauthorized()
  const session = await requireSession(request, env)
  if (!session) return unauthorized()

  try {
    const user = await env.TINDAPOS_DB.prepare(
      `SELECT id, username, name, email, role, status, store_name, avatar_url, is_owner, is_master
       FROM users WHERE id = ? LIMIT 1`
    )
      .bind(session.userId)
      .first<UserRow>()
    if (!user) return unauthorized()

    return Response.json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          store_name: user.store_name,
          avatar_url: user.avatar_url,
          is_owner: user.is_owner === 1,
          is_master: user.is_master === 1
        }
      },
      { headers: CORS }
    )
  } catch (err) {
    logServerError('me', err)
    return Response.json({ ok: false, error: 'Request could not be completed' }, { status: 500, headers: CORS })
  }
}
