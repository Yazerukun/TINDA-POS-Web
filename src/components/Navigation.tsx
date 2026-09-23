import React from 'react'
import {
  ShoppingBag,
  Package,
  BarChart3,
  Users,
  Settings,
  LogOut
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
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'pos', label: 'Counter', icon: ShoppingBag, badge: cartCount },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'customers', label: 'Clients', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const cashierInitials = cashierName
    ? cashierName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'MA'

  return (
    <>
      {/* ── DESKTOP & TABLET VERTICAL SIDEBAR (md:flex) ── */}
      <aside className="hidden md:flex flex-col w-60 xl:w-64 h-screen sticky top-0 shrink-0 bg-[#090A0D] border-r border-white/10 p-4 justify-between z-30 transition-all select-none">
        {/* Brand & Logo Header */}
        <div>
          <div className="flex items-center gap-3 px-2 py-3 border-b border-white/[0.08]">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-200/20 via-gold/15 to-transparent border border-gold/40 shadow-glow-gold shrink-0">
              <span className="font-serif text-lg font-bold tracking-widest text-gold-light">T</span>
              <div className="absolute -inset-0.5 rounded-xl bg-gold/10 blur-[4px] -z-10" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-serif text-base font-bold tracking-[0.2em] text-stone-100 uppercase truncate">
                TINDA
              </p>
              <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-gold-muted font-medium truncate">
                BUSINESS POS
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`btn-press w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs tracking-wider uppercase font-medium transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-amber-500/10 text-[#D4AF37] border border-[#D4AF37]/35 shadow-glow-gold font-bold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-inherit" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D4AF37] text-black shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer: User Profile & Log Out */}
        <div className="space-y-3 pt-4 border-t border-white/[0.08]">
          {/* Staff Info Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-[#D4AF37] text-obsidian-950 text-xs font-serif font-bold shadow-sm">
              {cashierInitials}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-semibold text-stone-200 truncate leading-tight">
                {cashierName}
              </span>
              <span className="text-[10px] text-stone-500 font-mono truncate leading-tight mt-0.5">
                {cashierRole}
              </span>
            </div>
          </div>

          {/* Full Log Out Button */}
          <button
            onClick={onLockTerminal}
            title="Log Out Terminal"
            className="btn-press w-full py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="tracking-wider uppercase text-[11px] font-bold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR (md:hidden) ── */}
      <header className="md:hidden sticky top-0 z-40 h-14 w-full flex items-center justify-between px-4 bg-[#090A0D]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-base tracking-[0.2em] uppercase text-stone-100">
            TINDA
          </span>
          <span className="text-[9px] tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded-full uppercase font-mono">
            POS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-900/60 border border-white/5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-[#D4AF37] text-black text-[10px] font-serif font-bold">
              {cashierInitials}
            </div>
            <span className="text-[11px] text-stone-300 font-medium truncate max-w-[80px]">
              {cashierName.split(' ')[0]}
            </span>
          </div>

          <button
            onClick={onLockTerminal}
            title="Log Out"
            className="btn-press flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── MOBILE BOTTOM BAR (md:hidden) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 px-2 py-2 bg-[#090A0D]/95 backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'text-[#D4AF37] font-semibold' : 'text-stone-400'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[8px] font-mono font-bold bg-[#D4AF37] text-black">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[64px] tracking-wider uppercase text-[9px]">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
