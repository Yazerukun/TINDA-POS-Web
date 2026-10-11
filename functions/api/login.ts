// Cloudflare Pages Function: /api/login
// POST { username, pin } → verify the PIN and mint a session token.
// This is the only endpoint that accepts a credential without a token.

import {
  CORS,
  type D1Database,
  type Env,
  type UserRow,
  checkRateLimit,
  clearFailures,
  isAllowedOrigin,
  mintToken,
  recordFailure,
  unauthorized,
  verifyPin,
  logServerError
} from '../_shared/auth'

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!isAllowedOrigin(request)) return unauthorized()

  try {
    const body = (await request.json()) as { username?: string; pin?: string }
    const username = body.username?.trim() ?? ''
    const pin = body.pin?.trim() ?? ''

    if (!username || !pin) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400, headers: CORS })
    }
    if (!(await checkRateLimit(env.TINDAPOS_DB, username))) {
      return Response.json(
        { ok: false, error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429, headers: CORS }
      )
    }

    const user = await env.TINDAPOS_DB.prepare(
      `SELECT id, username, name, email, role, status, store_name, is_owner, avatar_url,
              is_master, pin_hash, pin_salt, must_rotate_pin
       FROM users WHERE username = ? COLLATE NOCASE LIMIT 1`
    )
      .bind(username)
      .first<UserRow>()

    // Same response for unknown user and bad PIN so the endpoint cannot be used
    // to enumerate accounts.
    if (!user || !(await verifyPin(user, pin, env.TINDAPOS_DB))) {
      await recordFailure(env.TINDAPOS_DB, username)
      return Response.json({ ok: false, error: 'Invalid username or PIN' }, { status: 401, headers: CORS })
    }
    if (user.status !== 'ACTIVE') {
      return Response.json({ ok: false, error: 'This account is suspended.' }, { status: 403, headers: CORS })
    }

    await clearFailures(env.TINDAPOS_DB, username)

    const token = await mintToken(env, {
      userId: user.id,
      username: user.username,
      isMaster: user.is_master === 1,
      role: user.role,
      storeName: user.store_name
    })

    const now = new Date().toISOString()
    await env.TINDAPOS_DB.prepare('UPDATE users SET last_active_at = ? WHERE id = ?')
      .bind(now, user.id)
      .run<D1Database>()

    return Response.json(
      {
        ok: true,
        token,
        must_rotate_pin: user.must_rotate_pin === 1,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          store_name: user.store_name,
          avatar_url: user.avatar_url,
          is_owner: user.is_owner === 1
        }
      },
      { headers: CORS }
    )
  } catch (err) {
    logServerError('login', err)
    return Response.json({ ok: false, error: 'Authentication service unavailable' }, { status: 500, headers: CORS })
  }
}
