import React, { useMemo, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  ArrowUpRight,
  Coins,
  FileText,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Sparkles,
  Save
} from 'lucide-react'
import type { Transaction, Expense, Product, StoreSettings, CashCountRecord } from '../types'
import { db } from '../db'
import { money, formatDateTime } from '../utils/format'

interface AnalyticsScreenProps {
  transactions: Transaction[]
  expenses?: Expense[]
  products?: Product[]
  settings?: StoreSettings
  cashierName?: string
}

type AnalyticsTab = 'SALES' | 'CASHCOUNT' | 'READINGS'

const DENOMINATIONS = [
  { label: '₱1,000 Bill', cents: 100000, key: '1000' },
  { label: '₱500 Bill', cents: 50000, key: '500' },
  { label: '₱200 Bill', cents: 20000, key: '200' },
  { label: '₱100 Bill', cents: 10000, key: '100' },
  { label: '₱50 Bill', cents: 5000, key: '50' },
  { label: '₱20 Bill / Coin', cents: 2000, key: '20' },
  { label: '₱10 Coin', cents: 1000, key: '10' },
  { label: '₱5 Coin', cents: 500, key: '5' },
  { label: '₱1 Coin', cents: 100, key: '1' },
  { label: '25¢ Coin', cents: 25, key: '0.25' }
]

