import React, { useState, useMemo } from 'react'
import {
  BarChart3,
  Calendar,
  Printer,
  Receipt,
  TrendingUp,
  Download,
  CheckCircle2,
  FileText,
  DollarSign,
  CreditCard,
  Wallet,
  ShieldCheck,
  RefreshCw,
  Coins
} from 'lucide-react'
import type { Transaction, StoreSettings, Expense } from '../types'
import { formatCurrency } from '../utils/format'
import { playSuccessSound } from '../lib/sound'

interface ReportsScreenProps {
  transactions: Transaction[]
  expenses?: Expense[]
  settings?: StoreSettings
  currentCashierName?: string
  storeName?: string
}

export function ReportsScreen({
  transactions,
  expenses = [],
  settings,
  currentCashierName = 'Cashier',
  storeName = 'TINDA Retail Station'
}: ReportsScreenProps): React.JSX.Element {
  const [reportType, setReportType] = useState<'Z_READ' | 'X_READ'>('Z_READ')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]!
  })
  const [isPrinting, setIsPrinting] = useState(false)

  // Filter transactions by selected business date
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.status === 'VOIDED') return false
      const txDate = tx.created_at.split('T')[0]
      return txDate === selectedDate
    })
  }, [transactions, selectedDate])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = e.date ? e.date.split('T')[0] : e.created_at.split('T')[0]
      return expDate === selectedDate
    })
  }, [expenses, selectedDate])

  // Financial calculations
  const grossSalesCents = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + (tx.subtotal_c || tx.total_c), 0)
  }, [filteredTransactions])

  const totalDiscountsCents = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + (tx.discount_c || 0), 0)
  }, [filteredTransactions])

  const netSalesCents = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + tx.total_c, 0)
  }, [filteredTransactions])

  const totalExpensesCents = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount_c, 0)
  }, [filteredExpenses])

  const cashSalesCents = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.payment_method === 'CASH')
      .reduce((sum, tx) => sum + tx.total_c, 0)
  }, [filteredTransactions])

  const gcashSalesCents = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.payment_method === 'GCASH')
      .reduce((sum, tx) => sum + tx.total_c, 0)
  }, [filteredTransactions])

  const utangSalesCents = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.payment_method === 'UTANG')
      .reduce((sum, tx) => sum + tx.total_c, 0)
  }, [filteredTransactions])

  const totalItemsSold = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => {
      const itemsCount = tx.items ? tx.items.reduce((iSum, i) => iSum + i.quantity, 0) : 1
      return sum + itemsCount
    }, 0)
  }, [filteredTransactions])

  const netRegisterCash = cashSalesCents - totalExpensesCents

  const handlePrintZReading = () => {
    setIsPrinting(true)
    playSuccessSound()
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 300)
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-obsidian-950 p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-wide">
              Reports &amp; Z-Reading Hub
            </h1>
            <p className="text-xs text-stone-400">
              End-of-day BIR Z-Reading, cashier shift audit, expense reconciliations, and thermal printouts
            </p>
          </div>
        </div>

        {/* Date Selector & Mode Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-obsidian-900 border border-slate-800 rounded-2xl p-1">
            <button
              onClick={() => setReportType('Z_READ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                reportType === 'Z_READ'
                  ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Z-Reading (End of Day)
            </button>
            <button
              onClick={() => setReportType('X_READ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                reportType === 'X_READ'
                  ? 'bg-sky-500 text-obsidian-950 shadow-glow-sky font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              X-Reading (Shift Mid-Audit)
            </button>
          </div>

          <div className="flex items-center gap-2 bg-obsidian-900 border border-slate-800 rounded-2xl px-3 py-1.5 text-stone-300 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-stone-100 font-mono outline-none"
            />
          </div>

          <button
            onClick={handlePrintZReading}
            className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-glow-emerald active:scale-95 shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print {reportType === 'Z_READ' ? 'Z-Read' : 'X-Read'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: KPI Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
              <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
                Gross Sales
              </p>
              <p className="text-xl font-mono font-bold text-stone-100 mt-1">
                {formatCurrency(grossSalesCents)}
              </p>
              <p className="text-[0.625rem] text-stone-500 mt-1 font-mono">
                {filteredTransactions.length} Resibo Issued
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
              <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
                Total Senior/PWD Disc.
              </p>
              <p className="text-xl font-mono font-bold text-amber-400 mt-1">
                -{formatCurrency(totalDiscountsCents)}
              </p>
              <p className="text-[0.625rem] text-stone-500 mt-1 font-mono">
                Mandatory Subsidies
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-obsidian-900 border border-emerald-500/30">
              <p className="text-[0.6875rem] font-bold text-emerald-400 uppercase tracking-wider">
                Net Sales (Actual Revenue)
              </p>
              <p className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {formatCurrency(netSalesCents)}
              </p>
              <p className="text-[0.625rem] text-emerald-500/80 mt-1 font-mono">
                {totalItemsSold} Items Sold
              </p>
            </div>
          </div>

          {/* Payment Method Split Bento */}
          <div className="p-5 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider font-sans">
              Tender &amp; Payment Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-obsidian-950 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                  <span className="font-sans">Cash in Register</span>
                  <Coins className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-lg font-mono font-bold text-emerald-400">
                  {formatCurrency(cashSalesCents)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-950 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                  <span className="font-sans">GCash / Maya Digital</span>
                  <CreditCard className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-lg font-mono font-bold text-blue-400">
                  {formatCurrency(gcashSalesCents)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-950 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                  <span className="font-sans">Utang (Credit Extended)</span>
                  <Wallet className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-lg font-mono font-bold text-rose-400">
                  {formatCurrency(utangSalesCents)}
                </p>
              </div>
            </div>
          </div>

          {/* Cash Drawer Reconciliation */}
          <div className="p-5 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider font-sans">
              Physical Cash Drawer Reconciliation
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-stone-400">Total Cash Sales Collected:</span>
                <span className="text-stone-200 font-bold">{formatCurrency(cashSalesCents)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-rose-400">Bawas: Operating Expenses Disbursed:</span>
                <span className="text-rose-400 font-bold">-{formatCurrency(totalExpensesCents)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm font-bold pt-2">
                <span className="text-emerald-400">Expected Physical Drawer Cash:</span>
                <span className="text-emerald-400 text-base">{formatCurrency(netRegisterCash)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Thermal Z-Reading Preview Tape (5 cols) */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                  Thermal Tape Preview
                </span>
              </div>
              <span className="text-[0.6875rem] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                58mm / 80mm
              </span>
            </div>

            {/* Simulated Thermal Tape Paper */}
            <div className="p-5 rounded-2xl bg-white text-black font-mono text-[0.6875rem] shadow-inner space-y-3 leading-relaxed">
              <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2">
                <p className="font-bold text-xs uppercase">{storeName}</p>
                <p className="text-[0.625rem]">{settings?.address || 'Philippine Retail Station'}</p>
                <p className="text-[0.625rem]">TIN: 000-000-000-000 · POS-TRM-8891</p>
                <p className="font-bold text-xs mt-1 uppercase">*** OFFICIAL {reportType} ***</p>
              </div>

              <div className="space-y-1 text-[0.625rem]">
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{currentCashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>TERMINAL:</span>
                  <span>TRM-8891</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-1.5 space-y-1">
                <div className="flex justify-between">
                  <span>GROSS SALES:</span>
                  <span className="font-bold">{formatCurrency(grossSalesCents)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>DISCOUNTS (SR/PWD):</span>
                  <span>-{formatCurrency(totalDiscountsCents)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-gray-300">
                  <span>NET SALES:</span>
                  <span>{formatCurrency(netSalesCents)}</span>
                </div>
              </div>

              <div className="space-y-1 text-[0.625rem]">
                <p className="font-bold">PAYMENT BREAKDOWN:</p>
                <div className="flex justify-between">
                  <span>CASH:</span>
                  <span>{formatCurrency(cashSalesCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GCASH / MAYA:</span>
                  <span>{formatCurrency(gcashSalesCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>UTANG:</span>
                  <span>{formatCurrency(utangSalesCents)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 pt-1.5 space-y-1 text-[0.625rem]">
                <div className="flex justify-between">
                  <span>TX COUNT:</span>
                  <span>{filteredTransactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>ITEMS SOLD:</span>
                  <span>{totalItemsSold}</span>
                </div>
                <div className="flex justify-between">
                  <span>DRAWER CASH:</span>
                  <span className="font-bold">{formatCurrency(netRegisterCash)}</span>
                </div>
              </div>

              <div className="text-center text-[0.5625rem] text-gray-500 pt-2 border-t border-dashed border-gray-400">
                <p>END OF {reportType}</p>
                <p>TINDA Retail Management System</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
