import React, { useState } from 'react'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Receipt,
  Truck,
  TrendingDown,
  Sparkles,
  CalendarClock,
  Menu,
  X,
  ChevronRight,
  Clock,
  Zap,
  Crown,
  ShieldCheck
} from 'lucide-react'

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'customers'
  | 'transactions'
  | 'expenses'
  | 'suppliers'
  | 'analytics'
  | 'settings'
  | 'master-control'

interface NavigationProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  cartCount: number
  lowStockCount?: number
  cashierName: string
  cashierRole: string
  onLockTerminal: () => void
  onOpenPriceGuide?: () => void
  onOpenExpiration?: () => void
  proFormattedTime?: string
  isPro?: boolean
  isMasterAdmin?: boolean
  onOpenProModal?: () => void
}

export function Navigation({
  activeTab,
  setActiveTab,
  cartCount,
  lowStockCount,
  cashierName,
  cashierRole,
  onLockTerminal,
  onOpenPriceGuide,
  onOpenExpiration,
  proFormattedTime = '00:00:00',
  isPro = true,
  isMasterAdmin = false,
  onOpenProModal
}: NavigationProps): React.JSX.Element {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Primary store operations nav
  const storeNavItems: {
    id: ActiveTab
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number
    badgeClass?: string
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: lowStockCount && lowStockCount > 0 ? lowStockCount : undefined,
      badgeClass: 'bg-red-500/20 text-red-300 border border-red-500/30'
    },
    { id: 'pos', label: 'Counter', icon: ShoppingBag, badge: cartCount },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'customers', label: 'Customers & Credit', icon: Users },
  ]

  // Business management nav
  const businessNavItems: {
    id: ActiveTab
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'analytics', label: 'Analytics & Z-Read', icon: BarChart3 },
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

  const handleMobileSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab)
    setMobileDrawerOpen(false)
  }

  return (
    <>
      {/* ── DESKTOP & TABLET VERTICAL SIDEBAR (md:flex) ── */}
      <aside className="hidden md:flex flex-col w-60 xl:w-64 h-screen sticky top-0 shrink-0 bg-[#090A0D] border-r border-white/10 p-4 justify-between z-30 transition-all select-none overflow-y-auto custom-scrollbar">
        {/* Brand & Logo Header */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-2 py-2 border-b border-white/[0.08]">
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

          {/* Group 1: Store Operations */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-stone-500">
              Store Operations
            </div>
            <nav className="space-y-1">
              {storeNavItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-medium transition-all duration-200 text-left ${
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
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                          item.badgeClass || 'bg-[#D4AF37] text-black'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Group 2: Business & Finance */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-stone-500">
              Management
            </div>
            <nav className="space-y-1">
              {businessNavItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-medium transition-all duration-200 text-left ${
                      isActive
                        ? 'bg-amber-500/10 text-[#D4AF37] border border-[#D4AF37]/35 shadow-glow-gold font-bold'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 text-inherit" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Group 3: Fast Tools (SRP & Expiration) */}
          {(onOpenPriceGuide || onOpenExpiration) && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-stone-500">
                Fast Tools
              </div>
              <div className="space-y-1">
                {onOpenPriceGuide && (
                  <button
                    onClick={onOpenPriceGuide}
                    className="btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-medium text-amber-300/80 hover:text-amber-200 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] border border-amber-500/20 text-left transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                      <span className="truncate">DTI Price Guide</span>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">SRP</span>
                  </button>
                )}
                {onOpenExpiration && (
                  <button
                    onClick={onOpenExpiration}
                    className="btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-medium text-rose-300/80 hover:text-rose-200 bg-rose-500/[0.04] hover:bg-rose-500/[0.08] border border-rose-500/20 text-left transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CalendarClock className="w-4 h-4 shrink-0 text-rose-400" />
                      <span className="truncate">Expiry Watch</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Master Admin Platform Console */}
          {isMasterAdmin && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gold-light flex items-center gap-1.5 font-bold">
                <Crown className="w-3.5 h-3.5 text-gold" />
                <span>Super Admin</span>
              </div>
              <button
                onClick={() => setActiveTab('master-control')}
                className={`btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-bold transition-all duration-200 text-left ${
                  activeTab === 'master-control'
                    ? 'bg-gradient-to-r from-amber-500/25 to-gold/20 text-gold-light border border-gold shadow-glow-gold'
                    : 'bg-amber-500/[0.08] text-amber-200 border border-gold/30 hover:border-gold hover:bg-amber-500/15'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-gold-light shrink-0" />
                  <span className="truncate">Master Control</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-gold/20 text-[9px] font-mono text-gold-light font-extrabold border border-gold/40">
                  ROOT
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer: Pro Access HUD & User Profile & Log Out */}
        <div className="space-y-3 pt-4 border-t border-white/[0.08] mt-4">
          {/* Real-Time Pro Access Time Limit Status Card / Master License Card */}
          {isMasterAdmin ? (
            <div
              onClick={() => setActiveTab('master-control')}
              role="button"
              tabIndex={0}
              className="cursor-pointer group p-2.5 rounded-2xl border border-gold/40 bg-gradient-to-r from-amber-500/15 via-gold/10 to-amber-500/10 shadow-glow-gold transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest uppercase font-bold text-gold-light">
                  <Crown className="w-3.5 h-3.5 text-gold" />
                  <span>MASTER LICENSE</span>
                </span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded font-extrabold uppercase bg-gold/20 text-gold-light border border-gold/40">
                  AD-FREE
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] text-stone-300">
                <span className="text-gold-light font-bold">LIFETIME ACCESS</span>
                <span className="text-[10px] text-gold underline">Console →</span>
              </div>
            </div>
          ) : (
            <div
              onClick={onOpenProModal}
              role="button"
              tabIndex={0}
              className={`cursor-pointer group p-2.5 rounded-2xl border transition-all duration-300 ${
                isPro
                  ? 'bg-amber-500/[0.05] border-gold/30 hover:border-gold hover:bg-amber-500/[0.09]'
                  : 'bg-rose-950/25 border-rose-700/50 hover:border-rose-500 animate-pulse'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest uppercase font-semibold text-stone-400">
                  <Clock className={`w-3 h-3 ${isPro ? 'text-gold-light' : 'text-rose-400'}`} />
                  <span>{isPro ? 'PRO ACCESS' : 'FREE MODE'}</span>
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                    isPro
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isPro ? 'ACTIVE' : 'EXPIRED'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-xs font-bold tracking-wider ${
                    isPro ? 'text-gold-light' : 'text-rose-400'
                  }`}
                >
                  {proFormattedTime}
                </span>

                <span className="text-[10px] font-mono text-gold-muted group-hover:text-gold-light transition-colors underline decoration-gold/40">
                  {isPro ? '+ Extend' : '⚡ Unlock'}
                </span>
              </div>
            </div>
          )}

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
          {/* Real-time Pro Pill or Master Admin Badge for Mobile */}
          {isMasterAdmin ? (
            <button
              onClick={() => setActiveTab('master-control')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gold/60 bg-gold/20 text-gold-light font-mono text-[11px] font-bold shadow-glow-gold"
            >
              <Crown className="w-3.5 h-3.5 text-gold" />
              <span>MASTER</span>
            </button>
          ) : (
            <button
              onClick={onOpenProModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold transition-all ${
                isPro
                  ? 'bg-amber-500/10 border-gold/40 text-gold-light'
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-300 animate-pulse'
              }`}
            >
              <Clock className="w-3 h-3 text-gold-muted" />
              <span>{proFormattedTime}</span>
            </button>
          )}

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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-center border-t border-white/10 px-1 py-1.5 bg-[#090A0D]/95 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'dashboard' ? 'text-[#D4AF37] font-semibold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {lowStockCount !== undefined && lowStockCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[8px] font-mono font-bold leading-none bg-red-500 text-white">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="truncate max-w-full tracking-tight uppercase text-[9px] font-medium leading-none">
            Dash
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'pos' ? 'text-[#D4AF37] font-semibold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[8px] font-mono font-bold leading-none bg-[#D4AF37] text-black">
                {cartCount}
              </span>
            )}
          </div>
          <span className="truncate max-w-full tracking-tight uppercase text-[9px] font-medium leading-none">
            Counter
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'transactions' ? 'text-[#D4AF37] font-semibold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full tracking-tight uppercase text-[9px] font-medium leading-none">
            Sales
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'inventory' ? 'text-[#D4AF37] font-semibold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full tracking-tight uppercase text-[9px] font-medium leading-none">
            Stocks
          </span>
        </button>

        <button
          onClick={() => setMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            mobileDrawerOpen || ['customers', 'expenses', 'suppliers', 'analytics', 'settings', 'master-control'].includes(activeTab)
              ? 'text-[#D4AF37] font-semibold'
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full tracking-tight uppercase text-[9px] font-medium leading-none">
            More
          </span>
        </button>
      </nav>

      {/* ── MOBILE "MORE" DRAWER BOTTOM SHEET (md:hidden) ── */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="flex-1"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="bg-[#0e1015] border-t border-white/10 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto space-y-5 animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm tracking-wider uppercase text-gold">TINDA APPS</span>
                <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">Directory</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Drawer Pro Access Card or Master Console Card */}
            {isMasterAdmin ? (
              <div
                onClick={() => {
                  setMobileDrawerOpen(false)
                  setActiveTab('master-control')
                }}
                role="button"
                className="p-3 rounded-2xl border border-gold/50 bg-gradient-to-r from-amber-500/15 via-gold/10 to-amber-500/15 flex items-center justify-between cursor-pointer shadow-glow-gold transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-gold-light" />
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-gold block leading-tight font-bold">
                      SUPER ADMIN ROOT ACCESS
                    </span>
                    <span className="font-mono text-xs font-bold text-stone-100">
                      Master Control Console
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-gold underline">
                  Open →
                </span>
              </div>
            ) : (
              <div
                onClick={() => {
                  setMobileDrawerOpen(false)
                  onOpenProModal?.()
                }}
                role="button"
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isPro
                    ? 'bg-amber-500/[0.08] border-gold/30'
                    : 'bg-rose-950/30 border-rose-700/60 animate-pulse'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-4 h-4 ${isPro ? 'text-gold-light' : 'text-rose-400'}`} />
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 block leading-tight">
                      {isPro ? 'PRO ACCESS ACTIVE' : 'PRO EXPIRED (FREE MODE)'}
                    </span>
                    <span className={`font-mono text-xs font-bold ${isPro ? 'text-gold-light' : 'text-rose-400'}`}>
                      {proFormattedTime}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-gold underline">
                  {isPro ? '+ Extend' : '⚡ Unlock'}
                </span>
              </div>
            )}

            {/* Quick Actions / Fast Tools */}
            {(onOpenPriceGuide || onOpenExpiration) && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-500 mb-2">Fast Tools</p>
                <div className="grid grid-cols-2 gap-2">
                  {onOpenPriceGuide && (
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false)
                        onOpenPriceGuide()
                      }}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-left flex flex-col justify-between"
                    >
                      <Sparkles className="w-5 h-5 text-amber-400 mb-1" />
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">DTI Price Guide</div>
                        <div className="text-[10px] text-amber-300/70 font-mono">172+ DTI SRP Items</div>
                      </div>
                    </button>
                  )}
                  {onOpenExpiration && (
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false)
                        onOpenExpiration()
                      }}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-left flex flex-col justify-between"
                    >
                      <CalendarClock className="w-5 h-5 text-rose-400 mb-1" />
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">Expiry Watch</div>
                        <div className="text-[10px] text-rose-300/70 font-mono">Perishable Alerts</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Additional Modules */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-500 mb-2">Store Management</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleMobileSelectTab('customers')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'customers'
                      ? 'bg-amber-500/15 border-amber-500/40 text-gold font-bold'
                      : 'bg-zinc-950/50 border-white/5 text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Customer Credit Ledger</div>
                      <div className="text-[10px] text-stone-500">Track customer credit & balances</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('expenses')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'expenses'
                      ? 'bg-amber-500/15 border-amber-500/40 text-gold font-bold'
                      : 'bg-zinc-950/50 border-white/5 text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Expenses Tracker</div>
                      <div className="text-[10px] text-stone-500">Operating costs & net profit math</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('suppliers')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'suppliers'
                      ? 'bg-amber-500/15 border-amber-500/40 text-gold font-bold'
                      : 'bg-zinc-950/50 border-white/5 text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Suppliers Directory</div>
                      <div className="text-[10px] text-stone-500">Vendor contacts & delivery notes</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('analytics')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'analytics'
                      ? 'bg-amber-500/15 border-amber-500/40 text-gold font-bold'
                      : 'bg-zinc-950/50 border-white/5 text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Analytics & Z-Read</div>
                      <div className="text-[10px] text-stone-500">Cash drawer audit & closure readings</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('settings')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'settings'
                      ? 'bg-amber-500/15 border-amber-500/40 text-gold font-bold'
                      : 'bg-zinc-950/50 border-white/5 text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Settings & Backup</div>
                      <div className="text-[10px] text-stone-500">Store config, JSON export & user accounts</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                </button>
              </div>
            </div>

            {/* User Profile & Log Out */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center font-bold text-xs text-gold">
                  {cashierInitials}
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-stone-200">{cashierName}</div>
                  <div className="text-[10px] text-stone-500">{cashierRole}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false)
                  onLockTerminal()
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
