import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  PlayCircle,
  Percent,
  Check,
  ShoppingBag,
  Package,
  Layers,
  Sparkles,
  UserCheck,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react'
import type { Product, Category, CartItem, DiscountType, HeldCart, Customer } from '../types'
import { money } from '../utils/format'
import { BarcodeScannerModal } from './BarcodeScannerModal'

interface POSScreenProps {
  products: Product[]
  categories: Category[]
  customers: Customer[]
  cart: CartItem[]
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
  heldCarts: HeldCart[]
  onHoldCart: () => void
  onResumeCart: (held: HeldCart) => void
  onCheckout: (
    subtotal_c: number,
    discount_c: number,
    discount_type: DiscountType,
    total_c: number,
    customerId?: number | null,
    quickTender_c?: number
  ) => void
}

export function POSScreen({
  products,
  categories,
  customers,
  cart,
  setCart,
  heldCarts,
  onHoldCart,
  onResumeCart,
  onCheckout
}: POSScreenProps): React.JSX.Element {
  const [selectedMainCatId, setSelectedMainCatId] = useState<number | 'ALL'>('ALL')
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('NONE')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [activeInvoiceId, setActiveInvoiceId] = useState<string>('')
  const [scanOpen, setScanOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Generate luxury invoice sequence on mount or when cart empties
  useEffect(() => {
    if (cart.length === 0) {
      const seq = Math.floor(10000 + Math.random() * 90000)
      setActiveInvoiceId(`#INV-${seq}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length])

  // Global [ ⌘K ] or [ Ctrl+K ] search shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Filter products by search query, main category, and subcategory
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status !== 'ACTIVE') return false
      if (selectedMainCatId !== 'ALL') {
        if (p.category_id !== selectedMainCatId) return false
        if (selectedSubCatId !== 'ALL' && p.subcategory_id !== selectedSubCatId) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = p.name.toLowerCase().includes(q)
        const matchSku = p.sku?.toLowerCase().includes(q)
        const matchBarcode = p.barcode?.includes(q)
        return matchName || matchSku || matchBarcode
      }
      return true
    })
  }, [products, selectedMainCatId, selectedSubCatId, searchQuery])

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.product.id === product.id)
      if (existingIdx >= 0) {
        const updated = [...prev]
        const item = updated[existingIdx]
        const newQty = item.quantity + 1
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          total_c: newQty * item.unit_price_c
        }
        return updated
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price_c: product.default_price_c,
          total_c: product.default_price_c
        }
      ]
    })
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.product.id !== productId) return i
          const newQty = i.quantity + delta
          if (newQty <= 0) return null
          return {
            ...i,
            quantity: newQty,
            total_c: newQty * i.unit_price_c
          }
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  // Calculate totals
  const subtotal_c = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total_c, 0)
  }, [cart])

  const discount_c = useMemo(() => {
    if (discountType === 'SENIOR_PWD_20') {
      return Math.round(subtotal_c * 0.20)
    }
    return 0
  }, [subtotal_c, discountType])

  const grandTotal_c = Math.max(0, subtotal_c - discount_c)

  // Quick Barcode enter key trigger
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const exactMatch = products.find(
        (p) =>
          p.barcode === searchQuery.trim() ||
          p.sku?.toLowerCase() === searchQuery.trim().toLowerCase()
      )
      if (exactMatch) {
        addToCart(exactMatch)
        setSearchQuery('')
      }
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  // Camera barcode scan handler: auto-add matching product to ticket
  const handleScanDetect = (code: string) => {
    const match = products.find(
      (p) => p.barcode === code || p.sku?.toLowerCase() === code.toLowerCase()
    )
    setScanOpen(false)
    if (match) {
      addToCart(match)
    } else {
      setSearchQuery(code)
      searchInputRef.current?.focus()
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Catalog Area (7 cols on lg, 8 cols on xl) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-5">
        {/* Minimalist Search Bar with Brushed Bronze Shortcut Hint [ ⌘K ] */}
        <div className="relative glass-card rounded-2xl p-2.5 border border-white/[0.05] hover:border-gold/30 transition-all duration-300 flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-gold-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search private reserve catalog, SKU, or scan barcode..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.05] text-xs font-sans text-stone-100 placeholder-stone-500 focus:outline-none focus:border-gold/50 transition-colors"
            />
            {/* Shortcut Bronze Chip */}
            <div className="absolute right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950/70 border border-gold/20 text-[10px] font-mono text-gold-light pointer-events-none">
              <span>⌘K</span>
            </div>
          </div>

          <button
            onClick={() => setScanOpen(true)}
            aria-label="Scan barcode with camera"
            className="btn-press flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950/40 border border-gold/25 hover:border-gold/60 hover:bg-gold/[0.08] text-[10px] font-mono text-gold-light transition-all shadow-glow-gold"
          >
            <ScanLine className="h-3.5 w-3.5 text-gold-muted" />
            <span className="tracking-wider uppercase">Scan</span>
          </button>
        </div>

        {/* Camera Barcode Scanner Overlay */}
        <BarcodeScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onDetect={handleScanDetect} />

        {/* Category Navigation: Understated Horizontal Tab Line with Sliding Gold Indicator */}
        <div className="relative border-b border-white/[0.06] overflow-x-auto scrollbar-none flex items-center gap-6 px-1">
          <button
            onClick={() => { setSelectedMainCatId('ALL'); setSelectedSubCatId('ALL') }}
            className={`group relative py-3 text-xs tracking-[0.15em] uppercase font-sans font-medium transition-colors duration-300 whitespace-nowrap ${
              selectedMainCatId === 'ALL' ? 'text-gold-light font-bold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            All Reserve ({products.filter((p) => p.status === 'ACTIVE').length})
            {selectedMainCatId === 'ALL' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-300 via-gold to-amber-500 shadow-glow-gold rounded-full" />
            )}
          </button>

          {categories.filter((c) => c.parent_id === null).map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id && p.status === 'ACTIVE').length
            const isSelected = selectedMainCatId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedMainCatId(cat.id); setSelectedSubCatId('ALL') }}
                className={`group relative py-3 text-xs tracking-[0.15em] uppercase font-sans font-medium transition-colors duration-300 whitespace-nowrap ${
                  isSelected ? 'text-gold-light font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {cat.name} ({count})
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-300 via-gold to-amber-500 shadow-glow-gold rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Subcategory row (level 2) */}
        {selectedMainCatId !== 'ALL' &&
          categories.filter((c) => c.parent_id === selectedMainCatId).length > 0 && (
          <div className="relative overflow-x-auto scrollbar-none flex items-center gap-6 px-1">
            <button
              onClick={() => setSelectedSubCatId('ALL')}
              className={`group relative py-2 text-[11px] tracking-[0.15em] uppercase font-sans font-medium transition-colors duration-300 whitespace-nowrap ${
                selectedSubCatId === 'ALL' ? 'text-gold-light font-bold' : 'text-stone-500 hover:text-stone-200'
              }`}
            >
              All {categories.find((c) => c.id === selectedMainCatId)?.name ?? ''}
              {selectedSubCatId === 'ALL' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold/60 rounded-full" />
              )}
            </button>
            {categories.filter((c) => c.parent_id === selectedMainCatId).map((sub) => {
              const count = products.filter((p) => p.subcategory_id === sub.id && p.status === 'ACTIVE').length
              const isSelected = selectedSubCatId === sub.id
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubCatId(sub.id)}
                  className={`group relative py-2 text-[11px] tracking-[0.15em] uppercase font-sans font-medium transition-colors duration-300 whitespace-nowrap ${
                    isSelected ? 'text-gold-light font-bold' : 'text-stone-500 hover:text-stone-200'
                  }`}
                >
                  {sub.name} ({count})
                  {isSelected && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-300 via-gold to-amber-500 shadow-glow-gold rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Product Cards: Framed with Razor-Thin 1px Border, Catalog-Grade Image Containers */}
        {filteredProducts.length === 0 ? (
          <div className="glass-card rounded-3xl p-14 text-center flex flex-col items-center justify-center border border-white/[0.04]">
            <Package className="h-10 w-10 text-stone-600 mb-3" />
            <p className="font-serif text-base font-bold tracking-widest text-stone-300 uppercase">
              No Inventory Found
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm font-sans">
              Walay nakit-an nga produkto sa imong search o filter. Sulayi pag-usab o i-clear ang keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const isLowStock = p.stock <= 5 && p.stock > 0
              const isOutOfStock = p.stock <= 0
              return (
                <button
                  key={p.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`btn-press group relative flex flex-col text-left rounded-2xl glass-card p-3.5 border transition-all duration-300 overflow-hidden ${
                    isOutOfStock
                      ? 'opacity-35 cursor-not-allowed border-rose-950/40 bg-zinc-950/30'
                      : 'border-white/[0.05] hover:border-gold/35 hover:-translate-y-1 hover:shadow-glow-gold active:scale-98'
                  }`}
                >
                  {/* Ultra-Crisp Catalog-Grade Image Container with Soft Inner Shadow */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-obsidian-950 border border-white/[0.04] mb-3 flex items-center justify-center shadow-inner">
                    {p.image_path ? (
                      <img
                        src={p.image_path}
                        alt={p.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <Package className="h-9 w-9 text-stone-600 group-hover:text-gold-light transition-colors" />
                    )}

                    {/* Stock Status Badge */}
                    <span
                      className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider uppercase font-semibold ${
                        isOutOfStock
                          ? 'bg-burgundy/90 text-stone-200 border border-burgundy'
                          : isLowStock
                          ? 'bg-amber-500/20 text-gold-light border border-gold/40'
                          : 'bg-zinc-950/80 text-stone-400 border border-white/[0.08] backdrop-blur-md'
                      }`}
                    >
                      {isOutOfStock ? 'Depleted' : `Reserve: ${p.stock}`}
                    </span>
                  </div>

                  {/* Product Details & Editorial Typography */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-100 line-clamp-2 leading-snug group-hover:text-gold-light transition-colors">
                        {p.name}
                      </h4>
                      {p.sku && (
                        <p className="text-[10px] font-mono tracking-wider text-stone-400 mt-1 uppercase">
                          {p.sku}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="font-serif text-sm font-bold tracking-tight text-gold-light">
                        {money(p.default_price_c)}
                      </span>

                      <div className="h-6 w-6 rounded-lg bg-zinc-900/80 border border-white/[0.08] text-stone-400 flex items-center justify-center group-hover:bg-gold group-hover:text-obsidian-950 group-hover:border-gold transition-all duration-300">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right Client Bill & Ledger Panel (5 cols on lg, 4 cols on xl) */}
      <div className="lg:col-span-5 xl:col-span-4 sticky top-20 glass-panel rounded-3xl border border-white/[0.08] p-5 shadow-vault flex flex-col transition-all duration-300">
        {/* Ticket Header with Dynamic Invoice ID & Client Assignment */}
        <div className="border-b border-white/[0.06] pb-3.5 mb-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-gold-light" />
              <h3 className="font-serif font-bold text-sm tracking-wider uppercase text-stone-100">
                Current Transaction
              </h3>
            </div>
            <span className="font-mono text-[11px] text-gold-muted font-semibold tracking-wider">
              {activeInvoiceId}
            </span>
          </div>

          {/* Quick Client Assignment */}
          <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-full bg-gold/15 flex items-center justify-center text-gold-light shrink-0">
                <UserCheck className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-mono tracking-wider uppercase text-stone-400 block leading-tight">
                  CLIENT ACCOUNT
                </span>
                <span className="text-xs font-semibold text-stone-200 truncate block leading-tight">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in Private Client'}
                </span>
              </div>
            </div>

            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
              className="bg-zinc-900 border border-white/[0.08] text-[10px] font-mono text-stone-300 rounded-lg px-2 py-1 focus:outline-none focus:border-gold cursor-pointer"
            >
              <option value="">Walk-in Client</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance_c > 0 ? `(Bal: ₱${(c.balance_c / 100).toFixed(2)})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Held Carts Bar if any */}
        {heldCarts.length > 0 && (
          <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/[0.08] border border-gold/30 flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-gold-light flex items-center gap-1.5">
              <PauseCircle className="h-4 w-4 text-gold" />
              <span>{heldCarts.length} Held Ticket{heldCarts.length > 1 ? 's' : ''}</span>
            </span>
            <button
              onClick={() => onResumeCart(heldCarts[0])}
              className="btn-press flex items-center gap-1 px-3 py-1 rounded-lg bg-gold text-obsidian-950 text-xs font-bold font-mono uppercase tracking-wider"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span>Resume</span>
            </button>
          </div>
        )}

        {/* Itemized List with Micro-Stepper Controls */}
        <div className="flex-1 max-h-[340px] overflow-y-auto space-y-2 pr-1">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center justify-center">
              <Layers className="h-8 w-8 text-stone-600 mb-2 stroke-[1.5]" />
              <p className="font-serif text-xs font-bold uppercase tracking-widest text-stone-400">
                Ticket Ledger Empty
              </p>
              <p className="text-[11px] text-stone-400 mt-1 font-sans">
                Select items from catalog to append to ticket
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-950/60 border border-white/[0.04] hover:border-gold/20 transition-all duration-200"
              >
                {/* Mini thumbnail */}
                <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-obsidian-950 border border-white/[0.06] flex items-center justify-center">
                  {item.product.image_path ? (
                    <img
                      src={item.product.image_path}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-4 w-4 text-stone-600" />
                  )}
                </div>

                {/* Name & price */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-200 truncate leading-tight">
                    {item.product.name}
                  </p>
                  <p className="text-[11px] font-mono text-gold-muted mt-0.5">
                    {money(item.unit_price_c)}
                  </p>
                </div>

                {/* Micro-Quantity Stepper */}
                <div className="flex items-center gap-1 rounded-xl bg-zinc-900 border border-white/[0.06] p-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="btn-press h-5 w-5 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-white/[0.06]"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-mono font-bold text-stone-200">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="btn-press h-5 w-5 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-white/[0.06]"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Line Total & Remove */}
                <div className="text-right pl-1">
                  <p className="text-xs font-mono font-bold text-stone-100">
                    {money(item.total_c)}
                  </p>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-stone-600 hover:text-red-400 mt-0.5 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Settlement Centerpiece */}
        {cart.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3.5 mt-3.5 space-y-3.5">
            {/* Senior / PWD 20% Privilege Discount */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
              <span className="text-xs font-medium text-stone-300 flex items-center gap-1.5 font-sans">
                <Percent className="h-3.5 w-3.5 text-gold-muted" />
                <span>Statutory 20% Privilege (PWD/Senior)</span>
              </span>
              <button
                type="button"
                onClick={() => setDiscountType(discountType === 'SENIOR_PWD_20' ? 'NONE' : 'SENIOR_PWD_20')}
                className={`btn-press relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none ${
                  discountType === 'SENIOR_PWD_20' ? 'bg-gold' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-obsidian-950 shadow-md transition duration-300 ${
                    discountType === 'SENIOR_PWD_20' ? 'translate-x-4 bg-white' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Editorial Grand Total Centerpiece with Subtle Gold Underglow */}
            <div className="relative py-4 px-3 rounded-2xl bg-zinc-950/70 border border-gold/30 shadow-inner text-center">
              <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-stone-400 mb-1">
                TICKET GRAND TOTAL
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-bold tracking-widest text-gold-light drop-shadow-[0_2px_15px_rgba(212,175,55,0.25)]">
                {money(grandTotal_c)}
              </div>
              {discount_c > 0 && (
                <div className="text-[10px] font-mono text-gold-muted mt-1 tracking-wider">
                  Includes -{money(discount_c)} Statutory Discount
                </div>
              )}
            </div>

            {/* Quick Tender Gold Chips */}
            <div>
              <span className="block text-[10px] font-mono tracking-widest uppercase text-stone-400 mb-2 text-center">
                QUICK SETTLEMENT TENDER
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, grandTotal_c)}
                  className="btn-press py-2 px-1 rounded-xl text-[11px] font-mono font-bold bg-zinc-950/80 border border-gold/30 text-gold-light hover:bg-gold/20 hover:border-gold transition-all text-center"
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, 50000)}
                  className="btn-press py-2 px-1 rounded-xl text-[11px] font-mono font-semibold bg-zinc-950/60 border border-white/[0.08] text-stone-300 hover:border-gold/30 hover:bg-zinc-900 transition-all text-center"
                >
                  ₱500
                </button>
                <button
                  type="button"
                  onClick={() => onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, 100000)}
                  className="btn-press py-2 px-1 rounded-xl text-[11px] font-mono font-semibold bg-zinc-950/60 border border-white/[0.08] text-stone-300 hover:border-gold/30 hover:bg-zinc-900 transition-all text-center"
                >
                  ₱1,000
                </button>
                <button
                  type="button"
                  onClick={() => onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId)}
                  className="btn-press py-2 px-1 rounded-xl text-[11px] font-mono font-semibold bg-zinc-950/60 border border-white/[0.08] text-stone-300 hover:border-gold/30 hover:bg-zinc-900 transition-all text-center"
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Primary Action Button with Brushed-Gold Metallic Gradient */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onHoldCart}
                className="btn-press flex items-center justify-center gap-1 px-4 py-3.5 rounded-2xl bg-zinc-950 border border-white/[0.08] hover:border-gold/30 text-stone-400 hover:text-stone-200 text-xs font-mono tracking-wider uppercase transition-all"
                title="Hold transaction queue"
              >
                <PauseCircle className="h-4 w-4 text-gold-muted" />
                <span className="hidden sm:inline">Hold</span>
              </button>

              <button
                type="button"
                onClick={() => onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId)}
                className="btn-gold flex-1 py-3.5 px-4 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-glow-gold transition-all duration-300"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>AUTHORIZE & TENDER TRANSACTION</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
