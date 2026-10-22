import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  X,
  ShoppingCart,
  Package,
  Search,
  AlertTriangle,
  CheckCircle2,
  Layers,
  RotateCcw,
  Check
} from 'lucide-react'
import { Modal } from './ui/Modal'
import { money } from '../utils/format'
import { toastSuccess, toastError } from '../stores/toast'
import {
  type PromoBundle,
  type PromoType,
  getStoredPromoBundles,
  savePromoBundles,
  resetPromoBundles
} from '../utils/promoBundles'
import type { Product } from '../types'

interface PromoBundlesModalProps {
  open: boolean
  onClose: () => void
  products: Product[]
}

export function PromoBundlesModal({
  open,
  onClose,
  products
}: PromoBundlesModalProps): React.JSX.Element | null {
  const [bundles, setBundles] = useState<PromoBundle[]>(() => getStoredPromoBundles())
  const [creating, setCreating] = useState(false)

  // Builder form
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<PromoType>('FIXED_COMBO')
  const [newPricePesos, setNewPricePesos] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newBadge, setNewBadge] = useState('Special Deal')

  // Fixed combo items
  const [itemKeyword1, setItemKeyword1] = useState('')
  const [itemKeyword2, setItemKeyword2] = useState('')

  // Volume tier
  const [targetKeyword, setTargetKeyword] = useState('')
  const [minQty, setMinQty] = useState('3')

  useEffect(() => {
    if (open) {
      setBundles(getStoredPromoBundles())
      setCreating(false)
    }
  }, [open])

  const handleToggleActive = (id: string) => {
    const updated = bundles.map((b) => (b.id === id ? { ...b, is_active: !b.is_active } : b))
    setBundles(updated)
    savePromoBundles(updated)
    toastSuccess('Promo Updated', 'Bundle active status toggled.')
  }

  const handleDelete = (id: string) => {
    const updated = bundles.filter((b) => b.id !== id)
    setBundles(updated)
    savePromoBundles(updated)
    toastSuccess('Promo Removed', 'Promo bundle removed.')
  }

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toastError('Validation Error', 'Please enter a name for the bundle.')
      return
    }

    const priceNum = parseFloat(newPricePesos)
    if (isNaN(priceNum) || priceNum <= 0) {
      toastError('Validation Error', 'Please enter a valid bundle price.')
      return
    }

    const price_c = Math.round(priceNum * 100)

    let newBundle: PromoBundle
    if (newType === 'FIXED_COMBO') {
      if (!itemKeyword1.trim() || !itemKeyword2.trim()) {
        toastError('Validation Error', 'Please enter at least 2 product keywords for the combo.')
        return
      }

      newBundle = {
        id: `bundle_${Date.now()}`,
        name: newName.trim(),
        type: 'FIXED_COMBO',
        bundle_price_c: price_c,
        is_active: true,
        description: newDescription.trim() || `Combo: ${itemKeyword1} + ${itemKeyword2}`,
        badge: newBadge.trim() || 'Promo',
        items: [
          { name_keyword: itemKeyword1.trim().toLowerCase(), quantity: 1 },
          { name_keyword: itemKeyword2.trim().toLowerCase(), quantity: 1 }
        ]
      }
    } else {
      newBundle = {
        id: `bundle_${Date.now()}`,
        name: newName.trim(),
        type: 'VOLUME_TIER',
        bundle_price_c: price_c,
        is_active: true,
        description: newDescription.trim() || `Buy ${minQty} for ${money(price_c)}`,
        badge: newBadge.trim() || 'Volume Deal',
        items: [],
        target_name_keyword: targetKeyword.trim().toLowerCase(),
        min_quantity: parseInt(minQty, 10) || 3
      }
    }

    const updated = [newBundle, ...bundles]
    setBundles(updated)
    savePromoBundles(updated)
    setCreating(false)
    setNewName('')
    setNewPricePesos('')
    setNewDescription('')
    setItemKeyword1('')
    setItemKeyword2('')
    setTargetKeyword('')
    toastSuccess('Bundle Created', `Created promo bundle "${newBundle.name}".`)
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset promo bundles to system default combos?')) {
      const defs = resetPromoBundles()
      setBundles(defs)
      toastSuccess('Reset', 'Promo bundles reset to system defaults.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Promo Bundles & Combo Deals Engine"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Factory Combos</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <p className="text-stone-400">
            Define promotional combos and volume discounts automatically applied to carts.
          </p>
          <button
            type="button"
            onClick={() => setCreating(!creating)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{creating ? 'Cancel' : 'Create Promo'}</span>
          </button>
        </div>

        {/* Builder Form */}
        {creating && (
          <form onSubmit={handleSaveNew} className="p-4 rounded-2xl bg-ink-950 border border-white/[0.08] space-y-3 animate-fade-in">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>New Promotional Bundle</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 mb-1">Bundle Name</label>
                <input
                  type="text"
                  placeholder="e.g. Merienda Deal (Coke + Bread)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1">Promotional Bundle Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newPricePesos}
                  onChange={(e) => setNewPricePesos(e.target.value)}
                  className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white font-mono placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 mb-1">Promo Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as PromoType)}
                  className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="FIXED_COMBO">Fixed Combo (Item A + Item B)</option>
                  <option value="VOLUME_TIER">Volume Tier (Buy N items for ₱X)</option>
                </select>
              </div>
              <div>
                <label className="block text-stone-400 mb-1">Badge Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Save ₱10, Popular"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {newType === 'FIXED_COMBO' ? (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-ink-900/60 border border-white/[0.04]">
                <div>
                  <label className="block text-stone-400 mb-1">Component 1 Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. canton, biscuit, egg"
                    value={itemKeyword1}
                    onChange={(e) => setItemKeyword1(e.target.value)}
                    className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Component 2 Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. coke, juice, coffee"
                    value={itemKeyword2}
                    onChange={(e) => setItemKeyword2(e.target.value)}
                    className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-ink-900/60 border border-white/[0.04]">
                <div>
                  <label className="block text-stone-400 mb-1">Target Product Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. noodles, sardinas"
                    value={targetKeyword}
                    onChange={(e) => setTargetKeyword(e.target.value)}
                    className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Minimum Quantity Required</label>
                  <input
                    type="number"
                    min="2"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-1.5 text-white font-mono placeholder-stone-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Promo Bundle</span>
              </button>
            </div>
          </form>
        )}

        {/* Existing Bundles List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {bundles.map((b) => (
            <div
              key={b.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                b.is_active
                  ? 'bg-ink-950 border-white/[0.08]'
                  : 'bg-ink-950/40 border-white/[0.04] opacity-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-white text-sm truncate">{b.name}</h4>
                  {b.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                      {b.badge}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-stone-500 uppercase">
                    {b.type === 'FIXED_COMBO' ? 'Combo' : 'Volume'}
                  </span>
                </div>
                <p className="text-stone-400 text-xs">{b.description}</p>
                {b.type === 'FIXED_COMBO' && b.items.length > 0 && (
                  <p className="text-[11px] text-emerald-400 font-mono mt-1">
                    Items: {b.items.map((it) => `${it.quantity}x "${it.name_keyword}"`).join(' + ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono font-bold text-emerald-400 text-base">
                  {money(b.bundle_price_c)}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(b.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    b.is_active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/[0.06] text-stone-400'
                  }`}
                >
                  {b.is_active ? 'Active' : 'Paused'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
