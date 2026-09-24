// cloudSync.ts — Silently sync user accounts and pro access to Cloudflare D1
// Local Dexie/IndexedDB remains as offline fallback.
// All cloud calls are fire-and-forget; failures are silent.

const API_BASE = '' // same-origin Cloudflare Pages Functions

export interface CloudUserPayload {
  username: string
  name: string
  email?: string
  role: string
  pin: string
  status: string
  store_name?: string
  is_owner?: boolean
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
  owner_bypass: boolean
}

/** Upsert a user account to Cloudflare D1. Fire-and-forget. */
export async function syncUserToCloud(user: CloudUserPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    })
    const data = await res.json() as { ok: boolean }
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })
    const data = await res.json() as { ok: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

/** Fetch all users from cloud D1 — used by master admin cross-device view. */
export async function fetchAllCloudUsers(): Promise<unknown[]> {
  try {
    const res = await fetch(`${API_BASE}/api/users`)
    const data = await res.json() as { ok: boolean; users: unknown[] }
    return data.ok ? data.users : []
  } catch {
    return []
  }
}

/** Fetch cloud pro state for one username. */
export async function fetchCloudProState(username: string): Promise<CloudProPayload | null> {
  try {
    const res = await fetch(`${API_BASE}/api/pro?username=${encodeURIComponent(username)}`)
    const data = await res.json() as { ok: boolean; state: CloudProPayload | null }
    return data.ok ? data.state : null
  } catch {
    return null
  }
}
