import React, { useState, useEffect, useRef } from 'react'
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
  QrCode,
  Search,
  RotateCcw,
  Store,
  Zap,
  Radio,
  Lock,
  ArrowRight
} from 'lucide-react'
import { getDeviceMachineId } from '../utils/security'
import { db } from '../db'
import { playSuccessSound } from '../lib/sound'
import { createDynamicQrPayment, pollPaymentStatus } from '../utils/paymongo'
import {
  generateAccountVipKey,
  verifyAccountVipKey,
  saveAccountVipLicense,
  getVipLicenseInfo,
  isVipActive,
  getActiveVaultUsername,
  type VipLicenseData
} from '../utils/vip'

interface VipUpgradeModalProps {
  open: boolean
  onClose: () => void
  onActivated?: () => void
  currentUsername?: string
  currentStoreName?: string
}

type ModalTab = 'QR_PH' | 'ENTER_KEY' | 'RECOVER_KEY' | 'MANUAL'

export function VipUpgradeModal({
  open,
  onClose,
  onActivated,
  currentUsername,
  currentStoreName
}: VipUpgradeModalProps): React.JSX.Element | null {
  const [tab, setTab] = useState<ModalTab>('QR_PH')
  const [machineId, setMachineId] = useState<string>('Loading...')
  const [keyInput, setKeyInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedMid, setCopiedMid] = useState(false)
  const [copiedMaya, setCopiedMaya] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [isVip, setIsVip] = useState(false)
  const [vipRegisteredTo, setVipRegisteredTo] = useState('')
  const [activeLicenseKey, setActiveLicenseKey] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // PayMongo QR Ph state
  const [qrGenerating, setQrGenerating] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [pollStatus, setPollStatus] = useState<'idle' | 'listening' | 'paid'>('idle')
  const [secretKeyConfigured, setSecretKeyConfigured] = useState<string>('')

  // Lost Key Recovery state
  const [recoverInput, setRecoverInput] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)

  // Polling interval ref
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load Machine ID, VIP Status, and configured PayMongo keys
  useEffect(() => {
    if (!open) return
    let active = true

    getDeviceMachineId().then((mid) => {
      if (active) setMachineId(mid)
    })

    const targetUser = (currentUsername || getActiveVaultUsername() || '').trim().toLowerCase()
    const licenseInfo = getVipLicenseInfo(targetUser)

    if (licenseInfo.active) {
      setIsVip(true)
      setVipRegisteredTo(licenseInfo.registeredTo || currentStoreName || targetUser || 'Valued Store Owner')
      setActiveLicenseKey(licenseInfo.key || '')
    } else {
      setIsVip(false)
      setVipRegisteredTo('')
      setActiveLicenseKey('')
    }

    // Load store settings for PayMongo key
    db.settings.get('store_settings').then((rec) => {
      if (active && rec?.value?.paymongo_secret_key) {
        setSecretKeyConfigured(rec.value.paymongo_secret_key)
      }
    }).catch(() => {})

    return () => {
      active = false
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [open, currentUsername, currentStoreName])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

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

  const copyLicenseKey = async (keyToCopy: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(keyToCopy)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2500)
    } catch {}
  }

  const openFacebook = (): void => {
    window.open('https://www.facebook.com/Ukauru', '_blank', 'noopener,noreferrer')
  }

  // Core 1:1 Account Activation Engine
  const applyVipActivation = async (licenseKey: string, ownerName: string) => {
    const targetUser = (currentUsername || getActiveVaultUsername() || 'admin').trim().toLowerCase()
    const regName = ownerName.trim() || customerName.trim() || currentStoreName || 'Valued Store Owner'
    const licenseRecord: VipLicenseData = {
      active: true,
      key: licenseKey,
      registeredTo: regName,
      username: targetUser,
      storeName: currentStoreName || regName,
      activatedAt: new Date().toISOString()
    }

    // 1. Save 1:1 account license to localStorage
    saveAccountVipLicense(targetUser, licenseRecord)

    // 2. Update user record in Dexie DB
    try {
      await db.users.where('username').equalsIgnoreCase(targetUser).modify({
        is_vip: true,
        vip_key: licenseKey,
        vip_activated_at: licenseRecord.activatedAt
      })
    } catch (err) {
      console.warn('Could not update user record in IndexedDB:', err)
    }

    // 3. Update legacy settings for backwards compatibility
    await db.settings.put({ key: `vip_license_${targetUser}`, value: licenseRecord })
    await db.settings.put({
      key: 'pro_access_state',
      value: {
        pro_expires_at: 4102444800000, // Year 2100 Lifetime
        tokens: 9999,
        last_ad_watched_at: Date.now(),
        total_ads_watched: 0,
        owner_bypass: true
      }
    })

    setIsVip(true)
    setVipRegisteredTo(regName)
    setActiveLicenseKey(licenseKey)
    playSuccessSound()

    if (onActivated) {
      onActivated()
    }
  }

  // Manual key entry submit
  const handleActivateManualKey = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setFeedback(null)
    const cleanKey = keyInput.trim().toUpperCase()

    if (!cleanKey) {
      setFeedback({ type: 'error', message: 'Please enter your VIP License Key.' })
      return
    }

    setLoading(true)
    try {
      const targetUser = (currentUsername || getActiveVaultUsername() || 'admin').trim().toLowerCase()
      const isValid = await verifyAccountVipKey(cleanKey, targetUser, currentStoreName)
      if (!isValid) {
        setFeedback({
          type: 'error',
          message: `This VIP Key does not match account "@${targetUser}". Each VIP license is strictly 1:1 per account.`
        })
        setLoading(false)
        return
      }

      await applyVipActivation(cleanKey, customerName)
      setFeedback({
        type: 'success',
        message: `VIP Pro Lifetime License is now activated for account "@${targetUser}"!`
      })
      setKeyInput('')
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Activation error: ' + ((err as Error)?.message || 'Please try again.')
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate ₱500 QR Ph Code
  const handleGeneratePayMongoQr = async () => {
    setQrGenerating(true)
    setFeedback(null)
    setQrImageUrl(null)
    setPaymentIntentId(null)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    const targetUser = (currentUsername || getActiveVaultUsername() || 'admin').trim().toLowerCase()
    const targetStore = (currentStoreName || customerName.trim() || 'Store').trim()

    try {
      // ₱500.00 = 50,000 cents
      const res = await createDynamicQrPayment({
        secretKey: secretKeyConfigured || '',
        amountCents: 50000,
        description: `TINDA POS VIP Pro - @${targetUser} (${targetStore})`,
        metadata: {
          username: targetUser,
          store_name: targetStore,
          type: 'VIP_PRO_LIFETIME'
        }
      })

      if (res.ok && res.qrImageUrl) {
        setQrImageUrl(res.qrImageUrl)
        setPaymentIntentId(res.paymentIntentId || null)
        setPollStatus('listening')

        // Start 2.5s radar polling
        if (res.paymentIntentId) {
          const piId = res.paymentIntentId
          pollIntervalRef.current = setInterval(async () => {
            try {
              const statusRes = await pollPaymentStatus({
                secretKey: secretKeyConfigured || '',
                paymentIntentId: piId,
                expectedAmountCents: 50000
              })

              if (statusRes.paid) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                setPollStatus('paid')
                const newKey = await generateAccountVipKey(targetUser, targetStore)
                await applyVipActivation(newKey, targetStore)
                setFeedback({
                  type: 'success',
                  message: `Payment received for @${targetUser}! VIP Pro Lifetime License generated and activated!`
                })
              }
            } catch {}
          }, 2500)
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to generate official PayMongo QR Ph. Please check your connection or pay via Maya 09912255156.'
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Could not connect to PayMongo: ' + ((err as Error)?.message || 'Please use Maya transfer.')
      })
    } finally {
      setQrGenerating(false)
    }
  }

  // Lost Key Recovery Handler
  const handleRecoverLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRecovering(true)
    setFeedback(null)

    const query = recoverInput.trim().toLowerCase()
    if (!query) {
      setFeedback({ type: 'error', message: 'Please enter your Account Username or Store Name.' })
      setIsRecovering(false)
      return
    }

    try {
      const savedInfo = getVipLicenseInfo(query)
      if (savedInfo.active && savedInfo.key) {
        await applyVipActivation(savedInfo.key, savedInfo.registeredTo || query)
        setFeedback({
          type: 'success',
          message: `VIP Pro License recovered for @${query}! Key: ${savedInfo.key}`
        })
      } else {
        const u = await db.users.where('username').equalsIgnoreCase(query).first()
        if (u && u.is_vip && u.vip_key) {
          await applyVipActivation(u.vip_key, u.store_name || u.name)
          setFeedback({
            type: 'success',
            message: `VIP Pro License recovered for @${query}! Key: ${u.vip_key}`
          })
        } else {
          setFeedback({
            type: 'error',
            message: `No active VIP Pro record found for account "@${query}". Each account requires its own VIP license.`
          })
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Recovery error: ' + (err as Error)?.message })
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative flex flex-col w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl border border-amber-500/40 bg-zinc-950 shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Glow Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 animate-pulse shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-zinc-900/90 shrink-0">
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
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-white/[0.05] hover:bg-rose-500/20 text-stone-400 hover:text-stone-100 border border-white/[0.08] text-xs font-semibold transition cursor-pointer"
          >
            <X className="h-4 w-4 text-rose-400" />
            <span>Close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        {!isVip && (
          <div className="px-6 pt-3 pb-1 border-b border-white/[0.06] bg-zinc-950 shrink-0">
            <div className="grid grid-cols-4 p-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTab('QR_PH')}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'QR_PH'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="truncate">Pay QR Ph</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('ENTER_KEY')}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'ENTER_KEY'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="truncate">Enter Key</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('RECOVER_KEY')}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'RECOVER_KEY'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="truncate">Lost Key</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('MANUAL')}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'MANUAL'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="truncate">Maya & FB</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs custom-scrollbar">
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

          {/* ACTIVE VIP STATUS VIEW */}
          {isVip ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-4 animate-fade-in">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50 shadow-glow-emerald">
                <Crown className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> VIP Pro License Active
                </h4>
                <p className="text-stone-300 mt-1">
                  Registered Owner: <strong className="text-stone-100 font-bold">{vipRegisteredTo}</strong>
                </p>
              </div>

              {activeLicenseKey && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/[0.08] flex items-center justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">
                      Your VIP License Key:
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-sm truncate block tracking-wider">
                      {activeLicenseKey}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyLicenseKey(activeLicenseKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-stone-200 text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>
              )}

              <div className="inline-block bg-zinc-900 px-4 py-2 rounded-xl font-mono text-xs text-amber-300 border border-white/[0.08]">
                Terminal ID: {machineId}
              </div>

              <p className="text-stone-400 text-xs leading-relaxed max-w-md mx-auto">
                All premium enterprise features, offline desktop database import, label studio, and custom receipt styling are permanently unlocked for this terminal!
              </p>
            </div>
          ) : (
            <>
              {/* VIP Benefits Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-zinc-900/80 border border-white/[0.08]">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-stone-200">Offline DB Importer</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-zinc-900/80 border border-white/[0.08]">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-stone-200">CT-221B Label Studio</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-zinc-900/80 border border-white/[0.08]">
                  <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-stone-200">DTI SRP Auto-Pricing</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-zinc-900/80 border border-white/[0.08]">
                  <Store className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-stone-200">Watermark-Free Print</span>
                </div>
              </div>

              {/* ────────────────── 1. PAYMONGO QR PH CHECKOUT TAB ────────────────── */}
              {tab === 'QR_PH' && (
                <div className="space-y-4 rounded-2xl bg-zinc-900/70 p-4 border border-white/[0.08] animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-stone-100 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <span>Instant PayMongo QR Ph Checkout</span>
                      </h4>
                      <p className="text-[0.6875rem] text-stone-400">
                        Scan with GCash, Maya, ShopeePay, or any QR Ph banking app.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                      ₱500.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs">
                    <span className="text-stone-400 font-mono text-[11px]">Target Account:</span>
                    <span className="font-bold text-amber-300 font-mono">
                      @{currentUsername || getActiveVaultUsername() || 'admin'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
                      Store Name / Registered Owner
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aling Nena's Store"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* QR Code Presentation Box */}
                  {qrImageUrl ? (
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-3">
                      <div className="relative p-2 rounded-2xl bg-white shadow-xl">
                        <img
                          src={qrImageUrl}
                          alt="PayMongo Dynamic QR Ph"
                          className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                        />
                      </div>

                      {/* Radar Status Indicator */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span>Waiting for payment verification (2.5s radar active)...</span>
                      </div>

                      {/* Live Security & Payment Instruction Notice */}
                      <div className="pt-2 w-full text-center px-4">
                        <p className="text-[11px] text-stone-400 font-mono leading-relaxed">
                          Scan the official QR Ph code above using GCash, Maya, ShopeePay, or your banking app. Your VIP Pro Lifetime license will activate automatically the moment payment is verified.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGeneratePayMongoQr}
                      disabled={qrGenerating}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-glow-emerald transition cursor-pointer disabled:opacity-60"
                    >
                      {qrGenerating ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                          <span>Generating Dynamic QR Ph...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4" />
                          <span>Generate ₱500 QR Ph Code</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* ────────────────── 2. ENTER LICENSE KEY TAB ────────────────── */}
              {tab === 'ENTER_KEY' && (
                <form onSubmit={handleActivateManualKey} className="space-y-3.5 rounded-2xl bg-zinc-900/70 p-4 border border-white/[0.08] animate-fade-in">
                  <div>
                    <h4 className="font-bold text-stone-100 flex items-center gap-1.5 mb-1">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Activate VIP License Key</span>
                    </h4>
                    <p className="text-[0.6875rem] text-stone-400">
                      Already bought a license from desktop or online? Enter your 16-character VIP key below.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs">
                    <span className="text-stone-400 font-mono text-[11px]">Target Account:</span>
                    <span className="font-bold text-amber-300 font-mono">
                      @{currentUsername || getActiveVaultUsername() || 'admin'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aling Nena Tindahan"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
                      VIP License Key *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VIP-XXXX-XXXX-XXXX-XXXX"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs font-mono font-bold tracking-widest uppercase text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !keyInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-glow-amber transition cursor-pointer disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>{loading ? 'Verifying Key Signature...' : 'Activate VIP Pro Lifetime'}</span>
                  </button>
                </form>
              )}

              {/* ────────────────── 3. LOST KEY RECOVERY TAB ────────────────── */}
              {tab === 'RECOVER_KEY' && (
                <form onSubmit={handleRecoverLicense} className="space-y-3.5 rounded-2xl bg-zinc-900/70 p-4 border border-white/[0.08] animate-fade-in">
                  <div>
                    <h4 className="font-bold text-stone-100 flex items-center gap-1.5 mb-1">
                      <Search className="w-4 h-4 text-blue-400" />
                      <span>Lost License Key Recovery</span>
                    </h4>
                    <p className="text-[0.6875rem] text-stone-400">
                      Didn&apos;t save your key? Enter your registered Store Name, Email, or Device Machine ID to restore your license.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
                      Registered Store Name / Email / Device ID *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aling Nena or skorts188@gmail.com"
                      value={recoverInput}
                      onChange={(e) => setRecoverInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950 border border-white/[0.08]">
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">This Machine ID:</span>
                      <span className="font-mono font-bold text-amber-300 text-xs truncate block">
                        {machineId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecoverInput(machineId)}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-mono font-semibold border border-blue-500/30 cursor-pointer"
                    >
                      Use Machine ID
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isRecovering || !recoverInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-glow transition cursor-pointer disabled:opacity-60"
                  >
                    <Search className="h-4 w-4" />
                    <span>{isRecovering ? 'Searching License Database...' : 'Search & Restore VIP License'}</span>
                  </button>
                </form>
              )}

              {/* ────────────────── 4. MANUAL MAYA & FB TAB ────────────────── */}
              {tab === 'MANUAL' && (
                <div className="space-y-3 rounded-2xl bg-zinc-900/70 p-4 border border-white/[0.08] animate-fade-in">
                  <div>
                    <h4 className="font-bold text-stone-100 flex items-center gap-1.5 mb-1">
                      <MessageCircle className="w-4 h-4 text-purple-400" />
                      <span>Direct Maya & Facebook Dev Support</span>
                    </h4>
                    <p className="text-[0.6875rem] text-stone-400">
                      Transfer ₱500 to Maya and send your Device ID to Dev Francis for manual license key issuance.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-950 border border-white/[0.08]">
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">1. Device Machine ID:</span>
                      <span className="font-mono font-bold text-amber-300 text-xs truncate block">
                        {machineId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyMachineId()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-stone-200 text-xs font-semibold shrink-0 cursor-pointer"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      {copiedMaya ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedMaya ? 'Copied' : 'Copy #'}</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-blue-300 uppercase tracking-wider block font-bold">3. Message on Facebook:</span>
                      <span className="text-stone-300 text-xs truncate block font-medium">facebook.com/Ukauru (Dev Francis)</span>
                    </div>
                    <button
                      type="button"
                      onClick={openFacebook}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs shrink-0 shadow-sm transition cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Message FB</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.08] bg-zinc-900/90 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-stone-400">
            <span>TINDA POS Philippines</span>
            <span>•</span>
            <span className="text-amber-400/80 font-mono">100% Filipino-Crafted</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-stone-300 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
