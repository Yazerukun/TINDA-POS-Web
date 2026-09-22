import React, { useState, useEffect } from 'react'
import {
  ShoppingBag,
  Package,
  BarChart3,
  Users,
  Settings,
  Lock,
  Sparkles,
  Wifi,
  ChevronDown
} from 'lucide-react'

export type ActiveTab = 'pos' | 'inventory' | 'analytics' | 'customers' | 'settings'

interface NavigationProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  cartCount: number
  cashierName: string
  cashierRole: string
  onLockTerminal: () => void
}

export function Navigation({
  activeTab,
  setActiveTab,
  cartCount,
  cashierName,
  cashierRole,
  onLockTerminal
}: NavigationProps): React.JSX.Element {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      )
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'pos', label: 'Executive Counter', icon: ShoppingBag, badge: cartCount },
    { id: 'inventory', label: 'Boutique Vault', icon: Package },
    { id: 'customers', label: 'Client Credit Accounts', icon: Users },
    { id: 'analytics', label: 'Vault Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Terminal Suite', icon: Settings },
  ]

  const cashierInitials = cashierName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 w-full bg-obsidian-950/80 backdrop-blur-2xl border-b border-white/[0.05] shadow-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between gap-4">
        {/* Left: Sleek Gold-Accented TINDA Brand + Private Reserve Badge */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200/15 via-gold/15 to-transparent border border-gold/30 shadow-glow-gold">
            <span className="font-serif text-lg font-bold tracking-widest text-gold-light">T</span>
            <div className="absolute -inset-0.5 rounded-xl bg-gold/10 blur-[3px] -z-10" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base tracking-[0.2em] uppercase text-stone-100 flex items-center gap-2">
                TINDA <span className="font-mono text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-full bg-amber-500/[0.12] text-gold-light border border-gold/30">PRIVATE RESERVE v1.0</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <span className="font-mono text-[10px] tracking-widest uppercase text-stone-500">
                OFFLINE SECURE ENCLAVE
              </span>
              <span className="text-stone-600">•</span>
              <span className="font-mono text-[11px] tracking-wider text-stone-400">{time}</span>
            </div>
          </div>
        </div>

        {/* Center: Real-Time Status Pill with Live Metallic Pulse */}
        <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-950/70 border border-white/[0.06] shadow-inner">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
          </div>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-300 font-medium">
            TERMINAL ACTIVE • CLOUD SYNC FLAWLESS
          </span>
        </div>

        {/* Center-Right: Refined Tab Navigation */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/60 border border-white/[0.05]">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`btn-press relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${
                  isActive
                    ? 'text-gold-light font-semibold bg-gold/[0.12] border border-gold/35 shadow-glow-gold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-gold' : 'text-stone-400'}`} />
                <span className="tracking-wider">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-gold text-obsidian-950' : 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Right: Active Concierge Profile Chip & Lock Terminal */}
        <div className="flex items-center gap-3">
          <div
            onClick={onLockTerminal}
            className="group flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-zinc-950/70 border border-white/[0.07] hover:border-gold/40 cursor-pointer transition-all duration-300 shadow-sm"
            title="Click to lock session or switch Concierge"
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-gold text-obsidian-950 text-[11px] font-serif font-bold shadow-sm">
              {cashierInitials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-obsidian-950" />
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-stone-200 group-hover:text-gold-light transition-colors leading-tight">
                {cashierName}
              </span>
              <span className="text-[9px] font-mono tracking-wider text-stone-400 leading-tight uppercase">
                {cashierRole}
              </span>
            </div>

            <Lock className="h-3.5 w-3.5 text-stone-500 group-hover:text-gold transition-colors ml-1" />
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-white/[0.04] px-2 py-1.5 bg-zinc-950/80">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'text-gold-light font-bold' : 'text-stone-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate max-w-[60px]">{item.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
