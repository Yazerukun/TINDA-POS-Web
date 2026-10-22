import React, { useState, useEffect, useMemo } from 'react'
import {
  Store,
  Search,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Barcode,
  AlertTriangle,
  CheckCircle2,
  Package,
  Clock,
  RefreshCw,
  FileText
} from 'lucide-react'
import type { Product } from '../types'
import { money } from '../utils/format'
import { Modal } from './ui/Modal'
import { db } from '../db'
import { toastSuccess, toastError } from '../stores/toast'
import { playScanSuccess } from '../lib/sound'

interface StoreUseModalProps {
  open: boolean
  onClose: () => void
  onDone?: () => void
  cashierName?: string
  storeName?: string
  allProducts?: Product[]
}

export interface StoreUseRecord {
  id: string
  created_at: string
  purpose: string
  cashier_name: string
  items: Array<{
    product_id: number
    product_name: string
    quantity: number
    unit_name: string
    cost_c: number
    subtotal_c: number
  }>
  total_cost_c: number
  notes?: string
}

const COMMON_PURPOSES = [
  'Store Cleaning & Janitorial Supplies',
  'Staff Consumption / Merienda',
  'Store Repair & Maintenance',
  'Expired / Damaged Spoilage Write-Off',
  'Counter Display & Free Sample',
  'Office & Admin Stationery'
]

const STORAGE_KEY = 'tinda_store_use_records_v1'

export function getStoredStoreUseRecords(): StoreUseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        ...r,
        items: Array.isArray(r.items) ? r.items : [],
        total_cost_c: typeof r.total_cost_c === 'number' ? r.total_cost_c : 0,
        purpose: r.purpose || 'Store Use',
        created_at: r.created_at || new Date().toISOString()
      }))
  } catch {
    return []
  }
}

export function saveStoreUseRecord(rec: StoreUseRecord): void {
  try {
    const current = getStoredStoreUseRecords()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([rec, ...current].slice(0, 100)))
  } catch {}
}

