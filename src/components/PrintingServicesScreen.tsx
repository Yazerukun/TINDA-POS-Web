import React, { useState, useMemo, useEffect } from 'react'
import {
  Printer,
  Copy,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  ShoppingCart,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  BadgePercent,
  Calculator,
  ShieldCheck,
  Trash2,
  Download,
  Sliders,
  Clock,
  ArrowRight,
  Camera,
  UserCheck,
  PackageCheck,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Edit3,
  TrendingUp,
  RotateCcw
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '../utils/format'
import { playScanSuccess, playCheckoutChime, playScanError } from '../lib/sound'

// ─── TYPES & INTERFACES ──────────────────────────────────────────

export type ServiceCategory = 'PRINTING' | 'PHOTOCOPY_SCAN' | 'RUSH_ID' | 'LAMINATION_BINDING' | 'TYPING_SERVICES'

export interface PresetService {
  id: string
  name: string
  category: ServiceCategory
  description: string
  paperSize: string
  suggestedPricePerUnit: number
  badge?: string
  isRushId?: boolean
  idPackageSpecs?: {
    oneByOne: number
    twoByTwo: number
    passport: number
    includesSoftcopy: boolean
  }
}

export interface PrintJobRecord {
  id: string
  serviceName: string
  category: ServiceCategory
  customerName: string
  customerPhone?: string
  pages: number
  copies: number
  totalUnits: number
  unitPrice: number
  bulkDiscountAmount: number
  addonsNote?: string
  totalAmount: number
  status: 'COMPLETED' | 'PENDING_PICKUP' | 'CLAIMED'
  createdAt: string
  cashierName?: string
}

export interface SupplyItem {
  id: string
  name: string
  category: 'PAPER' | 'PHOTO' | 'PVC' | 'LAMINATION' | 'BINDING'
  unit: string
  stockCount: number
  reorderLevel: number
  unitCost: number
}

// ─── INITIAL PRESET CATALOG ─────────────────────────────────────

export const INITIAL_PRESET_SERVICES: PresetService[] = [
  // 1. RUSH ID PACKAGES (Special Focus)
  {
    id: 'rush_id_pkg_combo',
    name: 'Rush ID Package A (1x1 & 2x2 Combo)',
    category: 'RUSH_ID',
    description: '4pcs 1x1 + 2pcs 2x2 high-res photo print with background change',
    paperSize: 'Photo Paper',
    suggestedPricePerUnit: 50,
    badge: 'POPULAR COMBO',
    isRushId: true,
    idPackageSpecs: { oneByOne: 4, twoByTwo: 2, passport: 0, includesSoftcopy: true }
  },
  {
    id: 'rush_id_pkg_career',
    name: 'Rush ID Package B (Job Seeker / PRC Set)',
    category: 'RUSH_ID',
    description: '4pcs 2x2 + 4pcs 1x1 + 4pcs Passport size with attire change and softcopy',
    paperSize: 'Photo Paper',
    suggestedPricePerUnit: 100,
    badge: 'ALL-IN-ONE',
    isRushId: true,
    idPackageSpecs: { oneByOne: 4, twoByTwo: 4, passport: 4, includesSoftcopy: true }
  },
  {
    id: 'rush_id_pkg_passport',
    name: 'Rush ID Package C (Philippine Passport Spec)',
    category: 'RUSH_ID',
    description: '4pcs DFA Philippine Passport standard size (35mm x 45mm) on royal blue/white bg',
    paperSize: 'Photo Paper',
    suggestedPricePerUnit: 60,
    badge: 'DFA SPEC',
    isRushId: true,
    idPackageSpecs: { oneByOne: 0, twoByTwo: 0, passport: 4, includesSoftcopy: true }
  },
  {
    id: 'rush_id_pkg_student',
    name: 'Rush ID Package D (8pcs 1x1 Student Set)',
    category: 'RUSH_ID',
    description: '8pcs 1x1 glossy photo ID print with optional school nameplate / tag',
    paperSize: 'Photo Paper',
    suggestedPricePerUnit: 45,
    badge: 'STUDENT',
    isRushId: true,
    idPackageSpecs: { oneByOne: 8, twoByTwo: 0, passport: 0, includesSoftcopy: false }
  },
  {
    id: 'rush_id_pkg_2x2_only',
    name: 'Rush ID Package E (6pcs 2x2 Standard Set)',
    category: 'RUSH_ID',
    description: '6pcs 2x2 standard ID photo print for board exam or employment',
    paperSize: 'Photo Paper',
    suggestedPricePerUnit: 60,
    badge: 'BOARD EXAM',
    isRushId: true,
    idPackageSpecs: { oneByOne: 0, twoByTwo: 6, passport: 0, includesSoftcopy: true }
  },
  {
    id: 'rush_pvc_id_card',
    name: 'Rush Heavy-Duty PVC ID Card',
    category: 'RUSH_ID',
    description: 'Waterproof double-sided thermal PVC ID card with lanyard slot punch',
    paperSize: 'CR80 (Standard ID)',
    suggestedPricePerUnit: 60,
    badge: 'PREMIUM PVC'
  },

  // 2. DOCUMENT PRINTING
  {
    id: 'bw_print_short',
    name: 'B/W Print (Short Bond)',
    category: 'PRINTING',
    description: 'Black & white laser/inkjet document printing on 70-80gsm Short bond paper',
    paperSize: 'SHORT',
    suggestedPricePerUnit: 3,
    badge: 'BASIC'
  },
  {
    id: 'bw_print_long',
    name: 'B/W Print (Long Bond)',
    category: 'PRINTING',
    description: 'Black & white document printing on Long (Folio) bond paper',
    paperSize: 'LONG',
    suggestedPricePerUnit: 4
  },
  {
    id: 'bw_print_a4',
    name: 'B/W Print (A4 Standard)',
    category: 'PRINTING',
    description: 'Black & white document printing on standard A4 paper',
    paperSize: 'A4',
    suggestedPricePerUnit: 3
  },
  {
    id: 'color_print_short',
    name: 'Color Print (Standard Short/A4)',
    category: 'PRINTING',
    description: 'Standard color document printing for school reports and business proposals',
    paperSize: 'SHORT / A4',
    suggestedPricePerUnit: 10,
    badge: 'COLOR'
  },
  {
    id: 'color_print_long',
    name: 'Color Print (Long Bond)',
    category: 'PRINTING',
    description: 'Full color document printing on long bond paper',
    paperSize: 'LONG',
    suggestedPricePerUnit: 12
  },
  {
    id: 'color_photo_glossy_4r',
    name: 'Glossy Photo Print (4R / 4x6")',
    category: 'PRINTING',
    description: 'High-definition 4R photo print on 230gsm premium glossy paper',
    paperSize: '4R Glossy',
    suggestedPricePerUnit: 20,
    badge: 'PHOTO'
  },
  {
    id: 'color_photo_glossy_a4',
    name: 'Glossy Photo Print (Full A4)',
    category: 'PRINTING',
    description: 'Full-page high-resolution photo print on A4 premium glossy photo paper',
    paperSize: 'A4 Glossy',
    suggestedPricePerUnit: 50,
    badge: 'FULL A4'
  },
  {
    id: 'sticker_label_a4',
    name: 'Sticker / Label Sheet (A4)',
    category: 'PRINTING',
    description: 'Vibrant color sticker paper printing for product labels and packaging',
    paperSize: 'A4 Sticker',
    suggestedPricePerUnit: 45
  },

  // 3. PHOTOCOPY & SCANNING
  {
    id: 'photocopy_bw_short',
    name: 'Xerox / Photocopy B/W (Short)',
    category: 'PHOTOCOPY_SCAN',
    description: 'Fast duplicate copying on short bond paper',
    paperSize: 'SHORT',
    suggestedPricePerUnit: 2,
    badge: 'FAST COPY'
  },
  {
    id: 'photocopy_bw_long',
    name: 'Xerox / Photocopy B/W (Long)',
    category: 'PHOTOCOPY_SCAN',
    description: 'Fast duplicate copying on long bond paper',
    paperSize: 'LONG',
    suggestedPricePerUnit: 2.5
  },
  {
    id: 'photocopy_color',
    name: 'Color Photocopy / Duplicate',
    category: 'PHOTOCOPY_SCAN',
    description: 'True color photocopy of certificates, IDs, and colored records',
    paperSize: 'SHORT / A4',
    suggestedPricePerUnit: 10
  },
  {
    id: 'photocopy_id_both',
    name: '2-Sided ID Xerox Copy',
    category: 'PHOTOCOPY_SCAN',
    description: 'Front and back ID reproduction centered on single sheet',
    paperSize: 'SHORT / A4',
    suggestedPricePerUnit: 5,
    badge: 'ID XEROX'
  },
  {
    id: 'scan_document_pdf',
    name: 'Document Scan to PDF / USB',
    category: 'PHOTOCOPY_SCAN',
    description: 'High-res document scanning saved to flash drive, email, or Google Drive',
    paperSize: 'FLATBED SCAN',
    suggestedPricePerUnit: 10
  },

  // 4. LAMINATION & BINDING
  {
    id: 'lamination_short',
    name: 'Document Lamination (Short / ID)',
    category: 'LAMINATION_BINDING',
    description: 'Waterproof hot thermal lamination using 250-micron crystal clear pouch',
    paperSize: 'SHORT / ID',
    suggestedPricePerUnit: 25,
    badge: '250 MICRON'
  },
  {
    id: 'lamination_long',
    name: 'Document Lamination (Long / A4)',
    category: 'LAMINATION_BINDING',
    description: 'Heavy duty lamination for diplomas, birth certificates, and contracts',
    paperSize: 'LONG / A4',
    suggestedPricePerUnit: 30
  },
  {
    id: 'ring_binding_small',
    name: 'Comb / Ring Binding (1–50 pages)',
    category: 'LAMINATION_BINDING',
    description: 'Plastic comb binding with clear PVC front and frosted black back cover',
    paperSize: 'BOOKLET',
    suggestedPricePerUnit: 50,
    badge: 'BINDING'
  },
  {
    id: 'ring_binding_thick',
    name: 'Comb / Ring Binding (51–150 pages)',
    category: 'LAMINATION_BINDING',
    description: 'Heavy gauge plastic comb binding for theses, manuals, and projects',
    paperSize: 'THICK BOOKLET',
    suggestedPricePerUnit: 80
  },

  // 5. TYPING & DIGITAL SERVICES
  {
    id: 'typing_encoding',
    name: 'Document Encoding & Typing',
    category: 'TYPING_SERVICES',
    description: 'Professional typing from handwritten or printed drafts with proofreading',
    paperSize: 'PER PAGE',
    suggestedPricePerUnit: 25
  },
  {
    id: 'resume_layout',
    name: 'Rush Resume / Bio-Data Formatting',
    category: 'TYPING_SERVICES',
    description: 'Clean modern resume template layout + 2 printed high-grade copies',
    paperSize: 'A4 / SHORT',
    suggestedPricePerUnit: 50,
    badge: 'CAREER READY'
  },
  {
    id: 'rush_form_filling',
    name: 'Online Government Form Assistance',
    category: 'TYPING_SERVICES',
    description: 'Assisted registration for NBI clearance, passport appointment, or PRC renewal',
    paperSize: 'DIGITAL',
    suggestedPricePerUnit: 30
  }
]

// ─── INITIAL PAPER & CONSUMABLES ────────────────────────────────

export const INITIAL_SUPPLIES: SupplyItem[] = [
  { id: 'sup_short_bond', name: 'Short Bond Paper (70gsm)', category: 'PAPER', unit: 'Sheets', stockCount: 450, reorderLevel: 100, unitCost: 0.6 },
  { id: 'sup_long_bond', name: 'Long Bond Paper (70gsm)', category: 'PAPER', unit: 'Sheets', stockCount: 380, reorderLevel: 100, unitCost: 0.7 },
  { id: 'sup_a4_bond', name: 'A4 Bond Paper (80gsm)', category: 'PAPER', unit: 'Sheets', stockCount: 500, reorderLevel: 100, unitCost: 0.65 },
  { id: 'sup_photo_4r', name: 'Glossy 4R Photo Paper (230gsm)', category: 'PHOTO', unit: 'Sheets', stockCount: 80, reorderLevel: 25, unitCost: 3.5 },
  { id: 'sup_photo_a4', name: 'Glossy A4 Photo Paper (230gsm)', category: 'PHOTO', unit: 'Sheets', stockCount: 45, reorderLevel: 15, unitCost: 8.0 },
  { id: 'sup_pvc_blanks', name: 'CR80 PVC ID Card Blanks', category: 'PVC', unit: 'Cards', stockCount: 30, reorderLevel: 10, unitCost: 12.0 },
  { id: 'sup_lam_short', name: 'Short Lamination Pouches (250mic)', category: 'LAMINATION', unit: 'Pouches', stockCount: 35, reorderLevel: 10, unitCost: 5.5 },
  { id: 'sup_lam_long', name: 'Long Lamination Pouches (250mic)', category: 'LAMINATION', unit: 'Pouches', stockCount: 28, reorderLevel: 10, unitCost: 7.0 },
  { id: 'sup_ring_comb', name: 'Plastic Ring Binder Combs', category: 'BINDING', unit: 'Pieces', stockCount: 22, reorderLevel: 8, unitCost: 8.5 }
]

const JOBS_STORAGE_KEY = 'tinda_print_services_jobs'
const SERVICES_STORAGE_KEY = 'tinda_print_services_catalog'
const SUPPLIES_STORAGE_KEY = 'tinda_print_services_supplies'

interface PrintingServicesScreenProps {
  onAddToCart?: (item: { name: string; price_c: number; quantity: number }) => void
  currentCashierName?: string
  storeName?: string
}

export function PrintingServicesScreen({
  onAddToCart,
  currentCashierName = 'Cashier',
  storeName = 'TINDA Retail Station'
}: PrintingServicesScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'calculator' | 'catalog' | 'ledger' | 'supplies'>('calculator')

  // ─── 1. SERVICES CATALOG STATE ──────────────────────────────────
  const [services, setServices] = useState<PresetService[]>(() => {
    try {
      const saved = localStorage.getItem(SERVICES_STORAGE_KEY)
      return saved ? JSON.parse(saved) : INITIAL_PRESET_SERVICES
    } catch {
      return INITIAL_PRESET_SERVICES
    }
  })

  // ─── 2. JOBS LEDGER STATE ───────────────────────────────────────
  const [jobs, setJobs] = useState<PrintJobRecord[]>(() => {
    try {
      const saved = localStorage.getItem(JOBS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // ─── 3. CONSUMABLES / PAPER SUPPLIES STATE ──────────────────────
  const [supplies, setSupplies] = useState<SupplyItem[]>(() => {
    try {
      const saved = localStorage.getItem(SUPPLIES_STORAGE_KEY)
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIES
    } catch {
      return INITIAL_SUPPLIES
    }
  })

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services))
    } catch {}
  }, [services])

  useEffect(() => {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs))
    } catch {}
  }, [jobs])

  useEffect(() => {
    try {
      localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(supplies))
    } catch {}
  }, [supplies])

  // ─── 4. CALCULATOR FORM STATE ────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string>(INITIAL_PRESET_SERVICES[0]!.id)
  const [pages, setPages] = useState<number>(1)
  const [copies, setCopies] = useState<number>(1)
  const [customPrice, setCustomPrice] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [isDuplex, setIsDuplex] = useState<boolean>(false)
  const [applyBulkDiscount, setApplyBulkDiscount] = useState<boolean>(false)
  const [deductPaperSupplies, setDeductPaperSupplies] = useState<boolean>(true)

  // Rush ID Package Specific Addons
  const [rushAttireEdit, setRushAttireEdit] = useState<boolean>(false)
  const [rushRetouch, setRushRetouch] = useState<boolean>(false)
  const [rushPriorityFee, setRushPriorityFee] = useState<boolean>(false)
  const [rushBgColor, setRushBgColor] = useState<'WHITE' | 'ROYAL_BLUE' | 'RED' | 'GREY'>('WHITE')
  const [rushSoftcopy, setRushSoftcopy] = useState<boolean>(true)

  // ─── 5. MODALS STATE ─────────────────────────────────────────────
  const [claimSlipJob, setClaimSlipJob] = useState<PrintJobRecord | null>(null)
  const [jobToDeleteId, setJobToDeleteId] = useState<string | null>(null)
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('')
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING_PICKUP' | 'CLAIMED'>('ALL')

  // ─── COMPUTED ACTIVE SERVICE & PRICING ───────────────────────────
  const activeService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0]!
  }, [services, selectedServiceId])

  const effectiveUnitCost = useMemo(() => {
    const parsed = parseFloat(customPrice)
    return !isNaN(parsed) && parsed > 0 ? parsed : activeService.suggestedPricePerUnit
  }, [customPrice, activeService])

  // Total Units (pages x copies)
  const totalUnits = useMemo(() => {
    return Math.max(1, pages) * Math.max(1, copies)
  }, [pages, copies])

  // Base raw amount
  const baseSubtotal = useMemo(() => {
    // If duplex and document printing: -10% paper savings
    const duplexMultiplier = isDuplex && activeService.category === 'PRINTING' ? 0.95 : 1
    return totalUnits * effectiveUnitCost * duplexMultiplier
  }, [totalUnits, effectiveUnitCost, isDuplex, activeService])

  // Rush ID Add-on Surcharges
  const rushAddonsTotal = useMemo(() => {
    if (activeService.category !== 'RUSH_ID') return 0
    let sum = 0
    if (rushAttireEdit) sum += 20
    if (rushRetouch) sum += 15
    if (rushPriorityFee) sum += 15
    return sum
  }, [activeService, rushAttireEdit, rushRetouch, rushPriorityFee])

  // Bulk Discount calculation (for multi-page document printing / copying)
  const bulkDiscountRate = useMemo(() => {
    if (!applyBulkDiscount) return 0
    if (activeService.category !== 'PRINTING' && activeService.category !== 'PHOTOCOPY_SCAN') return 0
    if (totalUnits > 100) return 0.30 // 30% off for 100+ pages
    if (totalUnits > 50) return 0.20  // 20% off for 51-100 pages
    if (totalUnits > 10) return 0.10  // 10% off for 11-50 pages
    return 0
  }, [applyBulkDiscount, activeService, totalUnits])

  const bulkDiscountAmount = useMemo(() => {
    return baseSubtotal * bulkDiscountRate
  }, [baseSubtotal, bulkDiscountRate])

  // Final Total Payable
  const finalTotalAmount = useMemo(() => {
    return Math.max(0, baseSubtotal - bulkDiscountAmount + rushAddonsTotal)
  }, [baseSubtotal, bulkDiscountAmount, rushAddonsTotal])

  // ─── EXECUTIVE METRICS ───────────────────────────────────────────
  const executiveMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    let todayRevenue = 0
    let totalUnitsCount = 0
    let completedCount = 0

    for (const j of jobs) {
      if (j.createdAt.startsWith(todayStr)) {
        todayRevenue += j.totalAmount
        totalUnitsCount += j.totalUnits
        completedCount++
      }
    }

    const lowSuppliesCount = supplies.filter((s) => s.stockCount <= s.reorderLevel).length

    return {
      todayRevenue,
      totalUnitsCount,
      completedCount,
      lowSuppliesCount
    }
  }, [jobs, supplies])

  // Filtered Services for Catalog
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchCat = selectedCategory === 'ALL' || srv.category === selectedCategory
      const matchSearch =
        !searchCatalogQuery.trim() ||
        srv.name.toLowerCase().includes(searchCatalogQuery.toLowerCase()) ||
        srv.description.toLowerCase().includes(searchCatalogQuery.toLowerCase()) ||
        srv.paperSize.toLowerCase().includes(searchCatalogQuery.toLowerCase())
      return matchCat && matchSearch
    })
  }, [services, selectedCategory, searchCatalogQuery])

  // Filtered Jobs for Ledger
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (ledgerStatusFilter !== 'ALL' && j.status !== ledgerStatusFilter) return false
      if (ledgerSearchQuery.trim()) {
        const q = ledgerSearchQuery.toLowerCase()
        const matchName = j.customerName.toLowerCase().includes(q)
        const matchService = j.serviceName.toLowerCase().includes(q)
        const matchId = j.id.toLowerCase().includes(q)
        const matchPhone = (j.customerPhone || '').toLowerCase().includes(q)
        if (!matchName && !matchService && !matchId && !matchPhone) return false
      }
      return true
    })
  }, [jobs, ledgerStatusFilter, ledgerSearchQuery])

  // ─── ACTION HANDLERS ─────────────────────────────────────────────

  const handleChargeService = (sendToCart: boolean, printSlip: boolean = false) => {
    const notesArr: string[] = []
    if (activeService.category === 'RUSH_ID') {
      notesArr.push(`Bg: ${rushBgColor}`)
      if (rushAttireEdit) notesArr.push('+Attire')
      if (rushRetouch) notesArr.push('+Retouch')
      if (rushPriorityFee) notesArr.push('+Rush 5min')
      if (rushSoftcopy) notesArr.push('Softcopy')
    } else {
      if (isDuplex) notesArr.push('Duplex Back-to-Back')
      if (applyBulkDiscount && bulkDiscountRate > 0) notesArr.push(`Bulk Tier -${Math.round(bulkDiscountRate * 100)}%`)
    }

    const newJob: PrintJobRecord = {
      id: `PRN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      serviceName: `${activeService.name} (${pages}p × ${copies}c)`,
      category: activeService.category,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || undefined,
      pages,
      copies,
      totalUnits,
      unitPrice: effectiveUnitCost,
      bulkDiscountAmount,
      addonsNote: notesArr.length > 0 ? notesArr.join(' · ') : undefined,
      totalAmount: Math.round(finalTotalAmount * 100) / 100,
      status: printSlip ? 'PENDING_PICKUP' : 'COMPLETED',
      createdAt: new Date().toISOString(),
      cashierName: currentCashierName
    }

    // Auto-deduct paper supplies if checked
    if (deductPaperSupplies) {
      setSupplies((prev) => {
        const updated = [...prev]
        const paperTarget = activeService.paperSize.toUpperCase()

        if (paperTarget.includes('SHORT')) {
          const item = updated.find((s) => s.id === 'sup_short_bond')
          if (item) item.stockCount = Math.max(0, item.stockCount - totalUnits)
        } else if (paperTarget.includes('LONG')) {
          const item = updated.find((s) => s.id === 'sup_long_bond')
          if (item) item.stockCount = Math.max(0, item.stockCount - totalUnits)
        } else if (paperTarget.includes('A4')) {
          const item = updated.find((s) => s.id === 'sup_a4_bond')
          if (item) item.stockCount = Math.max(0, item.stockCount - totalUnits)
        } else if (activeService.category === 'RUSH_ID' || paperTarget.includes('PHOTO')) {
          const item = updated.find((s) => s.id === 'sup_photo_4r')
          if (item) item.stockCount = Math.max(0, item.stockCount - (copies || 1))
        }
        return updated
      })
    }

    setJobs((prev) => [newJob, ...prev])
    playCheckoutChime()

    if (sendToCart && onAddToCart) {
      onAddToCart({
        name: `Print: ${newJob.serviceName}`,
        price_c: Math.round(newJob.totalAmount * 100),
        quantity: 1
      })
      alert(`Successfully added to POS Cart: ${newJob.serviceName} (₱${newJob.totalAmount.toFixed(2)})`)
    } else {
      if (printSlip) {
        setClaimSlipJob(newJob)
      } else {
        alert(`Print Sale Recorded: ₱${newJob.totalAmount.toFixed(2)} for ${newJob.customerName}`)
      }
    }

    // Reset customer fields
    setCustomerName('')
    setCustomerPhone('')
  }

  // Restock Supply Item
  const handleRestockSupply = (supplyId: string, amount: number) => {
    setSupplies((prev) =>
      prev.map((s) => (s.id === supplyId ? { ...s, stockCount: s.stockCount + amount } : s))
    )
    playScanSuccess()
  }

  // Update Service Default Unit Rate
  const handleUpdateServiceRate = (serviceId: string, newRate: number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, suggestedPricePerUnit: Math.max(1, newRate) } : s))
    )
    playScanSuccess()
  }

  // Toggle Job Claim Status
  const handleToggleJobStatus = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          const nextStatus = j.status === 'PENDING_PICKUP' ? 'CLAIMED' : j.status === 'CLAIMED' ? 'COMPLETED' : 'PENDING_PICKUP'
          return { ...j, status: nextStatus }
        }
        return j
      })
    )
    playScanSuccess()
  }

  // Delete Job
  const handleDeleteJob = () => {
    if (!jobToDeleteId) return
    setJobs((prev) => prev.filter((j) => j.id !== jobToDeleteId))
    setJobToDeleteId(null)
    playScanSuccess()
  }

  // Export Print Ledger to CSV
  const handleExportLedgerCsv = () => {
    if (jobs.length === 0) {
      playScanError()
      alert('No print job records available to export.')
      return
    }

    const headers = [
      'Job ID',
      'Date & Time',
      'Service Description',
      'Category',
      'Customer Name',
      'Phone Number',
      'Pages',
      'Copies',
      'Total Units',
      'Unit Price (PHP)',
      'Bulk Discount (PHP)',
      'Add-ons & Notes',
      'Total Amount (PHP)',
      'Status',
      'Cashier'
    ]

    const csvRows = [headers.join(',')]

    for (const j of filteredJobs) {
      const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`
      csvRows.push([
        escapeCsv(j.id),
        escapeCsv(formatDateTime(j.createdAt)),
        escapeCsv(j.serviceName),
        escapeCsv(j.category),
        escapeCsv(j.customerName),
        escapeCsv(j.customerPhone || '—'),
        j.pages,
        j.copies,
        j.totalUnits,
        j.unitPrice.toFixed(2),
        j.bulkDiscountAmount.toFixed(2),
        escapeCsv(j.addonsNote || '—'),
        j.totalAmount.toFixed(2),
        escapeCsv(j.status),
        escapeCsv(j.cashierName || currentCashierName)
      ].join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tinda-print-services-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    playScanSuccess()
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-obsidian-950 p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar select-none font-sans">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* PAGE HEADER                                                 */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-glow-sky">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-stone-100 flex items-center gap-2">
              <span>Customer Print &amp; Copy Station</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                DESKTOP PARITY
              </span>
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Rush ID Packages, Document Printing, Photocopy, Lamination, Ring Binding, and Real-time Consumables Radar.
            </p>
          </div>
        </div>

        {/* 4-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel bg-obsidian-950/90 border border-white/[0.08] overflow-x-auto scrollbar-none shadow-vault">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-sky-500 text-obsidian-950 shadow-glow-sky'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Job Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-sky-500 text-obsidian-950 shadow-glow-sky'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Service Catalog ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-sky-500 text-obsidian-950 shadow-glow-sky'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Job Ledger ({jobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supplies')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
              activeTab === 'supplies'
                ? 'bg-sky-500 text-obsidian-950 shadow-glow-sky'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Paper &amp; Consumables</span>
            {executiveMetrics.lowSuppliesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* EXECUTIVE OPERATIONS PULSE STRIP                            */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl border border-sky-500/25 bg-sky-500/[0.04] shadow-vault relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              Today's Print Revenue
            </span>
            <span className="p-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-black text-sky-300 mt-1">
            ₱{executiveMetrics.todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono mt-1">
            <span className="text-sky-400 font-bold">{executiveMetrics.completedCount} orders today</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] shadow-vault relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Units / Impressions Printed
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Printer className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-black text-stone-100 mt-1 font-mono">
            {executiveMetrics.totalUnitsCount.toLocaleString()} <span className="text-xs font-normal text-stone-400">pages</span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono mt-1">
            <span>Cumulative production throughput</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] shadow-vault relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
              Active Job Orders
            </span>
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-black text-stone-100 mt-1 font-mono">
            {jobs.length}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono mt-1">
            <span>{jobs.filter((j) => j.status === 'PENDING_PICKUP').length} pending for customer pickup</span>
          </div>
        </div>

        <div className={`glass-panel p-4 rounded-2xl border shadow-vault relative overflow-hidden ${
          executiveMetrics.lowSuppliesCount > 0
            ? 'border-rose-500/30 bg-rose-500/[0.04]'
            : 'border-emerald-500/20 bg-emerald-500/[0.04]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              executiveMetrics.lowSuppliesCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              Supplies Stock Health
            </span>
            <span className={`p-1.5 rounded-xl border ${
              executiveMetrics.lowSuppliesCount > 0
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              <Copy className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-black mt-1 font-mono">
            {executiveMetrics.lowSuppliesCount > 0 ? (
              <span className="text-rose-400">{executiveMetrics.lowSuppliesCount} Low Stock</span>
            ) : (
              <span className="text-emerald-400">All Supplies Ready</span>
            )}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono mt-1">
            <span>Bond paper, glossy sheets &amp; PVC cards</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 1: EXPRESS JOB CALCULATOR & BILLING TERMINAL            */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Preset Service Selector (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-sky-400" />
                  <span>Select Service Preset</span>
                </h3>
                <span className="text-[11px] font-mono text-stone-400">
                  Total Presets: <strong className="text-sky-400">{services.length}</strong>
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {[
                  { id: 'ALL', label: 'All Services' },
                  { id: 'RUSH_ID', label: 'Rush ID Packages' },
                  { id: 'PRINTING', label: 'Document Printing' },
                  { id: 'PHOTOCOPY_SCAN', label: 'Photocopy & Scan' },
                  { id: 'LAMINATION_BINDING', label: 'Lamination & Binding' },
                  { id: 'TYPING_SERVICES', label: 'Typing & Layout' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setSearchCatalogQuery('')
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-sky-500 text-obsidian-950 font-bold shadow-glow-sky'
                        : 'bg-obsidian-950/80 border border-white/[0.06] text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Bar for Services */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchCatalogQuery}
                  onChange={(e) => setSearchCatalogQuery(e.target.value)}
                  placeholder="Search preset (e.g. 1x1, 2x2, Passport, Glossy, Ring Binding)..."
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-white/[0.08] bg-obsidian-950 text-xs text-stone-100 outline-none focus:border-sky-500/60 font-sans transition-all"
                />
                {searchCatalogQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchCatalogQuery('')}
                    className="absolute right-2.5 top-2 text-stone-500 hover:text-stone-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Service Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredServices.map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(srv.id)
                      setCustomPrice('')
                      // If rush ID package, set default pages to 1
                      if (srv.category === 'RUSH_ID') {
                        setPages(1)
                        setCopies(1)
                      }
                    }}
                    className={`btn-press p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      selectedServiceId === srv.id
                        ? 'bg-sky-500/15 border-sky-500 text-sky-200 font-bold shadow-glow-sky ring-1 ring-sky-500/40'
                        : 'bg-obsidian-950/80 border-white/[0.06] text-stone-300 hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-white/[0.06] text-stone-200">
                        ₱{srv.suggestedPricePerUnit.toFixed(2)}
                      </span>
                      {srv.badge && (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                          srv.category === 'RUSH_ID'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        }`}>
                          {srv.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-stone-100">{srv.name}</h4>
                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">{srv.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-sky-400/80 font-mono mt-2 pt-1 border-t border-white/[0.04]">
                      <span>Size: {srv.paperSize}</span>
                      <span>{srv.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Job Calculator & Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="h-4 w-4" />
                  <span>Rate &amp; Quantity Billing</span>
                </span>
                <span className="text-xs font-mono text-stone-300 font-bold truncate max-w-[180px]">
                  {activeService.name}
                </span>
              </div>

              {/* RUSH ID PACKAGE CONFIGURATOR (If Rush ID selected) */}
              {activeService.category === 'RUSH_ID' && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-amber-400" />
                      <span>Rush ID Package Options</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
                      RUSH PHOTO DESK
                    </span>
                  </div>

                  {activeService.idPackageSpecs && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="p-1.5 rounded-xl bg-obsidian-950 border border-amber-500/20">
                        <span className="text-[10px] text-stone-400 block">1x1 Photos</span>
                        <strong className="text-amber-300">{activeService.idPackageSpecs.oneByOne} pcs</strong>
                      </div>
                      <div className="p-1.5 rounded-xl bg-obsidian-950 border border-amber-500/20">
                        <span className="text-[10px] text-stone-400 block">2x2 Photos</span>
                        <strong className="text-amber-300">{activeService.idPackageSpecs.twoByTwo} pcs</strong>
                      </div>
                      <div className="p-1.5 rounded-xl bg-obsidian-950 border border-amber-500/20">
                        <span className="text-[10px] text-stone-400 block">Passport Spec</span>
                        <strong className="text-amber-300">{activeService.idPackageSpecs.passport} pcs</strong>
                      </div>
                    </div>
                  )}

                  {/* Background Color Picker */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Background Color
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'WHITE', label: 'White' },
                        { id: 'ROYAL_BLUE', label: 'Blue' },
                        { id: 'RED', label: 'Red' },
                        { id: 'GREY', label: 'Grey' }
                      ].map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setRushBgColor(bg.id as any)}
                          className={`py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            rushBgColor === bg.id
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-white/[0.08] bg-obsidian-950 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggles for Rush ID */}
                  <div className="space-y-1.5 pt-1 text-xs text-stone-300">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-obsidian-950 border border-white/[0.06] cursor-pointer">
                      <span className="flex items-center gap-1.5 text-xs">
                        <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                        <span>Formal Attire / Coat Edit</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400">+₱20.00</span>
                        <input
                          type="checkbox"
                          checked={rushAttireEdit}
                          onChange={(e) => setRushAttireEdit(e.target.checked)}
                          className="rounded accent-amber-500"
                        />
                      </div>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-obsidian-950 border border-white/[0.06] cursor-pointer">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>Face Retouch &amp; Blemish Removal</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400">+₱15.00</span>
                        <input
                          type="checkbox"
                          checked={rushRetouch}
                          onChange={(e) => setRushRetouch(e.target.checked)}
                          className="rounded accent-amber-500"
                        />
                      </div>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-obsidian-950 border border-white/[0.06] cursor-pointer">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Rush 5-Minute Priority Queue</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400">+₱15.00</span>
                        <input
                          type="checkbox"
                          checked={rushPriorityFee}
                          onChange={(e) => setRushPriorityFee(e.target.checked)}
                          className="rounded accent-amber-500"
                        />
                      </div>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-obsidian-950 border border-white/[0.06] cursor-pointer">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Send Digital Softcopy (Bluetooth/Email)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">FREE</span>
                        <input
                          type="checkbox"
                          checked={rushSoftcopy}
                          onChange={(e) => setRushSoftcopy(e.target.checked)}
                          className="rounded accent-emerald-500"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Customer / Project
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Maria Santos / Research"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.08] focus:border-sky-500 text-stone-100 text-xs outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Contact # (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.08] focus:border-sky-500 text-stone-100 text-xs outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Pages & Copies Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    {activeService.category === 'RUSH_ID' ? 'Packages' : 'Pages / Sheets'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={pages}
                      onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.08] focus:border-sky-500 text-stone-100 font-mono text-base font-bold outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Copies / Sets
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-obsidian-950 border border-white/[0.08] focus:border-sky-500 text-stone-100 font-mono text-base font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Override Unit Price */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Unit Price (₱) <span className="text-stone-500 font-normal">(Override if needed)</span>
                  </label>
                  <span className="text-[10px] font-mono text-stone-400">
                    Default: ₱{activeService.suggestedPricePerUnit.toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-stone-500 font-serif">₱</span>
                  <input
                    type="number"
                    step="any"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={String(activeService.suggestedPricePerUnit)}
                    className="w-full px-3 pl-7 py-2 rounded-xl bg-obsidian-950 border border-white/[0.08] focus:border-sky-500 text-stone-100 font-mono text-sm outline-none"
                  />
                </div>
              </div>

              {/* Document Options: Duplex & Bulk Tier Toggle */}
              {activeService.category !== 'RUSH_ID' && (
                <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                      <input
                        type="checkbox"
                        checked={isDuplex}
                        onChange={(e) => setIsDuplex(e.target.checked)}
                        className="rounded accent-sky-500"
                      />
                      <span>Back-to-Back (Duplex Print)</span>
                    </label>
                    {isDuplex && (
                      <span className="text-[10px] font-mono text-emerald-400">-5% paper discount</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                      <input
                        type="checkbox"
                        checked={applyBulkDiscount}
                        onChange={(e) => setApplyBulkDiscount(e.target.checked)}
                        className="rounded accent-sky-500"
                      />
                      <span>Enable Bulk Wholesale Tier</span>
                    </label>
                    {applyBulkDiscount && bulkDiscountRate > 0 && (
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        Tier Discount: -{Math.round(bulkDiscountRate * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Auto Deduct Consumables Toggle */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
                <label className="flex items-center gap-2 cursor-pointer text-stone-400 text-[11px]">
                  <input
                    type="checkbox"
                    checked={deductPaperSupplies}
                    onChange={(e) => setDeductPaperSupplies(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Auto-deduct paper sheets from Supplies Radar</span>
                </label>
              </div>

              {/* Total Calculation Display */}
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
                  <span>Units Breakdown:</span>
                  <span>{pages} {activeService.category === 'RUSH_ID' ? 'pkg' : 'pages'} × {copies} sets = <strong>{totalUnits} units</strong></span>
                </div>
                {bulkDiscountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-400 font-mono">
                    <span>Wholesale Discount (-{Math.round(bulkDiscountRate * 100)}%):</span>
                    <span>-₱{bulkDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                {rushAddonsTotal > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-400 font-mono">
                    <span>Rush ID Extras:</span>
                    <span>+₱{rushAddonsTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-sky-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Total Due:
                  </span>
                  <span className="text-2xl font-mono font-black text-sky-400">
                    ₱{finalTotalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleChargeService(false, true)}
                  className="btn-press flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-obsidian-950 hover:bg-white/[0.04] border border-white/[0.1] text-stone-200 font-bold text-xs transition-all"
                  title="Save job and print thermal claim ticket for customer"
                >
                  <Printer className="h-3.5 w-3.5 text-sky-400" />
                  <span>Claim Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChargeService(false, false)}
                  className="btn-press flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-obsidian-950 hover:bg-white/[0.04] border border-white/[0.1] text-stone-200 font-bold text-xs transition-all"
                  title="Direct cash sale without printing slip"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Log Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChargeService(true, false)}
                  className="btn-press flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-obsidian-950 font-bold text-xs shadow-glow-sky transition-all"
                  title="Push this job directly to the POS Cart for cashier checkout"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 2: SERVICE CATALOG & CUSTOM PRICE MANAGER               */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'catalog' && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-400" />
                <span>Printing &amp; Copying Service Catalog</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Standard Philippine retail print shop pricing rates. You can edit unit rates inline.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setServices(INITIAL_PRESET_SERVICES)
                playScanSuccess()
              }}
              className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-stone-400 hover:text-stone-200"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset to Standard Rates</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="p-4 rounded-2xl border border-white/[0.06] bg-obsidian-950/80 hover:border-sky-500/30 transition-all space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    srv.category === 'RUSH_ID'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                  }`}>
                    {srv.category}
                  </span>
                  {srv.badge && (
                    <span className="text-[9px] font-mono font-bold text-stone-400">
                      {srv.badge}
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-stone-100">{srv.name}</h4>
                <p className="text-[11px] text-stone-400 line-clamp-2">{srv.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-[11px] font-mono text-stone-400">Unit Rate:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-500 font-serif">₱</span>
                    <input
                      type="number"
                      step="any"
                      defaultValue={srv.suggestedPricePerUnit}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val) && val > 0) {
                          handleUpdateServiceRate(srv.id, val)
                        }
                      }}
                      className="w-20 px-2 py-1 rounded-lg bg-obsidian-900 border border-white/[0.1] text-xs font-mono font-bold text-sky-400 text-right outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 3: PRINT JOB LEDGER & THERMAL TICKETS                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-sky-400" />
                <span>Customer Print Services Ledger</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Complete audit trail of all customer print, copy, rush ID, and binding orders.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={ledgerSearchQuery}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  placeholder="Search customer, job #..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-white/[0.08] bg-obsidian-950 text-xs text-stone-100 outline-none focus:border-sky-500/60 w-52 font-sans"
                />
              </div>

              {/* Status Filter */}
              <select
                value={ledgerStatusFilter}
                onChange={(e) => setLedgerStatusFilter(e.target.value as any)}
                className="py-1.5 px-3 rounded-xl border border-white/[0.08] bg-obsidian-950 text-xs font-bold text-stone-200 outline-none focus:border-sky-500/60"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_PICKUP">Pending Pickup</option>
                <option value="CLAIMED">Claimed</option>
                <option value="COMPLETED">Completed</option>
              </select>

              {/* CSV Export Button */}
              <button
                type="button"
                onClick={handleExportLedgerCsv}
                className="btn-press flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-xs font-bold text-sky-400 transition-all shadow-glow-sky"
                title="Export print jobs ledger to CSV spreadsheet"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian-950/90 border-b border-white/[0.08] text-stone-400 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">Job ID / Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service &amp; Quantity</th>
                  <th className="py-3 px-4">Add-ons / Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500 font-sans">
                      No matching print jobs logged in ledger.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-bold text-sky-400 text-xs">{j.id}</p>
                        <p className="text-[10px] text-stone-500">{formatDateTime(j.createdAt)}</p>
                      </td>
                      <td className="py-3 px-4 font-sans whitespace-nowrap">
                        <p className="font-bold text-stone-200">{j.customerName}</p>
                        {j.customerPhone && (
                          <p className="text-[10px] font-mono text-stone-500">{j.customerPhone}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <p className="font-semibold text-stone-200">{j.serviceName}</p>
                        <p className="text-[10px] font-mono text-stone-400">
                          {j.totalUnits} units @ ₱{j.unitPrice.toFixed(2)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-stone-400 font-sans">
                        {j.addonsNote || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-black font-serif text-sm text-stone-100 whitespace-nowrap">
                        ₱{j.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleJobStatus(j.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                            j.status === 'PENDING_PICKUP'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : j.status === 'CLAIMED'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {j.status.replace('_', ' ')}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setClaimSlipJob(j)}
                            title="Print Thermal Claim Ticket"
                            className="btn-press p-1.5 rounded-lg border border-white/[0.08] text-stone-400 hover:text-sky-400 hover:border-sky-500/40"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setJobToDeleteId(j.id)}
                            title="Void / Delete Record"
                            className="btn-press p-1.5 rounded-lg border border-white/[0.08] text-stone-500 hover:text-rose-400 hover:border-rose-500/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 4: PAPER & CONSUMABLES STOCK RADAR                      */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'supplies' && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Copy className="h-4 w-4 text-sky-400" />
                <span>Paper &amp; Consumables Stock Radar</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Monitor paper reams, glossy sheets, and PVC supplies to prevent running out during rush jobs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplies.map((item) => {
              const isLow = item.stockCount <= item.reorderLevel
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isLow
                      ? 'border-rose-500/30 bg-rose-500/[0.05]'
                      : 'border-white/[0.06] bg-obsidian-950/80 hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-stone-400 font-bold">
                      {item.category}
                    </span>
                    {isLow ? (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        LOW STOCK
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        HEALTHY
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-stone-100">{item.name}</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-mono font-black ${isLow ? 'text-rose-400' : 'text-stone-100'}`}>
                        {item.stockCount}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">{item.unit} remaining</span>
                    </div>
                    <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                      Reorder alert when below {item.reorderLevel} {item.unit}
                    </p>
                  </div>

                  {/* Quick Restock Buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04]">
                    <span className="text-[10px] font-mono text-stone-400">Quick Add:</span>
                    <button
                      type="button"
                      onClick={() => handleRestockSupply(item.id, 50)}
                      className="px-2 py-1 text-[10px] font-mono font-bold rounded-lg border border-white/[0.08] bg-obsidian-900 text-stone-300 hover:border-sky-500/40 hover:text-sky-300 transition-all"
                    >
                      +50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestockSupply(item.id, 100)}
                      className="px-2 py-1 text-[10px] font-mono font-bold rounded-lg border border-white/[0.08] bg-obsidian-900 text-stone-300 hover:border-sky-500/40 hover:text-sky-300 transition-all"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestockSupply(item.id, 500)}
                      className="px-2 py-1 text-[10px] font-mono font-bold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      title="Add 1 full ream (500 sheets)"
                    >
                      +1 Ream (500)
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* THERMAL PRINT CLAIM SLIP MODAL                              */}
      {/* ─────────────────────────────────────────────────────────── */}
      {claimSlipJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-sky-500/30 p-6 shadow-vault space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Printer className="h-4 w-4" />
                <span>Customer Claim Ticket</span>
              </div>
              <button
                type="button"
                onClick={() => setClaimSlipJob(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div className="p-4 rounded-2xl bg-white text-stone-900 font-mono text-xs space-y-2 shadow-inner">
              <div className="text-center border-b border-stone-300 pb-2">
                <p className="font-black text-sm uppercase">{storeName}</p>
                <p className="text-[10px] text-stone-600">CUSTOMER PRINT SERVICES CLAIM TICKET</p>
                <p className="text-[10px] text-stone-500">{formatDateTime(claimSlipJob.createdAt)}</p>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span>Job ID:</span>
                  <span className="font-bold">{claimSlipJob.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{claimSlipJob.customerName}</span>
                </div>
                {claimSlipJob.customerPhone && (
                  <div className="flex justify-between">
                    <span>Contact:</span>
                    <span>{claimSlipJob.customerPhone}</span>
                  </div>
                )}
                <div className="border-t border-stone-300 pt-1">
                  <p className="font-bold">{claimSlipJob.serviceName}</p>
                  <p className="text-[10px] text-stone-600">
                    {claimSlipJob.pages} pages × {claimSlipJob.copies} copies = {claimSlipJob.totalUnits} units
                  </p>
                </div>
                {claimSlipJob.addonsNote && (
                  <div className="text-[10px] text-stone-600 italic">
                    Specs: {claimSlipJob.addonsNote}
                  </div>
                )}
                <div className="flex justify-between border-t border-stone-300 pt-1">
                  <span>Unit Rate:</span>
                  <span>₱{claimSlipJob.unitPrice.toFixed(2)}</span>
                </div>
                {claimSlipJob.bulkDiscountAmount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Discount:</span>
                    <span>-₱{claimSlipJob.bulkDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-stone-800 pt-1">
                  <span>TOTAL DUE:</span>
                  <span>₱{claimSlipJob.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center border-t border-stone-300 pt-2 text-[10px] text-stone-600">
                <p>Status: {claimSlipJob.status.replace('_', ' ')}</p>
                <p>Cashier: {claimSlipJob.cashierName || currentCashierName}</p>
                <p className="mt-1 font-sans">Thank you for trusting our print services!</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setClaimSlipJob(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-obsidian-950 font-bold text-xs shadow-glow-sky flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Thermal Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* DELETE JOB CONFIRMATION MODAL                               */}
      {/* ─────────────────────────────────────────────────────────── */}
      {jobToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-rose-500/30 p-6 shadow-vault space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="h-4 w-4" />
                <span>Confirm Void / Delete</span>
              </div>
              <button
                type="button"
                onClick={() => setJobToDeleteId(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 font-sans">
              Are you sure you want to permanently delete this print job record? This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setJobToDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteJob}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
