import React, { useState, useEffect, useMemo } from 'react'
import {
  Truck,
  Plus,
  Phone,
  MapPin,
  FileText,
  User,
  Search,
  Pencil,
  Trash2,
  Copy,
  Check,
  X
} from 'lucide-react'
import type { Supplier } from '../types'
import { db } from '../db'

export function SuppliersScreen(): React.JSX.Element {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formName, setFormName] = useState('')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const rows = await db.suppliers.toArray()
      setSuppliers(rows)
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return suppliers
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
    )
  }, [suppliers, search])

  const handleOpenAdd = () => {
    setEditingSupplier(null)
    setFormName('')
    setFormContactPerson('')
    setFormPhone('')
    setFormAddress('')
    setFormNotes('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s)
    setFormName(s.name)
    setFormContactPerson(s.contact_person || '')
    setFormPhone(s.phone || '')
    setFormAddress(s.address || '')
    setFormNotes(s.notes || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    try {
      if (editingSupplier && editingSupplier.id) {
        await db.suppliers.update(editingSupplier.id, {
          name: formName.trim(),
          contact_person: formContactPerson.trim() || undefined,
          phone: formPhone.trim() || undefined,
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
          updated_at: new Date().toISOString()
        })
      } else {
        await db.suppliers.add({
          name: formName.trim(),
          contact_person: formContactPerson.trim() || undefined,
          phone: formPhone.trim() || undefined,
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
          status: 'ACTIVE',
          created_at: new Date().toISOString()
        })
      }

      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      console.error('Failed to save supplier:', err)
    }
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Sigurado ka nga papason kining maong supplier?')) return
    try {
      await db.suppliers.delete(id)
      await loadData()
    } catch (err) {
      console.error('Failed to delete supplier:', err)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPhone(text)
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Suppliers Directory
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-gold-muted border border-gold/30 px-2 py-0.5 rounded-full uppercase">
              {suppliers.length} Vendor Partners
            </span>
          </div>
          <p className="text-xs text-stone-400 font-mono mt-1">
            Manage product distributors, delivery contacts, purchase terms & wholesale suppliers
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-press px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] hover:from-amber-300 hover:to-gold text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-glow-gold transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Supplier</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by vendor name, contact person, or phone..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950 border border-white/15 text-stone-100 placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-stone-400">
          <div className="h-7 w-7 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
          <p className="text-xs font-mono">Loading suppliers directory...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="py-16 text-center space-y-2 glass-panel rounded-3xl border border-white/[0.08]">
          <Truck className="h-10 w-10 text-stone-600 mx-auto" />
          <p className="text-sm font-bold text-stone-300">Walay supplier nga nakit-an</p>
          <p className="text-xs text-stone-500 font-mono">
            I-click ang "+ New Supplier" aron mag-dugang ug distributor partner.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-3xl bg-zinc-950/80 border border-white/[0.08] hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-gold/10 border border-gold/30 flex items-center justify-center text-gold-light shrink-0">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-gold-light transition-colors line-clamp-1">
                        {s.name}
                      </h3>
                      <p className="text-[10px] font-mono text-stone-400">
                        {s.contact_person ? `Agent: ${s.contact_person}` : 'Vendor Partner'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="btn-press p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors"
                      title="Edit supplier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="btn-press p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
                  {s.phone && (
                    <div className="flex items-center justify-between text-stone-300 font-mono">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gold-muted shrink-0" />
                        <span>{s.phone}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(s.phone!)}
                        className="btn-press p-1 rounded hover:bg-white/10 text-stone-400 hover:text-gold transition-colors text-[10px] flex items-center gap-1"
                        title="Copy phone number"
                      >
                        {copiedPhone === s.phone ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedPhone === s.phone ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  {s.address && (
                    <div className="flex items-start gap-2 text-stone-400">
                      <MapPin className="h-3.5 w-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.address}</span>
                    </div>
                  )}

                  {s.notes && (
                    <div className="flex items-start gap-2 text-stone-500 text-[11px] bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <FileText className="h-3.5 w-3.5 text-stone-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 text-[10px] font-mono text-stone-600 border-t border-white/5 flex items-center justify-between">
                <span>Status: <strong className="text-emerald-400">Active Partner</strong></span>
                <span>ID: #{s.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0C0D11] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-gold-muted uppercase">Vendor Directory</p>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {editingSupplier ? 'Edit Supplier Details' : 'Register New Supplier'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-press h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Company / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. San Miguel Brewery, Puregold Wholesale, Local Bagsakan..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black border border-white/15 text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Contact Person / Agent
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kuya Mark, Sales Agent..."
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-black border border-white/15 text-stone-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0917-123-4567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-black border border-white/15 text-stone-100 text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Address / Warehouse Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. National Highway, Public Market, Plant Depot..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black border border-white/15 text-stone-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Products Supplied & Delivery Terms / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Delivers every Tuesday and Friday morning. Minimum order ₱5,000 for free delivery."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black border border-white/15 text-stone-100 text-xs focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-press flex-1 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-stone-300 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-press flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider shadow-glow-gold transition-all"
                >
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
