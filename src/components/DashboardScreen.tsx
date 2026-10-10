import React, { useMemo, useState } from 'react'
import {
  TrendingUp,
  Banknote,
  Wallet,
  ShoppingCart,
  AlertTriangle,
  Package,
  PlusCircle,
  Users,
  BarChart3,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  CalendarClock,
  Receipt,
  Store,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react'
import type { Product, Transaction, Customer, StoreSettings, Expense } from '../types'
import { money, moneyShort, formatDateTime } from '../utils/format'
import type { ActiveTab } from './Navigation'

interface DashboardScreenProps {
  products: Product[]
  transactions: Transaction[]
  customers: Customer[]
  expenses?: Expense[]
  settings: StoreSettings
  onNavigate: (tab: ActiveTab) => void
  onQuickRestock?: (product: Product, addQty: number) => void
  onOpenPriceGuide?: () => void
  onOpenExpiration?: () => void
  cashierName?: string
  storeName?: string
  openingFloat_c?: number
}

export function DashboardScreen({
  products,
  transactions,
  customers,
  expenses = [],
  settings,
  onNavigate,
  onQuickRestock,
  onOpenPriceGuide,
  onOpenExpiration,
  cashierName = 'Store Cashier',
  storeName = 'Store Counter',
  openingFloat_c = 200000
}: DashboardScreenProps): React.JSX.Element {
  // Today's date string prefix: YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Filter today's transactions
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.created_at && t.created_at.startsWith(todayStr))
  }, [transactions, todayStr])

  // Financial calculations
  const { todayGrossSales_c, todayProfit_c, todayItemsSold, todayCashSales_c } = useMemo(() => {
    let sales = 0
    let profit = 0
    let items = 0
    let cashSales = 0

    // Build cost lookup map
    const productCostMap = new Map<number, number>()
    products.forEach((p) => {
      productCostMap.set(p.id, p.cost_c || 0)
    })

    todayTransactions.forEach((tx) => {
      const txTotal = tx.total_c || 0
      sales += txTotal
      if (tx.payment_method === 'CASH') {
        cashSales += txTotal
      }

      if (tx.items) {
        tx.items.forEach((item) => {
          items += item.quantity
          const unitCost = productCostMap.get(item.product_id) || 0
          const itemProfit = item.total_c - (unitCost * item.quantity)
          profit += itemProfit
        })
      }
    })

    return {
      todayGrossSales_c: sales,
      todayProfit_c: profit > 0 ? profit : Math.round(sales * 0.25),
      todayItemsSold: items,
      todayCashSales_c: cashSales
    }
  }, [todayTransactions, products])

  // Today's expenses
  const todayExpenses_c = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + (e.amount_c || 0), 0)
  }, [expenses, todayStr])

  // Net Profit after operating expenses
  const netProfitAfterExpenses_c = useMemo(() => {
    return Math.max(0, todayProfit_c - todayExpenses_c)
  }, [todayProfit_c, todayExpenses_c])

  // Profit Margin percentage
  const profitMarginPercent = useMemo(() => {
    if (todayGrossSales_c <= 0) return 0
    return ((netProfitAfterExpenses_c / todayGrossSales_c) * 100).toFixed(1)
  }, [netProfitAfterExpenses_c, todayGrossSales_c])

  // Live estimated cash in drawer
  const estimatedDrawerCash_c = useMemo(() => {
    return Math.max(0, openingFloat_c + todayCashSales_c - todayExpenses_c)
  }, [openingFloat_c, todayCashSales_c, todayExpenses_c])

  // Total Customer Utang (Receivables)
  const totalUtang_c = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.balance_c || 0), 0)
  }, [customers])

  // Low stock and out-of-stock items
  const lowThreshold = settings.default_low_stock ?? 5

  const { outOfStockProducts, lowStockProducts, healthyCount } = useMemo(() => {
    const active = products.filter((p) => p.status !== 'ARCHIVED')
    const out = active.filter((p) => p.stock <= 0)
    const low = active.filter((p) => {
      const thresh = p.low_stock_threshold !== undefined && p.low_stock_threshold !== null ? p.low_stock_threshold : lowThreshold
      return p.stock > 0 && p.stock <= thresh
    })
    const healthy = active.length - out.length - low.length

    return {
      outOfStockProducts: out,
      lowStockProducts: low,
      healthyCount: healthy
    }
  }, [products, lowThreshold])

  const totalAlertCount = outOfStockProducts.length + lowStockProducts.length

  // Quick Restock modal state
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null)
  const [restockQty, setRestockQty] = useState<number>(10)

  const handleRestockClick = (p: Product) => {
    if (onQuickRestock) {
      setRestockModalProduct(p)
      setRestockQty(10)
    } else {
      onNavigate('inventory')
    }
  }

  const handleConfirmRestock = () => {
    if (restockModalProduct && onQuickRestock && restockQty > 0) {
      onQuickRestock(restockModalProduct, restockQty)
      setRestockModalProduct(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in font-sans">

      {/* ── TOP HERO HEADER RIBBON (Tailark Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-2xl shadow-xl relative overflow-hidden">
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-mono font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Register Shift Active
            </span>
            <span className="text-stone-500 text-xs">•</span>
            <span className="text-xs font-mono text-stone-400">
              {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-100">
            Welcome back, <span className="text-emerald-400">{cashierName}</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Store Counter: <span className="text-stone-200 font-medium">{storeName}</span> · All terminals synchronized.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs tracking-wider uppercase shadow-glow-emerald transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Counter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── BENTO ROW 1: EXECUTIVE FINANCIAL & DRAWER PULSE (5-GRID) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">

        {/* 1. Today's Net Sales */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 font-medium">
              Gross Sales Today
            </span>
            <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100 tabular-nums">
              {money(todayGrossSales_c)}
            </p>
            <p className="text-xs text-stone-400 font-mono mt-1">
              {todayTransactions.length} orders · {todayItemsSold} sold
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[0.6875rem] text-stone-500">
            <span>Cash: {money(todayCashSales_c)}</span>
            <span className="text-emerald-400 font-mono">Live</span>
          </div>
        </div>

        {/* 2. Estimated Net Profit & Margin */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 font-medium">
              Net Profit Today
            </span>
            <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {profitMarginPercent}% Margin
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400 tabular-nums">
              {money(netProfitAfterExpenses_c)}
            </p>
            <p className="text-xs text-stone-400 font-mono mt-1">
              After COGS & expenses
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[0.6875rem] text-stone-500">
            <span>Expenses: {money(todayExpenses_c)}</span>
            <span className="text-stone-400">Net Return</span>
          </div>
        </div>

        {/* 3. Physical Cash in Drawer */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 font-medium">
              Cash in Drawer
            </span>
            <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-xs">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-300 tabular-nums">
              {money(estimatedDrawerCash_c)}
            </p>
            <p className="text-xs text-stone-400 font-mono mt-1">
              Starting Float: {money(openingFloat_c)}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[0.6875rem] text-stone-500">
            <button
              onClick={() => onNavigate('analytics')}
              className="text-emerald-400 hover:underline font-mono"
            >
              Drawer X-Read →
            </button>
            <span className="text-stone-500 font-mono">Tender Ready</span>
          </div>
        </div>

        {/* 4. Customer Credit (Utang Receivables) */}
        <button
          onClick={() => onNavigate('customers')}
          className="p-5 rounded-2xl bg-zinc-900/50 border border-white/[0.08] hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 font-medium">
              Customer Utang
            </span>
            <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <p className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${totalUtang_c > 0 ? 'text-amber-400' : 'text-stone-300'}`}>
              {money(totalUtang_c)}
            </p>
            <p className="text-xs text-stone-400 font-mono mt-1">
              {customers.filter((c) => c.balance_c > 0).length} accounts with balance
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[0.6875rem] text-stone-500">
            <span className="text-amber-400 group-hover:underline font-mono">Open Ledger →</span>
            <span className="text-stone-500">Collect</span>
          </div>
        </button>

        {/* 5. Active Inventory Health */}
        <button
          onClick={() => onNavigate('inventory')}
          className="col-span-2 sm:col-span-1 p-5 rounded-2xl bg-zinc-900/50 border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between shadow-sm text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 font-medium">
              Active Catalog
            </span>
            <span className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100 tabular-nums">
              {products.length} <span className="text-sm font-normal text-stone-500">SKUs</span>
            </p>
            <p className="text-xs text-stone-400 font-mono mt-1">
              {totalAlertCount > 0 ? (
                <span className="text-amber-400 font-semibold">{totalAlertCount} need attention</span>
              ) : (
                <span className="text-emerald-400 font-semibold">All healthy stock</span>
              )}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[0.6875rem] text-stone-500">
            <span className="text-emerald-400 group-hover:underline font-mono">Restock →</span>
            <span className="text-stone-500">{healthyCount} Healthy</span>
          </div>
        </button>

      </div>

      {/* ── BENTO ROW 2: OPERATIONS, SHORTCUTS & LIVE ACTIVITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: LOW STOCK WATCHLIST & LIVE RECEIPTS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Low Stock Watchlist Bento */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-100">Stock &amp; Inventory Watchlist</h2>
                  <p className="text-[0.6875rem] text-stone-400">Items below minimum threshold ({lowThreshold} units)</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 transition-colors"
              >
                <span>All Catalog ({products.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {totalAlertCount === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-medium text-stone-200">
                  Inventory is in optimal stock condition
                </p>
                <p className="text-xs text-stone-500 font-mono max-w-sm mx-auto">
                  All active items are above threshold levels. No stock shortages detected today.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {outOfStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-red-500/[0.06] border border-red-500/25 flex items-center justify-between gap-3 hover:bg-red-500/[0.09] transition-all"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                        !
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-100 truncate">{p.name}</p>
                        <p className="text-[0.6875rem] text-red-400 font-mono">
                          0 {p.base_unit || 'pcs'} remaining · Out of Stock
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestockClick(p)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold font-mono transition-all shrink-0 cursor-pointer"
                    >
                      Restock +
                    </button>
                  </div>
                ))}

                {lowStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/25 flex items-center justify-between gap-3 hover:bg-amber-500/[0.09] transition-all"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {p.stock}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-100 truncate">{p.name}</p>
                        <p className="text-[0.6875rem] text-stone-400 font-mono">
                          {p.stock} {p.base_unit || 'pcs'} left · Threshold: {p.low_stock_threshold ?? lowThreshold}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestockClick(p)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold font-mono transition-all shrink-0 cursor-pointer"
                    >
                      Restock +
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Invoices Live Stream */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-100">Recent Terminal Invoices</h2>
                  <p className="text-[0.6875rem] text-stone-400">Live transaction stream across cashiers</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 transition-colors"
              >
                <span>Full History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayTransactions.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <ShoppingCart className="w-8 h-8 text-stone-500 mx-auto" />
                <p className="text-sm text-stone-300 font-medium">No sales recorded yet today</p>
                <p className="text-xs text-stone-500 font-mono">
                  Orders completed at the POS Counter will appear in this real-time stream.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTransactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-stone-200">{tx.invoice_number}</span>
                        <span className={`text-[0.625rem] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                          tx.payment_method === 'CASH'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : tx.payment_method === 'GCASH'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {tx.payment_method}
                        </span>
                      </div>
                      <p className="text-[0.6875rem] text-stone-400 font-mono mt-0.5">
                        {tx.created_at ? formatDateTime(tx.created_at) : 'Today'} · {tx.items?.length || 0} items
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-emerald-400">
                        {money(tx.total_c)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SHIFT PULSE & FAST TOOLS DOCK (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Active Shift & Cash Drawer Pulse Bento */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                {cashierName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-stone-100 truncate">{cashierName}</p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[0.625rem] font-mono font-bold uppercase border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-xs font-mono text-stone-400 mt-0.5 truncate flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{storeName}</span>
                </p>
              </div>
            </div>

            {/* Shift Financial Telemetry Table */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-stone-400">
                <span>Opening Cash Float</span>
                <span className="text-stone-200">{money(openingFloat_c)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>Today's Cash Taken</span>
                <span className="text-emerald-400 font-semibold">+{money(todayCashSales_c)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>Recorded Expenses</span>
                <span className="text-red-400 font-semibold">-{money(todayExpenses_c)}</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-sm font-bold">
                <span className="text-stone-300">Expected Drawer Balance</span>
                <span className="text-amber-300 text-base">{money(estimatedDrawerCash_c)}</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('analytics')}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-semibold text-stone-300 hover:text-white transition-all text-center cursor-pointer"
            >
              Generate Shift Z-Reading →
            </button>
          </div>

          {/* Quick Operations Bento Dock (6 Grid) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-3">
            <p className="text-[0.6875rem] font-mono uppercase tracking-wider text-stone-400 font-semibold">
              Fast Operations Dock
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Counter POS */}
              <button
                onClick={() => onNavigate('pos')}
                className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-stone-200">POS Counter</p>
                <p className="text-[0.6875rem] text-stone-500 font-mono">Ring Up Sale</p>
              </button>

              {/* 2. Inventory */}
              <button
                onClick={() => onNavigate('inventory')}
                className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Package className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-stone-200">Inventory</p>
                <p className="text-[0.6875rem] text-stone-500 font-mono">Manage Stock</p>
              </button>

              {/* 3. DTI Price Guide */}
              <button
                onClick={() => onOpenPriceGuide && onOpenPriceGuide()}
                className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-emerald-400">DTI Price Guide</p>
                <p className="text-[0.6875rem] text-stone-500 font-mono">Bantay Presyo</p>
              </button>

              {/* 4. Expenses */}
              <button
                onClick={() => onNavigate('expenses')}
                className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/40 hover:bg-red-500/[0.04] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Receipt className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-stone-200">Expenses</p>
                <p className="text-[0.6875rem] text-stone-500 font-mono">Record Outflow</p>
              </button>

              {/* 5. Expiration Radar */}
              <button
                onClick={() => onOpenExpiration && onOpenExpiration()}
                className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/40 hover:bg-amber-500/[0.04] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-stone-200">Shelf Life</p>
                <p className="text-[0.6875rem] text-stone-500 font-mono">Expiry Watch</p>
              </button>

              {/* 6. Reports & Analytics */}
              <button
                onClick={() => onNavigate('analytics')}
                className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-stone-200">Z-Readings</p>
                <p className="text-[0.6875rem] text-stone-500 font-mono">End of Shift</p>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ── FAST RESTOCK MODAL DIALOG ── */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[0.6875rem] font-mono tracking-wider uppercase text-emerald-400">Fast Restock Terminal</p>
                <h3 className="text-base font-semibold text-stone-100 mt-1">{restockModalProduct.name}</h3>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                Current: {restockModalProduct.stock} {restockModalProduct.base_unit || 'pcs'}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-stone-300">
                Units to Add (+{restockModalProduct.base_unit || 'pcs'})
              </label>

              <div className="flex items-center gap-2">
                {[5, 10, 20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setRestockQty(preset)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      restockQty === preset
                        ? 'bg-emerald-500 text-zinc-950 shadow-glow-emerald'
                        : 'bg-white/[0.04] text-stone-300 hover:bg-white/[0.08] border border-white/[0.08]'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              <div className="relative mt-2">
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-12 bg-zinc-900 border border-white/[0.1] rounded-xl px-4 text-center font-mono text-xl font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <p className="text-xs text-stone-400 text-center font-mono">
                New inventory level will be:{' '}
                <strong className="text-emerald-400 font-bold">
                  {restockModalProduct.stock + (restockQty || 0)} {restockModalProduct.base_unit || 'pcs'}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestockModalProduct(null)}
                className="flex-1 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-stone-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-xs font-bold uppercase tracking-wider shadow-glow-emerald transition-all cursor-pointer"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
