/**
 * TINDA POS Web — VIP Pro Licensing & Tiering Governance
 * Centralized license status, tier limit enforcement, and reactive license state.
 */

export interface VipLicenseData {
  active: boolean
  registeredTo?: string
  key?: string
  activatedAt?: string
  expiresAt?: string | null
}

export const FREE_TIER_LIMITS = {
  MAX_PRODUCTS: 50,
  MAX_TRANSACTIONS: 50,
  MAX_STAFF_ACCOUNTS: 1,
  MAX_UTANG_CUSTOMERS: 10
} as const

const VIP_STORAGE_KEY = 'tinda_vip_license'
const VIP_EVENT_NAME = 'tinda_vip_status_changed'

/**
 * Checks if the current browser installation has an active VIP Pro license.
 */
export function isVipActive(): boolean {
  try {
    const raw = localStorage.getItem(VIP_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as VipLicenseData
    return Boolean(parsed && parsed.active)
  } catch {
    return false
  }
}

/**
 * Returns detailed VIP license metadata.
 */
export function getVipLicenseInfo(): VipLicenseData {
  try {
    const raw = localStorage.getItem(VIP_STORAGE_KEY)
    if (!raw) return { active: false }
    const parsed = JSON.parse(raw) as VipLicenseData
    return parsed && parsed.active ? parsed : { active: false }
  } catch {
    return { active: false }
  }
}

/**
 * Saves and activates a VIP Pro license.
 */
export function saveVipLicense(data: VipLicenseData): void {
  try {
    localStorage.setItem(VIP_STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(new CustomEvent(VIP_EVENT_NAME, { detail: data }))
  } catch (err) {
    console.error('Failed to save VIP license:', err)
  }
}

/**
 * Deactivates or clears the VIP license (reverts to Free Community Edition).
 */
export function clearVipLicense(): void {
  try {
    localStorage.removeItem(VIP_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(VIP_EVENT_NAME, { detail: { active: false } }))
  } catch (err) {
    console.error('Failed to clear VIP license:', err)
  }
}

/**
 * Subscribes a React component to VIP license state changes.
 */
export function subscribeVipStatus(callback: (active: boolean) => void): () => void {
  const handler = () => {
    callback(isVipActive())
  }
  window.addEventListener(VIP_EVENT_NAME, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(VIP_EVENT_NAME, handler)
    window.removeEventListener('storage', handler)
  }
}

/**
 * Evaluates whether adding another product is permitted.
 */
export function canAddProduct(currentProductCount: number): boolean {
  if (isVipActive()) return true
  return currentProductCount < FREE_TIER_LIMITS.MAX_PRODUCTS
}

/**
 * Evaluates whether adding another staff account is permitted.
 */
export function canAddStaffAccount(currentStaffCount: number): boolean {
  if (isVipActive()) return true
  return currentStaffCount < FREE_TIER_LIMITS.MAX_STAFF_ACCOUNTS
}
