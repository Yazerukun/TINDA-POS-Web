import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../db'
import type { ProAccessState } from '../types'

const STORAGE_KEY = 'tinda_pro_access'
const DEFAULT_COOLDOWN_SECONDS = 30

// Default state: 00:00:00 (Locked by default - requires watching ads to unlock)
function getInitialState(): ProAccessState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.warn('Error reading pro access from storage:', e)
  }

  // Initial state: strictly locked (0 ms)
  const initial: ProAccessState = {
    pro_expires_at: 0,
    tokens: 0,
    last_ad_watched_at: 0,
    total_ads_watched: 0,
    owner_bypass: false
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  } catch {
    // ignore
  }

  return initial
}

export function useProAccess() {
  const [state, setState] = useState<ProAccessState>(getInitialState)
  const [now, setNow] = useState<number>(Date.now())
  const [gateModalOpen, setGateModalOpen] = useState(false)
  const [pendingFeatureName, setPendingFeatureName] = useState<string>('')
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // Load from Dexie db on mount if available
  useEffect(() => {
    let mounted = true
    db.settings.get('pro_access_state').then((record) => {
      if (mounted && record && record.value) {
        setState(record.value)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(record.value))
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

  // Persist helper
  const persistState = useCallback(async (updated: ProAccessState) => {
    setState(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    try {
      await db.settings.put({ key: 'pro_access_state', value: updated })
    } catch (e) {
      console.warn('Could not persist pro access to Dexie:', e)
    }
  }, [])

  // Real-time calculations
  const remainingSeconds = useMemo(() => {
    if (state.owner_bypass) return 999999
    return Math.max(0, Math.floor((state.pro_expires_at - now) / 1000))
  }, [state.pro_expires_at, state.owner_bypass, now])

  const isPro = useMemo(() => {
    return state.owner_bypass || remainingSeconds > 0
  }, [state.owner_bypass, remainingSeconds])

  // 20-second cooldown calculation
  const cooldownRemaining = useMemo(() => {
    if (!state.last_ad_watched_at) return 0
    const elapsed = Math.floor((now - state.last_ad_watched_at) / 1000)
    return Math.max(0, DEFAULT_COOLDOWN_SECONDS - elapsed)
  }, [state.last_ad_watched_at, now])

  const canWatchAd = cooldownRemaining <= 0

  // Format HH:MM:SS or MM:SS
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

  // Reward: Add Pro time in minutes
  const grantRewardMinutes = useCallback(async (minutes: number) => {
    const addMs = minutes * 60 * 1000
    const currentBase = Math.max(Date.now(), state.pro_expires_at)
    const updated: ProAccessState = {
      ...state,
      pro_expires_at: currentBase + addMs,
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
    remainingSeconds,
    formattedTime,
    cooldownRemaining,
    canWatchAd,
    grantRewardMinutes,
    toggleOwnerBypass,
    expireNowForTesting,
    requireProFeature,
    gateModalOpen,
    pendingFeatureName,
    openRewardModal,
    closeRewardModal
  }
}
