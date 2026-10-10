import React, { useState, useMemo } from 'react'
import {
  Printer,
  Copy,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  ShoppingCart,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  BadgePercent,
  Calculator,
  ShieldCheck
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { playSuccessSound } from '../lib/sound'

export type ServiceCategory = 'PRINTING' | 'PHOTOCOPY_SCAN' | 'ID_PVC' | 'LAMINATION' | 'RESUME_TYPING'

interface PresetService {
  id: string
  name: string
  category: ServiceCategory
  description: string
  paperSize: string
  suggestedPricePerUnit: number
  badge?: string
}

const PRESET_SERVICES: PresetService[] = [
  {
    id: 'bw_print_short',
    name: 'B/W Print (Short)',
    category: 'PRINTING',
    description: 'Black & white document printing on short bond paper (70-80gsm)',
    paperSize: 'SHORT',
    suggestedPricePerUnit: 3,
    badge: 'POPULAR'
  },
  {
    id: 'bw_print_long',
    name: 'B/W Print (Long)',
    category: 'PRINTING',
    description: 'Black & white document printing on long bond paper',
    paperSize: 'LONG',
    suggestedPricePerUnit: 4
  },
  {
    id: 'bw_print_a4',
    name: 'B/W Print (A4)',
    category: 'PRINTING',
    description: 'Black & white printing on standard A4 paper',
    paperSize: 'A4',
    suggestedPricePerUnit: 3
  },
  {
    id: 'color_print_short',
    name: 'Color Print (Standard)',
    category: 'PRINTING',
    description: 'Text and images standard inkjet color printing',
    paperSize: 'SHORT / A4',
    suggestedPricePerUnit: 10,
    badge: 'COLOR'
  },
  {
    id: 'color_photo_glossy',
    name: 'Glossy Photo Print',
    category: 'PRINTING',
    description: 'High-resolution photo print on premium glossy paper',
    paperSize: '4R / A4',
    suggestedPricePerUnit: 25,
    badge: 'PHOTO'
  },
  {
    id: 'photocopy_bw',
    name: 'Xerox / Photocopy (B/W)',
    category: 'PHOTOCOPY_SCAN',
    description: 'Fast dual-sided black & white photocopying',
    paperSize: 'SHORT / LONG',
    suggestedPricePerUnit: 2,
    badge: 'FAST'
  },
  {
    id: 'pvc_id_card',
    name: 'PVC ID Card (Rush)',
    category: 'ID_PVC',
    description: 'Waterproof double-sided PVC ID card with slot punch',
    paperSize: 'CR80 (Standard ID)',
    suggestedPricePerUnit: 50,
    badge: 'PREMIUM'
  },
  {
    id: 'lamination_short',
    name: 'Document Lamination',
    category: 'LAMINATION',
    description: 'Heavy duty 250 micron hot thermal lamination pouch',
    paperSize: 'SHORT / LONG',
    suggestedPricePerUnit: 25
  }
]

interface PrintingServicesScreenProps {
  onAddToCart?: (item: { name: string; price_c: number; quantity: number }) => void
  currentCashierName?: string
  storeName?: string
}

export function PrintingServicesScreen({
  onAddToCart,
  currentCashierName = 'Cashier',
  storeName = 'TINDA Retail Station'
}: PrintingServicesScreenProps): React.JSX.Element {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(PRESET_SERVICES[0]!.id)
  const [pages, setPages] = useState<number>(1)
  const [copies, setCopies] = useState<number>(1)
  const [customPrice, setCustomPrice] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [recentJobs, setRecentJobs] = useState<
    {
      id: string
      serviceName: string
      totalUnits: number
      totalAmount: number
      timestamp: string
      customerName: string
    }[]
  >([])

  const activeService = useMemo(() => {
    return PRESET_SERVICES.find((s) => s.id === selectedServiceId) || PRESET_SERVICES[0]!
  }, [selectedServiceId])

  const effectiveUnitCost = useMemo(() => {
    const parsed = parseFloat(customPrice)
    return !isNaN(parsed) && parsed > 0 ? parsed : activeService.suggestedPricePerUnit
  }, [customPrice, activeService])

  const totalCalculated = useMemo(() => {
    const totalUnits = (pages || 1) * (copies || 1)
    return totalUnits * effectiveUnitCost
  }, [pages, copies, effectiveUnitCost])

  const handleChargeService = (sendToCart: boolean) => {
    const totalUnits = (pages || 1) * (copies || 1)
    const newJob = {
      id: `PRN-${Date.now()}`,
      serviceName: `${activeService.name} (${pages}p × ${copies}c)`,
      totalUnits,
      totalAmount: totalCalculated,
      timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      customerName: customerName.trim() || 'Walk-in Customer'
    }

    setRecentJobs([newJob, ...recentJobs])
    playSuccessSound()

    if (sendToCart && onAddToCart) {
      onAddToCart({
        name: `Print: ${activeService.name}`,
        price_c: Math.round(effectiveUnitCost * 100),
        quantity: totalUnits
      })
      alert(`Naidagdag sa POS Cart: ${activeService.name} (${totalUnits} units, ₱${totalCalculated})`)
    } else {
      alert(`Print Job Recorded: ₱${totalCalculated} for ${newJob.customerName}`)
    }

    // Reset customer
    setCustomerName('')
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-obsidian-950 p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-wide">
              Customer Print Services Hub
            </h1>
            <p className="text-xs text-stone-400">
              Document printing, Xerox photocopy, PVC ID cards, and lamination billing calculator
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset Catalog Bento (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-sans">
                Printing &amp; Copying Service Catalog
              </h2>
              <span className="text-[0.6875rem] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                8 PRESETS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_SERVICES.map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => {
                    setSelectedServiceId(srv.id)
                    setCustomPrice('')
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedServiceId === srv.id
                      ? 'bg-sky-500/15 border-sky-500 text-sky-200 font-bold shadow-sm'
                      : 'bg-obsidian-850 border-slate-800 text-stone-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/[0.06] text-stone-300">
                      ₱{srv.suggestedPricePerUnit} / unit
                    </span>
                    {srv.badge && (
                      <span className="text-[0.625rem] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        {srv.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-stone-100">{srv.name}</h4>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2">{srv.description}</p>
                  <p className="text-[0.625rem] text-sky-400/80 uppercase font-mono mt-2">
                    Paper: {srv.paperSize}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Job Calculator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                Print Rate Calculator
              </span>
              <span className="text-xs font-mono font-bold text-stone-200">
                {activeService.name}
              </span>
            </div>

            <div>
              <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                Customer Name / Project
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Student Research / Barangay ID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-sky-500 text-stone-100 text-sm outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  Pages / Sheets
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={pages}
                    onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-sky-500 text-stone-100 font-mono text-base font-bold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  Copies
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-sky-500 text-stone-100 font-mono text-base font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                Override Unit Price (₱) <span className="text-stone-500">(Optional)</span>
              </label>
              <input
                type="number"
                step="any"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={`Default: ₱${activeService.suggestedPricePerUnit}`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-sky-500 text-stone-100 font-mono text-sm outline-none"
              />
            </div>

            {/* Total Billing Display */}
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
                <span>Total Units:</span>
                <span>{(pages || 1) * (copies || 1)} units @ ₱{effectiveUnitCost}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-sky-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  Total Collectible:
                </span>
                <span className="text-2xl font-mono font-bold text-sky-400">
                  {formatCurrency(Math.round(totalCalculated * 100))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChargeService(false)}
                className="py-3 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-700 text-stone-200 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Log Cash Sale
              </button>
              <button
                type="button"
                onClick={() => handleChargeService(true)}
                className="py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-obsidian-950 font-bold text-xs uppercase tracking-wider transition-all shadow-glow-sky flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>

          {/* Recent Jobs List */}
          {recentJobs.length > 0 && (
            <div className="p-4 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider font-sans">
                Recent Print Jobs
              </h3>
              <div className="space-y-1.5">
                {recentJobs.slice(0, 4).map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono"
                  >
                    <div>
                      <p className="font-sans font-bold text-stone-200">{j.serviceName}</p>
                      <p className="text-[0.625rem] text-stone-500">{j.customerName} · {j.timestamp}</p>
                    </div>
                    <span className="font-bold text-sky-400">
                      {formatCurrency(Math.round(j.totalAmount * 100))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
