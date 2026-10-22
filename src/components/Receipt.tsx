import React, { useState, useEffect } from 'react'
import {
  Printer,
  Settings2,
  Sliders,
  Check,
  RotateCcw,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { Transaction, StoreSettings, PrinterCustomizationSettings } from '../types'
import { money } from '../utils/format'
import { Barcode } from '../utils/barcode'

export interface ReceiptProps {
  tx?: Transaction
  transaction?: Transaction // compatibility alias
  storeName?: string
  address?: string
  contact?: string
  receiptFooter?: string
  terminalId?: string
  storeSettings?: StoreSettings // compatibility alias
  paperWidth?: '58mm' | '80mm' | 'A4'
  showBarcode?: boolean
  showLogo?: boolean
  showCustomerInfo?: boolean
  customerName?: string
  customerBalance_c?: number
  isReprint?: boolean
  className?: string
  allowCustomization?: boolean
}

const STORAGE_KEY = 'tinda_printer_customization'

export const DEFAULT_RECEIPT_CONFIG: PrinterCustomizationSettings = {
  receipt_paper_width: '58mm',
  receipt_feed_lines_end: 3,
  receipt_font_scale: 100,
  receipt_line_spacing: 'balanced',
  receipt_ultra_black: true,
  receipt_custom_header: 'Sari-Sari Store & General Merchandise',
  receipt_custom_footer: 'Thank you for your business! Please come again.',
  receipt_show_cashier: true,
  receipt_show_customer: true,
  receipt_show_change_breakdown: true,
  receipt_show_logo: true,
  receipt_show_barcode: true
}

export function Receipt({
  tx,
  transaction,
  storeName,
  address,
  contact,
  receiptFooter,
  terminalId = 'TRM-8891',
  storeSettings,
  paperWidth: propPaperWidth,
  showBarcode: propShowBarcode,
  showLogo: propShowLogo,
  showCustomerInfo: propShowCustomerInfo,
  customerName,
  customerBalance_c,
  isReprint = false,
  className = '',
  allowCustomization = true
}: ReceiptProps): React.JSX.Element {
  const activeTx = tx || transaction

  // Load user saved customizations from localStorage
  const [config, setConfig] = useState<PrinterCustomizationSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return { ...DEFAULT_RECEIPT_CONFIG, ...JSON.parse(saved) }
      }
    } catch {
      // fallback
    }
    return DEFAULT_RECEIPT_CONFIG
  })

  const [isCustomizing, setIsCustomizing] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  // Editable local customization states
  const [editStoreName, setEditStoreName] = useState(
    config.receipt_store_name || storeName || storeSettings?.store_name || 'TINDA POS & RETAIL'
  )
  const [editAddress, setEditAddress] = useState(
    config.receipt_address || address || storeSettings?.address || 'Poblacion Market St., Philippines'
  )
  const [editContact, setEditContact] = useState(
    config.receipt_contact || contact || storeSettings?.contact_number || '+63 912 345 6789'
  )
  const [editHeader, setEditHeader] = useState(config.receipt_custom_header || '')
  const [editFooter, setEditFooter] = useState(
    config.receipt_custom_footer || receiptFooter || storeSettings?.receipt_footer || 'Thank you for your business! Please come again.'
  )
  const [editWidth, setEditWidth] = useState<'58mm' | '80mm'>(
    (propPaperWidth === '80mm' || propPaperWidth === '58mm')
      ? propPaperWidth
      : config.receipt_paper_width || '58mm'
  )
  const [showLogo, setShowLogo] = useState(
    propShowLogo !== undefined ? propShowLogo : config.receipt_show_logo
  )
  const [showBarcode, setShowBarcode] = useState(
    propShowBarcode !== undefined ? propShowBarcode : config.receipt_show_barcode
  )
  const [showCashier, setShowCashier] = useState(config.receipt_show_cashier)
  const [showCustomer, setShowCustomer] = useState(
    propShowCustomerInfo !== undefined ? propShowCustomerInfo : config.receipt_show_customer
  )
  const [showChange, setShowChange] = useState(config.receipt_show_change_breakdown)

  const handleSaveConfig = () => {
    const updated: PrinterCustomizationSettings = {
      ...config,
      receipt_store_name: editStoreName,
      receipt_address: editAddress,
      receipt_contact: editContact,
      receipt_custom_header: editHeader,
      receipt_custom_footer: editFooter,
      receipt_paper_width: editWidth,
      receipt_show_logo: showLogo,
      receipt_show_barcode: showBarcode,
      receipt_show_cashier: showCashier,
      receipt_show_customer: showCustomer,
      receipt_show_change_breakdown: showChange
    }
    setConfig(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleResetConfig = () => {
    setConfig(DEFAULT_RECEIPT_CONFIG)
    setEditStoreName(storeName || storeSettings?.store_name || 'TINDA POS & RETAIL')
    setEditAddress(address || storeSettings?.address || 'Poblacion Market St., Philippines')
    setEditContact(contact || storeSettings?.contact_number || '+63 912 345 6789')
    setEditHeader(DEFAULT_RECEIPT_CONFIG.receipt_custom_header)
    setEditFooter(DEFAULT_RECEIPT_CONFIG.receipt_custom_footer)
    setEditWidth('58mm')
    setShowLogo(true)
    setShowBarcode(true)
    setShowCashier(true)
    setShowCustomer(true)
    setShowChange(true)
    try {
      localStorage.removeItem(STORAGE_KEY)
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 2000)
    } catch {
      // ignore
    }
  }

  if (!activeTx) {
    return (
      <div className="p-4 text-center text-xs font-mono text-stone-500">
        No transaction data to print.
      </div>
    )
  }

  const settledAt = new Date(activeTx.created_at || Date.now())
  const dateStr = settledAt.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  const timeStr = settledAt.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  const is58mm = editWidth === '58mm'

  // Payment method label
  let paymentLabel = 'CASH'
  if (activeTx.payment_method === 'CASH') paymentLabel = 'CASH'
  else if (activeTx.payment_method === 'GCASH') paymentLabel = 'GCASH E-WALLET'
  else if (activeTx.payment_method === 'MAYA') paymentLabel = 'MAYA E-WALLET'
  else if (activeTx.payment_method === 'MARIBANK') paymentLabel = 'MARIBANK'
  else if (activeTx.payment_method === 'UTANG') paymentLabel = 'STORE CREDIT'
  else if (activeTx.payment_method === 'SPLIT') paymentLabel = 'SPLIT / MIXED'

  return (
    <div className="flex flex-col items-center w-full">
      {/* ── INTERACTIVE CUSTOMIZATION BAR (HIDDEN IN PRINT) ── */}
      {allowCustomization && (
        <div className="no-print w-full max-w-sm mb-3">
          <div className="flex items-center justify-between p-2 rounded-xl bg-obsidian-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setIsCustomizing((prev) => !prev)}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-bold px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Customize Receipt</span>
              {isCustomizing ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const nextWidth: '58mm' | '80mm' = editWidth === '58mm' ? '80mm' : '58mm'
                  setEditWidth(nextWidth)
                  try {
                    const updated: PrinterCustomizationSettings = { ...config, receipt_paper_width: nextWidth }
                    setConfig(updated)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
                  } catch {}
                }}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] transition-all border ${
                  editWidth === '58mm'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
                title="Toggle thermal paper width"
              >
                {editWidth}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-[11px] transition-all shadow-sm active:scale-95"
                title="Print Receipt"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Expandable Customization Settings Drawer */}
          {isCustomizing && (
            <div className="mt-2 p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-3 animate-fade-in text-xs text-stone-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-stone-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
                  Receipt Styling & Details
                </span>
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="text-[10px] text-stone-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Defaults
                </button>
              </div>

              {savedToast && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold text-center">
                  ✓ Receipt customization saved!
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-stone-400 uppercase mb-0.5">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 text-xs focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-400 uppercase mb-0.5">
                    Contact Tel
                  </label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 text-xs focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-400 uppercase mb-0.5">
                  Store Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-400 uppercase mb-0.5">
                  Custom Header Subtitle / Tagline
                </label>
                <input
                  type="text"
                  value={editHeader}
                  onChange={(e) => setEditHeader(e.target.value)}
                  placeholder="e.g. Sari-Sari Store & General Merchandise"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-400 uppercase mb-0.5">
                  Custom Footer Note
                </label>
                <input
                  type="text"
                  value={editFooter}
                  onChange={(e) => setEditFooter(e.target.value)}
                  placeholder="e.g. Thank you for your business! Please come again."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-100 text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-1.5 p-2 rounded-lg bg-obsidian-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded text-indigo-500"
                  />
                  <span className="text-[11px] text-stone-300">Show Brand Logo</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-lg bg-obsidian-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="rounded text-indigo-500"
                  />
                  <span className="text-[11px] text-stone-300">Show Barcode</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-lg bg-obsidian-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCashier}
                    onChange={(e) => setShowCashier(e.target.checked)}
                    className="rounded text-indigo-500"
                  />
                  <span className="text-[11px] text-stone-300">Show Cashier</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-lg bg-obsidian-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showChange}
                    onChange={(e) => setShowChange(e.target.checked)}
                    className="rounded text-indigo-500"
                  />
                  <span className="text-[11px] text-stone-300">Show Change Due</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-obsidian-950 font-bold text-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Receipt Settings</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTUAL THERMAL RECEIPT CANVAS ── */}
      <div
        data-paper-width={editWidth}
        className={`tinda-receipt tinda-print-target print-area bg-white text-black font-mono leading-tight select-text shadow-2xl rounded-sm border border-gray-200 transition-all ${
          is58mm
            ? 'max-w-[58mm] w-[58mm] px-2.5 py-3 text-[10.5px]'
            : 'max-w-[80mm] w-[80mm] px-4 py-4 text-xs'
        } ${className}`}
      >
        {/* ── BRAND HEADER ── */}
        <div className="flex flex-col items-center text-center space-y-1 mb-2">
          {showLogo && (
            <div className="mb-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-serif font-black text-xs">
                TP
              </div>
            </div>
          )}

          <h1
            className={`font-serif font-black tracking-wider uppercase text-black ${
              is58mm ? 'text-xs' : 'text-sm'
            }`}
          >
            {editStoreName}
          </h1>

          {editHeader && (
            <p className="text-[9px] text-gray-800 font-sans tracking-wide">
              {editHeader}
            </p>
          )}

          {editAddress && (
            <p className="text-[9.5px] text-gray-800 max-w-[95%] leading-tight">
              {editAddress}
            </p>
          )}

          {editContact && (
            <p className="text-[9.5px] text-gray-800">Tel: {editContact}</p>
          )}

          <div className="pt-1">
            <span
              className={`font-bold tracking-widest uppercase inline-block px-2 py-0.5 border border-black ${
                isReprint ? 'bg-black text-white text-[9.5px]' : 'text-[9.5px]'
              }`}
            >
              {isReprint ? '*** DUPLICATE REPRINT ***' : '*** OFFICIAL SALES INVOICE ***'}
            </span>
          </div>
        </div>

        <div className="dashed double my-1.5" />

        {/* ── TRANSACTION METADATA ── */}
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="font-bold">INVOICE:</span>
            <span className="font-bold">{activeTx.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span>TERMINAL:</span>
            <span>{terminalId}</span>
          </div>
          <div className="flex justify-between">
            <span>DATE &amp; TIME:</span>
            <span>{dateStr} {timeStr}</span>
          </div>
          {showCashier && (
            <div className="flex justify-between">
              <span>CASHIER:</span>
              <span>{activeTx.cashier_name || 'Staff'}</span>
            </div>
          )}

          {/* Customer Information */}
          {showCustomer && (customerName || activeTx.customer_id) && (
            <div className="pt-1 border-t border-dotted border-gray-400 mt-1">
              <div className="flex justify-between font-bold">
                <span>CUSTOMER:</span>
                <span className="uppercase">{customerName || `VIP #${activeTx.customer_id}`}</span>
              </div>
              {customerBalance_c !== undefined && customerBalance_c > 0 && (
                <div className="flex justify-between text-gray-800">
                  <span>PRIOR CREDIT BALANCE:</span>
                  <span>{money(customerBalance_c)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dashed my-1.5" />

        {/* ── ITEMIZED PRODUCTS TABLE ── */}
        <div className="space-y-1">
          <div className="flex justify-between font-bold text-[10.5px] border-b border-black pb-0.5 tracking-wider">
            <span className="flex-1 text-left">ITEM</span>
            <span className={is58mm ? 'w-10 text-right' : 'w-14 text-right'}>QTY</span>
            <span className={is58mm ? 'w-14 text-right' : 'w-18 text-right'}>AMOUNT</span>
          </div>

          {activeTx.items?.map((item, idx) => (
            <div key={idx} className="flex flex-col py-0.5 text-[10px]">
              <div className="flex justify-between font-medium">
                <span className="flex-1 truncate pr-1">{item.name}</span>
                <span className={`${is58mm ? 'w-10' : 'w-14'} text-right text-gray-700`}>
                  {item.quantity}x
                </span>
                <span className={`${is58mm ? 'w-14' : 'w-18'} text-right font-bold`}>
                  {money(item.total_c)}
                </span>
              </div>
              {item.quantity > 1 && (
                <div className="text-[9px] text-gray-600 pl-1">
                  @ {money(item.unit_price_c)} each
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="dashed my-1.5" />

        {/* ── SETTLEMENT SUMMARY ── */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-[11px]">
            <span>SUBTOTAL:</span>
            <span>{money(activeTx.subtotal_c)}</span>
          </div>

          {activeTx.discount_c > 0 && (
            <div className="flex justify-between text-[11px] font-bold">
              <span>
                DISCOUNT ({activeTx.discount_type === 'SENIOR_PWD_20' ? 'SENIOR/PWD 20%' : 'DISCOUNT'}):
              </span>
              <span>-{money(activeTx.discount_c)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline font-black border-t-2 border-b-2 border-black py-1 my-1">
            <span className={is58mm ? 'text-xs' : 'text-sm'}>TOTAL DUE:</span>
            <span className={is58mm ? 'text-sm font-bold' : 'text-base font-bold'}>
              {money(activeTx.total_c)}
            </span>
          </div>

          {/* Payment Breakdown */}
          <div className="pt-0.5 text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span>METHOD:</span>
              <span className="font-bold">{paymentLabel}</span>
            </div>

            {/* Split Breakdown if present */}
            {activeTx.payment_method === 'SPLIT' && activeTx.payments && activeTx.payments.length > 0 && (
              <div className="py-1 my-0.5 border-t border-b border-dotted border-gray-400 space-y-0.5">
                {activeTx.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[9.5px]">
                    <span>• {p.method}{p.reference ? ` (${p.reference})` : ''}</span>
                    <span>{money(p.amount_c)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <span>TENDERED:</span>
              <span>{money(activeTx.amount_tendered_c)}</span>
            </div>

            {showChange && activeTx.payment_method === 'CASH' && (
              <div className="flex justify-between font-bold text-[11px] pt-0.5">
                <span>CHANGE DUE:</span>
                <span className="text-[12px]">{money(activeTx.change_c)}</span>
              </div>
            )}

            {activeTx.payment_method === 'UTANG' && (
              <div className="flex justify-between text-gray-800 font-bold">
                <span>NEW CREDIT BALANCE:</span>
                <span>{money((customerBalance_c || 0) + activeTx.total_c)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── SCANNABLE BARCODE SECTION ── */}
        {showBarcode && activeTx.invoice_number && (
          <div className="mt-3 pt-2 border-t border-dashed border-gray-400 flex flex-col items-center justify-center">
            <Barcode
              value={activeTx.invoice_number}
              height={is58mm ? 32 : 40}
              scale={is58mm ? 1.0 : 1.25}
              showText={true}
            />
            <p className="text-[8px] text-gray-500 font-mono mt-0.5 tracking-tight">
              * SCAN AT COUNTER FOR INSTANT AUDIT *
            </p>
          </div>
        )}

        {/* ── VERIFICATION SIGNATURE LINE ── */}
        <div className="mt-3 pt-2 border-t border-dotted border-gray-400 space-y-1">
          <div className="flex justify-between text-[9.5px] text-gray-600">
            <span>Auth: {activeTx.cashier_name || 'Staff'}</span>
            <span>ID: {activeTx.id ? `#${activeTx.id}` : 'SYS'}</span>
          </div>
          <div className="pt-2 border-b border-black border-dotted w-3/4 mx-auto" />
          <p className="text-[8px] text-center text-gray-500 uppercase tracking-widest">
            Customer Signature
          </p>
        </div>

        {/* ── FOOTER & POLICIES ── */}
        <div className="mt-3 text-center space-y-1 text-[9px] text-gray-700 border-t border-dashed border-gray-400 pt-2">
          {editFooter && <p className="font-semibold text-black">{editFooter}</p>}
          <p>Please keep this receipt for your records.</p>
          <p className="text-[8px] text-gray-500 pt-0.5 tracking-wider uppercase">
            TINDA POS · Cloud Enterprise Edition
          </p>
        </div>
      </div>
    </div>
  )
}