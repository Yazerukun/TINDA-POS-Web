import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  ArrowLeftRight,
  Search,
  Minus,
  Plus,
  Package,
  AlertCircle,
  CheckCircle2,
  Tag,
  Receipt,
  Sparkles,
  Loader2,
  Coins,
  Banknote
} from 'lucide-react'
import type { Transaction, TransactionItem, Product } from '../types'
import { money } from '../utils/format'
import { Modal } from './ui/Modal'
import { db } from '../db'
import { toastSuccess, toastError } from '../stores/toast'
import { playScanSuccess } from '../lib/sound'

export interface ItemExchangeModalProps {
  transaction: Transaction
  item: TransactionItem
  onClose: () => void
  onDone: () => void
}

const REASON_PRESETS = [
  'Customer requested different brand/item',
  'Wrong item taken',
  'Exchange for higher value product',
  'Size / flavor / variant exchange'
] as const

export function ItemExchangeModal({
  transaction,
  item,
  onClose,
  onDone
}: ItemExchangeModalProps): React.JSX.Element {
  const maxReturnQty = item.quantity || 1
  const [returnQty, setReturnQty] = useState<number>(1)

  // Replacement product search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [allDbProducts, setAllDbProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [replacementQty, setReplacementQty] = useState<number>(1)

  // Cash tendered for Abono
  const [cashTenderedStr, setCashTenderedStr] = useState('')
  const [reason, setReason] = useState<string>(REASON_PRESETS[0])
  const [submitting, setSubmitting] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    db.products.where('status').equals('ACTIVE').toArray().then((prods) => {
      if (active) setAllDbProducts(prods)
    }).catch(() => {})

    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 150)

    return () => {
      active = false
    }
  }, [])

  // Proportional discount ratio
  const discountRatio = useMemo(() => {
    if (transaction.subtotal_c > 0 && transaction.total_c < transaction.subtotal_c) {
      return transaction.total_c / transaction.subtotal_c
    }
    return 1
  }, [transaction.subtotal_c, transaction.total_c])

  // Returned credit
  const returnedCreditC = useMemo(() => {
    if (returnQty <= 0 || item.quantity <= 0) return 0
    const lineSubtotal = item.unit_price_c * returnQty
    return Math.round(lineSubtotal * discountRatio)
  }, [returnQty, item.quantity, item.unit_price_c, discountRatio])

  // Replacement unit price & total
  const replacementUnitPriceC = selectedProduct?.default_price_c || 0
  const replacementTotalC = replacementUnitPriceC * Math.max(1, replacementQty)

  // Math Matrix difference
  // Positive = Customer pays more (Abono)
  // Negative = Store returns change (Sukli)
  // Zero = Even exchange
  const diffC = useMemo(() => {
    if (!selectedProduct) return 0
    return replacementTotalC - returnedCreditC
  }, [selectedProduct, replacementTotalC, returnedCreditC])

  const cashTenderedC = Math.round((parseFloat(cashTenderedStr) || 0) * 100)
  const changeC = diffC > 0 ? Math.max(0, cashTenderedC - diffC) : 0
  const isCashShort = diffC > 0 && cashTenderedC < diffC

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return allDbProducts
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)))
      .slice(0, 5)
  }, [searchQuery, allDbProducts])

  const handleSubmit = async () => {
    if (!selectedProduct) {
      toastError('No Replacement Selected', 'Please search and select a replacement product.')
      return
    }
    if (diffC > 0 && isCashShort) {
      toastError('Insufficient Cash', `Customer needs to pay ${money(diffC)} (Abono). Cash tendered is short.`)
      return
    }

    setSubmitting(true)
    try {
      // 1. Restock returned product in db.products
      if (item.product_id) {
        const retProd = await db.products.get(item.product_id)
        if (retProd) {
          await db.products.update(item.product_id, {
            stock: (retProd.stock || 0) + returnQty,
            updated_at: new Date().toISOString()
          })
        }
      }

      // 2. Deduct replacement product stock in db.products
      const repProd = await db.products.get(selectedProduct.id)
      if (repProd) {
        await db.products.update(selectedProduct.id, {
          stock: Math.max(0, (repProd.stock || 0) - replacementQty),
          updated_at: new Date().toISOString()
        })
      }

      // 3. Update transaction items
      const updatedItems = transaction.items
        .map((it) => {
          if (it.product_id === item.product_id) {
            const remQty = it.quantity - returnQty
            if (remQty <= 0) return null
            return {
              ...it,
              quantity: remQty,
              total_c: remQty * it.unit_price_c
            }
          }
          return it
        })
        .filter(Boolean) as TransactionItem[]

      // Add replacement item
      updatedItems.push({
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        unit_name: selectedProduct.base_unit || 'pc',
        quantity: replacementQty,
        unit_price_c: replacementUnitPriceC,
        total_c: replacementTotalC
      })

      const newTotalC = Math.max(0, transaction.total_c + diffC)
      const auditNote = `[Exchange: Returned ${returnQty}x ${item.name} (${money(returnedCreditC)}) -> Took ${replacementQty}x ${selectedProduct.name} (${money(replacementTotalC)}). Net: ${money(diffC)}]`

      await db.transactions.update(transaction.id, {
        items: updatedItems,
        total_c: newTotalC,
        notes: transaction.notes ? `${transaction.notes} | ${auditNote}` : auditNote
      })

      try {
        playScanSuccess()
      } catch {}

      toastSuccess(
        'Exchange Completed',
        `Exchanged for ${replacementQty}x ${selectedProduct.name}.`
      )
      onDone()
      onClose()
    } catch (err) {
      toastError('Exchange Failed', String((err as Error)?.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Item Exchange & Return"
      maxWidth="max-w-xl"
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
            disabled={submitting || !selectedProduct || (diffC > 0 && isCashShort)}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-3.5 h-3.5" />
            )}
            <span>
              {diffC > 0
                ? `Confirm Exchange & Collect ${money(diffC)} Abono`
                : diffC < 0
                ? `Confirm Exchange & Return ${money(Math.abs(diffC))} Sukli`
                : 'Confirm Even Exchange'}
            </span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Returned Item Summary */}
        <div className="p-3.5 rounded-2xl bg-ink-950 border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-stone-500 uppercase">Item to Return:</span>
            <span className="font-mono text-amber-400 font-bold">Credit Value: {money(returnedCreditC)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">{item.name}</h4>
              <p className="text-stone-400 font-mono text-[11px]">Unit Price: {money(item.unit_price_c)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Qty to return:</span>
              <select
                value={returnQty}
                onChange={(e) => setReturnQty(Number(e.target.value))}
                className="rounded-lg bg-ink-900 border border-white/[0.1] px-2.5 py-1 text-white font-mono font-bold"
              >
                {Array.from({ length: maxReturnQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Replacement Product Search */}
        <div className="space-y-2">
          <label className="font-bold text-stone-300 block">Select Replacement Item:</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product name or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-ink-950 border border-white/[0.1] pl-10 pr-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {filteredProducts.length > 0 && !selectedProduct && (
            <div className="p-1 rounded-xl bg-ink-950 border border-white/[0.08] divide-y divide-white/[0.06]">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(p)
                    setSearchQuery('')
                  }}
                  className="w-full p-2 text-left hover:bg-white/[0.06] rounded-lg flex items-center justify-between text-stone-200 transition cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-stone-500 font-mono">Stock: {p.stock} {p.base_unit}</p>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">{money(p.default_price_c)}</span>
                </button>
              ))}
            </div>
          )}

          {selectedProduct && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                  Chosen Replacement:
                </span>
                <h4 className="font-bold text-white text-sm">{selectedProduct.name}</h4>
                <p className="text-stone-300 font-mono text-[11px]">
                  Price: {money(selectedProduct.default_price_c)} · Stock Available: {selectedProduct.stock}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-400 text-[11px]">Qty:</span>
                  <input
                    type="number"
                    min={1}
                    value={replacementQty}
                    onChange={(e) => setReplacementQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 rounded-lg bg-ink-900 border border-white/[0.2] py-1 text-center font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-stone-400 hover:text-white underline text-[11px]"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exchange Math Matrix Display */}
        {selectedProduct && (
          <div className="space-y-3 pt-2 border-t border-white/[0.08]">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-ink-950 border border-white/[0.08]">
                <span className="text-[10px] text-stone-500 uppercase block">Returned Credit</span>
                <span className="font-mono font-bold text-amber-300 text-sm">{money(returnedCreditC)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-ink-950 border border-white/[0.08]">
                <span className="text-[10px] text-stone-500 uppercase block">New Item Total</span>
                <span className="font-mono font-bold text-white text-sm">{money(replacementTotalC)}</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border font-mono font-bold text-sm ${
                  diffC > 0
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : diffC < 0
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-ink-950 border-white/[0.08] text-stone-300'
                }`}
              >
                <span className="text-[10px] uppercase block">
                  {diffC > 0 ? 'Abono to Pay' : diffC < 0 ? 'Sukli to Return' : 'Balance'}
                </span>
                <span>{diffC !== 0 ? money(Math.abs(diffC)) : '₱0.00 Even'}</span>
              </div>
            </div>

            {/* If Customer Needs to Pay Abono, Show Cash Tendered & Change */}
            {diffC > 0 && (
              <div className="p-3.5 rounded-2xl bg-ink-950 border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-300">Cash Tendered by Customer (₱):</label>
                  <span className="text-stone-500 font-mono">Needed: {money(diffC)}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashTenderedStr}
                    onChange={(e) => setCashTenderedStr(e.target.value)}
                    className="flex-1 rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCashTenderedStr((diffC / 100).toFixed(2))}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-stone-200 font-semibold text-xs transition cursor-pointer"
                  >
                    Exact ({money(diffC)})
                  </button>
                </div>
                {cashTenderedC > 0 && (
                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-stone-400">Change (Sukli) due to customer:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{money(changeC)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
