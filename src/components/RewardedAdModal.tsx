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
  ExternalLink,
  Wallet,
  Calendar,
  ArrowRight,
  Lock
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { useAdBlocker } from '../services/adBlocker'

const MONETAG_DIRECT_LINKS = [
  'https://omg10.com/4/11879014',
  'https://omg10.com/4/11879016'
]

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
  onRedeemPackage?: (tokensCost: number, hoursToGrant: number) => Promise<boolean>
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
  onRedeemPackage,
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
  const [activeAdUrl, setActiveAdUrl] = useState<string>(MONETAG_DIRECT_LINKS[0])
  const [redeemingPackage, setRedeemingPackage] = useState<number | null>(null)
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

  // Redeem / convert banked tokens into active shift time
  const handleRedeem = async (tokensCost: number, hoursToGrant: number) => {
    if (!onRedeemPackage) return
    setRedeemingPackage(tokensCost)
    try {
      const ok = await onRedeemPackage(tokensCost, hoursToGrant)
      if (ok) {
        const days = hoursToGrant / 24
        setAdSuccessMessage(
          days >= 1
            ? `🎉 Activated +${days} Day${days > 1 ? 's' : ''} (${hoursToGrant}h) Shift Pass!`
            : `🎉 Activated +${hoursToGrant}h Shift Pass!`
        )
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            colors: ['#D4AF37', '#10B981', '#F59E0B'],
            origin: { y: 0.5 }
          })
        } catch {}
        setTimeout(() => setAdSuccessMessage(null), 3500)
      } else {
        alert('Insufficient tokens! Watch more sponsor ads to earn tokens.')
      }
    } finally {
      setRedeemingPackage(null)
    }
  }

  // Start watching ad (fixed: 1 ad = +1 token)
  const handleStartWatch = () => {
    if (!canWatchAd) return
    if (isAdBlockerActive && !isMasterAdmin) {
      alert('Ad Blocker Detected! Please disable your ad blocker or Brave Shields on this site to watch the sponsor ad.')
      return
    }

    // Rotate between the available direct links (11879014 and 11879016)
    const chosenLink = MONETAG_DIRECT_LINKS[totalAdsWatched % MONETAG_DIRECT_LINKS.length]
    setActiveAdUrl(chosenLink)

    // Launch Monetag Direct Link in a new tab upon user click
    try {
      window.open(chosenLink, '_blank', 'noopener,noreferrer')
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
    onGrantReward(0) // Credits +1 Token to wallet in proAccess
    const newTokens = tokens + 1
    setAdSuccessMessage(`🎉 +1 Token earned! Balance: ${newTokens} Tokens. Select a shift package below to activate.`)

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
    }, 4500)
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
                href={activeAdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Click / Re-open Sponsor Ad</span>
              </a>

              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Monetag Direct Link Zone ({activeAdUrl.split('/').pop() || '11879014'})</span>
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
            <div
              className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                isPro
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : tokens >= 1
                  ? 'bg-gold/15 border-gold/30 text-gold-light'
                  : 'bg-rose-950/40 border-rose-800/40 text-rose-400'
              }`}
            >
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base tracking-wide text-stone-100 uppercase">
                {isPro
                  ? '🟢 Store Shift Pass Active'
                  : tokens >= 1
                  ? '⚡ Choose Pass to Activate'
                  : '🔒 Store Shift Pass Inactive'}
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                {blockedFeatureName
                  ? `Access to "${blockedFeatureName}" requires an active store shift pass.`
                  : 'Earn tokens via sponsor ads, then redeem whenever your shift starts.'}
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
                  TINDA POS is 100% free supported by sponsor ads. Please whitelist or disable your Ad Blocker on this site to earn tokens.
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

          {/* ── 3-STAT STORE PASS DASHBOARD ── */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Stat 1: Shift Timer */}
            <div
              className={`p-3 rounded-2xl border flex flex-col justify-between ${
                isPro
                  ? 'bg-amber-500/[0.06] border-gold/30'
                  : 'bg-rose-950/20 border-rose-800/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider uppercase text-stone-400">
                  Shift Timer
                </span>
                <Clock className={`w-3.5 h-3.5 ${isPro ? 'text-gold-light' : 'text-rose-400'}`} />
              </div>
              <div className="my-1">
                <span
                  className={`font-mono text-xs sm:text-sm font-bold tracking-tight block truncate ${
                    isPro ? 'text-gold-light' : 'text-rose-400'
                  }`}
                >
                  {formattedTime}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPro ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-[10px] font-mono font-medium text-stone-300 uppercase">
                  {isPro ? 'Active' : 'Expired'}
                </span>
              </div>
            </div>

            {/* Stat 2: Token Wallet Balance */}
            <div className="p-3 rounded-2xl border bg-zinc-900/60 border-white/[0.08] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider uppercase text-stone-400">
                  Token Wallet
                </span>
                <Wallet className="w-3.5 h-3.5 text-gold" />
              </div>
              <div className="my-1 flex items-baseline gap-1">
                <span className="font-mono text-base sm:text-lg font-extrabold text-stone-100">
                  {tokens}
                </span>
                <span className="text-[10px] font-mono text-gold-light">TOKENS</span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 truncate">
                {tokens > 0 ? '● Ready to spend' : '○ 0 balance'}
              </div>
            </div>

            {/* Stat 3: Banked Days */}
            <div className="p-3 rounded-2xl border bg-zinc-900/60 border-white/[0.08] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider uppercase text-stone-400">
                  Banked Days
                </span>
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="my-1 flex items-baseline gap-1">
                <span className="font-mono text-base sm:text-lg font-extrabold text-amber-200">
                  {(tokens / 3).toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-stone-400">DAYS</span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 truncate">
                3 tokens = 1 day
              </div>
            </div>
          </div>

          {/* ── REDEEM TOKENS / CHOOSE SHIFT TIME ── */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400">
                CHOOSE SHIFT PASS DURATION
              </span>
              <span className="text-[10px] font-mono text-gold-light font-bold">
                Wallet: {tokens} Tokens
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: 1 Token -> +8 Hours */}
              <div
                className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                  tokens >= 1
                    ? 'bg-zinc-900/80 border-gold/30 hover:border-gold/60'
                    : 'bg-zinc-950/40 border-white/[0.05] opacity-60'
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    1 TOKEN
                  </span>
                  <h4 className="text-xs font-bold text-stone-100 mt-1.5">
                    +8 Hours
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Half-Day Single Shift
                  </p>
                </div>
                <button
                  disabled={tokens < 1 || redeemingPackage === 1}
                  onClick={() => handleRedeem(1, 8)}
                  className="mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30"
                >
                  <span>{tokens >= 1 ? 'Redeem 1 Token' : 'Need 1 Token'}</span>
                </button>
              </div>

              {/* Option 2: 3 Tokens -> +24 Hours (1 Day) */}
              <div
                className={`relative p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                  tokens >= 3
                    ? 'bg-gradient-to-b from-amber-500/[0.08] to-zinc-900/80 border-gold/40 hover:border-gold shadow-sm'
                    : 'bg-zinc-950/40 border-white/[0.05] opacity-60'
                }`}
              >
                <div className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-gold text-obsidian-950 text-[9px] font-mono font-black uppercase tracking-wider">
                  Best Value
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-gold-light bg-gold/15 px-2 py-0.5 rounded-full border border-gold/30">
                    3 TOKENS
                  </span>
                  <h4 className="text-xs font-bold text-stone-100 mt-1.5">
                    +24 Hours (1 Day)
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Full 24h Operating Day
                  </p>
                </div>
                <button
                  disabled={tokens < 3 || redeemingPackage === 3}
                  onClick={() => handleRedeem(3, 24)}
                  className="mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gold shadow-sm"
                >
                  <span>{tokens >= 3 ? 'Redeem 3 Tokens' : `Need ${3 - tokens} More`}</span>
                </button>
              </div>

              {/* Option 3: 6 Tokens -> +48 Hours (2 Days) */}
              <div
                className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                  tokens >= 6
                    ? 'bg-zinc-900/80 border-gold/30 hover:border-gold/60'
                    : 'bg-zinc-950/40 border-white/[0.05] opacity-60'
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    6 TOKENS
                  </span>
                  <h4 className="text-xs font-bold text-stone-100 mt-1.5">
                    +48 Hours (2 Days)
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Weekend 2-Day Pass
                  </p>
                </div>
                <button
                  disabled={tokens < 6 || redeemingPackage === 6}
                  onClick={() => handleRedeem(6, 48)}
                  className="mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                >
                  <span>{tokens >= 6 ? 'Redeem 6 Tokens' : `Need ${6 - tokens} More`}</span>
                </button>
              </div>

              {/* Option 4: 9 Tokens -> +72 Hours (3 Days) */}
              <div
                className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                  tokens >= 9
                    ? 'bg-zinc-900/80 border-gold/30 hover:border-gold/60'
                    : 'bg-zinc-950/40 border-white/[0.05] opacity-60'
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    9 TOKENS
                  </span>
                  <h4 className="text-xs font-bold text-stone-100 mt-1.5">
                    +72 Hours (3 Days)
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Multi-Day Retail Pass
                  </p>
                </div>
                <button
                  disabled={tokens < 9 || redeemingPackage === 9}
                  onClick={() => handleRedeem(9, 72)}
                  className="mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30"
                >
                  <span>{tokens >= 9 ? 'Redeem 9 Tokens' : `Need ${9 - tokens} More`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── EARN TOKENS (WATCH SPONSOR AD) ── */}
          <div className="mb-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-gold/25 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-light shrink-0">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-stone-100">
                    Watch Sponsor Ad
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                    +1 Token
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Opens sponsor in new tab. Earns +1 Token to wallet.
                </p>
              </div>
            </div>

            <button
              disabled={!canWatchAd || (isAdBlockerActive && !isMasterAdmin)}
              onClick={handleStartWatch}
              className="btn-gold px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch</span>
            </button>
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
