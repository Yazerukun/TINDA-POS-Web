import React, { useState, useMemo } from 'react'
import {
  ListOrdered,
  Search,
  Calendar,
  Receipt,
  Printer,
  Ban,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  CreditCard,
  Banknote,
  Wallet
} from 'lucide-react'
import type { Transaction, StoreSettings, Product } from '../types'
import { db } from '../db'
import { money, formatDateTime } from '../utils/format'
import { Receipt as ReceiptComponent } from './Receipt'

interface TransactionsScreenProps {
  transactions: Transaction[]
  settings: StoreSettings
  onTransactionVoided?: () => void
  isAdmin?: boolean
  currentCashierName?: string
}

export function TransactionsScreen({
  transactions,
  settings,
  onTransactionVoided,
  isAdmin = false,
  currentCashierName = 'Master Admin'
}: TransactionsScreenProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // View Modal state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isReprintOpen, setIsReprintOpen] = useState(false)
  const [voidTargetTx, setVoidTargetTx] = useState<Transaction | null>(null)
  const [voidReason, setVoidReason] = useState('Customer return / wrong item')

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase().trim()
    return transactions.filter((tx) => {
      // Date filter
      if (fromDate && tx.created_at && tx.created_at.slice(0, 10) < fromDate) return false
      if (toDate && tx.created_at && tx.created_at.slice(0, 10) > toDate) return false

      // Payment filter
      if (paymentFilter !== 'ALL' && tx.payment_method !== paymentFilter) return false

      // Status filter
      const txStatus = tx.status || 'COMPLETED'
      if (statusFilter !== 'ALL' && txStatus !== statusFilter) return false

      // Search query
      if (!q) return true
      return (
        tx.invoice_number.toLowerCase().includes(q) ||
        (tx.cashier_name && tx.cashier_name.toLowerCase().includes(q)) ||
        tx.items.some((item) => item.name.toLowerCase().includes(q))
      )
    })
  }, [transactions, search, paymentFilter, statusFilter, fromDate, toDate])

  // Total sales of filtered (excluding voided)
  const totalFilteredSales_c = useMemo(() => {
    return filteredTransactions
      .filter((t) => (t.status || 'COMPLETED') !== 'VOIDED')
      .reduce((sum, t) => sum + (t.total_c || 0), 0)
  }, [filteredTransactions])

  // Void Handler (with inventory stock restoration)
  const handleConfirmVoid = async () => {
    if (!voidTargetTx) return

    try {
      // 1. Restore product inventory stock in Dexie
      if (voidTargetTx.items && voidTargetTx.items.length > 0) {
        for (const item of voidTargetTx.items) {
          const product = await db.products.get(item.product_id)
          if (product) {
            await db.products.update(item.product_id, {
              stock: product.stock + item.quantity,
              updated_at: new Date().toISOString()
            })
          }
        }
      }

      // 2. If utang, reverse customer balance
      if (voidTargetTx.payment_method === 'UTANG' && voidTargetTx.customer_id) {
        const customer = await db.customers.get(voidTargetTx.customer_id)
        if (customer) {
          const newBal = Math.max(0, (customer.balance_c || 0) - voidTargetTx.total_c)
          await db.customers.update(voidTargetTx.customer_id, {
            balance_c: newBal,
            updated_at: new Date().toISOString()
          })
        }
      }

      // 3. Update transaction status to VOIDED
      await db.transactions.update(voidTargetTx.id, {
        status: 'VOIDED',
        void_reason: voidReason,
        voided_at: new Date().toISOString(),
        voided_by: currentCashierName
      })

      setVoidTargetTx(null)
      setSelectedTx(null)
      if (onTransactionVoided) onTransactionVoided()
    } catch (err) {
      console.error('Failed to void transaction:', err)
      alert('Error occurred while voiding transaction: ' + String(err))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Transactions & Receipts
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-gold-muted border border-gold/30 px-2 py-0.5 rounded-full uppercase">
              Sales Ledger
            </span>
          </div>
          <p className="text-xs text-stone-400 font-mono mt-1">
            Audit past receipts, print thermal customer copies & void erroneous sales
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Filtered Net Volume</p>
          <p className="text-xl font-serif font-bold text-gold-light">
            {money(totalFilteredSales_c)}
          </p>
          <p className="text-[10px] font-mono text-stone-400">
            {filteredTransactions.length} receipts shown
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/[0.08] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, item name, cashier..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-black border border-white/15 text-stone-100 placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-black border border-white/15 text-stone-200 text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">All Payments</option>
              <option value="CASH">CASH</option>
              <option value="GCASH">GCASH</option>
              <option value="UTANG">UTANG (Credit)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-black border border-white/15 text-stone-200 text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="VOIDED">Voided</option>
            </select>

            <button
              onClick={() => {
                setSearch('')
                setPaymentFilter('ALL')
                setStatusFilter('ALL')
                setFromDate('')
                setToDate('')
              }}
              className="btn-press text-xs font-mono text-gold-muted hover:text-white px-2 py-1"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5 text-xs font-mono text-stone-400">
          <span>Date Filter:</span>
          <div className="flex items-center gap-1.5">
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <button
            onClick={() => {
              setFromDate(todayStr)
              setToDate(todayStr)
            }}
            className="btn-press text-[11px] text-[#D4AF37] hover:underline ml-auto"
          >
            Today Only
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl border border-white/[0.08] bg-zinc-950/70 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Receipt className="h-10 w-10 text-stone-600 mx-auto" />
            <p className="text-sm font-bold text-stone-300">Walay transaction nga nag-match</p>
            <p className="text-xs text-stone-500 font-mono">
              Ang mga resibo gikan sa POS Counter screen direkta nga mo-appear dinhi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/50 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold">Cashier</th>
                  <th className="py-3.5 px-4 font-semibold">Items</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredTransactions.map((tx) => {
                  const isVoided = (tx.status || 'COMPLETED') === 'VOIDED'
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isVoided ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gold-light">
                        {tx.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-400 text-[11px]">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="py-3 px-4 text-stone-300">
                        {tx.cashier_name || 'Admin'}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-400">
                        {tx.items?.length || 0} item{tx.items?.length === 1 ? '' : 's'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            tx.payment_method === 'CASH'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tx.payment_method === 'GCASH'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isVoided ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-mono font-bold uppercase border border-red-500/30">
                            Voided
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold uppercase">
                            Paid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-serif font-bold text-stone-100 text-sm">
                        {money(tx.total_c)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="btn-press px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-stone-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0C0D11] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-gold-muted uppercase">Receipt Audit</p>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedTx.invoice_number}</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="btn-press h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Date & Time:</span>
                <span className="text-stone-200">{formatDateTime(selectedTx.created_at)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Cashier Terminal:</span>
                <span className="text-stone-200">{selectedTx.cashier_name}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Payment Mode:</span>
                <span className="text-[#D4AF37] font-bold">{selectedTx.payment_method}</span>
              </div>

              {selectedTx.status === 'VOIDED' && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5" />
                    <span>TRANSACTION VOIDED</span>
                  </p>
                  <p>Reason: {selectedTx.void_reason || 'N/A'}</p>
                  <p>Voided by: {selectedTx.voided_by || 'Admin'}</p>
                </div>
              )}
            </div>

            {/* Itemized list */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-stone-300 uppercase tracking-wider font-mono">
                Items Purchased ({selectedTx.items.length})
              </p>
              <div className="divide-y divide-white/5 bg-zinc-950 rounded-2xl p-3 border border-white/5 max-h-48 overflow-y-auto">
                {selectedTx.items.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-[10px] text-stone-400 font-mono">
                        {item.quantity} {item.unit_name} × {money(item.unit_price_c)}
                      </p>
                    </div>
                    <p className="font-serif font-bold text-stone-200">
                      {money(item.total_c)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="pt-2 border-t border-white/10 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal:</span>
                <span>{money(selectedTx.subtotal_c)}</span>
              </div>
              {selectedTx.discount_c > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount ({selectedTx.discount_type}):</span>
                  <span>-{money(selectedTx.discount_c)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-100 font-bold text-sm pt-1 border-t border-white/5">
                <span>Total Amount:</span>
                <span className="font-serif text-gold-light text-base">{money(selectedTx.total_c)}</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px]">
                <span>Tendered: {money(selectedTx.amount_tendered_c)}</span>
                <span>Change: {money(selectedTx.change_c)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsReprintOpen(true)}
                className="btn-press flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-stone-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Printer className="w-4 h-4" />
                <span>Reprint</span>
              </button>

              {selectedTx.status !== 'VOIDED' && (
                <button
                  onClick={() => setVoidTargetTx(selectedTx)}
                  className="btn-press flex-1 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  <span>Void Sale</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print View */}
      {isReprintOpen && selectedTx && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-black rounded-2xl p-5 shadow-2xl space-y-4">
            <ReceiptComponent
              transaction={selectedTx}
              storeSettings={settings}
            />
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsReprintOpen(false)}
                className="btn-press flex-1 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold uppercase"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="btn-press flex-1 py-2.5 rounded-xl bg-black text-white hover:bg-gray-900 text-xs font-bold uppercase flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Paper</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidTargetTx && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#120E0E] border border-red-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-stone-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Void Transaction?</h4>
                <p className="text-[10px] font-mono text-red-400">{voidTargetTx.invoice_number}</p>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Kining maong aksyon mo-kanselar sa resibo ug <strong>awtomatikong mo-uli sa tanang stocks</strong> balik sa inventory. Dili na kini mabalik.
            </p>

            <div>
              <label className="text-[11px] font-mono font-bold text-stone-400 block mb-1">
                Rason sa Pag-void (Reason):
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Rason ngano gi-void..."
                className="w-full h-10 px-3 rounded-xl bg-black border border-white/15 text-xs text-stone-100 focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setVoidTargetTx(null)}
                className="btn-press flex-1 py-2.5 rounded-xl bg-white/10 text-stone-300 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                className="btn-press flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase shadow-lg shadow-red-900/40"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
