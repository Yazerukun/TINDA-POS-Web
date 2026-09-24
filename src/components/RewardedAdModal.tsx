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
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { useAdBlocker } from '../services/adBlocker'

const MONETAG_DIRECT_LINK = 'https://omg10.com/4/11879014'

interface RewardedAdModalProps {
  open: boolean
  onClose: () => void
  blockedFeatureName?: string
  formattedTime: string
  isPro: boolean
  isFullyUnlocked: boolean
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
  isFullyUnlocked,
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
  const [isMuted, setIsMuted] = useState(false)
  const [adSuccessMessage, setAdSuccessMessage] = useState<string | null>(null)
  const [showDevTools, setShowDevTools] = useState(false)
  const adTimerRef = useRef<NodeJS.Timeout | null>(null)
  const adStartTimeRef = useRef<number>(0)

  // Derived token/day info
  const tokensAfterWatch = tokens + 1
  const daysEarned = Math.floor(tokens / 3)
  const daysAfterWatch = Math.floor(tokensAfterWatch / 3)

  // Real-time AdBlocker detection
  const { isBlocked: isAdBlockerActive, isChecking: isCheckingAdBlocker, checkAdBlocker } = useAdBlocker()

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (adTimerRef.current) clearInterval(adTimerRef.current)
    }
  }, [])

  if (!open) return null

  // Start watching ad (fixed: 1 ad = +1 token = +8 hours)
  const handleStartWatch = () => {
    if (!canWatchAd) return
    if (isAdBlockerActive && !isMasterAdmin) {
      alert('Ad Blocker Detected! Please disable your ad blocker or Brave Shields on this site to watch the sponsor ad.')
      return
    }

    // Launch Monetag Direct Link in a new tab upon user click
    try {
      window.open(MONETAG_DIRECT_LINK, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.warn('Popup blocked, fallback button available inside modal', e)
    }

    setAdSecondsLeft(20)
    adStartTimeRef.current = performance.now()
    setIsPlayingAd(true)
    setAdSuccessMessage(null)

    if (adTimerRef.current) clearInterval(adTimerRef.current)
    adTimerRef.current = setInterval(() => {
      setAdSecondsLeft((prev) => {
        if (prev <= 1) {
          if (adTimerRef.current) clearInterval(adTimerRef.current)
          handleAdCompleted(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Fast test ad (3 seconds) - Only permitted for Master Admin
  const handleFastTestAd = () => {
    if (!isMasterAdmin) return
    setAdSecondsLeft(3)
    adStartTimeRef.current = performance.now()
    setIsPlayingAd(true)
    setAdSuccessMessage(null)

    if (adTimerRef.current) clearInterval(adTimerRef.current)
    adTimerRef.current = setInterval(() => {
      setAdSecondsLeft((prev) => {
        if (prev <= 1) {
          if (adTimerRef.current) clearInterval(adTimerRef.current)
          handleAdCompleted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Completed ad with anti-tamper verification
  const handleAdCompleted = (isFastTest = false) => {
    if (!isFastTest) {
      const elapsedSeconds = (performance.now() - adStartTimeRef.current) / 1000
      if (elapsedSeconds < 18.5 && !isMasterAdmin) {
        console.warn('Ad playback tampering detected: elapsed time too short.')
        setIsPlayingAd(false)
        return
      }
    }

    setIsPlayingAd(false)
    onGrantReward(480) // 480 min = 8 hours per ad; proAccess ignores this and uses fixed 8h
    const newTokens = tokens + 1
    const newDays = Math.floor(newTokens / 3)
    if (newDays > daysEarned) {
      setAdSuccessMessage(`🎉 +1 Token earned! ${newTokens} tokens = ${newDays} day${newDays !== 1 ? 's' : ''} access unlocked!`)
    } else {
      setAdSuccessMessage(`✅ +1 Token earned! ${newTokens}/3 tokens — ${3 - newTokens % 3} more ad${(3 - newTokens % 3) !== 1 ? 's' : ''} for next day`)
    }

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        colors: ['#D4AF37', '#10B981', '#F59E0B'],
        origin: { y: 0.5 }
      })
    } catch {}

    setTimeout(() => {
      setAdSuccessMessage(null)
    }, 4000)
  }

  // Attempt to cancel early
  const handleEarlyCancel = () => {
    if (confirm('Cancel ad? If you close now, you will not receive your token credit.')) {
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
                +1 Token (+8 Hours access)
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
                  Monetag Sponsor Offer Active
                </h4>
                <p className="text-xs text-stone-400 mt-1 max-w-xs font-sans">
                  Sponsor page has opened in a new tab. Please view the sponsor offer while the countdown completes.
                </p>
              </div>

              <a
                href={MONETAG_DIRECT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Click / Re-open Sponsor Ad</span>
              </a>

              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Monetag Direct Link Zone (11879014)</span>
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
                {!isFullyUnlocked
                  ? 'Collect 3 Tokens to Unlock'
                  : remainingSeconds <= 0
                  ? '⏰ Time Expired — Extend Access'
                  : '✅ Features Unlocked'}
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                {!isFullyUnlocked
                  ? `Watch ${3 - tokens} more ad${3 - tokens !== 1 ? 's' : ''} to unlock all features. (${tokens}/3 tokens)`
                  : remainingSeconds <= 0
                  ? 'Your access time ran out. Watch an ad to extend — each ad adds time (max 60 days).'
                  : blockedFeatureName
                  ? `"${blockedFeatureName}" needs active access. Watch an ad to extend your time.`
                  : 'Watch ads to stack more time. Max 60 days accumulation.'}
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
              <span className="text-[10px] font-mono text-stone-400 block mb-1">
                TOKEN PROGRESS
              </span>
              {isFullyUnlocked ? (
                <span className="font-mono text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                  <span>🔓</span>
                  <span>FULLY UNLOCKED</span>
                </span>
              ) : (
                <div className="flex items-center justify-end gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        tokens > i
                          ? 'bg-gold border-gold text-obsidian-950'
                          : 'border-stone-600 bg-transparent'
                      }`}
                    >
                      {tokens > i && <span className="text-[8px] font-bold">✓</span>}
                    </div>
                  ))}
                  <span className="text-[10px] font-mono text-stone-400 ml-1">{tokens}/3</span>
                </div>
              )}
            </div>
          </div>

          {/* Watch Ad — Single Fixed Reward */}
          <div className="mb-5">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 block px-1 mb-2.5">
              HOW IT WORKS
            </span>

            {/* Token → Day chart */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[
                { tokens: 3, days: 1 },
                { tokens: 6, days: 2 },
                { tokens: 9, days: 3 }
              ].map(({ tokens: t, days: d }) => (
                <div
                  key={t}
                  className={`p-2 rounded-xl border text-center ${
                    tokens >= t
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-zinc-900/60 border-white/[0.06] text-stone-500'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold">{t} tokens</div>
                  <div className="text-[9px] mt-0.5">{d} day{d > 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>

            {/* Single Watch Button */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-gold/20 hover:border-gold/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-light text-xs font-mono font-bold">
                  1 AD
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    +1 Token &nbsp;·&nbsp; +8 Hours
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    {daysAfterWatch > daysEarned
                      ? `🎉 This unlocks Day ${daysAfterWatch}!`
                      : `${tokensAfterWatch % 3 === 0 ? 3 : tokensAfterWatch % 3}/3 tokens toward Day ${daysAfterWatch + 1}`}
                  </p>
                </div>
              </div>

              <button
                disabled={!canWatchAd || (isAdBlockerActive && !isMasterAdmin)}
                onClick={handleStartWatch}
                className="btn-gold px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Watch</span>
              </button>
            </div>
          </div>

          {/* Cooldown Notice */}
          {!canWatchAd && (
            <div className="p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 flex items-center justify-between text-xs text-amber-300 font-mono mb-4">
              <span>Next ad available in:</span>
              <span className="font-bold text-amber-200">{cooldownRemaining}s</span>
            </div>
          )}

          {/* Footer Notice */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-stone-500 font-sans">
              Free Sales Counter always remains 100% active. Max stack: 60 days.
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

          {/* Quick Testing Tools - Master Admin Only */}
          {isMasterAdmin && showDevTools && (
            <div className="mt-3 p-3 rounded-xl bg-zinc-900/90 border border-white/[0.08] space-y-2 text-xs font-mono text-stone-300">
              <div className="flex items-center justify-between">
                <span>Fast 3-Second Test Ad (+1 Token +8h):</span>
                <button
                  onClick={() => handleFastTestAd()}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px]"
                >
                  Run (3s)
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
