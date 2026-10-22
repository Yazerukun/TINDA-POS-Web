import React, { useState, useEffect } from 'react'
import { Zap, SlidersHorizontal, Sparkles } from 'lucide-react'
import type { Product } from '../types'
import { money } from '../utils/format'
import {
  type SpeedKeyItem,
  getStoredSpeedKeys,
  SPEED_KEY_COLORS,
  SPEED_KEYS_CHANGED_EVENT,
  saveSpeedKeys
} from '../utils/speedKeys'
import { CustomizeFastButtonsModal } from './CustomizeFastButtonsModal'
import { playScanSuccess } from '../lib/sound'
import { toastSuccess, toastError } from '../stores/toast'
import { db } from '../db'

interface FastButtonsBarProps {
  products: Product[]
  onAddToCart: (p: Product, qty?: number) => void
  onProductsChanged?: () => Promise<void> | void
}

export function FastButtonsBar({
  products,
  onAddToCart,
  onProductsChanged
}: FastButtonsBarProps): React.JSX.Element {
  const [keys, setKeys] = useState<SpeedKeyItem[]>(() => getStoredSpeedKeys())
  const [modalOpen, setModalOpen] = useState(false)
  const [provisioning, setProvisioning] = useState<string | null>(null)

  useEffect(() => {
    const handleUpdate = () => {
      setKeys(getStoredSpeedKeys())
    }
    window.addEventListener(SPEED_KEYS_CHANGED_EVENT, handleUpdate)
    return () => window.removeEventListener(SPEED_KEYS_CHANGED_EVENT, handleUpdate)
  }, [])

  const handleKeyClick = async (key: SpeedKeyItem) => {
    try {
      playScanSuccess()
    } catch {}

    // 1. Try finding in current memory products
    let matched = key.productId ? products.find((p) => p.id === key.productId) : null

    // 2. Try finding in Dexie db by ID if not in memory
    if (!matched && key.productId) {
      try {
        const found = await db.products.get(key.productId)
        if (found && found.status === 'ACTIVE') matched = found
      } catch {}
    }

    // 3. Match by name case-insensitively
    if (!matched) {
      const clean = key.name.trim().toLowerCase()
      matched = products.find((p) => p.name.trim().toLowerCase() === clean)
    }

    if (!matched) {
      try {
        const clean = key.name.trim().toLowerCase()
        const found = await db.products.where('name').equalsIgnoreCase(clean).first()
        if (found && found.status === 'ACTIVE') matched = found
      } catch {}
    }

    if (matched) {
      onAddToCart(matched, key.default_qty || 1)
      toastSuccess('Added to cart', `${key.name} (${key.default_qty || 1}x) added.`)
      return
    }

    // 4. Auto-provision into db.products if not existing
    try {
      setProvisioning(key.id)
      const now = new Date().toISOString()
      const unit = key.unit_name?.trim() || 'pc'
      const newProductId = await db.products.add({
        name: key.name.trim(),
        sku: `FAST-${Date.now().toString(36).toUpperCase()}`,
        barcode: null,
        category_id: null,
        subcategory_id: null,
        base_unit: unit,
        cost_c: Math.round(key.price_c * 0.7),
        default_price_c: key.price_c,
        stock: 999,
        low_stock_threshold: 5,
        status: 'ACTIVE',
        image_path: key.image_path || null,
        created_at: now,
        updated_at: now
      } as unknown as Product)

      const created = await db.products.get(newProductId)
      if (created) {
        // Link key permanently
        const updated = keys.map((k) => (k.id === key.id ? { ...k, productId: newProductId } : k))
        saveSpeedKeys(updated)
        setKeys(updated)

        if (onProductsChanged) {
          await onProductsChanged()
        }

        onAddToCart(created, key.default_qty || 1)
        toastSuccess('Added to cart', `Provisioned "${key.name}" and added to cart.`)
      }
    } catch (err) {
      toastError('Could not add fast item', String((err as Error)?.message || err))
    } finally {
      setProvisioning(null)
    }
  }

  return (
    <>
      <div className="mb-2.5 flex items-center gap-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-950/80 p-2 shadow-inner">
        {/* Title Badge */}
        <div className="flex shrink-0 items-center gap-1.5 px-2 py-1 text-stone-400 select-none">
          <Zap className="h-4 w-4 text-amber-400 fill-amber-400/20" />
          <span className="hidden lg:inline text-[11px] font-extrabold uppercase tracking-wider text-stone-300">
            Speed Keys
          </span>
        </div>

        {/* Horizontal Speed Keys Carousel */}
        <div className="flex flex-1 items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
          {keys.map((k) => {
            const colorMeta = SPEED_KEY_COLORS[k.color || 'cyan']
            const isBusy = provisioning === k.id

            return (
              <button
                key={k.id}
                type="button"
                disabled={isBusy}
                onClick={() => void handleKeyClick(k)}
                className={`group relative flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 transition-all text-left select-none cursor-pointer ${
                  colorMeta.card
                } ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}
                title={`Fast Add: ${k.name} (${money(k.price_c)})`}
              >
                {/* Visual Icon */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-900/90 text-sm shadow-inner border border-white/[0.06]">
                  {k.icon || '⚡'}
                </span>

                {/* Details */}
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1">
                    <p className="max-w-[110px] truncate text-xs font-bold text-white group-hover:text-emerald-300 transition">
                      {k.name}
                    </p>
                    {k.default_qty && k.default_qty > 1 && (
                      <span className="text-[10px] font-extrabold text-amber-300 bg-amber-400/15 px-1 rounded">
                        {k.default_qty}x
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] font-extrabold font-mono ${colorMeta.text}`}>
                    {money(k.price_c)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Customize Button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-ink-900 px-3 py-2 text-xs font-bold text-stone-300 hover:border-emerald-500 hover:text-white transition-all active:scale-95 shadow-sm cursor-pointer"
          title="Customize Fast Buttons (Speed Keys)"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden xl:inline">Customize</span>
        </button>
      </div>

      <CustomizeFastButtonsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentKeys={keys}
        allProducts={products}
        onSave={(updated) => setKeys(updated)}
      />
    </>
  )
}
