import React from 'react'
import { Tv, X, ShoppingBag, CheckCircle2, Heart } from 'lucide-react'
import type { CartItem } from '../types'
import { formatCurrency } from '../utils/format'
import { AppLogo } from './AppLogo'

interface SalesMonitorModalProps {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  storeName?: string
}

export function SalesMonitorModal({
  open,
  onClose,
  cart,
  storeName = 'TINDA SARI-SARI & MINIMART'
}: SalesMonitorModalProps): React.JSX.Element | null {
  if (!open) return null

  const totalCents = cart.reduce((sum, item) => sum + item.total_c, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-3xl bg-obsidian-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider">
                  Live Customer Facing Display (CFD)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  REALTIME MONITOR
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Customer pole display and dual-screen register simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-b from-obsidian-950 to-obsidian-900">
          {/* Store Greeting */}
          <div className="text-center space-y-1 border-b border-white/[0.06] pb-4">
            <p className="font-serif text-lg sm:text-xl font-bold tracking-widest uppercase text-stone-100">
              {storeName}
            </p>
            <p className="text-xs text-emerald-400 font-sans font-medium flex items-center justify-center gap-1.5">
              <span>Maraming salamat po sa pagbisita!</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            </p>
          </div>

          {/* Cart Contents or Waiting State */}
          {cart.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-obsidian-850 border border-slate-800 text-sm font-mono"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {item.quantity}x
                      </span>
                      <span className="font-sans font-bold text-stone-200 truncate">
                        {item.product.name}
                      </span>
                    </div>
                    <span className="font-bold text-stone-100 shrink-0">
                      {formatCurrency(item.total_c)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-obsidian-850 border border-emerald-500/30 flex items-center justify-between shadow-glow-emerald">
                <div>
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest font-sans">
                    Kabuuang Halaga ({totalItems} Paninda)
                  </p>
                  <p className="text-xs text-stone-400 font-sans mt-0.5">Total Amount Due</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 tracking-tight">
                    {formatCurrency(totalCents)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-stone-400 mx-auto">
                <ShoppingBag className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="text-base font-bold text-stone-200 font-sans">
                Handa nang mag-scan ang kaha
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto font-sans">
                Ang inyong mga binibili at presyo ay awtomatikong lalabas dito habang ini-scan ng cashier.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-obsidian-950 flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>Terminal TRM-8891 · Dual Screen CFD</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-300 text-xs font-sans font-bold"
          >
            Isara ang Display
          </button>
        </div>
      </div>
    </div>
  )
}
