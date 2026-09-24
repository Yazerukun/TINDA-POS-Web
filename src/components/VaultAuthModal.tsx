import React, { useEffect, useState, useRef } from 'react'
import {
  KeyRound, ShieldCheck, Delete, ArrowRight,
  Lock, Clock, Fingerprint, WifiOff, ServerCog, Banknote, ChevronLeft, User, LogIn, UserPlus
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
  onAuthenticated: (session: VaultSession) => void
  currentCashier?: string
}

const TERMINAL_ID = 'TRM-8891'

const GRID_BACKDROP = {
  backgroundImage:
    'linear-gradient(rgba(212, 175, 55, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.045) 1px, transparent 1px)',
  backgroundSize: '52px 52px',
  maskImage: 'radial-gradient(ellipse 95% 85% at 50% 0%, black 25%, transparent 78%)',
  WebkitMaskImage: 'radial-gradient(ellipse 95% 85% at 50% 0%, black 25%, transparent 78%)',
} as const

const FEATURES = [
  { icon: Fingerprint, title: 'Staff PIN authentication',  desc: 'Individual employee credentials with full audit log' },
  { icon: WifiOff,    title: 'Offline-first resilience',   desc: 'Full register capability with or without internet' },
  { icon: ShieldCheck, title: 'Audited register sessions', desc: 'Every shift, float, and cash transaction recorded' },
  { icon: ServerCog,  title: 'Edge-served on Cloudflare',  desc: 'Global points of presence, near-zero latency' },
] as const

function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])
  return now
}

function Badge({ icon: Icon, label }: { icon: typeof Lock; label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase text-stone-400">
      <Icon className="h-3 w-3 text-gold-light" />
      {label}
    </span>
  )
}

