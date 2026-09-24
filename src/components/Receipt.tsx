import React from 'react'
import type { Transaction, StoreSettings } from '../types'
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
  customerName?: string
  customerBalance_c?: number
  isReprint?: boolean
  className?: string
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
  paperWidth = '80mm',
  showBarcode = true,
  showLogo = true,
  customerName,
  customerBalance_c,
  isReprint = false,
  className = ''
}: ReceiptProps): React.JSX.Element {
  // Normalize transaction
  const activeTx = tx || transaction

  // Fallback defaults from storeSettings if provided
  const finalStoreName = storeName || storeSettings?.store_name || 'TINDA POS & RETAIL'
  const finalAddress = address || storeSettings?.address || 'Poblacion Market St., Philippines'
  const finalContact = contact || storeSettings?.contact_number || '+63 912 345 6789'
  const finalFooter = receiptFooter || storeSettings?.receipt_footer || 'Thank you for your business! Please come again.'
  const finalPaperWidth = paperWidth || storeSettings?.printer_paper_width || '80mm'
  const finalShowBarcode = showBarcode !== undefined ? showBarcode : (storeSettings?.printer_show_barcode ?? true)
  const finalShowLogo = showLogo !== undefined ? showLogo : (storeSettings?.printer_show_logo ?? true)

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

  const paymentLabel =
    activeTx.payment_method === 'CASH'
      ? 'CASH TENDERED'
      : activeTx.payment_method === 'GCASH'
      ? 'E-WALLET (GCASH)'
      : 'STORE CREDIT (UTANG)'

  const is58mm = finalPaperWidth === '58mm'
  const isA4 = finalPaperWidth === 'A4'

  return (
    <div
      data-paper-width={finalPaperWidth}
      className={`tinda-receipt tinda-print-target print-area bg-white text-black font-mono leading-tight select-text ${
        isA4
          ? 'max-w-[210mm] mx-auto p-8 border border-gray-300 shadow-md text-sm'
          : is58mm
          ? 'max-w-[58mm] w-[58mm] mx-auto px-2 py-3 text-[10.5px]'
          : 'max-w-[80mm] w-[80mm] mx-auto px-4 py-4 text-xs'
      } ${className}`}
    >
      {/* ── VIP BRAND HEADER ── */}
      <div className="flex flex-col items-center text-center space-y-1 mb-2">
        {finalShowLogo && (
          <div className="mb-1 flex items-center justify-center">
            <img
              src="/tinda-pos-crest.png"
              alt="Brand Crest"
              className={`object-contain filter grayscale contrast-200 ${
                is58mm ? 'w-8 h-8' : isA4 ? 'w-14 h-14' : 'w-10 h-10'
              }`}
            />
          </div>
        )}

        <h1
          className={`font-serif font-black tracking-wider uppercase text-black ${
            is58mm ? 'text-xs' : isA4 ? 'text-xl' : 'text-sm'
          }`}
        >
          {finalStoreName}
        </h1>

        {finalAddress && (
          <p className="text-[10px] text-gray-700 max-w-[90%] leading-tight">
            {finalAddress}
          </p>
        )}

        {finalContact && (
          <p className="text-[10px] text-gray-700">Tel: {finalContact}</p>
        )}

        <div className="pt-1">
          <span
            className={`font-bold tracking-widest uppercase inline-block px-2 py-0.5 border border-black ${
              isReprint ? 'bg-black text-white text-[9px]' : 'text-[10px]'
            }`}
          >
            {isReprint ? '*** DUPLICATE REPRINT ***' : '*** OFFICIAL SALES INVOICE ***'}
          </span>
        </div>
      </div>

      <div className="dashed double" />

      {/* ── TRANSACTION METADATA ── */}
      <div className="space-y-0.5 text-[10.5px]">
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
        <div className="flex justify-between">
          <span>CASHIER:</span>
          <span>{activeTx.cashier_name || 'Staff'}</span>
        </div>

        {/* Customer Information (if present) */}
        {(customerName || activeTx.customer_id) && (
          <div className="pt-1 border-t border-dotted border-gray-400 mt-1">
            <div className="flex justify-between font-bold">
              <span>CUSTOMER:</span>
              <span className="uppercase">{customerName || `VIP #${activeTx.customer_id}`}</span>
            </div>
            {customerBalance_c !== undefined && customerBalance_c > 0 && (
              <div className="flex justify-between text-gray-800">
                <span>UTANG BALANCE:</span>
                <span>{money(customerBalance_c)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dashed" />

      {/* ── ITEMIZED PRODUCTS TABLE ── */}
      <div className="space-y-1">
        <div className="flex justify-between font-bold text-[10px] border-b border-black pb-0.5 tracking-wider">
          <span className="flex-1 text-left">ITEM DESCRIPTION</span>
          <span className={is58mm ? 'w-12 text-right' : 'w-16 text-right'}>QTY</span>
          <span className={is58mm ? 'w-14 text-right' : 'w-20 text-right'}>AMOUNT</span>
        </div>

        {activeTx.items?.map((item, idx) => (
          <div key={idx} className="flex flex-col py-0.5">
            <div className="flex justify-between font-medium">
              <span className="flex-1 truncate pr-1">{item.name}</span>
              <span className={`${is58mm ? 'w-12' : 'w-16'} text-right text-gray-600`}>
                {item.quantity}x
              </span>
              <span className={`${is58mm ? 'w-14' : 'w-20'} text-right font-bold`}>
                {money(item.total_c)}
              </span>
            </div>
            {item.quantity > 1 && (
              <div className="text-[9px] text-gray-500 pl-1">
                @ {money(item.unit_price_c)} each
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="dashed" />

      {/* ── SETTLEMENT SUMMARY ── */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span>SUBTOTAL:</span>
          <span>{money(activeTx.subtotal_c)}</span>
        </div>

        {activeTx.discount_c > 0 && (
          <div className="flex justify-between text-[11px] font-bold">
            <span>
              DISCOUNT ({activeTx.discount_type === 'SENIOR_PWD_20' ? 'SENIOR/PWD 20%' : 'VIP PROMO'}):
            </span>
            <span>-{money(activeTx.discount_c)}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline font-black border-t-2 border-b-2 border-black py-1 my-1">
          <span className={is58mm ? 'text-xs' : 'text-sm'}>TOTAL DUE:</span>
          <span className={is58mm ? 'text-sm' : 'text-base font-serif'}>
            {money(activeTx.total_c)}
          </span>
        </div>

        {/* Payment breakdown */}
        <div className="pt-0.5 text-[10.5px] space-y-0.5">
          <div className="flex justify-between">
            <span>METHOD:</span>
            <span className="font-bold">{paymentLabel}</span>
          </div>
          <div className="flex justify-between">
            <span>TENDERED:</span>
            <span>{money(activeTx.amount_tendered_c)}</span>
          </div>
          {activeTx.payment_method === 'CASH' && (
            <div className="flex justify-between font-bold">
              <span>CHANGE:</span>
              <span>{money(activeTx.change_c)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SCANNABLE BARCODE SECTION ── */}
      {finalShowBarcode && activeTx.invoice_number && (
        <div className="mt-3 pt-2 border-t border-dashed border-gray-400 flex flex-col items-center justify-center">
          <Barcode
            value={activeTx.invoice_number}
            height={is58mm ? 36 : isA4 ? 48 : 42}
            scale={is58mm ? 1.05 : isA4 ? 1.5 : 1.3}
            showText={true}
          />
          <p className="text-[8.5px] text-gray-500 font-mono mt-0.5 tracking-tight">
            * SCAN AT COUNTER FOR INSTANT AUDIT *
          </p>
        </div>
      )}

      {/* ── VERIFICATION SIGNATURE LINE ── */}
      <div className="mt-4 pt-2 border-t border-dotted border-gray-400 space-y-1">
        <div className="flex justify-between text-[9px] text-gray-600">
          <span>Auth Cashier: {activeTx.cashier_name || 'Staff'}</span>
          <span>ID: {activeTx.id ? `#${activeTx.id}` : 'SYS'}</span>
        </div>
        <div className="pt-3 border-b border-black border-dotted w-3/4 mx-auto" />
        <p className="text-[8.5px] text-center text-gray-500 uppercase tracking-widest">
          Customer / Authorized Signature
        </p>
      </div>

      {/* ── FOOTER & POLICIES ── */}
      <div className="mt-3 text-center space-y-1 text-[9.5px] text-gray-600 border-t border-dashed border-gray-400 pt-2">
        {finalFooter && <p className="font-semibold text-black">{finalFooter}</p>}
        <p>Please keep this invoice for your warranty &amp; exchange records.</p>
        <p className="text-[8.5px] text-gray-500 pt-1 tracking-wider uppercase">
          TINDA POS · Executive VIP Terminal Suite
        </p>
      </div>
    </div>
  )
}