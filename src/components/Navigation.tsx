import React, { useState } from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Wallet,
  Receipt,
  Truck,
  ListOrdered,
  BarChart3,
  HardDriveDownload,
  Settings,
  Users,
  LogOut,
  HelpCircle,
  BookOpen,
  Crown,
  Tv,
  Landmark,
  Sparkles,
  Wrench,
  Zap,
  RefreshCw,
  Bot,
  Printer,
  Tag,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  TrendingDown
} from 'lucide-react'
import { AppLogo } from './AppLogo'

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'ewallet'
  | 'printing'
  | 'inventory'
  | 'suppliers'
  | 'expenses'
  | 'customers'
  | 'utang'
  | 'transactions'
  | 'reports'
  | 'analytics'
  | 'printerStudio'
  | 'settings'
  | 'backup'
  | 'handbook'
  | 'updates'
  | 'master-control'

interface NavItem {
  key: ActiveTab
  label: string
  icon: React.ReactNode
  badge?: number | string
  badgeClass?: string
  isHot?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface NavigationProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  cartCount: number
  lowStockCount?: number
  cashierName: string
  cashierRole: string
  avatarUrl?: string
  storeName?: string
  onOpenProfile?: () => void
  onLockTerminal: () => void
  onOpenTerminalTools?: () => void
  onOpenSalesMonitor?: () => void
  onOpenHelpGuide?: () => void
  onOpenAiAssistant?: () => void
  onOpenPrinterStudio?: () => void
  onOpenVipUpgrade?: () => void
  isMasterAdmin?: boolean
}

