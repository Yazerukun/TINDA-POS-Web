import React, { useEffect, useState, useRef } from 'react'
import {
  Fingerprint,
  Wifi,
  ShieldCheck,
  ServerCog,
  Lock,
  Clock,
  Sparkles,
  User,
  LogIn,
  UserPlus,
  Store,
  Delete,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Banknote,
  ShieldAlert,
  Zap,
  Activity,
  CheckCircle2,
  Crown
} from 'lucide-react'
import { AppLogo } from './AppLogo'
import { money } from '../utils/format'
import { db } from '../db'
import type { UserAccount, UserRole } from '../types'
import { loginWithCloud, rotatePinOnCloud, syncUserToCloud } from '../services/cloudSync'
import { isVipActive, getVipLicenseInfo, verifyAccountVipKey, saveAccountVipLicense } from '../utils/vip'
import { playSuccessSound } from '../lib/sound'

export interface VaultSession {
  userId?: number
  cashierName: string
  cashierRole: string
  userRole: UserRole
  openingFloat_c: number
  sessionStartTime: string
  terminalId: string
  isAdmin: boolean
  isMasterAdmin?: boolean
  username?: string
  storeName?: string
  avatarUrl?: string
  isVip?: boolean
  vipKey?: string
}

interface VaultAuthModalProps {
  isOpen: boolean
  onAuthenticated: (session: VaultSession, isNewAccount?: boolean) => void
  currentCashier?: string
  initialStep?: 'LOGIN' | 'SIGNUP'
  onClose?: () => void
  onQuickDemo?: () => void
}

const TERMINAL_ID = 'TRM-8891'

const BENTO_FEATURES = [
  {
    icon: Fingerprint,
    title: 'Staff Identity & PIN',
    desc: 'Individual cashier credentials with full transaction audit trail'
  },
  {
    icon: Wifi,
    title: 'Realtime Edge Sync',
    desc: 'Realtime bidirectional edge synchronization with offline Dexie resilience'
  },
  {
    icon: ShieldCheck,
    title: 'Shift Float Tracking',
    desc: 'Granular cash drawer reconciliation and end-of-day X/Z readings'
  },
  {
    icon: Zap,
    title: 'Instant Hardware POS',
    desc: 'Sub-millisecond barcode scanning, thermal printing, and tender'
  }
] as const

function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])
  return now
}

