import React, { useMemo, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  ArrowUpRight,
  Calendar,
  Eye,
  X,
  Package
} from 'lucide-react'
import type { Transaction } from '../types'
import { money, formatDateTime } from '../utils/format'

interface AnalyticsScreenProps {
  transactions: Transaction[]
}

export function AnalyticsScreen({ transactions }: AnalyticsScreenProps): React.JSX.Element {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  // Metrics computation
  const metrics = useMemo(() => {
    const totalSales = transactions.reduce((sum, t) => sum + t.total_c, 0)
    const totalOrders = transactions.length
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0
    // Estimated 25% average retail margin on sari-sari items
    const grossProfit = Math.round(totalSales * 0.25)

    return { totalSales, totalOrders, avgOrderValue, grossProfit }
  }, [transactions])

  // Top selling products computation
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const t of transactions) {
      for (const item of t.items) {
        const existing = map.get(item.name) || { name: item.name, quantity: 0, revenue: 0 }
        existing.quantity += item.quantity
        existing.revenue += item.total_c
        map.set(item.name, existing)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [transactions])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-emerald-400" />
          <span>Executive Analytics & Sales Reports</span>
        </h2>
        <p className="text-xs text-slate-400">
          Real-time metrics, profit estimates, sales volume, and transaction audits.
        </p>
      </div>

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Gross Sales</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono tracking-tight">
              {money(metrics.totalSales)}
            </h3>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="h-3 w-3" />
              <span>Real-time counter total</span>
            </p>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Estimated Gross Profit</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-400 font-mono tracking-tight">
              {money(metrics.grossProfit)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              ~25% standard retail markup
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Transactions</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono tracking-tight">
              {metrics.totalOrders}
            </h3>
            <p className="text-[11px] text-indigo-300 mt-1 font-medium">
              Completed checkouts
            </p>
          </div>
        </div>

        {/* Avg Order Value */}
        <div className="glass-card rounded-3xl p-5 border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average Ticket Size</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono tracking-tight">
              {money(metrics.avgOrderValue)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Per basket ring-up
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Leaderboard & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Products (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-5 border border-white/[0.1] shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Top Revenue Generators</span>
            </h4>
            <span className="text-[11px] text-slate-400">Top 5 Products</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Walay sales history pa sa pagkakaron.
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-obsidian-900/60 border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-black">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[180px]">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.quantity} units sold</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {money(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions List (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-5 border border-white/[0.1] shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-400" />
              <span>Recent Transaction Logs</span>
            </h4>
            <span className="text-[11px] text-slate-400">{transactions.length} records</span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Walay natala nga transactions pa.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {transactions.slice(0, 15).map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  className="btn-press flex items-center justify-between p-3 rounded-2xl bg-obsidian-900/70 border border-white/[0.06] hover:border-emerald-500/30 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/[0.04] text-slate-300 flex items-center justify-center">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{t.invoice_number}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          {t.payment_method}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDateTime(t.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black font-mono text-emerald-400">{money(t.total_c)}</p>
                    <p className="text-[10px] text-slate-400">{t.items.length} items</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-white/[0.12] p-6 shadow-2xl animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedTx.invoice_number}</h3>
                <p className="text-xs text-slate-400">{formatDateTime(selectedTx.created_at)}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="btn-press text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-4 rounded-2xl bg-obsidian-900/90 border border-white/[0.06] text-xs font-mono space-y-2">
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/[0.04]">
                {selectedTx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between pt-1 text-slate-200">
                    <span className="truncate pr-2">{it.name}</span>
                    <span className="shrink-0">{it.quantity}x {money(it.unit_price_c)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.08] pt-2 space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{money(selectedTx.subtotal_c)}</span>
                </div>
                {selectedTx.discount_c > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount:</span>
                    <span>-{money(selectedTx.discount_c)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-white/[0.04]">
                  <span>Total Amount:</span>
                  <span className="text-emerald-400">{money(selectedTx.total_c)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Payment:</span>
                  <span>{selectedTx.payment_method}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="btn-press w-full py-2.5 rounded-xl bg-obsidian-850 border border-white/[0.1] text-xs font-bold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
