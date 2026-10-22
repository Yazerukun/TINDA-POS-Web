import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  ShieldAlert,
  Zap,
  Droplets,
  CreditCard,
  Globe,
  Tag,
  Building2
} from 'lucide-react'
import {
  type BillerPreset,
  type BillerCategory,
  loadBillerPresets,
  saveBillerPresets,
  resetBillerPresets
} from '../utils/billerCustomization'
import { Modal } from './ui/Modal'
import { toastSuccess, toastError } from '../stores/toast'

interface ManageBillersModalProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

const CATEGORY_ICONS: Record<BillerCategory, string> = {
  UTILITIES: '⚡',
  WATER: '💧',
  LOANS: '💳',
  INTERNET: '🌐',
  GOVERNMENT: '🏛️',
  TELCO: '📶',
  OTHER: '🏷️'
}

export function ManageBillersModal({ open, onClose, onSaved }: ManageBillersModalProps): React.JSX.Element | null {
  const [billers, setBillers] = useState<BillerPreset[]>(() => loadBillerPresets())
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL')

  // New biller form state
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<BillerCategory>('UTILITIES')
  const [newFee, setNewFee] = useState('15')

  const handleUpdateBiller = (id: string, updates: Partial<BillerPreset>) => {
    setBillers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    )
  }

  const handleDeleteBiller = (id: string) => {
    const target = billers.find((b) => b.id === id)
    if (target?.isEload) {
      toastError('Protected Network', 'Standard E-Load telco networks cannot be removed.')
      return
    }
    setBillers((prev) => prev.filter((b) => b.id !== id))
    toastSuccess('Biller Removed', `Removed biller from list.`)
  }

  const handleAddBiller = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toastError('Validation Error', 'Please enter a biller or cooperative name.')
      return
    }

    const feeNum = parseFloat(newFee)
    if (isNaN(feeNum) || feeNum < 0) {
      toastError('Validation Error', 'Please enter a valid default convenience fee.')
      return
    }

    const id = `biller-${Date.now()}`
    const newBiller: BillerPreset = {
      id,
      name: newName.trim(),
      category: newCategory,
      defaultFee: feeNum,
      icon: CATEGORY_ICONS[newCategory] || '⚡',
      isEload: false
    }

    setBillers((prev) => [newBiller, ...prev])
    setNewName('')
    setNewFee('15')
    toastSuccess('Biller Added', `Added ${newBiller.name} to presets.`)
  }

  const handleSaveAndClose = () => {
    saveBillerPresets(billers)
    toastSuccess('Settings Saved', 'Biller presets updated successfully.')
    onSaved?.()
    onClose()
  }

  const handleReset = () => {
    if (window.confirm('Reset all biller presets to system default?')) {
      const defs = resetBillerPresets()
      setBillers(defs)
      toastSuccess('Reset Completed', 'Biller presets reset to factory default.')
      onSaved?.()
    }
  }

  const filteredBillers = billers.filter((b) => {
    if (activeCategoryFilter === 'ALL') return true
    return b.category === activeCategoryFilter
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage & Customize Billers / Coops"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Factory Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Add New Biller Form */}
        <form onSubmit={handleAddBiller} className="p-3.5 rounded-2xl bg-ink-950 border border-white/[0.08] space-y-3">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Local Biller / Cooperative / Water District</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-stone-400 mb-1">Biller / Company Name</label>
              <input
                type="text"
                placeholder="e.g. Bohol Electric Coop, Local Water District"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1">Default Fee (₱)</label>
              <input
                type="number"
                step="1"
                placeholder="15"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                className="w-full rounded-xl bg-ink-900 border border-white/[0.1] px-3 py-2 text-white font-mono placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <label className="text-stone-400">Category:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as BillerCategory)}
                className="rounded-lg bg-ink-900 border border-white/[0.1] px-2.5 py-1 text-white text-xs focus:outline-none"
              >
                <option value="UTILITIES">⚡ Utilities / Electricity</option>
                <option value="WATER">💧 Water District</option>
                <option value="LOANS">💳 Loans / Finance</option>
                <option value="INTERNET">🌐 Internet / Cable</option>
                <option value="GOVERNMENT">🏛️ Government</option>
                <option value="OTHER">🏷️ Other Services</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Biller</span>
            </button>
          </div>
        </form>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
          {['ALL', 'UTILITIES', 'WATER', 'LOANS', 'INTERNET', 'TELCO', 'GOVERNMENT', 'OTHER'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                activeCategoryFilter === cat
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-ink-950 text-stone-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Existing Billers List */}
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {filteredBillers.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-ink-950/70 border border-white/[0.06] hover:border-white/[0.12] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{b.icon || '⚡'}</span>
                <div className="min-w-0">
                  <p className="font-bold text-white truncate max-w-[240px]">{b.name}</p>
                  <span className="text-[10px] text-stone-500 font-mono uppercase">{b.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-stone-500 text-[11px]">Fee: ₱</span>
                  <input
                    type="number"
                    value={b.defaultFee}
                    onChange={(e) => handleUpdateBiller(b.id, { defaultFee: parseFloat(e.target.value) || 0 })}
                    className="w-14 rounded-lg bg-ink-900 border border-white/[0.1] px-2 py-1 text-white font-mono text-center text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {!b.isEload && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBiller(b.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete Biller"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
