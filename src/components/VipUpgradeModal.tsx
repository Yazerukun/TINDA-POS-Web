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
  Store,
  Zap,
  Radio,
  Lock,
  ArrowRight,
  ShieldAlert
} from 'lucide-react'
import { getDeviceMachineId } from '../utils/security'
import { db } from '../db'
import { playSuccessSound } from '../lib/sound'
import {
  verifyAccountVipKey,
  saveAccountVipLicense,
  getVipLicenseInfo,
  isVipActive,
  getActiveVaultUsername,
  syncCloudVipStatus,
  type VipLicenseData
} from '../utils/vip'

interface VipUpgradeModalProps {
  open: boolean
  onClose: () => void
  onActivated?: () => void
  currentUsername?: string
  currentStoreName?: string
  isMasterAdmin?: boolean
}

type ModalTab = 'QR_PH' | 'ENTER_KEY' | 'RECOVER_KEY' | 'MANUAL'

export function VipUpgradeModal({
  open,
  onClose,
  onActivated,
  currentUsername,
  currentStoreName,
  isMasterAdmin = false
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

  // Server-managed PayMongo QR Ph state (Zero client keys)
  const [qrGenerating, setQrGenerating] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [pollStatus, setPollStatus] = useState<'idle' | 'listening' | 'paid'>('idle')

  // Master Admin Manual Grant state
  const [masterGrantTarget, setMasterGrantTarget] = useState('')
  const [isGrantingMaster, setIsGrantingMaster] = useState(false)

  // Lost Key Recovery state
  const [recoverInput, setRecoverInput] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)

  // Polling interval ref
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load Machine ID and VIP Status
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
      setActiveLicenseKey(licenseInfo.token || licenseInfo.key || '')
    } else {
      setIsVip(false)
      setVipRegisteredTo('')
      setActiveLicenseKey('')
      // Try background sync with Cloudflare D1
      if (targetUser) {
        syncCloudVipStatus(targetUser).then((hasVip) => {
          if (active && hasVip) {
            const fresh = getVipLicenseInfo(targetUser)
            setIsVip(true)
            setVipRegisteredTo(fresh.registeredTo || currentStoreName || targetUser)
            setActiveLicenseKey(fresh.token || fresh.key || '')
          }
        }).catch(() => {})
      }
    }

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
      await navigator.clipboard.writeText('')
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

  // Activates VIP locally and dispatches status update
  const applyVipActivation = async (licenseTokenOrKey: string, regName: string): Promise<void> => {
    const targetUser = (currentUsername || getActiveVaultUsername() || 'admin').trim().toLowerCase()
    const licenseRecord: VipLicenseData = {
      active: true,
      registeredTo: regName,
      key: licenseTokenOrKey,
      token: licenseTokenOrKey,
      username: targetUser,
      activatedAt: new Date().toISOString()
    }

    // 1. Save 1:1 account-isolated license
    saveAccountVipLicense(targetUser, licenseRecord)

    // 2. Mark user entity as VIP in IndexedDB
    try {
      await db.users.where('username').equalsIgnoreCase(targetUser).modify({
        is_vip: true,
        vip_key: licenseTokenOrKey,
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
    setActiveLicenseKey(licenseTokenOrKey)
    playSuccessSound()

    if (onActivated) {
      onActivated()
    }
  }

  // Manual key entry submit
  const handleActivateManualKey = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setFeedback(null)
    const cleanKey = keyInput.trim()

    if (!cleanKey) {
      setFeedback({ type: 'error', message: 'Please enter your VIP License Key.' })
      return
    }

    setLoading(true)
    try {
      const targetUser = (currentUsername || getActiveVaultUsername() || 'admin').trim().toLowerCase()
      const verResult = await verifyAccountVipKey(cleanKey, targetUser, currentStoreName)
      if (!verResult.valid) {
        setFeedback({
          type: 'error',
          message: verResult.reason || `This VIP Key does not match account "@${targetUser}". Each VIP license is strictly 1:1 per account.`
        })
        setLoading(false)
        return
      }

      await applyVipActivation(cleanKey, customerName || currentStoreName || targetUser)
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

  // Generate ₱500 QR Ph Code via Server-Side Edge Proxy (Zero client keys)
  const handleGeneratePayMongoQr = async () => {
    setQrGenerating(true)
    setFeedback(null)
    setQrImageUrl(null)
    setPaymentIntentId(null)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    const targetUser = (currentUsername || getActiveVaultUsername() || 'admin').trim().toLowerCase()
    const targetStore = (currentStoreName || customerName.trim() || 'Store').trim()

    try {
      // Step 1: Call Cloudflare Pages Function to create real ₱500 QR Ph Intent
      const res = await fetch('/api/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('tinda_session_token') || ''}` },
        body: JSON.stringify({
          action: 'create_order',
          username: targetUser,
          storeName: targetStore
        })
      })

      const data = await res.json()

      if (data.ok && data.qrImageUrl) {
        setQrImageUrl(data.qrImageUrl)
        setPaymentIntentId(data.paymentIntentId || null)
        setPollStatus('listening')

        // Step 2: Start 2.5s radar polling with server-side settlement claim
        if (data.paymentIntentId) {
          const piId = data.paymentIntentId
          pollIntervalRef.current = setInterval(async () => {
            try {
              const claimRes = await fetch('/api/vip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('tinda_session_token') || ''}` },
                body: JSON.stringify({
                  action: 'claim_activation',
                  paymentIntentId: piId,
                  username: targetUser,
                  storeName: targetStore
                })
              })

              const claimData = await claimRes.json()

              if (claimData.ok && claimData.isVip && claimData.token) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                setPollStatus('paid')
                await applyVipActivation(claimData.token, targetStore)
                setFeedback({
                  type: 'success',
                  message: `Payment verified by Cloudflare Edge! VIP Pro Lifetime License is now mathematically locked to account @${targetUser}!`
                })
              }
            } catch {}
          }, 2500)
        }
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to generate official PayMongo QR Ph. Please check your connection.'
        })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Could not connect to payment server. Please try again.' })
    } finally {
      setQrGenerating(false)
    }
  }

  // Master Admin Manual Grant (verified manual payment fulfillment)
  const handleMasterGrant = async () => {
    const targetUser = (masterGrantTarget || customerName || currentUsername || getActiveVaultUsername() || '').trim().toLowerCase()
    if (!targetUser) {
      alert('Please enter the target username to grant VIP Pro to.')
      return
    }

    if (!confirm(`Grant official VIP Pro Lifetime license to @${targetUser}? This will mint a cryptographically signed token in Cloudflare D1.`)) {
      return
    }

    setIsGrantingMaster(true)
    setFeedback(null)

    try {
      const token = sessionStorage.getItem('tinda_session_token') || ''

      const res = await fetch('/api/vip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'master_grant',
          targetUsername: targetUser,
          reason: 'MANUAL_PAYMENT_VERIFIED'
        })
      })

      const data = await res.json()
      if (data.ok && data.token) {
        setFeedback({
          type: 'success',
          message: `Official VIP Pro token minted by Master Admin for @${targetUser}!`
        })
        const activeUser = (currentUsername || getActiveVaultUsername() || '').trim().toLowerCase()
        if (targetUser === activeUser) {
          await applyVipActivation(data.token, currentStoreName || 'VIP Store')
        }
        setMasterGrantTarget('')
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to issue master grant.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Master grant failed. Please try again.' })
    } finally {
      setIsGrantingMaster(false)
    }
  }

  // Lost Key Recovery Handler
  const handleRecoverLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRecovering(true)
    setFeedback(null)

    const query = recoverInput.trim().toLowerCase()
    if (!query) {
      setFeedback({ type: 'error', message: 'Please enter your Account Username.' })
      setIsRecovering(false)
      return
    }

    try {
      // 1. Check Cloudflare D1 Authority first
      const cloudSuccess = await syncCloudVipStatus(query)
      if (cloudSuccess) {
        const info = getVipLicenseInfo(query)
        if (info.active) {
          await applyVipActivation(info.token || info.key || 'VIP-ACTIVE', info.registeredTo || query)
          setFeedback({
            type: 'success',
            message: `Verified by Cloudflare D1! VIP Pro License recovered for @${query}!`
          })
          setIsRecovering(false)
          return
        }
      }

      // 2. No server record means no license. Never grant VIP from a local
      // Dexie row: `is_vip` / `vip_key` are writable by anyone in IndexedDB,
      // so a license is only valid when Cloudflare D1 confirms it.
      setFeedback({
        type: 'error',
        message: `No active VIP Pro record found for account "@${query}". Each account requires its own separate VIP license.`
      })
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
      <div
        className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-bold shadow-glow-amber">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                TINDA POS <span className="text-amber-400">VIP Pro Lifetime</span>
              </h3>
              <p className="text-xs text-stone-400">₱500 One-Time · 1:1 Account Hardlock · Permanent Unlock</p>
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 border animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span className="font-medium leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* ACTIVE VIP STATUS VIEW */}
          {isVip ? (
            <div className="space-y-4 text-center py-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-glow-amber">
                <Crown className="h-8 w-8 animate-pulse" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider border border-emerald-500/30">
                  VIP Pro Lifetime Active
                </span>
                <h4 className="text-lg font-bold text-stone-100 mt-2">
                  Licensed to: <span className="text-amber-400">{vipRegisteredTo}</span>
                </h4>
                <p className="text-xs text-stone-400 mt-1 font-mono">
                  Bound strictly to account @{currentUsername || getActiveVaultUsername() || 'admin'}
                </p>
              </div>

              {activeLicenseKey && (
                <div className="p-3 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-between gap-2 max-w-md mx-auto">
                  <div className="text-left min-w-0">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Cryptographic License Token:</span>
                    <span className="font-mono text-xs text-amber-300 font-bold block truncate max-w-[280px]">
                      {activeLicenseKey}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyLicenseKey(activeLicenseKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-stone-200 text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              <div className="inline-block bg-zinc-900 px-4 py-2 rounded-xl font-mono text-xs text-amber-300 border border-white/[0.08]">
                Terminal ID: {machineId}
              </div>

              <p className="text-stone-400 text-xs leading-relaxed max-w-md mx-auto">
                All premium enterprise features, offline desktop database import, label studio, and custom receipt styling are permanently unlocked for this account!
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
                      placeholder="e.g. Aling Nena Tindahan"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* QR Presentation or Generate Button */}
                  {qrImageUrl ? (
                    <div className="text-center space-y-3 p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 animate-fade-in">
                      <div className="inline-block p-3 rounded-2xl bg-white shadow-2xl">
                        <img
                          src={qrImageUrl}
                          alt="Official PayMongo QR Ph"
                          className="w-56 h-56 mx-auto object-contain rounded-lg"
                        />
                      </div>

                      <div className="flex items-center justify-center gap-2 text-xs font-medium">
                        {pollStatus === 'listening' && (
                          <div className="flex items-center gap-2 text-amber-400">
                            <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
                            <span>Listening for Real-Time Payment...</span>
                          </div>
                        )}
                        {pollStatus === 'paid' && (
                          <div className="flex items-center gap-2 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Payment Captured! VIP Activated!</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-400">
                        Payment automatically verifies on Cloudflare Edge. Once confirmed, your account unlocks instantly.
                      </p>

                      {paymentIntentId && (
                        <div className="text-[10px] font-mono text-stone-500">
                          Ref: {paymentIntentId}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleGeneratePayMongoQr}
                        disabled={qrGenerating}
                        className="btn-press w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 shadow-glow-emerald transition cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="h-4 w-4" />
                        <span>{qrGenerating ? 'Generating Official ₱500 QR Ph...' : 'Generate Official ₱500 QR Ph Code'}</span>
                      </button>
                      <p className="text-[10px] text-center text-stone-500">
                        Cloudflare Edge handles secure verification directly. Zero API keys stored in your browser.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────── 2. ENTER LICENSE KEY TAB ────────────────── */}
              {tab === 'ENTER_KEY' && (
                <form onSubmit={handleActivateManualKey} className="space-y-3.5 rounded-2xl bg-zinc-900/70 p-4 border border-white/[0.08] animate-fade-in">
                  <div>
                    <h4 className="font-bold text-stone-100 flex items-center gap-1.5 mb-1">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Activate VIP License Token</span>
                    </h4>
                    <p className="text-[0.6875rem] text-stone-400">
                      Enter the cryptographically signed VIP token issued upon confirmed ₱500 payment.
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
                      VIP License Token *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="TINDAVIP.ey..."
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs font-mono font-bold text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !keyInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-glow-amber transition cursor-pointer disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>{loading ? 'Verifying Cryptographic Token...' : 'Activate VIP Pro Lifetime'}</span>
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
                      Didn&apos;t save your token? Enter your registered Account Username to recover your license directly from Cloudflare D1.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
                      Registered Account Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. admin or juan"
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
                      onClick={() => setRecoverInput(currentUsername || getActiveVaultUsername() || '')}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-mono font-semibold border border-blue-500/30 cursor-pointer"
                    >
                      Use My Username
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isRecovering || !recoverInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-glow transition cursor-pointer disabled:opacity-60"
                  >
                    <Search className="h-4 w-4" />
                    <span>{isRecovering ? 'Searching Cloudflare D1 Ledger...' : 'Search & Restore VIP License'}</span>
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
                      Complete the authorized ₱500 payment and send your Username through the official support channel.
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
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">2. Complete authorized payment:</span>
                      <span className="font-mono font-bold text-stone-100 text-sm">Use the official support channel</span>
                      <span className="text-[10px] text-emerald-300/80 block font-medium">Verified payment account</span>
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
                      <span className="text-stone-300 text-xs truncate block font-medium">Official support channel</span>
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

                  {/* MASTER ADMIN EXCLUSIVE FULFILLMENT PANEL */}
                  {isMasterAdmin && (
                    <div className="mt-4 pt-4 border-t border-amber-500/30 p-3.5 rounded-2xl bg-amber-500/10 border space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>Master Admin: Mint & Grant Offline Maya VIP</span>
                      </div>
                      <p className="text-[11px] text-stone-300">
                        After a verified manual ₱500 payment, enter the customer username here to mint an official cryptographically signed token into Cloudflare D1.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Target account username (e.g. tindahan_owner)"
                          value={masterGrantTarget}
                          onChange={(e) => setMasterGrantTarget(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-amber-500/30 text-xs font-mono text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={handleMasterGrant}
                          disabled={isGrantingMaster}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shrink-0 transition cursor-pointer disabled:opacity-50"
                        >
                          {isGrantingMaster ? 'Minting...' : 'Mint & Grant'}
                        </button>
                      </div>
                    </div>
                  )}
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
