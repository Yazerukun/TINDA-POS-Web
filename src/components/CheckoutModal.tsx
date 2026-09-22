import React, { useState } from 'react'
import { X, CheckCircle2, Banknote, CreditCard, UserCheck, Printer } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { CartItem, Customer, DiscountType, Transaction } from '../types'
import { money } from '../utils/format'
import { db } from '../db'

interface CheckoutModalProps {
  items: CartItem[]
  subtotal_c: number
  discount_c: number
  discount_type: DiscountType
  total_c: number
  customers: Customer[]
  selectedCustomerId: number | null
  onClose: () => void
  onComplete: (tx: Transaction) => void
}

export function CheckoutModal({
  items,
  subtotal_c,
  discount_c,
  discount_type,
  total_c,
  customers,
  selectedCustomerId,
  onClose,
  onComplete
}: CheckoutModalProps): React.JSX.Element {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH' | 'UTANG'>('CASH')
  const [tenderedInput, setTenderedInput] = useState<string>((total_c / 100).toString())
  const [customerId, setCustomerId] = useState<number | null>(selectedCustomerId)
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null)
  const [processing, setProcessing] = useState(false)

  const tendered_c = Math.round((parseFloat(tenderedInput) || 0) * 100)
  const change_c = Math.max(0, tendered_c - total_c)
  const isInsufficient = paymentMethod === 'CASH' && tendered_c < total_c

  const quickCashPresets = [20, 50, 100, 200, 500, 1000]

  const handleCharge = async () => {
    if (processing) return
    if (paymentMethod === 'UTANG' && !customerId) {
      alert('Palihug pagpili og customer para sa Utang transaction.')
      return
    }
    if (isInsufficient) {
      alert('Kulang ang gibayad nga kwarta.')
      return
    }

    setProcessing(true)
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
      const now = new Date().toISOString()

      const newTx: Omit<Transaction, 'id'> = {
        invoice_number: invoiceNumber,
        created_at: now,
        items: items.map((i) => ({
          product_id: i.product.id,
          name: i.product.name,
          unit_name: i.product.base_unit,
          quantity: i.quantity,
          unit_price_c: i.unit_price_c,
          total_c: i.total_c
        })),
        subtotal_c,
        discount_c,
        discount_type,
        total_c,
        payment_method: paymentMethod,
        amount_tendered_c: paymentMethod === 'CASH' ? tendered_c : total_c,
        change_c: paymentMethod === 'CASH' ? change_c : 0,
        customer_id: customerId,
        cashier_name: 'Counter Cashier'
      }

      const txId = await db.transactions.add(newTx as Transaction)
      const fullTx: Transaction = { ...newTx, id: txId }

      // Deduct inventory stock
      for (const item of items) {
        const prod = await db.products.get(item.product.id)
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity)
          await db.products.update(prod.id, { stock: newStock, updated_at: now })
        }
      }

      // If Utang, increase customer balance
      if (paymentMethod === 'UTANG' && customerId) {
        const cust = await db.customers.get(customerId)
        if (cust) {
          await db.customers.update(customerId, {
            balance_c: cust.balance_c + total_c,
            updated_at: now
          })
        }
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        })
      } catch {
        // ignore
      }

      setCompletedTx(fullTx)
    } catch (err) {
      console.error(err)
      alert('Checkout failed: ' + (err as Error)?.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-white/[0.12] p-6 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {completedTx ? 'Payment Successful' : 'Charge Checkout'}
              </h3>
              <p className="text-xs text-slate-400">
                {completedTx ? `Transaction #${completedTx.invoice_number}` : 'Select payment method & tender'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (completedTx) onComplete(completedTx)
              else onClose()
            }}
            className="btn-press rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {completedTx ? (
          /* Receipt / Success view */
          <div className="space-y-5">
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2 animate-bounce" />
              <p className="text-lg font-extrabold text-white">Payment Received</p>
              <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight my-1">
                {money(completedTx.total_c)}
              </p>
              {completedTx.payment_method === 'CASH' && completedTx.change_c > 0 && (
                <div className="mt-2 px-3 py-1 rounded-lg bg-obsidian-900/80 border border-white/[0.08] text-xs font-semibold text-slate-300">
                  Sukli (Change): <span className="text-amber-400 font-mono">{money(completedTx.change_c)}</span>
                </div>
              )}
            </div>

            {/* Receipt Summary Box */}
            <div className="rounded-2xl bg-obsidian-900/90 border border-white/[0.06] p-4 text-xs font-mono space-y-2">
              <div className="flex justify-between border-b border-white/[0.06] pb-2 text-slate-400">
                <span>Items ({completedTx.items.length})</span>
                <span>Qty x Price</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {completedTx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-200">
                    <span className="truncate pr-2">{it.name}</span>
                    <span className="shrink-0">{it.quantity}x {money(it.unit_price_c)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] pt-2 space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{money(completedTx.subtotal_c)}</span>
                </div>
                {completedTx.discount_c > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount:</span>
                    <span>-{money(completedTx.discount_c)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-white/[0.04]">
                  <span>Total Paid:</span>
                  <span className="text-emerald-400">{money(completedTx.total_c)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="btn-press flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/[0.12] bg-obsidian-850 hover:bg-obsidian-800 text-slate-200 text-xs font-bold"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => onComplete(completedTx)}
                className="btn-press flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 text-xs font-black shadow-glow-emerald"
              >
                New Transaction
              </button>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <div className="space-y-4">
            {/* Amount Due Big Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-obsidian-900 to-obsidian-850 border border-white/[0.08]">
              <div>
                <p className="text-xs font-medium text-slate-400">Total Amount Due</p>
                <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                  {money(total_c)}
                </p>
              </div>
              {discount_c > 0 && (
                <div className="text-right">
                  <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                    Saved {money(discount_c)}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`btn-press flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-glow-emerald'
                      : 'border-white/[0.08] bg-obsidian-900/60 text-slate-400 hover:bg-obsidian-850'
                  }`}
                >
                  <Banknote className="h-5 w-5" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('GCASH')}
                  className={`btn-press flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    paymentMethod === 'GCASH'
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-glow-indigo'
                      : 'border-white/[0.08] bg-obsidian-900/60 text-slate-400 hover:bg-obsidian-850'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>GCash / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UTANG')}
                  className={`btn-press flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    paymentMethod === 'UTANG'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-glow-amber'
                      : 'border-white/[0.08] bg-obsidian-900/60 text-slate-400 hover:bg-obsidian-850'
                  }`}
                >
                  <UserCheck className="h-5 w-5" />
                  <span>Utang Credit</span>
                </button>
              </div>
            </div>

            {/* Cash Input & Presets */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span>Cash Tendered</span>
                    <span>Sukli (Change): <strong className="text-emerald-400 font-mono">{money(change_c)}</strong></span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg">₱</span>
                    <input
                      type="number"
                      step="any"
                      value={tenderedInput}
                      onChange={(e) => setTenderedInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-obsidian-900/90 border border-white/[0.12] text-white font-mono text-xl font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick Cash buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTenderedInput((total_c / 100).toString())}
                    className="btn-press px-3 py-1.5 rounded-xl border border-white/[0.08] bg-obsidian-850 text-xs font-mono font-bold text-slate-300 hover:bg-white/[0.06]"
                  >
                    Exact
                  </button>
                  {quickCashPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedInput(amt.toString())}
                      className="btn-press px-3 py-1.5 rounded-xl border border-white/[0.08] bg-obsidian-850 text-xs font-mono font-semibold text-slate-300 hover:bg-white/[0.06]"
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Utang Customer Picker */}
            {paymentMethod === 'UTANG' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Pili og Customer (Debtor)</label>
                <select
                  value={customerId ?? ''}
                  onChange={(e) => setCustomerId(Number(e.target.value) || null)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-obsidian-900/90 border border-white/[0.12] text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilia ang Suki / Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Current Utang: {money(c.balance_c)})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-amber-400/80">
                  I-charge kini sa ledger sa customer nga walay cash disbursement.
                </p>
              </div>
            )}

            {/* Submit Charge Button */}
            <button
              type="button"
              disabled={processing || isInsufficient}
              onClick={() => void handleCharge()}
              className={`btn-press w-full py-4 rounded-2xl font-black text-sm tracking-wide uppercase transition-all shadow-xl ${
                isInsufficient
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/[0.04]'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 shadow-glow-emerald'
              }`}
            >
              {processing ? 'Processing Charge...' : isInsufficient ? 'Kulang ang Kwarta' : `Confirm & Charge ${money(total_c)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
