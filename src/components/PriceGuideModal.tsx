import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Sparkles,
  Barcode,
  Plus,
  Check,
  X,
  ExternalLink,
  Tag,
  Store
} from 'lucide-react'
import type { Product, PriceReference } from '../types'
import { db } from '../db'
import { money } from '../utils/format'

interface PriceGuideModalProps {
  isOpen: boolean
  onClose: () => void
  onProductAdded?: () => void
  existingProducts: Product[]
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Items' },
  { id: 'NOODLES', label: 'Instant Noodles' },
  { id: 'CANNED', label: 'Canned Goods & Meat' },
  { id: 'BEVERAGES', label: 'Drinks & Coffee' },
  { id: 'DAIRY', label: 'Milk & Dairy' },
  { id: 'CONDIMENTS', label: 'Condiments & Oil' },
  { id: 'HOUSEHOLD', label: 'Soaps & Detergents' },
  { id: 'SNACKS', label: 'Biscuits & Snacks' }
]

export function PriceGuideModal({
  isOpen,
  onClose,
  onProductAdded,
  existingProducts
}: PriceGuideModalProps): React.JSX.Element | null {
  const [references, setReferences] = useState<PriceReference[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Load from Dexie price_references
  useEffect(() => {
    if (!isOpen) return
    let active = true

    const loadRefs = async () => {
      setLoading(true)
      try {
        const rows = await db.price_references.toArray()
        if (active) {
          setReferences(rows)
        }
      } catch (err) {
        console.error('Failed to load price references:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRefs()
    return () => {
      active = false
    }
  }, [isOpen])

  // Existing barcodes and names lookup set
  const existingBarcodeSet = useMemo(() => {
    const set = new Set<string>()
    existingProducts.forEach((p) => {
      if (p.barcode) set.add(p.barcode.trim())
      if (p.name) set.add(p.name.toLowerCase().trim())
    })
    return set
  }, [existingProducts])

  // Filtered references
  const filteredReferences = useMemo(() => {
    const q = search.toLowerCase().trim()
    return references.filter((ref) => {
      // Category filter matching
      if (selectedCategory !== 'ALL') {
        const text = `${ref.product_name} ${ref.brand} ${ref.category || ''}`.toLowerCase()
        if (selectedCategory === 'NOODLES' && !text.includes('noodle') && !text.includes('canton') && !text.includes('mami')) return false
        if (selectedCategory === 'CANNED' && !text.includes('sardine') && !text.includes('tuna') && !text.includes('corned') && !text.includes('meat') && !text.includes('sausage')) return false
        if (selectedCategory === 'BEVERAGES' && !text.includes('coffee') && !text.includes('coke') && !text.includes('drink') && !text.includes('tea') && !text.includes('juice')) return false
        if (selectedCategory === 'DAIRY' && !text.includes('milk') && !text.includes('cheese') && !text.includes('butter')) return false
        if (selectedCategory === 'CONDIMENTS' && !text.includes('sauce') && !text.includes('vinegar') && !text.includes('oil') && !text.includes('patis') && !text.includes('toyo') && !text.includes('ketchup')) return false
        if (selectedCategory === 'HOUSEHOLD' && !text.includes('soap') && !text.includes('tide') && !text.includes('ariel') && !text.includes('surf') && !text.includes('detergent') && !text.includes('safeguard') && !text.includes('downy')) return false
        if (selectedCategory === 'SNACKS' && !text.includes('biscuit') && !text.includes('snack') && !text.includes('cookie') && !text.includes('wafer') && !text.includes('cracker')) return false
      }

      if (!q) return true
      return (
        ref.product_name.toLowerCase().includes(q) ||
        ref.brand.toLowerCase().includes(q) ||
        ref.barcode.includes(q)
      )
    })
  }, [references, search, selectedCategory])

  // Add to Inventory action
  const handleAddToInventory = async (ref: PriceReference) => {
    try {
      const estimatedCost = ref.min_price_c ? Math.round(ref.min_price_c * 0.95) : Math.round(ref.market_price_c * 0.8)
      await db.products.add({
        name: ref.product_name,
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        barcode: ref.barcode,
        category_id: 1,
        subcategory_id: null,
        base_unit: ref.unit || 'pcs',
        cost_c: estimatedCost,
        default_price_c: ref.market_price_c,
        stock: 10,
        low_stock_threshold: 5,
        expiration_date: null,
        supplier_id: null,
        image_path: ref.image_url || null,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      setAddedIds((prev) => new Set([...prev, ref.barcode]))
      if (onProductAdded) onProductAdded()
    } catch (err) {
      console.error('Failed to add reference product to inventory:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="w-full max-w-5xl h-[90vh] bg-[#0A0B0E] border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                  TINDA BANTAY · Price Guide
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  DTI SRP LIVE
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                Official Department of Trade & Industry Suggested Retail Prices · Philippine Sari-Sari & Grocery Catalog
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-press h-9 w-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-white/[0.08] bg-black/40 space-y-3 shrink-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand, product name, or barcode (e.g. Lucky Me, Nescafe, Century Tuna, 48000166...)"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950 border border-white/15 text-stone-100 placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`btn-press px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4AF37] text-black shadow-glow-gold'
                    : 'bg-white/[0.04] text-stone-400 hover:text-stone-200 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div className="px-5 py-2.5 bg-zinc-950/60 border-b border-white/5 flex items-center justify-between text-xs font-mono text-stone-400 shrink-0">
          <span>Showing {filteredReferences.length} verified products</span>
          <span className="text-[11px] text-gold-muted">Tip: Click "+ Add to Inventory" to auto-create item with official barcode & SRP</span>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-stone-400">
              <div className="h-8 w-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
              <p className="text-xs font-mono uppercase tracking-wider text-gold-muted">
                Loading DTI SRP Reference Catalog...
              </p>
            </div>
          ) : filteredReferences.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-2 text-stone-500 text-center">
              <Barcode className="h-10 w-10 text-stone-600" />
              <p className="text-sm font-bold text-stone-400">Walay produkto nga nag-match</p>
              <p className="text-xs font-mono">Suwayi pag-search gamit ang brand (e.g. "Silver Swan", "Bear Brand", "Pancit Canton")</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredReferences.map((ref) => {
                const isAlreadyInCatalog = existingBarcodeSet.has(ref.barcode) ||
                  existingBarcodeSet.has(ref.product_name.toLowerCase().trim()) ||
                  addedIds.has(ref.barcode)

                return (
                  <div
                    key={ref.barcode}
                    className="p-4 rounded-2xl bg-zinc-950/80 border border-white/[0.08] hover:border-amber-500/30 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-stone-400 text-[10px] font-mono font-semibold uppercase">
                          {ref.brand}
                        </span>

                        <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {ref.barcode}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-stone-100 group-hover:text-gold-light transition-colors line-clamp-2 leading-snug">
                        {ref.product_name}
                      </h4>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                          DTI Suggested SRP
                        </p>
                        <p className="text-lg font-serif font-black text-gold-light">
                          {money(ref.market_price_c)}
                        </p>
                        {ref.min_price_c && ref.max_price_c && (
                          <p className="text-[10px] text-stone-500 font-mono">
                            Range: {money(ref.min_price_c)} - {money(ref.max_price_c)}
                          </p>
                        )}
                      </div>

                      {isAlreadyInCatalog ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shrink-0">
                          <Check className="h-3.5 w-3.5" />
                          <span>In Catalog</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToInventory(ref)}
                          className="btn-press px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] hover:from-amber-300 hover:to-gold text-black text-xs font-bold flex items-center gap-1.5 shadow-glow-gold transition-all shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>Add to Inventory</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
