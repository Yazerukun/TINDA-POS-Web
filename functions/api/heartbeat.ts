// Cloudflare Pages Function: /api/heartbeat
// POST → update last_active_at for the caller's own account.
// The username comes from the session token, not the body, so this cannot be
// used to mark an arbitrary account as active.

import { CORS, type Env, isAllowedOrigin, requireSession, unauthorized } from '../_shared/auth'

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!isAllowedOrigin(request)) return unauthorized()

  const session = await requireSession(request, env)
  if (!session) {
    return Response.json({ ok: false, reason: 'unauthenticated' }, { headers: CORS })
  }

  try {
    const now = new Date().toISOString()
    await env.TINDAPOS_DB.prepare('UPDATE users SET last_active_at = ? WHERE id = ?')
      .bind(now, session.userId)
      .run()

    return Response.json({ ok: true, timestamp: now }, { headers: CORS })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}
