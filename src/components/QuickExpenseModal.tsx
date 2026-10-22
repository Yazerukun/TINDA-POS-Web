import React, { useState, useEffect, useRef } from 'react'
import { Receipt, X, Banknote, Check, Loader2, AlertCircle } from 'lucide-react'
import { Modal } from './ui/Modal'
import { db } from '../db'
import { toastSuccess, toastError } from '../stores/toast'
import { playSuccessSound } from '../lib/sound'

interface QuickExpenseModalProps {
  open: boolean
  onClose: () => void
  onRecorded?: () => void
  cashierName?: string
  storeName?: string
}

const DEFAULT_EXPENSE_CATEGORIES = [
  'Ice / Yelo Payout',
  'Store Supplies / Sando Bags',
  'Food & Merienda',
  'Delivery & Transport',
  'Utilities / Load',
  'Store Maintenance',
  'Petty Cash / Miscellaneous'
]

export function QuickExpenseModal({
  open,
  onClose,
  onRecorded,
  cashierName = 'Cashier',
  storeName = 'Store Counter'
}: QuickExpenseModalProps): React.JSX.Element | null {
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES)
  const [selectedCat, setSelectedCat] = useState<string>(DEFAULT_EXPENSE_CATEGORIES[0]!)
  const [amountInput, setAmountInput] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    let active = true

    // Fetch custom categories from db if present
    db.expense_categories.toArray().then((cats) => {
      if (active && cats && cats.length > 0) {
        const catNames = cats.map((c) => c.name)
        setCategories(Array.from(new Set([...catNames, ...DEFAULT_EXPENSE_CATEGORIES])))
      }
    }).catch(() => {})

    setTimeout(() => {
      amountRef.current?.focus()
    }, 100)

    return () => {
      active = false
    }
  }, [open])

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amountInput)
    if (isNaN(num) || num <= 0) {
      toastError('Validation Error', 'Please enter a valid expense amount greater than ₱0.00.')
      amountRef.current?.focus()
      return
    }

    const amount_c = Math.round(num * 100)
    const desc = description.trim() || `Cash out: ${selectedCat}`
    const today = new Date().toISOString().slice(0, 10)

    setSubmitting(true)
    try {
      await db.expenses.add({
        category: selectedCat,
        amount_c,
        description: desc,
        date: today,
        cashier_name: cashierName,
        store_name: storeName,
        created_at: new Date().toISOString()
      })

      try {
        playSuccessSound()
      } catch {}

      toastSuccess(
        'Cash Out Recorded',
        `Successfully recorded ₱${num.toFixed(2)} (${selectedCat}) from active drawer.`
      )
      setAmountInput('')
      setDescription('')
      onRecorded?.()
      onClose()
    } catch (err) {
      toastError('Record Failed', String((err as Error)?.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Petty Cash / Store Expense (F7)"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
        {/* Category Picker */}
        <div>
          <label className="block text-stone-400 font-medium mb-1.5">
            Expense Category
          </label>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-ink-950 border border-white/[0.08]">
            {categories.map((cat) => {
              const isSelected = selectedCat === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`p-2 rounded-lg text-left truncate transition cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                      : 'hover:bg-white/[0.06] text-stone-300'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-stone-400 font-medium mb-1">
            Amount Taken from Drawer (₱)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-base">
              ₱
            </span>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
              required
              className="w-full rounded-xl bg-ink-950 border border-white/[0.1] pl-8 pr-3 py-2.5 text-lg font-bold font-mono text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="block text-stone-400 font-medium mb-1">
            Description / Reason (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 2 bags tube ice for softdrinks, rider tip"
            className="w-full rounded-xl bg-ink-950 border border-white/[0.1] px-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Record Cash Out</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
