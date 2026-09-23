import {
  ShoppingBag,
  Package,
  BarChart3,
  Users,
  Settings,
  Lock,
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
      {/* Top Header - Fixed Clean Luxury Axis */}
      <header className="sticky top-0 z-40 h-16 w-full flex items-center justify-between px-4 sm:px-6 bg-[#090A0D] border-b border-white/10 transition-colors">
        {/* Left Section: Brand & Status */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-base sm:text-lg tracking-[0.2em] sm:tracking-[0.25em] uppercase text-stone-100">
              TINDA
            </span>
            <span className="text-[9px] sm:text-[10px] tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded-full uppercase font-mono">
              RESERVE v1.0
            </span>
          </div>

          {/* Status Indicator Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
              Cloud Synced • Offline Ready
            </span>
          </div>
        </div>

        {/* Center Section: Sleek Pill Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 border border-white/5 p-1 rounded-xl">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`btn-press flex items-center px-3 py-1.5 rounded-lg whitespace-nowrap text-xs tracking-wider uppercase font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 mr-1.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#D4AF37] text-black">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Right Section: Compact Cashier Profile & Prominent Logout Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-white/5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-[#D4AF37] text-[#090A0D] text-[11px] font-serif font-bold shadow-sm">
              {cashierInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-medium text-stone-200 leading-tight whitespace-nowrap">
                {cashierName}
              </span>
              <span className="text-[10px] text-stone-400 font-mono leading-tight whitespace-nowrap">
                {cashierRole}
              </span>
            </div>
          </div>

          <button
            onClick={onLockTerminal}
            title="Log Out / Lock Terminal"
            aria-label="Log Out"
            className="btn-press flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation Bar (Fixed Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 px-2 py-2 bg-[#090A0D]/95 backdrop-blur-xl">
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
              <span className="truncate max-w-[64px] tracking-wider uppercase">{item.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
