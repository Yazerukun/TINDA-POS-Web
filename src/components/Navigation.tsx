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
import { AppLogo } from './AppLogo'

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
  avatarUrl?: string
  onOpenProfile?: () => void
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
  avatarUrl,
  onOpenProfile,
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
      badgeClass: 'bg-red-500/20 text-red-600 border border-red-500/30'
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
      <aside className="hidden md:flex flex-col w-60 xl:w-64 h-screen sticky top-0 shrink-0 bg-obsidian-950 border-r border-slate-800/60 p-4 justify-between z-30 transition-all select-none overflow-y-auto custom-scrollbar">
        {/* Brand & Logo Header */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-2 py-2 border-b border-white/[0.08]">
            <AppLogo size={44} animated={true} isPro={isPro || isMasterAdmin} />
            <div className="leading-tight min-w-0">
              <p className="font-serif text-base font-bold tracking-[0.2em] text-stone-100 uppercase truncate">
                TINDA
              </p>
              <p className="font-sans font-semibold text-[0.75rem] tracking-[0.22em] uppercase text-emerald-400/80 font-medium truncate">
                BUSINESS POS
              </p>
            </div>
          </div>

          {/* Group 1: Store Operations */}
          <div>
            <div className="px-3 pb-2 text-[0.75rem] font-sans font-semibold uppercase tracking-[0.18em] text-stone-500">
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
                        ? 'bg-gradient-to-r from-brand-600/20 via-brand-600/10 to-transparent text-emerald-400 font-bold border-l-2 border-emerald-500 shadow-sm'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04] border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 text-inherit" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[0.75rem] font-mono font-bold shrink-0 ${
                          item.badgeClass || 'bg-emerald-500 text-obsidian-950'
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
            <div className="px-3 pb-2 text-[0.75rem] font-sans font-semibold uppercase tracking-[0.18em] text-stone-500">
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
                        ? 'bg-gradient-to-r from-brand-600/20 via-brand-600/10 to-transparent text-emerald-400 font-bold border-l-2 border-emerald-500 shadow-sm'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04] border-l-2 border-transparent'
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
              <div className="px-3 pb-2 text-[0.75rem] font-sans font-semibold uppercase tracking-[0.18em] text-stone-500">
                Fast Tools
              </div>
              <div className="space-y-1">
                {onOpenPriceGuide && (
                  <button
                    onClick={onOpenPriceGuide}
                    className="btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-medium text-amber-400 hover:text-amber-300 bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border border-amber-500/30 text-left transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                      <span className="truncate">DTI Price Guide</span>
                    </div>
                    <span className="text-[0.75rem] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">SRP</span>
                  </button>
                )}
                {onOpenExpiration && (
                  <button
                    onClick={onOpenExpiration}
                    className="btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-medium text-rose-600/80 hover:text-rose-700 bg-rose-500/[0.04] hover:bg-rose-500/[0.08] border border-rose-500/20 text-left transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CalendarClock className="w-4 h-4 shrink-0 text-rose-600" />
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
              <div className="px-3 pb-2 text-[0.75rem] font-sans font-semibold uppercase tracking-[0.18em] text-gold-light flex items-center gap-1.5 font-bold">
                <Crown className="w-3.5 h-3.5 text-gold" />
                <span>Super Admin</span>
              </div>
              <button
                onClick={() => setActiveTab('master-control')}
                className={`btn-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase font-bold transition-all duration-200 text-left ${
                  activeTab === 'master-control'
                    ? 'bg-gradient-to-r from-amber-500/25 to-gold/20 text-gold-light border border-gold shadow-glow-gold'
                    : 'bg-amber-500/[0.08] text-amber-700 border border-gold/30 hover:border-gold hover:bg-amber-500/15'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-gold-light shrink-0" />
                  <span className="truncate">Master Control</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-gold/20 text-[0.75rem] font-mono text-gold-light font-extrabold border border-gold/40">
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
                <span className="flex items-center gap-1.5 text-[0.75rem] font-sans font-semibold tracking-widest uppercase font-bold text-gold-light">
                  <Crown className="w-3.5 h-3.5 text-gold" />
                  <span>MASTER LICENSE</span>
                </span>
                <span className="text-[0.75rem] font-sans font-semibold px-1.5 py-0.5 rounded font-extrabold uppercase bg-gold/20 text-gold-light border border-gold/40">
                  AD-FREE
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[0.8125rem] text-stone-300">
                <span className="text-gold-light font-bold">LIFETIME ACCESS</span>
                <span className="text-[0.75rem] text-gold underline">Console →</span>
              </div>
            </div>
          ) : (
            <div
              className="p-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] shadow-glow-emerald"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-[0.75rem] font-sans font-semibold tracking-widest uppercase font-bold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PRO EDITION</span>
                </span>
                <span className="text-[0.75rem] font-sans font-semibold px-1.5 py-0.5 rounded font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  UNLIMITED
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[0.8125rem] text-stone-300">
                <span className="text-stone-300 text-xs">All Modules Unlocked</span>
                <span className="text-[0.75rem] text-emerald-400 font-bold">Ad-Free</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-obsidian-900/80 border border-white/10 hover:border-emerald-500/40 hover:bg-obsidian-850 transition-all text-left group w-full cursor-pointer"
            title="View & Edit Profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={cashierName}
                className="h-9 w-9 shrink-0 rounded-xl object-cover border border-gold/40 shadow-glow-gold"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-gold to-emerald-600 text-obsidian-950 text-xs font-serif font-bold shadow-sm">
                {cashierInitials}
              </div>
            )}
            <div className="flex flex-col min-w-0 text-left flex-1">
              <span className="text-xs font-semibold text-stone-200 truncate leading-tight group-hover:text-emerald-400 transition-colors">
                {cashierName}
              </span>
              <span className="text-[0.75rem] text-stone-500 font-mono truncate leading-tight mt-0.5">
                {cashierRole}
              </span>
            </div>
          </button>

          <button
            onClick={onLockTerminal}
            title="Log Out Terminal"
            className="btn-press w-full py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 hover:border-red-500/40 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="tracking-wider uppercase text-[0.8125rem] font-bold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR (md:hidden) — Auto-responsive for all Android, iPhone & Foldables ── */}
      <header className="md:hidden sticky top-0 z-40 h-13 w-full flex items-center justify-between px-3 sm:px-4 bg-obsidian-950/95 backdrop-blur-xl border-b border-slate-800/60 gap-2 select-none">
        {/* Left: Brand logo & name */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <AppLogo size={32} animated={true} showBadge={false} isPro={isPro || isMasterAdmin} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-serif font-bold text-sm sm:text-base tracking-[0.18em] uppercase text-stone-100 truncate">
              TINDA
            </span>
            <span className="text-[0.75rem] sm:text-[0.75rem] tracking-widest text-gold-light border border-gold/40 bg-gold/10 px-1.5 py-0.2 rounded-full uppercase font-sans font-semibold shrink-0">
              POS
            </span>
          </div>
        </div>

        {/* Right: Actions, timer, profile, and logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Real-time Pro Pill or Master Admin Badge */}
          {isMasterAdmin ? (
            <button
              onClick={() => setActiveTab('master-control')}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border border-gold/60 bg-gold/20 text-gold-light font-mono text-[0.75rem] sm:text-[0.8125rem] font-bold shadow-glow-gold shrink-0 transition-transform active:scale-95"
            >
              <Crown className="w-3 h-3 text-gold shrink-0" />
              <span>MASTER</span>
            </button>
          ) : (
            <button
              onClick={onOpenProModal}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[0.75rem] sm:text-[0.8125rem] font-mono font-bold transition-all shrink-0 active:scale-95 ${
                isPro
                  ? 'bg-amber-500/10 border-gold/40 text-gold-light'
                  : 'bg-rose-50/60 border-rose-700/60 text-rose-600 animate-pulse'
              }`}
            >
              <Clock className="w-3 h-3 text-gold-muted shrink-0" />
              <span>{proFormattedTime}</span>
            </button>
          )}

          {/* Cashier profile avatar */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-lg bg-obsidian-900/80 border border-white/10 hover:border-emerald-500/40 transition-all shrink-0 cursor-pointer"
            title={`View profile (${cashierName})`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={cashierName}
                className="h-6 w-6 shrink-0 rounded-full object-cover border border-gold/40"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-gold to-emerald-600 text-obsidian-950 text-[0.75rem] font-serif font-bold">
                {cashierInitials}
              </div>
            )}
            <span className="hidden sm:inline text-[0.8125rem] text-stone-300 font-medium truncate max-w-[70px]">
              {cashierName.split(' ')[0]}
            </span>
          </button>

          {/* Logout button */}
          <button
            onClick={onLockTerminal}
            title="Log Out Terminal"
            className="btn-press flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 shrink-0 transition-all hover:bg-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── MOBILE BOTTOM BAR (md:hidden) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-center border-t border-slate-800/60 px-1 py-1.5 bg-obsidian-950/95 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {lowStockCount !== undefined && lowStockCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[0.75rem] font-mono font-bold leading-none bg-red-500 text-white">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="truncate max-w-full tracking-tight uppercase text-[0.75rem] font-medium leading-none">
            Dash
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'pos' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[0.75rem] font-mono font-bold leading-none bg-emerald-500 text-obsidian-950">
                {cartCount}
              </span>
            )}
          </div>
          <span className="truncate max-w-full tracking-tight uppercase text-[0.75rem] font-medium leading-none">
            Counter
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'transactions' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full tracking-tight uppercase text-[0.75rem] font-medium leading-none">
            Sales
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            activeTab === 'inventory' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full tracking-tight uppercase text-[0.75rem] font-medium leading-none">
            Stocks
          </span>
        </button>

        <button
          onClick={() => setMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-lg text-center transition-all ${
            mobileDrawerOpen || ['customers', 'expenses', 'suppliers', 'analytics', 'settings', 'master-control'].includes(activeTab)
              ? 'text-emerald-400 font-bold'
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full tracking-tight uppercase text-[0.75rem] font-medium leading-none">
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
          <div className="bg-obsidian-950 border-t border-gold/30 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto space-y-5 animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <AppLogo size={30} animated={true} showBadge={false} isPro={isPro || isMasterAdmin} />
                <span className="font-serif font-bold text-sm tracking-wider uppercase text-gold">TINDA APPS</span>
                <span className="text-[0.75rem] font-sans font-semibold text-stone-500 uppercase tracking-widest">Directory</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-obsidian-900 text-stone-400"
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
                    <span className="text-[0.75rem] font-sans font-semibold tracking-widest uppercase text-gold block leading-tight font-bold">
                      SUPER ADMIN ROOT ACCESS
                    </span>
                    <span className="font-mono text-xs font-bold text-stone-100">
                      Master Control Console
                    </span>
                  </div>
                </div>
                <span className="text-[0.8125rem] font-mono font-bold text-gold underline">
                  Open →
                </span>
              </div>
            ) : (
              <div
                className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] flex items-center justify-between shadow-glow-emerald"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[0.75rem] font-sans font-semibold tracking-widest uppercase text-emerald-400 block leading-tight font-bold">
                      PRO EDITION ACTIVE
                    </span>
                    <span className="font-mono text-xs text-stone-300">
                      All Modules Unlocked • Ad-Free
                    </span>
                  </div>
                </div>
                <span className="text-[0.75rem] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
            )}

            {/* Quick Actions / Fast Tools */}
            {(onOpenPriceGuide || onOpenExpiration) && (
              <div>
                <p className="text-[0.75rem] font-sans font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2">Fast Tools</p>
                <div className="grid grid-cols-2 gap-2">
                  {onOpenPriceGuide && (
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false)
                        onOpenPriceGuide()
                      }}
                      className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/30 text-amber-400 text-left flex flex-col justify-between"
                    >
                      <Sparkles className="w-5 h-5 text-amber-400 mb-1" />
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">DTI Price Guide</div>
                        <div className="text-[0.75rem] text-amber-400/80 font-mono">172+ DTI SRP Items</div>
                      </div>
                    </button>
                  )}
                  {onOpenExpiration && (
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false)
                        onOpenExpiration()
                      }}
                      className="p-3 rounded-xl bg-rose-500/[0.08] border border-rose-500/30 text-rose-400 text-left flex flex-col justify-between"
                    >
                      <CalendarClock className="w-5 h-5 text-rose-400 mb-1" />
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">Expiry Watch</div>
                        <div className="text-[0.75rem] text-rose-400/80 font-mono">Perishable Alerts</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Additional Modules */}
            <div>
              <p className="text-[0.75rem] font-sans font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2">Store Management</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleMobileSelectTab('customers')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'customers'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-obsidian-900/80 border-white/10 text-stone-300 hover:bg-obsidian-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Customer Credit Ledger</div>
                      <div className="text-[0.75rem] text-stone-500">Track customer credit & balances</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('expenses')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'expenses'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-obsidian-900/80 border-white/10 text-stone-300 hover:bg-obsidian-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Expenses Tracker</div>
                      <div className="text-[0.75rem] text-stone-500">Operating costs & net profit math</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('suppliers')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'suppliers'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-obsidian-900/80 border-white/10 text-stone-300 hover:bg-obsidian-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Suppliers Directory</div>
                      <div className="text-[0.75rem] text-stone-500">Vendor contacts & delivery notes</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('analytics')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'analytics'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-obsidian-900/80 border-white/10 text-stone-300 hover:bg-obsidian-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Analytics & Z-Read</div>
                      <div className="text-[0.75rem] text-stone-500">Cash drawer audit & closure readings</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </button>

                <button
                  onClick={() => handleMobileSelectTab('settings')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border ${
                    activeTab === 'settings'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-obsidian-900/80 border-white/10 text-stone-300 hover:bg-obsidian-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Settings & Backup</div>
                      <div className="text-[0.75rem] text-stone-500">Store config, JSON export & user accounts</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </button>
              </div>
            </div>

            {/* User Profile & Log Out */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  onOpenProfile?.()
                }}
                className="flex items-center gap-2.5 text-left group"
                title="View & Edit Profile"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={cashierName}
                    className="w-8 h-8 rounded-full object-cover border border-gold/40 shadow-glow-gold"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center font-bold text-xs text-gold">
                    {cashierInitials}
                  </div>
                )}
                <div className="text-xs">
                  <div className="font-semibold text-stone-200 group-hover:text-gold-light transition-colors">{cashierName}</div>
                  <div className="text-[0.75rem] text-stone-500 font-mono">{cashierRole}</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false)
                  onLockTerminal()
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold flex items-center gap-1.5"
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