export function Navigation({
  activeTab,
  setActiveTab,
  cartCount,
  lowStockCount,
  cashierName,
  cashierRole,
  avatarUrl,
  storeName = 'TINDA Retail Station',
  onOpenProfile,
  onLockTerminal,
  onOpenTerminalTools,
  onOpenSalesMonitor,
  onOpenHelpGuide,
  onOpenAiAssistant,
  onOpenPrinterStudio,
  onOpenVipUpgrade,
  isMasterAdmin = false
}: NavigationProps): React.JSX.Element {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Canonical 5 Sections Mirrored Exactly from Desktop TINDA POS
  const navSections: NavSection[] = [
    {
      title: 'Storefront & Register',
      items: [
        {
          key: 'pos',
          label: 'POS Cashier',
          icon: <ShoppingCart className="h-4 w-4" />,
          badge: cartCount > 0 ? cartCount : undefined,
          badgeClass: 'bg-emerald-500 text-obsidian-950 font-bold',
          isHot: true
        },
        {
          key: 'ewallet',
          label: 'E-Wallet & Bills',
          icon: <Landmark className="h-4 w-4 text-emerald-400" />
        },
        {
          key: 'printing',
          label: 'Print Services',
          icon: <Printer className="h-4 w-4 text-sky-400" />
        }
      ]
    },
    {
      title: 'Inventory & Operations',
      items: [
        {
          key: 'inventory',
          label: 'Inventory & Stock',
          icon: <Boxes className="h-4 w-4" />,
          badge: lowStockCount && lowStockCount > 0 ? lowStockCount : undefined,
          badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        },
        {
          key: 'suppliers',
          label: 'Suppliers',
          icon: <Truck className="h-4 w-4 text-amber-400" />
        },
        {
          key: 'expenses',
          label: 'Operating Expenses',
          icon: <Receipt className="h-4 w-4 text-rose-400" />
        }
      ]
    },
    {
      title: 'Customers & Suki',
      items: [
        {
          key: 'customers',
          label: 'Customer Directory',
          icon: <Users className="h-4 w-4" />
        },
        {
          key: 'utang',
          label: 'Utang Ledger',
          icon: <Wallet className="h-4 w-4 text-rose-400" />
        }
      ]
    },
    {
      title: 'Sales & Analytics',
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard & KPIs',
          icon: <LayoutDashboard className="h-4 w-4 text-emerald-400" />
        },
        {
          key: 'transactions',
          label: 'Transactions & Receipts',
          icon: <ListOrdered className="h-4 w-4" />
        },
        {
          key: 'reports',
          label: 'Reports & Z-Reading',
          icon: <BarChart3 className="h-4 w-4 text-sky-400" />
        }
      ]
    },
    {
      title: 'Hardware & System',
      items: [
        {
          key: 'printerStudio',
          label: 'Thermal & Label Studio',
          icon: <Tag className="h-4 w-4 text-indigo-400" />
        },
        {
          key: 'settings',
          label: 'Store Settings',
          icon: <Settings className="h-4 w-4" />
        },
        {
          key: 'backup',
          label: 'Data & Backup',
          icon: <HardDriveDownload className="h-4 w-4 text-teal-400" />
        },
        {
          key: 'handbook',
          label: 'Store Handbook & SOPs',
          icon: <BookOpen className="h-4 w-4 text-amber-400" />
        }
      ]
    }
  ]

  const cashierInitials = cashierName
    ? cashierName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'CA'

  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === 'printerStudio' && onOpenPrinterStudio) {
      onOpenPrinterStudio()
      setMobileDrawerOpen(false)
      return
    }
    setActiveTab(tab)
    setMobileDrawerOpen(false)
  }

  return (
    <>
      {/* ── DESKTOP & TABLET VERTICAL SIDEBAR (md:flex) ── */}
      <aside className="hidden md:flex flex-col w-60 xl:w-64 h-screen sticky top-0 shrink-0 bg-obsidian-950 border-r border-slate-800/60 p-3.5 justify-between z-30 transition-all select-none overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          {/* Brand & Station Header */}
          <div className="flex items-center gap-3 px-2 py-2 border-b border-white/[0.08]">
            <AppLogo size={42} animated={true} />
            <div className="leading-tight min-w-0">
              <p className="font-serif text-base font-bold tracking-[0.2em] text-stone-100 uppercase truncate">
                TINDA
              </p>
              <p className="font-sans font-semibold text-[0.6875rem] tracking-[0.22em] uppercase text-emerald-400 font-medium truncate">
                RETAIL OS
              </p>
            </div>
          </div>

          {/* Network & Active Station Status Strip */}
          <div className="px-2 py-1.5 rounded-xl bg-obsidian-900 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[0.6875rem] font-mono text-emerald-400 font-bold truncate">
                Realtime Online Station
              </span>
            </div>
            <span className="text-[0.625rem] font-mono text-stone-500 shrink-0">v2.0.1</span>
          </div>

          {/* 5 Categorized Navigation Sections */}
          <nav className="space-y-4">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <p className="px-2 pb-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-stone-500 font-sans">
                  {sec.title}
                </p>
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive = activeTab === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectTab(item.key)}
                        className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-300 font-bold border-l-2 border-emerald-400 shadow-sm'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04] border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-emerald-400' : 'text-stone-400'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate text-[0.8125rem]">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge !== undefined && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold ${
                                item.badgeClass || 'bg-emerald-500 text-obsidian-950'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.isHot && !isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Root Super Admin Platform Console */}
            {isMasterAdmin && (
              <div className="space-y-1 pt-1 border-t border-gold/20">
                <p className="px-2 pb-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-gold-light font-sans flex items-center gap-1">
                  <Crown className="w-3 h-3 text-gold" />
                  <span>Platform Console</span>
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectTab('master-control')}
                  className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    activeTab === 'master-control'
                      ? 'bg-gradient-to-r from-amber-500/25 to-gold/20 text-gold-light border-l-2 border-gold shadow-glow-gold'
                      : 'text-amber-400 hover:bg-amber-500/10 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="h-4 w-4 text-gold-light shrink-0" />
                    <span className="truncate">Master Control</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-gold/20 text-[0.625rem] font-mono text-gold-light font-extrabold border border-gold/40">
                    ROOT
                  </span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Footer: Dedicated Terminal Tools Launcher & Staff Card */}
        <div className="space-y-2.5 pt-3 border-t border-white/[0.08] mt-3">
          {/* Primary Terminal Tools Pill Button (Separated & Organized Fast Tools Hub) */}
          <button
            type="button"
            onClick={onOpenTerminalTools}
            className="group flex w-full items-center justify-between rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/40 via-emerald-900/25 to-obsidian-900 px-3 py-2 text-xs font-bold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20 transition-all shadow-sm active:scale-[0.98]"
            title="Open POS Terminal & Fast Tools (DTI SRP, Expiry Watch, Scanner, Test Print, Sound)"
          >
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-400 group-hover:rotate-45 transition-transform shrink-0" />
              <span>Terminal &amp; Fast Tools</span>
            </span>
            <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[0.625rem] font-mono text-emerald-300 border border-emerald-500/30 font-bold">
              TOOLS
            </span>
          </button>

          {/* Secondary Utilities Strip: Monitor, Guide, AI Bot */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onOpenSalesMonitor}
              className="flex items-center justify-center gap-1 rounded-xl border border-sky-500/25 bg-sky-500/10 px-1 py-1.5 text-[0.6875rem] font-semibold text-sky-300 hover:border-sky-500/40 hover:bg-sky-500/20 transition shadow-sm active:scale-95"
              title="Open Live Customer Facing Display"
            >
              <Tv className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span className="truncate">Monitor</span>
            </button>

            <button
              type="button"
              onClick={onOpenHelpGuide}
              className="flex items-center justify-center gap-1 rounded-xl border border-amber-500/25 bg-amber-500/10 px-1 py-1.5 text-[0.6875rem] font-semibold text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/20 transition shadow-sm active:scale-95"
              title="Open Cashier Quick SOP Guide"
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Guide</span>
            </button>

            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="flex items-center justify-center gap-1 rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-1 py-1.5 text-[0.6875rem] font-bold text-indigo-300 hover:border-indigo-400 hover:bg-indigo-500/25 transition shadow-sm active:scale-95"
              title="Open TindaBot Retail AI Copilot"
            >
              <Bot className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">AI Bot</span>
            </button>
          </div>

          {/* Interactive VIP Pro Lifetime Upgrade Button & Status */}
          <button
            type="button"
            onClick={onOpenVipUpgrade}
            className="w-full p-2.5 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-950/30 via-obsidian-900 to-obsidian-950 flex items-center justify-between hover:border-amber-400 hover:bg-amber-500/10 transition-all shadow-sm active:scale-[0.98] group text-left"
            title="Open VIP Pro Lifetime Licensing & Maya Activation"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <div className="min-w-0">
                <span className="text-[0.6875rem] font-sans font-bold text-stone-100 uppercase tracking-wider block">
                  VIP PRO LIFETIME
                </span>
                <span className="text-[0.625rem] text-amber-400/80 block font-mono">
                  ₱500 Lifetime · Unlocked
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-[0.625rem] font-mono text-amber-300 font-black border border-amber-500/30 uppercase shrink-0">
              VIP
            </span>
          </button>

          {/* Staff Identity Card */}
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-obsidian-900 border border-slate-800 p-2 shadow-sm">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 min-w-0 text-left flex-1 group"
              title="View & Edit Profile"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={cashierName}
                  className="h-8 w-8 shrink-0 rounded-xl object-cover border border-emerald-500/40"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-obsidian-950 text-xs font-serif font-bold">
                  {cashierInitials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-stone-100 group-hover:text-emerald-400 transition-colors leading-tight">
                  {cashierName}
                </p>
                <p className="truncate text-[0.625rem] font-mono text-stone-500 uppercase tracking-tight mt-0.5">
                  {cashierRole}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onLockTerminal}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
              title="Log Out Terminal"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR (md:hidden) ── */}
      <header className="md:hidden sticky top-0 z-40 h-14 w-full flex items-center justify-between px-3 sm:px-4 bg-obsidian-950/95 backdrop-blur-xl border-b border-slate-800/60 gap-2 select-none">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <AppLogo size={32} animated={true} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-serif font-bold text-sm tracking-[0.18em] uppercase text-stone-100 truncate">
              TINDA
            </span>
            <span className="text-[0.625rem] tracking-widest text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 rounded-full uppercase font-sans font-semibold shrink-0">
              POS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Fast Tools Button */}
          <button
            type="button"
            onClick={onOpenTerminalTools}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold active:scale-95 transition-all"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tools</span>
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1 rounded-xl bg-obsidian-900 border border-white/10"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-obsidian-950 text-[0.6875rem] font-bold">
              {cashierInitials}
            </div>
          </button>

          <button
            onClick={onLockTerminal}
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── MOBILE BOTTOM BAR (md:hidden) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-center border-t border-slate-800/60 px-1 py-1.5 bg-obsidian-950/95 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center ${
            activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-stone-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span className="truncate uppercase text-[0.6875rem]">Dash</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center ${
            activeTab === 'pos' ? 'text-emerald-400 font-bold' : 'text-stone-400'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-4 h-4 shrink-0" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 rounded-full text-[0.625rem] font-mono font-bold bg-emerald-500 text-obsidian-950">
                {cartCount}
              </span>
            )}
          </div>
          <span className="truncate uppercase text-[0.6875rem]">Counter</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center ${
            activeTab === 'transactions' ? 'text-emerald-400 font-bold' : 'text-stone-400'
          }`}
        >
          <ListOrdered className="w-4 h-4 shrink-0" />
          <span className="truncate uppercase text-[0.6875rem]">Sales</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center ${
            activeTab === 'inventory' ? 'text-emerald-400 font-bold' : 'text-stone-400'
          }`}
        >
          <Boxes className="w-4 h-4 shrink-0" />
          <span className="truncate uppercase text-[0.6875rem]">Stocks</span>
        </button>

        <button
          onClick={() => setMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center ${
            mobileDrawerOpen ? 'text-emerald-400 font-bold' : 'text-stone-400'
          }`}
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span className="truncate uppercase text-[0.6875rem]">All Tabs</span>
        </button>
      </nav>

      {/* ── MOBILE FULL-SCREEN DRAWER MODAL (md:hidden) ── */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-obsidian-950/95 backdrop-blur-xl flex flex-col p-4 animate-fade-in overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <AppLogo size={36} animated={false} />
              <span className="font-serif font-bold text-base text-stone-100 tracking-wider">
                All Departments
              </span>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="p-2 rounded-xl bg-white/[0.04] text-stone-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-4 space-y-4 flex-1">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1.5">
                <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider font-sans">
                  {sec.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {sec.items.map((it) => (
                    <button
                      key={it.key}
                      onClick={() => handleSelectTab(it.key)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 ${
                        activeTab === it.key
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-obsidian-900 border-slate-800 text-stone-300'
                      }`}
                    >
                      <span className="shrink-0">{it.icon}</span>
                      <span className="text-xs truncate">{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Mobile VIP Pro Upgrade Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  onOpenVipUpgrade?.()
                }}
                className="w-full p-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-obsidian-900 to-obsidian-950 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-stone-100 uppercase tracking-wider block">
                      VIP Pro Lifetime Licensing
                    </span>
                    <span className="text-[0.625rem] text-amber-400 font-mono">
                      ₱500 Lifetime · Verified payment channel
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-xs font-mono text-amber-300 font-bold border border-amber-500/30">
                  VIP
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
