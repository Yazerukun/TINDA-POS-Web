import React, { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react'
import {
  Plus,
  Search,
  Camera,
  ImageIcon,
  Trash2,
  Edit2,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Layers,
  History,
  Sparkles,
  Check
} from 'lucide-react'
import type { Product, Category, RestockLog, RestockType, PriceReference } from '../types'
import { money, formatDateTime } from '../utils/format'
import { compressImageFile } from '../utils/image'
import { findSuggestedPrice, getSrpComparison } from '../utils/srp'
import { syncOnlinePriceCatalog } from '../services/onlinePriceSync'
import { db } from '../db'

interface InventoryScreenProps {
  products: Product[]
  categories: Category[]
  onRefresh: () => void
  cashierName?: string
}

export function InventoryScreen({ products, categories, onRefresh, cashierName }: InventoryScreenProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL')
  const [selectedSubCat, setSelectedSubCat] = useState<number | 'ALL'>('ALL')
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [restockLogs, setRestockLogs] = useState<RestockLog[]>([])

  // Suggested Price / DTI SRP states
  const [priceReferences, setPriceReferences] = useState<PriceReference[]>([])
  const [autoMatching, setAutoMatching] = useState(false)

  // Dual photo inputs
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Main + Sub category options
  const mainCategories = categories.filter((c) => c.parent_id === null)
  const subCategories = selectedCat === 'ALL' ? [] : categories.filter((c) => c.parent_id === selectedCat)

  // Load price references
  useEffect(() => {
    const loadPriceRefs = async () => {
      try {
        const refs = await db.price_references.toArray()
        setPriceReferences(refs)
      } catch (e) {
        console.error('Failed to load price references:', e)
      }
    }
    loadPriceRefs()
  }, [])

  // Filtering (main category AND subcategory)
  const filtered = products.filter((p) => {
    if (selectedCat !== 'ALL' && p.category_id !== selectedCat) return false
    if (selectedSubCat !== 'ALL' && p.subcategory_id !== selectedSubCat) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)
  })

  // Live restocking history from Dexie
  const loadRestockLogs = useCallback(async () => {
    try {
      const logs = await db.restock_logs.orderBy('timestamp').reverse().toArray()
      setRestockLogs(logs)
    } catch {
      setRestockLogs([])
    }
  }, [])

  useEffect(() => {
    void loadRestockLogs()
  }, [loadRestockLogs])

  const logRestock = async (
    product: Product,
    quantity: number,
    type: RestockType,
    beforeStock: number,
    afterStock: number,
    note: string | null
  ): Promise<void> => {
    await db.restock_logs.add({
      product_id: product.id,
      product_name: product.name,
      quantity,
      type,
      before_stock: beforeStock,
      after_stock: afterStock,
      note,
      timestamp: new Date().toISOString(),
      cashier_name: cashierName || 'Unknown Cashier'
    })
  }

  // Handle Photo Pick
  const handlePhotoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageBusy(true)
    try {
      const dataUrl = await compressImageFile(file, 320, 320, 0.82)
      setEditingProduct((prev) => (prev ? { ...prev, image_path: dataUrl } : null))
    } catch (err) {
      alert('Photo compression failed: ' + (err as Error)?.message)
    } finally {
      setImageBusy(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const removePhoto = () => {
    setEditingProduct((prev) => (prev ? { ...prev, image_path: null } : null))
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  // Save product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct?.name?.trim()) return

    const now = new Date().toISOString()
    const payload = {
      name: editingProduct.name.trim(),
      sku: editingProduct.sku?.trim() || null,
      barcode: editingProduct.barcode?.trim() || null,
      category_id: editingProduct.category_id ? Number(editingProduct.category_id) : null,
      subcategory_id: editingProduct.subcategory_id ? Number(editingProduct.subcategory_id) : null,
      base_unit: editingProduct.base_unit || 'piece',
      cost_c: Math.round((Number(editingProduct.cost_c) || 0) * 100),
      default_price_c: Math.round((Number(editingProduct.default_price_c) || 0) * 100),
      suggested_price_c:
        editingProduct.suggested_price_c !== undefined &&
        editingProduct.suggested_price_c !== null &&
        editingProduct.suggested_price_c !== ('' as any)
          ? Math.round(Number(editingProduct.suggested_price_c) * 100)
          : null,
      stock: Number(editingProduct.stock) || 0,
      image_path: editingProduct.image_path || null,
      status: 'ACTIVE' as const,
      created_at: editingProduct.created_at || now,
      updated_at: now
    }

    if (editingProduct.id) {
      const existing = products.find((p) => p.id === editingProduct.id)
      await db.products.update(editingProduct.id, payload)
      if (existing && payload.stock !== existing.stock) {
        await logRestock(existing, payload.stock - existing.stock, 'ADJUSTMENT', existing.stock, payload.stock, 'Stock adjusted in product form')
      }
    } else {
      await db.products.add(payload as Product)
    }

    setModalOpen(false)
    setEditingProduct(null)
    await loadRestockLogs()
    onRefresh()
  }

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await db.products.delete(id)
      onRefresh()
    }
  }

  const handleAdjustStock = async (product: Product, delta: number) => {
    const beforeStock = product.stock
    const newStock = Math.max(0, beforeStock + delta)
    const applied = newStock - beforeStock
    if (applied !== 0) {
      await db.products.update(product.id, { stock: newStock, updated_at: new Date().toISOString() })
      await logRestock(product, applied, applied > 0 ? 'RESTOCK' : 'ADJUSTMENT', beforeStock, newStock, null)
      await loadRestockLogs()
      onRefresh()
    }
  }

  // 1-Click Link SRP for a single product
  const handleLinkSrp = async (product: Product) => {
    const ref = findSuggestedPrice(product, priceReferences)
    if (ref && ref.market_price_c) {
      await db.products.update(product.id, {
        suggested_price_c: ref.market_price_c,
        updated_at: new Date().toISOString()
      })
      onRefresh()
    } else {
      alert(`No official DTI SRP found for "${product.name}". You can set the suggested price manually in the Edit modal.`)
    }
  }

  // 1-Click Auto-match all products in inventory with DTI & Market SRP
  const handleAutoMatchAllSrp = async () => {
    setAutoMatching(true)
    try {
      // 1. Attempt cloud edge sync first to get latest prices
      let latestRefs = priceReferences
      try {
        await syncOnlinePriceCatalog()
        latestRefs = await db.price_references.toArray()
        setPriceReferences(latestRefs)
      } catch (e) {
        console.warn('Online sync during auto-match skipped, using local catalog:', e)
      }

      let matchedCount = 0
      for (const p of products) {
        if (!p.suggested_price_c) {
          const ref = findSuggestedPrice(p, latestRefs)
          if (ref && ref.market_price_c) {
            await db.products.update(p.id, {
              suggested_price_c: ref.market_price_c,
              updated_at: new Date().toISOString()
            })
            matchedCount++
          }
        }
      }
      alert(`Auto-match complete! ${matchedCount} product(s) linked to official DTI & Market SRP.`)
      onRefresh()
    } catch (err) {
      console.error('Error auto-matching SRP:', err)
    } finally {
      setAutoMatching(false)
    }
  }

  // Detect local match while typing in modal
  const detectedSrp = editingProduct ? findSuggestedPrice(editingProduct, priceReferences) : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-emerald-400" />
              <span>Inventory Management</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor stock levels, retail pricing, official DTI Suggested Retail Prices (SRP), and product photos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto-Match DTI SRP Button */}
          <button
            onClick={handleAutoMatchAllSrp}
            disabled={autoMatching}
            className="btn-press flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs shadow-sm transition-all"
            title="Auto-match products to DTI SRP using barcodes and names"
          >
            <Sparkles className={`h-4 w-4 text-amber-400 ${autoMatching ? 'animate-spin' : ''}`} />
            <span>{autoMatching ? 'Matching SRP...' : 'Auto-Match DTI SRP'}</span>
          </button>

          {/* Add New Product Button */}
          <button
            onClick={() => {
              setEditingProduct({
                name: '',
                sku: '',
                barcode: '',
                category_id: categories[0]?.id || null,
                base_unit: 'piece',
                cost_c: 0,
                default_price_c: 0,
                suggested_price_c: undefined,
                stock: 10,
                image_path: null
              })
              setModalOpen(true)
            }}
            className="btn-press flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 font-bold text-xs shadow-glow-emerald"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-2xl p-3.5 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, or barcode..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => { setSelectedCat('ALL'); setSelectedSubCat('ALL') }}
              className={`btn-press whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold ${
                selectedCat === 'ALL'
                  ? 'bg-emerald-500 text-obsidian-950 font-bold'
                  : 'glass-pill text-slate-300 hover:text-white'
              }`}
            >
              All ({products.length})
            </button>
            {mainCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCat(c.id); setSelectedSubCat('ALL') }}
                className={`btn-press whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  selectedCat === c.id
                    ? 'bg-emerald-500 text-obsidian-950 font-bold'
                    : 'glass-pill text-slate-300 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Subcategory row */}
        {subCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-white/[0.06] pt-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 shrink-0">
              Subcategory
            </span>
            <button
              onClick={() => setSelectedSubCat('ALL')}
              className={`btn-press whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold ${
                selectedSubCat === 'ALL'
                  ? 'bg-emerald-500 text-obsidian-950 font-bold'
                  : 'glass-pill text-slate-300 hover:text-white'
              }`}
            >
              All {categories.find((c) => c.id === selectedCat)?.name ?? ''}
            </button>
            {subCategories.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubCat(s.id)}
                className={`btn-press whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  selectedSubCat === s.id
                    ? 'bg-emerald-500 text-obsidian-950 font-bold'
                    : 'glass-pill text-slate-300 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Table Card */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-obsidian-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Photo & Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Cost</th>
                <th className="py-3.5 px-4">Suggested (SRP)</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No products found matching your search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLow = p.stock <= 5 && p.stock > 0
                  const isOut = p.stock <= 0
                  const cat = categories.find((c) => c.id === p.category_id)

                  // Suggested Price resolution: either stored in product or matched from DTI references
                  const matchedRef = !p.suggested_price_c ? findSuggestedPrice(p, priceReferences) : null
                  const effectiveSrpC = p.suggested_price_c || (matchedRef ? matchedRef.market_price_c : null)
                  const srpComparison = getSrpComparison(
                    p.default_price_c,
                    effectiveSrpC,
                    matchedRef?.min_price_c,
                    matchedRef?.max_price_c
                  )

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Photo & Name */}
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-obsidian-950 border border-white/[0.08] flex items-center justify-center">
                          {p.image_path ? (
                            <img src={p.image_path} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white leading-tight">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                            {p.sku && <span>SKU: {p.sku}</span>}
                            {p.barcode && <span>• Barcode: {p.barcode}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-300">
                        {cat ? cat.name : 'Uncategorized'}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {money(p.cost_c)}
                      </td>

                      {/* Suggested Price (SRP) */}
                      <td className="py-3 px-4">
                        {effectiveSrpC && effectiveSrpC > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono font-bold text-amber-300">
                              {money(effectiveSrpC)}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight ${srpComparison.badgeClass}`}
                            >
                              {srpComparison.label}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleLinkSrp(p)}
                            className="btn-press text-[10px] font-mono text-amber-400/80 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/25 transition-all"
                            title="Find and link official DTI Suggested Retail Price"
                          >
                            + Link SRP
                          </button>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {money(p.default_price_c)}
                      </td>

                      {/* Stock with quick stepper */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdjustStock(p, -1)}
                            className="btn-press h-5 w-5 rounded-md bg-obsidian-900 border border-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {p.stock} {p.base_unit}
                          </span>
                          <button
                            onClick={() => handleAdjustStock(p, 1)}
                            className="btn-press h-5 w-5 rounded-md bg-obsidian-900 border border-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct({
                                ...p,
                                cost_c: p.cost_c / 100,
                                default_price_c: p.default_price_c / 100,
                                suggested_price_c: p.suggested_price_c ? p.suggested_price_c / 100 : undefined
                              })
                              setModalOpen(true)
                            }}
                            className="btn-press p-1.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="btn-press p-1.5 rounded-xl border border-white/[0.08] text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restocking History */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-400" />
            <span>Restocking History</span>
          </h3>
          <span className="text-[11px] text-slate-400">{restockLogs.length} records</span>
        </div>

        {restockLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No restocking records yet. Adjust stock on any item to view its history here.
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
            {restockLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-obsidian-900/60 border border-white/[0.06]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.04] text-slate-300 flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{log.product_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDateTime(log.timestamp)} · {log.cashier_name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        log.type === 'RESTOCK'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : log.type === 'RETURN'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span
                      className={`text-xs font-black font-mono ${
                        log.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add or Edit Product */}
      {modalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/[0.12] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-400" />
                <span>{editingProduct.id ? 'Edit Product' : 'Add New Product'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Dual Photo Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Product Photo</label>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoPick} className="hidden" />
                <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoPick} className="hidden" />

                {imageBusy ? (
                  <div className="flex items-center justify-center p-6 rounded-2xl border border-white/[0.08] bg-obsidian-900/60">
                    <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" />
                    <span className="ml-2 text-xs text-slate-400">Optimizing photo...</span>
                  </div>
                ) : editingProduct.image_path ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.08] bg-obsidian-900/60">
                    <img src={editingProduct.image_path} alt="Preview" className="h-16 w-16 rounded-xl object-cover border border-white/[0.08]" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Attached Image</p>
                      <p className="text-[11px] text-slate-400">Client-side WebP (~15KB) ready</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="btn-press px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="btn-press px-2.5 py-1 rounded-lg bg-obsidian-850 border border-white/[0.08] text-slate-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>Gallery</span>
                        </button>
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="btn-press px-2 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="btn-press flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-center transition-all"
                    >
                      <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-white">Take Photo</span>
                        <span className="block text-[10px] text-slate-400">Open camera</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="btn-press flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-dashed border-white/[0.12] bg-obsidian-900/60 hover:bg-obsidian-850 text-center transition-all"
                    >
                      <div className="h-8 w-8 rounded-xl bg-obsidian-850 text-slate-300 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-white">Upload Image</span>
                        <span className="block text-[10px] text-slate-400">Choose from gallery</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g. Lucky Me Pancit Canton Kalamansi 60g"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    placeholder="BEV-001"
                    className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    placeholder="4800016644810"
                    className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Live Detected DTI SRP Banner */}
              {detectedSrp && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-200 truncate">
                        Official DTI SRP: ₱{(detectedSrp.market_price_c / 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-stone-400 truncate">
                        {detectedSrp.product_name} · {detectedSrp.source_name || 'DTI SRP Guide'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const srpPeso = detectedSrp.market_price_c / 100
                        setEditingProduct((prev) =>
                          prev
                            ? {
                                ...prev,
                                suggested_price_c: srpPeso,
                                default_price_c: srpPeso
                              }
                            : null
                        )
                      }}
                      className="btn-press px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 text-[11px] font-bold"
                    >
                      Apply SRP
                    </button>
                  </div>
                </div>
              )}

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={editingProduct.category_id || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: Number(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">No Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Unit</label>
                  <input
                    type="text"
                    value={editingProduct.base_unit || 'piece'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, base_unit: e.target.value })}
                    placeholder="piece, bottle, pack"
                    className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Financial Inputs: Cost, SRP, Selling Price, Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cost (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.cost_c ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_c: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center justify-between">
                    <span>SRP (₱)</span>
                    <span className="text-[9px] text-amber-400/80 font-mono">DTI</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.suggested_price_c ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        suggested_price_c: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    placeholder="e.g. 10.50"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950/80 border border-amber-500/35 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.default_price_c ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, default_price_c: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={editingProduct.stock ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-press flex-1 py-2.5 rounded-xl border border-white/[0.12] bg-obsidian-900 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-press flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 text-xs font-bold shadow-glow-emerald"
                >
                  {editingProduct.id ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
