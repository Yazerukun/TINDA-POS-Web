import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  Tag,
  Clock,
  ArrowDownRight,
  TrendingDown,
  Layers,
  X
} from 'lucide-react'
import type { Expense, ExpenseCategory } from '../types'
import { db } from '../db'
import { money, formatDateTime } from '../utils/format'

interface ExpensesScreenProps {
  cashierName?: string
  onExpensesChanged?: () => void
}

export function ExpensesScreen({
  cashierName = 'Master Admin',
  onExpensesChanged
}: ExpensesScreenProps): React.JSX.Element {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [fromDate, setFromDate] = useState(todayStr)
  const [toDate, setToDate] = useState(todayStr)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState('Miscellaneous')
  const [newDate, setNewDate] = useState(todayStr)
  const [newDescription, setNewDescription] = useState('')
  const [newCustomCategory, setNewCustomCategory] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allExpenses, allCats] = await Promise.all([
        db.expenses.orderBy('id').reverse().toArray(),
        db.expense_categories.toArray()
      ])
      setExpenses(allExpenses)
      setCategories(allCats)
      if (allCats.length > 0 && newCategory === 'Miscellaneous') {
        setNewCategory(allCats[0].name)
      }
    } catch (err) {
      console.error('Failed to load expenses:', err)
    } finally {
      setLoading(false)
    }
  }, [newCategory])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (fromDate && e.date < fromDate) return false
      if (toDate && e.date > toDate) return false
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false
      return true
    })
  }, [expenses, fromDate, toDate, selectedCategory])

  // Metrics
  const { totalFiltered_c, todayTotal_c, monthTotal_c } = useMemo(() => {
    const currentMonth = todayStr.slice(0, 7) // YYYY-MM
    let filtered = 0
    let today = 0
    let month = 0

    filteredExpenses.forEach((e) => {
      filtered += e.amount_c || 0
    })

    expenses.forEach((e) => {
      if (e.date === todayStr) {
        today += e.amount_c || 0
      }
      if (e.date.startsWith(currentMonth)) {
        month += e.amount_c || 0
      }
    })

    return {
      totalFiltered_c: filtered,
      todayTotal_c: today,
      monthTotal_c: month
    }
  }, [filteredExpenses, expenses, todayStr])

  // Add Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Math.round(parseFloat(newAmount) * 100)
    if (isNaN(amount) || amount <= 0) return

    try {
      await db.expenses.add({
        category: newCategory,
        amount_c: amount,
        date: newDate || todayStr,
        description: newDescription.trim(),
        cashier_name: cashierName,
        created_at: new Date().toISOString()
      })

      setIsAddModalOpen(false)
      setNewAmount('')
      setNewDescription('')
      await loadData()
      if (onExpensesChanged) onExpensesChanged()
    } catch (err) {
      console.error('Failed to add expense:', err)
    }
  }

  // Delete Expense
  const handleDeleteExpense = async (id?: number) => {
    if (!id) return
    if (!confirm('Sigurado ka nga papason kining maong expense record?')) return
    try {
      await db.expenses.delete(id)
      await loadData()
      if (onExpensesChanged) onExpensesChanged()
    } catch (err) {
      console.error('Failed to delete expense:', err)
    }
  }

  // Add Custom Category
  const handleAddCategory = async () => {
    const trimmed = newCustomCategory.trim()
    if (!trimmed) return
    try {
      await db.expense_categories.add({ name: trimmed })
      setNewCustomCategory('')
      await loadData()
    } catch (err) {
      console.error('Failed to add category:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Store Expenses
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-gold-muted border border-gold/30 px-2 py-0.5 rounded-full uppercase">
              Financial Outflow
            </span>
          </div>
          <p className="text-xs text-stone-400 font-mono mt-1">
            Track daily operating expenses, utility bills, packaging, wages & store overhead
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-press px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] hover:from-amber-300 hover:to-gold text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-glow-gold transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Expenses */}
        <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              Today's Expenses
            </span>
            <div className="h-8 w-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-serif font-bold text-red-400">
            {money(todayTotal_c)}
          </p>
          <p className="text-[10px] text-stone-500 font-mono mt-1">
            Recorded for today's shift
          </p>
        </div>

        {/* This Month's Expenses */}
        <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              This Month Total
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-serif font-bold text-gold-light">
            {money(monthTotal_c)}
          </p>
          <p className="text-[10px] text-stone-500 font-mono mt-1">
            Cumulative month-to-date
          </p>
        </div>

        {/* Filtered Range Total */}
        <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              Filtered Total ({filteredExpenses.length} entries)
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-serif font-bold text-stone-200">
            {money(totalFiltered_c)}
          </p>
          <p className="text-[10px] text-stone-500 font-mono mt-1">
            Based on active date & category filters
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setFromDate('')
            setToDate('')
            setSelectedCategory('ALL')
          }}
          className="btn-press text-xs font-mono text-gold-muted hover:text-white transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Expenses Table */}
      <div className="rounded-3xl border border-white/[0.08] bg-zinc-950/70 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-stone-400">
            <div className="h-7 w-7 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
            <p className="text-xs font-mono">Loading expense records...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Receipt className="h-10 w-10 text-stone-600 mx-auto" />
            <p className="text-sm font-bold text-stone-300">No expenses recorded for this period</p>
            <p className="text-xs text-stone-500 font-mono">
              Click "+ New Expense" to record store operating expenses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/50 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Description</th>
                  <th className="py-3.5 px-4 font-semibold">Recorded By</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-300">
                      {e.date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-gold-light font-mono font-medium text-[11px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-200 font-medium">
                      {e.description || <span className="text-stone-500 italic">No notes</span>}
                    </td>
                    <td className="py-3 px-4 text-stone-400 font-mono text-[11px]">
                      {e.cashier_name || 'Admin'}
                    </td>
                    <td className="py-3 px-4 text-right font-serif font-bold text-red-400 text-sm">
                      {money(e.amount_c)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="btn-press p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0C0D11] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-gold-muted uppercase">Operating Outflow</p>
                <h3 className="text-base font-bold text-white mt-0.5">Record New Store Expense</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn-press h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Amount in Pesos (₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif text-lg text-gold font-bold">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full h-12 pl-9 pr-4 rounded-xl bg-black border border-white/15 text-gold-light font-mono text-xl font-bold focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-black border border-white/15 text-stone-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-black border border-white/15 text-stone-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 bags of ice, kuryente payment, sando bags..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-black border border-white/15 text-stone-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Add Custom Category Shortcut */}
              <div className="pt-2 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-stone-300 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="btn-press px-3 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-stone-200 text-xs font-medium"
                  >
                    Add Category
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-press flex-1 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-stone-300 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-press flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider shadow-glow-gold transition-all"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
