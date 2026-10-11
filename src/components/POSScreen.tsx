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
  ChevronDown,
  Volume2,
  VolumeX,
  Edit3,
  Tag,
  X,
  UserPlus,
  AlertTriangle,
  Calculator,
  Receipt as ReceiptIcon,
  ArrowRight,
  Wallet,
  Landmark,
  Banknote,
  DollarSign,
  User,
  Clock,
  RotateCcw,
  LayoutGrid,
  List,
  Zap,
  Upload,
  Database
} from 'lucide-react'
import type {
  Product,
  Category,
  CartItem,
  DiscountType,
  HeldCart,
  Customer,
  PaymentMethod,
  Expense
} from '../types'
import { money } from '../utils/format'
import { db } from '../db'
import { BarcodeScannerModal } from './BarcodeScannerModal'
import {
  playScanSuccess,
  playScanError,
  playDuplicateScanChime,
  isSoundMuted,
  setSoundMuted,
  playCheckoutChime
} from '../lib/sound'
import { importTindaBackup } from '../utils/backup'

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
    quickTender_c?: number,
    initialMethod?: PaymentMethod
  ) => void
  cashierName?: string
  storeName?: string
  onRefreshData?: () => Promise<void> | void
}

interface CartQuantityInputProps {
  productId: number
  quantity: number
  maxStock: number
  onSetQuantity: (productId: number, qty: number) => void
  inputRef?: React.Ref<HTMLInputElement>
}

