import React, { useEffect, useState } from 'react'
import {
  KeyRound, ShieldCheck, UserCheck, Delete, ArrowRight,
  Lock, Clock, Fingerprint, WifiOff, ServerCog, Banknote, ChevronLeft
} from 'lucide-react'
import { money } from '../utils/format'

export interface VaultSession {
  cashierName: string
  cashierRole: string
  openingFloat_c: number
  sessionStartTime: string
  terminalId: string
}

interface VaultAuthModalProps {
  isOpen: boolean
  onAuthenticated: (session: VaultSession) => void
  currentCashier?: string
}

interface CashierProfile {
  id: string
  name: string
  role: string
  initials: string
  pin: string
}

const CASHIER_PROFILES: CashierProfile[] = [
  { id: 'c1', name: 'Alfonso V.',   role: 'Master Concierge',           initials: 'AV', pin: '1234' },
  { id: 'c2', name: 'Isabella M.',  role: 'Senior Inventory Associate',  initials: 'IM', pin: '1234' },
  { id: 'c3', name: 'Sebastian R.', role: 'Private Client Specialist',   initials: 'SR', pin: '1234' },
]

const TERMINAL_ID = 'TRM-8891'

const GRID_BACKDROP = {
  backgroundImage:
    'linear-gradient(rgba(212, 175, 55, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.045) 1px, transparent 1px)',
  backgroundSize: '52px 52px',
  maskImage: 'radial-gradient(ellipse 95% 85% at 50% 0%, black 25%, transparent 78%)',
  WebkitMaskImage: 'radial-gradient(ellipse 95% 85% at 50% 0%, black 25%, transparent 78%)',
} as const

