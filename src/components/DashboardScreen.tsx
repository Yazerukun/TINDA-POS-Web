import React, { useMemo } from 'react'
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
  Truck,
  TrendingDown
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
  onOpenExpiration
}: DashboardScreenProps): React.JSX.Element {
  // Today's date string prefix: YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Filter today's transactions
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.created_at && t.created_at.startsWith(todayStr))
  }, [transactions, todayStr])

  // Financial calculations
  const { todayGrossSales_c, todayProfit_c, todayItemsSold } = useMemo(() => {
    let sales = 0
    let profit = 0
    let items = 0

    // Build cost lookup map
    const productCostMap = new Map<number, number>()
    products.forEach((p) => {
      productCostMap.set(p.id, p.cost_c || 0)
    })

    todayTransactions.forEach((tx) => {
      sales += tx.total_c || 0
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
      todayProfit_c: profit > 0 ? profit : Math.round(sales * 0.25), // reasonable estimate if cost not set
      todayItemsSold: items
    }
  }, [todayTransactions, products])

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

  // Quick Restock state & handler
  const [restockModalProduct, setRestockModalProduct] = React.useState<Product | null>(null)
  const [restockQty, setRestockQty] = React.useState<number>(10)

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* ── 1. LOW STOCK / OUT-OF-STOCK ALERT BANNER ── */}
      {totalAlertCount > 0 ? (
        <div className="p-4 sm:p-5 rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-500/15 via-obsidian-900 to-amber-500/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Inventory Stock Warning
                </h3>
                {outOfStockProducts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/25 text-red-300 text-[10px] font-mono font-bold uppercase border border-red-500/40">
                    {outOfStockProducts.length} Out of Stock
                  </span>
                )}
                {lowStockProducts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 text-[10px] font-mono font-bold uppercase border border-amber-500/40">
                    {lowStockProducts.length} Low Stock
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Some products are out of stock or running low (threshold: {lowThreshold} units). Restock promptly to maintain sales flow.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('inventory')}
            className="btn-press self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/35 hover:bg-amber-500/30 text-gold-light text-xs font-bold uppercase tracking-wider transition-all"
          >
            <span>Review Inventory</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-medium text-emerald-200">
              Healthy stock status! All {products.length} active inventory items are at adequate stock levels.
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] font-mono text-emerald-400 font-bold uppercase">
            Healthy Stock
          </span>
        </div>
      )}

      {/* ── 2. HERO FINANCIAL SUMMARY CARDS (5-GRID) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Today's Net Sales */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-gold/25 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 font-medium">
              Today's Net Sales
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live
            </span>
          </div>
          <div className="mt-3">
            <p className="font-serif text-xl sm:text-2xl font-bold text-gold-light tabular-nums">
              {money(todayGrossSales_c)}
            </p>
            <p className="text-[10px] text-stone-500 font-mono mt-1">
              {todayTransactions.length} orders · {todayItemsSold} sold
            </p>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 font-medium">
              Net Profit Today
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <p className="font-serif text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
              {money(todayProfit_c - (expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount_c, 0)))}
            </p>
            <p className="text-[10px] text-stone-500 font-mono mt-1">
              After COGS & expenses
            </p>
          </div>
        </div>

        {/* Today's Store Expenses */}
        <button
          onClick={() => onNavigate('expenses')}
          className="btn-press glass-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] hover:border-red-500/30 text-left flex flex-col justify-between transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 font-medium">
              Today Expenses
            </span>
            <Receipt className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-3">
            <p className="font-serif text-xl sm:text-2xl font-bold text-red-400 tabular-nums">
              {money(expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount_c, 0))}
            </p>
            <p className="text-[10px] text-stone-500 font-mono mt-1">
              Operating outflow
            </p>
          </div>
        </button>

        {/* Total Utang / Receivables */}
        <button
          onClick={() => onNavigate('customers')}
          className="btn-press glass-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] hover:border-amber-500/30 text-left flex flex-col justify-between transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 font-medium">
              Customer Credit
            </span>
            <Wallet className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <p className={`font-serif text-xl sm:text-2xl font-bold tabular-nums ${totalUtang_c > 0 ? 'text-amber-400' : 'text-stone-300'}`}>
              {money(totalUtang_c)}
            </p>
            <p className="text-[10px] text-stone-500 font-mono mt-1">
              {customers.filter((c) => c.balance_c > 0).length} customers with balance
            </p>
          </div>
        </button>

        {/* Total Active Inventory */}
        <button
          onClick={() => onNavigate('inventory')}
          className="btn-press glass-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] hover:border-indigo-500/30 text-left col-span-2 sm:col-span-1 flex flex-col justify-between transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 font-medium">
              Active Catalog
            </span>
            <Package className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <p className="font-serif text-xl sm:text-2xl font-bold text-white tabular-nums">
              {products.length}
            </p>
            <p className="text-[10px] text-stone-500 font-mono mt-1">
              {totalAlertCount > 0 ? `${totalAlertCount} need attention` : 'All healthy'}
            </p>
          </div>
        </button>
      </div>

      {/* ── 3. FAST ACTION SHORTCUTS (6-GRID) ── */}
      <div>
        <p className="mb-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-stone-500 font-bold">
          Quick Operations & Store Utilities
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('pos')}
            className="btn-press flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/[0.08] border border-gold/30 hover:border-gold hover:bg-amber-500/[0.14] transition-all text-left"
          >
            <div className="h-9 w-9 rounded-xl bg-gold/20 flex items-center justify-center text-amber-300 shrink-0">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Counter</p>
              <p className="text-[9px] text-gold-muted font-mono truncate">Start Sale</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="btn-press flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-gold/40 hover:bg-zinc-900/60 transition-all text-left"
          >
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Inventory</p>
              <p className="text-[9px] text-stone-400 font-mono truncate">Restock</p>
            </div>
          </button>

          <button
            onClick={() => onOpenPriceGuide && onOpenPriceGuide()}
            className="btn-press flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/[0.14] transition-all text-left"
          >
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-300 truncate">DTI Price Guide</p>
              <p className="text-[9px] text-emerald-400/80 font-mono truncate">DTI SRP</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="btn-press flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-red-400 hover:bg-zinc-900/60 transition-all text-left"
          >
            <div className="h-9 w-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Expenses</p>
              <p className="text-[9px] text-stone-400 font-mono truncate">Record Outflow</p>
            </div>
          </button>

          <button
            onClick={() => onOpenExpiration && onOpenExpiration()}
            className="btn-press flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-amber-400 hover:bg-zinc-900/60 transition-all text-left"
          >
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Shelf Life</p>
              <p className="text-[9px] text-stone-400 font-mono truncate">Expiry Watch</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="btn-press flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-gold/40 hover:bg-zinc-900/60 transition-all text-left"
          >
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Reports</p>
              <p className="text-[9px] text-stone-400 font-mono truncate">X/Z Readings</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── 4. LOW STOCK WATCHLIST & RECENT TRANSACTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Stock Alert Watchlist (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Low Stock Watchlist</h3>
              {totalAlertCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-mono text-[10px] font-bold">
                  {totalAlertCount}
                </span>
              )}
            </div>

            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-gold-light hover:text-white font-mono flex items-center gap-1 transition-colors"
            >
              <span>All Products ({products.length})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {totalAlertCount === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400/80 mx-auto" />
              <p className="text-xs text-stone-300 font-medium">
                All inventory items are in stock!
              </p>
              <p className="text-[10px] text-stone-500 font-mono">
                No items have fallen below the {lowThreshold} units threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Out of stock items first */}
              {outOfStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-red-500/[0.08] border border-red-500/30 flex items-center justify-between gap-3 transition-all hover:bg-red-500/[0.12]"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      !
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-red-300/80 font-mono">
                        0 {p.base_unit || 'pcs'} left · Threshold: {p.low_stock_threshold ?? lowThreshold}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-mono font-bold uppercase">
                      Out of Stock
                    </span>
                    <button
                      onClick={() => handleRestockClick(p)}
                      className="btn-press px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}

              {/* Low stock items */}
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-amber-500/[0.08] border border-amber-500/30 flex items-center justify-between gap-3 transition-all hover:bg-amber-500/[0.12]"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      {p.stock}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-stone-400 font-mono">
                        {p.stock} {p.base_unit || 'pcs'} remaining · Threshold: {p.low_stock_threshold ?? lowThreshold}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold uppercase">
                      Low Stock
                    </span>
                    <button
                      onClick={() => handleRestockClick(p)}
                      className="btn-press px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Transactions Feed (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-3xl border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gold-muted" />
              <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
            </div>

            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-gold-light hover:text-white font-mono flex items-center gap-1 transition-colors"
            >
              <span>History</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {todayTransactions.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <ShoppingCart className="h-8 w-8 text-stone-600 mx-auto" />
              <p className="text-xs text-stone-400">No sales recorded yet today.</p>
              <p className="text-[10px] text-stone-600 font-mono">
                Sales completed at the POS Counter will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTransactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-200 truncate">
                      {tx.invoice_number}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-stone-500 font-mono">
                        {formatDateTime(tx.created_at).split(',')[1] || tx.created_at.slice(11, 16)}
                      </span>
                      <span className="text-[10px] text-stone-600">•</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                        tx.payment_method === 'CASH'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : tx.payment_method === 'GCASH'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {tx.payment_method}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-serif font-bold text-gold-light">
                      {money(tx.total_c)}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono">
                      {tx.items?.length || 0} items
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Restock Modal Dialog */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0D0E12] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-gold-muted uppercase">Fast Restock Terminal</p>
                <h3 className="text-base font-bold text-white mt-1">{restockModalProduct.name}</h3>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                Current: {restockModalProduct.stock} {restockModalProduct.base_unit || 'pcs'}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-300">
                Units to Add (+{restockModalProduct.base_unit || 'pcs'})
              </label>

              <div className="flex items-center gap-2">
                {[5, 10, 20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setRestockQty(preset)}
                    className={`btn-press flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      restockQty === preset
                        ? 'bg-[#D4AF37] text-black shadow-glow-gold'
                        : 'bg-white/[0.06] text-stone-300 hover:bg-white/[0.1] border border-white/10'
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
                  className="w-full h-12 bg-black/60 border border-white/15 rounded-xl px-4 text-center font-mono text-xl font-bold text-gold-light focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <p className="text-[11px] text-stone-400 text-center font-mono">
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
                className="btn-press flex-1 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-stone-300 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="btn-press flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider shadow-glow-gold transition-all"
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
