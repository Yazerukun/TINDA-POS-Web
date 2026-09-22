import React, { useState, useMemo } from 'react'
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
  Layers
} from 'lucide-react'
import type { Product, Category, CartItem, DiscountType, HeldCart, Customer } from '../types'
import { money } from '../utils/format'

interface POSScreenProps {
  products: Product[]
  categories: Category[]
  customers: Customer[]
  cart: CartItem[]
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
  heldCarts: HeldCart[]
  onHoldCart: () => void
  onResumeCart: (held: HeldCart) => void
  onCheckout: (subtotal_c: number, discount_c: number, discount_type: DiscountType, total_c: number) => void
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
  const [selectedCatId, setSelectedCatId] = useState<number | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('NONE')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)

  // Filter products by search query and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status !== 'ACTIVE') return false
      if (selectedCatId !== 'ALL' && p.category_id !== selectedCatId && p.subcategory_id !== selectedCatId) {
        return false
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
  }, [products, selectedCatId, searchQuery])

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
      const exactMatch = products.find((p) => p.barcode === searchQuery.trim() || p.sku?.toLowerCase() === searchQuery.trim().toLowerCase())
      if (exactMatch) {
        addToCart(exactMatch)
        setSearchQuery('')
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Catalog Area (7 cols on lg, 8 cols on xl) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search & Barcode Quick Input */}
        <div className="glass-card rounded-2xl p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product name, SKU, or scan barcode (press Enter to ring)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-950/70 border border-white/[0.08] text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-obsidian-950/40 border border-white/[0.06] text-[11px] font-mono text-slate-400">
            <ScanLine className="h-3.5 w-3.5 text-emerald-400" />
            <span>Barcode Ready</span>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCatId('ALL')}
            className={`btn-press whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCatId === 'ALL'
                ? 'bg-emerald-500 text-obsidian-950 font-bold shadow-glow-emerald'
                : 'glass-pill text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            All Products ({products.filter((p) => p.status === 'ACTIVE').length})
          </button>
          {categories.filter((c) => c.parent_id === null).map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id && p.status === 'ACTIVE').length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`btn-press whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCatId === cat.id
                    ? 'bg-emerald-500 text-obsidian-950 font-bold shadow-glow-emerald'
                    : 'glass-pill text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {cat.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <Package className="h-12 w-12 text-slate-600 mb-3" />
            <p className="text-base font-bold text-slate-300">No Products Found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Walay nakit-an nga produkto sa imong search o kategorya. Sulayi pag-usab o i-clear ang search filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((p) => {
              const isLowStock = p.stock <= 5 && p.stock > 0
              const isOutOfStock = p.stock <= 0
              return (
                <button
                  key={p.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`btn-press group relative flex flex-col text-left rounded-2xl glass-card p-3 border transition-all overflow-hidden ${
                    isOutOfStock
                      ? 'opacity-40 cursor-not-allowed border-rose-500/20'
                      : 'hover:border-emerald-500/40 active:scale-95'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-obsidian-950/80 border border-white/[0.06] mb-2.5 flex items-center justify-center">
                    {p.image_path ? (
                      <img src={p.image_path} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <Package className="h-8 w-8 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    )}
                    {/* Stock Pill Badge */}
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                      isOutOfStock
                        ? 'bg-rose-500/90 text-white'
                        : isLowStock
                        ? 'bg-amber-500/90 text-obsidian-950 font-bold'
                        : 'bg-obsidian-900/80 backdrop-blur-md text-slate-300 border border-white/[0.1]'
                    }`}>
                      {isOutOfStock ? 'OUT' : `${p.stock} left`}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight group-hover:text-emerald-300 transition-colors">
                        {p.name}
                      </h4>
                      {p.sku && (
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{p.sku}</p>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-emerald-400 font-mono tracking-tight">
                        {money(p.default_price_c)}
                      </span>
                      <span className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-obsidian-950 transition-all">
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right Ticket Cart Drawer (5 cols on lg, 4 cols on xl) */}
      <div className="lg:col-span-5 xl:col-span-4 sticky top-20 glass-panel rounded-3xl border border-white/[0.12] p-5 shadow-2xl flex flex-col">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white tracking-tight">Current Ticket</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-[11px] font-medium text-rose-400/80 hover:text-rose-300 transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Held Carts Bar if any */}
        {heldCarts.length > 0 && (
          <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <PauseCircle className="h-4 w-4 text-amber-400" />
              <span>{heldCarts.length} Held Cart{heldCarts.length > 1 ? 's' : ''}</span>
            </span>
            <button
              onClick={() => onResumeCart(heldCarts[0])}
              className="btn-press flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-obsidian-950 text-xs font-bold"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span>Resume</span>
            </button>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
              <Layers className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Your cart is empty</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Click any product from catalog to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-obsidian-900/70 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                {/* Product mini thumb */}
                <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-obsidian-950 border border-white/[0.06] flex items-center justify-center">
                  {item.product.image_path ? (
                    <img src={item.product.image_path} alt={item.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-slate-600" />
                  )}
                </div>

                {/* Name & price */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate leading-tight">{item.product.name}</p>
                  <p className="text-[11px] font-mono text-emerald-400 mt-0.5">{money(item.unit_price_c)}</p>
                </div>

                {/* Stepper buttons */}
                <div className="flex items-center gap-1 rounded-xl bg-obsidian-950 border border-white/[0.08] p-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="btn-press h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08]"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="btn-press h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08]"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Total & Remove */}
                <div className="text-right pl-1">
                  <p className="text-xs font-extrabold font-mono text-white">{money(item.total_c)}</p>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-slate-500 hover:text-rose-400 mt-0.5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount & Controls Box */}
        {cart.length > 0 && (
          <div className="border-t border-white/[0.08] pt-3 mt-3 space-y-3">
            {/* Senior / PWD 20% toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian-900/60 border border-white/[0.06]">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-amber-400" />
                <span>Senior / PWD (20% Off)</span>
              </span>
              <button
                type="button"
                onClick={() => setDiscountType(discountType === 'SENIOR_PWD_20' ? 'NONE' : 'SENIOR_PWD_20')}
                className={`btn-press relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  discountType === 'SENIOR_PWD_20' ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    discountType === 'SENIOR_PWD_20' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">{money(subtotal_c)}</span>
              </div>
              {discount_c > 0 && (
                <div className="flex justify-between text-amber-400 font-medium">
                  <span>Senior/PWD 20%</span>
                  <span className="font-mono">-{money(discount_c)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.08]">
                <span className="text-sm font-bold text-white uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  {money(grandTotal_c)}
                </span>
              </div>
            </div>

            {/* Hold Cart & Charge Actions */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={onHoldCart}
                className="btn-press col-span-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-white/[0.12] bg-obsidian-900 hover:bg-obsidian-850 text-slate-300 text-xs font-bold"
              >
                <PauseCircle className="h-4 w-4 text-amber-400" />
                <span>Hold</span>
              </button>

              <button
                type="button"
                onClick={() => onCheckout(subtotal_c, discount_c, discountType, grandTotal_c)}
                className="btn-press col-span-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 font-black text-sm uppercase tracking-wide shadow-glow-emerald flex items-center justify-center gap-2"
              >
                <span>Charge</span>
                <span className="font-mono">{money(grandTotal_c)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