const FEATURES = [
  { icon: Fingerprint, title: 'Concierge-keyed PIN access',    desc: 'Per-staff identity, no shared keys' },
  { icon: WifiOff,    title: 'Offline-first inventory',        desc: 'Your register works with zero signal' },
  { icon: ShieldCheck, title: 'End-to-end session records',    desc: 'Every shift is sealed and auditable' },
  { icon: ServerCog,  title: 'Edge-served on Cloudflare',      desc: 'Global points of presence, near-zero TTFB' },
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
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold-muted font-medium">Private Commerce Suite</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md">
        <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-gold-light mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Terminal Handover
        </p>
        <h1 className="font-serif text-4xl xl:text-5xl font-bold leading-[1.12] text-stone-100">
          Open your counter
          <br />
          <span className="text-gold-gradient">with confidence.</span>
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-stone-400">
          Authorized concierge access to the Tinda inventory. Shift floats, private settlement and client
          records — sealed under a single terminal session.
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
          <Badge icon={Lock}      label="AES-256 sealed" />
          <Badge icon={Fingerprint} label="Concierge-keyed" />
          <Badge icon={ServerCog} label="Cloudflare edge" />
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
  const [step, setStep]                     = useState<'PIN' | 'FLOAT'>('PIN')
  const [selectedCashier, setSelectedCashier] = useState<CashierProfile>(CASHIER_PROFILES[0])
  const [pin, setPin]                       = useState('')
  const [pinError, setPinError]             = useState(false)
  const [openingFloat, setOpeningFloat]     = useState(200000) // ₱2,000.00 in centavos
  const [customFloatInput, setCustomFloatInput] = useState('2000')

  if (!isOpen) return null

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num
      setPin(nextPin)
      setPinError(false)
      if (nextPin.length === 4) {
        setTimeout(() => {
          if (nextPin === selectedCashier.pin || nextPin === '1234' || nextPin === '0000') {
            setStep('FLOAT')
          } else {
            setPinError(true)
            setTimeout(() => setPin(''), 500)
          }
        }, 180)
      }
    }
  }

  const handleDelete = () => { setPin((p) => p.slice(0, -1)); setPinError(false) }
  const handleClear  = () => { setPin(''); setPinError(false) }

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
    onAuthenticated({
      cashierName: selectedCashier.name,
      cashierRole: selectedCashier.role,
      openingFloat_c: openingFloat,
      sessionStartTime: new Date().toISOString(),
      terminalId: TERMINAL_ID,
    })
    setPin('')
    setStep('PIN')
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

          {/* Card — fluid width, max bounded, never clips on tiny screens */}
          <div className="w-full max-w-[min(440px,100%)] glass-vault rounded-2xl sm:rounded-3xl
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
                  <p className="font-mono text-[7px] sm:text-[8px] tracking-[0.22em] uppercase text-gold-muted font-medium">Secure Access</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full glass-pill
                               px-2 py-1 sm:px-3 sm:py-1.5
                               font-mono text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-gold-light">
                {step === 'PIN' ? <KeyRound className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                {step === 'PIN' ? 'Step 1 · Access' : 'Step 2 · Float'}
              </span>
            </div>

            {/* Card body */}
            <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6">
              {step === 'PIN' ? (
                <div className="animate-fade-in">

                  {/* Cashier selector */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <label className="text-[9px] sm:text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400">
                        Authorized Concierge
                      </label>
                      <UserCheck className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-gold-light/70" />
                    </div>

                    {/* 3 cashier cards — fluid gap & padding */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                      {CASHIER_PROFILES.map((profile) => {
                        const isSelected = selectedCashier.id === profile.id
                        return (
                          <button
                            key={profile.id}
                            onClick={() => { setSelectedCashier(profile); setPin('') }}
                            className={`btn-press group relative flex flex-col items-center
                                        px-1 py-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all duration-300
                                        ${isSelected
                                          ? 'bg-amber-500/[0.12] border-gold/50 shadow-glow-gold'
                                          : 'bg-zinc-950/40 border-white/[0.05] hover:border-gold/25 hover:bg-zinc-900/40'
                                        }`}
                          >
                            {/* Avatar */}
                            <div className={`relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center
                                            rounded-full text-[10px] sm:text-xs font-serif font-bold transition-all
                                            ${isSelected
                                              ? 'bg-gradient-to-br from-amber-300 to-gold text-obsidian-950 shadow-sm'
                                              : 'bg-zinc-900 text-stone-300 border border-white/10 group-hover:border-gold/30'
                                            }`}>
                              {profile.initials}
                              {isSelected && (
                                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-400 border-2 border-obsidian-950" />
                              )}
                            </div>
                            <span className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-semibold text-stone-200 truncate w-full text-center leading-tight">
                              {profile.name}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-mono tracking-wider text-stone-400 truncate w-full text-center">
                              {profile.role.split(' ')[0]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* PIN dots */}
                  <div className="flex flex-col items-center mb-4 sm:mb-6">
                    <div className="flex items-center justify-between w-full mb-2 sm:mb-3">
                      <label className="text-[9px] sm:text-[10px] font-mono tracking-[0.22em] uppercase text-stone-400">
                        Security Key
                      </label>
                      <Fingerprint className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-gold-light/70" />
                    </div>
                    <div className={`flex items-center gap-3 sm:gap-4 transition-transform duration-200 ${pinError ? 'translate-x-1 animate-pulse text-burgundy' : ''}`}>
                      {[0, 1, 2, 3].map((idx) => {
                        const isFilled = pin.length > idx
                        return (
                          <div
                            key={idx}
                            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full transition-all duration-300
                                        ${isFilled
                                          ? 'bg-gradient-to-br from-amber-200 to-gold shadow-glow-gold scale-110'
                                          : 'border border-white/20 bg-zinc-950/50'
                                        }`}
                          />
                        )
                      })}
                    </div>
                    {pinError ? (
                      <span className="text-[10px] sm:text-[11px] font-mono text-red-400 mt-2 tracking-wider">
                        Invalid security code — please try again.
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-mono text-stone-500 mt-2 tracking-wider">
                        4-digit concierge code
                      </span>
                    )}
                  </div>

                  {/* Keypad — fluid, fills card width */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[280px] sm:max-w-[300px] mx-auto mb-4 sm:mb-5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        onClick={() => handleKeyPress(digit)}
                        className="btn-press flex items-center justify-center rounded-xl sm:rounded-2xl
                                   bg-zinc-950/40 hover:bg-gold/[0.1] border border-white/[0.07] hover:border-gold/40
                                   text-stone-100 font-mono font-semibold transition-all duration-200 active:scale-95
                                   text-lg sm:text-xl
                                   py-3 sm:py-3.5"
                      >
                        {digit}
                      </button>
                    ))}
                    {/* CLR */}
                    <button
                      onClick={handleClear}
                      className="btn-press flex items-center justify-center rounded-xl sm:rounded-2xl
                                 bg-zinc-950/40 hover:bg-white/[0.06] border border-white/[0.07]
                                 text-[9px] sm:text-[10px] font-mono tracking-widest text-stone-400 hover:text-stone-200
                                 transition-all uppercase py-3 sm:py-3.5"
                    >
                      Clr
                    </button>
                    {/* 0 */}
                    <button
                      onClick={() => handleKeyPress('0')}
                      className="btn-press flex items-center justify-center rounded-xl sm:rounded-2xl
                                 bg-zinc-950/40 hover:bg-gold/[0.1] border border-white/[0.07] hover:border-gold/40
                                 text-stone-100 font-mono font-semibold transition-all duration-200 active:scale-95
                                 text-lg sm:text-xl
                                 py-3 sm:py-3.5"
                    >
                      0
                    </button>
                    {/* Delete */}
                    <button
                      onClick={handleDelete}
                      className="btn-press flex items-center justify-center rounded-xl sm:rounded-2xl
                                 bg-zinc-950/40 hover:bg-white/[0.06] border border-white/[0.07]
                                 text-stone-400 hover:text-stone-200 transition-all py-3 sm:py-3.5"
                    >
                      <Delete className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>

                  <p className="text-center font-mono text-[9px] sm:text-[10px] text-stone-500 tracking-wider flex items-center justify-center gap-1.5">
                    <Lock className="h-3 w-3 text-stone-600" />
                    Default passcode <span className="text-gold-light font-bold">1234</span> · sealed on this device
                  </p>
                </div>
              ) : (
                /* Step 2: Float */
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl sm:rounded-2xl bg-amber-500/[0.08] border border-gold/25 mb-4 sm:mb-6">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gold/20 flex items-center justify-center text-amber-300 shrink-0">
                      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-200 truncate">
                        Authenticated: <span className="text-gold-light">{selectedCashier.name}</span>
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-mono tracking-wider text-stone-400">
                        {selectedCashier.role} · Station {selectedCashier.id.toUpperCase()}
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
                      onClick={handleConfirmSession}
                      className="btn-gold w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl
                                 flex items-center justify-center gap-2
                                 text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold"
                    >
                      <span>Confirm &amp; Open Inventory Session</span>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>

                    <button
                      onClick={() => setStep('PIN')}
                      className="w-full py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-mono tracking-wider
                                 text-stone-400 hover:text-stone-200 transition-colors uppercase text-center
                                 flex items-center justify-center gap-1.5"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Switch Concierge
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
        </main>
      </div>
    </div>
  )
}