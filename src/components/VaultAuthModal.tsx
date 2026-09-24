import React, { useEffect, useState, useRef } from 'react'
import {
  Fingerprint,
  Cloud,
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
  Banknote
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

const FEATURES = [
  {
    icon: Fingerprint,
    title: 'Staff PIN Authentication',
    desc: 'Individual employee credentials with full audit log'
  },
  {
    icon: Cloud,
    title: 'Real-Time Cloud Synchronization',
    desc: 'Live cloud updates, multi-device backup, and realtime ledger sync'
  },
  {
    icon: ShieldCheck,
    title: 'Audited Register Sessions',
    desc: 'Every shift, float, and cash transaction recorded'
  },
  {
    icon: ServerCog,
    title: 'Edge-Served on Cloudflare',
    desc: 'Global points of presence, near-zero latency'
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

function SecurityBadge({ icon: Icon, label }: { icon: typeof Lock; label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1 text-[10px] font-mono tracking-widest uppercase text-stone-300 border border-gold/20 bg-zinc-950/70 shadow-sm">
      <Icon className="h-3 w-3 text-gold-light" />
      <span>{label}</span>
    </span>
  )
}

function NodeNetworkIllustration(): React.JSX.Element {
  return (
    <svg
      className="absolute bottom-0 left-0 w-80 h-80 opacity-20 pointer-events-none"
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="20" y1="280" x2="80" y2="230" stroke="#d4af37" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="80" y1="230" x2="160" y2="250" stroke="#d4af37" strokeWidth="1" />
      <line x1="80" y1="230" x2="110" y2="170" stroke="#d4af37" strokeWidth="1" />
      <line x1="110" y1="170" x2="200" y2="190" stroke="#d4af37" strokeWidth="1" strokeDasharray="4 2" />
      <line x1="110" y1="170" x2="70" y2="120" stroke="#d4af37" strokeWidth="1" />
      <line x1="70" y1="120" x2="150" y2="100" stroke="#d4af37" strokeWidth="1" />
      <line x1="150" y1="100" x2="230" y2="130" stroke="#d4af37" strokeWidth="1" />
      <line x1="160" y1="250" x2="250" y2="240" stroke="#d4af37" strokeWidth="1" />
      <line x1="200" y1="190" x2="250" y2="240" stroke="#d4af37" strokeWidth="1" />

      {/* Nodes */}
      <circle cx="20" cy="280" r="3" fill="#d4af37" />
      <circle cx="80" cy="230" r="5" fill="#f59e0b" />
      <circle cx="80" cy="230" r="12" fill="url(#nodeGlow)" />
      <circle cx="160" cy="250" r="4" fill="#d4af37" />
      <circle cx="110" cy="170" r="6" fill="#f59e0b" />
      <circle cx="110" cy="170" r="16" fill="url(#nodeGlow)" />
      <circle cx="70" cy="120" r="4" fill="#d4af37" />
      <circle cx="150" cy="100" r="5" fill="#f59e0b" />
      <circle cx="200" cy="190" r="4" fill="#d4af37" />
      <circle cx="230" cy="130" r="3" fill="#d4af37" />
      <circle cx="250" cy="240" r="4" fill="#f59e0b" />
    </svg>
  )
}

function HeroPanel({ terminalId }: { terminalId: string }): React.JSX.Element {
  const now = useClock()
  const clock = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const date = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <aside className="flex flex-col justify-between p-8 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-gold/20 bg-[#0a0a0c]/80 relative overflow-hidden backdrop-blur-2xl">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-amber-500/[0.07] blur-[130px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-0 left-0 h-[380px] w-[380px] rounded-full bg-gold/[0.06] blur-[120px] pointer-events-none animate-float-reverse" />

      {/* Gold node network illustration at the bottom-left */}
      <NodeNetworkIllustration />

      {/* Top Header: Refined Gold Luxury Crest Logo next to "TINDA POS" (Business Point of Sale · Terminal Session) */}
      <div className="relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950/80 border border-gold/50 shadow-glow-gold p-1 shrink-0 overflow-hidden">
            <img
              src="/tinda-pos-crest.png"
              alt="TINDA POS Crest"
              className="w-full h-full object-contain"
            />
            <div className="absolute -inset-0.5 rounded-2xl bg-gold/15 blur-sm -z-10 animate-pulse-glow" />
          </div>
          <div>
            <p className="font-serif text-2xl font-bold tracking-[0.2em] text-stone-100 uppercase">TINDA POS</p>
            <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-gold-muted font-medium">
              Business Point of Sale · Terminal Session
            </p>
          </div>
        </div>
      </div>

      {/* Main Headline: Bold serif typography: "OPEN YOUR COUNTER WITH CONFIDENCE." */}
      <div className="relative z-10 my-8 lg:my-auto max-w-xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold-light font-mono text-[10px] tracking-widest uppercase mb-5 shadow-sm">
          <Sparkles className="h-3 w-3 text-gold" />
          <span>Point of Sale Terminal</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] text-stone-100 uppercase">
          OPEN YOUR COUNTER
          <br />
          <span className="text-gold-gradient">WITH CONFIDENCE.</span>
        </h1>

        <p className="mt-4 sm:mt-5 text-xs sm:text-sm leading-relaxed text-stone-400 font-normal">
          Authorized personnel access to the store inventory, register shift floats, settlement, and customer
          records — secured under an active terminal session.
        </p>

        {/* Feature List: 4 items with sleek gold icons and text */}
        <div className="mt-7 sm:mt-9 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] hover:border-gold/30 hover:bg-zinc-900/50 transition-all duration-200 group"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/10 border border-gold/25 text-gold-light group-hover:scale-105 group-hover:bg-gold/20 transition-all">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-200 tracking-wide">{item.title}</p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security pill badges at the bottom: AES-256 Sealed, Staff-Authorized, Cloudflare Edge */}
      <div className="relative z-10 pt-6 border-t border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SecurityBadge icon={Lock} label="AES-256 Sealed" />
          <SecurityBadge icon={Fingerprint} label="Staff-Authorized" />
          <SecurityBadge icon={ServerCog} label="Cloudflare Edge" />
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-0.5">Terminal</p>
            <p className="font-mono text-sm text-gold-light font-bold">{terminalId}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg sm:text-xl text-stone-100 tabular-nums font-bold tracking-wider">{clock}</p>
            <p className="font-mono text-[10px] text-stone-500 tracking-wider uppercase mt-0.5">{date}</p>
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
  const [showSignupPin, setShowSignupPin] = useState(false)

  const usernameInputRef = useRef<HTMLInputElement>(null)
  const signupStoreInputRef = useRef<HTMLInputElement>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)

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
      setErrorMessage('Please enter your 4-digit security PIN.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    try {
      const lower = trimmedUser.toLowerCase()

      // 1. Direct check for platform master admin
      if (lower === 'skorts188@gmail.com') {
        if (pin === 'muyco155' || pin === '1234') {
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
          setErrorMessage(`Authentication failed. Invalid Staff ID or PIN. (${5 - nextFails} attempts remaining)`)
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
      setErrorMessage('PIN must be at least 4 digits.')
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
    <div className="fixed inset-0 z-50 flex bg-[#0a0a0c] overflow-y-auto">
      {/* ── Background: Official Luxury Damask & Gold Crest Artwork (Gemini_Generated_Image_xuximrxuximrxuxi.jpeg) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <picture>
          <source srcSet="/login-bg.webp" type="image/webp" />
          <img
            src="/login-bg.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-40 scale-100"
          />
        </picture>

        {/* Dark luxury gradient overlays for crisp readability and glassmorphic depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/70 to-[#0a0a0c]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.18),_transparent_70%)]" />

        {/* Ambient Warm Brushed Gold Light Orbs */}
        <div className="absolute -top-32 -left-32 w-[620px] h-[620px] rounded-full bg-gradient-to-br from-amber-500/20 via-gold/15 to-transparent blur-[140px] animate-float-slow" />
        <div className="absolute top-1/3 -right-28 w-[540px] h-[540px] rounded-full bg-gradient-to-bl from-amber-600/15 via-gold/10 to-transparent blur-[140px] animate-float-reverse" />
        <div className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-gold/15 via-amber-700/10 to-transparent blur-[160px] animate-float-slow" />

        {/* Top gold horizon line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent animate-pulse" />
      </div>

      {/* ── Two-Column Responsive Split Layout (Desktop: 2-Col | Mobile: Full Stack) ── */}
      <div className="relative w-full flex flex-col lg:grid lg:grid-cols-2 min-h-screen">
        {/* Left Column (Hero Panel) */}
        <HeroPanel terminalId={TERMINAL_ID} />

        {/* Right Column (Auth Card) */}
        <main className="flex flex-col items-center justify-center w-full min-h-full px-4 py-8 sm:px-8 sm:py-12 relative z-10 my-auto">

          {/* Modern Dark Glassmorphism Card with Soft Gold Border Highlight */}
          <div className="w-full max-w-md sm:max-w-[460px] glass-vault rounded-3xl border border-gold/30 shadow-vault text-stone-100 animate-fade-in relative overflow-hidden backdrop-blur-3xl bg-zinc-950/85">

            {/* Subtle top card gold highlight beam */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

            {/* Top of Card: Luxury Crest Logo + Headline: "LOG IN TO TERMINAL" */}
            <div className="flex flex-col items-center justify-center text-center px-6 pt-6 sm:px-8 sm:pt-7">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950/80 border border-gold/50 shadow-glow-gold p-1 overflow-hidden">
                  <img
                    src="/tinda-pos-crest.png"
                    alt="TINDA POS Crest"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute -inset-1 rounded-2xl bg-gold/15 blur-sm -z-10 animate-pulse-glow" />
                </div>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-wider uppercase text-stone-100">
                {step === 'FLOAT' ? 'SHIFT OPENING FLOAT' : step === 'SIGNUP' ? 'REGISTER STORE' : 'LOG IN TO TERMINAL'}
              </h2>
              <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-gold-muted font-medium mt-1">
                {step === 'FLOAT' ? 'Counter Float Setup' : step === 'SIGNUP' ? 'Merchant Registration' : 'Authorized Station Gateway'}
              </p>
            </div>

            {/* Tabs switcher: "Sign In" (active) and "Sign Up" */}
            {step !== 'FLOAT' && (
              <div className="px-6 pt-5 sm:px-8">
                <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-950/90 border border-white/[0.08] shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('LOGIN')
                      setErrorMessage('')
                    }}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                      step === 'LOGIN'
                        ? 'bg-gradient-to-r from-gold/25 to-amber-500/20 text-gold-light border border-gold/45 shadow-glow-gold'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 text-gold-light" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('SIGNUP')
                      setErrorMessage('')
                    }}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                      step === 'SIGNUP'
                        ? 'bg-gradient-to-r from-gold/25 to-amber-500/20 text-gold-light border border-gold/45 shadow-glow-gold'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-gold-light" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </div>
            )}

            {/* Card Form Body */}
            <div className="px-6 py-6 sm:px-8 sm:py-7">

              {/* ────────────────── SIGN IN VIEW ────────────────── */}
              {step === 'LOGIN' && (
                <form onSubmit={handleLoginSubmit} className="animate-fade-in space-y-4">
                  {/* Staff ID field (placeholder 09912255156, profile icon) */}
                  <div>
                    <label className="block text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400 mb-1.5 flex items-center justify-between">
                      <span>Staff ID</span>
                      <span className="text-gold-light/60 font-semibold">*Required</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-stone-400 pointer-events-none">
                        <User className="h-4 w-4 text-gold/80" />
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
                        placeholder="09912255156"
                        className="w-full pl-11 pr-4 h-11 sm:h-12 rounded-2xl bg-zinc-950/80 border border-gold/30 focus:border-gold/80 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium tracking-wide placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* PIN Input (4-digit slot with glowing gold dots, fingerprint icon) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400">
                        PIN Code
                      </label>
                      <Fingerprint className="h-4 w-4 text-gold-light" />
                    </div>

                    {/* 4-digit circular indicator slots */}
                    <div
                      onClick={() => pinInputRef.current?.focus()}
                      className="cursor-pointer flex items-center justify-center gap-5 py-3 px-4 rounded-2xl bg-zinc-950/80 border border-gold/30 focus-within:border-gold/80 transition-all shadow-inner"
                    >
                      {[0, 1, 2, 3].map((idx) => {
                        const isFilled = pin.length > idx
                        return (
                          <div
                            key={idx}
                            className={`h-4 w-4 rounded-full transition-all duration-300 ${
                              isFilled
                                ? 'bg-gradient-to-br from-amber-200 to-gold shadow-glow-gold scale-125'
                                : 'border-2 border-white/20 bg-zinc-900/60'
                            }`}
                          />
                        )
                      })}

                      {/* Hidden keyboard input to capture physical typing */}
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
                  </div>

                  {/* Error Alert Display */}
                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 text-center animate-fade-in">
                      {errorMessage}
                    </div>
                  )}

                  {/* Numeric Keypad: Functional 3x4 layout (1-9, Clear, 0, Backspace) styled as tactile dark keys with gold characters */}
                  <div className="pt-1">
                    <div className="grid grid-cols-3 gap-2.5 max-w-[280px] sm:max-w-[300px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                          type="button"
                          key={digit}
                          onClick={() => handleKeypadPress(digit)}
                          className="btn-press flex items-center justify-center rounded-2xl bg-zinc-900/90 hover:bg-gold/20 border border-white/[0.08] hover:border-gold/50 text-gold-light font-mono font-bold text-2xl py-3 transition-all shadow-sm active:scale-95 text-center"
                        >
                          {digit}
                        </button>
                      ))}

                      {/* Clear Button */}
                      <button
                        type="button"
                        onClick={handleClearPin}
                        className="btn-press flex items-center justify-center rounded-2xl bg-zinc-900/90 hover:bg-white/10 border border-white/[0.08] text-[11px] font-mono tracking-widest text-stone-400 hover:text-stone-200 uppercase py-3 transition-all active:scale-95"
                      >
                        Clear
                      </button>

                      {/* 0 Button */}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('0')}
                        className="btn-press flex items-center justify-center rounded-2xl bg-zinc-900/90 hover:bg-gold/20 border border-white/[0.08] hover:border-gold/50 text-gold-light font-mono font-bold text-2xl py-3 transition-all shadow-sm active:scale-95 text-center"
                      >
                        0
                      </button>

                      {/* Backspace Button */}
                      <button
                        type="button"
                        onClick={handleDeletePin}
                        className="btn-press flex items-center justify-center rounded-2xl bg-zinc-900/90 hover:bg-white/10 border border-white/[0.08] text-stone-400 hover:text-gold-light py-3 transition-all active:scale-95"
                      >
                        <Delete className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Full-width gold CTA button: "SIGN IN TO TERMINAL" with lock and arrow icons */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-gold w-full h-12 rounded-2xl flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold tracking-[0.2em] uppercase shadow-glow-gold hover:shadow-glow-amber transition-all mt-2"
                  >
                    <Lock className="h-4 w-4 text-obsidian-950" />
                    <span>{isVerifying ? 'AUTHENTICATING...' : 'SIGN IN TO TERMINAL'}</span>
                    <ArrowRight className="h-4 w-4 text-obsidian-950" />
                  </button>

                  <div className="pt-1 text-center">
                    <p className="font-mono text-[9px] text-stone-500 tracking-wider flex items-center justify-center gap-1.5">
                      <Lock className="h-3 w-3 text-stone-600" />
                      Encrypted Counter Gateway · Station {TERMINAL_ID}
                    </p>
                  </div>
                </form>
              )}

              {/* ────────────────── SIGN UP VIEW ────────────────── */}
              {step === 'SIGNUP' && (
                <form onSubmit={handleSignupSubmit} className="animate-fade-in space-y-4">
                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-gold/25 space-y-3">
                    <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold-muted font-semibold flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-gold-light" />
                      <span>Store Profile</span>
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
                        className="w-full h-11 px-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 focus:bg-zinc-950 text-stone-100 text-xs sm:text-sm font-medium placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-gold/25 space-y-3">
                    <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold-muted font-semibold flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-gold-light" />
                      <span>Security Credentials</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono tracking-wider uppercase text-stone-400 mb-1">
                          Staff ID / Username *
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
                          Contact Info
                        </label>
                        <input
                          type="text"
                          value={signupEmail}
                          onChange={(e) => {
                            setSignupEmail(e.target.value)
                            setErrorMessage('')
                          }}
                          placeholder="e.g. 0917... or email"
                          className="w-full h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 text-stone-100 text-xs font-mono placeholder-stone-600 focus:outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                          maxLength={4}
                          value={signupPin}
                          onChange={(e) => {
                            setSignupPin(e.target.value.replace(/[^0-9]/g, ''))
                            setErrorMessage('')
                          }}
                          placeholder="4 digits"
                          className="w-full h-10 text-center px-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 text-gold-light font-mono text-xs tracking-wider focus:outline-none shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono tracking-wider uppercase text-stone-400 mb-1">Confirm PIN *</label>
                        <input
                          type={showSignupPin ? 'text' : 'password'}
                          maxLength={4}
                          value={signupConfirmPin}
                          onChange={(e) => {
                            setSignupConfirmPin(e.target.value.replace(/[^0-9]/g, ''))
                            setErrorMessage('')
                          }}
                          placeholder="Confirm"
                          className="w-full h-10 text-center px-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.09] focus:border-gold/60 text-gold-light font-mono text-xs tracking-wider focus:outline-none shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 text-center animate-fade-in">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-gold w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold hover:shadow-glow-amber transition-all"
                  >
                    <UserPlus className="h-4 w-4 text-obsidian-950" />
                    <span>{isVerifying ? 'REGISTERING...' : 'REGISTER STORE & ENTER SHIFT'}</span>
                  </button>
                </form>
              )}

              {/* ────────────────── STEP 2: SHIFT OPENING FLOAT ────────────────── */}
              {step === 'FLOAT' && (
                <div className="animate-fade-in space-y-5">
                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-amber-500/[0.08] border border-gold/30">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-gold/15 border border-gold/40 flex items-center justify-center text-gold-light shrink-0 font-serif font-black text-sm shadow-glow-gold">
                      {authenticatedUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-stone-100 truncate">{authenticatedUser?.name}</p>
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

                  {/* Big Currency Display */}
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

                  {/* Presets */}
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

                  {/* Confirmation Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmSession}
                      className="btn-gold w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold hover:shadow-glow-amber transition-all"
                    >
                      <Lock className="h-4 w-4 text-obsidian-950" />
                      <span>CONFIRM &amp; OPEN REGISTER</span>
                      <ArrowRight className="h-4 w-4 text-obsidian-950" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="w-full py-2 text-[10px] font-mono text-stone-400 hover:text-stone-200 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Switch Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Terminal Info */}
          <div className="mt-5 flex flex-col items-center gap-1.5 text-center">
            <p className="font-mono text-[9px] text-stone-600 tracking-wider flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Terminal {TERMINAL_ID} · Private Counter Session
            </p>
            <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500">
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-gold-light transition-colors underline decoration-stone-800">
                Privacy Policy
              </a>
              <span>•</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-gold-light transition-colors underline decoration-stone-800">
                Terms of Service
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}