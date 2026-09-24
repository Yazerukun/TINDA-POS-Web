import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../db'
import type { ProAccessState } from '../types'

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

  // Real-time calculations
  const remainingSeconds = useMemo(() => {
    if (state.owner_bypass) return 999999
    return Math.max(0, Math.floor((state.pro_expires_at - now) / 1000))
  }, [state.pro_expires_at, state.owner_bypass, now])

  // 3-token threshold: user has earned the "right" to use features (one-time gate crossed)
  // BUT they still need active time — tokens >= 3 is just the prerequisite, not a bypass
  const isFullyUnlocked = useMemo(() => {
    return state.owner_bypass || state.tokens >= 3
  }, [state.owner_bypass, state.tokens])

  // isPro = BOTH the 3-token gate crossed AND time is still active (or owner bypass)
  // When time hits 0 → features lock even if tokens >= 3 → must watch more ads to extend
  const isPro = useMemo(() => {
    if (state.owner_bypass) return true
    return isFullyUnlocked && remainingSeconds > 0
  }, [state.owner_bypass, remainingSeconds, isFullyUnlocked])

  // 30-second cooldown calculation
  const cooldownRemaining = useMemo(() => {
    if (!state.last_ad_watched_at) return 0
    const elapsed = Math.floor((now - state.last_ad_watched_at) / 1000)
    return Math.max(0, DEFAULT_COOLDOWN_SECONDS - elapsed)
  }, [state.last_ad_watched_at, now])

  const canWatchAd = cooldownRemaining <= 0

  // Format HH:MM:SS
  const formattedTime = useMemo(() => {
    if (state.owner_bypass) return 'UNLIMITED (OWNER)'
    if (remainingSeconds <= 0) return '00:00:00'

    const hrs = Math.floor(remainingSeconds / 3600)
    const mins = Math.floor((remainingSeconds % 3600) / 60)
    const secs = remainingSeconds % 60

    const pad = (n: number) => n.toString().padStart(2, '0')
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    }
    return `00:${pad(mins)}:${pad(secs)}`
  }, [remainingSeconds, state.owner_bypass])

  // Each ad = +1 token + +8 hours (3 tokens = 1 full day, stackable up to 60 days)
  const HOURS_PER_TOKEN = 8
  const MAX_ACCUMULATION_MS = 60 * 24 * 60 * 60 * 1000 // 60 days cap

  const grantRewardForAd = useCallback(async () => {
    const addMs = HOURS_PER_TOKEN * 60 * 60 * 1000 // 8 hours per ad
    const currentBase = Math.max(Date.now(), state.pro_expires_at)
    const newExpiry = Math.min(currentBase + addMs, Date.now() + MAX_ACCUMULATION_MS)
    const updated: ProAccessState = {
      ...state,
      pro_expires_at: newExpiry,
      tokens: state.tokens + 1,
      last_ad_watched_at: Date.now(),
      total_ads_watched: state.total_ads_watched + 1
    }
    await persistState(updated)

    // If there was a pending action blocked by the gate, trigger it
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }, [state, persistState, pendingAction])

  // Keep grantRewardMinutes as alias for compatibility (always grants 8h = 480 min)
  const grantRewardMinutes = useCallback(async (_minutes?: number) => {
    await grantRewardForAd()
  }, [grantRewardForAd])

  // Admin Owner Bypass toggle
  const toggleOwnerBypass = useCallback(async (enabled: boolean) => {
    const updated: ProAccessState = {
      ...state,
      owner_bypass: enabled
    }
    await persistState(updated)
  }, [state, persistState])

  // Immediate expiration for testing
  const expireNowForTesting = useCallback(async () => {
    const updated: ProAccessState = {
      ...state,
      owner_bypass: false,
      pro_expires_at: Date.now() - 1000
    }
    await persistState(updated)
  }, [state, persistState])

  // Gatekeeper: Check if pro is active, otherwise open the popup
  const requireProFeature = useCallback((featureName: string, onAuthorized: () => void) => {
    if (isPro) {
      onAuthorized()
      return true
    } else {
      setPendingFeatureName(featureName)
      setPendingAction(() => onAuthorized)
      setGateModalOpen(true)
      return false
    }
  }, [isPro])

  const openRewardModal = useCallback((featureName = 'Unlock Pro Features') => {
    setPendingFeatureName(featureName)
    setGateModalOpen(true)
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