export function AnalyticsScreen({
  transactions,
  expenses = [],
  products = [],
  settings,
  cashierName = 'Master Admin'
}: AnalyticsScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('SALES')
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Cash count state
  const [counts, setCounts] = useState<Record<string, number>>({
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '1': 0,
    '0.25': 0
  })
  const [cashCountSavedMessage, setCashCountSavedMessage] = useState(false)

  // Reading type
  const [readingType, setReadingType] = useState<'X' | 'Z'>('X')

  // Financial computations
  const metrics = useMemo(() => {
    const validTx = transactions.filter((t) => (t.status || 'COMPLETED') !== 'VOIDED')
    const totalSales_c = validTx.reduce((sum, t) => sum + t.total_c, 0)
    const cashSales_c = validTx.filter((t) => t.payment_method === 'CASH').reduce((sum, t) => sum + t.total_c, 0)
    const gcashSales_c = validTx.filter((t) => t.payment_method === 'GCASH').reduce((sum, t) => sum + t.total_c, 0)
    const utangSales_c = validTx.filter((t) => t.payment_method === 'UTANG').reduce((sum, t) => sum + t.total_c, 0)

    // Cost map
    const costMap = new Map<number, number>()
    products.forEach((p) => {
      costMap.set(p.id, p.cost_c || 0)
    })

    let totalCost_c = 0
    let totalItemsSold = 0

    validTx.forEach((tx) => {
      tx.items?.forEach((item) => {
        totalItemsSold += item.quantity
        const unitCost = costMap.get(item.product_id) || Math.round(item.unit_price_c * 0.75)
        totalCost_c += unitCost * item.quantity
      })
    })

    const grossProfit_c = totalSales_c - totalCost_c
    const totalExpenses_c = expenses.reduce((sum, e) => sum + (e.amount_c || 0), 0)
    const netProfit_c = grossProfit_c - totalExpenses_c

    return {
      totalSales_c,
      cashSales_c,
      gcashSales_c,
      utangSales_c,
      totalCost_c,
      grossProfit_c,
      totalExpenses_c,
      netProfit_c,
      totalOrders: validTx.length,
      totalItemsSold,
      avgOrderValue_c: validTx.length > 0 ? Math.round(totalSales_c / validTx.length) : 0
    }
  }, [transactions, expenses, products])

  // Physical cash drawer counted total
  const countedPhysicalCash_c = useMemo(() => {
    let sum = 0
    DENOMINATIONS.forEach((d) => {
      const qty = counts[d.key] || 0
      sum += qty * d.cents
    })
    return sum
  }, [counts])

  // Today's cash sales & cash expenses
  const todayCashSales_c = useMemo(() => {
    return transactions
      .filter((t) => (t.status || 'COMPLETED') !== 'VOIDED' && t.payment_method === 'CASH' && t.created_at?.startsWith(todayStr))
      .reduce((sum, t) => sum + t.total_c, 0)
  }, [transactions, todayStr])

  const todayCashExpenses_c = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + e.amount_c, 0)
  }, [expenses, todayStr])

  const expectedCashInDrawer_c = todayCashSales_c - todayCashExpenses_c
  const cashDiscrepancy_c = countedPhysicalCash_c - expectedCashInDrawer_c

  // Top selling products computation
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const t of transactions) {
      if ((t.status || 'COMPLETED') === 'VOIDED') continue
      for (const item of t.items) {
        const existing = map.get(item.name) || { name: item.name, quantity: 0, revenue: 0 }
        existing.quantity += item.quantity
        existing.revenue += item.total_c
        map.set(item.name, existing)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [transactions])

  // Save cash count
  const handleSaveCashCount = async () => {
    try {
      await db.cash_counts.add({
        business_date: todayStr,
        created_at: new Date().toISOString(),
        cashier_name: cashierName,
        denominations: counts,
        total_c: countedPhysicalCash_c,
        expected_c: expectedCashInDrawer_c,
        discrepancy_c: cashDiscrepancy_c,
        notes: `Physical cash drawer count by ${cashierName}`
      })

      setCashCountSavedMessage(true)
      setTimeout(() => setCashCountSavedMessage(false), 3000)
    } catch (err) {
      console.error('Failed to save cash count:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Store Analytics & Audit Reports
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-gold-muted border border-gold/30 px-2 py-0.5 rounded-full uppercase">
              Financial Intelligence
            </span>
          </div>
          <p className="text-xs text-stone-400 font-mono mt-1">
            Real-time profit margins, cash drawer audits, and official X/Z register readings
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950 border border-white/10">
          <button
            onClick={() => setActiveTab('SALES')}
            className={`btn-press px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
              activeTab === 'SALES'
                ? 'bg-[#D4AF37] text-black shadow-glow-gold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Sales & Margin
          </button>

          <button
            onClick={() => setActiveTab('CASHCOUNT')}
            className={`btn-press px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
              activeTab === 'CASHCOUNT'
                ? 'bg-[#D4AF37] text-black shadow-glow-gold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Cash Drawer Count
          </button>

          <button
            onClick={() => setActiveTab('READINGS')}
            className={`btn-press px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
              activeTab === 'READINGS'
                ? 'bg-[#D4AF37] text-black shadow-glow-gold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            X / Z Readings
          </button>
        </div>
      </div>

      {/* ── TAB 1: SALES & MARGIN ── */}
      {activeTab === 'SALES' && (
        <div className="space-y-6">
          {/* 4 Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-3xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">Gross Sales</span>
                <div className="h-8 w-8 rounded-xl bg-gold/15 text-gold-light flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-3 text-2xl font-serif font-black text-white">
                {money(metrics.totalSales_c)}
              </h3>
              <p className="text-[11px] text-stone-400 mt-1 font-mono">
                {metrics.totalOrders} completed orders
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">Est. Gross Profit</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-3 text-2xl font-serif font-black text-emerald-400">
                {money(metrics.grossProfit_c)}
              </h3>
              <p className="text-[11px] text-stone-400 mt-1 font-mono">
                Revenue minus item cost
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">Total Expenses</span>
                <div className="h-8 w-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-3 text-2xl font-serif font-black text-red-400">
                {money(metrics.totalExpenses_c)}
              </h3>
              <p className="text-[11px] text-stone-400 mt-1 font-mono">
                {expenses.length} operating records
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">Tinuod nga Net Margin</span>
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-3 text-2xl font-serif font-black text-gold-light">
                {money(metrics.netProfit_c)}
              </h3>
              <p className="text-[11px] text-stone-400 mt-1 font-mono">
                Gross profit minus all expenses
              </p>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] space-y-3">
              <span className="text-xs font-mono font-bold text-stone-300 uppercase tracking-wider block">
                Payment Channel Breakdown
              </span>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-white/5">
                  <span className="text-xs font-mono text-stone-300">CASH (Physical Drawer)</span>
                  <span className="font-serif font-bold text-emerald-400">{money(metrics.cashSales_c)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-white/5">
                  <span className="text-xs font-mono text-stone-300">GCASH (Digital E-Wallet)</span>
                  <span className="font-serif font-bold text-blue-400">{money(metrics.gcashSales_c)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-white/5">
                  <span className="text-xs font-mono text-stone-300">UTANG (Receivables)</span>
                  <span className="font-serif font-bold text-amber-400">{money(metrics.utangSales_c)}</span>
                </div>
              </div>
            </div>

            {/* Top 5 Best Sellers */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-white/[0.08] space-y-3">
              <span className="text-xs font-mono font-bold text-stone-300 uppercase tracking-wider block">
                Top 5 Best-Selling Products by Revenue
              </span>
              {topProducts.length === 0 ? (
                <p className="text-xs text-stone-500 font-mono py-8 text-center">Walay sales data pa.</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <div
                      key={p.name}
                      className="p-3 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-6 w-6 rounded-lg bg-gold/15 text-gold-light font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                          #{i + 1}
                        </span>
                        <span className="font-semibold text-white truncate">{p.name}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="text-stone-400">{p.quantity} units · </span>
                        <strong className="text-gold-light font-serif">{money(p.revenue)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CASH DRAWER COUNT ── */}
      {activeTab === 'CASHCOUNT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Denomination Input Table */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Philippine Peso Denomination Counter</h3>
                  <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                    Count physical bills and coins inside the cash register drawer
                  </p>
                </div>

                <button
                  onClick={() =>
                    setCounts({
                      '1000': 0,
                      '500': 0,
                      '200': 0,
                      '100': 0,
                      '50': 0,
                      '20': 0,
                      '10': 0,
                      '5': 0,
                      '1': 0,
                      '0.25': 0
                    })
                  }
                  className="btn-press text-xs font-mono text-stone-400 hover:text-stone-200"
                >
                  Clear Count
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DENOMINATIONS.map((d) => {
                  const qty = counts[d.key] || 0
                  const subtotal = qty * d.cents
                  return (
                    <div
                      key={d.key}
                      className="p-3 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white font-mono">{d.label}</p>
                        <p className="text-[10px] font-mono text-gold-muted mt-0.5">
                          = {money(subtotal)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setCounts((prev) => ({
                              ...prev,
                              [d.key]: Math.max(0, (prev[d.key] || 0) - 1)
                            }))
                          }
                          className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 font-bold flex items-center justify-center text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setCounts((prev) => ({ ...prev, [d.key]: Math.max(0, val) }))
                          }}
                          className="w-14 h-8 bg-black border border-white/15 rounded-lg text-center font-mono text-xs text-stone-100 focus:outline-none focus:border-[#D4AF37]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCounts((prev) => ({
                              ...prev,
                              [d.key]: (prev[d.key] || 0) + 1
                            }))
                          }
                          className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 font-bold flex items-center justify-center text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Col: Drawer Audit Reconciliation */}
            <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white">Drawer Audit Summary</h3>
                  <p className="text-[10px] font-mono text-stone-400 mt-0.5">Shift Cash Reconciliation</p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10">
                    <p className="text-[10px] text-stone-400 uppercase">Actual Physical Cash Counted</p>
                    <p className="text-2xl font-serif font-black text-gold-light mt-1">
                      {money(countedPhysicalCash_c)}
                    </p>
                  </div>

                  <div className="flex justify-between text-stone-400 pt-1">
                    <span>Today's Cash Sales:</span>
                    <span className="text-stone-200">{money(todayCashSales_c)}</span>
                  </div>

                  <div className="flex justify-between text-red-400">
                    <span>Today's Cash Expenses:</span>
                    <span>-{money(todayCashExpenses_c)}</span>
                  </div>

                  <div className="flex justify-between text-stone-300 font-semibold border-t border-white/10 pt-2">
                    <span>Expected Cash in Kaha:</span>
                    <span>{money(expectedCashInDrawer_c)}</span>
                  </div>
                </div>

                {/* Over / Short Discrepancy Alert */}
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-mono space-y-1 ${
                    cashDiscrepancy_c === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : cashDiscrepancy_c > 0
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5 uppercase text-[11px]">
                    {cashDiscrepancy_c === 0 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Kaha is 100% Balanced</span>
                      </>
                    ) : cashDiscrepancy_c > 0 ? (
                      <>
                        <Coins className="w-4 h-4 text-blue-400" />
                        <span>Cash Over: +{money(cashDiscrepancy_c)}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span>Cash Short: {money(cashDiscrepancy_c)}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {cashDiscrepancy_c === 0
                      ? 'Ang pisikal nga kwarta match sa halin sa tindahan.'
                      : cashDiscrepancy_c > 0
                      ? 'Adunay sobra nga kwarta sa kaha kumpara sa recorded cash sales.'
                      : 'Kulang ang kwarta sa kaha kumpara sa expected sales. Palihug susiha ang resibo o sinsilyo.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10">
                {cashCountSavedMessage && (
                  <p className="text-xs text-emerald-400 font-mono text-center font-bold animate-pulse">
                    ✓ Cash count record saved successfully!
                  </p>
                )}
                <button
                  onClick={handleSaveCashCount}
                  className="btn-press w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] hover:from-amber-300 hover:to-gold text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-gold"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Cash Count Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: X / Z READINGS ── */}
      {activeTab === 'READINGS' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setReadingType('X')}
              className={`btn-press px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                readingType === 'X'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-white/5 text-stone-400 hover:text-stone-200'
              }`}
            >
              X-Reading (Mid-Day Audit)
            </button>
            <button
              onClick={() => setReadingType('Z')}
              className={`btn-press px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                readingType === 'Z'
                  ? 'bg-amber-500/20 text-gold-light border border-gold/40'
                  : 'bg-white/5 text-stone-400 hover:text-stone-200'
              }`}
            >
              Z-Reading (End of Day Store Closure)
            </button>

            <button
              onClick={() => window.print()}
              className="btn-press ml-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 text-xs font-bold font-mono flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Reading</span>
            </button>
          </div>

          {/* Printable Thermal Paper Reading Card */}
          <div className="max-w-md mx-auto bg-white text-black p-6 rounded-2xl shadow-2xl font-mono text-xs space-y-4">
            <div className="text-center border-b border-black pb-3 space-y-1">
              <h2 className="text-base font-black uppercase tracking-wider">
                {settings?.store_name || 'TINDA POS'}
              </h2>
              <p className="text-[11px]">{settings?.address || 'Philippines'}</p>
              <p className="text-[11px] font-bold mt-1">
                {readingType === 'X' ? '*** X-READING (MID-SHIFT) ***' : '*** Z-READING (DAILY CLOSING) ***'}
              </p>
              <p className="text-[10px] text-gray-600">Generated: {formatDateTime(new Date().toISOString())}</p>
              <p className="text-[10px] text-gray-600">Cashier: {cashierName}</p>
            </div>

            <div className="space-y-1.5 border-b border-black pb-3">
              <div className="flex justify-between font-bold">
                <span>GROSS SALES:</span>
                <span>{money(metrics.totalSales_c)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total Orders Count:</span>
                <span>{metrics.totalOrders}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total Items Sold:</span>
                <span>{metrics.totalItemsSold} pcs</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Average Basket:</span>
                <span>{money(metrics.avgOrderValue_c)}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-b border-black pb-3">
              <p className="font-bold uppercase text-[11px]">Payment Breakdown:</p>
              <div className="flex justify-between">
                <span>CASH SALES:</span>
                <span>{money(metrics.cashSales_c)}</span>
              </div>
              <div className="flex justify-between">
                <span>GCASH SALES:</span>
                <span>{money(metrics.gcashSales_c)}</span>
              </div>
              <div className="flex justify-between">
                <span>UTANG (Credit):</span>
                <span>{money(metrics.utangSales_c)}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-b border-black pb-3">
              <p className="font-bold uppercase text-[11px]">Financial Margins:</p>
              <div className="flex justify-between">
                <span>Cost of Goods (COGS):</span>
                <span>{money(metrics.totalCost_c)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>GROSS PROFIT:</span>
                <span>{money(metrics.grossProfit_c)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Operating Expenses:</span>
                <span>-{money(metrics.totalExpenses_c)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-dashed border-gray-400">
                <span>NET STORE PROFIT:</span>
                <span>{money(metrics.netProfit_c)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-500 pt-2">
              <p>*** END OF {readingType}-READING REPORT ***</p>
              <p className="mt-1">TINDA POS Web · Enterprise Engine</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
