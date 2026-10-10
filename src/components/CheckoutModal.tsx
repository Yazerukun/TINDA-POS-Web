import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Check,
  CheckCircle2,
  Banknote,
  Smartphone,
  Landmark,
  Wallet,
  Layers,
  Printer,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type {
  CartItem,
  Customer,
  DiscountType,
  PaymentMethod,
  SplitPaymentRecord,
  StoreSettings,
  Transaction
} from '../types'
import { money } from '../utils/format'
import { db } from '../db'
import { Receipt } from './Receipt'
import { playCheckoutChime } from '../lib/sound'

interface CheckoutModalProps {
  items: CartItem[]
  subtotal_c: number
  discount_c: number
  discount_type: DiscountType
  total_c: number
  customers: Customer[]
  selectedCustomerId: number | null
  presetTender_c?: number
  initialMethod?: PaymentMethod
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
  initialMethod = 'CASH',
  cashierName = 'Master Concierge',
  storeName = 'TINDA POS & RETAIL',
  settings,
  terminalId,
  onClose,
  onComplete
}: CheckoutModalProps): React.JSX.Element {
  const [isSplit, setIsSplit] = useState(initialMethod === 'SPLIT')
  const [method, setMethod] = useState<'CASH' | 'GCASH' | 'MAYA' | 'MARIBANK' | 'UTANG'>(
    initialMethod === 'SPLIT' ? 'CASH' : initialMethod
  )
  const [cash, setCash] = useState<string>(
    presetTender_c ? (presetTender_c / 100).toFixed(2) : (total_c / 100).toFixed(2)
  )
  const [reference, setReference] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(selectedCustomerId)
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null)
  const [processing, setProcessing] = useState(false)

  // Split payment state
  const [splitState, setSplitState] = useState({
    cashAmount: '',
    cashTendered: '',
    gcashAmount: '',
    gcashRef: '',
    mayaAmount: '',
    mayaRef: '',
    maribankAmount: '',
    maribankRef: '',
    utangAmount: ''
  })

  const cashInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)

  const cashC = Math.round((parseFloat(cash) || 0) * 100)
  const changeC = cashC - total_c

  // Split calculations
  const splitCashAllocatedC = Math.max(0, Math.round((parseFloat(splitState.cashAmount) || 0) * 100))
  const splitCashTenderedC = Math.max(
    0,
    Math.round((parseFloat(splitState.cashTendered || splitState.cashAmount) || 0) * 100)
  )
  const splitGcashC = Math.max(0, Math.round((parseFloat(splitState.gcashAmount) || 0) * 100))
  const splitMayaC = Math.max(0, Math.round((parseFloat(splitState.mayaAmount) || 0) * 100))
  const splitMaribankC = Math.max(0, Math.round((parseFloat(splitState.maribankAmount) || 0) * 100))
  const splitUtangC = Math.max(0, Math.round((parseFloat(splitState.utangAmount) || 0) * 100))

  const totalAllocatedC =
    splitCashAllocatedC + splitGcashC + splitMayaC + splitMaribankC + splitUtangC
  const remainingC = total_c - totalAllocatedC
  const splitCashChangeC =
    splitCashAllocatedC > 0 ? Math.max(0, splitCashTenderedC - splitCashAllocatedC) : 0

  const fillRemaining = (target: 'cash' | 'gcash' | 'maya' | 'maribank' | 'utang') => {
    const otherAllocatedC =
      (target === 'cash' ? 0 : splitCashAllocatedC) +
      (target === 'gcash' ? 0 : splitGcashC) +
      (target === 'maya' ? 0 : splitMayaC) +
      (target === 'maribank' ? 0 : splitMaribankC) +
      (target === 'utang' ? 0 : splitUtangC)
    const neededC = Math.max(0, total_c - otherAllocatedC)
    const neededPesos = neededC > 0 ? (neededC / 100).toFixed(2) : ''

    setSplitState((prev) => {
      switch (target) {
        case 'cash':
          return { ...prev, cashAmount: neededPesos, cashTendered: neededPesos }
        case 'gcash':
          return { ...prev, gcashAmount: neededPesos }
        case 'maya':
          return { ...prev, mayaAmount: neededPesos }
        case 'maribank':
          return { ...prev, maribankAmount: neededPesos }
        case 'utang':
          return { ...prev, utangAmount: neededPesos }
      }
    })
  }

  // Hotkeys
  useEffect(() => {
    const handleCheckoutHotkeys = (e: KeyboardEvent) => {
      if (completedTx) {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          e.preventDefault()
          onComplete(completedTx)
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Enter' && !isSplit) {
        // Prevent enter submission while focused on inputs unless valid
        if (method === 'CASH' && cashC < total_c) return
        e.preventDefault()
        void handleCharge()
        return
      }

      if (!isSplit) {
        if (e.key === 'F9') {
          e.preventDefault()
          setMethod('CASH')
          setTimeout(() => {
            cashInputRef.current?.focus()
            cashInputRef.current?.select()
          }, 50)
          return
        }
        if (e.key === 'F10') {
          e.preventDefault()
          setMethod('GCASH')
          setTimeout(() => {
            refInputRef.current?.focus()
            refInputRef.current?.select()
          }, 50)
          return
        }
        if (e.key === 'F11') {
          e.preventDefault()
          setMethod('MAYA')
          setTimeout(() => {
            refInputRef.current?.focus()
            refInputRef.current?.select()
          }, 50)
          return
        }
        if (e.key === 'F12') {
          e.preventDefault()
          setMethod('MARIBANK')
          setTimeout(() => {
            refInputRef.current?.focus()
            refInputRef.current?.select()
          }, 50)
          return
        }
      }
    }

    window.addEventListener('keydown', handleCheckoutHotkeys)
    return () => window.removeEventListener('keydown', handleCheckoutHotkeys)
  }, [completedTx, isSplit, method, cashC, total_c, cash, reference, customerId])

  const handleCharge = async () => {
    if (processing) return

    if (isSplit) {
      if (remainingC !== 0) {
        alert(
          `Payment mismatch: Please allocate exactly ${money(total_c)}. Currently allocated: ${money(totalAllocatedC)}.`
        )
        return
      }
      if (splitUtangC > 0 && !customerId) {
        alert('Please select a customer account for the Utang portion.')
        return
      }
    } else {
      if (method === 'UTANG' && !customerId) {
        alert('Please select a customer account for Store Credit (Utang).')
        return
      }
      if (method === 'CASH' && cashC < total_c) {
        alert('Insufficient cash tendered. Please enter at least ' + money(total_c))
        cashInputRef.current?.focus()
        return
      }
    }

    setProcessing(true)
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
      const now = new Date().toISOString()

      let payments: SplitPaymentRecord[] = []
      let finalPaymentMethod: PaymentMethod = isSplit ? 'SPLIT' : method
      let finalTenderedC = total_c
      let finalChangeC = 0

      if (!isSplit) {
        if (method === 'CASH') {
          finalTenderedC = cashC
          finalChangeC = Math.max(0, changeC)
          payments = [{ method: 'CASH', amount_c: cashC, reference: null }]
        } else if (method === 'GCASH') {
          payments = [{ method: 'GCASH', amount_c: total_c, reference: reference.trim() || null }]
        } else if (method === 'MAYA') {
          payments = [{ method: 'MAYA', amount_c: total_c, reference: reference.trim() || null }]
        } else if (method === 'MARIBANK') {
          payments = [{ method: 'MARIBANK', amount_c: total_c, reference: reference.trim() || null }]
        } else if (method === 'UTANG') {
          payments = [{ method: 'UTANG', amount_c: total_c, reference: null }]
        }
      } else {
        if (splitCashAllocatedC > 0) {
          payments.push({
            method: 'CASH',
            amount_c: splitCashTenderedC > splitCashAllocatedC ? splitCashTenderedC : splitCashAllocatedC,
            reference: null
          })
        }
        if (splitGcashC > 0) {
          payments.push({
            method: 'GCASH',
            amount_c: splitGcashC,
            reference: splitState.gcashRef.trim() || null
          })
        }
        if (splitMayaC > 0) {
          payments.push({
            method: 'MAYA',
            amount_c: splitMayaC,
            reference: splitState.mayaRef.trim() || null
          })
        }
        if (splitMaribankC > 0) {
          payments.push({
            method: 'MARIBANK',
            amount_c: splitMaribankC,
            reference: splitState.maribankRef.trim() || null
          })
        }
        if (splitUtangC > 0) {
          payments.push({
            method: 'UTANG',
            amount_c: splitUtangC,
            reference: null
          })
        }
        finalTenderedC =
          splitCashTenderedC > splitCashAllocatedC
            ? totalAllocatedC + (splitCashTenderedC - splitCashAllocatedC)
            : totalAllocatedC
        finalChangeC = splitCashChangeC
      }

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
        payment_method: finalPaymentMethod,
        payments,
        amount_tendered_c: finalTenderedC,
        change_c: finalChangeC,
        customer_id: customerId,
        cashier_name: cashierName,
        store_name: storeName,
        status: 'COMPLETED'
      }

      const txId = await db.transactions.add(newTx as unknown as Transaction)
      const fullTx: Transaction = { ...newTx, id: txId }

      // Deduct inventory stock
      for (const item of items) {
        if (item.product.id > 0) {
          const prod = await db.products.get(item.product.id)
          if (prod) {
            const newStock = Math.max(0, prod.stock - item.quantity)
            await db.products.update(prod.id, { stock: newStock, updated_at: now })
          }
        }
      }

      // If Utang, increase customer balance
      const utangAmountC = isSplit ? splitUtangC : method === 'UTANG' ? total_c : 0
      if (utangAmountC > 0 && customerId) {
        const cust = await db.customers.get(customerId)
        if (cust) {
          await db.customers.update(customerId, {
            balance_c: (cust.balance_c || 0) + utangAmountC,
            updated_at: now
          })
        }
      }

      // Celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          colors: ['#10b981', '#34d399', '#f59e0b', '#fbbf24'],
          origin: { y: 0.6 }
        })
      } catch {}

      setCompletedTx(fullTx)
      playCheckoutChime()

      // Broadcast to live Customer Facing Display / Sales Monitor
      try {
        const monitorChannel = new BroadcastChannel('tinda_sales_monitor')
        monitorChannel.postMessage({
          type: 'SALE_COMPLETED',
          transaction: fullTx,
          change_c: finalChangeC
        })
      } catch {}

      if (settings?.printer_auto_print) {
        setTimeout(() => {
          window.print()
        }, 300)
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Checkout settlement failed: ' + (err as Error)?.message)
    } finally {
      setProcessing(false)
    }
  }

  const selectedCustomerObj = customers.find((c) => c.id === customerId)

  // -------------------------------------------------------------
  // SUCCESS / CELEBRATION VIEW
  // -------------------------------------------------------------
  if (completedTx) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in select-none">
        <div className="relative w-full max-w-lg bg-obsidian-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[92vh] overflow-y-auto custom-scrollbar text-stone-100">
          <div className="text-center mb-4">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-bounce">
              <Check className="h-9 w-9 stroke-[3]" />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Payment Successful</h3>
            <p className="mt-1 text-2xl font-black text-emerald-400 tabular-nums">
              {money(completedTx.total_c)}
            </p>
            <p className="mt-0.5 text-xs text-stone-400 font-mono">{completedTx.invoice_number}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <kbd className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200 border border-emerald-500/40">
                Enter
              </kbd>
              <span>or</span>
              <kbd className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200 border border-emerald-500/40">
                Esc
              </kbd>
              <span>to start next transaction</span>
            </div>
          </div>

          <div className="my-2 border-t border-slate-800 pt-4">
            <Receipt
              tx={completedTx}
              storeName={storeName}
              customerName={selectedCustomerObj?.name}
              customerBalance_c={selectedCustomerObj?.balance_c}
              terminalId={terminalId}
              allowCustomization={true}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-obsidian-950 text-stone-300 hover:text-white hover:border-slate-600 flex items-center gap-1.5 text-xs font-bold transition-all"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => onComplete(completedTx)}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-black text-xs transition-all shadow-glow-emerald active:scale-95"
            >
              Done (Enter)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Single payment methods matching desktop
  const methods = [
    {
      key: 'CASH',
      label: 'Cash',
      icon: <Banknote className="h-4 w-4" />,
      shortcut: 'F9',
      activeClass: '!border-emerald-500 !text-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
    },
    {
      key: 'GCASH',
      label: 'GCash',
      icon: <Smartphone className="h-4 w-4" />,
      shortcut: 'F10',
      activeClass: '!border-sky-500 !text-sky-400 bg-sky-500/10 shadow-[0_0_12px_rgba(14,165,233,0.15)]'
    },
    {
      key: 'MAYA',
      label: 'Maya',
      icon: <Smartphone className="h-4 w-4" />,
      shortcut: 'F11',
      activeClass: '!border-teal-500 !text-teal-300 bg-teal-500/10 shadow-[0_0_12px_rgba(20,184,166,0.15)]'
    },
    {
      key: 'MARIBANK',
      label: 'MariBank',
      icon: <Landmark className="h-4 w-4 text-[#FF8533]" />,
      shortcut: 'F12',
      activeClass: '!border-[#FF6A00] !text-[#FF8533] bg-[#FF6A00]/10 shadow-[0_0_12px_rgba(255,106,0,0.2)]'
    },
    {
      key: 'UTANG',
      label: 'Utang',
      icon: <Wallet className="h-4 w-4 text-rose-400" />,
      shortcut: '',
      activeClass: '!border-rose-500 !text-rose-400 bg-rose-500/10 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-obsidian-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-950/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-100 text-base font-sans tracking-wide">
              Checkout & Settlement
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {terminalId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* Total Summary Card */}
          <div className="rounded-2xl border border-slate-800 bg-obsidian-950 p-4 text-center">
            <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">
              Total Amount to Pay
            </p>
            <p className="text-3xl font-black text-white font-mono mt-0.5">
              {money(total_c)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Subtotal: {money(subtotal_c)} {discount_c > 0 && `· Discount: -${money(discount_c)}`}
            </p>
          </div>

          {/* Single vs Split Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-obsidian-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setIsSplit(false)}
              className={`py-1.5 font-bold rounded-lg transition-all ${
                !isSplit
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Single Payment
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSplit(true)
                if (
                  !splitState.cashAmount &&
                  !splitState.gcashAmount &&
                  !splitState.mayaAmount &&
                  !splitState.maribankAmount &&
                  !splitState.utangAmount
                ) {
                  const initialPesos = (total_c / 100).toFixed(2)
                  if (method === 'CASH')
                    setSplitState((s) => ({
                      ...s,
                      cashAmount: initialPesos,
                      cashTendered: initialPesos
                    }))
                  else if (method === 'GCASH')
                    setSplitState((s) => ({ ...s, gcashAmount: initialPesos }))
                  else if (method === 'MAYA')
                    setSplitState((s) => ({ ...s, mayaAmount: initialPesos }))
                  else if (method === 'MARIBANK')
                    setSplitState((s) => ({ ...s, maribankAmount: initialPesos }))
                  else if (method === 'UTANG')
                    setSplitState((s) => ({ ...s, utangAmount: initialPesos }))
                }
              }}
              className={`py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isSplit
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Split / Mixed Payment</span>
            </button>
          </div>

          {/* SINGLE PAYMENT MODE */}
          {!isSplit ? (
            <>
              {/* Payment Method Selector Grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {methods.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setMethod(m.key as typeof method)
                      if (m.key === 'CASH') {
                        setTimeout(() => {
                          cashInputRef.current?.focus()
                          cashInputRef.current?.select()
                        }, 50)
                      } else if (
                        m.key === 'GCASH' ||
                        m.key === 'MAYA' ||
                        m.key === 'MARIBANK'
                      ) {
                        setTimeout(() => {
                          refInputRef.current?.focus()
                          refInputRef.current?.select()
                        }, 50)
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border text-xs transition-all ${
                      method === m.key
                        ? m.activeClass
                        : 'border-slate-800 bg-obsidian-950/60 text-stone-400 hover:text-stone-200 hover:border-slate-700'
                    }`}
                  >
                    {m.icon}
                    <span className="truncate w-full text-center text-[11px] font-bold">
                      {m.label}
                    </span>
                    {m.shortcut ? (
                      <span className="text-[9px] text-stone-500 font-mono">[{m.shortcut}]</span>
                    ) : (
                      <span className="text-[9px] opacity-0 font-mono">[--]</span>
                    )}
                  </button>
                ))}
              </div>

              {/* CASH PAYMENT SECTION */}
              {method === 'CASH' && (
                <div className="space-y-3 p-4 rounded-2xl bg-obsidian-950 border border-slate-800">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-300">
                        Cash Received / Tendered
                      </label>
                      <span className="text-[11px] text-stone-500 font-mono">Press F9 to focus</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-stone-400">
                        ₱
                      </span>
                      <input
                        ref={cashInputRef}
                        type="number"
                        step="any"
                        value={cash}
                        onChange={(e) => setCash(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-2xl font-black text-white focus:border-emerald-500 outline-none font-mono"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Fast Banknote Tender Grid */}
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                      Fast Tender Banknotes
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCash((total_c / 100).toFixed(2))}
                        className="col-span-2 sm:col-span-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-1.5 px-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all"
                        title="Exact amount"
                      >
                        Exact
                      </button>
                      {[20, 50, 100, 200, 500, 1000].map((bill) => (
                        <button
                          key={`bill-${bill}`}
                          type="button"
                          onClick={() => setCash(String(bill))}
                          className={`rounded-lg border py-1.5 px-1 text-xs font-bold transition-all active:scale-95 ${
                            parseFloat(cash) === bill
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-black'
                              : 'border-slate-800 bg-obsidian-900 text-stone-300 hover:border-slate-700 hover:bg-obsidian-850'
                          }`}
                        >
                          ₱{bill}
                        </button>
                      ))}
                    </div>

                    {/* Quick Add Increments & Smart Rounding */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-stone-500 font-medium mr-0.5">Quick Add:</span>
                      {[20, 50, 100, 500].map((addAmount) => (
                        <button
                          key={`add-${addAmount}`}
                          type="button"
                          onClick={() => {
                            const currentVal = parseFloat(cash) || total_c / 100
                            setCash(String(Math.round((currentVal + addAmount) * 100) / 100))
                          }}
                          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all"
                        >
                          +₱{addAmount}
                        </button>
                      ))}

                      {total_c > 0 &&
                        (() => {
                          const totalPesos = total_c / 100
                          const next50 = Math.ceil(totalPesos / 50) * 50
                          const next100 = Math.ceil(totalPesos / 100) * 100
                          const targets = Array.from(new Set([next50, next100])).filter(
                            (t) => t > totalPesos && t !== 1000 && t !== 500
                          )
                          return targets.map((t) => (
                            <button
                              key={`next-round-${t}`}
                              type="button"
                              onClick={() => setCash(String(t))}
                              className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 active:scale-95 transition-all"
                            >
                              Round ₱{t}
                            </button>
                          ))
                        })()}
                    </div>
                  </div>

                  {/* Grand Change Due Showcase Display */}
                  <div
                    className={`rounded-xl border p-3 transition-all duration-150 ${
                      changeC >= 0
                        ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-obsidian-900 shadow-inner'
                        : 'border-rose-500/40 bg-rose-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-300">
                        {changeC >= 0 ? 'Sukli (Change Due)' : 'Kulang (Remaining Due)'}
                      </span>
                      {changeC > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400">Ready to dispense</span>
                      )}
                    </div>
                    <p
                      className={`text-2xl font-black font-mono mt-0.5 ${
                        changeC >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {money(Math.abs(changeC))}
                    </p>
                  </div>
                </div>
              )}

              {/* DIGITAL PAYMENT SECTION (GCASH, MAYA, MARIBANK) */}
              {(method === 'GCASH' || method === 'MAYA' || method === 'MARIBANK') && (
                <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-200">
                      {method} Payment Confirmation
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {money(total_c)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 uppercase font-semibold mb-1">
                      Reference / Trace No. (Optional)
                    </label>
                    <input
                      ref={refInputRef}
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. 10928347102"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-100 text-xs font-mono focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* UTANG SECTION */}
              {method === 'UTANG' && (
                <div className="p-4 rounded-2xl bg-obsidian-950 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300">
                      Store Credit / Utang Charge
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {money(total_c)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 uppercase font-semibold mb-1">
                      Select Customer / Suki Account *
                    </label>
                    <select
                      value={customerId || ''}
                      onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-100 text-xs focus:border-rose-500 outline-none"
                    >
                      <option value="">-- Pumili ng Suki Account --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.balance_c > 0 ? `(Balanse: ${money(c.balance_c)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedCustomerObj && (
                    <div className="p-3 rounded-xl bg-obsidian-900 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-stone-400">
                        <span>Kasalukuyang Utang:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {money(selectedCustomerObj.balance_c || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-stone-200 font-bold border-t border-slate-800 pt-1">
                        <span>Bagong Balanse Matapos nito:</span>
                        <span className="font-mono text-rose-300">
                          {money((selectedCustomerObj.balance_c || 0) + total_c)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* SPLIT PAYMENT MODE */
            <div className="space-y-3 p-4 rounded-2xl bg-obsidian-950 border border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-stone-300 uppercase tracking-wider text-[11px]">
                  Split Payment Breakdown
                </span>
                <span
                  className={`font-mono font-bold text-xs ${
                    remainingC === 0
                      ? 'text-emerald-400'
                      : remainingC > 0
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {remainingC === 0
                    ? '✓ 100% Allocated'
                    : remainingC > 0
                    ? `Allocate ${money(remainingC)} More`
                    : `Over by ${money(Math.abs(remainingC))}`}
                </span>
              </div>

              {/* Cash Row */}
              <div className="flex items-center gap-2">
                <span className="w-16 font-semibold text-stone-400">Cash:</span>
                <input
                  type="number"
                  step="any"
                  value={splitState.cashAmount}
                  onChange={(e) =>
                    setSplitState((s) => ({
                      ...s,
                      cashAmount: e.target.value,
                      cashTendered: e.target.value
                    }))
                  }
                  placeholder="₱0.00"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => fillRemaining('cash')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-stone-300"
                >
                  Fill
                </button>
              </div>

              {/* GCash Row */}
              <div className="flex items-center gap-2">
                <span className="w-16 font-semibold text-stone-400">GCash:</span>
                <input
                  type="number"
                  step="any"
                  value={splitState.gcashAmount}
                  onChange={(e) => setSplitState((s) => ({ ...s, gcashAmount: e.target.value }))}
                  placeholder="₱0.00"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => fillRemaining('gcash')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-stone-300"
                >
                  Fill
                </button>
              </div>

              {/* Maya Row */}
              <div className="flex items-center gap-2">
                <span className="w-16 font-semibold text-stone-400">Maya:</span>
                <input
                  type="number"
                  step="any"
                  value={splitState.mayaAmount}
                  onChange={(e) => setSplitState((s) => ({ ...s, mayaAmount: e.target.value }))}
                  placeholder="₱0.00"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => fillRemaining('maya')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-stone-300"
                >
                  Fill
                </button>
              </div>

              {/* MariBank Row */}
              <div className="flex items-center gap-2">
                <span className="w-16 font-semibold text-stone-400">MariBank:</span>
                <input
                  type="number"
                  step="any"
                  value={splitState.maribankAmount}
                  onChange={(e) => setSplitState((s) => ({ ...s, maribankAmount: e.target.value }))}
                  placeholder="₱0.00"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => fillRemaining('maribank')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-stone-300"
                >
                  Fill
                </button>
              </div>

              {/* Utang Row */}
              <div className="flex items-center gap-2">
                <span className="w-16 font-semibold text-stone-400">Utang:</span>
                <input
                  type="number"
                  step="any"
                  value={splitState.utangAmount}
                  onChange={(e) => setSplitState((s) => ({ ...s, utangAmount: e.target.value }))}
                  placeholder="₱0.00"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => fillRemaining('utang')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-stone-300"
                >
                  Fill
                </button>
              </div>

              {splitUtangC > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[11px] text-stone-400 uppercase font-semibold mb-1">
                    Select Suki Account for Utang Portion:
                  </label>
                  <select
                    value={customerId || ''}
                    onChange={(e) =>
                      setCustomerId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 text-xs focus:border-rose-500 outline-none"
                  >
                    <option value="">-- Pumili ng Suki Account --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-obsidian-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-850 text-stone-400 hover:text-stone-200 text-xs font-bold transition-all"
          >
            Cancel (Esc)
          </button>

          <button
            type="button"
            onClick={handleCharge}
            disabled={
              processing ||
              (isSplit ? remainingC !== 0 : method === 'CASH' && cashC < total_c)
            }
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-110 text-obsidian-950 font-black text-xs transition-all shadow-glow-emerald disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {isSplit
                ? remainingC === 0
                  ? `Charge Split ${money(total_c)} (Enter)`
                  : remainingC > 0
                  ? `Allocate ${money(remainingC)} More`
                  : `Over by ${money(Math.abs(remainingC))}`
                : `Charge ${money(total_c)} (Enter)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
