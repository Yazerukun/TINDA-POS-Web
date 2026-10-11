// Shared auth for Cloudflare Pages Functions.
// Password/PIN hashing, stateless session tokens, and login rate limiting.
// PINs are 4-6 digits, so hashing alone is not enough — every credential
// check is paired with a rate limit and tokens carry a short expiry.

export interface Env {
  TINDAPOS_DB: D1Database
  SESSION_SECRET: string
}

export interface D1Database {
  prepare: (query: string) => D1PreparedStatement
}

export interface D1PreparedStatement {
  bind: (...args: unknown[]) => D1PreparedStatement
  all: () => Promise<{ results: unknown[] }>
  first: () => Promise<unknown>
  run: () => Promise<{ meta?: { changes?: number } }>
}

export interface UserRow {
  id: number
  username: string
  name: string
  email: string | null
  role: string
  status: string
  store_name: string | null
  is_owner: number
  avatar_url: string | null
  is_master: number
  pin_hash: string | null
  pin_salt: string | null
  must_rotate_pin: number
}

export interface Session {
  userId: number
  username: string
  isMaster: boolean
  isOwner: boolean
  role: string
  storeName: string | null
}

const TOKEN_TTL_SECONDS = 60 * 60 * 12
const PBKDF2_ITERATIONS = 100_000
const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 900

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

/** PBKDF2-SHA256. Returns a hex digest. */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const salt = fromB64url(saltHex)
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    256
  )
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Hash a PIN and return the values to store alongside the user row. */
export async function makePinHash(pin: string): Promise<{ pin_hash: string; pin_salt: string }> {
  const salt = b64url(randomSalt())
  return { pin_hash: await hashPin(pin, salt), pin_salt: salt }
}

/**
 * Verify a PIN against a server-side hash. Accounts without a hash fail closed.
 * so the plaintext is retired on first login.
 */
export async function verifyPin(user: UserRow, pin: string, _db: D1Database): Promise<boolean> {
  if (user.pin_hash && user.pin_salt) {
    return (await hashPin(pin, user.pin_salt)) === user.pin_hash
  }
  // Plaintext PINs are no longer accepted or migrated. Accounts must be
  // provisioned with a server-side hash before they can authenticate.
  return false
}

function sessionSecret(env: Env): string {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET is not configured')
  }
  return env.SESSION_SECRET
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify'
  ])
}

/** Stateless session token: base64url(payload).base64url(hmac). */
export async function mintToken(env: Env, session: Omit<Session, 'isOwner' | 'role' | 'storeName'> & {
  role: string
  storeName: string | null
}): Promise<string> {
  const payload = b64url(
    enc.encode(
      JSON.stringify({
        uid: session.userId,
        un: session.username,
        m: session.isMaster ? 1 : 0,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
      })
    )
  )
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(sessionSecret(env)), enc.encode(payload))
  return `${payload}.${b64url(new Uint8Array(sig))}`
}

/** Verify a bearer token and confirm the account still exists and is ACTIVE. */
export async function requireSession(request: Request, env: Env): Promise<Session | null> {
  const header = request.headers.get('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7)
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null

  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(sessionSecret(env)),
    fromB64url(sig) as BufferSource,
    enc.encode(payload) as BufferSource
  )
  if (!valid) return null

  let claims: { uid: number; un: string; m: number; exp: number }
  try {
    claims = JSON.parse(new TextDecoder().decode(fromB64url(payload)))
  } catch {
    return null
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null

  // A deleted, suspended, or newly demoted account must not ride an old token.
  const row = await env.TINDAPOS_DB.prepare(
    'SELECT id, username, role, status, store_name, is_owner, is_master FROM users WHERE id = ?'
  )
    .bind(claims.uid)
    .first<UserRow>()
  if (!row || row.status !== 'ACTIVE' || row.username !== claims.un) return null

  return {
    userId: row.id,
    username: row.username,
    // Re-read master from the row, not the token: demotion takes effect at once.
    isMaster: row.is_master === 1,
    isOwner: row.is_owner === 1,
    role: row.role,
    storeName: row.store_name
  }
}

export function unauthorized(): Response {
  return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: CORS })
}

export function forbidden(): Response {
  return Response.json({ ok: false, error: 'Forbidden' }, { status: 403, headers: CORS })
}

export const PRODUCTION_HOST = 'tindapos-web.pages.dev'

export const CORS: Record<string, string> = {
  'Content-Type': 'application/json',
  // Same-origin only. The API is called from the app's own origin, so there is
  // no reason for any other site to be able to reach it.
  'Access-Control-Allow-Origin': 'https://tindapos-web.pages.dev',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Vary': 'Origin'
}

/** Reject cross-site requests outright; CORS alone does not stop non-browser clients. */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true // same-origin fetches and native clients send no Origin

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  // Same-origin requests (local dev via `wrangler pages dev`, any deployment)
  // carry the app's own host in Origin, so compare it instead of hardcoding one.
  let requestHost: string
  try {
    requestHost = new URL(request.url).host
  } catch {
    return false
  }
  if (originHost === requestHost) return true

  // The production host plus its project preview deployments
  // (`<hash>.tindapos-web.pages.dev`).
  return originHost === PRODUCTION_HOST || originHost.endsWith(`.${PRODUCTION_HOST}`)
}

export function logServerError(context: string, error: unknown): void {
  console.error(`[${context}]`, error instanceof Error ? error.message : 'unknown error')
}

// --- Rate limiting -------------------------------------------------------
// A 4-6 digit PIN is brute-forceable no matter how it is stored, so failures
// are counted per account in D1 and lock the login endpoint after 5 tries.

export async function checkRateLimit(db: D1Database, username: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT fails, locked_until FROM login_attempts WHERE username = ?')
    .bind(username.toLowerCase())
    .first<{ fails: number; locked_until: number }>()
  if (!row) return true
  if (row.locked_until && row.locked_until > Date.now()) return false
  if (!row.fails) return true
  return true
}

export async function recordFailure(db: D1Database, username: string): Promise<void> {
  const key = username.toLowerCase()
  const row = await db
    .prepare('SELECT fails FROM login_attempts WHERE username = ?')
    .bind(key)
    .first<{ fails: number }>()
  const fails = (row?.fails ?? 0) + 1
  const lockedUntil = fails >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_SECONDS * 1000 : 0
  await db
    .prepare(
      `INSERT INTO login_attempts (username, fails, locked_until, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET fails = excluded.fails, locked_until = excluded.locked_until, updated_at = excluded.updated_at`
    )
    .bind(key, fails, lockedUntil, new Date().toISOString())
    .run()
}

export async function clearFailures(db: D1Database, username: string): Promise<void> {
  await db.prepare('DELETE FROM login_attempts WHERE username = ?').bind(username.toLowerCase()).run()
}
