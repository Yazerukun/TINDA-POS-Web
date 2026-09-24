import React, { useState, useEffect, useRef } from 'react'
import {
  Clock,
  Play,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  Zap,
  Gift,
  Coins,
  RefreshCw
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { useAdBlocker } from '../services/adBlocker'

interface RewardedAdModalProps {
  open: boolean
  onClose: () => void
  blockedFeatureName?: string
  formattedTime: string
  isPro: boolean
  remainingSeconds: number
  cooldownRemaining: number
  canWatchAd: boolean
  totalAdsWatched: number
  tokens: number
  onGrantReward: (minutes: number) => void
  onExpireTest: () => void
  ownerBypass: boolean
  onToggleOwnerBypass: (enabled: boolean) => void
  isMasterAdmin?: boolean
}

export function RewardedAdModal({
  open,
  onClose,
  blockedFeatureName,
  formattedTime,
  isPro,
  remainingSeconds,
  cooldownRemaining,
  canWatchAd,
  totalAdsWatched,
  tokens,
  onGrantReward,
  onExpireTest,
  ownerBypass,
  onToggleOwnerBypass,
  isMasterAdmin = false
}: RewardedAdModalProps): React.JSX.Element | null {
  const [isPlayingAd, setIsPlayingAd] = useState(false)
  const [adSecondsLeft, setAdSecondsLeft] = useState(20)
  const [rewardMinutesToGrant, setRewardMinutesToGrant] = useState(30)
  const [isMuted, setIsMuted] = useState(false)
  const [adSuccessMessage, setAdSuccessMessage] = useState<string | null>(null)
  const [showDevTools, setShowDevTools] = useState(false)
  const adTimerRef = useRef<NodeJS.Timeout | null>(null)
  const adStartTimeRef = useRef<number>(0)

  // Real-time AdBlocker detection
  const { isBlocked: isAdBlockerActive, isChecking: isCheckingAdBlocker, checkAdBlocker } = useAdBlocker()

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (adTimerRef.current) clearInterval(adTimerRef.current)
    }
  }, [])

  if (!open) return null

  // Start watching ad
  const handleStartWatch = (minutes: number) => {
    if (!canWatchAd) return
    if (isAdBlockerActive && !isMasterAdmin) {
      alert('Ad Blocker Detected! Please disable your ad blocker or Brave Shields on this site to watch the sponsor ad and unlock Pro access.')
      return
    }

    setRewardMinutesToGrant(minutes)
    setAdSecondsLeft(20)
    adStartTimeRef.current = performance.now()
    setIsPlayingAd(true)
    setAdSuccessMessage(null)

    if (adTimerRef.current) clearInterval(adTimerRef.current)
    adTimerRef.current = setInterval(() => {
      setAdSecondsLeft((prev) => {
        if (prev <= 1) {
          if (adTimerRef.current) clearInterval(adTimerRef.current)
          handleAdCompleted(minutes, false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Fast test ad (3 seconds) - Only permitted for Master Admin
  const handleFastTestAd = (minutes: number) => {
    if (!isMasterAdmin) return
    setRewardMinutesToGrant(minutes)
    setAdSecondsLeft(3)
    adStartTimeRef.current = performance.now()
    setIsPlayingAd(true)
    setAdSuccessMessage(null)

    if (adTimerRef.current) clearInterval(adTimerRef.current)
    adTimerRef.current = setInterval(() => {
      setAdSecondsLeft((prev) => {
        if (prev <= 1) {
          if (adTimerRef.current) clearInterval(adTimerRef.current)
          handleAdCompleted(minutes, true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Completed 20s ad with anti-tamper verification
  const handleAdCompleted = (minutes: number, isFastTest = false) => {
    // Anti-Tamper check: ensure full duration elapsed
    if (!isFastTest) {
      const elapsedSeconds = (performance.now() - adStartTimeRef.current) / 1000
      if (elapsedSeconds < 18.5 && !isMasterAdmin) {
        console.warn('Ad playback tampering detected: elapsed time is too short.')
        setIsPlayingAd(false)
        return
      }
    }

    setIsPlayingAd(false)
    onGrantReward(minutes)
    setAdSuccessMessage(`+${minutes} Minutes Pro Access Added Successfully!`)

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        colors: ['#D4AF37', '#10B981', '#F59E0B'],
        origin: { y: 0.5 }
      })
    } catch {}

    // Auto-dismiss notification after 3.5s
    setTimeout(() => {
      setAdSuccessMessage(null)
    }, 3500)
  }

  // Attempt to cancel early
  const handleEarlyCancel = () => {
    if (confirm('Cancel ad? If you close now before the timer finishes, you will not receive your Pro time credit.')) {
      if (adTimerRef.current) clearInterval(adTimerRef.current)
      setIsPlayingAd(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-2xl animate-fade-in">
      {/* ── VIDEO AD PLAYER SCREEN ── */}
      {isPlayingAd ? (
        <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-gold/40 shadow-vault p-6 text-center overflow-hidden animate-scale-up">
          {/* Top Bar inside Ad Player */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-light font-mono text-[10px] font-bold tracking-wider uppercase border border-gold/30">
                Sponsor Video
              </span>
              <span className="text-[11px] text-stone-400 font-sans">
                Watch to unlock +{rewardMinutesToGrant}m
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-stone-400 hover:text-stone-200 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-gold-light" />}
              </button>

              <button
                onClick={handleEarlyCancel}
                className="text-stone-500 hover:text-stone-300 transition-colors"
                title="Cancel Video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Mock Player Body */}
          <div className="my-6 relative aspect-video w-full rounded-2xl bg-gradient-to-br from-zinc-900 via-obsidian-950 to-zinc-950 border border-white/[0.06] flex flex-col items-center justify-center p-6 overflow-hidden shadow-inner">
            {/* Animated Background Rays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0,transparent_70%)] animate-pulse" />

            <div className="relative z-10 flex flex-col items-center space-y-3">
              {/* Circular Countdown Ring */}
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
                <span className="absolute font-mono text-xl font-bold text-gold-light">
                  {adSecondsLeft}s
                </span>
              </div>

              <div>
                <h4 className="text-sm font-serif font-bold text-stone-100 tracking-wider uppercase">
                  TINDA POS PRO RETAIL NETWORK
                </h4>
                <p className="text-xs text-stone-400 mt-1 max-w-xs font-sans">
                  Sari-Sari Store Automation, Instant DTI SRP Price Sync, and Offline-First Cloud Ledgers.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google AdSense Rewarded Unit (ca-pub-8613908595644796)</span>
              </div>
            </div>

            {/* Progress Bar along bottom of video container */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-gold to-emerald-400 transition-all duration-1000 ease-linear"
                style={{ width: `${((20 - adSecondsLeft) / 20) * 100}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-stone-400 font-sans">
            Reward will be credited immediately once the countdown reaches 0s.
          </p>
        </div>
      ) : (
        /* ── REWARD SELECTION / PRO EXPIRY MODAL ── */
        <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/[0.08] shadow-vault p-6 text-left overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-light shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base tracking-wide text-stone-100 uppercase">
                Unlock Full Features
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                {blockedFeatureName
                  ? `Access to "${blockedFeatureName}" requires an active Pro session.`
                  : 'Watch quick sponsor ads to extend your Pro access.'}
              </p>
            </div>
          </div>

          {/* Success Banner if just credited */}
          {adSuccessMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{adSuccessMessage}</span>
            </div>
          )}

          {/* AdBlocker Warning Banner */}
          {isAdBlockerActive && !isMasterAdmin && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-amber-200">
                  Ad Blocker Detected (Brave Shield / uBlock / AdBlock)
                </p>
                <p className="text-stone-300 mt-1 leading-relaxed">
                  TINDA POS is 100% free supported by sponsor ads. Please whitelist or disable your Ad Blocker / Brave Shields on this site to unlock Pro features.
                </p>
                <p className="text-stone-400 mt-1 italic text-[11px]">
                  (Palihug i-disable o i-pause imong Ad Blocker aron maka-watch ug sponsor ad ug ma-unlock imong Pro shift.)
                </p>
                <button
                  type="button"
                  onClick={() => checkAdBlocker()}
                  disabled={isCheckingAdBlocker}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAdBlocker ? 'animate-spin' : ''}`} />
                  <span>{isCheckingAdBlocker ? 'Re-checking...' : 'I disabled it, Re-check now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Current Pro Status Card */}
          <div
            className={`p-4 rounded-2xl border mb-5 flex items-center justify-between ${
              isPro
                ? 'bg-amber-500/[0.06] border-gold/30'
                : 'bg-rose-950/20 border-rose-800/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                  isPro ? 'bg-gold/20 text-gold-light' : 'bg-rose-950 text-rose-300'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 block">
                  CURRENT PRO SESSION
                </span>
                <span
                  className={`font-mono text-sm font-bold tracking-wider ${
                    isPro ? 'text-gold-light' : 'text-rose-400'
                  }`}
                >
                  {formattedTime}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-stone-400 block">
                REWARD TOKENS
              </span>
              <span className="font-mono text-xs font-semibold text-stone-200 flex items-center justify-end gap-1">
                <Coins className="w-3.5 h-3.5 text-gold" />
                <span>{tokens} Earned</span>
              </span>
            </div>
          </div>

          {/* Ad Reward Options */}
          <div className="space-y-2.5 mb-5">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 block px-1">
              SELECT REWARD OPTION
            </span>

            {/* Option 1: 1 Ad -> +1 Hour */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] hover:border-gold/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300 text-xs font-mono font-bold">
                  1 AD
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    +1 Hour Standard Shift
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Recommended unlock for standard retail counter operations
                  </p>
                </div>
              </div>

              <button
                disabled={!canWatchAd || (isAdBlockerActive && !isMasterAdmin)}
                onClick={() => handleStartWatch(60)}
                className="btn-gold px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Watch</span>
              </button>
            </div>

            {/* Option 2: 2 Ads -> +2 Hours */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] hover:border-gold/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-light text-xs font-mono font-bold">
                  2 ADS
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    +2 Hours Extended Shift
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Extended daytime cashier & inventory audit shift
                  </p>
                </div>
              </div>

              <button
                disabled={!canWatchAd || (isAdBlockerActive && !isMasterAdmin)}
                onClick={() => handleStartWatch(120)}
                className="btn-gold px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Watch</span>
              </button>
            </div>

            {/* Option 3: 3 Ads -> +3 Hours */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] hover:border-gold/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 text-xs font-mono font-bold">
                  3 ADS
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    +3 Hours Full Day Power Pass
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Uninterrupted Pro features for full operating day
                  </p>
                </div>
              </div>

              <button
                disabled={!canWatchAd || (isAdBlockerActive && !isMasterAdmin)}
                onClick={() => handleStartWatch(180)}
                className="btn-gold px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Watch</span>
              </button>
            </div>
          </div>

          {/* Cooldown Notice if recently watched */}
          {!canWatchAd && (
            <div className="p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 flex items-center justify-between text-xs text-amber-300 font-mono mb-4">
              <span>Next video available in:</span>
              <span className="font-bold text-amber-200">{cooldownRemaining}s</span>
            </div>
          )}

          {/* Footer Notice */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-stone-500 font-sans">
              Free Sales Counter always remains 100% active.
            </span>

            {isMasterAdmin && (
              <button
                type="button"
                onClick={() => setShowDevTools(!showDevTools)}
                className="text-[10px] font-mono text-stone-500 hover:text-stone-300 transition-colors"
              >
                {showDevTools ? 'Hide Test Tools' : '🧪 Test Tools'}
              </button>
            )}
          </div>

          {/* Quick Testing Tools - Strictly Master Admin Only */}
          {isMasterAdmin && showDevTools && (
            <div className="mt-3 p-3 rounded-xl bg-zinc-900/90 border border-white/[0.08] space-y-2 text-xs font-mono text-stone-300">
              <div className="flex items-center justify-between">
                <span>Fast 3-Second Test Ad:</span>
                <button
                  onClick={() => handleFastTestAd(30)}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px]"
                >
                  +30m (3s ad)
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Expire Now (Test Gate):</span>
                <button
                  onClick={onExpireTest}
                  className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px]"
                >
                  Set to 00:00
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Owner Always Unlocked:</span>
                <button
                  onClick={() => onToggleOwnerBypass(!ownerBypass)}
                  className={`px-2 py-1 rounded text-[10px] ${
                    ownerBypass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-stone-400'
                  }`}
                >
                  {ownerBypass ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
