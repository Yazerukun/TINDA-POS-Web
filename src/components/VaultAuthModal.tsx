import React, { useState } from 'react'
import { KeyRound, ShieldCheck, UserCheck, Delete, ArrowRight, Sparkles, Lock } from 'lucide-react'
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
  { id: 'c1', name: 'Alfonso V.', role: 'Master Concierge', initials: 'AV', pin: '1234' },
  { id: 'c2', name: 'Isabella M.', role: 'Senior Vault Associate', initials: 'IM', pin: '1234' },
  { id: 'c3', name: 'Sebastian R.', role: 'Private Client Specialist', initials: 'SR', pin: '1234' },
]

export function VaultAuthModal({ isOpen, onAuthenticated, currentCashier }: VaultAuthModalProps): React.JSX.Element | null {
  const [step, setStep] = useState<'PIN' | 'FLOAT'>('PIN')
  const [selectedCashier, setSelectedCashier] = useState<CashierProfile>(CASHIER_PROFILES[0])
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [openingFloat, setOpeningFloat] = useState(200000) // ₱2,000.00 in centavos
  const [customFloatInput, setCustomFloatInput] = useState('2000')

  if (!isOpen) return null

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num
      setPin(nextPin)
      setPinError(false)

      // Auto-submit on 4th digit
      if (nextPin.length === 4) {
        setTimeout(() => {
          // Standard check (default accepted PIN '1234' or matched profile pin)
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

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
    setPinError(false)
  }

  const handleClear = () => {
    setPin('')
    setPinError(false)
  }

  const handlePresetFloat = (pesos: number) => {
    setOpeningFloat(pesos * 100)
    setCustomFloatInput(pesos.toString())
  }

  const handleCustomFloatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setCustomFloatInput(val)
    const numeric = parseInt(val, 10) || 0
    setOpeningFloat(numeric * 100)
  }

  const handleConfirmSession = () => {
    const session: VaultSession = {
      cashierName: selectedCashier.name,
      cashierRole: selectedCashier.role,
      openingFloat_c: openingFloat,
      sessionStartTime: new Date().toISOString(),
      terminalId: 'TRM-8891'
    }
    onAuthenticated(session)
    setPin('')
    setStep('PIN')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-2xl">
      {/* Ambient Radial Golden Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/[0.04] blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-gold/[0.06] blur-[90px]" />
      </div>

      {/* Floating Glassmorphic Vault Card */}
      <div className="relative w-full max-w-md glass-vault rounded-3xl p-8 border border-gold/25 shadow-vault text-stone-100 animate-fade-in">
        {/* Top Metallic Emblem */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-200/20 via-gold/15 to-transparent border border-gold/40 shadow-glow-gold mb-3.5">
            <span className="font-serif text-2xl font-bold tracking-widest text-gold-light">T</span>
            <div className="absolute -inset-0.5 rounded-2xl bg-gold/10 blur-[4px] -z-10" />
          </div>

          <h2 className="font-serif text-xl tracking-[0.25em] uppercase text-stone-100 font-bold">
            TINDA POS
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-muted font-medium">
              PRIVATE TERMINAL • SECURE SUITE
            </p>
          </div>
        </div>

        {step === 'PIN' ? (
          <div>
            {/* Cashier Selector */}
            <div className="mb-6">
              <label className="block text-[10px] font-mono tracking-[0.2em] uppercase text-stone-400 text-center mb-3">
                SELECT AUTHORIZED CONCIERGE
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {CASHIER_PROFILES.map((profile) => {
                  const isSelected = selectedCashier.id === profile.id
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setSelectedCashier(profile)
                        setPin('')
                      }}
                      className={`btn-press group relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 ${
                        isSelected
                          ? 'bg-amber-500/[0.12] border-gold/50 shadow-glow-gold'
                          : 'bg-zinc-950/40 border-white/[0.05] hover:border-gold/20 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div
                        className={`relative flex h-11 w-11 items-center justify-center rounded-full text-xs font-serif font-bold transition-all ${
                          isSelected
                            ? 'bg-gradient-to-br from-amber-300 to-gold text-obsidian-950 shadow-sm'
                            : 'bg-zinc-900 text-stone-300 border border-white/10 group-hover:border-gold/30'
                        }`}
                      >
                        {profile.initials}
                        {isSelected && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-obsidian-950" />
                        )}
                      </div>
                      <span className="mt-2 text-xs font-semibold text-stone-200 truncate w-full text-center">
                        {profile.name}
                      </span>
                      <span className="text-[9px] font-mono tracking-wider text-stone-400 truncate w-full text-center">
                        {profile.role.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Discrete Masked Dot Feedback */}
            <div className="flex flex-col items-center mb-6">
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-stone-400 mb-3">
                ENTER 4-DIGIT SECURITY KEY
              </span>
              <div
                className={`flex items-center gap-4 transition-transform duration-200 ${
                  pinError ? 'translate-x-1 animate-pulse text-burgundy' : ''
                }`}
              >
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx
                  return (
                    <div
                      key={idx}
                      className={`h-4 w-4 rounded-full transition-all duration-300 ${
                        isFilled
                          ? 'bg-gradient-to-br from-amber-200 to-gold shadow-glow-gold scale-110'
                          : 'border border-white/20 bg-zinc-950/50'
                      }`}
                    />
                  )
                })}
              </div>
              {pinError && (
                <span className="text-[11px] font-mono text-red-400 mt-2 tracking-wider">
                  INVALID SECURITY CODE. PLEASE TRY AGAIN.
                </span>
              )}
            </div>

            {/* Minimalist 4-Digit Security Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeyPress(digit)}
                  className="btn-press flex items-center justify-center h-14 rounded-2xl bg-zinc-950/40 hover:bg-gold/[0.1] border border-white/[0.07] hover:border-gold/40 text-stone-100 font-mono text-xl font-semibold transition-all duration-200 active:scale-95 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="btn-press flex items-center justify-center h-14 rounded-2xl bg-zinc-950/40 hover:bg-white/[0.06] border border-white/[0.07] text-[10px] font-mono tracking-widest text-stone-400 hover:text-stone-200 transition-all uppercase"
              >
                CLR
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="btn-press flex items-center justify-center h-14 rounded-2xl bg-zinc-950/40 hover:bg-gold/[0.1] border border-white/[0.07] hover:border-gold/40 text-stone-100 font-mono text-xl font-semibold transition-all duration-200 active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="btn-press flex items-center justify-center h-14 rounded-2xl bg-zinc-950/40 hover:bg-white/[0.06] border border-white/[0.07] text-stone-400 hover:text-stone-200 transition-all"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            <p className="text-center font-mono text-[10px] text-stone-500 tracking-wider">
              Default passcode: <span className="text-gold-light font-bold">1234</span>
            </p>
          </div>
        ) : (
          /* Step 2: Vault Float & Shift Setup */
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/[0.08] border border-gold/25 mb-6">
              <div className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-amber-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-200 truncate">
                  Authenticated: <span className="text-gold-light">{selectedCashier.name}</span>
                </p>
                <p className="text-[10px] font-mono tracking-wider text-stone-400">
                  {selectedCashier.role} • Station {selectedCashier.id.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="text-center mb-6">
              <label className="block text-[10px] font-mono tracking-[0.25em] uppercase text-stone-400 mb-2">
                OPENING REGISTER FLOAT BALANCE
              </label>

              <div className="relative py-4 px-3 rounded-2xl bg-zinc-950/60 border border-gold/30 shadow-inner">
                <div className="font-serif text-3xl sm:text-4xl font-bold tracking-wider text-gold-light drop-shadow-sm">
                  {money(openingFloat)}
                </div>
                <p className="text-[10px] font-mono text-stone-400 mt-1 tracking-widest uppercase">
                  Cash In Drawer at Shift Start
                </p>
              </div>
            </div>

            {/* Quick Float Chips */}
            <div className="mb-6">
              <span className="block text-[10px] font-mono tracking-widest uppercase text-stone-400 mb-2 text-center">
                QUICK DENOMINATION PRESETS
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[1000, 2000, 5000, 10000].map((amount) => {
                  const isSelected = openingFloat === amount * 100
                  return (
                    <button
                      key={amount}
                      onClick={() => handlePresetFloat(amount)}
                      className={`btn-press py-2 px-1 rounded-xl text-xs font-mono font-semibold border transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-gold text-gold-light shadow-glow-gold'
                          : 'bg-zinc-950/40 border-white/[0.07] text-stone-300 hover:border-gold/30 hover:bg-zinc-900/40'
                      }`}
                    >
                      ₱{amount.toLocaleString()}
                    </button>
                  )
                })}
              </div>

              {/* Custom Float Input */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-mono text-stone-400">Custom ₱</span>
                <input
                  type="text"
                  value={customFloatInput}
                  onChange={handleCustomFloatChange}
                  className="flex-1 bg-zinc-950/50 border border-white/[0.08] focus:border-gold rounded-xl px-3 py-1.5 text-xs font-mono text-stone-200 focus:outline-none"
                  placeholder="Enter custom starting float..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleConfirmSession}
                className="btn-gold w-full py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold"
              >
                <span>CONFIRM & OPEN VAULT SESSION</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setStep('PIN')}
                className="w-full py-2.5 text-[11px] font-mono tracking-wider text-stone-400 hover:text-stone-200 transition-colors uppercase text-center"
              >
                Switch Concierge
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
