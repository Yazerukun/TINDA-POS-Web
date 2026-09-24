import React, { useState } from 'react'
import { X, CheckCircle2, Banknote, CreditCard, UserCheck, Printer, ShieldCheck, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { CartItem, Customer, DiscountType, StoreSettings, Transaction } from '../types'
import { money } from '../utils/format'
import { db } from '../db'
import { Receipt } from './Receipt'

interface CheckoutModalProps {
  items: CartItem[]
  subtotal_c: number
  discount_c: number
  discount_type: DiscountType
  total_c: number
  customers: Customer[]
  selectedCustomerId: number | null
  presetTender_c?: number
  cashierName?: string
  storeName?: string
  settings?: StoreSettings
  terminalId: string
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
  presetTender_c,
  cashierName = 'Master Concierge',
  storeName = 'PLATFORM_HQ',
  settings,
  terminalId,
  onClose,
  onComplete
}: CheckoutModalProps): React.JSX.Element {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH' | 'UTANG'>('CASH')
  const [tenderedInput, setTenderedInput] = useState<string>(
    presetTender_c ? (presetTender_c / 100).toString() : (total_c / 100).toString()
  )
  const [customerId, setCustomerId] = useState<number | null>(selectedCustomerId)
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null)
  const [processing, setProcessing] = useState(false)

  const tendered_c = Math.round((parseFloat(tenderedInput) || 0) * 100)
  const change_c = Math.max(0, tendered_c - total_c)
  const isInsufficient = paymentMethod === 'CASH' && tendered_c < total_c

  const quickCashPresets = [100, 200, 500, 1000, 2000, 5000]

  const handleCharge = async () => {
    if (processing) return
    if (paymentMethod === 'UTANG' && !customerId) {
      alert('Please select a customer account for Store Credit.')
      return
    }
    if (isInsufficient) {
      alert('Insufficient tender amount. Please enter an amount equal to or greater than the total.')
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
        cashier_name: cashierName,
        store_name: storeName
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

      // Trigger refined champagne celebration confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          colors: ['#D4AF37', '#E2C799', '#FFF0D4', '#8C6D23'],
          origin: { y: 0.6 }
        })
      } catch {
        // ignore
      }

      setCompletedTx(fullTx)
    } catch (err) {
      console.error(err)
      alert('Settlement failed: ' + (err as Error)?.message)
    } finally {
      setProcessing(false)
    }
  }

  const selectedCustomerObj = customers.find((c) => c.id === customerId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-2xl animate-fade-in">
      {/* Ambient gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/[0.03] blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-lg glass-vault rounded-3xl border border-gold/25 p-6 sm:p-7 shadow-vault text-stone-100 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/[0.12] text-gold-light border border-gold/30 shadow-glow-gold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base tracking-wider uppercase text-stone-100">
                {completedTx ? 'Settlement Authorized' : 'Authorize Settlement'}
              </h3>
              <p className="font-mono text-[10px] tracking-widest uppercase text-gold-muted mt-0.5">
                {completedTx ? `INVOICE #${completedTx.invoice_number}` : 'PRIVATE CLIENT TENDER PROTOCOL'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (completedTx) onComplete(completedTx)
              else onClose()
            }}
            className="btn-press rounded-xl p-2 text-stone-400 hover:text-stone-100 hover:bg-white/[0.05]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {completedTx ? (
          /* Receipt / Success View */
          <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-amber-500/[0.08] border border-gold/30 text-center">
              <CheckCircle2 className="h-12 w-12 text-gold-light mb-2 drop-shadow-sm" />
              <p className="font-serif text-base font-bold tracking-widest uppercase text-stone-100">
                Transaction Completed
              </p>
              <p className="font-serif text-3xl sm:text-4xl font-bold tracking-wider text-gold-light my-1.5 drop-shadow-[0_2px_15px_rgba(212,175,55,0.25)]">
                {money(completedTx.total_c)}
              </p>
              {completedTx.payment_method === 'CASH' && completedTx.change_c > 0 && (
                <div className="mt-2.5 px-3.5 py-1 rounded-full bg-zinc-950/80 border border-gold/30 text-xs font-mono font-medium text-stone-300">
                  Change:{' '}
                  <span className="text-gold-light font-bold font-mono">
                    {money(completedTx.change_c)}
                  </span>
                </div>
              )}
            </div>

            {/* Receipt Summary Box */}
            <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.06] p-4 text-xs font-mono space-y-2">
              <div className="flex justify-between border-b border-white/[0.06] pb-2 text-stone-400 text-[11px] uppercase tracking-wider">
                <span>Items ({completedTx.items.length})</span>
                <span>Qty x Price</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {completedTx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-stone-300">
                    <span className="truncate pr-2">{it.name}</span>
                    <span className="shrink-0 text-stone-400">
                      {it.quantity}x {money(it.unit_price_c)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] pt-2 space-y-1 text-stone-400">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-stone-200">{money(completedTx.subtotal_c)}</span>
                </div>
                {completedTx.discount_c > 0 && (
                  <div className="flex justify-between text-gold-muted font-medium">
                    <span>Privilege Discount (20%):</span>
                    <span>-{money(completedTx.discount_c)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-stone-100 text-sm pt-1.5 border-t border-white/[0.04]">
                  <span>Total Settled:</span>
                  <span className="text-gold-light font-serif text-base">{money(completedTx.total_c)}</span>
                </div>
              </div>
            </div>

            {/* Print-only 80mm receipt document */}
            <Receipt
              tx={completedTx}
              storeName={settings?.store_name}
              address={settings?.address}
              contact={settings?.contact_number}
              receiptFooter={settings?.receipt_footer}
              terminalId={terminalId}
            />

            {/* Print & Close Actions */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-press flex-1 py-3 px-4 rounded-2xl bg-zinc-950 border border-white/[0.08] hover:border-gold/40 text-stone-300 text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4 text-gold-muted" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => onComplete(completedTx)}
                className="btn-gold flex-1 py-3.5 px-4 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Settlement Form View */
          <div className="space-y-4">
            {/* Payment Method Selector: Cash, GCash, Client Credit (Utang) */}
            <div>
              <label className="block text-[10px] font-mono tracking-[0.2em] uppercase text-stone-400 mb-2">
                SELECT SETTLEMENT METHOD
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: 'Cash Tender', icon: Banknote },
                  { id: 'GCASH', label: 'E-Transfer', icon: CreditCard },
                  { id: 'UTANG', label: 'Store Credit', icon: UserCheck }
                ].map((m) => {
                  const isSelected = paymentMethod === m.id
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`btn-press flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-amber-500/[0.12] border-gold text-gold-light shadow-glow-gold'
                          : 'bg-zinc-950/50 border-white/[0.06] text-stone-400 hover:text-stone-200 hover:border-gold/20'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-gold' : 'text-stone-500'}`} />
                      <span className="text-[11px] font-semibold tracking-wider font-mono">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Client Assignment for Credit Ledger */}
            {paymentMethod === 'UTANG' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/[0.08] border border-gold/30 space-y-2">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-gold-light font-bold">
                  ASSIGN TO CUSTOMER ACCOUNT (STORE CREDIT)
                </label>
                <select
                  value={customerId || ''}
                  onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-zinc-950 border border-gold/30 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-gold"
                >
                  <option value="">-- Choose Customer Profile --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Current Balance: ₱{(c.balance_c / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
                {selectedCustomerObj && (
                  <p className="text-[10px] font-mono text-stone-400">
                    New Balance after this tender:{' '}
                    <span className="text-gold-light font-bold">
                      ₱{((selectedCustomerObj.balance_c + total_c) / 100).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Cash Tender Input & Presets */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono tracking-[0.2em] uppercase text-stone-400">
                    AMOUNT TENDERED (₱)
                  </label>
                  <button
                    type="button"
                    onClick={() => setTenderedInput((total_c / 100).toString())}
                    className="text-[10px] font-mono text-gold-light hover:underline uppercase"
                  >
                    Exact Amount (₱{(total_c / 100).toFixed(2)})
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif text-xl text-gold-muted font-bold">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={tenderedInput}
                    onChange={(e) => setTenderedInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold text-stone-100 text-lg font-mono font-bold focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-6 gap-1.5">
                  {quickCashPresets.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTenderedInput(amount.toString())}
                      className="btn-press py-2 rounded-xl bg-zinc-950/60 border border-white/[0.06] hover:border-gold/30 hover:bg-gold/10 text-[11px] font-mono text-stone-300 transition-all text-center"
                    >
                      ₱{amount >= 1000 ? `${amount / 1000}k` : amount}
                    </button>
                  ))}
                </div>

                {/* Live Change Calculation */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.05]">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-400">
                    Change Due:
                  </span>
                  <span
                    className={`text-base font-serif font-bold ${
                      isInsufficient ? 'text-red-400 font-mono text-xs' : 'text-gold-light'
                    }`}
                  >
                    {isInsufficient ? 'INSUFFICIENT TENDER' : money(change_c)}
                  </span>
                </div>
              </div>
            )}

            {/* Total Display */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-gold/30 flex items-center justify-between">
              <span className="font-mono text-xs tracking-wider uppercase text-stone-400">
                FINAL CHARGE TOTAL:
              </span>
              <span className="font-serif text-2xl font-bold tracking-wider text-gold-light">
                {money(total_c)}
              </span>
            </div>

            {/* Submit Action */}
            <button
              type="button"
              disabled={processing || isInsufficient}
              onClick={handleCharge}
              className={`btn-gold w-full py-4 px-6 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase shadow-glow-gold flex items-center justify-center gap-2 ${
                processing || isInsufficient ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{processing ? 'AUTHORIZING TRANSACTION...' : 'CONFIRM & AUTHORIZE SETTLEMENT'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
