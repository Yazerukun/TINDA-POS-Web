import React, { useState, useEffect } from 'react'
import { ShoppingCart, Package, BarChart3, Users, Settings, WifiOff, Sparkles } from 'lucide-react'

export type ActiveTab = 'pos' | 'inventory' | 'analytics' | 'customers' | 'settings'

interface NavigationProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  cartCount: number
}

export function Navigation({ activeTab, setActiveTab, cartCount }: NavigationProps): React.JSX.Element {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'pos', label: 'POS Counter', icon: ShoppingCart, badge: cartCount },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'customers', label: 'Utang Ledger', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/[0.08] shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Store Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-obsidian-950 font-black text-xl shadow-glow-emerald">
            <span>T</span>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-obsidian-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                TINDA POS <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">WEB v1.0.1</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <WifiOff className="h-3 w-3" />
                <span>100% Offline Capable</span>
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400">{time}</span>
            </div>
          </div>
        </div>

        {/* Center Tabs Navigation */}
        <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-obsidian-900/80 border border-white/[0.06] shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`btn-press relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-obsidian-950 shadow-glow-emerald font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-obsidian-950 text-emerald-400' : 'bg-emerald-500 text-obsidian-950'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Right Status Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-obsidian-850/60 text-xs font-medium text-slate-300 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-slate-200">Cloudflare Edge Live</span>
          </div>
        </div>
      </div>
    </header>
  )
}
