import React, { useState } from 'react'
import {
  Printer,
  X,
  Tag,
  Check,
  Sparkles,
  Barcode as BarcodeIcon,
  CheckCircle2,
  Sliders,
  Copy,
  Info
} from 'lucide-react'
import type { Product } from '../types'
import { money } from '../utils/format'
import { generateBarcodeSvg } from '../utils/barcode'
import { playScanSuccess } from '../lib/sound'

export type TagSizePreset = '40x30' | '30x20' | '50x30' | '40x20'

export const PRESET_DIMENSIONS: Record<TagSizePreset, { width: number; height: number; label: string; desc: string }> = {
  '40x30': { width: 40, height: 30, label: '40 × 30 mm', desc: 'CT221B Standard Retail' },
  '30x20': { width: 30, height: 20, label: '30 × 20 mm', desc: 'Mini Grocery Sticker' },
  '50x30': { width: 50, height: 30, label: '50 × 30 mm', desc: 'Wide Shelf & Minimart' },
  '40x20': { width: 40, height: 20, label: '40 × 20 mm', desc: 'Slim Pouch Label' }
}

interface PriceTagPrintModalProps {
  open: boolean
  onClose: () => void
  product?: Product | null
  allProducts?: Product[]
  storeName?: string
}

export function PriceTagPrintModal({
  open,
  onClose,
  product,
  allProducts = [],
  storeName = 'TINDA Retail Station'
}: PriceTagPrintModalProps): React.JSX.Element | null {
  const [selectedProductId, setSelectedProductId] = useState<number>(
    product?.id ?? (allProducts[0]?.id || 0)
  )
  const [tagSize, setTagSize] = useState<TagSizePreset>('40x30')
  const [copies, setCopies] = useState<number>(1)
  const [showStoreName, setShowStoreName] = useState(true)
  const [showProductName, setShowProductName] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)
  const [showBarcodeNumber, setShowBarcodeNumber] = useState(true)

  if (!open) return null

  const activeProduct = product || allProducts.find((p) => p.id === selectedProductId) || allProducts[0]
  if (!activeProduct) return null

  const barcodeVal = activeProduct.barcode || activeProduct.sku || '0000000000'
  const activeDims = PRESET_DIMENSIONS[tagSize]

  const barcodeSvg = generateBarcodeSvg(barcodeVal, {
    height: tagSize === '30x20' ? 24 : tagSize === '40x20' ? 26 : 34,
    includeText: showBarcodeNumber,
    fontSize: tagSize === '30x20' ? 8 : 9,
    barWidth: tagSize === '30x20' ? 1.4 : 1.8,
    quietZone: 8
  })

  const handlePrint = () => {
    playScanSuccess()
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in font-sans">
      {/* ─── PRINT-ONLY VIEW FOR CHITENG CT-221B (CLABEL) ─── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ct221b-print-area, #ct221b-print-area * {
            visibility: visible;
          }
          #ct221b-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: ${activeDims.width}mm ${activeDims.height}mm;
            margin: 0;
          }
          .ct221b-sticker-page {
            width: ${activeDims.width}mm;
            height: ${activeDims.height}mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            padding: 1.5mm 2mm;
            background: #ffffff;
            color: #000000;
          }
        }
      `}</style>

      {/* Hidden print area rendered into DOM */}
      <div id="ct221b-print-area" className="hidden">
        {Array.from({ length: Math.max(1, copies) }).map((_, idx) => (
          <div key={idx} className="ct221b-sticker-page font-sans text-center">
            {showStoreName && (
              <div style={{ fontSize: '7pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {storeName}
              </div>
            )}
            {showProductName && (
              <div style={{ fontSize: tagSize === '30x20' ? '7pt' : '8pt', fontWeight: 'bold', lineHeight: '1.1', maxHeight: '18px', overflow: 'hidden' }}>
                {activeProduct.name}
              </div>
            )}
            {showPrice && (
              <div style={{ fontSize: tagSize === '30x20' ? '11pt' : '13pt', fontWeight: '900', fontFamily: 'serif' }}>
                {money(activeProduct.default_price_c)}
              </div>
            )}
            {showBarcode && (
              <div
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ─── MODAL DIALOG PREVIEW & CONTROLS ─── */}
      <div className="w-full max-w-2xl glass-panel bg-obsidian-950 rounded-3xl border border-emerald-500/30 shadow-vault p-6 space-y-5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <span>Chiteng CT-221B Thermal Price Tag Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CLABEL READY
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Print razor-sharp vector barcodes calibrated for direct thermal heads and instant phone camera scanning.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-press text-stone-400 hover:text-stone-100 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Controls */}
          <div className="md:col-span-7 space-y-4">
            {/* Product Selector if multiple */}
            {!product && allProducts.length > 0 && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Select Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/[0.08] bg-obsidian-900 px-3 py-2 text-xs font-bold text-stone-100 outline-none focus:border-emerald-500/60"
                >
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {money(p.default_price_c)} ({p.barcode || p.sku || 'No Barcode'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sticker Size Presets */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                Chiteng CT-221B Sticker Dimensions
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PRESET_DIMENSIONS) as TagSizePreset[]).map((key) => {
                  const p = PRESET_DIMENSIONS[key]
                  const isSelected = tagSize === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTagSize(key)}
                      className={`btn-press p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-glow-emerald ring-1 ring-emerald-500/40'
                          : 'border-white/[0.06] bg-obsidian-900 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <p className="text-xs font-bold">{p.label}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{p.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Copies Count */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Print Copies (Stickers Count)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 rounded-xl border border-white/[0.08] bg-obsidian-900 px-3 py-1.5 text-sm font-bold text-stone-100 font-mono outline-none focus:border-emerald-500/60"
                />
                <div className="flex gap-1.5">
                  {[1, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCopies(num)}
                      className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-white/[0.06] bg-obsidian-900 text-stone-300 hover:border-emerald-500/40 hover:text-emerald-400"
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Print Elements Toggles */}
            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Tag Layout Options
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="rounded border-white/[0.2] bg-obsidian-900 text-emerald-500 focus:ring-0"
                  />
                  <span>Store Name Header</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={(e) => setShowProductName(e.target.checked)}
                    className="rounded border-white/[0.2] bg-obsidian-900 text-emerald-500 focus:ring-0"
                  />
                  <span>Product Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded border-white/[0.2] bg-obsidian-900 text-emerald-500 focus:ring-0"
                  />
                  <span>Big Retail Price</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="rounded border-white/[0.2] bg-obsidian-900 text-emerald-500 focus:ring-0"
                  />
                  <span>Vector 1D Barcode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcodeNumber}
                    onChange={(e) => setShowBarcodeNumber(e.target.checked)}
                    className="rounded border-white/[0.2] bg-obsidian-900 text-emerald-500 focus:ring-0"
                  />
                  <span>Barcode Number Text</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Live Realistic Thermal Sticker Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center space-y-3">
            <span className="text-[10px] uppercase font-bold text-stone-400 font-mono tracking-wider">
              CT-221B Thermal Preview ({activeDims.label})
            </span>

            {/* Realistic sticker card */}
            <div
              style={{
                width: `${activeDims.width * 5}px`,
                minHeight: `${activeDims.height * 5}px`
              }}
              className="bg-white text-stone-900 rounded-lg p-2.5 shadow-2xl border border-stone-200 flex flex-col justify-between items-center text-center transition-all select-none"
            >
              {showStoreName && (
                <p className="text-[8px] font-bold uppercase tracking-wider text-stone-600 truncate w-full">
                  {storeName}
                </p>
              )}
              {showProductName && (
                <p className="text-[10px] font-bold text-stone-900 line-clamp-2 leading-tight my-0.5">
                  {activeProduct.name}
                </p>
              )}
              {showPrice && (
                <p className="text-base font-black text-stone-900 font-serif leading-none my-1">
                  {money(activeProduct.default_price_c)}
                </p>
              )}
              {showBarcode && (
                <div
                  className="w-full flex justify-center mt-1"
                  dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                />
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-start gap-2 max-w-xs">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>
                <strong>100% Scannable:</strong> Generates Code 128 Subset C with anti-bleed quiet zones for instant cellphone camera scan.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-press px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs shadow-glow-emerald flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            <span>Print {copies} {copies > 1 ? 'Stickers' : 'Sticker'} on CT-221B</span>
          </button>
        </div>
      </div>
    </div>
  )
}
