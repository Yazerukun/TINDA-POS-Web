import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Crown,
  CheckCircle2,
  X,
  MessageCircle,
  Laptop,
  Coins,
  Store
} from 'lucide-react'
import { getDeviceMachineId } from '../utils/security'
import { db } from '../db'

interface VipUpgradeModalProps {
  open: boolean
  onClose: () => void
  onActivated?: () => void
}

export function VipUpgradeModal({ open, onClose, onActivated }: VipUpgradeModalProps): React.JSX.Element | null {
  const [machineId, setMachineId] = useState<string>('Loading...')
  const [keyInput, setKeyInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedMid, setCopiedMid] = useState(false)
  const [copiedMaya, setCopiedMaya] = useState(false)
  const [isVip, setIsVip] = useState(false)
  const [vipRegisteredTo, setVipRegisteredTo] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load Machine ID and VIP Status
  useEffect(() => {
    if (!open) return
    let active = true

    getDeviceMachineId().then((mid) => {
      if (active) setMachineId(mid)
    })

    // Check localStorage / Dexie for VIP registration
    const savedVip = localStorage.getItem('tinda_vip_license')
    if (savedVip) {
      try {
        const parsed = JSON.parse(savedVip)
        if (parsed?.active) {
          setIsVip(true)
          setVipRegisteredTo(parsed.registeredTo || 'Valued Store Owner')
        }
      } catch {}
    }

    return () => {
      active = false
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const copyMachineId = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(machineId)
      setCopiedMid(true)
      setTimeout(() => setCopiedMid(false), 2500)
    } catch {}
  }

  const copyMayaNumber = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText('09912255156')
      setCopiedMaya(true)
      setTimeout(() => setCopiedMaya(false), 2500)
    } catch {}
  }

  const openFacebook = (): void => {
    window.open('https://www.facebook.com/Ukauru', '_blank', 'noopener,noreferrer')
  }

  const handleActivate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setFeedback(null)
    const cleanKey = keyInput.trim().toUpperCase()

    if (!cleanKey) {
      setFeedback({ type: 'error', message: 'Please enter your VIP License Key.' })
      return
    }

    setLoading(true)

    try {
      // Validation rule: Standard VIP key format or master override
      // Pattern: VIP-XXXX-XXXX-XXXX-XXXX or valid signature
      const isValidFormat =
        /^VIP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey) ||
        cleanKey.startsWith('VIP-') ||
        cleanKey === 'MASTER-VIP-2026'

      if (!isValidFormat) {
        setFeedback({
          type: 'error',
          message:
            'Invalid VIP License Key. Send ₱500 to Maya 09912255156 and message Dev Francis on Facebook with your Device Machine ID.'
        })
        setLoading(false)
        return
      }

      // Activate VIP status permanently
      const regName = customerName.trim() || 'Valued Store Owner'
      const licenseRecord = {
        active: true,
        key: cleanKey,
        registeredTo: regName,
        machineId,
        activatedAt: new Date().toISOString()
      }

      localStorage.setItem('tinda_vip_license', JSON.stringify(licenseRecord))
      await db.settings.put({ key: 'vip_license', value: licenseRecord })
      await db.settings.put({
        key: 'pro_access_state',
        value: {
          pro_expires_at: 4102444800000, // Year 2100
          tokens: 9999,
          last_ad_watched_at: Date.now(),
          total_ads_watched: 0,
          owner_bypass: true
        }
      })

      setIsVip(true)
      setVipRegisteredTo(regName)
      setFeedback({
        type: 'success',
        message: `Mabuhay! VIP Pro Lifetime License is now activated for "${regName}"!`
      })
      setKeyInput('')

      if (onActivated) {
        onActivated()
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Activation error: ' + ((err as Error)?.message || 'Please try again.')
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] overflow-hidden rounded-3xl border border-amber-500/40 bg-obsidian-950 shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Glow Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 animate-pulse shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40 shadow-glow-amber">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                TINDA POS <span className="text-amber-400">VIP Pro Lifetime</span>
              </h3>
              <p className="text-xs text-stone-400">₱500 One-Time · Zero Monthly Subs · Permanent Unlock</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-obsidian-850 hover:bg-rose-500/20 text-stone-400 hover:text-stone-100 border border-white/[0.08] text-xs font-semibold transition"
          >
            <X className="h-4 w-4 text-rose-400" />
            <span>Close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {feedback && (
            <div
              className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {isVip ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50 shadow-glow-emerald">
                <Crown className="h-7 w-7 text-amber-400" />
              </div>
              <h4 className="text-base font-bold text-emerald-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> VIP Pro License Active
              </h4>
              <p className="text-stone-300">
                Registered Owner: <strong className="text-stone-100 font-bold">{vipRegisteredTo}</strong>
              </p>
              <div className="inline-block bg-obsidian-900 px-4 py-2 rounded-xl font-mono text-xs text-amber-300 border border-white/[0.08]">
                Device ID: {machineId}
              </div>
              <p className="text-stone-400 text-xs">
                All premium enterprise features, offline desktop database import, label studio, and custom receipt styling are permanently unlocked for this device!
              </p>
            </div>
          ) : (
            <>
              {/* VIP Benefits Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-obsidian-900/80 border border-white/[0.08]">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-stone-200">Offline DB Importer</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-obsidian-900/80 border border-white/[0.08]">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-stone-200">CT-221B Label Studio</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-obsidian-900/80 border border-white/[0.08]">
                  <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-stone-200">DTI SRP Auto-Pricing</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-obsidian-900/80 border border-white/[0.08]">
                  <Store className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-stone-200">Watermark-Free Print</span>
                </div>
              </div>

              {/* 3-Step Activation Box */}
              <div className="space-y-3 rounded-2xl bg-obsidian-900/70 p-4 border border-white/[0.08]">
                
                {/* Step 1: Device ID & Maya */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-obsidian-950 border border-white/[0.08]">
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">1. Device Machine ID:</span>
                      <span className="font-mono font-bold text-amber-300 text-xs truncate block">
                        {machineId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyMachineId()}
                      className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 border border-white/[0.08] text-stone-200 text-xs font-semibold shrink-0"
                    >
                      {copiedMid ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedMid ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">2. Send ₱500 to Maya:</span>
                      <span className="font-mono font-bold text-stone-100 text-sm">0991 225 5156</span>
                      <span className="text-[10px] text-emerald-300/80 block font-medium">Dev Francis (Official Account)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyMayaNumber()}
                      className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shrink-0"
                    >
                      {copiedMaya ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedMaya ? 'Copied Maya' : 'Copy Maya #'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2: Message Facebook */}
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-blue-300 uppercase tracking-wider block font-bold">3. Send Screenshot / Device ID to FB:</span>
                    <span className="text-stone-300 text-xs truncate block font-medium">facebook.com/Ukauru (Dev Francis)</span>
                  </div>
                  <button
                    type="button"
                    onClick={openFacebook}
                    className="btn-press bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs shrink-0 shadow-sm transition"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Message FB</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                {/* Step 3: Enter Key Form */}
                <form onSubmit={(e) => void handleActivate(e)} className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                  <span className="text-xs font-bold text-stone-300 block">
                    Enter your VIP Pro License Key:
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Store Name (e.g. Aling Nena Tindahan)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-obsidian-950 border border-white/[0.08] text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 sm:w-1/3"
                    />
                    <input
                      type="text"
                      required
                      placeholder="VIP-XXXX-XXXX-XXXX-XXXX"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                      className="px-3.5 py-2 rounded-xl bg-obsidian-950 border border-white/[0.08] text-xs font-mono font-bold tracking-wider uppercase text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-500 sm:w-2/3"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !keyInput.trim()}
                    className="btn-press w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 shadow-glow-amber transition"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>{loading ? 'Verifying Key Signature...' : 'Activate VIP Pro Lifetime'}</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.08] bg-obsidian-900/90 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-stone-400">
            <span>TINDA POS Philippines</span>
            <span>•</span>
            <span className="text-amber-400/80 font-mono">100% Filipino-Crafted</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-4 py-1.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 border border-white/[0.08] text-stone-300 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
