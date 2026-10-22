import React, { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent } from 'react'
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
  Layers,
  History,
  Sparkles,
  Check,
  Printer,
  Tag,
  DollarSign,
  TrendingUp,
  Boxes,
  Truck,
  Calendar,
  Clock,
  Download,
  Filter,
  ArrowUpDown,
  Grid,
  List,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Archive,
  BarChart2,
  Crown,
  Store
} from 'lucide-react'
import type { Product, Category, RestockLog, RestockType, PriceReference, Supplier } from '../types'
import { money, formatDateTime, formatShortDate } from '../utils/format'
import { compressImageFile } from '../utils/image'
import { findSuggestedPrice, getSrpComparison } from '../utils/srp'
import { syncOnlinePriceCatalog } from '../services/onlinePriceSync'
import { db } from '../db'
import { PriceTagPrintModal } from './PriceTagPrintModal'
import { StoreUseModal } from './StoreUseModal'
import { canAddProduct, isVipActive, FREE_TIER_LIMITS } from '../utils/vip'

type InventoryTab = 'CATALOG' | 'REORDER' | 'BATCH_IN' | 'EXPIRATION' | 'HISTORY'
type CatalogFilter = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'HIGH_MARGIN' | 'NO_BARCODE' | 'NO_PHOTO'
type CatalogSort = 'NAME_ASC' | 'NAME_DESC' | 'STOCK_ASC' | 'STOCK_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'MARGIN_DESC'

interface BatchInItem {
  product: Product
  unitType: 'PIECES' | 'CASES'
  quantity: number
  newCostPeso?: number
  expirationDate?: string
}

interface InventoryScreenProps {
  products: Product[]
  categories: Category[]
  onRefresh: () => void
  cashierName?: string
  storeName?: string
  onOpenVipUpgrade?: () => void
}

