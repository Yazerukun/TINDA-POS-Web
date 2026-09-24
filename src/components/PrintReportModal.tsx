import React, { useState } from 'react'
import {
  Printer,
  X,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Crown
} from 'lucide-react'
import type { Transaction, Expense, Product, StoreSettings, CashCountRecord } from '../types'
import { money, formatDateTime } from '../utils/format'
import { Barcode } from '../utils/barcode'

export interface PrintReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportType: 'X' | 'Z' | 'CASHCOUNT' | 'SALES'
  transactions: Transaction[]
  expenses?: Expense[]
  products?: Product[]
  settings?: StoreSettings
  cashierName?: string
  storeName?: string
  cashCounts?: Record<string, number>
  totalPhysicalCash_c?: number
  expectedCashInDrawer_c?: number
  onSaveZRead?: () => Promise<void>
}

export function PrintReportModal({
  isOpen,
  onClose,
  reportType,
  transactions,
  expenses = [],
  products = [],
  settings,
  cashierName = 'Master Admin',
  storeName = 'TINDA POS & RETAIL',
  cashCounts = {},
  totalPhysicalCash_c = 0,
  expectedCashInDrawer_c = 0,
  onSaveZRead
}: PrintReportModalProps): React.JSX.Element | null {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm' | 'A4'>(
    settings?.printer_paper_width || '80mm'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  if (!isOpen) return null

  // Financial computations
  const validTx = transactions.filter((t) => (t.status || 'COMPLETED') !== 'VOIDED')
  const totalSales_c = validTx.reduce((sum, t) => sum + t.total_c, 0)
  const cashSales_c = validTx.filter((t) => t.payment_method === 'CASH').reduce((sum, t) => sum + t.total_c, 0)
  const gcashSales_c = validTx.filter((t) => t.payment_method === 'GCASH').reduce((sum, t) => sum + t.total_c, 0)
  const utangSales_c = validTx.filter((t) => t.payment_method === 'UTANG').reduce((sum, t) => sum + t.total_c, 0)
  const totalDiscounts_c = validTx.reduce((sum, t) => sum + (t.discount_c || 0), 0)

  // Cost map
  const costMap = new Map<number, number>()
  products.forEach((p) => {
    costMap.set(p.id, p.cost_c || 0)
  })

  let totalCost_c = 0
  let totalItemsSold = 0

  validTx.forEach((tx) => {
    tx.items?.forEach((item) => {
      totalItemsSold += item.quantity
      const unitCost = costMap.get(item.product_id) || Math.round(item.unit_price_c * 0.75)
      totalCost_c += unitCost * item.quantity
    })
  })

  const grossProfit_c = totalSales_c - totalCost_c
  const totalExpenses_c = expenses.reduce((sum, e) => sum + (e.amount_c || 0), 0)
  const netProfit_c = grossProfit_c - totalExpenses_c
  const avgBasket_c = validTx.length > 0 ? Math.round(totalSales_c / validTx.length) : 0

  // Cash reconciliation
  const cashOverShort_c = totalPhysicalCash_c - expectedCashInDrawer_c

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  const timeStr = now.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  const reportTitle =
    reportType === 'Z'
      ? 'DAILY Z-READING (STORE CLOSURE AUDIT)'
      : reportType === 'X'
      ? 'MID-DAY X-READING (SHIFT AUDIT)'
      : reportType === 'CASHCOUNT'
      ? 'CASH DRAWER RECONCILIATION AUDIT'
      : 'PERIOD SALES PERFORMANCE REPORT'

  const reportId = `REP-${reportType}-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.getHours()}${now.getMinutes()}`

  const handlePrint = () => {
    window.print()
  }

  const handleConfirmSaveZRead = async () => {
    if (!onSaveZRead) return
    setIsSaving(true)
    try {
      await onSaveZRead()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const is58mm = paperWidth === '58mm'
  const isA4 = paperWidth === 'A4'

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col items-center justify-start p-3 sm:p-6 overflow-y-auto animate-fade-in">
      {/* ── TOP CONTROLS BAR (Hidden during printing) ── */}
      <div className="no-print w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-gold/30 flex items-center justify-center text-gold-light">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">{reportTitle}</h2>
            <p className="text-[11px] font-mono text-stone-400">
              Audit Date: {dateStr} • Cashier: {cashierName}
            </p>
          </div>
        </div>

        {/* Paper Selector & Print Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg transition-all ${
                paperWidth === '58mm' ? 'bg-amber-500/20 text-gold-light font-bold border border-gold/40' : 'text-stone-400 hover:text-white'
              }`}
            >
              58mm Roll
            </button>
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg transition-all ${
                paperWidth === '80mm' ? 'bg-amber-500/20 text-gold-light font-bold border border-gold/40' : 'text-stone-400 hover:text-white'
              }`}
            >
              80mm Roll
            </button>
            <button
              onClick={() => setPaperWidth('A4')}
              className={`px-3 py-1 rounded-lg transition-all ${
                paperWidth === 'A4' ? 'bg-amber-500/20 text-gold-light font-bold border border-gold/40' : 'text-stone-400 hover:text-white'
              }`}
            >
              A4 Sheet / PDF
            </button>
          </div>

          {reportType === 'Z' && onSaveZRead && (
            <button
              onClick={handleConfirmSaveZRead}
              disabled={isSaving || saveSuccess}
              className="btn-press px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Archived!' : isSaving ? 'Saving...' : 'Archive Z-Read'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="btn-press px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-obsidian-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-glow-gold hover:brightness-110 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── PRINTABLE REPORT CONTAINER (Paper Preview & Print Target) ── */}
      <div
        data-paper-width={paperWidth}
        className={`tinda-print-target print-area bg-white text-black font-mono shadow-2xl rounded-xl select-text ${
          isA4
            ? 'w-full max-w-[210mm] p-10 text-xs leading-normal'
            : is58mm
            ? 'w-[58mm] max-w-[58mm] p-2.5 text-[10.5px] leading-tight'
            : 'w-[80mm] max-w-[80mm] p-4 text-xs leading-tight'
        }`}
      >
        {/* Header */}
        <div className="text-center space-y-1 mb-3">
          <div className="flex items-center justify-center mb-1">
            <img
              src="/tinda-pos-crest.png"
              alt="Logo"
              className={`object-contain filter grayscale contrast-200 ${
                is58mm ? 'w-8 h-8' : isA4 ? 'w-14 h-14' : 'w-10 h-10'
              }`}
            />
          </div>
          <h1 className={`font-serif font-black tracking-wider uppercase ${isA4 ? 'text-xl' : 'text-sm'}`}>
            {storeName || settings?.store_name || 'TINDA POS'}
          </h1>
          <p className="text-[10px] text-gray-700">
            {settings?.address || 'Poblacion Market St., Philippines'}
          </p>
          {settings?.contact_number && (
            <p className="text-[10px] text-gray-700">Contact: {settings.contact_number}</p>
          )}

          <div className="pt-1.5">
            <span className="font-bold uppercase tracking-widest text-[10.5px] border-2 border-black px-2 py-0.5 inline-block">
              *** {reportTitle} ***
            </span>
          </div>

          <div className="flex justify-between text-[10px] text-gray-600 pt-1">
            <span>Date: {dateStr} {timeStr}</span>
            <span>Terminal: TRM-8891</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Cashier: {cashierName}</span>
            <span>Report ID: {reportId}</span>
          </div>
        </div>

        <div className="dashed double" />

        {/* ── SALES SUMMARY ── */}
        <div className="space-y-1 my-2">
          <p className="font-bold uppercase text-[11px] underline">SALES PERFORMANCE SUMMARY:</p>
          <div className="flex justify-between font-black text-[12px] border-b border-black pb-0.5">
            <span>GROSS SALES:</span>
            <span>{money(totalSales_c)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Orders Count:</span>
            <span className="font-bold">{validTx.length} receipts</span>
          </div>
          <div className="flex justify-between">
            <span>Total Units Sold:</span>
            <span>{totalItemsSold} pcs</span>
          </div>
          <div className="flex justify-between">
            <span>Average Order Basket:</span>
            <span>{money(avgBasket_c)}</span>
          </div>
          {totalDiscounts_c > 0 && (
            <div className="flex justify-between text-gray-800">
              <span>Total Discounts Granted:</span>
              <span>-{money(totalDiscounts_c)}</span>
            </div>
          )}
        </div>

        <div className="dashed" />

        {/* ── PAYMENT METHOD BREAKDOWN ── */}
        <div className="space-y-1 my-2">
          <p className="font-bold uppercase text-[11px] underline">PAYMENT COLLECTION BREAKDOWN:</p>
          <div className="flex justify-between font-bold">
            <span>CASH PAYMENTS:</span>
            <span>{money(cashSales_c)}</span>
          </div>
          <div className="flex justify-between">
            <span>E-WALLET / GCASH:</span>
            <span>{money(gcashSales_c)}</span>
          </div>
          <div className="flex justify-between">
            <span>STORE CREDIT (UTANG):</span>
            <span>{money(utangSales_c)}</span>
          </div>
        </div>

        <div className="dashed" />

        {/* ── PROFIT & MARGIN AUDIT ── */}
        <div className="space-y-1 my-2">
          <p className="font-bold uppercase text-[11px] underline">STORE FINANCIAL AUDIT:</p>
          <div className="flex justify-between">
            <span>Cost of Goods Sold (COGS):</span>
            <span>{money(totalCost_c)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>GROSS STORE PROFIT:</span>
            <span>{money(grossProfit_c)}</span>
          </div>
          <div className="flex justify-between">
            <span>Operating Expenses ({expenses.length} records):</span>
            <span>-{money(totalExpenses_c)}</span>
          </div>
          <div className="flex justify-between font-black text-[12px] border-t-2 border-b-2 border-black py-1 my-1">
            <span>NET RETAIL PROFIT:</span>
            <span>{money(netProfit_c)}</span>
          </div>
        </div>

        {/* ── CASH COUNT & DRAWER RECONCILIATION ── */}
        {totalPhysicalCash_c > 0 && (
          <>
            <div className="dashed" />
            <div className="space-y-1 my-2">
              <p className="font-bold uppercase text-[11px] underline">DRAWER CASH RECONCILIATION:</p>
              <div className="flex justify-between font-bold">
                <span>Physical Count in Drawer:</span>
                <span>{money(totalPhysicalCash_c)}</span>
              </div>
              {expectedCashInDrawer_c > 0 && (
                <>
                  <div className="flex justify-between text-gray-700">
                    <span>Expected Sales Cash:</span>
                    <span>{money(expectedCashInDrawer_c)}</span>
                  </div>
                  <div className={`flex justify-between font-black py-0.5 ${
                    cashOverShort_c >= 0 ? 'text-black' : 'text-black'
                  }`}>
                    <span>DRAWER VARIANCE (OVER/SHORT):</span>
                    <span>
                      {cashOverShort_c >= 0 ? `+${money(cashOverShort_c)} (OVER)` : `-${money(Math.abs(cashOverShort_c))} (SHORT)`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="dashed" />

        {/* ── BARCODE AUDIT STAMP ── */}
        <div className="mt-3 pt-2 flex flex-col items-center justify-center">
          <Barcode
            value={reportId}
            height={is58mm ? 32 : isA4 ? 44 : 38}
            scale={is58mm ? 1.0 : isA4 ? 1.4 : 1.2}
            showText={true}
          />
          <p className="text-[8.5px] text-gray-500 font-mono mt-0.5">
            * OFFICIAL REGISTER AUDIT HASH *
          </p>
        </div>

        {/* ── SIGN-OFF VERIFICATION BLOCK ── */}
        <div className="mt-5 pt-3 border-t border-dotted border-gray-400 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-[9.5px]">
            <div className="text-center">
              <div className="border-b border-black pb-1 mb-1 font-bold">{cashierName}</div>
              <p className="text-[8.5px] text-gray-600 uppercase">Cashier on Duty</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black pb-1 mb-1 font-bold">
                {settings?.owner_name || 'Store Supervisor'}
              </div>
              <p className="text-[8.5px] text-gray-600 uppercase">Store Manager / Owner</p>
            </div>
          </div>

          <div className="text-center text-[9px] text-gray-500 pt-2 border-t border-dashed border-gray-400">
            <p>*** END OF {reportType}-READING AUDIT ARCHIVE ***</p>
            <p className="pt-0.5">TINDA POS Web · Universal Cloud Ledger</p>
          </div>
        </div>
      </div>
    </div>
  )
}
