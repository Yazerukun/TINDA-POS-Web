import React, { useState, useMemo } from 'react'
import {
  Wallet,
  Search,
  HandCoins,
  AlertTriangle,
  CheckCircle2,
  Copy,
  MessageSquare,
  History,
  TrendingDown,
  User,
  Plus,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import type { Customer, Transaction } from '../types'
import { formatCurrency } from '../utils/format'
import { db } from '../db'
import { playSuccessSound } from '../lib/sound'

interface UtangScreenProps {
  customers: Customer[]
  onRefresh: () => void
  storeName?: string
  currentCashierName?: string
}

type UtangFilterTab = 'WITH_BALANCE' | 'OVERDUE' | 'SETTLED' | 'ALL'

export function UtangScreen({
  customers,
  onRefresh,
  storeName = 'TINDA Retail Station',
  currentCashierName = 'Cashier'
}: UtangScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<UtangFilterTab>('WITH_BALANCE')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Payment modal state
  const [paymentAmountStr, setPaymentAmountStr] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Reminder message copied state
  const [copiedReminderId, setCopiedReminderId] = useState<number | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  // Financial statistics
  const totalOutstandingBalance = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.balance_c || 0), 0)
  }, [customers])

  const customersWithBalanceCount = useMemo(() => {
    return customers.filter((c) => (c.balance_c || 0) > 0).length
  }, [customers])

  const overdueCustomersCount = useMemo(() => {
    return customers.filter((c) => (c.balance_c || 0) > 0 && (c.credit_limit_c || 0) > 0 && c.balance_c >= c.credit_limit_c).length
  }, [customers])

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let list = customers

    if (activeTab === 'WITH_BALANCE') {
      list = list.filter((c) => (c.balance_c || 0) > 0)
    } else if (activeTab === 'OVERDUE') {
      list = list.filter((c) => (c.balance_c || 0) > 0 && (c.credit_limit_c || 0) > 0 && c.balance_c >= c.credit_limit_c)
    } else if (activeTab === 'SETTLED') {
      list = list.filter((c) => (c.balance_c || 0) === 0)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contact && c.contact.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      )
    }

    return list.sort((a, b) => (b.balance_c || 0) - (a.balance_c || 0))
  }, [customers, activeTab, searchQuery])

  // Payment settlement action
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return

    const payCents = Math.round(parseFloat(paymentAmountStr) * 100)
    if (isNaN(payCents) || payCents <= 0) {
      alert('Please enter a valid payment amount.')
      return
    }

    setIsProcessingPayment(true)
    try {
      const currentBalance = selectedCustomer.balance_c || 0
      const newBalance = Math.max(0, currentBalance - payCents)

      // Update Customer table in Dexie
      await db.customers.update(selectedCustomer.id, {
        balance_c: newBalance,
        updated_at: new Date().toISOString()
      })

      // Record transaction log for the payment
      await db.transactions.add({
        invoice_number: `PAY-${Date.now()}`,
        created_at: new Date().toISOString(),
        items: [
          {
            product_id: 0,
            name: `Utang Settlement Payment (${selectedCustomer.name})`,
            unit_name: 'payment',
            quantity: 1,
            unit_price_c: payCents,
            total_c: payCents
          }
        ],
        subtotal_c: payCents,
        discount_c: 0,
        discount_type: 'NONE',
        total_c: payCents,
        payment_method: 'CASH',
        amount_tendered_c: payCents,
        change_c: 0,
        customer_id: selectedCustomer.id,
        cashier_name: currentCashierName,
        store_name: storeName,
        status: 'COMPLETED'
      } as unknown as Transaction)

      playSuccessSound()
      alert(`Payment of ${formatCurrency(payCents)} recorded for ${selectedCustomer.name}! New balance: ${formatCurrency(newBalance)}`)

      setSelectedCustomer(null)
      setPaymentAmountStr('')
      setPaymentNotes('')
      onRefresh()
    } catch (err) {
      console.error('Failed to settle utang payment:', err)
      alert('An error occurred while recording the payment.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Courteous SMS / Messenger reminder generator
  const copyReminderMessage = (c: Customer) => {
    const balFormatted = formatCurrency(c.balance_c || 0)
    const text = `Hello ${c.name}! This is a gentle reminder from ${storeName} regarding your outstanding credit balance of ${balFormatted}. You may settle over-the-counter or via GCash/Maya at your convenience. Thank you!`

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReminderId(c.id)
      setTimeout(() => setCopiedReminderId(null), 3000)
    })
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-obsidian-950 p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-wide">
              Utang Ledger &amp; Credit Reminders
            </h1>
            <p className="text-xs text-stone-400">
              Suki credit balances, overdue monitoring, partial payments, and SMS reminders
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-obsidian-900 border border-slate-800 rounded-2xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('WITH_BALANCE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'WITH_BALANCE'
                ? 'bg-rose-500 text-obsidian-950 shadow-glow-rose font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            With Balance ({customersWithBalanceCount})
          </button>
          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'OVERDUE'
                ? 'bg-amber-500 text-obsidian-950 shadow-glow-amber font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Over Limit ({overdueCustomersCount})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-slate-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            All ({customers.length})
          </button>
        </div>
      </div>

      {/* Financial Pulse Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-rose-500/30 flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
              Total Outstanding Credit
            </p>
            <p className="text-2xl font-mono font-bold text-rose-400 mt-1">
              {formatCurrency(totalOutstandingBalance)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
              Customers with Balance
            </p>
            <p className="text-2xl font-mono font-bold text-stone-100 mt-1">
              {customersWithBalanceCount} Customers
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
              Lampas sa Credit Limit
            </p>
            <p className="text-2xl font-mono font-bold text-amber-400 mt-1">
              {overdueCustomersCount} Accounts
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, notes..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-200 text-xs outline-none focus:border-rose-500"
          />
        </div>

        <div className="rounded-3xl bg-obsidian-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-obsidian-950/80 border-b border-slate-800 uppercase text-[0.625rem] tracking-wider text-stone-400 font-mono">
                <tr>
                  <th className="px-5 py-3">Customer / Account</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3 text-right">Credit Limit</th>
                  <th className="px-5 py-3 text-right">Outstanding Credit</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => {
                    const balance = c.balance_c || 0
                    const limit = c.credit_limit_c || 0
                    const isOverLimit = limit > 0 && balance >= limit
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-sans font-bold text-stone-100 text-sm">{c.name}</p>
                          {c.notes && (
                            <p className="font-sans text-[0.6875rem] text-stone-500 mt-0.5 line-clamp-1">
                              {c.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-stone-400 text-xs">{c.contact || 'No Contact'}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-stone-400">
                          {limit > 0 ? formatCurrency(limit) : 'No Limit'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-base text-rose-400">
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {balance === 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[0.625rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                              SETTLED
                            </span>
                          ) : isOverLimit ? (
                            <span className="px-2.5 py-1 rounded-full text-[0.625rem] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold uppercase animate-pulse">
                              OVER LIMIT
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[0.625rem] bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold uppercase">
                              ACTIVE CREDIT
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {balance > 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => copyReminderMessage(c)}
                                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-stone-300 border border-white/[0.08] transition-colors"
                                  title="Copy Courteous Reminder Message"
                                >
                                  {copiedReminderId === c.id ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(c)
                                    setPaymentAmountStr(String((c.balance_c || 0) / 100))
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-sans font-bold text-xs transition-all flex items-center gap-1.5"
                                >
                                  <HandCoins className="w-3.5 h-3.5" />
                                  <span>Settle</span>
                                </button>
                              </>
                            )}

                            {/* Delete Customer Button */}
                            <button
                              type="button"
                              onClick={() => setCustomerToDelete(c)}
                              title={`Delete ${c.name} from credit ledger`}
                              className="p-2 rounded-xl border border-white/[0.08] bg-obsidian-950 text-stone-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-stone-500 font-sans">
                      No customer records found in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Settlement Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-obsidian-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-100">Record Credit Payment</h3>
                <p className="text-xs text-stone-400">{selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300">Current Outstanding:</span>
              <span className="font-mono text-lg font-bold text-rose-400">
                {formatCurrency(selectedCustomer.balance_c || 0)}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  Payment Amount (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={paymentAmountStr}
                  onChange={(e) => setPaymentAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-emerald-500 text-emerald-400 font-mono text-lg font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  Notes / Receipt Number (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Partial salary payment, cash deposit"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-200 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="py-2.5 rounded-xl bg-obsidian-850 border border-slate-800 text-stone-400 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 text-xs font-bold uppercase tracking-wider shadow-glow-emerald"
                >
                  {isProcessingPayment ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-obsidian-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <Trash2 className="h-5 w-5" />
                <h3 className="text-base font-bold text-stone-100">Delete Customer Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-stone-300">
                Are you sure you want to delete the customer account of{' '}
                <strong className="text-stone-100 font-bold">{customerToDelete.name}</strong>?
              </p>

              {(customerToDelete.balance_c || 0) > 0 ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-300">
                    <p className="font-bold">Outstanding Debt Balance Remaining:</p>
                    <p className="mt-0.5 font-mono font-bold text-sm text-rose-200">
                      {formatCurrency(customerToDelete.balance_c)}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-400/90">
                      If you delete this customer now, their debt ledger records will be permanently removed from the database.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  This customer has zero balance. It is safe to delete.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl bg-obsidian-850 border border-slate-800 text-stone-300 text-xs font-bold hover:bg-obsidian-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (customerToDelete.id) {
                    await db.customers.delete(customerToDelete.id)
                  }
                  setCustomerToDelete(null)
                  playSuccessSound()
                  onRefresh()
                }}
                className="btn-press px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