function CartQuantityInput({
  productId,
  quantity,
  maxStock,
  onSetQuantity,
  inputRef
}: CartQuantityInputProps): React.JSX.Element {
  const [val, setVal] = useState<string>(String(quantity))

  useEffect(() => {
    setVal(String(quantity))
  }, [quantity])

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10)
    if (isNaN(parsed) || parsed <= 0) {
      setVal(String(quantity))
      return
    }
    const clamped = maxStock > 0 ? Math.min(parsed, maxStock) : parsed
    setVal(String(clamped))
    onSetQuantity(productId, clamped)
  }

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min={1}
      max={maxStock > 0 ? maxStock : undefined}
      value={val}
      onChange={(e) => {
        const next = e.target.value
        setVal(next)
        const parsed = parseInt(next, 10)
        if (!isNaN(parsed) && parsed > 0) {
          const clamped = maxStock > 0 ? Math.min(parsed, maxStock) : parsed
          onSetQuantity(productId, clamped)
        }
      }}
      onBlur={() => commit(val)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit(val)
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === 'Escape') {
          setVal(String(quantity))
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      onFocus={(e) => e.target.select()}
      title="Click or tap to edit quantity (F2)"
      className="w-12 h-6 text-center text-xs font-mono font-bold text-stone-100 bg-obsidian-950 border border-white/[0.1] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-lg py-0.5 px-0.5 transition-all cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  )
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
  onCheckout,
  cashierName = 'Cashier',
  storeName = 'TINDA Retail',
  onRefreshData
}: POSScreenProps): React.JSX.Element {
  const [selectedMainCatId, setSelectedMainCatId] = useState<number | 'ALL'>('ALL')
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('NONE')
  const [customDiscount_c, setCustomDiscount_c] = useState<number>(0)
  const [seniorName, setSeniorName] = useState<string>('')
  const [seniorIdNumber, setSeniorIdNumber] = useState<string>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [activeInvoiceId, setActiveInvoiceId] = useState<string>('')
  const [scanOpen, setScanOpen] = useState(false)
  const [soundMutedState, setSoundMutedState] = useState(() => isSoundMuted())
  const [catalogViewMode, setCatalogViewMode] = useState<'GRID' | 'LIST'>(() => {
    try {
      return (localStorage.getItem('tinda_pos_catalog_view') as 'GRID' | 'LIST') || 'GRID'
    } catch {
      return 'GRID'
    }
  })

  const handleToggleViewMode = (mode: 'GRID' | 'LIST') => {
    setCatalogViewMode(mode)
    try {
      localStorage.setItem('tinda_pos_catalog_view', mode)
    } catch {
      // ignore
    }
  }

  // Modals state
  const [priceEditItem, setPriceEditItem] = useState<CartItem | null>(null)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false)
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isAutoImporting, setIsAutoImporting] = useState(false)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)

  // Refs for hotkey focusing
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastQtyInputRef = useRef<HTMLInputElement>(null)
  const discountQuickInputRef = useRef<HTMLInputElement>(null)
  const posFileInputRef = useRef<HTMLInputElement>(null)

  const handlePOSAutoImport = async () => {
    if (typeof (window as any).showOpenFilePicker === 'function') {
      try {
        setIsAutoImporting(true)
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'TINDA POS Backup Archives (*.tinda-backup, *.json)',
              accept: {
                'application/json': ['.json', '.tinda-backup'],
                'application/octet-stream': ['.tinda-backup']
              }
            }
          ],
          multiple: false
        })
        const file = await handle.getFile()
        const text = await file.text()
        const res = await importTindaBackup(text, { targetStoreName: storeName })
        if (res.success) {
          alert(res.message)
          if (onRefreshData) await onRefreshData()
        } else {
          alert('Import failed: ' + res.message)
        }
        return
      } catch (err: any) {
        setIsAutoImporting(false)
        if (err.name === 'AbortError') return
      } finally {
        setIsAutoImporting(false)
      }
    }
    posFileInputRef.current?.click()
  }

  const handlePOSFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsAutoImporting(true)
    try {
      const text = await file.text()
      const res = await importTindaBackup(text, { targetStoreName: storeName })
      if (res.success) {
        alert(res.message)
        if (onRefreshData) await onRefreshData()
      } else {
        alert('Import failed: ' + res.message)
      }
    } catch (err: any) {
      alert('Error reading backup: ' + err.message)
    } finally {
      setIsAutoImporting(false)
      e.target.value = ''
    }
  }

  const toggleSound = () => {
    const next = !soundMutedState
    setSoundMuted(next)
    setSoundMutedState(next)
  }

  // Generate luxury invoice sequence on mount or when cart empties
  useEffect(() => {
    if (cart.length === 0) {
      const seq = Math.floor(10000 + Math.random() * 90000)
      setActiveInvoiceId(`#INV-${seq}`)
    }
  }, [cart.length])

  // Compute subtotal
  const subtotal_c = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total_c, 0)
  }, [cart])

  // Compute discount amount
  const discount_c = useMemo(() => {
    if (discountType === 'SENIOR_PWD_20') {
      return Math.round(subtotal_c * 0.20)
    }
    if (discountType === 'CUSTOM') {
      return Math.min(subtotal_c, customDiscount_c)
    }
    return 0
  }, [subtotal_c, discountType, customDiscount_c])

  const grandTotal_c = Math.max(0, subtotal_c - discount_c)

  // Global POS Keyboard Shortcuts (Desktop Parity: F1, F2, F3, F4, F6, F7, F8, F9, F10, F11, F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept hotkeys if an internal modal is open, except Escape
      const isAnyModalOpen =
        priceEditItem !== null ||
        isDiscountModalOpen ||
        isCustomerModalOpen ||
        isHeldModalOpen ||
        isCalcModalOpen ||
        isExpenseModalOpen ||
        scanOpen

      if (e.key === 'Escape') {
        if (isAnyModalOpen) {
          setPriceEditItem(null)
          setIsDiscountModalOpen(false)
          setIsCustomerModalOpen(false)
          setIsHeldModalOpen(false)
          setIsCalcModalOpen(false)
          setIsExpenseModalOpen(false)
          setScanOpen(false)
          return
        }
        if (searchQuery) {
          setSearchQuery('')
          return
        }
      }

      if (isAnyModalOpen) return

      // F1 or Ctrl+K / Cmd+K: Focus Search
      if (e.key === 'F1' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      // F2: Focus last item quantity in cart
      if (e.key === 'F2') {
        if (cart.length > 0) {
          e.preventDefault()
          lastQtyInputRef.current?.focus()
          lastQtyInputRef.current?.select()
        }
        return
      }

      // F3: Quick Calculator & Change Assistant
      if (e.key === 'F3') {
        e.preventDefault()
        setIsCalcModalOpen((prev) => !prev)
        return
      }

      // F4: Discounts (Senior / PWD 20% or Custom)
      if (e.key === 'F4') {
        e.preventDefault()
        setIsDiscountModalOpen(true)
        return
      }

      // F6: Customer / Suki Picker
      if (e.key === 'F6') {
        e.preventDefault()
        setIsCustomerModalOpen(true)
        return
      }

      // F7: Record Petty Cash Expense
      if (e.key === 'F7') {
        e.preventDefault()
        setIsExpenseModalOpen(true)
        return
      }

      // F8: Hold Current Sale or View Held Sales
      if (e.key === 'F8') {
        e.preventDefault()
        if (e.shiftKey) {
          setIsHeldModalOpen(true)
        } else if (cart.length > 0) {
          onHoldCart()
        } else {
          setIsHeldModalOpen(true)
        }
        return
      }

      // F9: Checkout with Cash
      if (e.key === 'F9') {
        if (cart.length > 0) {
          e.preventDefault()
          onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, grandTotal_c, 'CASH')
        }
        return
      }

      // F10: Checkout with GCash
      if (e.key === 'F10') {
        if (cart.length > 0) {
          e.preventDefault()
          onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, grandTotal_c, 'GCASH')
        }
        return
      }

      // F11: Checkout with Maya
      if (e.key === 'F11') {
        if (cart.length > 0) {
          e.preventDefault()
          onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, grandTotal_c, 'MAYA')
        }
        return
      }

      // F12: Checkout with MariBank
      if (e.key === 'F12') {
        if (cart.length > 0) {
          e.preventDefault()
          onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, grandTotal_c, 'MARIBANK')
        }
        return
      }

      // Ctrl+M: Audio Mute toggle
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        toggleSound()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    cart,
    subtotal_c,
    discount_c,
    discountType,
    grandTotal_c,
    selectedCustomerId,
    onHoldCart,
    onCheckout,
    soundMutedState,
    searchQuery,
    priceEditItem,
    isDiscountModalOpen,
    isCustomerModalOpen,
    isHeldModalOpen,
    isCalcModalOpen,
    isExpenseModalOpen,
    scanOpen
  ])

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

  // Real-time cart quantity map
  const cartQtyMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of cart) {
      map.set(item.product.id, (map.get(item.product.id) || 0) + item.quantity)
    }
    return map
  }, [cart])

  // Transient state for real-time visual pulse & floating "-1" badge
  const [deductedProductId, setDeductedProductId] = useState<number | null>(null)
  const deductTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerRealtimeDeduct = (productId: number) => {
    if (deductTimerRef.current) clearTimeout(deductTimerRef.current)
    setDeductedProductId(productId)
    deductTimerRef.current = setTimeout(() => {
      setDeductedProductId(null)
    }, 600)
  }

  // Cart operations
  const addToCart = (product: Product) => {
    const inCart = cartQtyMap.get(product.id) || 0
    if (inCart >= product.stock) {
      playScanError()
      return
    }

    if (inCart > 0) {
      playDuplicateScanChime()
    } else {
      playScanSuccess()
    }

    triggerRealtimeDeduct(product.id)

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
          total_c: product.default_price_c,
          original_price_c: product.default_price_c,
          is_custom_price: false
        }
      ]
    })
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev

      if (delta > 0) {
        const prod = products.find((p) => p.id === productId) || item.product
        if (item.quantity >= prod.stock) {
          playScanError()
          return prev
        }
        playScanSuccess()
        triggerRealtimeDeduct(productId)
      }

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

  const setDirectQuantity = (productId: number, targetQty: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev

      if (targetQty <= 0) {
        return prev.filter((i) => i.product.id !== productId)
      }

      const prod = products.find((p) => p.id === productId) || item.product
      const maxStock = prod.stock > 0 ? prod.stock : 999999
      const newQty = Math.min(targetQty, maxStock)

      if (newQty > item.quantity) {
        triggerRealtimeDeduct(productId)
      }

      return prev.map((i) => {
        if (i.product.id !== productId) return i
        return {
          ...i,
          quantity: newQty,
          total_c: newQty * i.unit_price_c
        }
      })
    })
  }

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

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

  // Camera barcode scan handler
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
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Minimalist Search Bar with Sound Mute & Camera Scanner */}
        <div className="relative glass-card rounded-2xl p-2.5 border border-white/[0.06] hover:border-emerald-500/30 transition-all duration-300 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-emerald-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search private reserve catalog, SKU, or scan barcode (F1)..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.06] text-xs font-sans text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            {/* Shortcut Chip */}
            <div className="absolute right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-obsidian-900/[0.8] border border-white/[0.1] text-[0.7rem] font-mono text-emerald-400 pointer-events-none">
              <span>F1 / ⌘K</span>
            </div>
          </div>

          {/* Audio Chime Mute Button */}
          <button
            onClick={toggleSound}
            aria-label={soundMutedState ? 'Unmute scanner audio' : 'Mute scanner audio'}
            title={soundMutedState ? 'Audio chimes muted (Ctrl+M to unmute)' : 'Audio chimes active (Ctrl+M to mute)'}
            className={`btn-press flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border text-[0.75rem] font-mono transition-all ${
              soundMutedState
                ? 'bg-rose-950/20 border-rose-800/40 text-rose-400 hover:border-rose-600'
                : 'bg-obsidian-900/[0.8] border-emerald-500/30 text-emerald-400 hover:border-emerald-500/60'
            }`}
          >
            {soundMutedState ? (
              <VolumeX className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span className="hidden sm:inline uppercase tracking-wider text-[0.7rem]">
              {soundMutedState ? 'Muted' : 'Audio'}
            </span>
          </button>

          <button
            onClick={() => setScanOpen(true)}
            aria-label="Scan barcode with camera"
            className="btn-press flex items-center gap-1.5 px-3 py-2 rounded-xl bg-obsidian-900/[0.8] border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/[0.1] text-[0.75rem] font-mono text-emerald-400 transition-all shadow-glow-emerald"
          >
            <ScanLine className="h-3.5 w-3.5 text-emerald-400" />
            <span className="tracking-wider uppercase text-[0.7rem]">Scan</span>
          </button>
        </div>

        {/* Industrial POS Hotkey Quick Reference Ribbon (Matching Desktop Parity) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 text-[0.7rem] font-mono text-stone-400">
          <span className="text-emerald-400 font-bold text-[0.65rem] uppercase tracking-widest shrink-0">Hotkeys:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F1</kbd> Search
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F2</kbd> Qty
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F3</kbd> Calc
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F4</kbd> Discount
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F6</kbd> Customer
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F7</kbd> Expense
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F8</kbd> Hold
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F9</kbd> Cash
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F10</kbd> GCash
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F11</kbd> Maya
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">F12</kbd> MariBank
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian-900/[0.8] border border-white/[0.06] shrink-0">
            <kbd className="text-emerald-400 font-bold">Ctrl+M</kbd> Mute
          </span>
        </div>

        {/* Camera Barcode Scanner Overlay */}
        <BarcodeScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onDetect={handleScanDetect} />

        {/* Category Navigation */}
        <div className="relative border-b border-white/[0.06] overflow-x-auto scrollbar-none flex items-center gap-6 px-1">
          <button
            onClick={() => { setSelectedMainCatId('ALL'); setSelectedSubCatId('ALL') }}
            className={`group relative py-3 text-xs tracking-[0.15em] uppercase font-sans font-medium transition-colors duration-300 whitespace-nowrap ${
              selectedMainCatId === 'ALL' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            All Reserve ({products.filter((p) => p.status === 'ACTIVE').length})
            {selectedMainCatId === 'ALL' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-full" />
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
                  isSelected ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {cat.name} ({count})
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-full" />
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
              className={`group relative py-2 text-[0.8125rem] tracking-[0.15em] uppercase font-sans font-medium transition-colors duration-300 whitespace-nowrap ${
                selectedSubCatId === 'ALL' ? 'text-emerald-400 font-bold' : 'text-stone-500 hover:text-stone-200'
              }`}
            >
              All {categories.find((c) => c.id === selectedMainCatId)?.name ?? ''}
              {selectedSubCatId === 'ALL' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/60 rounded-full" />
              )}
            </button>
            {categories.filter((c) => c.parent_id === selectedMainCatId).map((sub) => {
              const count = products.filter((p) => p.subcategory_id === sub.id && p.status === 'ACTIVE').length
              const isSelected = selectedSubCatId === sub.id
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubCatId(sub.id)}
                  className={`group relative py-2 text-[0.8125rem] tracking-[0.15em] uppercase font-sans font-medium transition-colors duration-300 whitespace-nowrap ${
                    isSelected ? 'text-emerald-400 font-bold' : 'text-stone-500 hover:text-stone-200'
                  }`}
                >
                  {sub.name} ({count})
                  {isSelected && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Catalog Toolbar: Results Counter & View Mode Switcher (Grid vs List) */}
        <div className="flex items-center justify-between px-1">
          <div className="text-[0.7rem] font-mono text-stone-400">
            SHOWING <span className="text-emerald-400 font-bold">{filteredProducts.length}</span> PRODUCTS
          </div>
          <div className="flex items-center gap-1 bg-obsidian-950/80 p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => handleToggleViewMode('GRID')}
              aria-label="Grid view"
              title="Grid View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                catalogViewMode === 'GRID'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-glow-emerald font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="text-[0.7rem] uppercase tracking-wider hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('LIST')}
              aria-label="List view"
              title="List View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                catalogViewMode === 'LIST'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-glow-emerald font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="text-[0.7rem] uppercase tracking-wider hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* Product Cards Display: Grid or List */}
        {products.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center flex flex-col items-center justify-center border border-dashed border-amber-500/30 bg-amber-500/[0.03] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <p className="font-serif text-lg font-bold tracking-wide text-stone-100">
                Empty Inventory (No Products Found)
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Would you like to auto-detect or import your product catalog from the Offline Desktop TINDA POS (<code className="text-amber-300 font-mono">.tinda-backup</code>) or JSON backup archive?
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePOSAutoImport}
                disabled={isAutoImporting}
                className="btn-press px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-amber transition-all active:scale-[0.98]"
              >
                <Zap className="w-4 h-4 text-obsidian-950 fill-obsidian-950" />
                <span>{isAutoImporting ? 'Importing...' : '⚡ Auto-Detect & Import Backup'}</span>
              </button>
              <button
                type="button"
                onClick={() => posFileInputRef.current?.click()}
                disabled={isAutoImporting}
                className="btn-press px-5 py-3 rounded-2xl bg-obsidian-900 border border-slate-700 text-stone-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-stone-400" />
                <span>Manual File Picker (.tinda-backup)</span>
              </button>
              <input
                ref={posFileInputRef}
                type="file"
                accept=".tinda-backup,.json"
                onChange={handlePOSFileChange}
                className="hidden"
              />
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass-card rounded-3xl p-14 text-center flex flex-col items-center justify-center border border-white/[0.04]">
            <Package className="h-10 w-10 text-stone-500 mb-3" />
            <p className="font-serif text-base font-bold tracking-widest text-stone-300 uppercase">
              No Inventory Found
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm font-sans">
              No products found matching your search or category filter. Try clearing keywords.
            </p>
          </div>
        ) : catalogViewMode === 'GRID' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const inCartQty = cartQtyMap.get(p.id) || 0
              const remainingStock = Math.max(0, p.stock - inCartQty)
              const isOutOfStock = remainingStock <= 0
              const isLowStock = remainingStock <= 5 && remainingStock > 0
              const isJustDeducted = deductedProductId === p.id

              return (
                <button
                  key={p.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`btn-press group relative flex flex-col text-left rounded-2xl glass-card p-3.5 border transition-all duration-300 overflow-hidden ${
                    isOutOfStock
                      ? 'opacity-35 cursor-not-allowed border-rose-950/40 bg-obsidian-900/[0.08]'
                      : isJustDeducted
                      ? 'border-emerald-500/80 bg-emerald-500/[0.05] scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                      : 'border-white/[0.06] hover:border-emerald-500/35 hover:-translate-y-1 hover:shadow-glow-emerald active:scale-98'
                  }`}
                >
                  {/* Real-time -1 Stock Pop Badge */}
                  {isJustDeducted && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-stone-100 font-mono text-[0.75rem] font-extrabold shadow-lg animate-bounce pointer-events-none">
                      <span>-1</span>
                      <span className="text-[0.75rem] uppercase tracking-wider">stock</span>
                    </div>
                  )}

                  {/* Image Container */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-obsidian-950 border border-white/[0.04] mb-3 flex items-center justify-center shadow-inner">
                    {p.image_path ? (
                      <img
                        src={p.image_path}
                        alt={p.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <Package className="h-9 w-9 text-stone-500 group-hover:text-emerald-400 transition-colors" />
                    )}

                    {/* In-Ticket Indicator Tag */}
                    {inCartQty > 0 && !isJustDeducted && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-stone-100 font-mono text-[0.75rem] font-bold shadow-md z-10 tracking-wider">
                        {inCartQty} IN CART
                      </span>
                    )}

                    {/* Stock Status Badge */}
                    <span
                      className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[0.75rem] font-mono tracking-wider uppercase font-semibold transition-all duration-300 ${
                        isOutOfStock
                          ? p.stock > 0
                            ? 'bg-rose-50/90 text-rose-700 border border-rose-700/60'
                            : 'bg-rose-900/90 text-stone-200 border border-rose-800'
                          : isLowStock
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-obsidian-900/[0.6] text-stone-300 border border-white/[0.08] backdrop-blur-md'
                      }`}
                    >
                      {isOutOfStock
                        ? p.stock > 0
                          ? `Max (${p.stock})`
                          : 'Depleted'
                        : isLowStock
                        ? `Low: ${remainingStock} left`
                        : `Stock: ${remainingStock}`}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-100 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                        {p.name}
                      </h4>
                      {p.sku && (
                        <p className="text-[0.75rem] font-sans font-semibold tracking-wider text-stone-400 mt-1 uppercase font-mono">
                          {p.sku}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="font-serif text-sm font-bold tracking-tight text-emerald-400">
                        {money(p.default_price_c)}
                      </span>

                      <div
                        className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                          isOutOfStock
                            ? 'bg-slate-850 border-white/[0.04] text-stone-500'
                            : isJustDeducted
                            ? 'bg-emerald-500 text-stone-100 border-emerald-400'
                            : 'bg-slate-850/80 border-white/[0.08] text-stone-400 group-hover:bg-emerald-500 group-hover:text-stone-100 group-hover:border-emerald-500'
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          /* List View: Cashier-Speed High Density Row Layout */
          <div className="space-y-2">
            {filteredProducts.map((p) => {
              const inCartQty = cartQtyMap.get(p.id) || 0
              const remainingStock = Math.max(0, p.stock - inCartQty)
              const isOutOfStock = remainingStock <= 0
              const isLowStock = remainingStock <= 5 && remainingStock > 0
              const isJustDeducted = deductedProductId === p.id

              return (
                <button
                  key={p.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`w-full btn-press group flex items-center justify-between gap-3 text-left rounded-xl glass-card px-3.5 py-2.5 border transition-all duration-200 ${
                    isOutOfStock
                      ? 'opacity-40 cursor-not-allowed border-rose-950/40 bg-obsidian-900/[0.08]'
                      : isJustDeducted
                      ? 'border-emerald-500/80 bg-emerald-500/[0.08] shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'border-white/[0.06] hover:border-emerald-500/35 hover:bg-emerald-500/[0.02]'
                  }`}
                >
                  {/* Left: Thumbnail & Name & Identifiers */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-obsidian-950 border border-white/[0.04] flex items-center justify-center">
                      {p.image_path ? (
                        <img
                          src={p.image_path}
                          alt={p.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-stone-500 group-hover:text-emerald-400 transition-colors" />
                      )}
                      {inCartQty > 0 && (
                        <span className="absolute bottom-0 right-0 bg-emerald-600 text-[9px] font-mono font-bold text-white px-1 rounded-tl">
                          {inCartQty}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-stone-100 truncate group-hover:text-emerald-400 transition-colors">
                          {p.name}
                        </h4>
                        {inCartQty > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                            {inCartQty} IN CART
                          </span>
                        )}
                        {isJustDeducted && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-emerald-500 text-white shrink-0 animate-pulse">
                            -1
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-stone-400">
                        {p.sku && <span>SKU: {p.sku}</span>}
                        {p.barcode && <span>• Barcode: {p.barcode}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Stock, Price & Quick Add Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider ${
                        isOutOfStock
                          ? 'bg-rose-900/60 text-rose-300 border border-rose-800'
                          : isLowStock
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-obsidian-900 text-stone-400 border border-white/[0.06]'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low: ${remainingStock}` : `Stock: ${remainingStock}`}
                    </span>

                    <span className="font-serif text-sm font-bold text-emerald-400 min-w-[70px] text-right">
                      {money(p.default_price_c)}
                    </span>

                    <div
                      className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all ${
                        isOutOfStock
                          ? 'border-white/[0.04] text-stone-600'
                          : isJustDeducted
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-obsidian-900 border-white/[0.08] text-stone-300 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right Cart Sidebar (100% Desktop Parity: Suki Bar, Stepper, Price Override, F4/F8/F9-F12) */}
      <div className="lg:col-span-5 xl:col-span-4 sticky top-20 glass-panel rounded-3xl border border-white/[0.08] p-4 sm:p-5 shadow-vault flex flex-col transition-all duration-300">
        {/* Cart Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-emerald-400" />
            <h3 className="font-serif font-bold text-sm tracking-wider uppercase text-stone-100">
              Cart
            </h3>
            {cart.length > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
                {cart.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 transition"
              title="View held sales (F8 / Shift+F8)"
            >
              <span>Held</span>
              {heldCarts.length > 0 && (
                <span className="rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[10px] font-black text-amber-200">
                  {heldCarts.length}
                </span>
              )}
            </button>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                title="Clear entire cart"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer / Suki Status Bar (Desktop Parity F6) */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-obsidian-950/60 px-3 py-2 text-xs rounded-xl mb-3">
          {selectedCustomer ? (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-3 w-3" />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Customer: </span>
                  <span className="font-bold text-emerald-300 truncate" title={selectedCustomer.name}>
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.balance_c > 0 && (
                    <span className="ml-1.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      Bal: {money(selectedCustomer.balance_c)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded hover:bg-emerald-500/10 transition"
                  title="Change Customer (F6)"
                >
                  <span>Change</span>
                  <kbd className="font-mono text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">F6</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="text-stone-500 hover:text-rose-400 p-0.5 rounded hover:bg-obsidian-800 transition"
                  title="Switch back to Walk-in"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-stone-400">
                <User className="h-3.5 w-3.5 text-stone-500" />
                <span className="font-medium text-stone-300">Walk-in Customer</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                title="Select Customer Account (F6)"
              >
                <UserPlus className="h-3 w-3" />
                <span>Select Customer</span>
                <kbd className="font-mono text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">F6</kbd>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Cart Items List */}
        <div className="flex-1 max-h-[350px] overflow-y-auto space-y-2 pr-1">
          {cart.length === 0 ? (
            <div className="py-14 text-center text-stone-500 flex flex-col items-center justify-center">
              <Layers className="h-8 w-8 text-stone-500 mb-2 stroke-[1.5]" />
              <p className="font-serif text-xs font-bold uppercase tracking-widest text-stone-400">
                Cart is empty
              </p>
              <p className="text-[0.8125rem] text-stone-500 mt-1 font-sans">
                Tap an item or scan a barcode to add
              </p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const maxStock = products.find((p) => p.id === item.product.id)?.stock ?? item.product.stock
              const isOverStock = item.quantity > maxStock
              const isLowStock = maxStock - item.quantity <= 5 && !isOverStock

              return (
                <div
                  key={item.product.id}
                  className={`group relative rounded-xl border p-2.5 transition-all ${
                    isOverStock
                      ? 'border-rose-500/50 bg-rose-500/10'
                      : 'border-white/[0.06] bg-obsidian-900/60 hover:bg-obsidian-900/90'
                  }`}
                >
                  {/* Top row: Item Name + Custom Tag + Line Total */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="truncate text-xs font-semibold text-stone-100" title={item.product.name}>
                          {item.product.name}
                        </p>
                        {item.is_custom_price && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.2 border border-amber-500/30 text-[9px] font-bold text-amber-300 shrink-0">
                            <Tag className="h-2.5 w-2.5" /> Custom
                          </span>
                        )}
                      </div>
                      {item.product.sku && (
                        <p className="text-[10px] text-stone-400 truncate mt-0.5 font-mono">
                          {item.product.sku}
                        </p>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-bold text-emerald-400 tabular-nums">
                        {money(item.total_c)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: Stepper + Price unit on left, Price Edit & Remove on right */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Micro-Stepper aligned to 28px height */}
                      <div className="flex items-center rounded-lg border border-white/[0.08] bg-obsidian-950 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-obsidian-800 hover:text-white transition active:scale-95"
                          title="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <CartQuantityInput
                          productId={item.product.id}
                          quantity={item.quantity}
                          maxStock={maxStock}
                          onSetQuantity={setDirectQuantity}
                          inputRef={idx === cart.length - 1 ? lastQtyInputRef : undefined}
                        />
                        <button
                          type="button"
                          disabled={item.quantity >= maxStock}
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-obsidian-800 hover:text-white transition active:scale-95 disabled:opacity-30"
                          title={item.quantity >= maxStock ? `Only ${maxStock} remaining` : 'Increase quantity'}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Unit price tag */}
                      <div className="flex flex-col text-[10px] leading-tight text-stone-400">
                        <span className="font-mono">
                          @{money(item.unit_price_c)} <span className="text-stone-500">/{item.product.base_unit || 'pc'}</span>
                        </span>
                        {item.is_custom_price && item.original_price_c && item.original_price_c !== item.unit_price_c && (
                          <span className="line-through text-[9px] text-stone-500">
                            {money(item.original_price_c)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right controls: Edit unit price + Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPriceEditItem(item)}
                        className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium text-stone-300 hover:bg-obsidian-800 hover:text-amber-300 border border-white/[0.06] transition"
                        title="Edit line item unit price"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Price</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-stone-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stock Warnings */}
                  {isOverStock ? (
                    <p className="mt-1 text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Over stock! Available: {maxStock}
                    </p>
                  ) : isLowStock ? (
                    <p className="mt-1 text-[9px] text-amber-400/80">
                      Low stock: {maxStock - item.quantity} remaining
                    </p>
                  ) : null}
                </div>
              )
            })
          )}
        </div>

        {/* Financial Summary & Breakdown (Desktop Parity F4) */}
        {cart.length > 0 && (
          <div className="space-y-2 border-t border-white/[0.06] bg-obsidian-950/40 px-3 py-3 text-xs rounded-xl mt-3">
            <div className="flex items-center justify-between text-stone-400">
              <span>Subtotal</span>
              <span className="font-semibold text-stone-200 font-mono">{money(subtotal_c)}</span>
            </div>

            {/* Discount row with F4 Quick Button & Direct Input */}
            <div className="flex items-center justify-between text-stone-400">
              <div className="flex items-center gap-1.5">
                <span>Discount (₱)</span>
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                  title="Apply Senior / PWD 20% or Custom Discount (F4)"
                >
                  <span>Discounts</span>
                  <kbd className="font-mono text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">F4</kbd>
                </button>
              </div>

              <div className="relative">
                <input
                  ref={discountQuickInputRef}
                  type="number"
                  min={0}
                  value={discount_c ? (discount_c / 100).toFixed(2) : ''}
                  onChange={(e) => {
                    const val = Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100))
                    setCustomDiscount_c(val)
                    setDiscountType(val > 0 ? 'CUSTOM' : 'NONE')
                  }}
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-white/[0.08] bg-obsidian-950 px-2 py-1 pr-6 text-right text-xs font-semibold text-stone-200 focus:border-emerald-500 focus:outline-none"
                  title="Quick Discount in Pesos (F4)"
                />
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-stone-500 font-semibold">
                  F4
                </span>
              </div>
            </div>

            {/* Senior/PWD ID indicator if active */}
            {discountType === 'SENIOR_PWD_20' && seniorIdNumber && (
              <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono">
                <span>SC/PWD ID: #{seniorIdNumber}</span>
                <span>(20% Statutory)</span>
              </div>
            )}

            {/* Grand Total Showcase Box */}
            <div className="mt-2 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-obsidian-900 p-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Total Amount to Pay
                </span>
                {discount_c > 0 && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                    Saved {money(discount_c)}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight text-white tabular-nums drop-shadow-[0_2px_12px_rgba(16,185,129,0.3)]">
                  {money(grandTotal_c)}
                </span>
                <span className="text-xs text-stone-400">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Action Bar (4 Utility buttons + Primary Checkout) */}
        <div className="space-y-2 border-t border-white/[0.06] bg-obsidian-900 px-1 pb-1 pt-3 mt-3">
          {/* Secondary Utility Controls */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              disabled={cart.length === 0 && heldCarts.length === 0}
              onClick={() => {
                if (cart.length > 0) {
                  onHoldCart()
                } else {
                  setIsHeldModalOpen(true)
                }
              }}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-white/[0.08] bg-obsidian-950/80 text-xs text-stone-300 hover:border-amber-500/50 hover:text-amber-400 transition-all disabled:opacity-40"
              title="Hold Current Sale (F8, or Shift+F8 to view held orders)"
            >
              <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Hold</span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20">F8</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCalcModalOpen(true)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-white/[0.08] bg-obsidian-950/80 text-xs text-stone-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
              title="Open Cashier Calculator & Change Assistant (F3)"
            >
              <Calculator className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Calc</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1 py-0.2 rounded border border-emerald-400/20">F3</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-white/[0.08] bg-obsidian-950/80 text-xs text-stone-300 hover:border-rose-500/50 hover:text-rose-400 transition-all"
              title="Record Store Petty Cash Out (F7)"
            >
              <ReceiptIcon className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Expense</span>
              <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-400/10 px-1 py-0.2 rounded border border-rose-400/20">F7</span>
            </button>

            <button
              disabled={cart.length === 0}
              onClick={() => setCart([])}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-white/[0.08] bg-obsidian-950/80 text-xs text-stone-400 hover:border-rose-500/50 hover:text-rose-400 transition-all disabled:opacity-40"
              title="Clear all cart items"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {/* Primary Checkout Button */}
          <button
            disabled={cart.length === 0}
            onClick={() => {
              if (cart.length === 0) return
              onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, undefined, 'CASH')
            }}
            className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 py-3 text-white shadow-lg shadow-emerald-950/40 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:hover:brightness-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-wide">CHECKOUT & PAY</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
            <span className="mt-0.5 text-[11px] font-normal text-emerald-100/80">
              F9 Cash · F10 GCash · F11 Maya · F12 MariBank
            </span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Price Edit Modal (Desktop Parity) */}
      {priceEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-stone-100">
                  Edit Unit Price: {priceEditItem.product.name}
                </h3>
              </div>
              <button
                onClick={() => setPriceEditItem(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PriceEditForm
              item={priceEditItem}
              onClose={() => setPriceEditItem(null)}
              onApplyPrice={(newPriceC) => {
                setCart((prev) =>
                  prev.map((i) => {
                    if (i.product.id !== priceEditItem.product.id) return i
                    const basePrice = i.original_price_c || i.product.default_price_c
                    const isCustom = newPriceC !== basePrice
                    return {
                      ...i,
                      unit_price_c: newPriceC,
                      total_c: newPriceC * i.quantity,
                      is_custom_price: isCustom,
                      original_price_c: basePrice
                    }
                  })
                )
                setPriceEditItem(null)
              }}
              onResetPrice={() => {
                setCart((prev) =>
                  prev.map((i) => {
                    if (i.product.id !== priceEditItem.product.id) return i
                    const basePrice = i.original_price_c || i.product.default_price_c
                    return {
                      ...i,
                      unit_price_c: basePrice,
                      total_c: basePrice * i.quantity,
                      is_custom_price: false
                    }
                  })
                )
                setPriceEditItem(null)
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL 2: Discounts & Senior/PWD Modal (Desktop Parity F4) */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-stone-100">
                  Cart Discounts & Privileges (F4)
                </h3>
              </div>
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <DiscountsModalContent
              subtotal_c={subtotal_c}
              currentDiscountType={discountType}
              currentCustomDiscount_c={customDiscount_c}
              initialSeniorName={seniorName}
              initialSeniorId={seniorIdNumber}
              onApplySeniorPwd={(name, idNum) => {
                setSeniorName(name)
                setSeniorIdNumber(idNum)
                setDiscountType('SENIOR_PWD_20')
                setIsDiscountModalOpen(false)
              }}
              onApplyCustomDiscount={(amount_c) => {
                setCustomDiscount_c(amount_c)
                setDiscountType('CUSTOM')
                setIsDiscountModalOpen(false)
              }}
              onRemoveDiscount={() => {
                setDiscountType('NONE')
                setCustomDiscount_c(0)
                setSeniorName('')
                setSeniorIdNumber('')
                setIsDiscountModalOpen(false)
              }}
              onClose={() => setIsDiscountModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL 3: Suki / Customer Picker Modal (Desktop Parity F6) */}
      {isCustomerModalOpen && (
        <CustomerPickerModal
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={(c) => {
            setSelectedCustomerId(c ? c.id : null)
            setIsCustomerModalOpen(false)
          }}
          onClose={() => setIsCustomerModalOpen(false)}
        />
      )}

      {/* MODAL 4: Held Orders Modal (Desktop Parity F8) */}
      {isHeldModalOpen && (
        <HeldOrdersModal
          heldCarts={heldCarts}
          onResume={(held) => {
            onResumeCart(held)
            setIsHeldModalOpen(false)
          }}
          onDelete={async (id) => {
            await db.held_carts.delete(id)
            if (onRefreshData) await onRefreshData()
          }}
          onClose={() => setIsHeldModalOpen(false)}
        />
      )}

      {/* MODAL 5: Quick Cashier Calculator Modal (Desktop Parity F3) */}
      {isCalcModalOpen && (
        <QuickCalculatorModal
          cartTotal_c={grandTotal_c}
          onClose={() => setIsCalcModalOpen(false)}
        />
      )}

      {/* MODAL 6: Petty Cash Out / Expense Modal (Desktop Parity F7) */}
      {isExpenseModalOpen && (
        <QuickExpenseModal
          cashierName={cashierName}
          storeName={storeName}
          onSaved={async () => {
            if (onRefreshData) await onRefreshData()
            setIsExpenseModalOpen(false)
          }}
          onClose={() => setIsExpenseModalOpen(false)}
        />
      )}

      {/* MOBILE FLOATING CART SUMMARY BAR (< lg screens) */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-4 left-3 right-3 z-30 animate-fade-in">
          <div className="glass-panel p-2.5 rounded-2xl border border-emerald-500/40 bg-obsidian-950/95 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-2.5 text-left flex-1 min-w-0"
            >
              <div className="relative p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-stone-900 text-[10px] font-black font-mono">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                  Total Due ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                </span>
                <span className="text-base font-black font-mono text-emerald-400 block truncate">
                  {money(grandTotal_c)}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="btn-press px-3 py-2 rounded-xl bg-obsidian-900 border border-white/[0.08] text-xs font-bold text-stone-200"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, undefined, 'CASH')
                }}
                className="btn-press px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md shadow-emerald-950/40 flex items-center gap-1"
              >
                <span>Pay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE SLIDE-UP CART BOTTOM SHEET (< lg screens) */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-h-[88vh] bg-obsidian-900 border-t border-slate-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drawer Grab Bar & Header */}
            <div className="p-4 border-b border-white/[0.08] bg-obsidian-950 shrink-0">
              <div className="w-12 h-1.5 bg-stone-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base text-stone-100">
                    Order Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)} Items)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-obsidian-800 text-stone-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body - Scrollable Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Customer / Suki status */}
              <div className="flex items-center justify-between border border-white/[0.08] bg-obsidian-950/80 px-3 py-2 text-xs rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-stone-200 truncate">
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20"
                >
                  {selectedCustomer ? 'Change' : 'Select Suki'}
                </button>
              </div>

              {/* Cart Item Cards */}
              <div className="space-y-2">
                {cart.map((item) => {
                  const maxStock = products.find((p) => p.id === item.product.id)?.stock ?? item.product.stock
                  return (
                    <div
                      key={item.product.id}
                      className="p-3 rounded-xl border border-white/[0.06] bg-obsidian-950/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-stone-100 truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                          {money(item.unit_price_c)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center rounded-lg border border-white/[0.08] bg-obsidian-900 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-xs text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={item.quantity >= maxStock}
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-white disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-xs w-16 text-right">
                          {money(item.total_c)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="p-1.5 text-stone-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Discounts & Totals */}
              <div className="p-3.5 rounded-xl bg-obsidian-950 border border-white/[0.08] space-y-2 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-stone-200">{money(subtotal_c)}</span>
                </div>
                {discount_c > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">-{money(discount_c)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center">
                  <span className="font-bold text-stone-200 uppercase tracking-wider">Amount Due</span>
                  <span className="font-mono font-black text-xl text-emerald-400">{money(grandTotal_c)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Action Buttons */}
            <div className="p-4 border-t border-white/[0.08] bg-obsidian-950 shrink-0 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileCartOpen(false)
                  onCheckout(subtotal_c, discount_c, discountType, grandTotal_c, selectedCustomerId, undefined, 'CASH')
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <span>CHECKOUT NOW ({money(grandTotal_c)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// SUB-COMPONENT: PriceEditForm
// -------------------------------------------------------------
function PriceEditForm({
  item,
  onClose,
  onApplyPrice,
  onResetPrice
}: {
  item: CartItem
  onClose: () => void
  onApplyPrice: (price_c: number) => void
  onResetPrice: () => void
}): React.JSX.Element {
  const [val, setVal] = useState<string>((item.unit_price_c / 100).toFixed(2))
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const enteredPesos = parseFloat(val) || 0
  const enteredCents = Math.round(enteredPesos * 100)
  const baseCents = item.original_price_c || item.product.default_price_c
  const diffPesos = (baseCents - enteredCents) / 100
  const costPesos = (item.product.cost_c || 0) / 100
  const isBelowCost = costPesos > 0 && enteredPesos < costPesos

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(enteredPesos) || enteredPesos < 0) {
      setError('Please enter a valid price.')
      return
    }
    onApplyPrice(enteredCents)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="rounded-xl border border-white/[0.08] bg-obsidian-950 p-3 text-xs space-y-1.5 font-sans">
        <div className="flex justify-between items-center text-stone-300">
          <span>Original Price:</span>
          <span className="font-bold text-emerald-400 font-mono">{money(baseCents)}</span>
        </div>
        {costPesos > 0 && (
          <div className="flex justify-between items-center text-stone-400">
            <span>Purchase Cost:</span>
            <span className="font-medium text-stone-300 font-mono">{money(item.product.cost_c)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-stone-300">
          <span>Current Quantity:</span>
          <span className="font-semibold text-white font-mono">{item.quantity} {item.product.base_unit || 'pc'}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-300 mb-1">
          New Unit Price (₱)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500">₱</span>
          <input
            ref={inputRef}
            type="number"
            step="any"
            min="0"
            required
            value={val}
            onChange={(e) => {
              setVal(e.target.value)
              setError(null)
            }}
            placeholder="0.00"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-base font-bold text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {enteredPesos > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-obsidian-950/60 p-3 text-xs space-y-1">
          <div className="flex justify-between text-stone-300">
            <span>Unit Discount:</span>
            <span className={diffPesos > 0 ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
              {diffPesos > 0 ? `-₱${diffPesos.toFixed(2)} / pc` : diffPesos < 0 ? `+₱${Math.abs(diffPesos).toFixed(2)} / pc` : 'No discount'}
            </span>
          </div>
          <div className="flex justify-between text-stone-300">
            <span>New Line Subtotal ({item.quantity} {item.product.base_unit || 'pc'}):</span>
            <span className="font-bold text-emerald-300 font-mono text-sm">{money(enteredCents * item.quantity)}</span>
          </div>
        </div>
      )}

      {isBelowCost && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>Warning: ₱{enteredPesos.toFixed(2)} is lower than purchase cost ({money(item.product.cost_c)}).</span>
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        {item.is_custom_price ? (
          <button
            type="button"
            onClick={onResetPrice}
            className="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Reset to Base Price
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs text-stone-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs"
          >
            Apply Price
          </button>
        </div>
      </div>
    </form>
  )
}

// -------------------------------------------------------------
// SUB-COMPONENT: DiscountsModalContent (Senior/PWD + Custom)
// -------------------------------------------------------------
function DiscountsModalContent({
  subtotal_c,
  currentDiscountType,
  currentCustomDiscount_c,
  initialSeniorName,
  initialSeniorId,
  onApplySeniorPwd,
  onApplyCustomDiscount,
  onRemoveDiscount,
  onClose
}: {
  subtotal_c: number
  currentDiscountType: DiscountType
  currentCustomDiscount_c: number
  initialSeniorName: string
  initialSeniorId: string
  onApplySeniorPwd: (name: string, id: string) => void
  onApplyCustomDiscount: (amount_c: number) => void
  onRemoveDiscount: () => void
  onClose: () => void
}): React.JSX.Element {
  const [tab, setTab] = useState<'SENIOR_PWD' | 'CUSTOM'>(
    currentDiscountType === 'CUSTOM' ? 'CUSTOM' : 'SENIOR_PWD'
  )
  const [seniorName, setSeniorName] = useState(initialSeniorName)
  const [seniorId, setSeniorId] = useState(initialSeniorId)

  // Custom mode
  const [customMode, setCustomMode] = useState<'PERCENT' | 'PESOS'>('PERCENT')
  const [customPercent, setCustomPercent] = useState('10')
  const [customPesos, setCustomPesos] = useState(
    currentCustomDiscount_c > 0 ? (currentCustomDiscount_c / 100).toFixed(2) : ''
  )

  const senior20Discount_c = Math.round(subtotal_c * 0.20)
  const computedCustom_c =
    customMode === 'PERCENT'
      ? Math.round(subtotal_c * ((parseFloat(customPercent) || 0) / 100))
      : Math.min(subtotal_c, Math.round((parseFloat(customPesos) || 0) * 100))

  return (
    <div className="space-y-4 mt-4">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] gap-4">
        <button
          type="button"
          onClick={() => setTab('SENIOR_PWD')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === 'SENIOR_PWD'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Senior Citizen / PWD (20%)
        </button>
        <button
          type="button"
          onClick={() => setTab('CUSTOM')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === 'CUSTOM'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Custom Discount
        </button>
      </div>

      {tab === 'SENIOR_PWD' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!seniorId.trim()) {
              alert('Senior Citizen / PWD Booklet or ID Number is required by law.')
              return
            }
            onApplySeniorPwd(seniorName.trim(), seniorId.trim())
          }}
          className="space-y-3"
        >
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
            <span className="font-bold">Statutory 20% Privilege Discount:</span>
            <p className="mt-0.5 text-stone-300">
              Deducts 20% on the subtotal. Booklet/ID number will be printed on the official receipt.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Senior / PWD Full Name (Optional)
            </label>
            <input
              type="text"
              value={seniorName}
              onChange={(e) => setSeniorName(e.target.value)}
              placeholder="e.g. Maria Santos"
              className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs text-stone-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Booklet / OSCA / PWD ID Number *
            </label>
            <input
              type="text"
              required
              value={seniorId}
              onChange={(e) => setSeniorId(e.target.value)}
              placeholder="e.g. SC-123456 / PWD-8891"
              className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs text-stone-100 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950 border border-white/[0.08] text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400">
              <span>Cart Subtotal:</span>
              <span>{money(subtotal_c)}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>20% Privilege Discount:</span>
              <span>-{money(senior20Discount_c)}</span>
            </div>
            <div className="flex justify-between text-stone-200 font-bold pt-1 border-t border-white/[0.06]">
              <span>New Amount Due:</span>
              <span>{money(Math.max(0, subtotal_c - senior20Discount_c))}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {currentDiscountType !== 'NONE' ? (
              <button
                type="button"
                onClick={onRemoveDiscount}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Remove Discount
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs text-stone-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs"
              >
                Apply 20% Discount
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (computedCustom_c <= 0) {
              alert('Please enter a valid discount value.')
              return
            }
            onApplyCustomDiscount(computedCustom_c)
          }}
          className="space-y-3"
        >
          {/* Custom mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCustomMode('PERCENT')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                customMode === 'PERCENT'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-obsidian-950 text-stone-400 border-white/[0.08]'
              }`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => setCustomMode('PESOS')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                customMode === 'PESOS'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-obsidian-950 text-stone-400 border-white/[0.08]'
              }`}
            >
              Peso Amount (₱)
            </button>
          </div>

          {customMode === 'PERCENT' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5">
                {['5', '10', '15', '20'].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCustomPercent(pct)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold border ${
                      customPercent === pct
                        ? 'bg-emerald-500 text-obsidian-950 border-emerald-500'
                        : 'bg-obsidian-950 text-stone-300 border-white/[0.08]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Custom Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customPercent}
                  onChange={(e) => setCustomPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs text-stone-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Discount Amount in Pesos (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500">₱</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={customPesos}
                  onChange={(e) => setCustomPesos(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-obsidian-950 border border-white/[0.08] text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400">
              <span>Cart Subtotal:</span>
              <span>{money(subtotal_c)}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Discount to Deduct:</span>
              <span>-{money(computedCustom_c)}</span>
            </div>
            <div className="flex justify-between text-stone-200 font-bold pt-1 border-t border-white/[0.06]">
              <span>New Amount Due:</span>
              <span>{money(Math.max(0, subtotal_c - computedCustom_c))}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {currentDiscountType !== 'NONE' ? (
              <button
                type="button"
                onClick={onRemoveDiscount}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Remove Discount
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs text-stone-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs"
              >
                Apply Custom Discount
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// SUB-COMPONENT: CustomerPickerModal (Desktop Parity F6)
// -------------------------------------------------------------
function CustomerPickerModal({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onClose
}: {
  customers: Customer[]
  selectedCustomerId: number | null
  onSelectCustomer: (c: Customer | null) => void
  onClose: () => void
}): React.JSX.Element {
  const [q, setQ] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return customers
    const term = q.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.contact && c.contact.includes(term)) ||
        (c.notes && c.notes.toLowerCase().includes(term))
    )
  }, [customers, q])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (filtered.length > 0 ? Math.min(prev + 1, filtered.length - 1) : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (filtered.length > 0 ? Math.max(prev - 1, 0) : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0 && selectedIndex >= 0 && selectedIndex < filtered.length) {
        onSelectCustomer(filtered[selectedIndex])
      } else {
        onSelectCustomer(null)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-md bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-100">
              Select Customer Account (F6)
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-3 mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search customer name, phone, or balance..."
            className="w-full pl-9 pr-10 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs text-stone-100 focus:border-emerald-500 focus:outline-none"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-stone-500 border border-white/[0.1] px-1.5 py-0.5 rounded">
            F6
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-72">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-stone-500">No customers found.</p>
          ) : (
            filtered.map((c, idx) => {
              const isSelected = selectedCustomerId === c.id
              const isHighlighted = idx === selectedIndex
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                    isHighlighted
                      ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/50'
                      : isSelected
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-white/[0.06] bg-obsidian-950/60 hover:bg-obsidian-850'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-100 truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-400 font-mono">
                      {c.contact && <span>{c.contact}</span>}
                      {c.credit_limit_c !== undefined && <span>Limit: {money(c.credit_limit_c)}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border ${
                        c.balance_c > 0
                          ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {money(c.balance_c)}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] mt-3">
          <span className="text-[10px] text-stone-500 font-mono">
            ↑/↓ Select · Enter Choose · Esc Close
          </span>
          <button
            type="button"
            onClick={() => onSelectCustomer(null)}
            className="text-xs font-semibold text-stone-300 hover:text-white px-2 py-1 rounded-lg border border-white/[0.1] bg-obsidian-950"
          >
            Walk-in (No Credit)
          </button>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SUB-COMPONENT: HeldOrdersModal (Desktop Parity F8)
// -------------------------------------------------------------
function HeldOrdersModal({
  heldCarts,
  onResume,
  onDelete,
  onClose
}: {
  heldCarts: HeldCart[]
  onResume: (held: HeldCart) => void
  onDelete: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-100">
              Held Transactions Queue ({heldCarts.length})
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 max-h-96">
          {heldCarts.length === 0 ? (
            <p className="py-12 text-center text-xs text-stone-500">
              No transactions currently held in queue.
            </p>
          ) : (
            heldCarts.map((h) => {
              const totalC = h.items.reduce((s, i) => s + i.total_c, 0)
              const summary = h.items.map((i) => `${i.quantity}x ${i.product.name}`).slice(0, 3).join(', ')
              const timeStr = new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

              return (
                <div
                  key={h.id}
                  className="p-3 rounded-xl border border-white/[0.08] bg-obsidian-950 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {h.id}
                      </span>
                      <span className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeStr}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 truncate mt-1">
                      {h.items.length} item{h.items.length > 1 ? 's' : ''}: {summary}{h.items.length > 3 ? '...' : ''}
                    </p>
                    <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      {money(totalC)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onResume(h)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs flex items-center gap-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(h.id)}
                      className="p-1.5 rounded-xl text-stone-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Delete held ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs text-stone-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SUB-COMPONENT: QuickCalculatorModal (Desktop Parity F3)
// -------------------------------------------------------------
function QuickCalculatorModal({
  cartTotal_c,
  onClose
}: {
  cartTotal_c: number
  onClose: () => void
}): React.JSX.Element {
  const [display, setDisplay] = useState('0')
  const [prevVal, setPrevVal] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)

  // Change calculator
  const [tenderPesos, setTenderPesos] = useState<string>('')
  const tenderCents = Math.round((parseFloat(tenderPesos) || 0) * 100)
  const changeDue_c = Math.max(0, tenderCents - cartTotal_c)

  const handleNum = (n: string) => {
    setDisplay((prev) => (prev === '0' ? n : prev + n))
  }

  const handleOp = (nextOp: string) => {
    setPrevVal(parseFloat(display))
    setOp(nextOp)
    setDisplay('0')
  }

  const handleEquals = () => {
    if (prevVal === null || !op) return
    const cur = parseFloat(display)
    let res = 0
    if (op === '+') res = prevVal + cur
    if (op === '-') res = prevVal - cur
    if (op === '×') res = prevVal * cur
    if (op === '÷') res = cur !== 0 ? prevVal / cur : 0
    setDisplay(String(Math.round(res * 100) / 100))
    setPrevVal(null)
    setOp(null)
  }

  const handleClear = () => {
    setDisplay('0')
    setPrevVal(null)
    setOp(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-100">
              Cashier Calculator & Change Assistant (F3)
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Change Assistant Box */}
        {cartTotal_c > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-obsidian-950 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex justify-between items-center text-stone-400">
              <span>Cart Amount:</span>
              <span className="font-bold text-stone-100 font-mono text-sm">{money(cartTotal_c)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Tender:</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold">₱</span>
                <input
                  type="number"
                  value={tenderPesos}
                  onChange={(e) => setTenderPesos(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-1 rounded-lg bg-obsidian-900 border border-white/[0.1] text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            {tenderCents >= cartTotal_c && tenderCents > 0 && (
              <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.06] text-emerald-400 font-bold">
                <span>Change Due:</span>
                <span className="text-base font-black font-mono">{money(changeDue_c)}</span>
              </div>
            )}
          </div>
        )}

        {/* Calculator Display */}
        <div className="mt-3 p-3 rounded-xl bg-obsidian-950 border border-white/[0.1] text-right font-mono text-2xl font-black text-white">
          {display}
        </div>

        {/* Calculator Keypad */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {['C', '÷', '×', '-'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => (k === 'C' ? handleClear() : handleOp(k))}
              className="py-2.5 rounded-xl font-mono font-bold text-sm bg-obsidian-950 border border-white/[0.08] text-amber-300 hover:bg-obsidian-850"
            >
              {k}
            </button>
          ))}
          {['7', '8', '9', '+'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => (k === '+' ? handleOp(k) : handleNum(k))}
              className={`py-2.5 rounded-xl font-mono font-bold text-sm ${
                k === '+'
                  ? 'bg-obsidian-950 border border-white/[0.08] text-amber-300 hover:bg-obsidian-850'
                  : 'bg-obsidian-950 border border-white/[0.06] text-white hover:bg-obsidian-850'
              }`}
            >
              {k}
            </button>
          ))}
          {['4', '5', '6', '='].map((k, idx) => (
            <button
              key={k}
              type="button"
              onClick={() => (k === '=' ? handleEquals() : handleNum(k))}
              className={`py-2.5 rounded-xl font-mono font-bold text-sm ${
                k === '='
                  ? 'row-span-2 bg-emerald-500 text-obsidian-950 hover:bg-emerald-400 font-black'
                  : 'bg-obsidian-950 border border-white/[0.06] text-white hover:bg-obsidian-850'
              }`}
            >
              {k}
            </button>
          ))}
          {['1', '2', '3'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleNum(k)}
              className="py-2.5 rounded-xl font-mono font-bold text-sm bg-obsidian-950 border border-white/[0.06] text-white hover:bg-obsidian-850"
            >
              {k}
            </button>
          ))}
          {['0', '00', '.'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => (k === '.' ? handleNum(display.includes('.') ? '' : '.') : handleNum(k))}
              className="py-2.5 rounded-xl font-mono font-bold text-sm bg-obsidian-950 border border-white/[0.06] text-white hover:bg-obsidian-850"
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SUB-COMPONENT: QuickExpenseModal (Desktop Parity F7)
// -------------------------------------------------------------
function QuickExpenseModal({
  cashierName,
  storeName,
  onSaved,
  onClose
}: {
  cashierName: string
  storeName: string
  onSaved: () => void
  onClose: () => void
}): React.JSX.Element {
  const [category, setCategory] = useState('Supplies & Packaging')
  const [amountPesos, setAmountPesos] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amountPesos) || 0
    if (amt <= 0) {
      alert('Please enter a valid expense amount.')
      return
    }

    setIsSubmitting(true)
    try {
      const exp: Expense = {
        category,
        amount_c: Math.round(amt * 100),
        date: new Date().toISOString().split('T')[0],
        description: description.trim() || category,
        cashier_name: cashierName,
        store_name: storeName,
        created_at: new Date().toISOString()
      }
      await db.expenses.add(exp)
      playCheckoutChime()
      onSaved()
    } catch (err) {
      console.error('Failed to record expense:', err)
      alert('Failed to save expense.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-stone-100">
              Record Petty Cash Out (F7)
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Expense Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs text-stone-100 focus:border-rose-500 focus:outline-none"
            >
              <option value="Supplies & Packaging">Supplies & Packaging (Plastic, Tape, Paper)</option>
              <option value="Store Meals & Snacks">Store Meals & Snacks</option>
              <option value="Transportation / Fare">Transportation / Tricycle / Fare</option>
              <option value="Utilities & Electricity">Utilities, Electricity & Load</option>
              <option value="Repairs & Maintenance">Repairs & Maintenance</option>
              <option value="Inventory Restock Advance">Inventory Restock Advance</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Amount to Deduct from Cash Float (₱) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500">₱</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amountPesos}
                onChange={(e) => setAmountPesos(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-base font-bold text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Description / Reason
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bought 2 bundles plastic sando bags"
              className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.1] text-xs text-stone-100 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-obsidian-950 border border-white/[0.06] text-[11px] text-stone-400 flex justify-between">
            <span>Authorizing Cashier:</span>
            <span className="font-semibold text-stone-200">{cashierName}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs text-stone-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              {isSubmitting ? 'Recording...' : 'Record Cash Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
