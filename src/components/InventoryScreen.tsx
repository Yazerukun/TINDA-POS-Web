import React, { useState, useRef, type ChangeEvent } from 'react'
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
  Layers
} from 'lucide-react'
import type { Product, Category } from '../types'
import { money } from '../utils/format'
import { compressImageFile } from '../utils/image'
import { db } from '../db'

interface InventoryScreenProps {
  products: Product[]
  categories: Category[]
  onRefresh: () => void
}

export function InventoryScreen({ products, categories, onRefresh }: InventoryScreenProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL')
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)

  // Dual photo inputs
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Filtering
  const filtered = products.filter((p) => {
    if (selectedCat !== 'ALL' && p.category_id !== selectedCat) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)
  })

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
      stock: Number(editingProduct.stock) || 0,
      image_path: editingProduct.image_path || null,
      status: 'ACTIVE' as const,
      created_at: editingProduct.created_at || now,
      updated_at: now
    }

    if (editingProduct.id) {
      await db.products.update(editingProduct.id, payload)
    } else {
      await db.products.add(payload as Product)
    }

    setModalOpen(false)
    setEditingProduct(null)
    onRefresh()
  }

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Sigurado ka ba nga i-delete kini nga produkto?')) {
      await db.products.delete(id)
      onRefresh()
    }
  }

  const handleAdjustStock = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta)
    await db.products.update(product.id, { stock: newStock, updated_at: new Date().toISOString() })
    onRefresh()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-400" />
            <span>Inventory Management</span>
          </h2>
          <p className="text-xs text-slate-400">
            Dali nga pag-monitor sa stock, presyo, ug mga hulagway sa produkto (Dual Photo Mode).
          </p>
        </div>
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

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-2xl p-3.5 flex flex-col md:flex-row items-center gap-3">
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
            onClick={() => setSelectedCat('ALL')}
            className={`btn-press whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold ${
              selectedCat === 'ALL'
                ? 'bg-emerald-500 text-obsidian-950 font-bold'
                : 'glass-pill text-slate-300 hover:text-white'
            }`}
          >
            All ({products.length})
          </button>
          {categories.filter((c) => c.parent_id === null).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
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

      {/* Products Table Card */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-obsidian-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Photo & Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Cost</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Walay nakit-an nga produkto.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLow = p.stock <= 5 && p.stock > 0
                  const isOut = p.stock <= 0
                  const cat = categories.find((c) => c.id === p.category_id)
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

                      {/* Price */}
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
                                default_price_c: p.default_price_c / 100
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

      {/* Add / Edit Product Modal with Dual Photo Mode */}
      {modalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/[0.12] p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="btn-press text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Dual Photo Mode Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Product Photo (Dual Mode)</label>
                {/* Hidden camera input */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoPick}
                />
                {/* Hidden gallery input */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoPick}
                />

                {imageBusy ? (
                  <div className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-400 font-semibold">
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>Compressing image to 320px WebP...</span>
                  </div>
                ) : editingProduct.image_path ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-obsidian-900/80 border border-white/[0.08]">
                    <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-obsidian-950 border border-white/[0.08]">
                      <img src={editingProduct.image_path} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">Photo Attached</p>
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
                  placeholder="e.g. Coca-Cola 1.5L"
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
                    placeholder="480..."
                    className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

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

              {/* Cost, Price, Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cost (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.cost_c ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_c: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.default_price_c ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, default_price_c: parseFloat(e.target.value) || 0 })}
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
                  className="btn-press flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-obsidian-950 font-black text-xs shadow-glow-emerald"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
