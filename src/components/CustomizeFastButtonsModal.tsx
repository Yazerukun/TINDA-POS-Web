import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Check,
  Package,
  SlidersHorizontal,
  Search,
  Pencil
} from 'lucide-react'
import type { Product } from '../types'
import { money } from '../utils/format'
import { Modal } from './ui/Modal'
import {
  type SpeedKeyItem,
  SPEED_KEY_COLORS,
  DEFAULT_SPEED_KEYS,
  saveSpeedKeys,
  resetSpeedKeysToDefault
} from '../utils/speedKeys'
import { toastSuccess, toastError } from '../stores/toast'

interface CustomizeFastButtonsModalProps {
  open: boolean
  onClose: () => void
  currentKeys: SpeedKeyItem[]
  allProducts: Product[]
  onSave: (keys: SpeedKeyItem[]) => void
}

const EMOJI_OPTIONS = ['🧊', '🚬', '🍬', '🛍️', '🥤', '☕', '🥚', '🍞', '🥪', '⚡', '⭐', '🏷️', '🔥', '🍜', '🍪', '🍫', '💧']

export function CustomizeFastButtonsModal({
  open,
  onClose,
  currentKeys,
  allProducts,
  onSave
}: CustomizeFastButtonsModalProps): React.JSX.Element | null {
  const [keys, setKeys] = useState<SpeedKeyItem[]>(currentKeys)
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [pricePesos, setPricePesos] = useState('')
  const [unitName, setUnitName] = useState('pc')
  const [defaultQty, setDefaultQty] = useState('1')
  const [icon, setIcon] = useState('⚡')
  const [color, setColor] = useState<keyof typeof SPEED_KEY_COLORS>('cyan')
  const [linkedProductId, setLinkedProductId] = useState<number | null>(null)

  // Search product to link
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  useEffect(() => {
    if (open) {
      setKeys(currentKeys)
      resetForm()
    }
  }, [open, currentKeys])

  const resetForm = () => {
    setEditingKeyId(null)
    setName('')
    setPricePesos('')
    setUnitName('pc')
    setDefaultQty('1')
    setIcon('⚡')
    setColor('cyan')
    setLinkedProductId(null)
    setProductSearch('')
    setShowProductPicker(false)
  }

  const handleEditClick = (k: SpeedKeyItem) => {
    setEditingKeyId(k.id)
    setName(k.name)
    setPricePesos((k.price_c / 100).toFixed(2))
    setUnitName(k.unit_name || 'pc')
    setDefaultQty(String(k.default_qty || 1))
    setIcon(k.icon || '⚡')
    setColor(k.color || 'cyan')
    setLinkedProductId(k.productId || null)
  }

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toastError('Validation Error', 'Please enter a name for the fast button.')
      return
    }

    const priceNum = parseFloat(pricePesos)
    if (isNaN(priceNum) || priceNum < 0) {
      toastError('Validation Error', 'Please enter a valid price.')
      return
    }

    const price_c = Math.round(priceNum * 100)
    const qtyNum = parseInt(defaultQty, 10) || 1

    if (editingKeyId) {
      // Update existing
      const updated = keys.map((k) =>
        k.id === editingKeyId
          ? {
              ...k,
              name: name.trim(),
              price_c,
              unit_name: unitName.trim() || 'pc',
              default_qty: qtyNum,
              icon,
              color,
              productId: linkedProductId
            }
          : k
      )
      setKeys(updated)
      saveSpeedKeys(updated)
      onSave(updated)
      toastSuccess('Updated', `Fast button "${name}" updated.`)
    } else {
      // Add new
      const newItem: SpeedKeyItem = {
        id: `speedkey-${Date.now()}`,
        name: name.trim(),
        price_c,
        unit_name: unitName.trim() || 'pc',
        default_qty: qtyNum,
        icon,
        color,
        productId: linkedProductId
      }
      const updated = [...keys, newItem]
      setKeys(updated)
      saveSpeedKeys(updated)
      onSave(updated)
      toastSuccess('Added', `New fast button "${name}" created.`)
    }

    resetForm()
  }

  const handleDeleteItem = (id: string) => {
    const updated = keys.filter((k) => k.id !== id)
    setKeys(updated)
    saveSpeedKeys(updated)
    onSave(updated)
    if (editingKeyId === id) resetForm()
    toastSuccess('Removed', 'Fast button removed.')
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset all fast buttons to factory defaults?')) {
      const defs = resetSpeedKeysToDefault()
      setKeys(defs)
      onSave(defs)
      resetForm()
      toastSuccess('Reset', 'Fast buttons reset to factory defaults.')
    }
  }

  const filteredProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(productSearch))
  ).slice(0, 6)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customize Fast Buttons (Speed Keys)"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Active Keys Grid */}
        <div>
          <label className="font-bold text-stone-300 uppercase tracking-wider text-[11px] block mb-2">
            Active Fast Buttons ({keys.length})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {keys.map((k) => {
              const colorMeta = SPEED_KEY_COLORS[k.color || 'cyan']
              const isSelected = editingKeyId === k.id
              return (
                <div
                  key={k.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${colorMeta.card} ${
                    isSelected ? 'ring-2 ring-emerald-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <span className="text-base shrink-0">{k.icon || '⚡'}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate max-w-[100px]">{k.name}</p>
                      <p className={`font-mono font-bold text-[11px] ${colorMeta.text}`}>
                        {money(k.price_c)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditClick(k)}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition"
                      title="Edit button"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(k.id)}
                      className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition"
                      title="Delete button"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Builder / Edit Form */}
        <form onSubmit={handleSaveItem} className="p-4 rounded-2xl bg-ink-950 border border-white/[0.08] space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{editingKeyId ? 'Edit Fast Button' : 'Add New Fast Button'}</span>
            </h4>
            {editingKeyId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] text-amber-400 hover:underline"
              >
                + Add New Instead
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 font-medium mb-1">Item Label / Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Yelo, Egg, Candy"
                className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white placeholder-stone-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-400 font-medium mb-1">Price (₱)</label>
              <input
                type="number"
                step="0.01"
                value={pricePesos}
                onChange={(e) => setPricePesos(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white font-mono placeholder-stone-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-400 font-medium mb-1">Unit</label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="pc / bag"
                className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-400 font-medium mb-1">Default Qty</label>
              <input
                type="number"
                min="1"
                value={defaultQty}
                onChange={(e) => setDefaultQty(e.target.value)}
                className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-400 font-medium mb-1">Color Theme</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as any)}
                className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {Object.keys(SPEED_KEY_COLORS).map((c) => (
                  <option key={c} value={c}>
                    {SPEED_KEY_COLORS[c as keyof typeof SPEED_KEY_COLORS].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-stone-400 font-medium mb-1">Icon / Emoji</label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-ink-900 border border-white/[0.08]">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition ${
                    icon === em ? 'bg-emerald-500/30 border border-emerald-500/50 scale-110' : 'hover:bg-white/10'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Optional: Link to Existing Inventory Product */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-stone-400 font-medium">Link to Inventory Product (Optional)</label>
              <button
                type="button"
                onClick={() => setShowProductPicker(!showProductPicker)}
                className="text-emerald-400 hover:underline text-[11px]"
              >
                {showProductPicker ? 'Hide Search' : linkedProductId ? 'Change Link' : 'Select Product'}
              </button>
            </div>
            {linkedProductId && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                <span>
                  Linked Product ID #{linkedProductId}: {allProducts.find((p) => p.id === linkedProductId)?.name || 'Custom'}
                </span>
                <button
                  type="button"
                  onClick={() => setLinkedProductId(null)}
                  className="text-stone-400 hover:text-white text-[11px] underline"
                >
                  Unlink
                </button>
              </div>
            )}
            {showProductPicker && (
              <div className="space-y-1.5 mt-2">
                <input
                  type="text"
                  placeholder="Search existing catalog..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none"
                />
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setLinkedProductId(p.id)
                        setName(p.name)
                        setPricePesos((p.default_price_c / 100).toFixed(2))
                        setUnitName(p.base_unit || 'pc')
                        setShowProductPicker(false)
                      }}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-white/[0.08] flex items-center justify-between text-stone-200"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono text-emerald-400 font-bold shrink-0 ml-2">{money(p.default_price_c)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingKeyId ? 'Save Changes' : 'Add Fast Button'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
