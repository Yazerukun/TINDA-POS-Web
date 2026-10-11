import React, { useState, useEffect } from 'react'
import {
  Printer,
  Tag,
  Sliders,
  CheckCircle2,
  Save,
  X,
  FileText,
  Sparkles,
  Barcode,
  Layers,
  HelpCircle,
  RefreshCw
} from 'lucide-react'
import { playSuccessSound } from '../lib/sound'

interface PrinterStudioModalProps {
  open: boolean
  onClose: () => void
  initialTab?: 'receipt' | 'label'
  storeName?: string
}

export function PrinterStudioModal({
  open,
  onClose,
  initialTab = 'receipt',
  storeName = 'TINDA SARI-SARI & MINIMART'
}: PrinterStudioModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'receipt' | 'label'>(initialTab)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // RECEIPT CONFIGURATION
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm')
  const [receiptFeedLines, setReceiptFeedLines] = useState(3)
  const [receiptCustomHeader, setReceiptCustomHeader] = useState('')
  const [receiptCustomFooter, setReceiptCustomFooter] = useState('Salamat sa inyong pagtangkilik!')
  const [receiptShowCashier, setReceiptShowCashier] = useState(true)
  const [receiptShowChange, setReceiptShowChange] = useState(true)

  // LABEL CONFIGURATION
  const [labelPaperSize, setLabelPaperSize] = useState('40x30')
  const [labelPriceSize, setLabelPriceSize] = useState<'medium' | 'large' | 'jumbo'>('large')
  const [labelShowStoreName, setLabelShowStoreName] = useState(true)
  const [sampleBarcode, setSampleBarcode] = useState('4800016644819')
  const [sampleProductName, setSampleProductName] = useState('Lucky Me! Pancit Canton')
  const [samplePrice, setSamplePrice] = useState('16.00')

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tinda_printer_customization')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.receiptWidth) setReceiptWidth(parsed.receiptWidth)
        if (parsed.receiptFeedLines) setReceiptFeedLines(parsed.receiptFeedLines)
        if (parsed.receiptCustomHeader) setReceiptCustomHeader(parsed.receiptCustomHeader)
        if (parsed.receiptCustomFooter) setReceiptCustomFooter(parsed.receiptCustomFooter)
      }
    } catch {
      // ignore
    }
  }, [])

  if (!open) return null

  const handleSave = () => {
    setSaving(true)
    try {
      const config = {
        receiptWidth,
        receiptFeedLines,
        receiptCustomHeader,
        receiptCustomFooter,
        receiptShowCashier,
        receiptShowChange,
        labelPaperSize,
        labelPriceSize,
        labelShowStoreName
      }
      localStorage.setItem('tinda_printer_customization', JSON.stringify(config))
      playSuccessSound()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-obsidian-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100 font-sans tracking-wide">
                  Thermal &amp; Label Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DESIGNER
                </span>
              </div>
              <p className="text-xs text-stone-400 font-sans">
                Customize 58mm/80mm receipt templates and shelf barcode price tag labels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-obsidian-950 border border-slate-800 rounded-2xl p-1">
              <button
                onClick={() => setActiveTab('receipt')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'receipt'
                    ? 'bg-indigo-500 text-obsidian-950 shadow-glow-indigo font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Thermal Receipts
              </button>
              <button
                onClick={() => setActiveTab('label')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'label'
                    ? 'bg-indigo-500 text-obsidian-950 shadow-glow-indigo font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Shelf Price Labels
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Workspace */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {activeTab === 'receipt' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Controls Column (7 Cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="p-5 rounded-3xl bg-obsidian-950 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-sans">
                    Receipt Paper &amp; Dimensions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReceiptWidth('58mm')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        receiptWidth === '58mm'
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-obsidian-900 border-slate-800 text-stone-400'
                      }`}
                    >
                      <p className="text-sm font-bold">58mm Thermal (Small)</p>
                      <p className="text-[0.6875rem] text-stone-500 mt-0.5">GOOJPRT, Mini POS, USB Bluetooth</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptWidth('80mm')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        receiptWidth === '80mm'
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-obsidian-900 border-slate-800 text-stone-400'
                      }`}
                    >
                      <p className="text-sm font-bold">80mm Thermal (Standard)</p>
                      <p className="text-[0.6875rem] text-stone-500 mt-0.5">Epson TM-T20, Xprinter, Supermarket</p>
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-obsidian-950 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-sans">
                    Receipt Messaging &amp; Toggles
                  </h3>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Custom Header Tagline (Optional)
                    </label>
                    <input
                      type="text"
                      value={receiptCustomHeader}
                      onChange={(e) => setReceiptCustomHeader(e.target.value)}
                      placeholder="e.g. Sari-Sari Store &amp; General Merchandise"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-100 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Receipt Footer Note
                    </label>
                    <input
                      type="text"
                      value={receiptCustomFooter}
                      onChange={(e) => setReceiptCustomFooter(e.target.value)}
                      placeholder="e.g. Salamat sa pagtangkilik! Balik po kayo muli!"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-100 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2 p-3 rounded-xl bg-obsidian-900 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiptShowCashier}
                        onChange={(e) => setReceiptShowCashier(e.target.checked)}
                        className="rounded text-indigo-500"
                      />
                      <span className="text-xs text-stone-300 font-semibold">Ipakita Cashier Name</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-xl bg-obsidian-900 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiptShowChange}
                        onChange={(e) => setReceiptShowChange(e.target.checked)}
                        className="rounded text-indigo-500"
                      />
                      <span className="text-xs text-stone-300 font-semibold">Show Change Due</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Column (5 Cols) */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 font-mono">
                  Live Thermal Tape Preview ({receiptWidth})
                </div>
                <div
                  className={`p-4 rounded-2xl bg-white text-black font-mono text-[0.6875rem] shadow-2xl space-y-2 leading-relaxed transition-all ${
                    receiptWidth === '58mm' ? 'w-64' : 'w-80'
                  }`}
                >
                  <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2">
                    <p className="font-bold text-xs uppercase">{storeName}</p>
                    {receiptCustomHeader && <p className="text-[0.625rem]">{receiptCustomHeader}</p>}
                    <p className="text-[0.5625rem] text-gray-600">Poblacion Market St., Philippines</p>
                    <p className="text-[0.5625rem] text-gray-600">POS-TRM-8891 · REGULAR SALE</p>
                  </div>

                  {receiptShowCashier && (
                    <div className="flex justify-between text-[0.625rem] text-gray-700">
                      <span>CASHIER: Staff Cashier</span>
                      <span>10:45 AM</span>
                    </div>
                  )}

                  <div className="border-t border-b border-dashed border-gray-400 py-1.5 space-y-1">
                    <div className="flex justify-between">
                      <span>2x Lucky Me! Pancit Canton</span>
                      <span>₱32.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Coke Mismo 290ml</span>
                      <span>₱18.00</span>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-[0.625rem] font-bold">
                    <div className="flex justify-between text-xs pt-1">
                      <span>TOTAL:</span>
                      <span>₱50.00</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>CASH TENDERED:</span>
                      <span>₱100.00</span>
                    </div>
                    {receiptShowChange && (
                      <div className="flex justify-between text-gray-700">
                        <span>CHANGE DUE:</span>
                        <span>₱50.00</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[0.625rem] pt-2 border-t border-dashed border-gray-400">
                    <p>{receiptCustomFooter}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* LABEL STUDIO */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 space-y-4">
                <div className="p-5 rounded-3xl bg-obsidian-950 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-sans">
                    Shelf Tag Attributes
                  </h3>

                  <div>
                    <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={sampleProductName}
                      onChange={(e) => setSampleProductName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-100 text-xs outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        Barcode (EAN-13 / UPC)
                      </label>
                      <input
                        type="text"
                        value={sampleBarcode}
                        onChange={(e) => setSampleBarcode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-100 font-mono text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        Price (₱)
                      </label>
                      <input
                        type="text"
                        value={samplePrice}
                        onChange={(e) => setSamplePrice(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-emerald-400 font-mono text-sm font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        Price Font Size
                      </label>
                      <select
                        value={labelPriceSize}
                        onChange={(e) => setLabelPriceSize(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-200 text-xs font-semibold outline-none"
                      >
                        <option value="medium">Medium</option>
                        <option value="large">Large (Recommended)</option>
                        <option value="jumbo">Jumbo (Prominent)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        Paper Size
                      </label>
                      <select
                        value={labelPaperSize}
                        onChange={(e) => setLabelPaperSize(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-200 text-xs font-semibold outline-none"
                      >
                        <option value="40x30">40mm × 30mm (Standard Shelf)</option>
                        <option value="30x20">30mm × 20mm (Compact Price)</option>
                        <option value="50x30">50mm × 30mm (Wide Tag)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shelf Tag Visualizer (5 Cols) */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 font-mono">
                  Shelf Tag Preview ({labelPaperSize}mm)
                </div>
                <div className="w-64 p-4 rounded-2xl bg-white text-black border-2 border-gray-300 shadow-2xl flex flex-col justify-between h-48 select-none">
                  <div className="border-b border-gray-300 pb-1 flex justify-between items-center">
                    <span className="text-[0.5625rem] font-bold uppercase truncate max-w-[130px]">{storeName}</span>
                    <span className="text-[0.5625rem] font-mono font-bold text-gray-500">SRP VERIFIED</span>
                  </div>

                  <div>
                    <p className="text-xs font-bold line-clamp-1 leading-tight">{sampleProductName}</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-[0.625rem] text-gray-600 font-mono">RETAIL PRICE:</span>
                      <span
                        className={`font-mono font-extrabold tracking-tight ${
                          labelPriceSize === 'jumbo' ? 'text-2xl' : labelPriceSize === 'large' ? 'text-xl' : 'text-lg'
                        }`}
                      >
                        ₱{samplePrice}
                      </span>
                    </div>
                  </div>

                  {/* Barcode Simulation */}
                  <div className="text-center pt-1 border-t border-gray-200">
                    <div className="h-7 w-full flex items-center justify-center gap-0.5 overflow-hidden">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-black h-full"
                          style={{ width: i % 3 === 0 ? '2.5px' : i % 2 === 0 ? '1.5px' : '1px' }}
                        />
                      ))}
                    </div>
                    <p className="text-[0.5625rem] font-mono tracking-widest mt-0.5">{sampleBarcode}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Studio Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-obsidian-950 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-mono">
            TINDA ESC/POS &amp; Thermal Engine · Settings auto-apply to counter
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-stone-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-obsidian-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-glow-indigo transition-all"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-obsidian-950" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
