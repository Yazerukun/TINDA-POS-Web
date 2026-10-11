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
  Banknote,
  DollarSign,
  PieChart,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react'
import type { CartItem, Transaction } from '../types'
import { formatCurrency, formatDateTime } from '../utils/format'
import { db } from '../db'
import { isVipActive } from '../utils/vip'

interface SalesMonitorModalProps {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  storeName?: string
  isStandalone?: boolean
}

type MonitorMode = 'CFD' | 'OWNER_HUD'

export function SalesMonitorModal({
  open,
  onClose,
  cart: initialCart,
  storeName = 'TINDA SARI-SARI & MINIMART',
  isStandalone = false
}: SalesMonitorModalProps): React.JSX.Element | null {
  const [isFullscreen, setIsFullscreen] = useState(isStandalone)
  const [mode, setMode] = useState<MonitorMode>('CFD')
  const [liveCart, setLiveCart] = useState<CartItem[]>(initialCart)
  const [lastSale, setLastSale] = useState<{
    transaction: Transaction
    change_c: number
    timestamp: number
  } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Today's aggregate metrics
  const [todaySalesC, setTodaySalesC] = useState(0)
  const [todayTxCount, setTodayTxCount] = useState(0)
  const [avgTicketC, setAvgTicketC] = useState(0)
  const [methodSplit, setMethodSplit] = useState({
    cashC: 0,
    gcashC: 0,
    mayaC: 0,
    maribankC: 0,
    utangC: 0
  })
  const [todaySales, setTodaySales] = useState<Transaction[]>([])
  const isVip = isVipActive()

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
      const count = todays.length
      const avg = count > 0 ? Math.round(totalC / count) : 0

      let cashC = 0
      let gcashC = 0
      let mayaC = 0
      let maribankC = 0
      let utangC = 0

      for (const tx of todays) {
        if (tx.payments && tx.payments.length > 0) {
          for (const p of tx.payments) {
            if (p.method === 'CASH') cashC += p.amount_c || 0
            else if (p.method === 'GCASH') gcashC += p.amount_c || 0
            else if (p.method === 'MAYA') mayaC += p.amount_c || 0
            else if (p.method === 'MARIBANK') maribankC += p.amount_c || 0
            else if (p.method === 'UTANG') utangC += p.amount_c || 0
          }
        } else {
          const m = tx.payment_method
          const amt = tx.total_c || 0
          if (m === 'CASH') cashC += amt
          else if (m === 'GCASH') gcashC += amt
          else if (m === 'MAYA') mayaC += amt
          else if (m === 'MARIBANK') maribankC += amt
          else if (m === 'UTANG') utangC += amt
        }
      }

      setTodaySalesC(totalC)
      setTodayTxCount(count)
      setAvgTicketC(avg)
      setMethodSplit({ cashC, gcashC, mayaC, maribankC, utangC })
      setTodaySales(todays.slice().reverse())
    } catch (err) {
      console.error('Failed to load metrics:', err)
    }
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
        isFullscreen || isStandalone ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      } bg-obsidian-950/90 backdrop-blur-md animate-fade-in select-none`}
    >
      <div
        className={`relative w-full ${
          isFullscreen || isStandalone
            ? 'h-screen max-w-none rounded-none'
            : 'max-w-5xl max-h-[94vh] rounded-2xl sm:rounded-3xl'
        } bg-obsidian-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-obsidian-950 shrink-0 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-glow-sky shrink-0">
              <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-stone-100 uppercase tracking-wider">
                  {mode === 'CFD' ? 'Customer Facing Display' : 'Owner Real-Time Sales HUD'}
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {mode === 'CFD' ? 'POLE DISPLAY' : 'LIVE TELEMETRY'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>Terminal TRM-8891</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Synchronized
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mode Switcher Pill */}
            <div className="flex items-center p-0.5 bg-obsidian-900 border border-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('CFD')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
                  mode === 'CFD'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Customer View
              </button>
              <button
                type="button"
                onClick={() => setMode('OWNER_HUD')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  mode === 'OWNER_HUD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Activity className="w-3 h-3 text-amber-300" />
                <span>Owner HUD</span>
              </button>
            </div>

            {!isStandalone && (
              <button
                type="button"
                onClick={openDedicatedTab}
                title="Open in dedicated tab for secondary monitor"
                className="btn-press hidden md:flex px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Pop-out Window</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-gradient-to-b from-obsidian-950 via-obsidian-900 to-obsidian-950">
          
          {/* Top Banner: Store Branding and Live Clock */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-4 gap-3">
            <div>
              <p className="font-serif text-lg sm:text-2xl font-bold tracking-widest uppercase text-stone-100">
                {storeName}
              </p>
              <p className="text-xs text-emerald-400 font-sans font-medium flex items-center gap-1.5 mt-0.5">
                <span>Welcome! Thank you for shopping with us.</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              </p>
            </div>

            <div className="flex items-center gap-2 bg-obsidian-950 px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-xs font-mono text-stone-300 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* MODE 1: CUSTOMER FACING DISPLAY (CFD) */}
          {mode === 'CFD' && (
            <div className="space-y-6 animate-fade-in">
              {/* Celebratory Change Due Announcement Banner */}
              {lastSale && (
                <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/40 to-obsidian-900 border-2 border-emerald-400/80 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in-95 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Transaction Completed ({lastSale.transaction.invoice_number})
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 px-2 py-0.5 rounded bg-emerald-500/20 font-bold">
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
                        Total Bill: {formatCurrency(lastSale.transaction.total_c)}
                      </p>
                    </div>

                    <div className="bg-obsidian-950/80 p-4 rounded-2xl border border-emerald-500/40 text-left sm:text-right">
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

              {/* Active Ringing Items or Idle QR Stand */}
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
                              @{formatCurrency(item.unit_price_c)} each
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
                  <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-obsidian-850 border border-emerald-500/40 flex items-center justify-between shadow-glow-emerald">
                    <div>
                      <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest font-sans">
                        Total Amount Due ({totalItems} Items)
                      </p>
                      <p className="text-xs text-stone-400 font-sans mt-0.5">Please prepare payment</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl sm:text-5xl font-mono font-black text-emerald-400 tracking-tight">
                        {formatCurrency(totalCents)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* When Idle: Payment Acceptance Stand */
                <div className="space-y-6 py-2">
                  <div className="p-6 rounded-3xl bg-obsidian-950/90 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center sm:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Cash, GCash, Maya, MariBank &amp; QR Ph</span>
                      </div>
                      <h4 className="text-lg font-bold text-stone-100">
                        Fast &amp; Seamless Checkout Counter
                      </h4>
                      <p className="text-xs text-stone-400 max-w-md">
                        Please have your payment ready. As items are scanned by the cashier, your itemized receipt and total will appear here in real time.
                      </p>
                    </div>

                    <div className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-lg shrink-0">
                      <div className="w-28 h-28 bg-stone-100 rounded-xl flex flex-col items-center justify-center p-2 border border-slate-300 text-stone-900 text-center">
                        <QrCode className="w-16 h-16 text-slate-900" />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider mt-1 text-slate-700">
                          QR Ph Accepted
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-stone-900 mt-1.5 uppercase">
                        Scan to Pay
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: OWNER REAL-TIME SALES HUD */}
          {mode === 'OWNER_HUD' && (
            <div className="space-y-6 animate-fade-in">
              {/* Aggregate KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-emerald-500/30 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Today's Net Sales
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
                    {formatCurrency(todaySalesC)}
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">Updated in real-time</p>
                </div>

                <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-sky-500/30 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Transactions
                    </span>
                    <Receipt className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-mono font-black text-sky-400">
                    {todayTxCount} <span className="text-xs font-normal text-stone-400">receipts</span>
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">Total paid orders today</p>
                </div>

                <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-amber-500/30 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Average Ticket
                    </span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-mono font-black text-amber-300">
                    {formatCurrency(avgTicketC)}
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">Per transaction average</p>
                </div>

                <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-purple-500/30 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      System Status
                    </span>
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live &amp; Synced</span>
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">Dexie DB + Cloud Active</p>
                </div>
              </div>

              {/* Payment Tender Split Breakdown */}
              <div className="p-5 rounded-2xl sm:rounded-3xl bg-obsidian-950/80 border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-200 uppercase tracking-wider flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-sky-400" />
                    <span>Payment Tender Split</span>
                  </h4>
                  <span className="text-[11px] text-stone-400 font-mono">
                    Total: {formatCurrency(todaySalesC)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-xl bg-obsidian-900 border border-emerald-500/20">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 block">Cash</span>
                    <p className="text-sm sm:text-base font-mono font-bold text-stone-100 mt-0.5">
                      {formatCurrency(methodSplit.cashC)}
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {todaySalesC > 0 ? Math.round((methodSplit.cashC / todaySalesC) * 100) : 0}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-obsidian-900 border border-sky-500/20">
                    <span className="text-[10px] font-bold uppercase text-sky-400 block">GCash</span>
                    <p className="text-sm sm:text-base font-mono font-bold text-stone-100 mt-0.5">
                      {formatCurrency(methodSplit.gcashC)}
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {todaySalesC > 0 ? Math.round((methodSplit.gcashC / todaySalesC) * 100) : 0}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-obsidian-900 border border-teal-500/20">
                    <span className="text-[10px] font-bold uppercase text-teal-400 block">Maya</span>
                    <p className="text-sm sm:text-base font-mono font-bold text-stone-100 mt-0.5">
                      {formatCurrency(methodSplit.mayaC)}
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {todaySalesC > 0 ? Math.round((methodSplit.mayaC / todaySalesC) * 100) : 0}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-obsidian-900 border border-amber-500/20">
                    <span className="text-[10px] font-bold uppercase text-amber-400 block">MariBank</span>
                    <p className="text-sm sm:text-base font-mono font-bold text-stone-100 mt-0.5">
                      {formatCurrency(methodSplit.maribankC)}
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {todaySalesC > 0 ? Math.round((methodSplit.maribankC / todaySalesC) * 100) : 0}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-obsidian-900 border border-rose-500/20 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-rose-400 block">Utang / Credit</span>
                    <p className="text-sm sm:text-base font-mono font-bold text-stone-100 mt-0.5">
                      {formatCurrency(methodSplit.utangC)}
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {todaySalesC > 0 ? Math.round((methodSplit.utangC / todaySalesC) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Transaction Stream */}
              <div className="p-5 rounded-2xl sm:rounded-3xl bg-obsidian-950/80 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-200 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time Sales Activity Stream</span>
                  </h4>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {todaySales.length} Transactions
                  </span>
                </div>

                {todaySales.length === 0 ? (
                  <div className="py-8 text-center text-stone-500 text-xs font-mono">
                    No transactions recorded today yet. Completed orders will appear here immediately.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {todaySales.map((tx) => (
                      <div
                        key={tx.id || tx.invoice_number}
                        className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900/90 border border-white/[0.05] text-xs font-mono hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-stone-300">
                            {tx.created_at ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                          <span className="font-bold text-stone-200 truncate">
                            {tx.invoice_number}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/20">
                            {tx.payment_method}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-stone-400">
                            {tx.items?.length || 0} items
                          </span>
                          <span className="font-bold font-mono text-emerald-400 text-sm">
                            {formatCurrency(tx.total_c)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/[0.08] bg-obsidian-950 shrink-0 flex items-center justify-between text-xs text-stone-500 font-mono">
          <div className="flex items-center gap-2">
            <span>TINDA POS · Real-Time Dual Screen Engine</span>
            {isVip && (
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PRO ACTIVE
              </span>
            )}
          </div>
          {!isStandalone && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-300 text-xs font-sans font-bold transition-all"
            >
              Close Display
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
