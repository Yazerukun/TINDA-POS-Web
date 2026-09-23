import React, { useState, useMemo } from 'react'
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  Pencil,
  X,
  ShieldAlert,
  Package
} from 'lucide-react'
import type { Product } from '../types'
import { db } from '../db'

interface ExpirationTrackerModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  onProductsUpdated?: () => void
}

export function ExpirationTrackerModal({
  isOpen,
  onClose,
  products,
  onProductsUpdated
}: ExpirationTrackerModalProps): React.JSX.Element | null {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EXPIRED' | 'SOON' | 'NEAR' | 'UNDATED'>('ALL')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editDate, setEditDate] = useState('')

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Calculate shelf status
  const analyzedProducts = useMemo(() => {
    const today = new Date(todayStr).getTime()
    const msInDay = 1000 * 60 * 60 * 24

    return products
      .filter((p) => p.status !== 'ARCHIVED')
      .map((p) => {
        if (!p.expiration_date) {
          return {
            product: p,
            status: 'UNDATED' as const,
            daysRemaining: null,
            label: 'No Expiry Set',
            color: 'text-stone-400 bg-white/5 border-white/10'
          }
        }

        const expTime = new Date(p.expiration_date).getTime()
        const diffDays = Math.ceil((expTime - today) / msInDay)

        if (diffDays < 0) {
          return {
            product: p,
            status: 'EXPIRED' as const,
            daysRemaining: diffDays,
            label: `Expired (${Math.abs(diffDays)}d ago)`,
            color: 'text-red-400 bg-red-500/15 border-red-500/30'
          }
        }
        if (diffDays <= 7) {
          return {
            product: p,
            status: 'SOON' as const,
            daysRemaining: diffDays,
            label: `Expiring in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
            color: 'text-orange-400 bg-orange-500/15 border-orange-500/30'
          }
        }
        if (diffDays <= 30) {
          return {
            product: p,
            status: 'NEAR' as const,
            daysRemaining: diffDays,
            label: `Expiring in ${diffDays} days`,
            color: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
          }
        }

        return {
          product: p,
          status: 'SAFE' as const,
          daysRemaining: diffDays,
          label: `Safe (${diffDays}d left)`,
          color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
        }
      })
  }, [products, todayStr])

  // Counts
  const counts = useMemo(() => {
    let expired = 0
    let soon = 0
    let near = 0
    let undated = 0

    analyzedProducts.forEach((item) => {
      if (item.status === 'EXPIRED') expired++
      else if (item.status === 'SOON') soon++
      else if (item.status === 'NEAR') near++
      else if (item.status === 'UNDATED') undated++
    })

    return { expired, soon, near, undated }
  }, [analyzedProducts])

  // Filtered list
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim()
    return analyzedProducts.filter((item) => {
      if (activeFilter !== 'ALL' && item.status !== activeFilter) return false
      if (!q) return true
      return (
        item.product.name.toLowerCase().includes(q) ||
        (item.product.barcode && item.product.barcode.includes(q))
      )
    })
  }, [analyzedProducts, activeFilter, search])

  // Save new date
  const handleSaveDate = async () => {
    if (!editingProduct) return
    try {
      await db.products.update(editingProduct.id, {
        expiration_date: editDate || null,
        updated_at: new Date().toISOString()
      })
      setEditingProduct(null)
      if (onProductsUpdated) onProductsUpdated()
    } catch (err) {
      console.error('Failed to update product expiration date:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="w-full max-w-4xl h-[88vh] bg-[#0A0B0E] border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                  Product Expiration Tracker
                </h2>
                <span className="text-[10px] font-mono tracking-widest text-gold-muted border border-gold/30 px-2 py-0.5 rounded-full uppercase">
                  Perishables & Batches
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                Monitor shelf life, prevent expired goods & clearance markdown warnings
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

        {/* Filter Summary Tabs */}
        <div className="p-4 border-b border-white/[0.08] bg-black/40 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`btn-press px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-[#D4AF37] text-black shadow-glow-gold'
                  : 'bg-white/[0.04] text-stone-400 hover:text-stone-200'
              }`}
            >
              All Items ({analyzedProducts.length})
            </button>

            <button
              onClick={() => setActiveFilter('EXPIRED')}
              className={`btn-press px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeFilter === 'EXPIRED'
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
              }`}
            >
              <span>🚨 Expired</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono font-bold">
                {counts.expired}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('SOON')}
              className={`btn-press px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeFilter === 'SOON'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20'
              }`}
            >
              <span>⚠️ Expiring in 7 Days</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono font-bold">
                {counts.soon}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('NEAR')}
              className={`btn-press px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeFilter === 'NEAR'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
            >
              <span>🟡 Within 30 Days</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono font-bold">
                {counts.near}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('UNDATED')}
              className={`btn-press px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeFilter === 'UNDATED'
                  ? 'bg-stone-600 text-white shadow-lg'
                  : 'bg-white/5 text-stone-400 hover:text-stone-200 border border-white/5'
              }`}
            >
              <span>⚪ No Date Set</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono font-bold">
                {counts.undated}
              </span>
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name or barcode..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-950 border border-white/15 text-stone-100 placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-white/[0.05]">
          {filteredItems.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Calendar className="h-10 w-10 text-stone-600 mx-auto" />
              <p className="text-sm font-bold text-stone-400">Walay produkto nga nag-match</p>
              <p className="text-xs font-mono text-stone-500">
                Pili-a ang "All Items" o pag-set ug expiration date sa ubang produkto.
              </p>
            </div>
          ) : (
            filteredItems.map(({ product, status, label, color }) => (
              <div
                key={product.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-stone-400 shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                      Stock: <strong className="text-stone-200">{product.stock} {product.base_unit}</strong> · Expiry:{' '}
                      <span className="text-gold-light font-bold">
                        {product.expiration_date || 'Not configured'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${color}`}
                  >
                    {label}
                  </span>

                  <button
                    onClick={() => {
                      setEditingProduct(product)
                      setEditDate(product.expiration_date || '')
                    }}
                    className="btn-press px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-stone-300 text-xs font-medium flex items-center gap-1"
                    title="Edit expiration date"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Set Date</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Date Edit Modal Overlay */}
        {editingProduct && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-[#0E0F14] border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-gold-muted uppercase">Set Shelf Expiration</p>
                  <h4 className="text-sm font-bold text-white mt-0.5">{editingProduct.name}</h4>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="btn-press p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-black border border-white/15 text-stone-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="btn-press flex-1 py-2.5 rounded-xl bg-white/[0.06] text-stone-300 text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDate}
                  className="btn-press flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider shadow-glow-gold"
                >
                  Save Date
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
