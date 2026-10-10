import React, { useState } from 'react'
import {
  Users,
  Plus,
  Phone,
  CreditCard,
  DollarSign,
  CheckCircle2,
  X,
  AlertCircle,
  Copy,
  Check,
  Search,
  MessageSquare,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import type { Customer } from '../types'
import { money } from '../utils/format'
import { db } from '../db'

interface CustomersScreenProps {
  customers: Customer[]
  onRefresh: () => void
  storeName?: string
}

export function CustomersScreen({
  customers,
  onRefresh,
  storeName = 'PLATFORM_HQ'
}: CustomersScreenProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null)
  const [paymentAmountInput, setPaymentAmountInput] = useState('')
  const [newCust, setNewCust] = useState({ name: '', contact: '', credit_limit: 1000, notes: '' })
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact && c.contact.includes(search))
  )

  const totalOutstandingUtang = customers.reduce((sum, c) => sum + c.balance_c, 0)

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCust.name.trim()) return

    const now = new Date().toISOString()
    await db.customers.add({
      name: newCust.name.trim(),
      contact: newCust.contact.trim(),
      balance_c: 0,
      credit_limit_c: Math.round(Number(newCust.credit_limit || 0) * 100),
      notes: newCust.notes.trim(),
      store_name: storeName,
      created_at: now,
      updated_at: now
    } as Customer)

    setModalOpen(false)
    setNewCust({ name: '', contact: '', credit_limit: 1000, notes: '' })
    onRefresh()
  }

  const handleRecordPayment = async () => {
    if (!paymentModalCustomer) return
    const amt_c = Math.round((parseFloat(paymentAmountInput) || 0) * 100)
    if (amt_c <= 0) {
      alert('Please enter a valid payment amount.')
      return
    }

    const newBalance = Math.max(0, paymentModalCustomer.balance_c - amt_c)
    await db.customers.update(paymentModalCustomer.id, {
      balance_c: newBalance,
      updated_at: new Date().toISOString()
    })

    setPaymentModalCustomer(null)
    setPaymentAmountInput('')
    onRefresh()
  }

  const handleCopyReminder = (c: Customer) => {
    const formattedAmt = (c.balance_c / 100).toFixed(2)
    const text = `Magandang araw po ${c.name}, paalala lang po mula sa ${storeName !== 'PLATFORM_HQ' ? storeName : 'TINDA POS'} patungkol sa inyong tindahan credit balance na ₱${formattedAmt}. Maraming salamat po!`
    navigator.clipboard.writeText(text)
    setCopiedId(c.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-stone-100 tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-gold-light" />
              <span>Customer Store Credit Ledger (Utang)</span>
            </h2>
            <span className="text-[0.7rem] font-mono uppercase px-2 py-0.5 rounded-full bg-gold/15 text-gold-light border border-gold/30">
              Active Ledger
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Track customer balances, credit limits, automated statement reminders, and record payments.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-gold flex items-center gap-2 px-4 py-2.5 rounded-2xl text-stone-100 font-bold text-xs shadow-glow-gold"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding Utang */}
        <div className="glass-card rounded-3xl p-5 border border-gold/25 bg-gradient-to-br from-amber-500/10 via-obsidian-950 to-obsidian-900 flex items-center justify-between shadow-vault">
          <div>
            <p className="text-[0.75rem] font-semibold text-gold-muted uppercase tracking-wider">
              Total Outstanding Credit
            </p>
            <p className="text-3xl font-black text-gold-light font-serif tracking-tight mt-1">
              {money(totalOutstandingUtang)}
            </p>
            <p className="text-[0.75rem] text-stone-400 mt-1">
              {customers.filter((c) => c.balance_c > 0).length} of {customers.length} accounts with balance
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-light">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* Total Registered Accounts */}
        <div className="glass-card rounded-3xl p-5 border border-slate-900/[0.08] bg-obsidian-900/[0.05] flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] font-semibold text-stone-400 uppercase tracking-wider">
              Registered Clients
            </p>
            <p className="text-3xl font-black text-stone-100 font-mono tracking-tight mt-1">
              {customers.length}
            </p>
            <p className="text-[0.75rem] text-stone-400 mt-1">
              Store credit directory
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Clean Accounts in Good Standing */}
        <div className="glass-card rounded-3xl p-5 border border-slate-900/[0.08] bg-obsidian-900/[0.05] flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] font-semibold text-stone-400 uppercase tracking-wider">
              Fully Settled
            </p>
            <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight mt-1">
              {customers.filter((c) => c.balance_c === 0).length}
            </p>
            <p className="text-[0.75rem] text-stone-400 mt-1">
              Zero outstanding balance
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Customer List Card with Search */}
      <div className="glass-panel rounded-3xl border border-slate-900/[0.08] overflow-hidden shadow-vault space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone contact, or notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-950 border border-slate-900/[0.08] text-xs font-sans text-stone-100 placeholder-stone-500 focus:outline-none focus:border-gold/50"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="px-3 py-2 text-xs font-mono text-stone-400 hover:text-stone-200"
            >
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-900/[0.06]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-900/[0.08] bg-obsidian-950 text-stone-400 font-semibold uppercase tracking-wider text-[0.7rem]">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone Contact</th>
                <th className="py-3 px-4">Credit Limit</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    No matching customer accounts found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isOverLimit = c.credit_limit_c > 0 && c.balance_c > c.credit_limit_c
                  const isCopied = copiedId === c.id

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-100">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4 text-stone-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-stone-500" />
                          <span>{c.contact || 'No contact'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-300">
                        {money(c.credit_limit_c)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-serif ${
                            c.balance_c > 0
                              ? isOverLimit
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/15 text-gold-light border border-gold/30'
                              : 'text-stone-500'
                          }`}
                        >
                          {money(c.balance_c)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.balance_c === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Clear
                          </span>
                        ) : isOverLimit ? (
                          <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-mono uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Over Limit
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-mono uppercase bg-amber-500/15 text-gold-light border border-gold/30">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-400 truncate max-w-xs text-[0.75rem]">
                        {c.notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.balance_c > 0 && (
                            <button
                              onClick={() => handleCopyReminder(c)}
                              title="Copy SMS / Messenger payment reminder text"
                              className={`btn-press p-1.5 rounded-xl border text-[0.75rem] font-mono transition-all flex items-center gap-1 ${
                                isCopied
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : 'bg-obsidian-900 border-slate-900/[0.08] text-stone-400 hover:text-stone-200 hover:border-gold/30'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-[0.65rem]">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="h-3 w-3 text-gold-muted" />
                                  <span className="text-[0.65rem] hidden sm:inline">SMS</span>
                                </>
                              )}
                            </button>
                          )}

                          {c.balance_c > 0 && (
                            <button
                              onClick={() => {
                                setPaymentModalCustomer(c)
                                setPaymentAmountInput((c.balance_c / 100).toString())
                              }}
                              className="btn-press px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-stone-100 text-xs font-bold transition-all shadow-sm"
                            >
                              Record Payment
                            </button>
                          )}

                          <button
                            onClick={() => setCustomerToDelete(c)}
                            title={`Delete customer account for ${c.name}`}
                            className="btn-press p-1.5 rounded-xl border border-white/[0.08] bg-obsidian-950 text-stone-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-gold/30 p-6 shadow-vault animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900/[0.08] pb-3">
              <h3 className="text-base font-bold text-stone-100">Record Credit Payment</h3>
              <button
                onClick={() => setPaymentModalCustomer(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-stone-400">Customer Account</p>
              <p className="text-sm font-bold text-gold-light">{paymentModalCustomer.name}</p>
              <p className="text-xs text-stone-300 mt-1 font-mono">
                Current Balance:{' '}
                <span className="font-bold text-gold-light font-serif">
                  {money(paymentModalCustomer.balance_c)}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Payment Amount (₱)
              </label>
              <input
                type="number"
                step="any"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-gold/40 text-stone-100 font-mono text-xl font-bold focus:outline-none focus:border-gold"
              />
              {/* Quick settlement chips */}
              <div className="flex gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmountInput((paymentModalCustomer.balance_c / 100).toString())
                  }
                  className="px-2.5 py-1 rounded-lg bg-obsidian-900 border border-slate-900/[0.08] text-[0.7rem] font-mono text-gold-light hover:border-gold/40"
                >
                  Full Amount
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmountInput((paymentModalCustomer.balance_c / 200).toFixed(2))
                  }
                  className="px-2.5 py-1 rounded-lg bg-obsidian-900 border border-slate-900/[0.08] text-[0.7rem] font-mono text-stone-400 hover:text-stone-200"
                >
                  50% Half
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalCustomer(null)}
                className="btn-press flex-1 py-2.5 rounded-xl border border-slate-900/[0.1] text-xs font-bold text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="btn-press flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-100 text-xs font-black shadow-glow-emerald"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-rose-500/30 p-6 shadow-vault animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="h-5 w-5" />
                <h3 className="text-base font-bold text-stone-100">Delete Customer</h3>
              </div>
              <button
                onClick={() => setCustomerToDelete(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-stone-400">
                Are you sure you want to permanently delete this customer account?
              </p>
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/[0.06]">
                <p className="text-sm font-bold text-stone-100">{customerToDelete.name}</p>
                {customerToDelete.contact && (
                  <p className="text-xs text-stone-400 font-mono mt-0.5">{customerToDelete.contact}</p>
                )}
              </div>

              {customerToDelete.balance_c > 0 ? (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>Active Debt Warning!</span>
                  </div>
                  <p>
                    This customer has an outstanding balance of <span className="font-bold underline text-white">{money(customerToDelete.balance_c)}</span>. Deleting this account will permanently erase their store credit ledger.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-stone-400">
                  This account has zero outstanding balance and can be deleted safely.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await db.customers.delete(customerToDelete.id)
                  setCustomerToDelete(null)
                  onRefresh()
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-panel bg-obsidian-950 rounded-3xl border border-gold/30 p-6 shadow-vault animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-900/[0.08] pb-3 mb-4">
              <h3 className="text-base font-bold text-stone-100">Add New Customer</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="e.g. Aling Ester"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-900/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={newCust.contact}
                  onChange={(e) => setNewCust({ ...newCust, contact: e.target.value })}
                  placeholder="0912..."
                  className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-slate-900/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Credit Limit (₱)
                </label>
                <input
                  type="number"
                  value={newCust.credit_limit}
                  onChange={(e) =>
                    setNewCust({ ...newCust, credit_limit: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="1000"
                  className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-slate-900/[0.08] text-xs font-mono text-stone-100 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Notes / Address
                </label>
                <textarea
                  value={newCust.notes}
                  onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
                  placeholder="e.g. Purok 3, pay every 15th..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-slate-900/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-gold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-press flex-1 py-2.5 rounded-xl border border-slate-900/[0.1] text-xs font-bold text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold flex-1 py-2.5 rounded-xl text-stone-100 text-xs font-black shadow-glow-gold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
