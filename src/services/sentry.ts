import * as Sentry from '@sentry/react'

/**
 * Resolves the active DSN.
 * 1. Uses VITE_SENTRY_DSN if explicitly provided (e.g. Sentry.io).
 * 2. If absent in local/development environments, uses the built-in Vite envelope collector:
 *    `http://tinda_key@localhost:5173/1`
 *    This ensures 100% active end-to-end telemetry with zero skipped items.
 */
export function getActiveDsn(): string | null {
  if (import.meta.env.VITE_SENTRY_DSN) {
    return import.meta.env.VITE_SENTRY_DSN
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `${window.location.protocol}//tinda_key@${window.location.host}/1`
  }
  return null
}

/**
 * Indicates whether Sentry has been actively initialized.
 */
export let isSentryEnabled = false

/**
 * Initializes Sentry for TINDA-POS-Web.
 * Connects to Sentry Cloud (if VITE_SENTRY_DSN is configured) or to the local
 * Vite envelope collector for verified end-to-end event ingestion.
 */
export function initSentry(): void {
  const dsn = getActiveDsn()

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info(
        '[Sentry] No DSN available. Telemetry is running in disabled/mock mode.'
      )
    }
    isSentryEnabled = false
    return
  }

  try {
    Sentry.init({
      dsn,
      // Tunneling bypasses client adblockers / tracking protection (ERR_BLOCKED_BY_CLIENT)
      tunnel: '/api/telemetry/stream',
      environment: import.meta.env.MODE || 'development',
      release: 'tinda-pos-web@1.0.1',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false
        })
      ],
      // Performance Monitoring: 100% sampling for dev verification
      tracesSampleRate: 1.0,
      // Session Replay: 10% sample, 100% on error
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // If client is intentionally offline, do not attempt to queue noisy network errors
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return null
        }
        return event
      }
    })

    isSentryEnabled = true
    const target = dsn.includes('sentry.io') ? 'Sentry Cloud' : 'Local Ingest Collector'
    console.info(`[Sentry] Telemetry initialized successfully via: ${target} (${dsn})`)
  } catch (err) {
    console.error('[Sentry] Initialization error:', err)
    isSentryEnabled = false
  }
}

/**
 * Captures an exception with optional extra debug context.
 */
export function logException(error: unknown, context?: Record<string, unknown>): void {
  if (isSentryEnabled) {
    Sentry.captureException(error, {
      extra: context
    })
  } else {
    console.error('[Sentry Local Fallback] Captured Exception:', error, context)
  }
}

/**
 * Captures an informational or diagnostic message.
 */
export function logMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  if (isSentryEnabled) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    })
  } else {
    console.log(`[Sentry Local Fallback - ${level}]:`, message, context)
  }
}

/**
 * Attaches or clears the active cashier / store operator in Sentry context.
 */
export function setSentryUser(user: { id?: string; username?: string; role?: string } | null): void {
  if (!isSentryEnabled) return
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.username,
      segment: user.role
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Adds a lightweight breadcrumb for user actions (e.g. checkout, item scan, refund).
 */
export function addSentryBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  if (!isSentryEnabled) return
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info'
  })
}

/**
 * Fetches recent events ingested by the local Sentry development collector.
 */
export async function fetchRecentSentryEvents(): Promise<Array<{
  id: string
  receivedAt: string
  header: Record<string, unknown>
  itemHeader: Record<string, unknown>
  payload: Record<string, unknown>
}>> {
  try {
    const res = await fetch('/api/sentry/events')
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export { Sentry }
