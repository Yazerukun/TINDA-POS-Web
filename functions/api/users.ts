// Cloudflare Pages Function: /api/users
// GET  /api/users?username=…|?store_name=… → account lookup (token required)
// POST /api/users                        → account signup (token required)
//
// Cross-store listing and staff management are master-only. `pin_hash`,
// `pin_salt`, `is_master` and `must_rotate_pin` are never sent to a client.

import {
  CORS,
  type Env,
  type UserRow,
  checkRateLimit,
  clearFailures,
  forbidden,
  isAllowedOrigin,
  makePinHash,
  recordFailure,
  requireSession,
  unauthorized
  ,logServerError
} from '../_shared/auth'

const PUBLIC_COLUMNS =
  'id, username, name, email, role, status, store_name, avatar_url, is_owner, created_at, updated_at, last_active_at'

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
    const storeName = url.searchParams.get('store_name')

    // Without a filter this dumps every account in the platform. Master only.
    if ((!username && !storeName) && !session.isMaster) return forbidden()
    // Another store's roster is master-only too.
    if (storeName && storeName !== session.storeName && !session.isMaster) return forbidden()

    let stmt
    if (username) {
      stmt = env.TINDAPOS_DB.prepare(
        `SELECT ${PUBLIC_COLUMNS} FROM users WHERE username = ? COLLATE NOCASE LIMIT 1`
      ).bind(username)
    } else if (storeName) {
      stmt = env.TINDAPOS_DB.prepare(
        `SELECT ${PUBLIC_COLUMNS} FROM users WHERE store_name = ? ORDER BY created_at ASC`
      ).bind(storeName)
    } else {
      stmt = env.TINDAPOS_DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at ASC`)
    }

    const { results } = await stmt.all()
    return Response.json({ ok: true, users: results }, { headers: CORS })
  } catch (err) {
    logServerError('users.get', err)
    return Response.json({ ok: false, error: 'Request could not be completed' }, { status: 500, headers: CORS })
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!isAllowedOrigin(request)) return unauthorized()

  // Signup is self-service and happens before anyone has a token, so it cannot
  // require one. It is rate limited instead, and every privilege is derived here
  // on the server — the request body has no say in role, ownership or master.
  const session = await requireSession(request, env)

  try {
    const body = (await request.json()) as {
      username?: string
      name?: string
      email?: string
      pin?: string
      status?: string
      store_name?: string
      avatar_url?: string
      created_at?: string
      current_pin?: string
      new_pin?: string
    }

    const username = body.username?.trim() ?? ''
    const now = new Date().toISOString()

    // --- Self-service: rotate your own PIN ---------------------------------
    // The plaintext PINs in D1 were readable through the old public endpoint,
    // so this is the path every account has to take before the PIN is trusted.
    if (body.new_pin) {
      if (!session) return unauthorized()
      const newPin = body.new_pin.trim()
      if (!/^\d{4,6}$/.test(newPin)) {
        return Response.json({ ok: false, error: 'PIN must be 4 to 6 digits' }, { status: 400, headers: CORS })
      }
      if (newPin === body.current_pin) {
        return Response.json({ ok: false, error: 'New PIN must be different' }, { status: 400, headers: CORS })
      }

      const user = await env.TINDAPOS_DB.prepare(
        'SELECT id, username, pin_hash, pin_salt FROM users WHERE id = ?'
      )
        .bind(session.userId)
        .first<UserRow>()
      if (!user) return unauthorized()

      if (!(await checkRateLimit(env.TINDAPOS_DB, user.username))) {
        return Response.json({ ok: false, error: 'Too many attempts.' }, { status: 429, headers: CORS })
      }
      const current = body.current_pin ?? ''
      const { hashPin } = await import('../_shared/auth')
      const matches = Boolean(user.pin_hash && user.pin_salt && current && (await hashPin(current, user.pin_salt)) === user.pin_hash)
      if (!matches) {
        await recordFailure(env.TINDAPOS_DB, user.username)
        return Response.json({ ok: false, error: 'Current PIN is incorrect' }, { status: 401, headers: CORS })
      }

      const { pin_hash, pin_salt } = await makePinHash(newPin)
      await env.TINDAPOS_DB.prepare(
        'UPDATE users SET pin_hash = ?, pin_salt = ?, pin = NULL, must_rotate_pin = 0, updated_at = ? WHERE id = ?'
      )
        .bind(pin_hash, pin_salt, now, user.id)
        .run()
      await clearFailures(env.TINDAPOS_DB, user.username)
      return Response.json({ ok: true, rotated: true }, { headers: CORS })
    }

    // --- Create an account -------------------------------------------------
    if (!body.name?.trim() || !username || !body.pin?.trim()) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400, headers: CORS })
    }
    const pin = body.pin.trim()
    if (!/^\d{4,6}$/.test(pin)) {
      return Response.json({ ok: false, error: 'PIN must be 4 to 6 digits' }, { status: 400, headers: CORS })
    }
    if (!(await checkRateLimit(env.TINDAPOS_DB, `signup:${username}`))) {
      return Response.json({ ok: false, error: 'Too many attempts. Try again later.' }, { status: 429, headers: CORS })
    }

    const existing = await env.TINDAPOS_DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
      .bind(username)
      .first<{ id: number }>()
    if (existing) {
      await recordFailure(env.TINDAPOS_DB, `signup:${username}`)
      return Response.json({ ok: false, error: 'Username already taken' }, { status: 409, headers: CORS })
    }

    // A store name is only claimed when it is free. Anyone can open a new store
    // by signing up; nobody can join an existing one by naming it.
    const storeName = body.store_name?.trim() || null
    let assignedStore = storeName
    if (storeName) {
      const store = await env.TINDAPOS_DB.prepare('SELECT store_name FROM stores WHERE store_name = ? COLLATE NOCASE')
        .bind(storeName)
        .first<{ store_name: string }>()
      if (store) assignedStore = null
    }

    // role/is_owner/is_master are server-derived, never read from the body.
    // A new account is an owner only because it just created its own store.
    const isOwner = assignedStore ? 1 : 0
    const role = isOwner ? 'ADMIN' : 'CASHIER'
    const { pin_hash, pin_salt } = await makePinHash(pin)

    await env.TINDAPOS_DB.prepare(
      `INSERT INTO users (username, name, email, role, pin, pin_hash, pin_salt, status, store_name, is_owner, avatar_url, created_at, updated_at, last_active_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        username,
        body.name.trim(),
        body.email ?? null,
        role,
        pin_hash,
        pin_salt,
        assignedStore,
        isOwner,
        body.avatar_url ?? null,
        now,
        now,
        now
      )
      .run()

    if (assignedStore) {
      await env.TINDAPOS_DB.prepare(
        `INSERT INTO stores (store_name, owner_username, owner_name, created_at)
         VALUES (?, ?, ?, ?) ON CONFLICT(store_name) DO NOTHING`
      )
        .bind(assignedStore, username, body.name.trim(), now)
        .run()
    }

    await clearFailures(env.TINDAPOS_DB, `signup:${username}`)
    return Response.json({ ok: true, created: username, store: assignedStore }, { headers: CORS })
  } catch (err) {
    logServerError('users.post', err)
    return Response.json({ ok: false, error: 'Request could not be completed' }, { status: 500, headers: CORS })
  }
}
