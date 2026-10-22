import React, { useState, useMemo, useEffect } from 'react'
import {
  RotateCcw,
  Minus,
  Plus,
  AlertCircle,
  CheckCircle2,
  Tag,
  Package,
  Receipt,
  Sparkles,
  Loader2
} from 'lucide-react'
import type { Transaction, TransactionItem } from '../types'
import { money } from '../utils/format'
import { Modal } from './ui/Modal'
import { db } from '../db'
import { toastSuccess, toastError } from '../stores/toast'
import { playScanSuccess } from '../lib/sound'

export interface SingleItemVoidModalProps {
  transaction: Transaction
  item: TransactionItem
  onClose: () => void
  onDone: () => void
}

const REASON_PRESETS = [
  'Wrong Item Selected',
  'Customer Changed Mind',
  'Defective / Expired Stock',
  'Damaged Packaging'
] as const

export function SingleItemVoidModal({
  transaction,
  item,
  onClose,
  onDone
}: SingleItemVoidModalProps): React.JSX.Element {
  const maxQty = item.quantity || 1
  const [qty, setQty] = useState<number>(1)
  const [reason, setReason] = useState<string>(REASON_PRESETS[0])
  const [restock, setRestock] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Auto-uncheck restock if reason is defective or expired
  useEffect(() => {
    if (reason.toLowerCase().includes('defective') || reason.toLowerCase().includes('damaged') || reason.toLowerCase().includes('expired')) {
      setRestock(false)
    } else {
      setRestock(true)
    }
  }, [reason])

  // Discount ratio for fair proportional refund
  const discountRatio = useMemo(() => {
    if (transaction.subtotal_c > 0 && transaction.total_c < transaction.subtotal_c) {
      return transaction.total_c / transaction.subtotal_c
    }
    return 1
  }, [transaction.subtotal_c, transaction.total_c])

  // Calculated refund amount
  const refundAmountC = useMemo(() => {
    if (qty <= 0 || item.quantity <= 0) return 0
    const lineTotal = item.unit_price_c * qty
    return Math.round(lineTotal * discountRatio)
  }, [qty, item.quantity, item.unit_price_c, discountRatio])

  const handleQtyChange = (val: number) => {
    const clamped = Math.max(1, Math.min(maxQty, Math.floor(val) || 1))
    setQty(clamped)
  }

  const handleSubmit = async () => {
    if (qty <= 0 || qty > maxQty) {
      toastError('Invalid Quantity', `Please select a quantity between 1 and ${maxQty}.`)
      return
    }

    setSubmitting(true)
    try {
      // 1. Restock into db.products if requested
      if (restock && item.product_id) {
        const product = await db.products.get(item.product_id)
        if (product) {
          await db.products.update(item.product_id, {
            stock: (product.stock || 0) + qty,
            updated_at: new Date().toISOString()
          })
        }
      }

      // 2. Update transaction line items
      const updatedItems = transaction.items
        .map((it) => {
          if (it.product_id === item.product_id) {
            const newQty = it.quantity - qty
            if (newQty <= 0) return null
            return {
              ...it,
              quantity: newQty,
              total_c: newQty * it.unit_price_c
            }
          }
          return it
        })
        .filter(Boolean) as TransactionItem[]

      const newSubtotalC = Math.max(0, transaction.subtotal_c - (item.unit_price_c * qty))
      const newTotalC = Math.max(0, transaction.total_c - refundAmountC)
      const voidNote = `[Single Void: ${qty}x ${item.name} refunded ${money(refundAmountC)} (${reason})${restock ? ' [Restocked]' : ' [Spoiled]'}]`

      await db.transactions.update(transaction.id, {
        items: updatedItems,
        subtotal_c: newSubtotalC,
        total_c: newTotalC,
        notes: transaction.notes ? `${transaction.notes} | ${voidNote}` : voidNote,
        status: updatedItems.length === 0 ? 'VOIDED' : transaction.status
      })

      try {
        playScanSuccess()
      } catch {}

      toastSuccess(
        'Item Voided / Returned',
        `Refunded ${money(refundAmountC)} for ${qty}x ${item.name}.`
      )
      onDone()
      onClose()
    } catch (err) {
      toastError('Void Failed', String((err as Error)?.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Single-Item Void & Return"
      maxWidth="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 font-semibold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Confirm Void & Refund {money(refundAmountC)}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Item Summary Card */}
        <div className="p-3.5 rounded-2xl bg-ink-950 border border-white/[0.08] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-mono text-stone-500 uppercase block">Line Item to Return:</span>
            <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
            <p className="text-stone-400 font-mono mt-0.5">
              Unit Price: {money(item.unit_price_c)} · Purchased Qty: {item.quantity}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-stone-500 uppercase block">Line Total</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {money(item.total_c)}
            </span>
          </div>
        </div>

        {/* Quantity Stepper */}
        <div className="p-4 rounded-2xl bg-ink-950/60 border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-stone-300">Quantity to Void / Return:</label>
            <span className="text-stone-400 font-mono">Max: {maxQty}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleQtyChange(qty - 1)}
              disabled={qty <= 1}
              className="w-10 h-10 rounded-xl bg-ink-800 hover:bg-ink-750 disabled:opacity-40 text-white flex items-center justify-center font-bold text-lg border border-white/[0.08] transition cursor-pointer"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => handleQtyChange(Number(e.target.value))}
              className="flex-1 h-10 rounded-xl bg-ink-900 border border-white/[0.1] text-center font-mono font-bold text-lg text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleQtyChange(qty + 1)}
              disabled={qty >= maxQty}
              className="w-10 h-10 rounded-xl bg-ink-800 hover:bg-ink-750 disabled:opacity-40 text-white flex items-center justify-center font-bold text-lg border border-white/[0.08] transition cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Reason Presets */}
        <div>
          <label className="block text-stone-400 font-medium mb-1.5">Void / Return Reason</label>
          <div className="grid grid-cols-2 gap-1.5">
            {REASON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className={`p-2.5 rounded-xl text-left border transition cursor-pointer font-medium ${
                  reason === preset
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                    : 'bg-ink-950 border-white/[0.06] text-stone-300 hover:bg-white/[0.05]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Restock Toggle */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-ink-950 border border-white/[0.08] cursor-pointer">
          <input
            type="checkbox"
            checked={restock}
            onChange={(e) => setRestock(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-ink-900 border-white/[0.2]"
          />
          <div className="text-left">
            <span className="font-bold text-stone-200 block">Restock items into Inventory</span>
            <span className="text-[11px] text-stone-500 block">
              {restock
                ? `Adds +${qty} back to active inventory count`
                : 'Does not restock (marked as spoiled or damaged)'}
            </span>
          </div>
        </label>

        {/* Refund Calculation Box */}
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold block">Calculated Refund to Customer:</span>
            <span className="text-[10px] text-rose-400/80">Proportionate to transaction discounts</span>
          </div>
          <div className="text-xl font-extrabold font-mono">{money(refundAmountC)}</div>
        </div>
      </div>
    </Modal>
  )
}
