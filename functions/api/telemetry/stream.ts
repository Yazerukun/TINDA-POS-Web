// functions/api/telemetry/stream.ts
// Sentry Tunneling endpoint for Cloudflare Pages (bypasses adblockers / ERR_BLOCKED_BY_CLIENT)

interface Env {
  VITE_SENTRY_DSN?: string
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = await context.request.text()
    const lines = body.split('\n').filter(Boolean)
    const header = lines[0] ? JSON.parse(lines[0]) : null

    if (!header) {
      return new Response(JSON.stringify({ error: 'Invalid envelope header' }), { status: 400 })
    }

    const dsn = context.env.VITE_SENTRY_DSN || (header.dsn as string)
    if (dsn && dsn.includes('sentry.io')) {
      const url = new URL(dsn)
      const projectId = url.pathname.replace('/', '')
      const sentryHost = url.hostname
      const upstreamUrl = `https://${sentryHost}/api/${projectId}/envelope/`

      const upstreamRes = await fetch(upstreamUrl, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'User-Agent': context.request.headers.get('User-Agent') || 'TINDA-Telemetry-Tunnel'
        }
      })

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    return new Response(JSON.stringify({ id: header.event_id || 'ok' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Tunnel error'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