function HeroPanel({
  terminalId,
  onQuickDemo
}: {
  terminalId: string
  onQuickDemo?: () => void
}): React.JSX.Element {
  const now = useClock()
  const clock = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const date = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <aside className="hidden lg:flex flex-col justify-between p-8 xl:p-12 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-obsidian-950/70 relative overflow-hidden backdrop-blur-3xl min-h-[400px] lg:min-h-screen select-none">
      {/* ── Fluid Ambient Lighting Behind Hero ── */}
      <div className="absolute top-0 -left-20 w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.16),_transparent_70%)] blur-[80px] pointer-events-none will-change-transform animate-morph" />
      <div className="absolute bottom-10 right-0 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,_rgba(45,212,191,0.12),_transparent_70%)] blur-[90px] pointer-events-none will-change-transform animate-float-reverse" />
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Top Header: Brand Crest Logo & Live Edge Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <AppLogo size={46} animated={true} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold tracking-[0.18em] uppercase text-stone-100">
                TINDA POS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[0.625rem] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                Pro Terminal
              </span>
            </div>
            <p className="text-[0.6875rem] font-sans font-semibold tracking-wider uppercase text-emerald-400/80 mt-0.5">
              Hybrid Retail Engine · Enterprise Edition
            </p>
          </div>
        </div>

        {/* Live Edge Beacon Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold backdrop-blur-md shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="tracking-wide">EDGE ONLINE</span>
        </div>
      </div>

      {/* Hero Headline & Bento Features */}
      <div className="relative z-10 my-auto py-8 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-stone-300 text-xs font-medium mb-5 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-emerald-300">Multi-Terminal Cloud Gateway</span>
        </div>

        <h1 className="text-3xl xl:text-5xl font-serif font-black tracking-tight text-stone-100 leading-[1.15]">
          Smarter point of sale. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
            Zero network downtime.
          </span>
        </h1>

        <p className="mt-4 text-sm text-stone-400 leading-relaxed font-sans max-w-lg">
          Fast, audited register sessions for Philippine retail and groceries. Operates seamlessly offline with automatic realtime edge synchronization.
        </p>

        {/* 2x2 Modern Bento Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3.5">
          {BENTO_FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all duration-300 group backdrop-blur-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-500/25 transition-all duration-300">
                <feat.icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-stone-100 tracking-wide font-sans">{feat.title}</p>
              <p className="text-[0.6875rem] text-stone-400 mt-1 leading-snug line-clamp-2 font-sans">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Instant Sandbox Demo Direct Launcher */}
        {onQuickDemo && (
          <div className="mt-6 pt-5 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onQuickDemo}
              className="btn-press w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-sans font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
            >
              <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Launch 1-Click Instant Demo Counter</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[0.625rem] font-mono text-stone-500 text-center mt-1.5">
              Zero registration · Pre-loaded sari-sari store test sandbox
            </p>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="relative z-10 pt-5 border-t border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-500">Active Terminal ID</p>
          <p className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{terminalId}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-bold text-stone-100 tabular-nums">{clock}</p>
          <p className="text-[0.6875rem] font-mono text-stone-500 uppercase">{date}</p>
        </div>
      </div>
    </aside>
  )
}

export function VaultAuthModal({
  isOpen,
  onAuthenticated,
  currentCashier,
  initialStep = 'LOGIN',
  onClose,
  onQuickDemo
}: VaultAuthModalProps): React.JSX.Element | null {
  const [step, setStep] = useState<'LOGIN' | 'SIGNUP' | 'ROTATE' | 'FLOAT' | 'FORGOT_PIN' | 'VIP_UNLOCK'>(initialStep)

  useEffect(() => {
    if (isOpen && initialStep) {
      setStep(initialStep)
      setErrorMessage('')
    }
  }, [isOpen, initialStep])

  const [authMode, setAuthMode] = useState<'PIN' | 'PASSWORD'>('PIN')
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<UserAccount | null>(null)
  const [openingFloat, setOpeningFloat] = useState(200000) // ₱2,000.00 in centavos
  const [customFloatInput, setCustomFloatInput] = useState('2000')

  // VIP License Key unlock state
  const [vipKeyInput, setVipKeyInput] = useState('')
  const [vipStoreName, setVipStoreName] = useState('')
  const [vipUsername, setVipUsername] = useState('owner')
  const [vipPin, setVipPin] = useState('1234')
  const vipKeyInputRef = useRef<HTMLInputElement>(null)

  // Forgot PIN / Password recovery state
  const [forgotTargetUsername, setForgotTargetUsername] = useState('')
  const [forgotRecoveryMethod, setForgotRecoveryMethod] = useState<'ADMIN_PIN' | 'MASTER_KEY'>('ADMIN_PIN')
  const [forgotAdminPin, setForgotAdminPin] = useState('')
  const [forgotRecoveryCode, setForgotRecoveryCode] = useState('')
  const [forgotNewPin, setForgotNewPin] = useState('')
  const [forgotConfirmPin, setForgotConfirmPin] = useState('')
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('')
  const [forgotIsResetting, setForgotIsResetting] = useState(false)

  // Quick Staff Switcher state
  const [existingStaff, setExistingStaff] = useState<UserAccount[]>([])

  useEffect(() => {
    if (isOpen) {
      db.users.toArray().then((users) => {
        if (users && users.length > 0) {
          setExistingStaff(users.filter((u) => u.status === 'ACTIVE'))
        }
      }).catch(() => {})
    }
  }, [isOpen])

  // Security: Brute-force lockout state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number>(0)

  // Store Owner Sign Up form state
  const [signupStoreName, setSignupStoreName] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPin, setSignupPin] = useState('')
  const [rotatePin, setRotatePin] = useState('')
  const [rotateConfirm, setRotateConfirm] = useState('')
  const [signupConfirmPin, setSignupConfirmPin] = useState('')
  const [showSignupPin, setShowSignupPin] = useState(false)

  const usernameInputRef = useRef<HTMLInputElement>(null)
  const signupStoreInputRef = useRef<HTMLInputElement>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (step === 'LOGIN') {
        setTimeout(() => usernameInputRef.current?.focus(), 150)
      } else if (step === 'SIGNUP') {
        setTimeout(() => signupStoreInputRef.current?.focus(), 150)
      } else if (step === 'VIP_UNLOCK') {
        setTimeout(() => vipKeyInputRef.current?.focus(), 150)
      }
    }
  }, [isOpen, step])

  if (!isOpen) return null

  const handleKeypadPress = (digit: string) => {
    if (Date.now() < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setErrorMessage(`Security Lockout: Too many failed attempts. Wait ${waitSec}s.`)
      return
    }
    if (pin.length < 4) {
      const nextPin = pin + digit
      setPin(nextPin)
      setErrorMessage('')
    }
  }

  const handleDeletePin = () => {
    setPin((prev) => prev.slice(0, -1))
    setErrorMessage('')
  }

  const handleClearPin = () => {
    setPin('')
    setErrorMessage('')
  }

  const handleVipUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanKey = vipKeyInput.trim().toUpperCase()
    if (!cleanKey) {
      setErrorMessage('Please enter your VIP License Key.')
      vipKeyInputRef.current?.focus()
      return
    }

    const cleanStore = vipStoreName.trim() || 'VIP Store'
    const normUser = (vipUsername.trim() || 'owner').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'owner'
    const chosenPin = (vipPin.trim().replace(/\D/g, '') || '1234').slice(0, 4) || '1234'

    setIsVerifying(true)
    setErrorMessage('')

    try {
      // 1. Validate VIP Key (Accepts official VIP-XXXX-XXXX-XXXX-XXXX, master keys, and server tokens)
      const verResult = await verifyAccountVipKey(cleanKey, normUser, cleanStore)
      if (!verResult.valid) {
        setErrorMessage(verResult.reason || 'Invalid VIP License Key. Please check the key provided by Dev Francis.')
        setIsVerifying(false)
        return
      }

      // 2. Setup user account in local IndexedDB
      let user = await db.users.where('username').equalsIgnoreCase(normUser).first()
      if (user) {
        await db.users.update(user.id!, {
          role: 'ADMIN',
          status: 'ACTIVE',
          is_owner: true,
          is_vip: true,
          vip_key: cleanKey,
          vip_activated_at: new Date().toISOString(),
          store_name: cleanStore,
          pin: chosenPin
        })
        user = await db.users.get(user.id!)
      } else {
        const newUser: UserAccount = {
          username: normUser,
          name: cleanStore,
          role: 'ADMIN',
          pin: chosenPin,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          store_name: cleanStore,
          is_owner: true,
          is_vip: true,
          vip_key: cleanKey,
          vip_activated_at: new Date().toISOString()
        }
        const newId = await db.users.add(newUser)
        user = { ...newUser, id: newId as number }
      }

      // 3. Save account-isolated and device VIP license
      saveAccountVipLicense(normUser, {
        active: true,
        registeredTo: cleanStore,
        key: cleanKey,
        token: cleanKey,
        username: normUser,
        activatedAt: new Date().toISOString()
      })

      // 4. Update legacy settings table for 100% backwards compatibility
      await db.settings.put({
        key: `vip_license_${normUser}`,
        value: {
          active: true,
          registeredTo: cleanStore,
          key: cleanKey,
          username: normUser,
          activatedAt: new Date().toISOString()
        }
      })
      await db.settings.put({
        key: 'pro_access_state',
        value: {
          pro_expires_at: 4102444800000,
          tokens: 9999,
          last_ad_watched_at: Date.now(),
          total_ads_watched: 0,
          owner_bypass: true
        }
      })

      // Play success audio chime
      try {
        playSuccessSound()
      } catch {}

      if (user) {
        setAuthenticatedUser(user)
        setIsVerifying(false)
        setStep('FLOAT')
      }
    } catch (err) {
      console.error('VIP Unlock error:', err)
      setErrorMessage('Failed to unlock VIP account: ' + ((err as Error)?.message || 'Database error'))
      setIsVerifying(false)
    }
  }

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (Date.now() < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setErrorMessage(`Security Lockout: Too many failed attempts. Please wait ${waitSec}s.`)
      return
    }

    const trimmedUser = username.trim()
    const upperUser = trimmedUser.toUpperCase()
    const upperPin = (pin || '').trim().toUpperCase()

    // Smart VIP Key Detection: If user pasted VIP key into username or PIN field
    if (upperUser.startsWith('VIP-') || upperUser.startsWith('MASTER-') || upperPin.startsWith('VIP-') || upperPin.startsWith('MASTER-')) {
      const candidateKey = upperUser.startsWith('VIP-') || upperUser.startsWith('MASTER-') ? trimmedUser : pin
      setVipKeyInput(candidateKey)
      setStep('VIP_UNLOCK')
      setErrorMessage('VIP License Key detected! Please enter your store details or click Unlock.')
      return
    }

    if (!trimmedUser) {
      setErrorMessage('Please enter your Staff ID or Username.')
      usernameInputRef.current?.focus()
      return
    }
    if (!pin) {
      setErrorMessage(authMode === 'PIN' ? 'Please enter your 4-digit security PIN.' : 'Please enter your password.')
      if (authMode === 'PIN') pinInputRef.current?.focus()
      else passwordInputRef.current?.focus()
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      const lower = trimmedUser.toLowerCase()

      let user = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
      if (!user) {
        user = await db.users.filter((u) => u.email?.toLowerCase() === lower).first()
      }

      // Seed default admin if user is logging in as admin and no admin exists yet
      if (!user && lower === 'admin') {
        const existingAdmin = await db.users.where('role').equals('ADMIN').first()
        if (!existingAdmin) {
          const newAdmin: UserAccount = {
            username: 'admin',
            name: 'Master Admin',
            role: 'ADMIN',
            pin: '1234',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            store_name: 'PLATFORM_HQ',
            is_owner: true
          }
          const id = await db.users.add(newAdmin)
          user = { ...newAdmin, id }
        } else {
          user = existingAdmin
        }
      }

      // Cloudflare D1 cross-device lookup
      if (!user) {
        try {
          const cloudRes = await loginWithCloud(trimmedUser, pin)
          if (cloudRes.ok && cloudRes.user) {
            const syncedUser: UserAccount = {
              id: cloudRes.user.id,
              username: cloudRes.user.username,
              name: cloudRes.user.name,
              role: (cloudRes.user.role as UserRole) || 'ADMIN',
              pin: pin,
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              store_name: cloudRes.user.store_name || undefined,
              email: cloudRes.user.email || undefined,
              avatar_url: cloudRes.user.avatar_url || undefined,
              is_owner: cloudRes.user.is_owner
            }
            await db.users.put(syncedUser)
            user = syncedUser
          }
        } catch (e) {
          console.warn('Cloud login lookup error:', e)
        }
      }

      if (!user || user.status !== 'ACTIVE' || user.pin !== pin) {
        const nextFails = failedAttempts + 1
        setFailedAttempts(nextFails)
        if (nextFails >= 5) {
          setLockoutUntil(Date.now() + 30000)
          setErrorMessage('Security Alert: 5 failed attempts. Terminal locked for 30 seconds.')
        } else {
          setErrorMessage(`Authentication failed. Invalid Staff ID or PIN. (${5 - nextFails} attempts remaining)`)
        }
        setPin('')
        setIsVerifying(false)
        return
      }

      setFailedAttempts(0)
      setLockoutUntil(0)

      const cloud = await loginWithCloud(user.username, pin)

      if (cloud.ok && cloud.must_rotate_pin) {
        setPin('')
        setAuthenticatedUser(user)
        setIsVerifying(false)
        setStep('ROTATE')
        return
      }

      setAuthenticatedUser(user)
      setIsVerifying(false)
      setStep('FLOAT')
    } catch (err) {
      console.error('Login error:', err)
      const errDetail = (err as Error)?.message || 'Database error'
      setErrorMessage(`Login error: ${errDetail}. Please try again.`)
      setIsVerifying(false)
    }
  }

  const handleSignupSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedStore = signupStoreName.trim()
    const trimmedName = signupName.trim()
    const trimmedUser = signupUsername.trim().toLowerCase()
    const trimmedEmail = signupEmail.trim()

    if (!trimmedStore) {
      setErrorMessage('Please enter your store or business name.')
      signupStoreInputRef.current?.focus()
      return
    }
    if (!trimmedName) {
      setErrorMessage('Please enter store owner full name.')
      return
    }
    if (!trimmedUser || trimmedUser.length < 3) {
      setErrorMessage('Username must be at least 3 characters.')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(trimmedUser)) {
      setErrorMessage('Username can only contain lowercase letters, numbers, and dashes.')
      return
    }
    if (signupPin.length !== 4) {
      setErrorMessage('Security PIN must be exactly 4 digits.')
      return
    }
    if (signupPin !== signupConfirmPin) {
      setErrorMessage('Confirmation PIN does not match.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    try {
      const existingUser = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
      if (existingUser) {
        setErrorMessage('Username is already taken on this terminal.')
        setIsVerifying(false)
        return
      }

      const newAccount: UserAccount = {
        username: trimmedUser,
        name: trimmedName,
        role: 'ADMIN',
        pin: signupPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        store_name: trimmedStore,
        email: trimmedEmail || undefined,
        is_owner: true,
        is_vip: false
      }

      const insertedId = await db.users.add(newAccount)
      newAccount.id = insertedId as number

      syncUserToCloud(newAccount).catch((err) => {
        console.warn('Background cloud account sync notice:', err)
      })

      loginWithCloud(trimmedUser, signupPin).catch((err) => {
        console.warn('Initial session token acquisition notice:', err)
      })

      setAuthenticatedUser(newAccount)
      setIsVerifying(false)
      setStep('FLOAT')
    } catch (err) {
      console.error('Sign up error:', err)
      setErrorMessage('Failed to create store account. Please try again.')
      setIsVerifying(false)
    }
  }

  const handleRotateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = rotatePin.replace(/\D/g, '')
    const confirm = rotateConfirm.replace(/\D/g, '')
    if (next.length < 4 || next.length > 6) {
      setErrorMessage('The new PIN must be 4 to 6 digits.')
      return
    }
    if (next !== confirm) {
      setErrorMessage('The two PINs do not match.')
      return
    }
    const user = authenticatedUser
    if (!user) {
      setStep('LOGIN')
      return
    }
    setIsVerifying(true)
    setErrorMessage('')
    const ok = await rotatePinOnCloud(user.username, pin, next)
    if (!ok) {
      setIsVerifying(false)
      setErrorMessage('Failed to update PIN on cloud. Please try again.')
      return
    }
    if (user.id) await db.users.update(user.id, { pin: next }).catch(() => {})
    setRotatePin('')
    setRotateConfirm('')
    setPin('')
    setIsVerifying(false)
    setStep('FLOAT')
  }

  const handlePresetFloat = (pesos: number) => {
    setOpeningFloat(pesos * 100)
    setCustomFloatInput(pesos.toString())
  }

  const handleCustomFloatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setCustomFloatInput(val)
    setOpeningFloat((parseInt(val, 10) || 0) * 100)
  }

  const handleConfirmSession = () => {
    if (!authenticatedUser) return

    const isMaster = Boolean((authenticatedUser as { is_master?: number }).is_master)

    let userStoreName = authenticatedUser.store_name
    if (!userStoreName) {
      if (isMaster) {
        userStoreName = 'PLATFORM_HQ'
      } else if (authenticatedUser.owner_username) {
        userStoreName = `${authenticatedUser.owner_username}_store`
      } else {
        userStoreName = authenticatedUser.name ? `${authenticatedUser.name}'s Store` : 'DEFAULT_STORE'
      }
    }

    if (!authenticatedUser.store_name && authenticatedUser.id) {
      db.users.update(authenticatedUser.id, { store_name: userStoreName }).catch(() => {})
    }

    const session: VaultSession = {
      userId: authenticatedUser.id,
      cashierName: isMaster ? 'Master Admin Ian' : authenticatedUser.name,
      cashierRole: isMaster
        ? 'Platform Master Admin'
        : authenticatedUser.is_owner || authenticatedUser.role === 'ADMIN'
        ? 'Store Owner / Admin'
        : authenticatedUser.role === 'INVENTORY_LEAD'
        ? 'Inventory Lead'
        : 'Cashier',
      userRole: authenticatedUser.role,
      openingFloat_c: openingFloat,
      sessionStartTime: new Date().toISOString(),
      terminalId: TERMINAL_ID,
      isAdmin: authenticatedUser.role === 'ADMIN',
      isMasterAdmin: isMaster,
      username: authenticatedUser.username,
      storeName: userStoreName,
      avatarUrl: authenticatedUser.avatar_url,
      isVip: isMaster || isVipActive(authenticatedUser.username),
      vipKey: authenticatedUser.vip_key
    }

    const isNewAccount = !!authenticatedUser.created_at &&
      (Date.now() - new Date(authenticatedUser.created_at).getTime()) < 10_000

    onAuthenticated(session, isNewAccount)
    setPin('')
    setUsername('')
    setSignupStoreName('')
    setSignupName('')
    setSignupUsername('')
    setSignupEmail('')
    setSignupPin('')
    setSignupConfirmPin('')
    setStep('LOGIN')
    setAuthenticatedUser(null)
  }

  const handleSwitchAccount = () => {
    setStep('LOGIN')
    setPin('')
    setAuthenticatedUser(null)
    setErrorMessage('')
    setTimeout(() => usernameInputRef.current?.focus(), 150)
  }

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setForgotSuccessMessage('')

    const targetUserClean = (forgotTargetUsername || username).trim()
    if (!targetUserClean) {
      setErrorMessage('Please enter or select your staff account / username.')
      return
    }

    if (forgotNewPin.length !== 4 || !/^\d{4}$/.test(forgotNewPin)) {
      setErrorMessage('New Security PIN must be exactly 4 digits.')
      return
    }

    if (forgotNewPin !== forgotConfirmPin) {
      setErrorMessage('New PIN and confirmation PIN do not match.')
      return
    }

    setForgotIsResetting(true)
    try {
      let targetUser = await db.users.where('username').equalsIgnoreCase(targetUserClean).first()
      if (!targetUser) {
        targetUser = await db.users.filter((u) => u.email?.toLowerCase() === targetUserClean.toLowerCase()).first()
      }

      if (!targetUser) {
        setErrorMessage(`User account "${targetUserClean}" not found.`)
        setForgotIsResetting(false)
        return
      }

      if (forgotRecoveryMethod === 'ADMIN_PIN') {
        const cleanAdminPin = forgotAdminPin.trim()
        if (!cleanAdminPin) {
          setErrorMessage('Please enter the Store Admin or Master Admin PIN.')
          setForgotIsResetting(false)
          return
        }

        const matchingAdmin = await db.users
          .filter((u) => u.status === 'ACTIVE' && (u.role === 'ADMIN' || u.is_owner === true) && u.pin === cleanAdminPin)
          .first()

        if (!matchingAdmin) {
          setErrorMessage('Invalid Store Admin PIN. Please authenticate with a verified Admin PIN or account recovery key.')
          setForgotIsResetting(false)
          return
        }
      } else {
        const cleanKey = forgotRecoveryCode.trim().toUpperCase()
        const userLicense = getVipLicenseInfo(targetUser.username)
        let isVipKey = false
        if (userLicense?.key && userLicense.key.toUpperCase() === cleanKey) isVipKey = true
        if (targetUser.vip_key && targetUser.vip_key.toUpperCase() === cleanKey) isVipKey = true

        if (!isVipKey) {
          setErrorMessage('Invalid Emergency Recovery Key. Please provide your verified Account License Key.')
          setForgotIsResetting(false)
          return
        }
      }

      // Update PIN
      await db.users.update(targetUser.id!, { pin: forgotNewPin })
      if (targetUser.pin) {
        try {
          await rotatePinOnCloud(targetUser.username, targetUser.pin, forgotNewPin)
        } catch {}
      }

      setFailedAttempts(0)
      setLockoutUntil(0)
      setForgotSuccessMessage(`PIN successfully reset for ${targetUser.name || targetUser.username}! Redirecting to login...`)

      setTimeout(() => {
        setUsername(targetUser.username)
        setPin('')
        setStep('LOGIN')
        setForgotSuccessMessage('')
        setForgotAdminPin('')
        setForgotRecoveryCode('')
        setForgotNewPin('')
        setForgotConfirmPin('')
      }, 1500)
    } catch (err) {
      setErrorMessage('Reset failed: ' + ((err as Error)?.message || 'Database error'))
    } finally {
      setForgotIsResetting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-obsidian-950 overflow-y-auto overscroll-contain supports-[height:100dvh]:h-[100dvh]">
      {/* ── Background: Animated Morphing Gradient Orbs & Subtle Grid ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
        {/* Primary Emerald Morphing Orb */}
        <div
          className="absolute -top-32 right-1/4 w-[750px] h-[750px] rounded-full opacity-30 will-change-transform animate-morph"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.06) 50%, transparent 70%)',
            filter: 'blur(75px)'
          }}
        />
        {/* Secondary Teal Ambient Orb */}
        <div
          className="absolute -bottom-40 left-10 w-[650px] h-[650px] rounded-full opacity-20 will-change-transform animate-float-reverse"
          style={{
            background: 'radial-gradient(circle, rgba(45,212,191,0.14) 0%, transparent 70%)',
            filter: 'blur(90px)'
          }}
        />
        {/* Subtle Amber Glow Orb */}
        <div
          className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full opacity-15 will-change-transform animate-float-slow"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
            filter: 'blur(90px)'
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* ── Two-Column Responsive Split Layout (Desktop: 2-Col | Mobile: Centered) ── */}
      <div className="relative w-full flex flex-col lg:grid lg:grid-cols-2 min-h-[100svh] lg:min-h-[100dvh] flex-1">
        {/* Left Column (Hero Showcase Panel) */}
        <HeroPanel terminalId={TERMINAL_ID} onQuickDemo={onQuickDemo} />

        {/* Right Column (Tailark Auth Card) */}
        <main className="flex flex-col items-center justify-center w-full flex-1 min-h-0 px-4 sm:px-6 py-8 lg:p-10 relative z-10 overflow-y-auto custom-scrollbar">

          {/* Apple-Grade Dark Glassmorphic Card */}
          <div className="w-full max-w-[430px] sm:max-w-[450px] shrink-0 rounded-[2.25rem] border border-white/[0.08] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85),0_0_50px_-10px_rgba(16,185,129,0.12)] bg-obsidian-950/85 backdrop-blur-3xl text-stone-100 animate-fade-in relative my-auto p-6 sm:p-8">

            {/* Back to Overview return button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn-press absolute top-5 left-5 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-stone-400 hover:text-white bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer backdrop-blur-md shadow-sm"
                title="Return to Overview"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold tracking-wide">Overview</span>
              </button>
            )}

            {/* Verification Loading Overlay */}
            {isVerifying && (
              <div className="absolute inset-0 z-40 bg-obsidian-950/95 backdrop-blur-xl rounded-[2.25rem] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="relative flex items-center justify-center mb-4">
                  <AppLogo size={52} animated={true} />
                </div>
                <p className="text-sm font-semibold tracking-wider text-emerald-400 animate-pulse font-sans">
                  Authenticating Session
                </p>
                <p className="text-xs text-stone-400 mt-1 font-sans">
                  Verifying terminal credentials...
                </p>
                <div className="w-40 h-1 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full w-2/3 animate-pulse" />
                </div>
              </div>
            )}

            {/* Header: Crest Logo & Title */}
            <div className="flex flex-col items-center justify-center text-center select-none mb-5">
              <div className="relative mb-3 flex items-center justify-center">
                <AppLogo size={52} animated={true} />
              </div>

              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-[0.16em] uppercase text-stone-100">
                  TINDA POS
                </span>
                <span className="text-[0.6875rem] font-mono font-semibold tracking-wider text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase bg-emerald-500/10 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  {TERMINAL_ID}
                </span>
              </div>

              <p className="text-xs text-stone-400 font-medium font-sans">
                {step === 'FLOAT'
                  ? 'Shift Opening Cash Float'
                  : step === 'SIGNUP'
                  ? 'Create Store Partner Account'
                  : step === 'ROTATE'
                  ? 'PIN Rotation Required'
                  : step === 'FORGOT_PIN'
                  ? 'Account PIN & Password Recovery'
                  : step === 'VIP_UNLOCK'
                  ? 'Restore & Unlock VIP Pro Account'
                  : 'Counter Terminal Authentication'}
              </p>
            </div>

            {/* Quick Guest Demo Direct Jump Banner */}
            {onQuickDemo && step === 'LOGIN' && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={onQuickDemo}
                  className="btn-press w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/25 border border-amber-500/30 text-amber-300 font-sans font-semibold text-xs flex items-center justify-between transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-stone-200">First time here? <span className="text-amber-300 font-bold">1-Click Sandbox Demo</span></span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>
            )}

            {/* Segmented Switcher Tabs: "Sign In" vs "Register Store" vs "VIP Key" */}
            {step !== 'FLOAT' && step !== 'ROTATE' && step !== 'FORGOT_PIN' && (
              <div className="mb-5">
                <div className="grid grid-cols-3 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('LOGIN')
                      setErrorMessage('')
                    }}
                    className={`btn-press py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                      step === 'LOGIN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('SIGNUP')
                      setErrorMessage('')
                    }}
                    className={`btn-press py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                      step === 'SIGNUP'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('VIP_UNLOCK')
                      setErrorMessage('')
                    }}
                    className={`btn-press py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                      step === 'VIP_UNLOCK'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm ring-1 ring-amber-500/20 font-bold'
                        : 'text-amber-400/80 hover:text-amber-300'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>VIP Key</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form View Router */}
            <div>
              {/* ────────────────── 1. SIGN IN VIEW ────────────────── */}
              {step === 'LOGIN' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5 animate-fade-in font-sans">

                  {/* Fast Staff Switcher (If accounts exist in local IndexedDB) */}
                  {existingStaff.length > 0 && (
                    <div className="pb-1">
                      <p className="text-[0.6875rem] font-mono tracking-wider text-stone-400 uppercase font-semibold mb-2">
                        Quick Staff Select
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                        {existingStaff.map((u) => {
                          const isSelected = username.toLowerCase() === u.username.toLowerCase()
                          return (
                            <button
                              key={u.id || u.username}
                              type="button"
                              onClick={() => {
                                setUsername(u.username)
                                setPin('')
                                setErrorMessage('')
                                if (authMode === 'PIN') pinInputRef.current?.focus()
                                else passwordInputRef.current?.focus()
                              }}
                              className={`btn-press flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30 font-semibold'
                                  : 'bg-white/[0.03] border-white/[0.08] text-stone-300 hover:border-emerald-500/30 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-500/25 text-emerald-300 flex items-center justify-center text-[0.625rem] font-bold">
                                {u.name ? u.name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[90px]">{u.name || u.username}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Username / Staff ID input */}
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      Staff ID / Username
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-4 w-4 h-4 text-stone-500 pointer-events-none" />
                      <input
                        ref={usernameInputRef}
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value)
                          setErrorMessage('')
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        placeholder="Enter Staff ID or Username"
                        className="w-full pl-11 pr-4 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-sm font-medium placeholder-stone-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Credential Header: Mode Switcher (PIN vs Password) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 flex items-center gap-1.5 font-medium">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{authMode === 'PIN' ? '4-Digit PIN' : 'Password'}</span>
                      </label>
                      <div className="flex items-center p-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('PIN')
                            setPin((p) => p.replace(/\D/g, '').slice(0, 4))
                            setErrorMessage('')
                          }}
                          className={`btn-press px-2.5 py-0.5 rounded-full text-[0.6875rem] font-mono uppercase transition-all ${
                            authMode === 'PIN'
                              ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/35 shadow-sm'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('PASSWORD')
                            setErrorMessage('')
                            setTimeout(() => passwordInputRef.current?.focus(), 50)
                          }}
                          className={`btn-press px-2.5 py-0.5 rounded-full text-[0.6875rem] font-mono uppercase transition-all ${
                            authMode === 'PASSWORD'
                              ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/35 shadow-sm'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          Pass
                        </button>
                      </div>
                    </div>

                    {authMode === 'PIN' ? (
                      /* Apple-Style 4-Dot Progress Display */
                      <div
                        onClick={() => pinInputRef.current?.focus()}
                        className="cursor-pointer flex items-center justify-center gap-4 h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] focus-within:border-emerald-400/70 focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all duration-200 w-full"
                      >
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = pin.length > idx
                          return (
                            <div
                              key={idx}
                              className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                                isFilled
                                  ? 'bg-emerald-400 scale-125 shadow-[0_0_12px_rgba(52,211,153,0.7)] ring-4 ring-emerald-400/20'
                                  : 'bg-white/[0.08] border border-white/[0.1]'
                              }`}
                            />
                          )
                        })}

                        {/* Hidden input to capture physical keyboard typing */}
                        <input
                          ref={pinInputRef}
                          type="password"
                          maxLength={4}
                          value={pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            setPin(val)
                            setErrorMessage('')
                          }}
                          className="sr-only"
                          autoComplete="off"
                        />
                      </div>
                    ) : (
                      /* Password Input */
                      <div className="relative flex items-center">
                        <Lock className="absolute left-4 w-4 h-4 text-stone-500 pointer-events-none" />
                        <input
                          ref={passwordInputRef}
                          type={showPassword ? 'text' : 'password'}
                          value={pin}
                          onChange={(e) => {
                            setPin(e.target.value)
                            setErrorMessage('')
                          }}
                          placeholder="Enter account password"
                          className="w-full pl-11 pr-11 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-sm font-medium placeholder-stone-500 focus:outline-none transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 p-1 rounded-lg text-stone-400 hover:text-stone-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Error Alert Display */}
                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-300 text-center animate-fade-in shadow-sm">
                      {errorMessage}
                    </div>
                  )}

                  {/* Tactile Keypad for PIN Mode */}
                  {authMode === 'PIN' && (
                    <div className="pt-1">
                      <div className="grid grid-cols-3 gap-2 w-full">
                        {[
                          { num: '1', sub: '' },
                          { num: '2', sub: 'ABC' },
                          { num: '3', sub: 'DEF' },
                          { num: '4', sub: 'GHI' },
                          { num: '5', sub: 'JKL' },
                          { num: '6', sub: 'MNO' },
                          { num: '7', sub: 'PQRS' },
                          { num: '8', sub: 'TUV' },
                          { num: '9', sub: 'WXYZ' }
                        ].map((item) => (
                          <button
                            type="button"
                            key={item.num}
                            onClick={() => handleKeypadPress(item.num)}
                            className="btn-press h-12 rounded-2xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-stone-100 font-mono font-bold text-lg active:scale-95 flex flex-col items-center justify-center cursor-pointer shadow-sm transition-all duration-150 leading-none"
                          >
                            <span>{item.num}</span>
                            {item.sub && (
                              <span className="text-[0.5625rem] text-stone-500 font-sans tracking-widest mt-0.5 font-normal">
                                {item.sub}
                              </span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleClearPin}
                          className="btn-press h-12 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-stone-400 hover:text-stone-200 text-xs font-mono font-semibold uppercase active:scale-95 flex items-center justify-center cursor-pointer transition-all duration-150"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKeypadPress('0')}
                          className="btn-press h-12 rounded-2xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-stone-100 font-mono font-bold text-lg active:scale-95 flex flex-col items-center justify-center cursor-pointer shadow-sm transition-all duration-150 leading-none"
                        >
                          <span>0</span>
                          <span className="text-[0.5625rem] text-stone-500 font-sans tracking-widest mt-0.5 font-normal">+</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeletePin}
                          className="btn-press h-12 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-stone-400 hover:text-emerald-400 active:scale-95 flex items-center justify-center cursor-pointer transition-all duration-150"
                          title="Delete last digit"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Forgot PIN / Password Recovery Trigger */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotTargetUsername(username)
                        setStep('FORGOT_PIN')
                        setErrorMessage('')
                        setForgotSuccessMessage('')
                      }}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Forgot PIN or Password?</span>
                    </button>
                    <span className="text-[0.6875rem] font-mono text-stone-500">
                      Default: 1234
                    </span>
                  </div>

                  {/* Paid ₱500 VIP Pro Unlock Quick Link */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('VIP_UNLOCK')
                        setErrorMessage('')
                      }}
                      className="btn-press w-full p-3 rounded-2xl bg-amber-500/[0.08] hover:bg-amber-500/[0.14] border border-amber-500/25 hover:border-amber-500/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                          <Crown className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-amber-200 group-hover:text-amber-100 truncate">
                            Paid ₱500 for VIP? Unlock Account
                          </p>
                          <p className="text-[0.625rem] text-amber-300/70 truncate">
                            Enter VIP License Key to instantly restore and sign in
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </button>
                  </div>

                  {/* Primary CTA Submit */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-press w-full h-12 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-600 hover:from-emerald-400 hover:to-brand-400 text-obsidian-950 shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 mt-2 disabled:opacity-75 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Register Session</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <p className="text-[0.6875rem] font-mono text-stone-500 text-center pt-1">
                    Terminal TRM-8891 · Audited Local & Edge Station
                  </p>
                </form>
              )}

              {/* ────────────────── 2. STORE SIGN UP VIEW ────────────────── */}
              {step === 'SIGNUP' && (
                <form onSubmit={handleSignupSubmit} className="space-y-3.5 animate-fade-in font-sans">
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      Store / Business Name *
                    </label>
                    <input
                      ref={signupStoreInputRef}
                      type="text"
                      value={signupStoreName}
                      onChange={(e) => {
                        setSignupStoreName(e.target.value)
                        setErrorMessage('')
                      }}
                      placeholder="e.g. Aling Nena's Sari-Sari Store"
                      className="w-full h-11 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-xs font-medium placeholder-stone-500 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      Owner Full Name *
                    </label>
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value)
                        setErrorMessage('')
                      }}
                      placeholder="e.g. Maria Santos"
                      className="w-full h-11 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-xs font-medium placeholder-stone-500 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                        Username (Staff ID) *
                      </label>
                      <input
                        type="text"
                        value={signupUsername}
                        onChange={(e) => {
                          setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                          setErrorMessage('')
                        }}
                        placeholder="e.g. mariasari"
                        className="w-full h-11 px-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-xs font-mono placeholder-stone-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                        Contact Number / Email
                      </label>
                      <input
                        type="text"
                        value={signupEmail}
                        onChange={(e) => {
                          setSignupEmail(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="e.g. 0917xxxxxxx"
                        className="w-full h-11 px-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-xs font-mono placeholder-stone-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 font-medium">PIN *</label>
                        <button
                          type="button"
                          onClick={() => setShowSignupPin(!showSignupPin)}
                          className="text-stone-400 hover:text-stone-200"
                        >
                          {showSignupPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <input
                        type={showSignupPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={4}
                        value={signupPin}
                        onChange={(e) => {
                          setSignupPin(e.target.value.replace(/[^0-9]/g, ''))
                          setErrorMessage('')
                        }}
                        placeholder="4 digits"
                        className="w-full h-11 text-center px-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-emerald-400 font-mono text-sm tracking-widest focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">Confirm PIN *</label>
                      <input
                        type={showSignupPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={4}
                        value={signupConfirmPin}
                        onChange={(e) => {
                          setSignupConfirmPin(e.target.value.replace(/[^0-9]/g, ''))
                          setErrorMessage('')
                        }}
                        placeholder="Repeat PIN"
                        className="w-full h-11 text-center px-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-emerald-400 font-mono text-sm tracking-widest focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-300 text-center animate-fade-in shadow-sm">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-press w-full h-12 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-600 hover:from-emerald-400 hover:to-brand-400 text-obsidian-950 shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 mt-2 cursor-pointer disabled:opacity-75"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Store Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ────────────────── 3. MANDATORY PIN ROTATION ────────────────── */}
              {step === 'ROTATE' && (
                <form onSubmit={handleRotateSubmit} className="space-y-3.5 animate-fade-in font-sans">
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 backdrop-blur-md">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <p className="text-xs text-amber-200 leading-relaxed font-sans">
                      Please set a private, secure PIN before opening your shift register.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      New Security PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={rotatePin}
                      onChange={(e) => setRotatePin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 to 6 digits"
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 text-center font-mono tracking-[0.3em] text-emerald-400 focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      Confirm New PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={rotateConfirm}
                      onChange={(e) => setRotateConfirm(e.target.value.replace(/\D/g, ''))}
                      placeholder="Repeat new PIN"
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 text-center font-mono tracking-[0.3em] text-emerald-400 focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-300 text-center animate-fade-in shadow-sm">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-press w-full h-12 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-600 hover:from-emerald-400 hover:to-brand-400 text-obsidian-950 shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 mt-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Save New Security PIN</span>
                  </button>
                </form>
              )}

              {/* ────────────────── 3b. FORGOT PIN RECOVERY VIEW ────────────────── */}
              {step === 'FORGOT_PIN' && (
                <form onSubmit={handleForgotResetSubmit} className="space-y-3.5 animate-fade-in font-sans">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3 backdrop-blur-md">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-200">
                        Staff PIN &amp; Password Recovery
                      </p>
                      <p className="text-[0.6875rem] text-stone-400 mt-0.5 leading-relaxed">
                        Reset your 4-digit cashier or owner PIN using Store Admin authorization or Master Emergency Key.
                      </p>
                    </div>
                  </div>

                  {forgotSuccessMessage && (
                    <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 text-center flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{forgotSuccessMessage}</span>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs font-mono text-red-300 text-center animate-fade-in shadow-sm">
                      {errorMessage}
                    </div>
                  )}

                  {/* Target Account Selection */}
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      Staff ID / Username to Reset *
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-4 w-4 h-4 text-stone-500 pointer-events-none" />
                      <input
                        type="text"
                        value={forgotTargetUsername}
                        onChange={(e) => {
                          setForgotTargetUsername(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="e.g. admin or cashier1"
                        className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-11 pr-4 text-xs font-medium text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                        required
                      />
                    </div>
                    {existingStaff.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 custom-scrollbar">
                        {existingStaff.map((u) => (
                          <button
                            key={u.id || u.username}
                            type="button"
                            onClick={() => {
                              setForgotTargetUsername(u.username)
                              setErrorMessage('')
                            }}
                            className={`btn-press px-2.5 py-1 rounded-full text-[0.6875rem] font-medium border transition-all shrink-0 cursor-pointer ${
                              forgotTargetUsername.toLowerCase() === u.username.toLowerCase()
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-white/[0.03] border-white/[0.08] text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            {u.name || u.username}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recovery Authorization Method Tabs */}
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      Authorization Method
                    </label>
                    <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold mb-2">
                      <button
                        type="button"
                        onClick={() => setForgotRecoveryMethod('ADMIN_PIN')}
                        className={`btn-press py-2 rounded-xl transition-all text-center cursor-pointer ${
                          forgotRecoveryMethod === 'ADMIN_PIN'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        Store Admin PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotRecoveryMethod('MASTER_KEY')}
                        className={`btn-press py-2 rounded-xl transition-all text-center cursor-pointer ${
                          forgotRecoveryMethod === 'MASTER_KEY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        Master Emergency Key
                      </button>
                    </div>

                    {forgotRecoveryMethod === 'ADMIN_PIN' ? (
                      <div>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-4 w-4 h-4 text-stone-500 pointer-events-none" />
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={forgotAdminPin}
                            onChange={(e) => setForgotAdminPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter Store Admin PIN (default: 1234)"
                            className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-11 pr-4 text-xs font-mono font-bold tracking-widest text-emerald-400 placeholder-stone-500 focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                          />
                        </div>
                        <p className="text-[0.625rem] text-stone-500 mt-1 pl-1">
                          Authorize cashier reset using Store Admin PIN (default: 1234).
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="relative flex items-center">
                          <KeyRound className="absolute left-4 w-4 h-4 text-stone-500 pointer-events-none" />
                          <input
                            type="text"
                            value={forgotRecoveryCode}
                            onChange={(e) => setForgotRecoveryCode(e.target.value.toUpperCase())}
                            placeholder="MASTER-RECOVERY-2026"
                            className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-11 pr-4 text-xs font-mono font-bold tracking-wider uppercase text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                          />
                        </div>
                        <p className="text-[0.625rem] text-stone-500 mt-1 pl-1">
                          Enter Master Key (MASTER-RECOVERY-2026) or your VIP License Key.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* New PIN & Confirm PIN */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                        New 4-Digit PIN *
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={forgotNewPin}
                        onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3 text-center font-mono font-bold text-base tracking-[0.3em] text-emerald-400 placeholder-stone-600 focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                        Confirm PIN *
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={forgotConfirmPin}
                        onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3 text-center font-mono font-bold text-base tracking-[0.3em] text-emerald-400 placeholder-stone-600 focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Submit Reset Button */}
                  <button
                    type="submit"
                    disabled={forgotIsResetting || forgotNewPin.length !== 4 || forgotConfirmPin.length !== 4}
                    className="btn-press w-full h-12 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-600 hover:from-emerald-400 hover:to-brand-400 text-obsidian-950 shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 mt-2 disabled:opacity-60 cursor-pointer"
                  >
                    {forgotIsResetting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                        <span>Verifying & Resetting PIN...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Reset Security PIN</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Return to Login */}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('LOGIN')
                      setErrorMessage('')
                      setForgotSuccessMessage('')
                    }}
                    className="btn-press w-full py-2.5 rounded-full border border-white/[0.08] hover:bg-white/[0.05] text-stone-300 hover:text-stone-100 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              )}

              {/* ────────────────── 3c. VIP PRO LICENSE UNLOCK VIEW ────────────────── */}
              {step === 'VIP_UNLOCK' && (
                <form onSubmit={handleVipUnlockSubmit} className="space-y-3.5 animate-fade-in font-sans">
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 backdrop-blur-md">
                    <Crown className="w-5 h-5 shrink-0 mt-0.5 text-amber-400 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-amber-200">
                        Restore &amp; Unlock VIP Pro Account
                      </p>
                      <p className="text-[0.6875rem] text-stone-400 mt-1 leading-relaxed">
                        Paid ₱500 to Dev Francis (Maya 0991 225 5156)? Enter your VIP Key below to restore your lifetime Pro status and immediately unlock your terminal.
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs font-mono text-red-300 text-center animate-fade-in shadow-sm">
                      {errorMessage}
                    </div>
                  )}

                  {/* VIP License Key Input */}
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-amber-300 font-bold mb-1.5">
                      VIP License Key *
                    </label>
                    <div className="relative flex items-center">
                      <KeyRound className="absolute left-4 w-4 h-4 text-amber-400 pointer-events-none" />
                      <input
                        ref={vipKeyInputRef}
                        type="text"
                        required
                        value={vipKeyInput}
                        onChange={(e) => {
                          setVipKeyInput(e.target.value.toUpperCase())
                          setErrorMessage('')
                        }}
                        placeholder="VIP-XXXX-XXXX-XXXX-XXXX"
                        className="w-full pl-11 pr-4 h-12 rounded-2xl bg-white/[0.03] border border-amber-500/30 focus:border-amber-400 focus:bg-white/[0.05] focus:ring-2 focus:ring-amber-400/20 text-amber-300 font-mono text-xs font-bold tracking-wider placeholder-stone-600 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <p className="text-[0.625rem] text-stone-500 mt-1 pl-1">
                      Supports VIP-XXXX-XXXX-XXXX-XXXX keys and master recovery keys.
                    </p>
                  </div>

                  {/* Store Name Input */}
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                      Store / Business Name
                    </label>
                    <div className="relative flex items-center">
                      <Store className="absolute left-4 w-4 h-4 text-stone-500 pointer-events-none" />
                      <input
                        type="text"
                        value={vipStoreName}
                        onChange={(e) => {
                          setVipStoreName(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="e.g. Aling Nena's Sari-Sari Store"
                        className="w-full pl-11 pr-4 h-11 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-xs font-medium placeholder-stone-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Username and PIN Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                        Username (Staff ID)
                      </label>
                      <input
                        type="text"
                        value={vipUsername}
                        onChange={(e) => {
                          setVipUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                          setErrorMessage('')
                        }}
                        placeholder="owner"
                        className="w-full h-11 px-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-stone-100 text-xs font-mono placeholder-stone-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1.5 font-medium">
                        4-Digit PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={vipPin}
                        onChange={(e) => {
                          setVipPin(e.target.value.replace(/\D/g, ''))
                          setErrorMessage('')
                        }}
                        placeholder="1234"
                        className="w-full h-11 text-center px-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-400/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-emerald-400/20 text-emerald-400 font-mono text-sm tracking-widest focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Primary Unlock CTA */}
                  <button
                    type="submit"
                    disabled={isVerifying || !vipKeyInput.trim()}
                    className="btn-press w-full h-12 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:brightness-110 text-obsidian-950 shadow-[0_0_24px_-4px_rgba(245,158,11,0.4)] transition-all duration-300 mt-2 cursor-pointer disabled:opacity-60"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                        <span>Verifying VIP License...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>Unlock VIP Register Session</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Back to Regular Sign In */}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('LOGIN')
                      setErrorMessage('')
                    }}
                    className="btn-press w-full py-2.5 rounded-full border border-white/[0.08] hover:bg-white/[0.05] text-stone-300 hover:text-stone-100 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              )}

              {/* ────────────────── 4. SHIFT OPENING FLOAT ────────────────── */}
              {step === 'FLOAT' && (
                <div className="space-y-4 animate-fade-in font-sans">
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      {authenticatedUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-stone-100 truncate">{authenticatedUser?.name}</p>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[0.625rem] font-mono text-emerald-300 font-semibold">
                          {authenticatedUser?.role === 'ADMIN' ? 'OWNER / ADMIN' : authenticatedUser?.role}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-stone-400 mt-0.5 truncate flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-400/80" />
                        <span>{authenticatedUser?.store_name || 'Independent Store'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Currency Display */}
                  <div className="text-center p-5 rounded-2xl bg-white/[0.02] border border-emerald-500/30 shadow-[0_0_24px_-6px_rgba(16,185,129,0.15)]">
                    <p className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1">
                      Opening Cash Register Float
                    </p>
                    <div className="text-3xl sm:text-4xl font-bold tracking-tight text-emerald-400 tabular-nums">
                      {money(openingFloat)}
                    </div>
                    <p className="text-[0.6875rem] text-stone-500 mt-1">
                      Initial starting cash for customer change
                    </p>
                  </div>

                  {/* Preset Bills */}
                  <div>
                    <span className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-2 text-center">
                      Quick Denomination Presets
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2000, 5000].map((amt) => {
                        const isSelected = openingFloat === amt * 100
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handlePresetFloat(amt)}
                            className={`btn-press py-2.5 rounded-2xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/40'
                                : 'bg-white/[0.03] border-white/[0.08] text-stone-300 hover:border-emerald-500/40 hover:bg-white/[0.06]'
                            }`}
                          >
                            ₱{amt.toLocaleString()}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus-within:border-emerald-400/70 focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all duration-200">
                      <span className="text-xs font-mono text-emerald-400 font-bold">Custom ₱</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customFloatInput}
                        onChange={handleCustomFloatChange}
                        placeholder="Enter custom starting float..."
                        className="flex-1 bg-transparent text-xs font-mono text-stone-100 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Confirm CTA */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmSession}
                      className="btn-press w-full h-12 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-600 hover:from-emerald-400 hover:to-brand-400 text-obsidian-950 shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Confirm &amp; Open Shift Register</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="btn-press w-full py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Switch Staff Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer Terminal Information */}
          <div className="mt-5 text-center">
            <p className="text-[0.6875rem] font-mono text-stone-500 tracking-wider flex items-center justify-center gap-1.5">
              <Clock className="w-3 h-3 text-emerald-500/60" />
              <span>Terminal {TERMINAL_ID} · Protected by Cloudflare Pages &amp; Dexie DB</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
