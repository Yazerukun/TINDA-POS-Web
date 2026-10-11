import React, { useState, useEffect } from 'react'
import {
  Tv,
  X,
  ShoppingBag,
  CheckCircle2,
  Heart,
  Maximize2,
  Minimize2,
  TrendingUp,
  Receipt,
  QrCode,
  ExternalLink,
  Clock,
  Sparkles,
  Banknote
} from 'lucide-react'
import type { CartItem, Transaction } from '../types'
import { formatCurrency, formatDateTime } from '../utils/format'
import { db } from '../db'

interface SalesMonitorModalProps {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  storeName?: string
  isStandalone?: boolean
}

export function SalesMonitorModal({
  open,
  onClose,
  cart: initialCart,
  storeName = 'TINDA SARI-SARI & MINIMART',
  isStandalone = false
}: SalesMonitorModalProps): React.JSX.Element | null {
  const [isFullscreen, setIsFullscreen] = useState(isStandalone)
  const [liveCart, setLiveCart] = useState<CartItem[]>(initialCart)
  const [lastSale, setLastSale] = useState<{
    transaction: Transaction
    change_c: number
    timestamp: number
  } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Today's summary statistics
  const [todaySalesC, setTodaySalesC] = useState(0)
  const [todayTxCount, setTodayTxCount] = useState(0)
  const [recentSales, setRecentSales] = useState<Transaction[]>([])

  // Keep liveCart updated from props if provided
  useEffect(() => {
    if (initialCart && initialCart.length > 0) {
      setLiveCart(initialCart)
    }
  }, [initialCart])

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load today's sales data from IndexedDB
  const loadTodayMetrics = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const txs = await db.transactions.toArray()
      const todays = txs.filter((t) => t.created_at?.startsWith(todayStr))
      const totalC = todays.reduce((sum, t) => sum + (t.total_c || 0), 0)
      setTodaySalesC(totalC)
      setTodayTxCount(todays.length)
      setRecentSales(txs.slice(-4).reverse())
    } catch {}
  }

  useEffect(() => {
    if (open || isStandalone) {
      loadTodayMetrics()
    }
  }, [open, isStandalone])

  // BroadcastChannel for cross-window and cross-tab synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('tinda_sales_monitor')
      channel.onmessage = (event) => {
        const data = event.data
        if (data?.type === 'CART_UPDATE') {
          setLiveCart(data.cart || [])
        } else if (data?.type === 'SALE_COMPLETED') {
          setLastSale({
            transaction: data.transaction,
            change_c: data.change_c ?? (data.transaction?.change_c || 0),
            timestamp: Date.now()
          })
          setLiveCart([])
          loadTodayMetrics()
        }
      }
    } catch {}

    return () => {
      channel?.close()
    }
  }, [])

  // Auto-dismiss last sale celebratory banner after 20 seconds
  useEffect(() => {
    if (!lastSale) return
    const timer = setTimeout(() => {
      setLastSale(null)
    }, 20000)
    return () => clearTimeout(timer)
  }, [lastSale])

  if (!open && !isStandalone) return null

  const effectiveCart = liveCart.length > 0 ? liveCart : initialCart
  const totalCents = effectiveCart.reduce((sum, item) => sum + item.total_c, 0)
  const totalItems = effectiveCart.reduce((sum, item) => sum + item.quantity, 0)

  const openDedicatedTab = () => {
    const url = window.location.origin + window.location.pathname + '#monitor'
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isFullscreen || isStandalone ? 'p-0' : 'p-3 sm:p-5'
      } bg-obsidian-950/90 backdrop-blur-md animate-fade-in select-none`}
    >
      <div
        className={`relative w-full ${
          isFullscreen || isStandalone
            ? 'h-screen max-w-none rounded-none'
            : 'max-w-4xl max-h-[92vh] rounded-3xl'
        } bg-obsidian-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Top Terminal Strip */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.08] bg-obsidian-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-glow-sky">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider">
                  Live Customer Facing Display (CFD)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  REAL-TIME POLE DISPLAY
                </span>
              </div>
              <p className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>Terminal TRM-8891</span>
                <span>•</span>
                <span>Dual-Monitor Ready</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                type="button"
                onClick={openDedicatedTab}
                title="Open in dedicated standalone tab for secondary monitor"
                className="btn-press px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Second Monitor Tab</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Kiosk Fullscreen'}
              className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-sky-400 flex items-center justify-center transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {!isStandalone && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Display Screen Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-gradient-to-b from-obsidian-950 via-obsidian-900 to-obsidian-950">
          
          {/* Store Greeting & Live Clock Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-4 gap-3">
            <div>
              <p className="font-serif text-lg sm:text-2xl font-bold tracking-widest uppercase text-stone-100">
                {storeName}
              </p>
              <p className="text-xs text-emerald-400 font-sans font-medium flex items-center gap-1.5 mt-0.5">
                <span>Mabuhay! Daghang salamat sa inyong pagpalit!</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              </p>
            </div>

            <div className="flex items-center gap-2 bg-obsidian-950 px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-xs font-mono text-stone-300 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* 1. Celebratory Change Due Announcement Banner */}
          {lastSale && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/40 to-obsidian-900 border-2 border-emerald-400/80 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in-95 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Recent Transaction ({lastSale.transaction.invoice_number})
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  {lastSale.transaction.payment_method}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <p className="text-xs text-stone-300 uppercase tracking-wider font-sans">
                    Amount Tendered
                  </p>
                  <p className="text-2xl font-mono font-bold text-stone-100">
                    {formatCurrency(lastSale.transaction.amount_tendered_c || lastSale.transaction.total_c)}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Total Invoice Amount: {formatCurrency(lastSale.transaction.total_c)}
                  </p>
                </div>

                <div className="bg-obsidian-950/80 p-4 rounded-2xl border border-emerald-500/40 text-right">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                    Change Due
                  </p>
                  <p className="text-3xl sm:text-4xl font-mono font-black text-emerald-300 tracking-tight mt-1">
                    {formatCurrency(lastSale.change_c)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Active Ringing Items or Live Idle Dashboard */}
          {effectiveCart.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-72 overflow-y-auto space-y-2.5 custom-scrollbar pr-2">
                {effectiveCart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-obsidian-850/90 border border-white/[0.08] text-sm font-mono shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                        {item.quantity}x
                      </span>
                      <div className="min-w-0">
                        <span className="font-sans font-bold text-stone-100 truncate block text-sm">
                          {item.product.name}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          @{formatCurrency(item.unit_price_c)} matag {item.product.base_unit || 'pc'}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-stone-100 text-base font-mono shrink-0">
                      {formatCurrency(item.total_c)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Due Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-obsidian-850 border border-emerald-500/40 flex items-center justify-between shadow-glow-emerald">
                <div>
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest font-sans">
                    Kabuuang Bayranan ({totalItems} Items)
                  </p>
                  <p className="text-xs text-stone-400 font-sans mt-0.5">Total Amount Due</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 tracking-tight">
                    {formatCurrency(totalCents)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* 3. When Idle: Real-time Store Pulse & Digital QR Pay Stand */
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-white/[0.08]">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Today's Gross Sales
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                    {formatCurrency(todaySalesC)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-white/[0.08]">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Total Receipts Today
                  </p>
                  <p className="text-2xl font-mono font-bold text-sky-400 mt-1">
                    {todayTxCount} Receipts
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-white/[0.08]">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Terminal Status
                  </p>
                  <p className="text-sm font-bold text-amber-300 flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ready for Scanning</span>
                  </p>
                </div>
              </div>

              {/* Digital QR Pay Stand */}
              <div className="p-6 rounded-3xl bg-obsidian-950/90 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Accepts Cash, GCash, Maya &amp; QR Ph</span>
                  </div>
                  <h4 className="text-lg font-bold text-stone-100">
                    Fast &amp; Seamless Counter Payment
                  </h4>
                  <p className="text-xs text-stone-400 max-w-md">
                    Have your cash or digital payment app ready. Scanned items and prices will automatically appear here on this display in real time.
                  </p>
                </div>

                <div className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-lg shrink-0">
                  <div className="w-28 h-28 bg-stone-100 rounded-xl flex flex-col items-center justify-center p-2 border border-slate-300 text-stone-900 text-center">
                    <QrCode className="w-16 h-16 text-slate-900" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider mt-1 text-slate-700">
                      QR Ph / MAYA
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-stone-900 mt-1.5 uppercase">
                    Scan to Pay
                  </span>
                </div>
              </div>

              {/* Recent Sales Ticker */}
              {recentSales.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
                    Bag-ong Transaksyon sa Tindahan
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recentSales.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-obsidian-950/60 border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-stone-400 truncate">{s.invoice_number}</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(s.total_c)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-obsidian-950 shrink-0 flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>TINDA POS · Real-Time Dual Screen Engine</span>
          {!isStandalone && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-300 text-xs font-sans font-bold"
            >
              Isara ang Display
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
