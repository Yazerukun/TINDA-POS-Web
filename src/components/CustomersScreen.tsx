import React, { useState } from 'react'
import { Users, Plus, Phone, CreditCard, DollarSign, CheckCircle2, X, AlertCircle } from 'lucide-react'
import type { Customer } from '../types'
import { money } from '../utils/format'
import { db } from '../db'

interface CustomersScreenProps {
  customers: Customer[]
  onRefresh: () => void
  storeName?: string
}

export function CustomersScreen({ customers, onRefresh, storeName = 'PLATFORM_HQ' }: CustomersScreenProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null)
  const [paymentAmountInput, setPaymentAmountInput] = useState('')
  const [newCust, setNewCust] = useState({ name: '', contact: '', credit_limit: 1000, notes: '' })

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.includes(search)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-400" />
            <span>Customer Store Credit Ledger</span>
          </h2>
          <p className="text-xs text-slate-400">
            Track customer store credit, balances, credit limits, and record debt payments.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-press flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-obsidian-950 font-bold text-xs shadow-glow-amber"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Total Utang Banner */}
      <div className="glass-card rounded-3xl p-5 border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-obsidian-900 to-obsidian-850 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider">Total Outstanding Store Credit</p>
          <p className="text-3xl font-black text-white font-mono tracking-tight mt-1">
            {money(totalOutstandingUtang)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {customers.filter((c) => c.balance_c > 0).length} customers with active credit balances
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <CreditCard className="h-6 w-6" />
        </div>
      </div>

      {/* Customer List Card */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-obsidian-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Credit Limit</th>
                <th className="py-3.5 px-4">Outstanding Balance</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-500" />
                      <span>{c.contact || 'No phone'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {money(c.credit_limit_c)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        c.balance_c > 0
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          : 'text-slate-500'
                      }`}>
                        {money(c.balance_c)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">
                      {c.notes || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {c.balance_c > 0 && (
                        <button
                          onClick={() => {
                            setPaymentModalCustomer(c)
                            setPaymentAmountInput((c.balance_c / 100).toString())
                          }}
                          className="btn-press px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-obsidian-950 text-xs font-bold transition-all"
                        >
                          Record Bayad
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel rounded-3xl border border-white/[0.12] p-6 shadow-2xl animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">Record Credit Payment</h3>
              <button onClick={() => setPaymentModalCustomer(null)} className="btn-press text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-400">Customer</p>
              <p className="text-sm font-bold text-white">{paymentModalCustomer.name}</p>
              <p className="text-xs text-amber-400 mt-1 font-mono">
                Current Balance: {money(paymentModalCustomer.balance_c)}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Amount (₱)</label>
              <input
                type="number"
                step="any"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalCustomer(null)}
                className="btn-press flex-1 py-2 rounded-xl border border-white/[0.1] text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="btn-press flex-1 py-2 rounded-xl bg-emerald-500 text-obsidian-950 text-xs font-black shadow-glow-emerald"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-white/[0.12] p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Add New Customer</h3>
              <button onClick={() => setModalOpen(false)} className="btn-press text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="e.g. Aling Ester"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={newCust.contact}
                  onChange={(e) => setNewCust({ ...newCust, contact: e.target.value })}
                  placeholder="0912..."
                  className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Credit Limit (₱)</label>
                <input
                  type="number"
                  value={newCust.credit_limit}
                  onChange={(e) => setNewCust({ ...newCust, credit_limit: parseFloat(e.target.value) || 0 })}
                  placeholder="1000"
                  className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Address</label>
                <textarea
                  value={newCust.notes}
                  onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
                  placeholder="e.g. Purok 3, pay every 15th..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-press flex-1 py-2.5 rounded-xl border border-white/[0.1] text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-press flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-obsidian-950 text-xs font-black shadow-glow-amber"
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
