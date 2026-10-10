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
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Banknote,
  ShieldAlert,
  Zap,
  Activity,
  CheckCircle2
} from 'lucide-react'
import { AppLogo } from './AppLogo'
import { money } from '../utils/format'
import { db } from '../db'
import type { UserAccount, UserRole } from '../types'
import { loginWithCloud, rotatePinOnCloud, syncUserToCloud } from '../services/cloudSync'

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
}

interface VaultAuthModalProps {
  isOpen: boolean
  onAuthenticated: (session: VaultSession, isNewAccount?: boolean) => void
  currentCashier?: string
  initialStep?: 'LOGIN' | 'SIGNUP'
  onClose?: () => void
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

function HeroPanel({ terminalId }: { terminalId: string }): React.JSX.Element {
  const now = useClock()
  const clock = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const date = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <aside className="hidden lg:flex flex-col justify-between p-8 xl:p-10 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-zinc-950/95 relative overflow-hidden backdrop-blur-2xl h-full lg:max-h-screen select-none">
      {/* Tailark Subtle Ambient Glows */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-80 h-80 bg-emerald-500/[0.04] rounded-full blur-[100px] pointer-events-none" />
      {/* Tailark 24px Dot Matrix Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Header: Brand Crest Logo & Live Edge Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo size={44} animated={true} isPro={true} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold tracking-[0.16em] uppercase text-stone-100">
                TINDA POS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Pro Terminal
              </span>
            </div>
            <p className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mt-0.5">
              Hybrid Retail Engine · Enterprise Edition
            </p>
          </div>
        </div>

        {/* Live Beacon Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>EDGE ONLINE</span>
        </div>
      </div>

      {/* Hero Headline & Bento Features */}
      <div className="relative z-10 my-auto py-6 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-stone-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Multi-Terminal Merchant Gateway</span>
        </div>

        <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight text-stone-100 leading-tight">
          Smarter point of sale. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
            Zero network downtime.
          </span>
        </h1>

        <p className="mt-3 text-sm text-stone-400 leading-relaxed max-w-lg">
          Fast, audited register sessions for Philippine retail and groceries. Operates seamlessly offline with automatic realtime edge synchronization.
        </p>

        {/* 2x2 Tailark Bento Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {BENTO_FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <feat.icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-stone-200 tracking-wide">{feat.title}</p>
              <p className="text-[0.6875rem] text-stone-500 mt-1 leading-snug line-clamp-2">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="relative z-10 pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-500">Active Terminal ID</p>
          <p className="text-sm font-mono font-bold text-emerald-400">{terminalId}</p>
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
  initialStep = 'LOGIN',
  onClose
}: VaultAuthModalProps): React.JSX.Element | null {
  const [step, setStep] = useState<'LOGIN' | 'SIGNUP' | 'ROTATE' | 'FLOAT'>(initialStep)

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

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (Date.now() < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setErrorMessage(`Security Lockout: Too many failed attempts. Please wait ${waitSec}s.`)
      return
    }

    const trimmedUser = username.trim()
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
        is_owner: true
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
      setErrorMessage('Ang bagong PIN ay dapat 4 hanggang 6 na numero.')
      return
    }
    if (next !== confirm) {
      setErrorMessage('Hindi magkatugma ang dalawang PIN.')
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
      setErrorMessage('Hindi napalitan ang PIN sa cloud. Pakisubukang muli.')
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
      avatarUrl: authenticatedUser.avatar_url
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

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-zinc-950 overflow-y-auto">
      {/* ── Background: Tailark Dark Grid & Ambient Glows (Clean Minimalist Aesthetics) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-0 right-1/4 w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.14),_transparent_70%)] pointer-events-none" />
        <div className="absolute -bottom-40 left-10 w-[550px] h-[550px] rounded-full bg-emerald-600/[0.04] blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />
      </div>

      {/* ── Two-Column Responsive Split Layout (Desktop: 2-Col | Mobile: Centered) ── */}
      <div className="relative w-full flex flex-col lg:grid lg:grid-cols-2 min-h-full lg:h-screen lg:max-h-screen flex-1">
        {/* Left Column (Hero Showcase Panel) */}
        <HeroPanel terminalId={TERMINAL_ID} />

        {/* Right Column (Tailark Auth Card) */}
        <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-6 py-6 sm:py-8 lg:p-8 relative z-10 lg:overflow-y-auto custom-scrollbar">

          {/* Tailark Dark Glassmorphic Card */}
          <div className="w-full max-w-[420px] sm:max-w-[440px] rounded-3xl border border-white/[0.08] shadow-2xl bg-zinc-950/80 backdrop-blur-2xl text-stone-100 animate-fade-in relative overflow-hidden my-auto p-5 sm:p-7">

            {/* Back to Overview return button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-stone-400 hover:text-white bg-white/[0.05] hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer backdrop-blur-md shadow-sm"
                title="Return to Overview"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold tracking-wide">Overview</span>
              </button>
            )}

            {/* Verification Loading Overlay */}
            {isVerifying && (
              <div className="absolute inset-0 z-40 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="relative flex items-center justify-center mb-3">
                  <AppLogo size={46} animated={true} isPro={true} />
                </div>
                <p className="text-sm font-semibold tracking-wider text-emerald-400 animate-pulse">
                  Authenticating Session
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Verifying terminal credentials...
                </p>
                <div className="w-36 h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full w-2/3 animate-pulse" />
                </div>
              </div>
            )}

            {/* Header: Crest Logo & Title */}
            <div className="flex flex-col items-center justify-center text-center select-none mb-3">
              <div className="relative mb-2.5 flex items-center justify-center">
                <AppLogo size={50} animated={true} isPro={true} />
              </div>

              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="font-serif text-lg sm:text-xl font-bold tracking-[0.16em] uppercase text-stone-100">
                  TINDA POS
                </span>
                <span className="text-[0.6875rem] font-mono font-semibold tracking-wider text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase bg-emerald-500/10 shrink-0">
                  {TERMINAL_ID}
                </span>
              </div>

              <p className="text-xs text-stone-400 font-medium">
                {step === 'FLOAT'
                  ? 'Shift Opening Cash Float'
                  : step === 'SIGNUP'
                  ? 'Create Store Partner Account'
                  : step === 'ROTATE'
                  ? 'PIN Rotation Required'
                  : 'Counter Terminal Authentication'}
              </p>
            </div>

            {/* Segmented Switcher Tabs: "Sign In" vs "Register Store" */}
            {step !== 'FLOAT' && step !== 'ROTATE' && (
              <div className="mb-4">
                <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/80 border border-white/[0.08] shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('LOGIN')
                      setErrorMessage('')
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                      step === 'LOGIN'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
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
                    className={`py-2 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                      step === 'SIGNUP'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register Store</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form View Router */}
            <div>
              {/* ────────────────── 1. SIGN IN VIEW ────────────────── */}
              {step === 'LOGIN' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3 animate-fade-in">

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
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                                  : 'bg-white/[0.03] border-white/[0.08] text-stone-300 hover:border-emerald-500/30 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-500/25 text-emerald-400 flex items-center justify-center text-[0.625rem] font-bold">
                                {u.name ? u.name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[85px]">{u.name || u.username}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Username / Staff ID input */}
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1.5">
                      Staff ID / Username
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
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
                        className="w-full pl-10 pr-4 h-11 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 text-stone-100 text-sm font-medium placeholder-stone-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Credential Header: Mode Switcher (PIN vs Password) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 flex items-center gap-1.5">
                        <KeyRound className="w-3 h-3 text-emerald-400" />
                        <span>{authMode === 'PIN' ? '4-Digit PIN' : 'Password'}</span>
                      </label>
                      <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('PIN')
                            setPin((p) => p.replace(/\D/g, '').slice(0, 4))
                            setErrorMessage('')
                          }}
                          className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono uppercase transition-all ${
                            authMode === 'PIN'
                              ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
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
                          className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono uppercase transition-all ${
                            authMode === 'PASSWORD'
                              ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          Pass
                        </button>
                      </div>
                    </div>

                    {authMode === 'PIN' ? (
                      /* Tailark-Style 4-Dot Progress Display */
                      <div
                        onClick={() => pinInputRef.current?.focus()}
                        className="cursor-pointer flex items-center justify-center gap-3.5 h-11 px-4 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/40 transition-all w-full"
                      >
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = pin.length > idx
                          return (
                            <div
                              key={idx}
                              className={`h-3 w-3 rounded-full transition-all duration-200 ${
                                isFilled
                                  ? 'bg-emerald-400 scale-125 shadow-glow-emerald ring-2 ring-emerald-400/30'
                                  : 'bg-zinc-800 border border-zinc-700'
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
                        <Lock className="absolute left-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                          ref={passwordInputRef}
                          type={showPassword ? 'text' : 'password'}
                          value={pin}
                          onChange={(e) => {
                            setPin(e.target.value)
                            setErrorMessage('')
                          }}
                          placeholder="Enter account password"
                          className="w-full pl-10 pr-10 h-11 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 text-stone-100 text-sm font-medium placeholder-stone-500 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 p-1 rounded-lg text-stone-400 hover:text-stone-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Error Alert Display */}
                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-400 text-center animate-fade-in">
                      {errorMessage}
                    </div>
                  )}

                  {/* Tactile Keypad for PIN Mode */}
                  {authMode === 'PIN' && (
                    <div className="pt-1">
                      <div className="grid grid-cols-3 gap-1.5 w-full">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                          <button
                            type="button"
                            key={digit}
                            onClick={() => handleKeypadPress(digit)}
                            className="h-11 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-stone-100 font-mono font-bold text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                          >
                            {digit}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleClearPin}
                          className="h-11 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-stone-400 hover:text-stone-200 text-xs font-mono font-semibold uppercase transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKeypadPress('0')}
                          className="h-11 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-stone-100 font-mono font-bold text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={handleDeletePin}
                          className="h-11 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-stone-400 hover:text-emerald-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary CTA Submit */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-glow-emerald transition-all mt-2 disabled:opacity-75 cursor-pointer"
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
                <form onSubmit={handleSignupSubmit} className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
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
                      className="w-full h-10 px-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 text-stone-100 text-xs font-medium placeholder-stone-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
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
                      className="w-full h-10 px-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 text-stone-100 text-xs font-medium placeholder-stone-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
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
                        className="w-full h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 text-stone-100 text-xs font-mono placeholder-stone-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
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
                        className="w-full h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 text-stone-100 text-xs font-mono placeholder-stone-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300">PIN *</label>
                        <button
                          type="button"
                          onClick={() => setShowSignupPin(!showSignupPin)}
                          className="text-stone-400 hover:text-stone-200"
                        >
                          {showSignupPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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
                        className="w-full h-10 text-center px-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 text-emerald-400 font-mono text-sm tracking-widest focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">Confirm PIN *</label>
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
                        className="w-full h-10 text-center px-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] focus:border-emerald-500/60 text-emerald-400 font-mono text-sm tracking-widest focus:outline-none"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-400 text-center animate-fade-in">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-glow-emerald transition-all mt-1 cursor-pointer disabled:opacity-75"
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
                <form onSubmit={handleRotateSubmit} className="space-y-3 animate-fade-in">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <p className="text-xs text-amber-200 leading-relaxed">
                      Please set a private, secure PIN before opening your shift register.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
                      New Security PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={rotatePin}
                      onChange={(e) => setRotatePin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 to 6 digits"
                      className="w-full h-11 bg-zinc-900 border border-white/[0.08] rounded-xl px-4 text-center font-mono tracking-[0.3em] text-emerald-400 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-300 mb-1">
                      Confirm New PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={rotateConfirm}
                      onChange={(e) => setRotateConfirm(e.target.value.replace(/\D/g, ''))}
                      placeholder="Repeat new PIN"
                      className="w-full h-11 bg-zinc-900 border border-white/[0.08] rounded-xl px-4 text-center font-mono tracking-[0.3em] text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-400 text-center">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-glow-emerald transition-all mt-1"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Save New Security PIN</span>
                  </button>
                </form>
              )}

              {/* ────────────────── 4. SHIFT OPENING FLOAT ────────────────── */}
              {step === 'FLOAT' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      {authenticatedUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-stone-100 truncate">{authenticatedUser?.name}</p>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[0.625rem] font-mono text-emerald-400 font-semibold">
                          {authenticatedUser?.role === 'ADMIN' ? 'OWNER / ADMIN' : authenticatedUser?.role}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-stone-400 mt-0.5 truncate flex items-center gap-1">
                        <Store className="w-3 h-3 text-emerald-400/70" />
                        <span>{authenticatedUser?.store_name || 'Independent Store'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Currency Display */}
                  <div className="text-center p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/30 shadow-inner">
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
                            className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-glow-emerald'
                                : 'bg-white/[0.03] border-white/[0.08] text-stone-300 hover:border-emerald-500/30'
                            }`}
                          >
                            ₱{amt.toLocaleString()}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] focus-within:border-emerald-500/50">
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
                      className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-glow-emerald transition-all cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Confirm &amp; Open Shift Register</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="w-full py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
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