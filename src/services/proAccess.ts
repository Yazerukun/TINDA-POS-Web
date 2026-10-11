import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../db'
import type { ProAccessState } from '../types'
import { syncProStateToCloud } from './cloudSync'

const STORAGE_KEY_PREFIX = 'tinda_pro_access'
const DEFAULT_COOLDOWN_SECONDS = 30

function makeStorageKey(userId?: number | string) {
  return userId ? `${STORAGE_KEY_PREFIX}_u${userId}` : STORAGE_KEY_PREFIX
}

function makeDbKey(userId?: number | string) {
  return userId ? `pro_access_state_u${userId}` : 'pro_access_state'
}

// Get fresh locked state for a user (used on first login or reset)
function freshLockedState(): ProAccessState {
  return {
    pro_expires_at: 0,
    tokens: 0,
    last_ad_watched_at: 0,
    total_ads_watched: 0,
    owner_bypass: false
  }
}

// Default state: read from localStorage (fallback for backward compat)
function getInitialState(): ProAccessState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.warn('Error reading pro access from storage:', e)
  }
  return freshLockedState()
}

export function useProAccess() {
  const [state, setState] = useState<ProAccessState>(getInitialState)
  const [currentUserId, setCurrentUserId] = useState<number | string | undefined>(undefined)
  const [now, setNow] = useState<number>(Date.now())
  const [gateModalOpen, setGateModalOpen] = useState(false)
  const [pendingFeatureName, setPendingFeatureName] = useState<string>('')
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // Load from Dexie db on mount if available (legacy global key for backward compat)
  useEffect(() => {
    let mounted = true
    db.settings.get('pro_access_state').then((record) => {
      if (mounted && record && record.value) {
        setState(record.value)
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(record.value))
        } catch {}
      }
    }).catch(console.error)

    return () => {
      mounted = false
    }
  }, [])

  // 1-second real-time clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Persist helper — scoped to current user
  const persistState = useCallback(async (updated: ProAccessState) => {
    setState(updated)
    const storKey = makeStorageKey(currentUserId)
    const dbKey = makeDbKey(currentUserId)
    try {
      localStorage.setItem(storKey, JSON.stringify(updated))
    } catch {}
    try {
      await db.settings.put({ key: dbKey, value: updated })
    } catch (e) {
      console.warn('Could not persist pro access to Dexie:', e)
    }

    // Fire-and-forget sync to Cloudflare D1
    if (currentUserId) syncProStateToCloud({ user_id: Number(currentUserId) || 0, username: String(currentUserId), pro_expires_at: updated.pro_expires_at, tokens: updated.tokens, last_ad_watched_at: updated.last_ad_watched_at, total_ads_watched: updated.total_ads_watched }).catch(() => {})
  }, [currentUserId])

  // Called from App.tsx on login — load THIS user's state (or start fresh)
  const loadStateForUser = useCallback(async (userId: number | string) => {
    setCurrentUserId(userId)
    const dbKey = makeDbKey(userId)
    const storKey = makeStorageKey(userId)

    try {
      // Try Dexie first (most reliable)
      const record = await db.settings.get(dbKey)
      if (record?.value) {
        setState(record.value)
        try { localStorage.setItem(storKey, JSON.stringify(record.value)) } catch {}
        return record.value
      }

      // Try localStorage fallback
      const raw = localStorage.getItem(storKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setState(parsed)
        return parsed
      }
    } catch (e) {
      console.warn('loadStateForUser error:', e)
    }

    // No state found — start fresh (new user, or first login on this device)
    const fresh = freshLockedState()
    setState(fresh)
    try { localStorage.setItem(storKey, JSON.stringify(fresh)) } catch {}
    await db.settings.put({ key: dbKey, value: fresh })
    return fresh
  }, [])

  // isPro = permanently active for all accounts (ads and monetag removed)
  const isPro = true
  const isFullyUnlocked = true
  const remainingSeconds = 999999999
  const cooldownRemaining = 0
  const canWatchAd = false
  const formattedTime = 'PRO ACTIVE'

  // Watching an ad: Earns +1 Token to user's wallet
  const grantRewardForAd = useCallback(async () => {}, [])

  // Redeem / Convert banked tokens to Shift Time
  const redeemPackage = useCallback(async (_tokensCost: number, _hoursToGrant: number) => {
    return true
  }, [])

  // Keep grantRewardMinutes as alias for backwards compatibility
  const grantRewardMinutes = useCallback(async (_minutes?: number) => {}, [])

  // Admin Owner Bypass toggle
  const toggleOwnerBypass = useCallback(async (_enabled: boolean) => {}, [])

  // Immediate expiration for testing
  const expireNowForTesting = useCallback(async () => {}, [])

  // Gatekeeper: Always authorized (no ad gating)
  const requireProFeature = useCallback((_featureName: string, onAuthorized: () => void) => {
    onAuthorized()
    return true
  }, [])

  const openRewardModal = useCallback((_featureName = 'Unlock Pro Features') => {
    // No-op: ads removed
  }, [])

  const closeRewardModal = useCallback(() => {
    setGateModalOpen(false)
    setPendingAction(null)
  }, [])

  return {
    state,
    isPro,
    isFullyUnlocked,
    remainingSeconds,
    formattedTime,
    cooldownRemaining,
    canWatchAd,
    grantRewardForAd,
    grantRewardMinutes,
    redeemPackage,
    toggleOwnerBypass,
    expireNowForTesting,
    requireProFeature,
    gateModalOpen,
    pendingFeatureName,
    openRewardModal,
    closeRewardModal,
    loadStateForUser
  }
}