export function StoreUseModal({
  open,
  onClose,
  onDone,
  cashierName = 'Cashier',
  storeName = 'Store Station',
  allProducts: propProducts
}: StoreUseModalProps): React.JSX.Element | null {
  const [tab, setTab] = useState<'CREATE' | 'HISTORY'>('CREATE')
  const [purpose, setPurpose] = useState<string>(COMMON_PURPOSES[0]!)
  const [notes, setNotes] = useState<string>('')
  const [allProducts, setAllProducts] = useState<Product[]>(() => propProducts || [])
  const [records, setRecords] = useState<StoreUseRecord[]>(() => getStoredStoreUseRecords())

  // Product selection & items in voucher
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      product: Product
      quantity: number
    }>
  >([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (propProducts && propProducts.length > 0) {
        setAllProducts(propProducts)
      } else {
        db.products
          .toArray()
          .then((items) => {
            setAllProducts(items.filter((p) => p.status !== 'ARCHIVED'))
          })
          .catch(() => {})
      }
      setRecords(getStoredStoreUseRecords())
    }
  }, [open, propProducts])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)))
      .slice(0, 6)
  }, [searchQuery, allProducts])

  const totalCostC = useMemo(() => {
    return selectedItems.reduce((sum, it) => sum + (it.product.cost_c || 0) * it.quantity, 0)
  }, [selectedItems])

  const handleAddItem = (prod: Product) => {
    const existing = selectedItems.find((it) => it.product.id === prod.id)
    if (existing) {
      setSelectedItems((prev) =>
        prev.map((it) => (it.product.id === prod.id ? { ...it, quantity: it.quantity + 1 } : it))
      )
    } else {
      setSelectedItems((prev) => [...prev, { product: prod, quantity: 1 }])
    }
    setSearchQuery('')
    try {
      playScanSuccess()
    } catch {}
  }

  const handleUpdateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setSelectedItems((prev) => prev.filter((it) => it.product.id !== productId))
    } else {
      setSelectedItems((prev) =>
        prev.map((it) => (it.product.id === productId ? { ...it, quantity: qty } : it))
      )
    }
  }

  const handleSubmitVoucher = async () => {
    if (selectedItems.length === 0) {
      toastError('No Items', 'Please select at least one product to write off.')
      return
    }

    setSubmitting(true)
    try {
      const now = new Date().toISOString()

      // Deduct stock for each item from db.products
      for (const it of selectedItems) {
        const prod = await db.products.get(it.product.id)
        if (prod) {
          const newStock = Math.max(0, (prod.stock || 0) - it.quantity)
          await db.products.update(it.product.id, {
            stock: newStock,
            updated_at: now
          })

          // Also record in restock_logs with negative quantity
          try {
            await db.restock_logs.add({
              product_id: it.product.id,
              product_name: it.product.name,
              change_type: 'DECREMENT',
              quantity: -it.quantity,
              previous_stock: prod.stock || 0,
              new_stock: newStock,
              reason: `Store Use: ${purpose}`,
              cashier_name: cashierName,
              timestamp: now
            } as any)
          } catch {}
        }
      }

      // Record store use voucher
      const newRec: StoreUseRecord = {
        id: `SU-${Date.now().toString(36).toUpperCase()}`,
        created_at: now,
        purpose,
        cashier_name: cashierName,
        items: selectedItems.map((it) => ({
          product_id: it.product.id,
          product_name: it.product.name,
          quantity: it.quantity,
          unit_name: it.product.base_unit || 'pc',
          cost_c: it.product.cost_c || 0,
          subtotal_c: (it.product.cost_c || 0) * it.quantity
        })),
        total_cost_c: totalCostC,
        notes: notes.trim() || undefined
      }

      saveStoreUseRecord(newRec)
      setRecords((prev) => [newRec, ...prev])

      toastSuccess(
        'Store Use Voucher Recorded',
        `Successfully deducted ${selectedItems.length} items (${money(totalCostC)} total cost) for ${purpose}.`
      )

      setSelectedItems([])
      setNotes('')
      setTab('HISTORY')
      onDone?.()
    } catch (err) {
      toastError('Voucher Failed', String((err as Error)?.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Store Use & Spoilage Write-Off"
      maxWidth="max-w-2xl"
      zIndex="z-[60]"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-stone-400 text-xs">
            {tab === 'CREATE' && selectedItems.length > 0 && (
              <span>
                Total Expense Cost: <strong className="text-rose-400 font-mono">{money(totalCostC)}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 font-semibold text-xs transition cursor-pointer"
            >
              Close
            </button>
            {tab === 'CREATE' && (
              <button
                type="button"
                onClick={handleSubmitVoucher}
                disabled={submitting || selectedItems.length === 0}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>Confirm & Write Off Stock</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 rounded-xl bg-ink-950 p-1 border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('CREATE')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'CREATE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Write-Off Voucher</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('HISTORY')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'HISTORY'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Voucher History ({records.length})</span>
          </button>
        </div>

        {tab === 'CREATE' ? (
          <div className="space-y-4">
            {/* Purpose Selection */}
            <div>
              <label className="block text-stone-400 font-medium mb-1.5">Write-Off Purpose / Reason</label>
              <div className="grid grid-cols-2 gap-1.5">
                {COMMON_PURPOSES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPurpose(p)}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      purpose === p
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                        : 'bg-ink-950 border-white/[0.06] text-stone-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Search */}
            <div className="space-y-1.5">
              <label className="block text-stone-400 font-medium">Add Product from Inventory</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  placeholder="Type product name or scan barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-ink-950 border border-white/[0.1] pl-10 pr-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              {filteredProducts.length > 0 && (
                <div className="p-1 rounded-xl bg-ink-950 border border-white/[0.08] divide-y divide-white/[0.06]">
                  {filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddItem(prod)}
                      className="w-full p-2 text-left hover:bg-white/[0.06] rounded-lg flex items-center justify-between text-stone-200 transition cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-white">{prod.name}</p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          Current Stock: {prod.stock} {prod.base_unit} · Cost: {money(prod.cost_c || 0)}
                        </p>
                      </div>
                      <span className="text-emerald-400 font-bold font-mono">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Items Table */}
            <div>
              <label className="block text-stone-400 font-medium mb-1.5">
                Items in this Voucher ({selectedItems.length})
              </label>
              {selectedItems.length === 0 ? (
                <div className="p-6 rounded-2xl bg-ink-950 border border-white/[0.08] text-center text-stone-500">
                  No items selected yet. Search products above to add.
                </div>
              ) : (
                <div className="rounded-2xl bg-ink-950 border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                  {selectedItems.map((it) => (
                    <div key={it.product.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate">{it.product.name}</p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          Unit Cost: {money(it.product.cost_c || 0)} · Current Stock: {it.product.stock}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(it.product.id, it.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-ink-800 text-stone-300 hover:text-white flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-white">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(it.product.id, it.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-ink-800 text-stone-300 hover:text-white flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-mono font-bold text-rose-400 w-16 text-right">
                          {money((it.product.cost_c || 0) * it.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(it.product.id, 0)}
                          className="p-1 rounded-lg text-stone-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-stone-400 font-medium mb-1">Notes / Specific Details</label>
              <input
                type="text"
                placeholder="e.g. Expired on Oct 20, broken bottle during delivery unloading"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl bg-ink-950 border border-white/[0.1] px-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        ) : (
          /* History View */
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {records.length === 0 ? (
              <div className="p-8 rounded-2xl bg-ink-950 border border-white/[0.08] text-center text-stone-500">
                No past write-off vouchers recorded yet.
              </div>
            ) : (
              records.map((rec) => (
                <div key={rec.id} className="p-3.5 rounded-2xl bg-ink-950 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-rose-400 text-xs">{rec.id}</span>
                      <span className="text-[11px] text-stone-500 ml-2">
                        {new Date(rec.created_at).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-white text-xs">{money(rec.total_cost_c)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-ink-900 border border-white/[0.04]">
                    <span className="text-amber-300 font-semibold block">{rec.purpose}</span>
                    {rec.notes && <p className="text-[11px] text-stone-400 mt-0.5">{rec.notes}</p>}
                  </div>
                  <div className="text-[11px] text-stone-400 space-y-0.5">
                    {(rec.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.quantity}x {it.product_name}</span>
                        <span className="font-mono text-stone-500">{money(it.subtotal_c)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
