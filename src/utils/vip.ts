export interface VipLicenseData {
  active: boolean; registeredTo?: string; key?: string; token?: string; activatedAt?: string
  expiresAt?: string | null; username?: string; storeName?: string; paymentRef?: string
}

export const FREE_TIER_LIMITS = { MAX_PRODUCTS: 50, MAX_TRANSACTIONS: 50, MAX_STAFF_ACCOUNTS: 1, MAX_UTANG_CUSTOMERS: 10 } as const
const licenses = new Map<string, VipLicenseData>()
let activeUsername: string | null = null
const VIP_EVENT_NAME = 'tinda_vip_status_changed'

export function getAccountVipStorageKey(username: string): string { return `server-vip:${username.trim().toLowerCase()}` }
export function setActiveVipUser(username?: string): void { activeUsername = username?.trim().toLowerCase() || null }
export function getActiveVaultUsername(): string | null { return activeUsername }
export function isVipActive(target?: string | { username?: string } | null): boolean {
  const username = typeof target === 'string' ? target : target?.username || activeUsername
  return Boolean(username && licenses.get(username.trim().toLowerCase())?.active)
}
export function getVipLicenseInfo(username?: string): VipLicenseData {
  return licenses.get((username || activeUsername || '').trim().toLowerCase()) || { active: false }
}
export function saveAccountVipLicense(username: string, data: VipLicenseData): void {
  const norm = username.trim().toLowerCase()
  if (!norm) return
  licenses.set(norm, { ...data, username: norm, active: true })
  activeUsername = norm
  window.dispatchEvent(new CustomEvent(VIP_EVENT_NAME))
}
export function clearAccountVipLicense(username: string): void {
  licenses.delete(username.trim().toLowerCase())
  window.dispatchEvent(new CustomEvent(VIP_EVENT_NAME))
}
export function subscribeVipStatus(callback: (active: boolean) => void): () => void {
  const handler = () => callback(isVipActive())
  window.addEventListener(VIP_EVENT_NAME, handler)
  return () => window.removeEventListener(VIP_EVENT_NAME, handler)
}

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('tinda_session_token')
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' }
}

export async function syncCloudVipStatus(username: string): Promise<boolean> {
  const norm = username.trim().toLowerCase()
  if (!norm) return false
  try {
    const res = await fetch(`/api/vip?username=${encodeURIComponent(norm)}`, { headers: authHeaders() })
    if (!res.ok) return false
    const data = await res.json()
    if (data.ok && data.isVip && data.license) {
      saveAccountVipLicense(norm, { active: true, token: data.license.token, key: data.license.token, paymentRef: data.license.paymentIntentId, registeredTo: data.license.registeredStore || norm, activatedAt: data.license.activatedAt })
      return true
    }
  } catch {}
  return false
}

export async function verifyAccountVipKey(keyOrToken: string, username: string, _storeName?: string): Promise<{ valid: boolean; reason?: string }> {
  if (!keyOrToken.trim()) return { valid: false, reason: 'License key cannot be empty.' }
  try {
    const res = await fetch('/api/vip', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ action: 'verify_token', token: keyOrToken.trim(), username: username.trim().toLowerCase() }) })
    const data = await res.json()
    return data.ok && data.valid ? { valid: true } : { valid: false, reason: 'License could not be verified by the server.' }
  } catch { return { valid: false, reason: 'License verification requires an online connection.' } }
}
export function canAddProduct(count: number, username?: string): boolean { return isVipActive(username) || count < FREE_TIER_LIMITS.MAX_PRODUCTS }
export function canAddStaffAccount(count: number, username?: string): boolean { return isVipActive(username) || count < FREE_TIER_LIMITS.MAX_STAFF_ACCOUNTS }
