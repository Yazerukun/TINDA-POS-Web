import React, { useEffect, useState, useRef } from 'react'
import {
  KeyRound, ShieldCheck, Delete, ArrowRight,
  Lock, Clock, Fingerprint, WifiOff, ServerCog, Banknote, ChevronLeft,
  User, LogIn, UserPlus, Store, Eye, EyeOff, Sparkles, Shield, Zap,
  CheckCircle2, Building2
} from 'lucide-react'
import { money } from '../utils/format'
import { db } from '../db'
import type { UserAccount, UserRole } from '../types'

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
}

interface VaultAuthModalProps {
  isOpen: boolean
  onAuthenticated: (session: VaultSession, isNewAccount?: boolean) => void
  currentCashier?: string
}

const TERMINAL_ID = 'TRM-8891'

const GRID_BACKDROP = {
  backgroundImage:
    'linear-gradient(rgba(212, 175, 55, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.05) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  maskImage: 'radial-gradient(ellipse 90% 80% at 50% 15%, black 40%, transparent 85%)',
  WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 15%, black 40%, transparent 85%)',
} as const

const PILLARS = [
  {
    icon: Zap,
    title: 'Offline-First Resilience',
    desc: 'Instant counter settlement even during network drops or power outages'
  },
  {
    icon: ShieldCheck,
    title: 'Isolated Multi-Tenant Vault',
    desc: 'Each store possesses its own private database, products, and sales ledger'
  },
  {
    icon: Banknote,
    title: 'Shift Audit & Reconciliation',
    desc: 'Cash float tracking, X/Z-readings, and auditable shift sessions'
  },
  {
    icon: ServerCog,
    title: 'Global Edge Cloud Node',
    desc: 'Edge-served via Cloudflare with near-zero latency across the Philippines'
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

function BrandPanel({ terminalId }: { terminalId: string }): React.JSX.Element {
  const now = useClock()
  const clock = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const date = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <aside className="hidden lg:flex flex-col justify-between relative h-full min-h-screen p-10 xl:p-14 border-r border-gold/15 bg-obsidian-950/90 backdrop-blur-xl">
      {/* Ambient decorative glow inside brand panel */}
      <div className="absolute top-0 right-0 h-[380px] w-[380px] rounded-full bg-amber-500/[0.07] blur-[120px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-10 left-0 h-[340px] w-[340px] rounded-full bg-gold/[0.06] blur-[110px] pointer-events-none animate-float-reverse" />

      {/* Top Brand Logo & Live Radar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300/25 via-gold/15 to-obsidian-950 border border-gold/45 shadow-glow-gold">
            <span className="font-serif text-2xl font-black tracking-widest text-gold-light">T</span>
            <div className="absolute -inset-0.5 rounded-2xl bg-gold/15 blur-sm -z-10 animate-pulse-glow" />
          </div>
          <div>
            <p className="font-serif text-xl font-bold tracking-[0.25em] text-stone-100 uppercase">TINDA POS</p>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold-muted font-semibold">Enterprise Retail System</p>
          </div>
        </div>

        {/* Live operational badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[10px] tracking-wider uppercase shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Operational · 24/7</span>
        </div>
      </div>

      {/* Center Hero Description */}
      <div className="relative z-10 my-auto max-w-lg py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold-light font-mono text-[10px] tracking-widest uppercase mb-6">
          <Sparkles className="h-3 w-3 text-gold" />
          <span>Authorized Cashier Terminal</span>
        </div>

        <h1 className="font-serif text-4xl xl:text-5xl font-bold leading-[1.14] text-stone-100">
          Point of Sale
          <br />
          <span className="text-gold-gradient">Redefined for Speed.</span>
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-stone-400">
          Secure staff terminal gateway. Instant customer checkouts, zero-latency barcode scanning,
          private store data isolation, and verified cash drawer shift settlement.
        </p>

        {/* Feature Pillars */}
        <div className="mt-8 grid grid-cols-1 gap-3.5">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="flex items-start gap-3.5 p-3 rounded-2xl bg-zinc-950/40 border border-white/[0.05] hover:border-gold/30 hover:bg-zinc-900/40 transition-all duration-200 group"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/10 border border-gold/20 text-gold-light group-hover:scale-105 group-hover:bg-gold/20 transition-all">
                <p.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-200 tracking-wide">{p.title}</p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Terminal & Live PST Clock */}
      <div className="relative z-10 pt-6 border-t border-white/[0.08] flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Active Station</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gold-light font-semibold">{terminalId}</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[9px] font-mono text-stone-400">PST (UTC+8)</span>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-2xl text-stone-100 tabular-nums font-bold tracking-wider">{clock}</p>
          <p className="font-mono text-[10px] text-stone-500 tracking-wider mt-0.5">{date}</p>
        </div>
      </div>
    </aside>
  )
}

export function VaultAuthModal({ isOpen, onAuthenticated }: VaultAuthModalProps): React.JSX.Element | null {
  const [step, setStep] = useState<'LOGIN' | 'SIGNUP' | 'FLOAT'>('LOGIN')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<UserAccount | null>(null)
  const [openingFloat, setOpeningFloat] = useState(200000) // ₱2,000.00 in centavos
  const [customFloatInput, setCustomFloatInput] = useState('2000')

  // Security: Brute-force lockout state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number>(0)

  // Store Owner Sign Up form state
  const [signupStoreName, setSignupStoreName] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPin, setSignupPin] = useState('')
  const [signupConfirmPin, setSignupConfirmPin] = useState('')
  const [showSignupPin, setShowSignupPin] = useState(false)

  const usernameInputRef = useRef<HTMLInputElement>(null)
  const signupStoreInputRef = useRef<HTMLInputElement>(null)

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
    if (pin.length < 24) {
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
      setErrorMessage('Please enter your username or email.')
      usernameInputRef.current?.focus()
      return
    }
    if (!pin) {
      setErrorMessage('Please enter your security PIN or password.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    try {
      const lower = trimmedUser.toLowerCase()

      // 1. Direct hardcoded check for platform master admin
      if (lower === 'skorts188@gmail.com') {
        if (pin === 'muyco155') {
          let masterAdmin = await db.users.where('username').equalsIgnoreCase('skorts188@gmail.com').first()
          if (!masterAdmin) {
            const masterId = await db.users.add({
              username: 'skorts188@gmail.com',
              name: 'Ian Muyco',
              role: 'ADMIN',
              pin: 'muyco155',
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              store_name: 'PLATFORM_HQ',
              email: 'skorts188@gmail.com',
              is_owner: true
            })
            masterAdmin = {
              id: Number(masterId),
              username: 'skorts188@gmail.com',
              name: 'Ian Muyco',
              role: 'ADMIN',
              pin: 'muyco155',
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              store_name: 'PLATFORM_HQ',
              email: 'skorts188@gmail.com',
              is_owner: true
            }
          }
          setFailedAttempts(0)
          setLockoutUntil(0)
          setAuthenticatedUser(masterAdmin)
          setIsVerifying(false)
          setStep('FLOAT')
          return
        }
      }

      // 2. Query db.users by username or email
      let user = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
      if (!user) {
        user = await db.users.where('email').equalsIgnoreCase(trimmedUser).first()
      }

      // Fallback for default 'admin' / '1234'
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
          await db.users.add(newAdmin)
          user = newAdmin
        } else {
          user = existingAdmin
        }
      }

      if (!user || user.status !== 'ACTIVE' || user.pin !== pin) {
        const nextFails = failedAttempts + 1
        setFailedAttempts(nextFails)
        if (nextFails >= 5) {
          setLockoutUntil(Date.now() + 30000)
          setErrorMessage('Security Alert: 5 failed attempts. Terminal locked for 30 seconds.')
        } else {
          setErrorMessage(`Authentication failed. Invalid username or PIN. (${5 - nextFails} attempts remaining)`)
        }
        setPin('')
        setIsVerifying(false)
        return
      }

      // Successful authentication
      setFailedAttempts(0)
      setLockoutUntil(0)
      setAuthenticatedUser(user)
      setIsVerifying(false)
      setStep('FLOAT')
    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage('A database error occurred. Please try again.')
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
    if (signupPin.length < 4) {
      setErrorMessage('PIN or password must be at least 4 characters.')
      return
    }
    if (signupPin !== signupConfirmPin) {
      setErrorMessage('PIN confirmation does not match.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    try {
      const existing = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
      if (existing) {
        setErrorMessage(`Username "${trimmedUser}" is already taken.`)
        setIsVerifying(false)
        return
      }

      const newUser: UserAccount = {
        username: trimmedUser,
        name: trimmedName,
        role: 'ADMIN',
        pin: signupPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        store_name: trimmedStore,
        email: trimmedEmail,
        is_owner: true
      }

      const id = await db.users.add(newUser)
      newUser.id = Number(id)

      // Save initial store settings scoped to this store
      try {
        const cur = await db.settings.get('store_settings')
        const updatedSettings = {
          ...(cur?.value || {}),
          store_name: trimmedStore,
          owner_name: trimmedName,
          contact_number: trimmedEmail
        }
        await db.settings.put({ key: `store_settings_${trimmedStore}`, value: updatedSettings })
      } catch (e) {
        console.warn('Failed to update store settings during signup:', e)
      }

      setAuthenticatedUser(newUser)
      setIsVerifying(false)
      setStep('FLOAT')
    } catch (err) {
      console.error('Signup error:', err)
      setErrorMessage('Failed to create account. Please try again.')
      setIsVerifying(false)
    }
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

    const lower = authenticatedUser.username?.toLowerCase() || ''
    const isMaster =
      lower === 'skorts188@gmail.com' ||
      authenticatedUser.email?.toLowerCase() === 'skorts188@gmail.com' ||
      (authenticatedUser.role === 'ADMIN' && authenticatedUser.pin === 'muyco155')

    // Determine canonical store name
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

    // Persist store_name if missing on account
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
      storeName: userStoreName
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
    <div className="fixed inset-0 z-50 flex bg-obsidian-950/90 backdrop-blur-2xl overflow-y-auto">
      {/* ── Dynamic Ambient Animated Canvas ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated geometric drift grid */}
        <div className="absolute inset-0 bg-grid-drift opacity-60" style={GRID_BACKDROP} />

        {/* Floating Orb 1: Warm Amber Gold */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/25 via-gold/15 to-transparent blur-[130px] animate-float-slow animate-pulse-glow" />

        {/* Floating Orb 2: Radiant Emerald / Sapphire Security Accent */}
        <div className="absolute top-1/4 -right-28 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-emerald-500/15 via-gold/10 to-transparent blur-[140px] animate-float-reverse" />

        {/* Floating Orb 3: Deep Gold Center Horizon */}
        <div className="absolute -bottom-40 left-1/3 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-gold/15 via-amber-600/10 to-transparent blur-[160px] animate-float-slow" />

        {/* Subtle Shimmer Ray at the top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/45 to-transparent animate-pulse" />
      </div>

      {/* Two-column layout: brand (lg+) | auth */}
      <div className="relative w-full flex lg:grid lg:grid-cols-2 min-h-full">
        <BrandPanel terminalId={TERMINAL_ID} />

        {/* ── Auth Column ── */}
        <main className="flex flex-col items-center justify-center w-full min-h-full px-4 py-8 sm:px-8 sm:py-12 relative z-10">

          {/* Elevated Glassmorphic Terminal Card */}
          <div className="w-full max-w-md sm:max-w-[480px] glass-vault rounded-3xl border border-gold/30 shadow-vault text-stone-100 animate-fade-in relative overflow-hidden backdrop-blur-3xl">

            {/* Subtle card top glow beam */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

            {/* Card Header & Brand Emblem */}
            <div className="flex items-center justify-between px-6 pt-6 sm:px-8 sm:pt-7 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300/20 via-gold/15 to-transparent border border-gold/40 shadow-glow-gold">
                  <span className="font-serif text-lg font-black tracking-widest text-gold-light">T</span>
                </div>
                <div>
                  <p className="font-serif text-sm font-bold tracking-[0.2em] uppercase text-stone-100">TINDA POS</p>
                  <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold-muted font-medium">
                    {step === 'FLOAT' ? 'Shift Float Setup' : step === 'SIGNUP' ? 'New Merchant Store' : 'Station Counter Gateway'}
                  </p>
                </div>
              </div>

              {/* Status Step Pill */}
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] tracking-wider uppercase bg-gold/10 border border-gold/25 text-gold-light font-medium">
                {step === 'LOGIN' ? <KeyRound className="h-3 w-3" /> : step === 'SIGNUP' ? <Store className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                {step === 'LOGIN' ? 'Step 1 · Login' : step === 'SIGNUP' ? 'Register' : 'Step 2 · Float'}
              </span>
            </div>

            {/* Mode Switcher Segmented Tabs (Sign In vs Register Store) */}
            {step !== 'FLOAT' && (
              <div className="px-6 pt-5 sm:px-8">
                <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-950/80 border border-white/[0.08] shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('LOGIN')
                      setErrorMessage('')
                    }}
                    className={`py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 ${
                      step === 'LOGIN'
                        ? 'bg-gradient-to-r from-gold/25 to-amber-500/20 text-gold-light border border-gold/40 shadow-glow-gold'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Terminal Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('SIGNUP')
                      setErrorMessage('')
                    }}
                    className={`py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 ${
                      step === 'SIGNUP'
                        ? 'bg-gradient-to-r from-gold/25 to-amber-500/20 text-gold-light border border-gold/40 shadow-glow-gold'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register Store</span>
                  </button>
                </div>
              </div>
            )}

            {/* Card Content Body */}
            <div className="px-6 py-6 sm:px-8 sm:py-7">

              {/* ────────────────── STEP: SIGNUP (ORGANIZED 2-SECTION FORM) ────────────────── */}
              {step === 'SIGNUP' ? (
                <form onSubmit={handleSignupSubmit} className="animate-fade-in space-y-4">
                  {/* Section 1: Store & Owner Profile */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/50 border border-white/[0.06] space-y-3">
                    <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold-muted font-semibold flex items-center gap-1.5">
                      <Store className="h-3 w-3" />
                      <span>1. Store Profile</span>
                    </p>

                    <div>
                      <label className="block text-[10px] font-mono tracking-wider uppercase text-stone-400 mb-1">
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
                        className="w-full h-11 px-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono tracking-wider uppercase text-stone-400 mb-1">
                        Store Owner Full Name *
                      </label>
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => {
                          setSignupName(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="e.g. Maria Santos"
                        className="w-full h-11 px-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Section 2: Owner Credentials & Access */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/50 border border-white/[0.06] space-y-3">
                    <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold-muted font-semibold flex items-center gap-1.5">
                      <Lock className="h-3 w-3" />
                      <span>2. Login Credentials</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-mono tracking-wider uppercase text-stone-400 mb-1">
                          Username *
                        </label>
                        <input
                          type="text"
                          value={signupUsername}
                          onChange={(e) => {
                            setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                            setErrorMessage('')
                          }}
                          placeholder="e.g. mariasari"
                          className="w-full h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 text-stone-100 text-xs font-mono placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono tracking-wider uppercase text-stone-400 mb-1">
                          Contact / Phone
                        </label>
                        <input
                          type="text"
                          value={signupEmail}
                          onChange={(e) => {
                            setSignupEmail(e.target.value)
                            setErrorMessage('')
                          }}
                          placeholder="e.g. 0917..."
                          className="w-full h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 text-stone-100 text-xs font-mono placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-mono tracking-wider uppercase text-stone-400">PIN *</label>
                          <button
                            type="button"
                            onClick={() => setShowSignupPin(!showSignupPin)}
                            className="text-stone-500 hover:text-gold-light"
                          >
                            {showSignupPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                        <input
                          type={showSignupPin ? 'text' : 'password'}
                          maxLength={24}
                          value={signupPin}
                          onChange={(e) => {
                            setSignupPin(e.target.value)
                            setErrorMessage('')
                          }}
                          placeholder="Min 4 chars"
                          className="w-full h-10 text-center px-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 text-gold-light font-mono text-xs tracking-wider focus:outline-none shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono tracking-wider uppercase text-stone-400 mb-1">Confirm PIN *</label>
                        <input
                          type={showSignupPin ? 'text' : 'password'}
                          maxLength={24}
                          value={signupConfirmPin}
                          onChange={(e) => {
                            setSignupConfirmPin(e.target.value)
                            setErrorMessage('')
                          }}
                          placeholder="Confirm"
                          className="w-full h-10 text-center px-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 text-gold-light font-mono text-xs tracking-wider focus:outline-none shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-mono text-red-400 text-center animate-fade-in">
                      {errorMessage}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-gold w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold hover:shadow-glow-amber transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{isVerifying ? 'Registering...' : 'Create Store & Start Shift'}</span>
                  </button>
                </form>
              ) : step === 'LOGIN' ? (
                /* ────────────────── STEP: LOGIN (CLEAN, MODERN & ORGANIZED) ────────────────── */
                <form onSubmit={handleLoginSubmit} className="animate-fade-in space-y-4">
                  {/* Username / Staff ID */}
                  <div>
                    <label className="block text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400 mb-1.5 flex items-center justify-between">
                      <span>Staff ID / Username / Email</span>
                      <span className="text-[9px] text-stone-500 normal-case">Physical or touch entry</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-stone-400 pointer-events-none">
                        <User className="h-4 w-4 text-gold/70" />
                      </div>
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
                        placeholder="Enter username (e.g. skorts188@gmail.com)"
                        className="w-full pl-10 pr-4 h-11 sm:h-12 rounded-2xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium tracking-wide placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Security PIN / Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400">
                        Security PIN / Password
                      </label>
                      <div className="flex items-center gap-2">
                        {/* Toggle touch keypad */}
                        <button
                          type="button"
                          onClick={() => setShowKeypad(!showKeypad)}
                          className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border transition-all ${
                            showKeypad
                              ? 'bg-gold/20 text-gold-light border-gold/40'
                              : 'bg-zinc-900 border-white/[0.08] text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {showKeypad ? 'Hide Numpad' : 'Touch Numpad'}
                        </button>

                        {/* Show/Hide password */}
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="text-stone-400 hover:text-gold-light transition-colors"
                          title={showPin ? 'Hide PIN' : 'Show PIN'}
                        >
                          {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-between px-3.5 h-11 sm:h-12 rounded-2xl bg-zinc-950/70 border border-white/[0.09] focus-within:border-gold/60 transition-all shadow-inner">
                      {/* Visual dots indicator if numeric */}
                      <div className="flex items-center gap-2.5">
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = pin.length > idx
                          return (
                            <div
                              key={idx}
                              className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full transition-all duration-200 ${
                                isFilled
                                  ? 'bg-gradient-to-br from-amber-200 to-gold shadow-glow-gold scale-110'
                                  : 'border border-white/20 bg-zinc-900/60'
                              }`}
                            />
                          )
                        })}
                      </div>

                      {/* Direct physical keyboard input */}
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={24}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="Type PIN..."
                        className="flex-1 min-w-0 text-right bg-transparent text-xs sm:text-sm font-mono tracking-widest text-gold-light focus:outline-none placeholder-stone-600 pl-2"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-mono text-red-400 text-center animate-fade-in">
                      {errorMessage}
                    </div>
                  )}

                  {/* Touch Keypad Drawer (Collapsible & Compact) */}
                  {showKeypad && (
                    <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.08] animate-fade-in">
                      <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                          <button
                            type="button"
                            key={digit}
                            onClick={() => handleKeypadPress(digit)}
                            className="btn-press flex items-center justify-center rounded-xl bg-zinc-900/70 hover:bg-gold/20 border border-white/[0.08] hover:border-gold/40 text-stone-100 font-mono font-bold text-lg py-2.5 transition-all shadow-sm active:scale-95"
                          >
                            {digit}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleClearPin}
                          className="btn-press flex items-center justify-center rounded-xl bg-zinc-900/70 hover:bg-white/10 border border-white/[0.08] text-[10px] font-mono tracking-wider text-stone-400 uppercase py-2.5 transition-all active:scale-95"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKeypadPress('0')}
                          className="btn-press flex items-center justify-center rounded-xl bg-zinc-900/70 hover:bg-gold/20 border border-white/[0.08] hover:border-gold/40 text-stone-100 font-mono font-bold text-lg py-2.5 transition-all shadow-sm active:scale-95"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={handleDeletePin}
                          className="btn-press flex items-center justify-center rounded-xl bg-zinc-900/70 hover:bg-white/10 border border-white/[0.08] text-stone-400 hover:text-stone-200 py-2.5 transition-all active:scale-95"
                        >
                          <Delete className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sign In Primary Button */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-gold w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold hover:shadow-glow-amber transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{isVerifying ? 'Authenticating...' : 'Unlock Terminal & Open Shift'}</span>
                  </button>

                  {/* Terminal Station Hint */}
                  <div className="pt-2 text-center">
                    <p className="font-mono text-[9px] text-stone-500 tracking-wider flex items-center justify-center gap-1.5">
                      <Lock className="h-3 w-3 text-stone-600" />
                      Encrypted Counter Gateway · Station {TERMINAL_ID}
                    </p>
                  </div>
                </form>
              ) : (
                /* ────────────────── STEP 2: SHIFT OPENING FLOAT ────────────────── */
                <div className="animate-fade-in space-y-5">
                  {/* User Identification Header Card */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/[0.08] border border-gold/30">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-gold/15 border border-gold/40 flex items-center justify-center text-gold-light shrink-0 font-serif font-black text-sm shadow-glow-gold">
                      {authenticatedUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-stone-100 truncate">{authenticatedUser?.name}</p>
                        <span className="px-1.5 py-0.5 rounded bg-gold/15 border border-gold/30 text-[9px] font-mono text-gold-light font-semibold">
                          {authenticatedUser?.role === 'ADMIN' ? 'OWNER / ADMIN' : authenticatedUser?.role}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-stone-400 mt-0.5 truncate flex items-center gap-1">
                        <Store className="h-3 w-3 text-gold/60" />
                        <span>{authenticatedUser?.store_name || 'Independent Store'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Big Currency Opening Float Display */}
                  <div className="text-center p-4 rounded-2xl bg-zinc-950/70 border border-gold/35 shadow-inner">
                    <label className="block text-[10px] font-mono tracking-[0.25em] uppercase text-stone-400 mb-1.5">
                      Opening Cash Register Float
                    </label>
                    <div className="font-serif text-3xl sm:text-4xl font-black tracking-wider text-gold-light drop-shadow-md">
                      {money(openingFloat)}
                    </div>
                    <p className="text-[10px] font-mono text-stone-500 mt-1 uppercase tracking-wider">
                      Initial cash balance for customer change
                    </p>
                  </div>

                  {/* Denomination Quick Presets */}
                  <div>
                    <span className="block text-[9px] font-mono tracking-widest uppercase text-stone-400 mb-2 text-center">
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
                            className={`btn-press py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                              isSelected
                                ? 'bg-gold/25 border-gold text-gold-light shadow-glow-gold'
                                : 'bg-zinc-900/60 border-white/[0.08] text-stone-300 hover:border-gold/30'
                            }`}
                          >
                            ₱{amt.toLocaleString()}
                          </button>
                        )
                      })}
                    </div>

                    {/* Custom float input */}
                    <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] focus-within:border-gold/60">
                      <span className="text-xs font-mono text-gold-light font-bold">Custom ₱</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customFloatInput}
                        onChange={handleCustomFloatChange}
                        placeholder="Enter starting cash in drawer..."
                        className="flex-1 bg-transparent text-xs font-mono text-stone-100 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmSession}
                      className="btn-gold w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold hover:shadow-glow-amber transition-all"
                    >
                      <span>Confirm &amp; Open Register</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="w-full py-2 text-[10px] font-mono text-stone-400 hover:text-stone-200 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Switch Account / Sign In with Another User</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Legal & Station Info */}
          <div className="mt-5 flex flex-col items-center gap-1.5 text-center">
            <p className="font-mono text-[9px] text-stone-600 tracking-wider flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Terminal {TERMINAL_ID} · Private Counter Session
            </p>
            <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500">
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-gold-light transition-colors underline decoration-stone-800">Privacy Policy</a>
              <span>•</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-gold-light transition-colors underline decoration-stone-800">Terms of Service</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}