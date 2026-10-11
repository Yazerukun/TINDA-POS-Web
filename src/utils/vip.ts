/**
 * TINDA POS Web — 1:1 Account-Bound VIP Pro Licensing Governance
 * Ties VIP Pro Lifetime licenses directly to specific store owner accounts (1-to-1).
 * Supports real-time PayMongo QR Ph automated fulfillment and deterministic cryptographic keys.
 */

export interface VipLicenseData {
  active: boolean
  registeredTo?: string
  key?: string
  activatedAt?: string
  expiresAt?: string | null
  username?: string
  storeName?: string
  paymentRef?: string
}

export const FREE_TIER_LIMITS = {
  MAX_PRODUCTS: 50,
  MAX_TRANSACTIONS: 50,
  MAX_STAFF_ACCOUNTS: 1,
  MAX_UTANG_CUSTOMERS: 10
} as const

const VIP_EVENT_NAME = 'tinda_vip_status_changed'
const LEGACY_STORAGE_KEY = 'tinda_vip_license'

/**
 * Returns account-specific localStorage key for 1:1 license isolation.
 */
export function getAccountVipStorageKey(username: string): string {
  const norm = (username || '').trim().toLowerCase()
  return `tinda_vip_license_${norm}`
}

/**
 * Resolves the username of the currently logged-in cashier or store owner.
 */
export function getActiveVaultUsername(): string | null {
  try {
    const raw = localStorage.getItem('tinda_vault_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.username ? String(parsed.username).trim().toLowerCase() : null
  } catch {
    return null
  }
}

/**
 * Checks if the specified account (or active session) has an active VIP Pro license.
 * Guarantees 1:1 account isolation so newly registered accounts start as Free Community Edition.
 */
export function isVipActive(target?: string | { username?: string; isVip?: boolean } | null): boolean {
  try {
    // 1. Direct explicit boolean override if already attached to user object/session
    if (target && typeof target === 'object' && typeof target.isVip === 'boolean') {
      return target.isVip
    }

    // 2. Resolve username
    let targetUsername: string | null = null
    if (typeof target === 'string') {
      targetUsername = target.trim().toLowerCase()
    } else if (target && typeof target === 'object' && target.username) {
      targetUsername = target.username.trim().toLowerCase()
    } else {
      targetUsername = getActiveVaultUsername()
    }

    if (!targetUsername) {
      return false
    }

    // 3. Check account-scoped license
    const accountKey = getAccountVipStorageKey(targetUsername)
    const rawAccountLicense = localStorage.getItem(accountKey)
    if (rawAccountLicense) {
      const parsed = JSON.parse(rawAccountLicense) as VipLicenseData
      if (parsed && parsed.active) return true
    }

    // 4. Migration check: Check legacy device key ONLY if it was registered to this exact username
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw) as VipLicenseData
      if (
        legacyParsed &&
        legacyParsed.active &&
        legacyParsed.username &&
        legacyParsed.username.toLowerCase() === targetUsername
      ) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Returns detailed VIP license metadata for an account or current active session.
 */
export function getVipLicenseInfo(username?: string): VipLicenseData {
  try {
    const targetUser = username ? username.trim().toLowerCase() : getActiveVaultUsername()
    if (targetUser) {
      const accountKey = getAccountVipStorageKey(targetUser)
      const raw = localStorage.getItem(accountKey)
      if (raw) {
        const parsed = JSON.parse(raw) as VipLicenseData
        if (parsed?.active) return parsed
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as VipLicenseData
      if (parsed?.active && (!targetUser || parsed.username?.toLowerCase() === targetUser)) {
        return parsed
      }
    }

    return { active: false }
  } catch {
    return { active: false }
  }
}

/**
 * Saves and activates a 1:1 VIP Pro license strictly for a specific account username.
 */
export function saveAccountVipLicense(username: string, data: VipLicenseData): void {
  try {
    const norm = (username || '').trim().toLowerCase()
    if (!norm) return
    const accountKey = getAccountVipStorageKey(norm)
    const payload = { ...data, username: norm, active: true }
    localStorage.setItem(accountKey, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent(VIP_EVENT_NAME, { detail: payload }))
  } catch (err) {
    console.error('Failed to save account VIP license:', err)
  }
}

/**
 * Clears the VIP license for a specific account (reverts account to Free Community Edition).
 */
export function clearAccountVipLicense(username: string): void {
  try {
    const norm = (username || '').trim().toLowerCase()
    if (!norm) return
    const accountKey = getAccountVipStorageKey(norm)
    localStorage.removeItem(accountKey)
    window.dispatchEvent(new CustomEvent(VIP_EVENT_NAME, { detail: { username: norm, active: false } }))
  } catch (err) {
    console.error('Failed to clear account VIP license:', err)
  }
}

/**
 * Subscribes a React component to reactive VIP license state changes.
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
 * Generates an Account-Deterministic VIP License Key bound mathematically to the username.
 * Standard format: VIP-XXXX-XXXX-XXXX-XXXX
 */
export async function generateAccountVipKey(username: string, storeName?: string): Promise<string> {
  const normUser = (username || 'USER').trim().toLowerCase()
  const normStore = (storeName || '').trim().toLowerCase()
  const enc = new TextEncoder()
  const pepper = 'TINDA_VIP_SECURE_PEPPER_2026_FRANCIS_MAYA_09912255156'
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    enc.encode(`TINDA_ACCOUNT_V2::${normUser}::${normStore}::VIP_LIFETIME`)
  )
  const hex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  const chunk1 = hex.substring(0, 4)
  const chunk2 = hex.substring(4, 8)
  const chunk3 = hex.substring(8, 12)

  const checksumBuf = await crypto.subtle.digest('SHA-256', enc.encode(`${normUser}:${chunk1}${chunk2}${chunk3}`))
  const checksumHex = Array.from(new Uint8Array(checksumBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  const checksum = checksumHex.substring(0, 4)

  return `VIP-${chunk1}-${chunk2}-${chunk3}-${checksum}`
}

/**
 * Verifies whether a given VIP key mathematically belongs to this account or is the Master Dev Key.
 */
export async function verifyAccountVipKey(key: string, username: string, storeName?: string): Promise<boolean> {
  if (!key || typeof key !== 'string') return false
  const cleanKey = key.trim().toUpperCase()
  if (cleanKey === 'MASTER-VIP-2026') return true

  // Check account-bound expected key
  const expectedKey = await generateAccountVipKey(username, storeName)
  if (cleanKey === expectedKey) return true

  // Fallback check: check account key without storeName
  const fallbackExpected = await generateAccountVipKey(username, '')
  if (cleanKey === fallbackExpected) return true

  return false
}

/**
 * Evaluates whether adding another product is permitted for the active account.
 */
export function canAddProduct(currentProductCount: number, username?: string): boolean {
  if (isVipActive(username)) return true
  return currentProductCount < FREE_TIER_LIMITS.MAX_PRODUCTS
}

/**
 * Evaluates whether adding another staff account is permitted for the active account.
 */
export function canAddStaffAccount(currentStaffCount: number, username?: string): boolean {
  if (isVipActive(username)) return true
  return currentStaffCount < FREE_TIER_LIMITS.MAX_STAFF_ACCOUNTS
}
