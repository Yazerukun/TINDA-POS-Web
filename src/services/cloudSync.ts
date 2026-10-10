// cloudSync.ts — Silently sync user accounts and pro access to Cloudflare D1
// Local Dexie/IndexedDB remains as offline fallback.
// All cloud calls are fire-and-forget; failures are silent.

const API_BASE = '' // same-origin Cloudflare Pages Functions
const TOKEN_KEY = 'tinda_session_token'

export interface CloudUserPayload {
  username: string
  name: string
  email?: string
  pin: string
  status: string
  store_name?: string
  avatar_url?: string
  created_at: string
}

export interface CloudProPayload {
  user_id: number
  username: string
  store_name?: string
  pro_expires_at: number
  tokens: number
  last_ad_watched_at: number
  total_ads_watched: number
}

export interface CloudLoginResult {
  ok: boolean
  token?: string
  must_rotate_pin?: boolean
  error?: string
  user?: {
    id: number
    username: string
    name: string
    email: string | null
    role: string
    status: string
    store_name: string | null
    avatar_url: string | null
    is_owner: boolean
  }
}

// Every /api endpoint except /api/login and /api/prices requires this token.
// Without it the API answers 401, so the store falls back to local Dexie.
let sessionToken: string | null = null

export function setSessionToken(token: string | null): void {
  sessionToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function getSessionToken(): string | null {
  if (sessionToken) return sessionToken
  try {
    sessionToken = localStorage.getItem(TOKEN_KEY)
  } catch {}
  return sessionToken
}

function authHeaders(json: boolean): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const token = getSessionToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

/**
 * Exchange username + PIN for a session token. Also migrates a legacy
 * plaintext PIN to a hash on first successful login.
 */
export async function loginWithCloud(username: string, pin: string): Promise<CloudLoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ username, pin })
    })
    const data = (await res.json()) as CloudLoginResult
    if (data.ok && data.token) setSessionToken(data.token)
    return data
  } catch {
    return { ok: false, error: 'Offline' }
  }
}

/** Drop the token, e.g. on sign-out. */
export function clearSession(): void {
  setSessionToken(null)
}

/** Change the signed-in account's PIN. Requires the current PIN. */
export async function rotatePinOnCloud(
  username: string,
  currentPin: string,
  newPin: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ username, current_pin: currentPin, new_pin: newPin })
    })
    const data = (await res.json()) as { ok: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

/** Upsert a user account to Cloudflare D1. Fire-and-forget. */
export async function syncUserToCloud(user: CloudUserPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(user)
    })
    const data = (await res.json()) as { ok: boolean }
    return data.ok === true
  } catch {
    return false // Network offline — local Dexie is the fallback
  }
}

/** Upsert pro access state to Cloudflare D1. Fire-and-forget. */
export async function syncProStateToCloud(state: CloudProPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/pro`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(state)
    })
    const data = (await res.json()) as { ok: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

/** Fetch all users from cloud D1 — used by master admin cross-device view. */
export async function fetchAllCloudUsers(): Promise<unknown[]> {
  try {
    const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders(false) })
    const data = (await res.json()) as { ok: boolean; users: unknown[] }
    return data.ok ? data.users : []
  } catch {
    return []
  }
}

/** Fetch cloud pro state for one username. */
export async function fetchCloudProState(username: string): Promise<CloudProPayload | null> {
  try {
    const res = await fetch(`${API_BASE}/api/pro?username=${encodeURIComponent(username)}`, {
      headers: authHeaders(false)
    })
    const data = (await res.json()) as { ok: boolean; state: CloudProPayload | null }
    return data.ok ? data.state : null
  } catch {
    return null
  }
}

/** Send lightweight heartbeat to update last_active_at in Cloudflare D1 */
export async function sendHeartbeat(username: string): Promise<boolean> {
  if (!username) return false
  try {
    const res = await fetch(`${API_BASE}/api/heartbeat`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ username })
    })
    const data = (await res.json()) as { ok: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

/** Fetch all cloud pro access states (ads watched, tokens) — used by Master Admin */
export async function fetchAllCloudProStates(): Promise<CloudProPayload[]> {
  try {
    const res = await fetch(`${API_BASE}/api/pro`, { headers: authHeaders(false) })
    const data = (await res.json()) as { ok: boolean; states?: CloudProPayload[] }
    return data.ok && Array.isArray(data.states) ? data.states : []
  } catch {
    return []
  }
}