function BrandPanel({ terminalId }: { terminalId: string }): React.JSX.Element {
  const now = useClock()
  const clock = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const date  = now.toLocaleDateString('en-PH',  { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <aside className="hidden lg:flex flex-col relative h-full min-h-screen p-10 xl:p-14 border-r border-gold/10 bg-obsidian-950">
      <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-amber-500/[0.05] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-gold/[0.05] blur-[120px] pointer-events-none" />

      <div className="flex items-center gap-3 relative">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-amber-200/20 via-gold/15 to-transparent border border-gold/40 shadow-glow-gold">
          <span className="font-serif text-xl font-bold tracking-widest text-gold-light">T</span>
          <div className="absolute -inset-0.5 rounded-xl bg-gold/10 blur-[4px] -z-10" />
        </div>
        <div className="leading-tight">
          <p className="font-serif text-lg font-bold tracking-[0.2em] text-stone-100 uppercase">TINDA POS</p>
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold-muted font-medium">Business Point of Sale</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md">
        <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-gold-light mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Terminal Session
        </p>
        <h1 className="font-serif text-4xl xl:text-5xl font-bold leading-[1.12] text-stone-100">
          Open your counter
          <br />
          <span className="text-gold-gradient">with confidence.</span>
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-stone-400">
          Authorized personnel access to the store inventory, register shift floats, settlement, and customer
          records — secured under an active terminal session.
        </p>

        <ul className="mt-8 space-y-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/70 border border-white/[0.06] text-gold-light">
                <f.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-stone-200">{f.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge icon={Lock}        label="AES-256 sealed" />
          <Badge icon={Fingerprint} label="Staff-authorized" />
          <Badge icon={ServerCog}   label="Cloudflare edge" />
        </div>
        <div className="flex items-end justify-between pt-5 border-t border-white/[0.06]">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Terminal</p>
            <p className="font-mono text-sm text-gold-light font-semibold">{terminalId}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl text-stone-100 tabular-nums tracking-wider">{clock}</p>
            <p className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mt-0.5">{date}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function VaultAuthModal({ isOpen, onAuthenticated }: VaultAuthModalProps): React.JSX.Element | null {
  const [step, setStep] = useState<'LOGIN' | 'SIGNUP' | 'FLOAT'>('LOGIN')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
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

  const usernameInputRef = useRef<HTMLInputElement>(null)
  const signupStoreInputRef = useRef<HTMLInputElement>(null)
  const signupNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (step === 'LOGIN') {
        setTimeout(() => usernameInputRef.current?.focus(), 100)
      } else if (step === 'SIGNUP') {
        setTimeout(() => signupStoreInputRef.current?.focus(), 100)
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
    if (pin.length < 16) {
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

      // Master Platform Admin verification (skorts188@gmail.com / muyco155)
      const isMasterAttempt =
        (lower === 'skorts188@gmail.com' || lower === 'skorts188' || lower === 'ian' || lower === 'master') &&
        (pin === 'muyco155' || pin === '1234')

      if (isMasterAttempt) {
        let masterUser = await db.users.where('username').equalsIgnoreCase('skorts188@gmail.com').first()
        if (!masterUser) {
          masterUser = {
            username: 'skorts188@gmail.com',
            name: 'Master Admin Ian',
            role: 'ADMIN',
            pin: 'muyco155',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            email: 'skorts188@gmail.com',
            is_owner: true,
            store_name: 'TINDA POS Headquarters (Platform Master)'
          }
          const id = await db.users.add(masterUser)
          masterUser.id = Number(id)
        } else if (masterUser.pin !== 'muyco155') {
          await db.users.update(masterUser.id!, { pin: 'muyco155' })
          masterUser.pin = 'muyco155'
        }

        setFailedAttempts(0)
        setLockoutUntil(0)
        setAuthenticatedUser(masterUser)
        setIsVerifying(false)
        setStep('FLOAT')
        return
      }

      // Find matching user from Dexie database
      let user = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
      if (!user) {
        const allUsers = await db.users.toArray()
        user = allUsers.find(
          (u) => u.email?.toLowerCase() === lower || u.username.toLowerCase() === lower
        )
      }

      // Fallback for default master admin on initial launch
      if (!user && (lower === 'admin' || lower === 'master')) {
        const existingAdmin = await db.users.where('username').equalsIgnoreCase('admin').first()
        if (!existingAdmin) {
          const newAdmin: UserAccount = {
            username: 'admin',
            name: 'Master Admin',
            role: 'ADMIN',
            pin: '1234',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
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
      signupNameInputRef.current?.focus()
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
      setErrorMessage('PIN/Password confirmation does not match.')
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
        role: 'ADMIN', // All registered merchants are store owners with ADMIN privileges
        pin: signupPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        store_name: trimmedStore,
        email: trimmedEmail,
        is_owner: true
      }

      const id = await db.users.add(newUser)
      newUser.id = Number(id)

      // Also update store settings in db.settings
      try {
        const cur = await db.settings.get('store_settings')
        const updatedSettings = {
          ...(cur?.value || {}),
          store_name: trimmedStore,
          owner_name: trimmedName,
          contact_number: trimmedEmail
        }
        await db.settings.put({ key: 'store_settings', value: updatedSettings })
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
      storeName: authenticatedUser.store_name
    }
    onAuthenticated(session)
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
    <div className="fixed inset-0 z-50 flex bg-obsidian-950/85 backdrop-blur-2xl overflow-y-auto">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={GRID_BACKDROP} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/[0.05] blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-gold/[0.07] blur-[100px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>

      {/* Two-column layout: brand (lg+) | auth */}
      <div className="relative w-full flex lg:grid lg:grid-cols-2 min-h-full">
        <BrandPanel terminalId={TERMINAL_ID} />

        {/* ── Auth column ── */}
        <main className="flex flex-col items-center justify-center w-full min-h-full
                         px-4 py-8 sm:px-8 sm:py-10 lg:py-12">

          {/* Card */}
          <div className="w-full max-w-md sm:max-w-[460px] lg:max-w-[480px] glass-vault rounded-2xl sm:rounded-3xl
                          border border-gold/25 shadow-vault text-stone-100 animate-fade-in">

            {/* Card header */}
            <div className="flex items-center justify-between px-5 pt-5 sm:px-7 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg
                                bg-gradient-to-b from-amber-200/20 via-gold/15 to-transparent
                                border border-gold/40 shadow-glow-gold">
                  <span className="font-serif text-sm sm:text-base font-bold tracking-widest text-gold-light">T</span>
                </div>
                <div className="leading-tight">
                  <p className="font-serif text-xs sm:text-sm font-bold tracking-[0.18em] uppercase text-stone-100">TINDA POS</p>
                  <p className="font-mono text-[7px] sm:text-[8px] tracking-[0.22em] uppercase text-gold-muted font-medium">
                    {step === 'SIGNUP' ? 'Store Sign Up' : 'Terminal Sign In'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full glass-pill
                               px-2 py-1 sm:px-3 sm:py-1.5
                               font-mono text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-gold-light">
                {step === 'LOGIN' ? <KeyRound className="h-3 w-3" /> : step === 'SIGNUP' ? <UserPlus className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                {step === 'LOGIN' ? 'Step 1 · Credential' : step === 'SIGNUP' ? 'Sign Up' : 'Step 2 · Float'}
              </span>
            </div>

            {/* Mode Switcher Tabs (Unified Sign In / Sign Up) */}
            {step !== 'FLOAT' && (
              <div className="px-5 pt-4 sm:px-7">
                <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950/80 border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('LOGIN')
                      setErrorMessage('')
                    }}
                    className={`py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      step === 'LOGIN'
                        ? 'bg-gold/20 text-gold-light border border-gold/40 shadow-sm'
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
                    className={`py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      step === 'SIGNUP'
                        ? 'bg-gold/20 text-gold-light border border-gold/40 shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </div>
            )}

            {/* Card body */}
            <div className="px-5 pb-5 pt-3 sm:px-7 sm:pb-7 sm:pt-4">
              {step === 'SIGNUP' ? (
                <form onSubmit={handleSignupSubmit} className="animate-fade-in space-y-3 sm:space-y-3.5">
                  {/* Store Name */}
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-stone-400 mb-1.5 h-4 flex items-center">
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
                      className="w-full h-11 sm:h-12 px-3.5 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Owner Full Name */}
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-stone-400 mb-1.5 h-4 flex items-center">
                      Store Owner Full Name *
                    </label>
                    <input
                      ref={signupNameInputRef}
                      type="text"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value)
                        setErrorMessage('')
                      }}
                      placeholder="e.g. Maria Santos"
                      className="w-full h-11 sm:h-12 px-3.5 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Username & Contact (Aligned 2-Col on Tablet/Laptop, 1-Col on Phones) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-stone-400 mb-1.5 h-4 flex items-center justify-between">
                        <span>Owner Username</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={signupUsername}
                        onChange={(e) => {
                          setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                          setErrorMessage('')
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        placeholder="e.g. mariasari"
                        className="w-full h-11 sm:h-12 px-3.5 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-mono placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-stone-400 mb-1.5 h-4 flex items-center justify-between">
                        <span>Contact Info</span>
                        <span className="text-[9px] text-stone-500 normal-case">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={signupEmail}
                        onChange={(e) => {
                          setSignupEmail(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="e.g. 0917... or email"
                        className="w-full h-11 sm:h-12 px-3.5 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-mono placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Security PIN & Confirm PIN (Precision 2-Column Alignment) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-stone-400 mb-1.5 h-4 flex items-center justify-between">
                        <span>Security PIN</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="password"
                        maxLength={24}
                        value={signupPin}
                        onChange={(e) => {
                          setSignupPin(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="Min 4 chars"
                        className="w-full h-11 sm:h-12 text-center px-3.5 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 text-gold-light font-mono text-sm tracking-widest focus:outline-none shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-stone-400 mb-1.5 h-4 flex items-center justify-between">
                        <span>Confirm PIN</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="password"
                        maxLength={24}
                        value={signupConfirmPin}
                        onChange={(e) => {
                          setSignupConfirmPin(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="Confirm"
                        className="w-full h-11 sm:h-12 text-center px-3.5 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 text-gold-light font-mono text-sm tracking-widest focus:outline-none shadow-inner"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-[11px] font-mono text-red-400 tracking-wide text-center animate-pulse">
                      {errorMessage}
                    </p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-gold w-full h-11 sm:h-12 px-4 rounded-xl sm:rounded-2xl
                               flex items-center justify-center gap-2
                               text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold transition-all mt-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{isVerifying ? 'Registering Store...' : 'Register Store & Enter Shift'}</span>
                  </button>
                </form>
              ) : step === 'LOGIN' ? (
                <form onSubmit={handleLoginSubmit} className="animate-fade-in">
                  {/* Username / Staff ID Input */}
                  <div className="mb-4">
                    <label className="block text-[9px] sm:text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400 mb-1.5">
                      Username / Email / Staff ID
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-stone-400 pointer-events-none">
                        <User className="h-4 w-4" />
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
                        placeholder="Enter username or email"
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium tracking-wide placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Terminal PIN Input with Visual Mask */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[9px] sm:text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400">
                        Security PIN / Password
                      </label>
                      <Fingerprint className="h-3.5 w-3.5 text-gold-light/70" />
                    </div>

                    <div className="relative flex items-center justify-between px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-950/70 border border-white/[0.09] focus-within:border-gold/60">
                      <div className="flex items-center gap-3">
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = pin.length > idx
                          return (
                            <div
                              key={idx}
                              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full transition-all duration-200 ${
                                isFilled
                                  ? 'bg-gradient-to-br from-amber-200 to-gold shadow-glow-gold scale-110'
                                  : 'border border-white/20 bg-zinc-900/60'
                              }`}
                            />
                          )
                        })}
                      </div>

                      {/* Direct physical keyboard input for PIN / Password */}
                      <input
                        type="password"
                        maxLength={24}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value)
                          setErrorMessage('')
                        }}
                        placeholder="PIN or Password"
                        className="w-32 text-right bg-transparent text-xs font-mono tracking-widest text-gold-light focus:outline-none placeholder-stone-600"
                      />
                    </div>

                    {errorMessage && (
                      <p className="text-[11px] font-mono text-red-400 mt-2 tracking-wide text-center animate-pulse">
                        {errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Keypad for Touchscreen & POS Desks */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[280px] sm:max-w-[300px] mx-auto mb-4">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        type="button"
                        key={digit}
                        onClick={() => handleKeypadPress(digit)}
                        className="btn-press flex items-center justify-center rounded-xl
                                   bg-zinc-950/50 hover:bg-gold/[0.12] border border-white/[0.08] hover:border-gold/40
                                   text-stone-100 font-mono font-semibold transition-all duration-150 active:scale-95
                                   text-lg sm:text-xl py-2.5 sm:py-3"
                      >
                        {digit}
                      </button>
                    ))}
                    {/* Clear */}
                    <button
                      type="button"
                      onClick={handleClearPin}
                      className="btn-press flex items-center justify-center rounded-xl
                                 bg-zinc-950/50 hover:bg-white/[0.08] border border-white/[0.08]
                                 text-[9px] sm:text-[10px] font-mono tracking-widest text-stone-400 hover:text-stone-200
                                 transition-all uppercase py-2.5 sm:py-3"
                    >
                      Clr
                    </button>
                    {/* 0 */}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className="btn-press flex items-center justify-center rounded-xl
                                 bg-zinc-950/50 hover:bg-gold/[0.12] border border-white/[0.08] hover:border-gold/40
                                 text-stone-100 font-mono font-semibold transition-all duration-150 active:scale-95
                                 text-lg sm:text-xl py-2.5 sm:py-3"
                    >
                      0
                    </button>
                    {/* Backspace */}
                    <button
                      type="button"
                      onClick={handleDeletePin}
                      className="btn-press flex items-center justify-center rounded-xl
                                 bg-zinc-950/50 hover:bg-white/[0.08] border border-white/[0.08]
                                 text-stone-400 hover:text-stone-200 transition-all py-2.5 sm:py-3"
                    >
                      <Delete className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>

                  {/* Sign In Submit Button */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-gold w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl
                               flex items-center justify-center gap-2
                               text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{isVerifying ? 'Authenticating...' : 'Sign In to Terminal'}</span>
                  </button>

                  <p className="mt-4 text-center font-mono text-[9px] sm:text-[10px] text-stone-500 tracking-wider flex items-center justify-center gap-1.5">
                    <Lock className="h-3 w-3 text-stone-600" />
                    Encrypted Terminal Access · Station {TERMINAL_ID}
                  </p>
                </form>
              ) : (
                /* Step 2: Float */
                <div className="animate-fade-in">
                  <div className="flex items-center gap-3 p-3 rounded-xl sm:rounded-2xl bg-amber-500/[0.08] border border-gold/25 mb-4 sm:mb-6">
                    <div className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-amber-300 shrink-0 font-serif font-bold text-xs">
                      {authenticatedUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-200 truncate">
                        Authenticated: <span className="text-gold-light">{authenticatedUser?.name}</span>
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-mono tracking-wider text-stone-400">
                        {authenticatedUser?.role === 'ADMIN' ? 'Master Admin · Full Access' : `${authenticatedUser?.role} · Register Staff`}
                      </p>
                    </div>
                  </div>

                  {/* Float display */}
                  <div className="text-center mb-4 sm:mb-6">
                    <label className="block text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase text-stone-400 mb-2">
                      Opening Register Float Balance
                    </label>
                    <div className="relative py-3 sm:py-4 px-3 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-gold/30 shadow-inner">
                      <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-wider text-gold-light drop-shadow-sm">
                        {money(openingFloat)}
                      </div>
                      <p className="text-[9px] sm:text-[10px] font-mono text-stone-400 mt-1 tracking-widest uppercase">
                        Cash in drawer at shift start
                      </p>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="mb-4 sm:mb-6">
                    <span className="block text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-stone-400 mb-2 text-center">
                      Quick Denomination Presets
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      {[1000, 2000, 5000, 10000].map((amount) => {
                        const isSelected = openingFloat === amount * 100
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => handlePresetFloat(amount)}
                            className={`btn-press py-2 px-1 rounded-lg sm:rounded-xl
                                        text-[10px] sm:text-xs font-mono font-semibold border transition-all
                                        ${isSelected
                                          ? 'bg-amber-500/20 border-gold text-gold-light shadow-glow-gold'
                                          : 'bg-zinc-950/40 border-white/[0.07] text-stone-300 hover:border-gold/30 hover:bg-zinc-900/40'
                                        }`}
                          >
                            ₱{amount.toLocaleString()}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-2.5 sm:mt-3 flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-mono text-stone-400 shrink-0">Custom ₱</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customFloatInput}
                        onChange={handleCustomFloatChange}
                        className="flex-1 min-w-0 bg-zinc-950/50 border border-white/[0.08] focus:border-gold
                                   rounded-lg sm:rounded-xl px-3 py-1.5
                                   text-[10px] sm:text-xs font-mono text-stone-200 focus:outline-none"
                        placeholder="Enter custom starting float..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={handleConfirmSession}
                      className="btn-gold w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl
                                 flex items-center justify-center gap-2
                                 text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold"
                    >
                      <span>Confirm &amp; Open Register</span>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="w-full py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-mono tracking-wider
                                 text-stone-400 hover:text-stone-200 transition-colors uppercase text-center
                                 flex items-center justify-center gap-1.5"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Switch Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer terminal info */}
          <p className="mt-4 sm:mt-5 font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-stone-600
                        flex items-center gap-2 text-center">
            <Clock className="h-3 w-3" />
            Terminal {TERMINAL_ID} · Private session · {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>

          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-stone-500">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-gold-light transition-colors underline decoration-stone-700">Privacy Policy</a>
            <span>•</span>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-gold-light transition-colors underline decoration-stone-700">Terms of Service</a>
          </div>
        </main>
      </div>
    </div>
  )
}