export function InventoryScreen({
  products,
  categories,
  onRefresh,
  cashierName,
  storeName = 'PLATFORM_HQ',
  onOpenVipUpgrade
}: InventoryScreenProps): React.JSX.Element {
  // Navigation & Active View Tabs
  const [activeTab, setActiveTab] = useState<InventoryTab>('CATALOG')
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE')

  // Search, Filters & Sorting
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL')
  const [selectedSubCat, setSelectedSubCat] = useState<number | 'ALL'>('ALL')
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>('ALL')
  const [activeSort, setActiveSort] = useState<CatalogSort>('NAME_ASC')

  // Product Modal state
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)

  // Data collections from Dexie
  const [restockLogs, setRestockLogs] = useState<RestockLog[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [priceReferences, setPriceReferences] = useState<PriceReference[]>([])
  const [autoMatching, setAutoMatching] = useState(false)

  // CT-221B Label Studio Modal
  const [priceTagModalOpen, setPriceTagModalOpen] = useState(false)
  const [productToPrint, setProductToPrint] = useState<Product | null>(null)

  // Store Use & Spoilage Write-Off Modal
  const [isStoreUseOpen, setIsStoreUseOpen] = useState(false)

  // Batch Receiving (Quick Stock-In) State
  const [batchItems, setBatchItems] = useState<BatchInItem[]>([])
  const [batchScanQuery, setBatchScanQuery] = useState('')
  const [batchDeliveryNote, setBatchDeliveryNote] = useState('')
  const [batchSupplierId, setBatchSupplierId] = useState<number | ''>('')
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false)

  // History Tab Filter
  const [historySearch, setHistorySearch] = useState('')
  const [historyTypeFilter, setHistoryTypeFilter] = useState<RestockType | 'ALL'>('ALL')

  // Dual photo inputs
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Main + Sub category options
  const mainCategories = useMemo(() => categories.filter((c) => c.parent_id === null), [categories])
  const subCategories = useMemo(
    () => (selectedCat === 'ALL' ? [] : categories.filter((c) => c.parent_id === selectedCat)),
    [categories, selectedCat]
  )

  // Load Price References and Suppliers from Dexie
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [refs, sups] = await Promise.all([
          db.price_references.toArray(),
          db.suppliers.toArray()
        ])
        setPriceReferences(refs)
        setSuppliers(sups)
      } catch (e) {
        console.error('Failed to load aux inventory data:', e)
      }
    }
    void loadAuxData()
  }, [])

  // Live restocking history from Dexie
  const loadRestockLogs = useCallback(async () => {
    try {
      const logs = await db.restock_logs.orderBy('timestamp').reverse().toArray()
      const scopedLogs = logs.filter(
        (l) => l.store_name === storeName || (!l.store_name && storeName === 'PLATFORM_HQ')
      )
      setRestockLogs(scopedLogs)
    } catch {
      setRestockLogs([])
    }
  }, [storeName])

  useEffect(() => {
    void loadRestockLogs()
  }, [loadRestockLogs])

  const logRestock = async (
    product: Product,
    quantity: number,
    type: RestockType,
    beforeStock: number,
    afterStock: number,
    note: string | null
  ): Promise<void> => {
    await db.restock_logs.add({
      product_id: product.id,
      product_name: product.name,
      quantity,
      type,
      before_stock: beforeStock,
      after_stock: afterStock,
      note,
      timestamp: new Date().toISOString(),
      cashier_name: cashierName || 'Inventory Lead',
      store_name: storeName
    })
  }

  // --------------------------------------------------------------------------
  // EXECUTIVE INVENTORY KPIS & METRICS
  // --------------------------------------------------------------------------
  const metrics = useMemo(() => {
    let totalRetailValCents = 0
    let totalWholesaleCostCents = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let expiringSoonCount = 0

    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    for (const p of products) {
      const qty = Math.max(0, p.stock || 0)
      totalRetailValCents += qty * (p.default_price_c || 0)
      totalWholesaleCostCents += qty * (p.cost_c || 0)

      const threshold = p.low_stock_threshold ?? 5
      if (qty <= 0) {
        outOfStockCount++
      } else if (qty <= threshold) {
        lowStockCount++
      }

      if (p.expiration_date) {
        const expDate = new Date(p.expiration_date)
        if (!isNaN(expDate.getTime()) && expDate <= thirtyDaysFromNow) {
          expiringSoonCount++
        }
      }
    }

    const grossMarginPercent =
      totalRetailValCents > 0
        ? Math.round(((totalRetailValCents - totalWholesaleCostCents) / totalRetailValCents) * 100)
        : 0

    return {
      totalRetailValCents,
      totalWholesaleCostCents,
      grossMarginPercent,
      lowStockCount,
      outOfStockCount,
      expiringSoonCount,
      totalSkus: products.length
    }
  }, [products])

  // --------------------------------------------------------------------------
  // FILTERED & SORTED CATALOG
  // --------------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCat !== 'ALL' && p.category_id !== selectedCat) return false
        if (selectedSubCat !== 'ALL' && p.subcategory_id !== selectedSubCat) return false

        // Quick Status Filter
        const threshold = p.low_stock_threshold ?? 5
        if (activeFilter === 'LOW_STOCK' && (p.stock > threshold || p.stock <= 0)) return false
        if (activeFilter === 'OUT_OF_STOCK' && p.stock > 0) return false
        if (activeFilter === 'NO_BARCODE' && p.barcode && p.barcode.trim() !== '') return false
        if (activeFilter === 'NO_PHOTO' && p.image_path) return false
        if (activeFilter === 'HIGH_MARGIN') {
          const margin = p.default_price_c > 0 ? ((p.default_price_c - p.cost_c) / p.default_price_c) * 100 : 0
          if (margin < 30) return false
        }

        // Text Search
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.includes(q)
        )
      })
      .sort((a, b) => {
        switch (activeSort) {
          case 'NAME_ASC':
            return a.name.localeCompare(b.name)
          case 'NAME_DESC':
            return b.name.localeCompare(a.name)
          case 'STOCK_ASC':
            return a.stock - b.stock
          case 'STOCK_DESC':
            return b.stock - a.stock
          case 'PRICE_ASC':
            return a.default_price_c - b.default_price_c
          case 'PRICE_DESC':
            return b.default_price_c - a.default_price_c
          case 'MARGIN_DESC': {
            const marginA = a.default_price_c > 0 ? (a.default_price_c - a.cost_c) / a.default_price_c : 0
            const marginB = b.default_price_c > 0 ? (b.default_price_c - b.cost_c) / b.default_price_c : 0
            return marginB - marginA
          }
          default:
            return 0
        }
      })
  }, [products, selectedCat, selectedSubCat, activeFilter, activeSort, search])

  // Reorder procurement items list
  const reorderList = useMemo(() => {
    return products.filter((p) => {
      const threshold = p.low_stock_threshold ?? 5
      return p.stock <= threshold
    })
  }, [products])

  // Expiration items list
  const expirationList = useMemo(() => {
    return products
      .filter((p) => Boolean(p.expiration_date))
      .sort((a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime())
  }, [products])

  // Filtered Restock Logs
  const filteredRestockLogs = useMemo(() => {
    return restockLogs.filter((log) => {
      if (historyTypeFilter !== 'ALL' && log.type !== historyTypeFilter) return false
      if (!historySearch.trim()) return true
      const q = historySearch.toLowerCase()
      return (
        log.product_name.toLowerCase().includes(q) ||
        log.cashier_name.toLowerCase().includes(q) ||
        (log.note && log.note.toLowerCase().includes(q))
      )
    })
  }, [restockLogs, historyTypeFilter, historySearch])

  // --------------------------------------------------------------------------
  // ACTIONS: Photo Picker, Adjust, Save, Delete
  // --------------------------------------------------------------------------
  const handlePhotoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageBusy(true)
    try {
      const dataUrl = await compressImageFile(file, 360, 360, 0.85)
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
      supplier_id: editingProduct.supplier_id ? Number(editingProduct.supplier_id) : null,
      base_unit: editingProduct.base_unit || 'piece',
      pieces_per_case: editingProduct.pieces_per_case ? Number(editingProduct.pieces_per_case) : null,
      cost_c: Math.round((Number(editingProduct.cost_c) || 0) * 100),
      default_price_c: Math.round((Number(editingProduct.default_price_c) || 0) * 100),
      suggested_price_c:
        editingProduct.suggested_price_c !== undefined &&
        editingProduct.suggested_price_c !== null &&
        editingProduct.suggested_price_c !== ('' as any)
          ? Math.round(Number(editingProduct.suggested_price_c) * 100)
          : null,
      stock: Number(editingProduct.stock) || 0,
      low_stock_threshold: editingProduct.low_stock_threshold ? Number(editingProduct.low_stock_threshold) : 5,
      expiration_date: editingProduct.expiration_date?.trim() || null,
      image_path: editingProduct.image_path || null,
      status: 'ACTIVE' as const,
      store_name: editingProduct.store_name || storeName,
      created_at: editingProduct.created_at || now,
      updated_at: now
    }

    if (editingProduct.id) {
      const existing = products.find((p) => p.id === editingProduct.id)
      await db.products.update(editingProduct.id, payload)
      if (existing && payload.stock !== existing.stock) {
        await logRestock(
          existing,
          payload.stock - existing.stock,
          'ADJUSTMENT',
          existing.stock,
          payload.stock,
          'Direct adjustment in product catalog form'
        )
      }
    } else {
      await db.products.add(payload as Product)
    }

    setModalOpen(false)
    setEditingProduct(null)
    await loadRestockLogs()
    onRefresh()
  }

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await db.products.delete(id)
      onRefresh()
    }
  }

  const handleAdjustStock = async (product: Product, delta: number) => {
    const beforeStock = product.stock
    const newStock = Math.max(0, beforeStock + delta)
    const applied = newStock - beforeStock
    if (applied !== 0) {
      await db.products.update(product.id, { stock: newStock, updated_at: new Date().toISOString() })
      await logRestock(product, applied, applied > 0 ? 'RESTOCK' : 'ADJUSTMENT', beforeStock, newStock, null)
      await loadRestockLogs()
      onRefresh()
    }
  }

  // Quick Restock Case / Box Conversion
  const handleQuickAddCase = async (product: Product) => {
    const caseRatio = product.pieces_per_case || 12
    await handleAdjustStock(product, caseRatio)
  }

  // 1-Click Auto-match all products in inventory with DTI & Market SRP
  const handleAutoMatchAllSrp = async () => {
    setAutoMatching(true)
    try {
      let latestRefs = priceReferences
      try {
        await syncOnlinePriceCatalog()
        latestRefs = await db.price_references.toArray()
        setPriceReferences(latestRefs)
      } catch (e) {
        console.warn('Online sync skipped during auto-match:', e)
      }

      let matchedCount = 0
      for (const p of products) {
        if (!p.suggested_price_c) {
          const ref = findSuggestedPrice(p, latestRefs)
          if (ref && ref.market_price_c) {
            await db.products.update(p.id, {
              suggested_price_c: ref.market_price_c,
              updated_at: new Date().toISOString()
            })
            matchedCount++
          }
        }
      }
      onRefresh()
      alert(`Auto-matched ${matchedCount} product(s) to official DTI Suggested Retail Prices!`)
    } finally {
      setAutoMatching(false)
    }
  }

  // Export Inventory Count Sheet to CSV
  const handleExportInventoryCsv = () => {
    if (products.length === 0) {
      alert('No products available to export.')
      return
    }

    const headers = [
      'ID',
      'Product Name',
      'Barcode',
      'SKU',
      'Category',
      'Cost (PHP)',
      'Selling Price (PHP)',
      'SRP (PHP)',
      'Current Stock',
      'Unit',
      'Supplier',
      'Expiration Date'
    ]

    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id)?.name || 'Uncategorized'
      const sup = suppliers.find((s) => s.id === p.supplier_id)?.name || 'None'
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.barcode || ''}"`,
        `"${p.sku || ''}"`,
        `"${cat}"`,
        (p.cost_c / 100).toFixed(2),
        (p.default_price_c / 100).toFixed(2),
        p.suggested_price_c ? (p.suggested_price_c / 100).toFixed(2) : '',
        p.stock,
        `"${p.base_unit}"`,
        `"${sup}"`,
        p.expiration_date || ''
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `tinda-inventory-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Procurement Reorder PO to CSV
  const handleExportReorderCsv = () => {
    if (reorderList.length === 0) {
      alert('Great news! There are currently no low-stock or out-of-stock items needing procurement.')
      return
    }

    const headers = [
      'Product Name',
      'Barcode',
      'Current Stock',
      'Suggested Order Qty',
      'Unit Cost (PHP)',
      'Estimated PO Total (PHP)',
      'Supplier',
      'Supplier Phone'
    ]

    const rows = reorderList.map((p) => {
      const sup = suppliers.find((s) => s.id === p.supplier_id)
      const suggestedQty = Math.max(10, (p.low_stock_threshold || 5) * 3 - p.stock)
      const estimatedTotal = ((suggestedQty * p.cost_c) / 100).toFixed(2)
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.barcode || ''}"`,
        p.stock,
        suggestedQty,
        (p.cost_c / 100).toFixed(2),
        estimatedTotal,
        `"${sup?.name || 'Unassigned'}"`,
        `"${sup?.phone || ''}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `tinda-reorder-po-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --------------------------------------------------------------------------
  // BATCH RECEIVING / FAST STOCK-IN WORKFLOW
  // --------------------------------------------------------------------------
  const handleAddProductToBatch = (product: Product) => {
    const existingIndex = batchItems.findIndex((item) => item.product.id === product.id)
    if (existingIndex >= 0) {
      setBatchItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      setBatchItems((prev) => [
        ...prev,
        {
          product,
          unitType: 'PIECES',
          quantity: 1,
          newCostPeso: product.cost_c > 0 ? product.cost_c / 100 : undefined,
          expirationDate: product.expiration_date || undefined
        }
      ])
    }
    setBatchScanQuery('')
  }

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchScanQuery.trim()) return
    const q = batchScanQuery.trim().toLowerCase()
    const matched = products.find(
      (p) => p.barcode === q || p.sku?.toLowerCase() === q || p.name.toLowerCase().includes(q)
    )
    if (matched) {
      handleAddProductToBatch(matched)
    } else {
      alert(`No product found matching barcode or name: "${batchScanQuery}"`)
    }
  }

  const handleCommitBatchStockIn = async () => {
    if (batchItems.length === 0) return
    setIsSubmittingBatch(true)

    try {
      const now = new Date().toISOString()
      const supplierName = suppliers.find((s) => s.id === Number(batchSupplierId))?.name || null

      for (const item of batchItems) {
        const p = item.product
        const caseMultiplier = item.unitType === 'CASES' ? p.pieces_per_case || 12 : 1
        const deltaPieces = item.quantity * caseMultiplier
        const beforeStock = p.stock
        const afterStock = beforeStock + deltaPieces

        const updates: Partial<Product> = {
          stock: afterStock,
          updated_at: now
        }

        if (item.newCostPeso && item.newCostPeso > 0) {
          updates.cost_c = Math.round(item.newCostPeso * 100)
        }
        if (item.expirationDate) {
          updates.expiration_date = item.expirationDate
        }
        if (batchSupplierId) {
          updates.supplier_id = Number(batchSupplierId)
        }

        await db.products.update(p.id, updates)

        const note = [
          supplierName ? `Supplier: ${supplierName}` : null,
          item.unitType === 'CASES' ? `Received ${item.quantity} case(s) (${caseMultiplier} pcs/case)` : null,
          batchDeliveryNote ? `Note: ${batchDeliveryNote}` : null
        ]
          .filter(Boolean)
          .join(' · ')

        await logRestock(p, deltaPieces, 'RESTOCK', beforeStock, afterStock, note || 'Batch Inward Delivery')
      }

      await loadRestockLogs()
      onRefresh()
      setBatchItems([])
      setBatchDeliveryNote('')
      setBatchSupplierId('')
      alert(`Successfully received delivery batch of ${batchItems.length} product(s)!`)
    } catch (err) {
      console.error('Failed to commit batch stock in:', err)
      alert('Error recording batch delivery. Please check logs.')
    } finally {
      setIsSubmittingBatch(false)
    }
  }

  // Detect local match while typing in modal
  const detectedSrp = editingProduct ? findSuggestedPrice(editingProduct, priceReferences) : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 select-none">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. HEADER & GLOBAL ACTIONS BAR
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-emerald-400" />
              <span>Inventory &amp; Stock Hub</span>
            </h2>
            <span className="text-[0.6875rem] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              Pro Stock Engine
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Real-time stock valuation, wholesale receiving, DTI SRP compliance, and expiry radar
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto-Match DTI SRP Button */}
          <button
            onClick={handleAutoMatchAllSrp}
            disabled={autoMatching}
            className="btn-press flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs shadow-sm transition-all"
            title="Auto-match catalog items with official DTI suggested retail prices"
          >
            <Sparkles className={`h-4 w-4 text-amber-300 ${autoMatching ? 'animate-spin' : ''}`} />
            <span>{autoMatching ? 'Matching SRP...' : 'Match DTI SRP'}</span>
          </button>

          {/* Export Count Sheet */}
          <button
            onClick={handleExportInventoryCsv}
            className="btn-press flex items-center gap-1.5 px-3 py-2 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 border border-slate-800 text-stone-300 font-bold text-xs shadow-sm transition-all"
            title="Export CSV inventory count sheet"
          >
            <Download className="h-3.5 w-3.5 text-stone-400" />
            <span>Export CSV</span>
          </button>

          {/* Print CT-221B Price Tags */}
          <button
            onClick={() => {
              setProductToPrint(null)
              setPriceTagModalOpen(true)
            }}
            className="btn-press flex items-center gap-2 px-3 py-2 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 border border-emerald-500/30 text-emerald-400 font-bold text-xs shadow-sm transition-all"
            title="Print barcode labels using Chiteng CT-221B (Clabel)"
          >
            <Printer className="h-4 w-4 text-emerald-400" />
            <span>CT-221B Studio</span>
          </button>

          {/* Store Use & Spoilage Write-Off Button */}
          <button
            type="button"
            onClick={() => setIsStoreUseOpen(true)}
            className="btn-press flex items-center gap-2 px-3 py-2 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 border border-rose-500/30 text-rose-300 font-bold text-xs shadow-sm transition-all cursor-pointer"
            title="Record Store Use, Staff Consumption, or Spoilage / Damage Write-Offs"
          >
            <Store className="h-4 w-4 text-rose-400" />
            <span>Store Use / Write-Off</span>
          </button>

          {/* Add New Product Button */}
          <button
            onClick={() => {
              if (!canAddProduct(products.length)) {
                if (
                  confirm(
                    `Free Community Edition is limited to ${FREE_TIER_LIMITS.MAX_PRODUCTS} products.\n\nWould you like to unlock unlimited products with VIP Pro Lifetime for only ₱500?`
                  )
                ) {
                  onOpenVipUpgrade?.()
                }
                return
              }
              setEditingProduct({
                name: '',
                sku: '',
                barcode: '',
                category_id: categories[0]?.id || null,
                base_unit: 'piece',
                pieces_per_case: 24,
                cost_c: 0,
                default_price_c: 0,
                suggested_price_c: undefined,
                stock: 10,
                low_stock_threshold: 5,
                image_path: null
              })
              setModalOpen(true)
            }}
            className="btn-press flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs shadow-glow-emerald"
          >
            <Plus className="h-4 w-4" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* VIP Community Edition Limit Banner */}
      {!isVipActive() && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-obsidian-900 to-obsidian-950 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Crown className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-stone-100 block truncate">
                Free Community Edition: {products.length} / {FREE_TIER_LIMITS.MAX_PRODUCTS} Products
              </span>
              <span className="text-[11px] text-amber-400/80 block font-mono">
                {products.length >= FREE_TIER_LIMITS.MAX_PRODUCTS
                  ? 'Limit reached. Upgrade to VIP Pro to add unlimited products.'
                  : `${FREE_TIER_LIMITS.MAX_PRODUCTS - products.length} product slots remaining before upgrade.`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenVipUpgrade}
            className="btn-press px-3 py-1.5 rounded-xl bg-amber-500 text-obsidian-950 font-bold text-xs shrink-0 shadow-glow-amber hover:bg-amber-400 transition"
          >
            Upgrade to VIP Pro
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          2. EXECUTIVE INVENTORY VALUATION & KPI STRIP
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Valuation */}
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-emerald-500/25 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider font-mono">
              Total Retail Value
            </p>
            <p className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-1">
              {money(metrics.totalRetailValCents)}
            </p>
            <p className="text-[0.6875rem] text-stone-500 font-mono mt-1">
              Cost: {money(metrics.totalWholesaleCostCents)} · <span className="text-emerald-400 font-bold">+{metrics.grossMarginPercent}% Margin</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Active Catalog Breakdown */}
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider font-mono">
              Product Catalog
            </p>
            <p className="text-xl sm:text-2xl font-mono font-black text-stone-100 mt-1">
              {metrics.totalSkus} <span className="text-xs font-sans text-stone-400 font-medium">SKUs</span>
            </p>
            <p className="text-[0.6875rem] text-stone-500 mt-1">
              Across <strong className="text-stone-300">{categories.length}</strong> categories
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-stone-300">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Procurement & Reorder Radar */}
        <div
          onClick={() => setActiveTab('REORDER')}
          className="p-4 rounded-2xl bg-obsidian-900 border border-rose-500/30 shadow-lg flex items-center justify-between cursor-pointer hover:border-rose-400/60 transition-all group"
        >
          <div>
            <p className="text-[0.6875rem] font-bold text-rose-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>Reorder Radar</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-mono font-black text-rose-400">
                {metrics.lowStockCount + metrics.outOfStockCount}
              </span>
              <span className="text-[0.6875rem] text-rose-300/80 font-mono">Items Need Stock</span>
            </div>
            <p className="text-[0.6875rem] text-stone-500 mt-1 font-mono">
              <span className="text-rose-400 font-bold">{metrics.outOfStockCount} Out</span> ·{' '}
              <span className="text-amber-400 font-bold">{metrics.lowStockCount} Low</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Expiration Radar */}
        <div
          onClick={() => setActiveTab('EXPIRATION')}
          className="p-4 rounded-2xl bg-obsidian-900 border border-amber-500/30 shadow-lg flex items-center justify-between cursor-pointer hover:border-amber-400/60 transition-all group"
        >
          <div>
            <p className="text-[0.6875rem] font-bold text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>Expiry Radar (30D)</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-400">
                {metrics.expiringSoonCount}
              </span>
              <span className="text-[0.6875rem] text-amber-300/80 font-mono">Perishables</span>
            </div>
            <p className="text-[0.6875rem] text-stone-500 mt-1">
              Track FIFO batch expirations
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. WORKSPACE NAVIGATION TABS
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'CATALOG'
              ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
              : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REORDER')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'REORDER'
              ? 'bg-rose-500 text-white shadow-glow-rose'
              : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reorder Radar ({reorderList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BATCH_IN')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'BATCH_IN'
              ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
              : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Fast Stock-In (Delivery)</span>
        </button>

        <button
          onClick={() => setActiveTab('EXPIRATION')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'EXPIRATION'
              ? 'bg-amber-500 text-obsidian-950 shadow-glow-amber'
              : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Expiration Tracker ({expirationList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'bg-indigo-500 text-obsidian-950 shadow-lg'
              : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Audit Trail ({restockLogs.length})</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1: PRODUCT CATALOG WORKSPACE
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          {/* Search, Filter Chips & View Mode Bar */}
          <div className="p-4 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search item name, barcode (EAN/UPC), or SKU..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-medium text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Sorting Dropdown */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                <div className="relative flex-1 md:flex-initial">
                  <select
                    value={activeSort}
                    onChange={(e) => setActiveSort(e.target.value as CatalogSort)}
                    className="w-full md:w-44 px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-300 text-xs font-medium outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="NAME_ASC">Name (A-Z)</option>
                    <option value="NAME_DESC">Name (Z-A)</option>
                    <option value="STOCK_ASC">Stock (Lowest First)</option>
                    <option value="STOCK_DESC">Stock (Highest First)</option>
                    <option value="PRICE_DESC">Price (Highest First)</option>
                    <option value="PRICE_ASC">Price (Lowest First)</option>
                    <option value="MARGIN_DESC">Margin % (Highest)</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-obsidian-950 border border-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('TABLE')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'TABLE' ? 'bg-emerald-500/20 text-emerald-400' : 'text-stone-500 hover:text-stone-300'
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('GRID')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'GRID' ? 'bg-emerald-500/20 text-emerald-400' : 'text-stone-500 hover:text-stone-300'
                    }`}
                    title="Grid Card View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Filter Status Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider shrink-0 font-mono">
                Status:
              </span>
              {(
                [
                  { id: 'ALL', label: `All (${products.length})` },
                  { id: 'LOW_STOCK', label: `Low Stock (${metrics.lowStockCount})` },
                  { id: 'OUT_OF_STOCK', label: `Out of Stock (${metrics.outOfStockCount})` },
                  { id: 'HIGH_MARGIN', label: 'High Margin (>30%)' },
                  { id: 'NO_BARCODE', label: 'Missing Barcode' },
                  { id: 'NO_PHOTO', label: 'Missing Photo' }
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                    activeFilter === chip.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-obsidian-950 text-stone-400 border border-slate-800 hover:text-stone-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-white/[0.06] pt-3">
              <span className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider shrink-0 font-mono">
                Category:
              </span>
              <button
                onClick={() => {
                  setSelectedCat('ALL')
                  setSelectedSubCat('ALL')
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCat === 'ALL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-obsidian-950 text-stone-400 border border-slate-800 hover:text-stone-200'
                }`}
              >
                All Categories
              </button>
              {mainCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCat(c.id)
                    setSelectedSubCat('ALL')
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCat === c.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-obsidian-950 text-stone-400 border border-slate-800 hover:text-stone-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Subcategory row if available */}
            {subCategories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-white/[0.04] pt-2">
                <span className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider shrink-0 font-mono">
                  Subcategory:
                </span>
                <button
                  onClick={() => setSelectedSubCat('ALL')}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedSubCat === 'ALL'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  All {categories.find((c) => c.id === selectedCat)?.name ?? ''}
                </button>
                {subCategories.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubCat(s.id)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedSubCat === s.id
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Catalog Output: Table vs Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-obsidian-900 border border-slate-800 space-y-2">
              <Package className="w-12 h-12 text-stone-600 mx-auto" />
              <p className="text-base font-bold text-stone-300">No products found</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No items match your active search or filter criteria. Try adjusting your search query or reset filters.
              </p>
            </div>
          ) : viewMode === 'TABLE' ? (
            /* Table Mode with Dual Mobile Card Feed */
            <div className="space-y-3">
              {/* Mobile Card Feed (<768px) */}
              <div className="md:hidden space-y-3">
                {filteredProducts.map((p) => {
                  const threshold = p.low_stock_threshold ?? 5
                  const isLow = p.stock <= threshold && p.stock > 0
                  const isOut = p.stock <= 0
                  const cat = categories.find((c) => c.id === p.category_id)
                  const marginPercent =
                    p.default_price_c > 0
                      ? Math.round(((p.default_price_c - p.cost_c) / p.default_price_c) * 100)
                      : 0

                  return (
                    <div key={p.id} className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 space-y-3 shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-obsidian-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {p.image_path ? (
                            <img src={p.image_path} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 text-stone-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-stone-100 text-sm truncate">{p.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-stone-400">
                            <span className="text-emerald-400 font-bold">{p.barcode || p.sku || 'No Barcode'}</span>
                            {cat && <span className="text-stone-500 truncate max-w-[100px]">· {cat.name}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black font-serif text-emerald-400">{money(p.default_price_c)}</span>
                            <span className="text-xs text-stone-500 font-mono">Cost: {money(p.cost_c)}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold">
                              {marginPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stepper with 44px Minimum Touch Targets */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-1.5 bg-obsidian-950 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(p, -1)}
                            className="h-10 w-10 rounded-lg bg-obsidian-900 text-stone-300 hover:text-white flex items-center justify-center text-lg font-bold active:scale-95"
                          >
                            -
                          </button>
                          <span className={`px-2.5 py-1 font-mono font-bold text-xs rounded-lg ${isOut ? 'bg-rose-500/20 text-rose-300' : isLow ? 'bg-amber-500/20 text-amber-300' : 'text-emerald-400'}`}>
                            {p.stock} {p.base_unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(p, 1)}
                            className="h-10 w-10 rounded-lg bg-obsidian-900 text-stone-300 hover:text-white flex items-center justify-center text-lg font-bold active:scale-95"
                          >
                            +
                          </button>
                          {p.pieces_per_case && p.pieces_per_case > 1 && (
                            <button
                              type="button"
                              onClick={() => handleQuickAddCase(p)}
                              className="px-2 py-1 rounded-lg text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold"
                              title={`Add 1 Case (+${p.pieces_per_case} ${p.base_unit})`}
                            >
                              +Case
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setProductToPrint(p); setPriceTagModalOpen(true); }}
                            className="h-10 w-10 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-400 flex items-center justify-center active:scale-95"
                            title="Print Label"
                          >
                            <Printer className="h-4 w-4 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingProduct(p); setModalOpen(true); }}
                            className="h-10 px-3.5 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-300 text-xs font-bold flex items-center gap-1.5 active:scale-95"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View (hidden md:block) */}
              <div className="hidden md:block rounded-3xl bg-obsidian-900 border border-slate-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-300">
                  <thead className="border-b border-slate-800 bg-obsidian-950/80 text-stone-400 font-bold uppercase tracking-wider text-[0.6875rem] font-mono">
                    <tr>
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Cost</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Gross Margin</th>
                      <th className="py-3 px-4 text-center">Stock Level</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredProducts.map((p) => {
                      const threshold = p.low_stock_threshold ?? 5
                      const isLow = p.stock <= threshold && p.stock > 0
                      const isOut = p.stock <= 0
                      const cat = categories.find((c) => c.id === p.category_id)
                      const sup = suppliers.find((s) => s.id === p.supplier_id)
                      const marginPercent =
                        p.default_price_c > 0
                          ? Math.round(((p.default_price_c - p.cost_c) / p.default_price_c) * 100)
                          : 0

                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Photo & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-obsidian-950 border border-slate-800 flex items-center justify-center">
                                {p.image_path ? (
                                  <img src={p.image_path} alt={p.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="h-5 w-5 text-stone-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-sans font-bold text-stone-100 text-sm truncate max-w-xs" title={p.name}>
                                  {p.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[0.6875rem] text-stone-500 font-mono">
                                  {p.barcode && <span className="text-emerald-400 font-semibold">{p.barcode}</span>}
                                  {p.sku && <span>SKU: {p.sku}</span>}
                                  {sup && <span className="text-stone-400 truncate max-w-[120px]">· {sup.name}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 font-sans text-stone-400 text-xs">
                            {cat?.name || 'Uncategorized'}
                          </td>

                          {/* Cost */}
                          <td className="py-3 px-4 text-right font-mono text-stone-400">
                            {money(p.cost_c)}
                          </td>

                          {/* Selling Price */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-stone-100 text-sm">
                            {money(p.default_price_c)}
                            {p.suggested_price_c && (
                              <div className="text-[0.625rem] text-amber-400 font-normal">
                                SRP: {money(p.suggested_price_c)}
                              </div>
                            )}
                          </td>

                          {/* Gross Margin */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold font-mono ${
                                marginPercent >= 25
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : marginPercent >= 10
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {marginPercent}%
                            </span>
                          </td>

                          {/* Stock Stepper */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-obsidian-950 p-1 rounded-xl border border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(p, -1)}
                                className="h-6 w-6 rounded-lg bg-obsidian-900 hover:bg-obsidian-850 text-stone-400 hover:text-stone-100 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span
                                className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs ${
                                  isOut
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : isLow
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                }`}
                              >
                                {p.stock} {p.base_unit}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(p, 1)}
                                className="h-6 w-6 rounded-lg bg-obsidian-900 hover:bg-obsidian-850 text-stone-400 hover:text-stone-100 flex items-center justify-center font-bold"
                              >
                                +
                              </button>

                              {/* Quick Box Add ("Tingi" conversion) */}
                              {p.pieces_per_case && p.pieces_per_case > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddCase(p)}
                                  className="ml-1 px-1.5 py-0.5 rounded text-[0.625rem] bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 font-bold"
                                  title={`Add 1 Case (+${p.pieces_per_case} ${p.base_unit})`}
                                >
                                  +1 Case
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setProductToPrint(p)
                                  setPriceTagModalOpen(true)
                                }}
                                title="Print Chiteng CT-221B Barcode Sticker"
                                className="p-2 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct({
                                    ...p,
                                    cost_c: p.cost_c / 100,
                                    default_price_c: p.default_price_c / 100,
                                    suggested_price_c: p.suggested_price_c ? p.suggested_price_c / 100 : undefined
                                  })
                                  setModalOpen(true)
                                }}
                                className="p-2 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-400 hover:text-stone-100 hover:bg-white/[0.05] transition-all"
                                title="Edit Product Details"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-2 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                title="Delete Product"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          ) : (
            /* Grid View Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const threshold = p.low_stock_threshold ?? 5
                const isLow = p.stock <= threshold && p.stock > 0
                const isOut = p.stock <= 0
                const cat = categories.find((c) => c.id === p.category_id)
                const marginPercent =
                  p.default_price_c > 0
                    ? Math.round(((p.default_price_c - p.cost_c) / p.default_price_c) * 100)
                    : 0

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-3xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-xl hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-obsidian-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {p.image_path ? (
                            <img src={p.image_path} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="w-8 h-8 text-stone-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-stone-400 uppercase font-bold">
                            {cat?.name || 'General'}
                          </span>
                          <h4 className="font-bold text-stone-100 text-sm mt-1 line-clamp-2" title={p.name}>
                            {p.name}
                          </h4>
                          {p.barcode && (
                            <p className="text-[0.6875rem] font-mono text-emerald-400 mt-0.5">{p.barcode}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-obsidian-950 border border-slate-800 text-xs">
                        <div>
                          <span className="text-[0.625rem] text-stone-500 uppercase block font-mono">Selling Price</span>
                          <span className="text-stone-100 font-black font-mono text-sm">{money(p.default_price_c)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[0.625rem] text-stone-500 uppercase block font-mono">Gross Margin</span>
                          <span
                            className={`font-black font-mono text-xs ${
                              marginPercent >= 25 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {marginPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, -1)}
                          className="h-6 w-6 rounded-lg bg-obsidian-950 border border-slate-800 text-stone-300 font-bold"
                        >
                          -
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-300'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'text-stone-200'
                          }`}
                        >
                          {p.stock} {p.base_unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, 1)}
                          className="h-6 w-6 rounded-lg bg-obsidian-950 border border-slate-800 text-stone-300 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProductToPrint(p)
                            setPriceTagModalOpen(true)
                          }}
                          className="p-1.5 rounded-xl border border-slate-800 text-stone-400 hover:text-emerald-400"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...p,
                              cost_c: p.cost_c / 100,
                              default_price_c: p.default_price_c / 100,
                              suggested_price_c: p.suggested_price_c ? p.suggested_price_c / 100 : undefined
                            })
                            setModalOpen(true)
                          }}
                          className="p-1.5 rounded-xl border border-slate-800 text-stone-400 hover:text-stone-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 2: REORDER RADAR & PROCUREMENT PO WORKSPACE
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'REORDER' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-obsidian-900 border border-rose-500/30 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Procurement &amp; Low Stock Radar</span>
              </h3>
              <p className="text-xs text-stone-400">
                {reorderList.length} products have fallen at or below their safety reorder thresholds.
              </p>
            </div>

            <button
              onClick={handleExportReorderCsv}
              className="btn-press flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-glow-rose shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export Purchase Order (CSV)</span>
            </button>
          </div>

          {reorderList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-obsidian-900 border border-slate-800 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-base font-bold text-stone-200">Inventory Levels Healthy</p>
              <p className="text-xs text-stone-500">
                All catalog items currently satisfy their required minimum safety stock levels!
              </p>
            </div>
          ) : (
            <div className="rounded-3xl bg-obsidian-900 border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="border-b border-slate-800 bg-obsidian-950/80 text-stone-400 font-bold uppercase tracking-wider text-[0.6875rem] font-mono">
                    <tr>
                      <th className="py-3 px-4">Item To Reorder</th>
                      <th className="py-3 px-4">Assigned Supplier</th>
                      <th className="py-3 px-4 text-center">Current Stock</th>
                      <th className="py-3 px-4 text-center">Safety Minimum</th>
                      <th className="py-3 px-4 text-center">Suggested PO Qty</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Estimated Cost</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {reorderList.map((p) => {
                      const sup = suppliers.find((s) => s.id === p.supplier_id)
                      const threshold = p.low_stock_threshold ?? 5
                      const suggestedOrder = Math.max(10, threshold * 3 - p.stock)
                      const estCostCents = suggestedOrder * p.cost_c

                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-sans font-bold text-stone-100 text-sm">{p.name}</p>
                            <p className="text-[0.6875rem] text-stone-500">{p.barcode || p.sku || 'No Barcode'}</p>
                          </td>
                          <td className="py-3 px-4 font-sans text-stone-400">
                            {sup ? (
                              <div>
                                <span className="font-bold text-stone-200">{sup.name}</span>
                                {sup.phone && <span className="block text-[0.6875rem] text-stone-500 font-mono">{sup.phone}</span>}
                              </div>
                            ) : (
                              <span className="text-stone-600 italic">No supplier linked</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                p.stock <= 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {p.stock} {p.base_unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-stone-400">
                            {threshold} {p.base_unit}
                          </td>
                          <td className="py-3 px-4 text-center text-emerald-400 font-bold text-sm">
                            +{suggestedOrder}
                          </td>
                          <td className="py-3 px-4 text-right text-stone-400">
                            {money(p.cost_c)}
                          </td>
                          <td className="py-3 px-4 text-right text-stone-100 font-bold font-mono">
                            {money(estCostCents)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                handleAddProductToBatch(p)
                                setActiveTab('BATCH_IN')
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                            >
                              + Stock-In
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: FAST BATCH STOCK-IN (DELIVERY RECEIVING)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'BATCH_IN' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-obsidian-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  <span>Fast Delivery Receiving &amp; Inward Batch</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Scan supplier barcodes or search products to receive incoming inventory with wholesale box conversions.
                </p>
              </div>

              {/* Delivery Meta */}
              <div className="flex items-center gap-3">
                <select
                  value={batchSupplierId}
                  onChange={(e) => setBatchSupplierId(e.target.value ? Number(e.target.value) : '')}
                  className="px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-300 text-xs font-medium outline-none focus:border-emerald-500"
                >
                  <option value="">Select Supplier (Optional)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={batchDeliveryNote}
                  onChange={(e) => setBatchDeliveryNote(e.target.value)}
                  placeholder="Invoice # or Delivery Note"
                  className="px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-200 text-xs font-medium outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Scan / Add Input */}
            <form onSubmit={handleScanSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={batchScanQuery}
                  onChange={(e) => setBatchScanQuery(e.target.value)}
                  placeholder="Scan item barcode with USB scanner, or type product name and press Enter..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-medium text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs shadow-glow-emerald"
              >
                + Add to Batch
              </button>
            </form>
          </div>

          {/* Batch Items Queue */}
          <div className="rounded-3xl bg-obsidian-900 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 font-mono uppercase tracking-wider">
                Current Batch Receiving Queue ({batchItems.length} items)
              </span>
              {batchItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBatchItems([])}
                  className="text-stone-500 hover:text-rose-400 text-xs font-bold"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {batchItems.length === 0 ? (
              <div className="p-12 text-center text-stone-500 text-xs">
                Scan or add items using the input bar above to build your supplier delivery batch.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 font-mono text-xs">
                {batchItems.map((item, idx) => {
                  const p = item.product
                  const caseMultiplier = item.unitType === 'CASES' ? p.pieces_per_case || 12 : 1
                  const totalIncomingPieces = item.quantity * caseMultiplier

                  return (
                    <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[0.6875rem]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-sans font-bold text-stone-100 text-sm">{p.name}</p>
                          <p className="text-[0.6875rem] text-stone-500">
                            Current Stock: {p.stock} {p.base_unit} · Cost: {money(p.cost_c)}
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Unit Selector */}
                        <div className="flex items-center bg-obsidian-950 border border-slate-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() =>
                              setBatchItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, unitType: 'PIECES' } : it))
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              item.unitType === 'PIECES' ? 'bg-emerald-500 text-obsidian-950' : 'text-stone-400'
                            }`}
                          >
                            Pieces
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setBatchItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, unitType: 'CASES' } : it))
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              item.unitType === 'CASES' ? 'bg-emerald-500 text-obsidian-950' : 'text-stone-400'
                            }`}
                          >
                            Cases ({p.pieces_per_case || 12} pcs)
                          </button>
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.6875rem] text-stone-500 uppercase">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1)
                              setBatchItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                              )
                            }}
                            className="w-16 px-2.5 py-1 rounded-xl bg-obsidian-950 border border-slate-800 text-emerald-400 font-bold text-center outline-none"
                          />
                        </div>

                        {/* Incoming Pieces summary */}
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          (+{totalIncomingPieces} {p.base_unit})
                        </span>

                        {/* Expiration date */}
                        <input
                          type="date"
                          value={item.expirationDate || ''}
                          onChange={(e) =>
                            setBatchItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, expirationDate: e.target.value } : it))
                            )
                          }
                          className="px-2 py-1 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-300 text-xs font-mono outline-none"
                        />

                        {/* Remove item */}
                        <button
                          type="button"
                          onClick={() => setBatchItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-stone-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                <div className="p-4 bg-obsidian-950/80 flex items-center justify-between">
                  <span className="text-xs text-stone-400">
                    Total Inward Units:{' '}
                    <strong className="text-emerald-400">
                      {batchItems.reduce((acc, it) => {
                        const mult = it.unitType === 'CASES' ? it.product.pieces_per_case || 12 : 1
                        return acc + it.quantity * mult
                      }, 0)}{' '}
                      pieces
                    </strong>
                  </span>

                  <button
                    type="button"
                    disabled={isSubmittingBatch}
                    onClick={handleCommitBatchStockIn}
                    className="btn-press px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs uppercase tracking-wider shadow-glow-emerald"
                  >
                    {isSubmittingBatch ? 'Receiving...' : 'Commit Inward Delivery'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: EXPIRATION TRACKER & FIFO WORKSPACE
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'EXPIRATION' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-obsidian-900 border border-amber-500/30 shadow-2xl flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Expiration &amp; FIFO Batch Tracker</span>
              </h3>
              <p className="text-xs text-stone-400">
                Monitor perishable shelf goods to apply markdown discounts or prevent spoiled item sales.
              </p>
            </div>
          </div>

          {expirationList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-obsidian-900 border border-slate-800 space-y-2">
              <Calendar className="w-12 h-12 text-stone-600 mx-auto" />
              <p className="text-base font-bold text-stone-200">No Expiration Dates Recorded</p>
              <p className="text-xs text-stone-500">
                You can assign expiration dates when adding/editing products or during Fast Stock-In.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl bg-obsidian-900 border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="border-b border-slate-800 bg-obsidian-950/80 text-stone-400 font-bold uppercase tracking-wider text-[0.6875rem] font-mono">
                    <tr>
                      <th className="py-3 px-4">Perishable Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Current Stock</th>
                      <th className="py-3 px-4 text-center">Expiration Date</th>
                      <th className="py-3 px-4 text-center">Remaining Days</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {expirationList.map((p) => {
                      const exp = new Date(p.expiration_date!)
                      const today = new Date()
                      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      const isExpired = diffDays <= 0
                      const isCritical = diffDays > 0 && diffDays <= 14
                      const isWarning = diffDays > 14 && diffDays <= 30
                      const cat = categories.find((c) => c.id === p.category_id)

                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-sans font-bold text-stone-100 text-sm">{p.name}</p>
                            <p className="text-[0.6875rem] text-stone-500">{p.barcode || 'No Barcode'}</p>
                          </td>
                          <td className="py-3 px-4 font-sans text-stone-400">{cat?.name || 'General'}</td>
                          <td className="py-3 px-4 text-center font-bold">
                            {p.stock} {p.base_unit}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-stone-200">
                            {p.expiration_date}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-bold ${
                                isExpired ? 'text-rose-400' : isCritical ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {isExpired ? `${Math.abs(diffDays)}d ago` : `${diffDays} days`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${
                                isExpired
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isCritical
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : isWarning
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {isExpired ? 'EXPIRED' : isCritical ? 'CRITICAL (≤14D)' : isWarning ? 'NEARING' : 'FRESH'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct({
                                  ...p,
                                  cost_c: p.cost_c / 100,
                                  default_price_c: p.default_price_c / 100
                                })
                                setModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-300 hover:text-stone-100 text-xs"
                            >
                              Update Batch
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 5: STOCK AUDIT TRAIL & RESTOCK LOGS WORKSPACE
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-obsidian-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search audit trail by product name, cashier, or note..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-medium text-stone-100 placeholder-stone-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(['ALL', 'RESTOCK', 'ADJUSTMENT', 'RETURN'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setHistoryTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    historyTypeFilter === type
                      ? 'bg-indigo-500 text-obsidian-950'
                      : 'bg-obsidian-950 text-stone-400 border border-slate-800 hover:text-stone-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-obsidian-900 border border-slate-800 p-5 shadow-2xl space-y-3">
            {filteredRestockLogs.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                No inventory adjustment logs found matching your filters.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredRestockLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-obsidian-950 border border-slate-800 flex items-center justify-between gap-4 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] text-stone-300 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans font-bold text-stone-100 text-sm truncate">{log.product_name}</p>
                        <p className="text-[0.6875rem] text-stone-500 mt-0.5">
                          {formatDateTime(log.timestamp)} · Auth: {log.cashier_name}
                          {log.note && <span className="text-stone-400"> · {log.note}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[0.6875rem] text-stone-500 block">
                          {log.before_stock} → {log.after_stock}
                        </span>
                        <span
                          className={`font-black text-sm ${
                            log.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-lg text-[0.625rem] font-bold border uppercase ${
                          log.type === 'RESTOCK'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : log.type === 'RETURN'
                            ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {log.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: ADD OR EDIT PRODUCT DETAILS
      ────────────────────────────────────────────────────────────────────────── */}
      {modalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
          <div className="w-full max-w-xl rounded-3xl bg-obsidian-900 border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-400" />
                <span>{editingProduct.id ? 'Edit Product Details' : 'Register New Product'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-white/[0.05]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Product Photo Dual Picker */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">Product Photo</label>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoPick} className="hidden" />
                <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoPick} className="hidden" />

                {imageBusy ? (
                  <div className="flex items-center justify-center p-6 rounded-2xl border border-slate-800 bg-obsidian-950">
                    <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" />
                    <span className="ml-2 text-xs text-stone-400">Optimizing photo...</span>
                  </div>
                ) : editingProduct.image_path ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-800 bg-obsidian-950">
                    <img src={editingProduct.image_path} alt="Preview" className="h-16 w-16 rounded-xl object-cover border border-slate-800" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-stone-100">Attached Product Image</p>
                      <p className="text-[0.6875rem] text-stone-400">WebP format compressed for fast POS loading</p>
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
                          className="btn-press px-2.5 py-1 rounded-lg bg-obsidian-900 border border-slate-800 text-stone-300 text-xs font-semibold flex items-center gap-1"
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
                        <span className="block text-xs font-bold text-stone-100">Take Photo</span>
                        <span className="block text-[0.6875rem] text-stone-400">Open mobile camera</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="btn-press flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-dashed border-slate-800 bg-obsidian-950 hover:bg-obsidian-850 text-center transition-all"
                    >
                      <div className="h-8 w-8 rounded-xl bg-white/[0.04] text-stone-300 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-100">Upload Image</span>
                        <span className="block text-[0.6875rem] text-stone-400">Choose from files</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g. Lucky Me Pancit Canton Kalamansi 60g"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-medium text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">SKU (Internal Code)</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    placeholder="NOOD-001"
                    className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Barcode (EAN/UPC)</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    placeholder="4800016644810"
                    className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Live Detected DTI SRP Banner */}
              {detectedSrp && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-300 truncate">
                        Official DTI SRP: ₱{(detectedSrp.market_price_c / 100).toFixed(2)}
                      </p>
                      <p className="text-[0.6875rem] text-stone-400 truncate">
                        {detectedSrp.product_name} · {detectedSrp.source_name || 'DTI SRP Guide'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const srpPeso = detectedSrp.market_price_c / 100
                      setEditingProduct((prev) =>
                        prev
                          ? {
                              ...prev,
                              suggested_price_c: srpPeso,
                              default_price_c: srpPeso
                            }
                          : null
                      )
                    }}
                    className="btn-press px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-[0.6875rem] font-bold shrink-0"
                  >
                    Apply SRP
                  </button>
                </div>
              )}

              {/* Categorization & Supplier Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Category</label>
                  <select
                    value={editingProduct.category_id || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category_id: Number(e.target.value) || null,
                        subcategory_id: null
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">No Category</option>
                    {categories
                      .filter((c) => c.parent_id === null)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Subcategory</label>
                  <select
                    value={editingProduct.subcategory_id || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        subcategory_id: Number(e.target.value) || null
                      })
                    }
                    disabled={!editingProduct.category_id}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-40"
                  >
                    <option value="">No Subcategory</option>
                    {categories
                      .filter((c) => c.parent_id === editingProduct.category_id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Assigned Supplier</label>
                  <select
                    value={editingProduct.supplier_id || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        supplier_id: Number(e.target.value) || null
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">None / Direct Store</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Units & Packaging ("Tingi" conversion) */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-obsidian-950 border border-slate-800">
                <div>
                  <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Base Unit
                  </label>
                  <input
                    type="text"
                    value={editingProduct.base_unit || 'piece'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, base_unit: e.target.value })}
                    placeholder="piece, can, pack"
                    className="w-full px-3 py-1.5 rounded-xl bg-obsidian-900 border border-slate-800 text-xs text-stone-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[0.6875rem] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                    Pieces Per Box / Case
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.pieces_per_case ?? 24}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        pieces_per_case: parseInt(e.target.value) || 1
                      })
                    }
                    placeholder="24"
                    className="w-full px-3 py-1.5 rounded-xl bg-obsidian-900 border border-indigo-500/30 text-xs text-indigo-300 font-mono font-bold outline-none"
                  />
                  <span className="text-[0.625rem] text-stone-500 block mt-0.5">
                    For 1-click Case receiving in counter
                  </span>
                </div>
              </div>

              {/* Financial Inputs: Cost, SRP, Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Wholesale Cost (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.cost_c ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_c: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">Suggested SRP (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.suggested_price_c ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        suggested_price_c: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    placeholder="e.g. 10.50"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-amber-500/30 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">Selling Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.default_price_c ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, default_price_c: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Stock Controls & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Current Stock Qty</label>
                  <input
                    type="number"
                    value={editingProduct.stock ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-300 mb-1">Safety Low Stock Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.low_stock_threshold ?? 5}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, low_stock_threshold: parseInt(e.target.value) || 5 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Expiration Date (FIFO)</label>
                  <input
                    type="date"
                    value={editingProduct.expiration_date || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, expiration_date: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-obsidian-950 text-xs font-bold text-stone-300 hover:text-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 text-xs font-bold uppercase tracking-wider shadow-glow-emerald"
                >
                  {editingProduct.id ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          CHITENG CT-221B THERMAL LABEL STUDIO MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      <PriceTagPrintModal
        open={priceTagModalOpen}
        onClose={() => {
          setPriceTagModalOpen(false)
          setProductToPrint(null)
        }}
        product={productToPrint}
        allProducts={products}
        storeName={storeName}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          STORE USE & SPOILAGE WRITE-OFF MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {isStoreUseOpen && (
        <StoreUseModal
          open={isStoreUseOpen}
          onClose={() => setIsStoreUseOpen(false)}
          onDone={loadProducts}
          cashierName={currentCashierName}
          storeName={storeName}
        />
      )}
    </div>
  )
}
