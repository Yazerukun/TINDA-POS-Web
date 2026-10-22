import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  BarChart3,
  Users,
  Printer,
  ArrowRight,
  LogIn,
  UserPlus,
  CalendarClock,
  ScanLine,
  Zap,
  ChevronRight,
  WifiOff,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Clock,
  Database,
  Smartphone,
  Laptop,
  Search,
  ShoppingBag,
  Receipt,
  TrendingUp,
  Tag,
  HelpCircle,
  Check,
  Store,
  RotateCcw,
  BadgePercent,
  Wifi,
  Crown,
  Layers,
  ChevronDown,
  Volume2,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  FileText,
  Copy,
  Sliders,
  DollarSign,
  Activity,
  HardDrive
} from 'lucide-react'
import { AppLogo } from './AppLogo'
import { CyberStreetScene } from './CyberStreetScene'
import { playScanSuccess, playStoreChime } from '../lib/sound'

interface LandingPageProps {
  onOpenLogin: () => void
  onOpenSignup: () => void
  onQuickDemo: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA: Pre-loaded DTI SRP Items for Interactive Radar
// ─────────────────────────────────────────────────────────────────────────────
interface DtiItem {
  name: string
  category: 'Canned Fish' | 'Noodles' | 'Milk' | 'Condiments' | 'Coffee' | 'Bread'
  srpCeiling_c: number
  typicalCost_c: number
  unit: string
  barcode: string
}

const DTI_SRP_DATABASE: DtiItem[] = [
  {
    name: 'Mega Sardines in Tomato Sauce 155g',
    category: 'Canned Fish',
    srpCeiling_c: 2425,
    typicalCost_c: 2050,
    unit: 'can',
    barcode: '4800016644812'
  },
  {
    name: 'Lucky Me! Instant Pancit Canton Kalamansi 60g',
    category: 'Noodles',
    srpCeiling_c: 1550,
    typicalCost_c: 1250,
    unit: 'pack',
    barcode: '4800016644818'
  },
  {
    name: 'Bear Brand Fortified Powdered Milk 300g',
    category: 'Milk',
    srpCeiling_c: 9100,
    typicalCost_c: 7800,
    unit: 'pouch',
    barcode: '4800361376822'
  },
  {
    name: 'Silver Swan Special Soy Sauce 385ml',
    category: 'Condiments',
    srpCeiling_c: 2150,
    typicalCost_c: 1750,
    unit: 'bottle',
    barcode: '4800049720015'
  },
  {
    name: 'Datu Puti Pure Vinegar 385ml',
    category: 'Condiments',
    srpCeiling_c: 1950,
    typicalCost_c: 1580,
    unit: 'bottle',
    barcode: '4800049710016'
  },
  {
    name: 'Nescafe Classic 50g Refill',
    category: 'Coffee',
    srpCeiling_c: 4800,
    typicalCost_c: 3950,
    unit: 'pouch',
    barcode: '4800361405102'
  },
  {
    name: 'San Marino Corned Tuna 150g',
    category: 'Canned Fish',
    srpCeiling_c: 3950,
    typicalCost_c: 3200,
    unit: 'can',
    barcode: '4806502390114'
  },
  {
    name: 'Gardenia Classic White Bread 400g',
    category: 'Bread',
    srpCeiling_c: 4850,
    typicalCost_c: 4100,
    unit: 'loaf',
    barcode: '4800110022017'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// DATA: Hardware Compatibility Specifications
// ─────────────────────────────────────────────────────────────────────────────
const HARDWARE_ITEMS = [
  {
    icon: Printer,
    title: '58mm & 80mm ESC/POS Thermal Printers',
    specs: 'Standard Bluetooth, USB & Network printers (Xprinter, Epson, Milestone, GOOJPRT). Zero drivers required.'
  },
  {
    icon: ScanLine,
    title: 'USB & Wireless Barcode Scanners',
    specs: 'Plug-and-play laser & CCD barcode guns with instant sub-20ms EAN-13, UPC, Code-128 keyboard wedge support.'
  },
  {
    icon: Smartphone,
    title: 'Integrated Device Camera Scanner',
    specs: 'High-speed camera video decoding with real-time green targeting guide and auto-flashlight trigger.'
  },
  {
    icon: Laptop,
    title: 'Cross-Platform Browser Architecture',
    specs: 'Runs natively on Windows PCs, MacBooks, Chromebooks, Android Tablets, iPads, and smartphones.'
  },
  {
    icon: Database,
    title: 'Client-Side Offline Dexie DB Engine',
    specs: 'Persistent browser IndexedDB with zero cloud dependency. Continues transactions through complete blackouts.'
  },
  {
    icon: ShieldCheck,
    title: 'Cash Drawer RJ-11 Kick Pulse',
    specs: 'Automated 12V/24V pulse signal on cash receipt finalization to trigger physical cash drawers.'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// DATA: Frequently Asked Questions
// ─────────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Does TINDA POS really work without an active internet connection?',
    a: 'Yes, 100%. TINDA POS is engineered with an offline-first architecture using client-side IndexedDB (Dexie v4). All product databases, barcode lookups, cart transactions, and customer credit ledgers reside on your local device. When internet restores, transactions automatically synchronize with Cloudflare D1 and Supabase.'
  },
  {
    q: 'Do I need to buy expensive proprietary POS hardware?',
    a: 'Not at all. TINDA POS runs in any modern browser on hardware you already own—laptops, desktop PCs, Android tablets, iPads, or smartphones. You can plug in standard affordable ₱1,200 thermal printers and ₱800 USB barcode scanners out of the box.'
  },
  {
    q: 'What is the DTI Suggested Retail Price (SRP) watchdog feature?',
    a: 'The Philippine Department of Trade & Industry issues official price ceilings for basic necessities and prime commodities. TINDA POS includes 172+ official DTI price ceilings pre-loaded, protecting your storefront from accidental overpricing and simplifying catalog setup.'
  },
  {
    q: 'Can I track customer credit accounts (Utang) and print thermal statements?',
    a: 'Yes. The Audited Customer Credit Engine allows you to define per-customer credit ceilings, record timestamped partial payments, inspect balance histories, copy polite SMS reminders in one tap, and print audited 58mm/80mm statements.'
  },
  {
    q: 'Is there any monthly subscription or transaction fee?',
    a: 'TINDA POS Web includes a 100% Free Tier for single-counter stores with unrestricted barcode scanning, offline operations, and thermal printing. Optional VIP upgrades (₱500 one-time lifetime license) unlock multi-device cloud synchronization, daily automated backups, and priority support.'
  }
]

export function LandingPage({
  onOpenLogin,
  onOpenSignup,
  onQuickDemo
}: LandingPageProps): React.JSX.Element {
  // ── Simulator State ──
  const [simCart, setSimCart] = useState<
    Array<{ name: string; price: number; qty: number; barcode: string }>
  >([
    { name: 'Lucky Me! Instant Pancit Canton Kalamansi', price: 15.5, qty: 2, barcode: '4800016644818' },
    { name: 'Mega Sardines in Tomato Sauce 155g', price: 24.25, qty: 1, barcode: '4800016644812' }
  ])
  const [simDiscount, setSimDiscount] = useState<'NONE' | 'SENIOR'>('NONE')
  const [simTender, setSimTender] = useState<number>(100)
  const [lastScannedItem, setLastScannedItem] = useState<string>('')

  // ── DTI Search State ──
  const [dtiSearch, setDtiSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // ── ROI Calculator State ──
  const [dailyCustomers, setDailyCustomers] = useState(120)

  // ── FAQ Toggle State ──
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // ── Interactive Utang Demo State ──
  const [copiedSms, setCopiedSms] = useState(false)

  // ── Calculations for Simulator ──
  const simSubtotal = useMemo(
    () => simCart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [simCart]
  )
  const simDiscountAmount = simDiscount === 'SENIOR' ? simSubtotal * 0.2 : 0
  const simTotal = Math.max(0, simSubtotal - simDiscountAmount)
  const simChange = Math.max(0, simTender - simTotal)

  const handleSimAddProduct = (item: DtiItem) => {
    try {
      playScanSuccess()
    } catch {}
    setLastScannedItem(item.name)
    setSimCart((prev) => {
      const existing = prev.find((p) => p.barcode === item.barcode)
      if (existing) {
        return prev.map((p) =>
          p.barcode === item.barcode ? { ...p, qty: p.qty + 1 } : p
        )
      }
      return [
        ...prev,
        {
          name: item.name,
          price: item.srpCeiling_c / 100,
          qty: 1,
          barcode: item.barcode
        }
      ]
    })
  }

  const handleSimClearCart = () => {
    setSimCart([])
    setLastScannedItem('')
  }

  // ── Filtered DTI Items ──
  const filteredDtiItems = useMemo(() => {
    return DTI_SRP_DATABASE.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory
      const matchesQuery =
        item.name.toLowerCase().includes(dtiSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(dtiSearch.toLowerCase()) ||
        item.barcode.includes(dtiSearch)
      return matchesCategory && matchesQuery
    })
  }, [dtiSearch, selectedCategory])

  // ── ROI Calculations ──
  const timeSavedMinutes = Math.round(dailyCustomers * 1.25)
  const monthlySpoilageSaved = Math.round(dailyCustomers * 28.5)
  const monthlyUtangRecovered = Math.round(dailyCustomers * 42.0)
  const totalMonthlyGain = monthlySpoilageSaved + monthlyUtangRecovered

  const handleCopySms = () => {
    const text =
      'Good day! Friendly reminder regarding your store account balance of ₱450.00. Thank you very much for your valued patronage.'
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedSms(true)
    setTimeout(() => setCopiedSms(false), 2500)
  }

  return (
    <div className="min-h-[100svh] bg-[#070a0f] text-slate-100 flex flex-col selection:bg-emerald-500/25 selection:text-emerald-200 relative overflow-x-hidden font-sans antialiased">
      {/* ── PRECISION MICRO-GRID BACKGROUND (ARCHITECTURAL & CRISP) ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
        {/* Subtle Engineering Dot Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
        {/* Top Vignette Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_75%)]" />
      </div>

      {/* ── 1. GLOBAL FLOATING DYNAMIC CAPSULE HEADER (LINEAR / APPLE STANDARD) ── */}
      <header className="sticky top-3 sm:top-5 z-50 w-full px-3 sm:px-6 max-w-6xl mx-auto transition-all">
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#070a0f]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.06)]">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <AppLogo size={30} animated={false} showBadge={false} />
            <div className="flex items-baseline gap-1.5 select-none">
              <span className="font-sans text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                TINDA
              </span>
              <span className="text-[0.6875rem] font-mono font-bold text-emerald-400">
                OS
              </span>
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[0.5625rem] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 ml-1">
                v1.2.0
              </span>
            </div>
          </div>

          {/* Centered Segmented Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.02] border border-white/[0.04]">
            <a
              href="#simulator"
              className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Terminal
            </a>
            <a
              href="#architecture"
              className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Platform
            </a>
            <a
              href="#dti-radar"
              className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              DTI Radar
            </a>
            <a
              href="#utang-ledger"
              className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Credit Risk
            </a>
            <a
              href="#hardware"
              className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Hardware
            </a>
            <a
              href="#compare"
              className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Comparison
            </a>
          </nav>

          {/* Unified Action Hierarchy */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={onQuickDemo}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer"
              title="Instant Sandbox Mode"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Demo</span>
            </button>

            <button
              onClick={onOpenLogin}
              className="px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign In</span>
            </button>

            <button
              onClick={onOpenSignup}
              className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(52,211,153,0.35)] active:scale-[0.98]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Launch Counter</span>
              <span className="sm:hidden">Register</span>
              <ArrowRight className="w-3 h-3 hidden sm:inline ml-0.5 opacity-80" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION: THE OFFLINE RETAIL OS ── */}
      <section className="relative z-10 pt-12 sm:pt-16 lg:pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        {/* Operational Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 text-xs font-mono mb-6 backdrop-blur-md shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-emerald-400">STATION OPERATIONAL</span>
          <span className="text-slate-600">·</span>
          <span>100% OFFLINE PERSISTENCE</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">DTI DAO 23-01 COMPLIANT</span>
        </div>

        {/* Hero Headline — Crisp, Authoritative & Non-AI */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          The Offline-First Retail OS for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400">
            Ground-Level Commerce
          </span>
        </h1>

        {/* Professional Subheading */}
        <p className="mt-5 sm:mt-6 text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Engineered for high-volume convenience counters, retail groceries, and storefronts. Sub-20ms laser barcode decoding, audited customer credit ledgers, and official DTI price ceiling enforcement—with <span className="text-slate-100 font-semibold">zero monthly subscriptions</span>.
        </p>

        {/* Action Button Cluster */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onOpenSignup}
            className="group px-6 sm:px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm tracking-tight transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_20px_-4px_rgba(16,185,129,0.4)]"
          >
            <span>Deploy Free Counter</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenLogin}
            className="px-6 sm:px-7 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-medium text-sm tracking-tight border border-slate-700/80 transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Open Cashier Terminal</span>
          </button>

          <button
            onClick={onQuickDemo}
            className="px-5 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold border border-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Sandbox</span>
          </button>
        </div>

        {/* Hardware & Standard Proof Strip */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-200">100% Offline</p>
              <p className="text-[0.625rem] text-slate-500 font-mono">Dexie IndexedDB v4</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-200">Sub-20ms Scan</p>
              <p className="text-[0.625rem] text-slate-500 font-mono">Laser & Camera Wedge</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-200">58mm / 80mm</p>
              <p className="text-[0.625rem] text-slate-500 font-mono">Native ESC/POS Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-200">₱0 Subscriptions</p>
              <p className="text-[0.625rem] text-slate-500 font-mono">No Recurring License</p>
            </div>
          </div>
        </div>

        {/* ── LIVING PHILIPPINE COMMERCE ENVIRONMENT (CYBER-STREET SIMULATION) ── */}
        <div className="mt-12 text-left">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
              <Store className="w-4 h-4" />
              <span>Ground-Level Retail Environment Simulator</span>
            </span>
            <span className="text-[0.6875rem] font-mono text-slate-400 hidden sm:inline">
              Simulating Real Retail Operations, Edge Hardware, & Active Aviation Sync
            </span>
          </div>

          <CyberStreetScene onQuickDemo={onQuickDemo} onOpenLogin={onOpenLogin} />
        </div>
      </section>

      {/* ── 3. INTERACTIVE CASHIER COUNTER & 58MM PRINT ENGINE (HERO SHOWCASE) ── */}
      <section id="simulator" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400 mb-2 block">
            Tactile Hardware Sandbox
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Experience the High-Speed Cashier Terminal
          </h2>
          <p className="text-sm text-slate-400 mt-2.5">
            Click any inventory item below to simulate an instantaneous barcode scan. Observe the subtotal, statutory discount, and 58mm thermal receipt render in real-time with sub-millisecond precision.
          </p>
        </div>

        {/* Precision Hardware POS Window Frame */}
        <div className="rounded-2xl border border-slate-800 bg-[#090d16] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-slate-400">
                TERMINAL-01 · EXECUTIVE CASHIER DESK · BRGY-01 CEBU
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[0.6875rem] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OFFLINE ENGINE READY
              </span>
              <button
                onClick={handleSimClearCart}
                className="text-[0.6875rem] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Cart</span>
              </button>
            </div>
          </div>

          {/* 3-Column Split: Barcode Item Shelf | Live Cart & Keypad | Simulated Thermal Receipt */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left: Quick Item Barcode Shelf (4 cols) */}
            <div className="lg:col-span-4 p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4 text-emerald-400" />
                  <span>Click Item to Scan</span>
                </span>
                <span className="text-[0.6875rem] font-mono text-emerald-400">
                  ⚡ 0.02s Barcode Decoder
                </span>
              </div>

              {lastScannedItem && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-fade-in">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Beep! Scanned: {lastScannedItem}</span>
                </div>
              )}

              <div className="space-y-2">
                {DTI_SRP_DATABASE.slice(0, 5).map((item) => (
                  <button
                    key={item.barcode}
                    onClick={() => handleSimAddProduct(item)}
                    className="btn-press w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-emerald-500/[0.08] border border-slate-800 hover:border-emerald-500/40 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-emerald-300 truncate">
                        {item.name}
                      </p>
                      <p className="text-[0.625rem] font-mono text-slate-500 mt-0.5">
                        EAN: {item.barcode} · {item.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-bold text-emerald-400">
                        ₱{(item.srpCeiling_c / 100).toFixed(2)}
                      </p>
                      <span className="text-[0.5625rem] font-mono text-slate-500 uppercase">
                        + Tap Scan
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={onQuickDemo}
                  className="btn-press w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Launch Live Fullscreen Counter</span>
                </button>
              </div>
            </div>

            {/* Center: Live Cart, Discount & Keypad (4 cols) */}
            <div className="lg:col-span-4 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>Cart ({simCart.reduce((sum, i) => sum + i.qty, 0)} items)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    ₱{simSubtotal.toFixed(2)}
                  </span>
                </div>

                {/* Cart Lines */}
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {simCart.length === 0 ? (
                    <div className="text-center py-8 text-xs font-mono text-slate-500">
                      Cart is empty. Tap any product on the left to scan.
                    </div>
                  ) : (
                    simCart.map((item) => (
                      <div
                        key={item.barcode}
                        className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-200 truncate">{item.name}</p>
                          <p className="text-[0.625rem] font-mono text-slate-500">
                            ₱{item.price.toFixed(2)} × {item.qty}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-slate-100">
                          ₱{(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Senior / PWD Discount Selector */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <p className="text-[0.625rem] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Philippine Statutory Discount (RA 9994)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSimDiscount('NONE')}
                      className={`btn-press py-1.5 px-3 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        simDiscount === 'NONE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Regular Price
                    </button>
                    <button
                      onClick={() => setSimDiscount('SENIOR')}
                      className={`btn-press py-1.5 px-3 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        simDiscount === 'SENIOR'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      <BadgePercent className="w-3.5 h-3.5" />
                      <span>Senior / PWD (-20%)</span>
                    </button>
                  </div>
                </div>

                {/* Quick Cash Tender Keypad */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <p className="text-[0.625rem] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Quick Cash Tender
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setSimTender(amt)}
                        className={`btn-press py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          simTender === amt
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-bold'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        ₱{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Summary Bar */}
              <div className="mt-5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono">₱{simSubtotal.toFixed(2)}</span>
                </div>
                {simDiscount === 'SENIOR' && (
                  <div className="flex justify-between text-xs text-amber-300 font-mono mt-1">
                    <span>Senior/PWD 20% Discount</span>
                    <span>-₱{simDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white mt-2 pt-2 border-t border-slate-800">
                  <span>Total Due</span>
                  <span className="font-mono text-emerald-400 text-base">₱{simTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mt-1">
                  <span>Cash Tendered (₱{simTender})</span>
                  <span className="text-emerald-300 font-bold">
                    Change: ₱{simChange.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Realistic 58mm Thermal Receipt Output (4 cols) */}
            <div className="lg:col-span-4 p-5 bg-[#05080e] flex flex-col items-center justify-center">
              <div className="w-full max-w-[270px] bg-white text-slate-900 p-4 rounded-md shadow-2xl font-mono text-[0.6875rem] leading-tight select-none border border-slate-300">
                {/* Header Information */}
                <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
                  <p className="font-bold text-sm tracking-wider uppercase">TINDA STORE #01</p>
                  <p className="text-[0.625rem] text-slate-600">BRGY. POBLACION, CEBU CITY</p>
                  <p className="text-[0.5625rem] text-slate-500">TIN: 123-456-789-000</p>
                  <p className="text-[0.5625rem] text-slate-500 mt-0.5">
                    {new Date().toLocaleDateString('en-US')} · {new Date().toLocaleTimeString('en-US')}
                  </p>
                </div>

                {/* Line Items */}
                <div className="space-y-1 border-b border-dashed border-slate-400 pb-2 mb-2 min-h-[90px]">
                  {simCart.map((i) => (
                    <div key={i.barcode} className="flex justify-between">
                      <span className="truncate max-w-[170px]">
                        {i.qty}x {i.name}
                      </span>
                      <span>{(i.price * i.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Receipt Totals */}
                <div className="space-y-1 text-slate-800">
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>₱{simSubtotal.toFixed(2)}</span>
                  </div>
                  {simDiscount === 'SENIOR' && (
                    <div className="flex justify-between font-bold text-red-700">
                      <span>PWD/SR 20%:</span>
                      <span>-₱{simDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-400">
                    <span>TOTAL:</span>
                    <span>₱{simTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[0.625rem] pt-1">
                    <span>CASH TENDER:</span>
                    <span>₱{simTender.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[0.6875rem]">
                    <span>CHANGE:</span>
                    <span>₱{simChange.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer Barcode */}
                <div className="text-center pt-3 border-t border-dashed border-slate-400 mt-2">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 text-[0.5625rem] font-bold tracking-widest rounded-sm">
                    ||||| |||| ||||| ||||
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[0.6875rem] font-mono text-slate-400 flex items-center gap-1.5 justify-center">
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>58mm ESC/POS Native Emulation</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SIX CORE ARCHITECTURAL CAPABILITIES (BENTO GRID 2.0) ── */}
      <section id="architecture" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400 mb-2 block">
            System Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered for Ground-Level Store Operations
          </h2>
          <p className="text-sm text-slate-400 mt-2.5">
            Every layer is purpose-built to eliminate retail bottlenecks: line congestion, disputed customer debts, inventory spoilage, and utility blackouts.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Sub-20ms Barcode */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <ScanLine className="w-5 h-5" />
                </div>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Sub-20ms Engine
                </span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight mb-2">
                Sub-20ms Barcode Engine
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant decoding of standard EAN-13, UPC-A, and Code-128 barcodes via USB laser wedge or integrated camera scanner with zero lag.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span>Hardware Laser & Camera Wedge</span>
            </div>
          </div>

          {/* Card 2: DTI SRP Price Radar */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  DAO 23-01 Compliant
                </span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight mb-2">
                DTI SRP Price Radar
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-loaded with 172+ official Department of Trade & Industry retail ceilings. Protects store owners from accidental overpricing penalties.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-amber-300">
              <Check className="w-3.5 h-3.5" />
              <span>Official E-Presyo Standards</span>
            </div>
          </div>

          {/* Card 3: Audited Utang Ledger */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Credit Risk Ledger
                </span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight mb-2">
                Audited Customer Credit (Utang)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Granular credit ceilings, date-stamped balance histories, automated statement printing, and 1-tap polite reminder generation.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span>Reclaims ~₱3,200/mo Lost Debt</span>
            </div>
          </div>

          {/* Card 4: Dual-Cloud Failover */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Dual-Edge Cloud
                </span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight mb-2">
                Dual-Cloud Auto Failover
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Primary persistence via Cloudflare D1 Edge Workers with automatic seamless fallback to Supabase Managed PostgreSQL.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-teal-400">
              <Check className="w-3.5 h-3.5" />
              <span>Zero Downtime Architecture</span>
            </div>
          </div>

          {/* Card 5: Thermal Printing Engine */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  ESC/POS Native
                </span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight mb-2">
                Universal Thermal Engine
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Native raw ESC/POS formatting for 58mm & 80mm Bluetooth, USB, and network receipt printers with automatic cash drawer kick-out.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span>58mm & 80mm ESC/POS Certified</span>
            </div>
          </div>

          {/* Card 6: Spoilage & Expiry Radar */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Zero Spoilage
                </span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight mb-2">
                Perishable Expiration Radar
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated 7, 14, and 30-day proactive alerts. Schedule proactive markdowns to liquidate aging goods before spoilage.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-rose-400">
              <Check className="w-3.5 h-3.5" />
              <span>Saves ~₱2,800/mo Inventory</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. DTI SUGGESTED RETAIL PRICE WATCHDOG (INTERACTIVE) ── */}
      <section id="dti-radar" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-amber-400 mb-2 block">
            Government Compliance Standard
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Official DTI Suggested Retail Price Watchdog
          </h2>
          <p className="text-sm text-slate-400 mt-2.5">
            Pre-loaded with official Philippine Department of Trade & Industry ceilings for basic commodities. Protect your storefront from price-freeze violations.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="max-w-4xl mx-auto mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={dtiSearch}
              onChange={(e) => setDtiSearch(e.target.value)}
              placeholder="Search pre-loaded DTI commodities (e.g. Sardines, Pancit Canton, Milk, Soy Sauce)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:bg-slate-900/90 text-white text-sm placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['All', 'Canned Fish', 'Noodles', 'Milk', 'Condiments', 'Coffee', 'Bread'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn-press px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {filteredDtiItems.map((item) => {
            const marginPct = (
              ((item.srpCeiling_c - item.typicalCost_c) / item.typicalCost_c) *
              100
            ).toFixed(1)
            return (
              <div
                key={item.barcode}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.category}
                    </span>
                    <span className="text-[0.625rem] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      DTI Verified
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-[0.625rem] font-mono text-slate-500 mt-1">
                    Barcode: {item.barcode}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">DTI Ceiling:</span>
                    <span className="font-mono font-bold text-amber-300">
                      ₱{(item.srpCeiling_c / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[0.6875rem]">
                    <span className="text-slate-500">Typical Wholesale:</span>
                    <span className="font-mono text-slate-400">
                      ₱{(item.typicalCost_c / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[0.6875rem]">
                    <span className="text-slate-500">Gross Margin:</span>
                    <span className="font-mono font-bold text-emerald-400">+{marginPct}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 6. AUDITED CUSTOMER CREDIT (UTANG) LEDGER ── */}
      <section id="utang-ledger" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400 mb-2 block">
            Customer Credit Ledger
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Eliminate Uncollectible Debts &amp; Ledger Disputes
          </h2>
          <p className="text-sm text-slate-400 mt-2.5">
            Replace vulnerable paper notebooks and awkward collection conversations. TINDA POS tracks exact customer credit limits, date-stamped balance histories, and generates formal 58mm thermal statements.
          </p>
        </div>

        {/* Side-by-Side Comparison: Tattered Paper vs High-Tech Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Old Way: Kwaderno / Paper Notebook */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-red-900/30 text-slate-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-900/30">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Traditional Paper Notebook (Kwaderno)</span>
                </span>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-900/40">
                  High Risk &amp; Unaudited
                </span>
              </div>

              {/* Simulated Paper Ledger Lines */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 font-mono text-xs text-slate-400">
                <div className="flex justify-between line-through decoration-red-500 opacity-60">
                  <span>Customer A - Rice &amp; Noodles</span>
                  <span>₱145.00 (Crossed out without stamp)</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-800 pb-2">
                  <span className="text-amber-200">Customer B - Beverage crate + cigarettes</span>
                  <span className="text-amber-300 font-bold">₱450.00 (No date record)</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[0.6875rem]">
                  <span>Contractor crew groceries</span>
                  <span>₱1,200.00 (Disputed quantity)</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">✕</span>
                  <span>Water-damaged, ripped pages, and lost receipts during counter rushes.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">✕</span>
                  <span>Awkward debt collection without verifiable transaction timestamps.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">✕</span>
                  <span>Average ₱3,500 – ₱8,000 in unrecoverable credit loss per month.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 text-[0.6875rem] font-mono text-red-400/80">
              Zero backup redundancy if the notebook is misplaced or damaged
            </div>
          </div>

          {/* New Way: TINDA Digital Utang Engine */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-emerald-500/30 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.15)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>TINDA Audited Customer Credit Engine</span>
                </span>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Audited &amp; Offline-1st
                </span>
              </div>

              {/* Digital Customer Profile Widget */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                      MB
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">VIP Store Account #0042</p>
                      <p className="text-[0.625rem] font-mono text-slate-400">Ceiling: ₱1,000.00 · Tier: Gold</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-amber-300">₱450.00</span>
                </div>

                {/* Credit Limit Progress */}
                <div>
                  <div className="flex justify-between text-[0.625rem] font-mono text-slate-400 mb-1">
                    <span>Credit Utilized: 45%</span>
                    <span className="text-emerald-400">₱550.00 Available Credit</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full w-[45%]" />
                  </div>
                </div>

                {/* 1-Tap Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopySms}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-emerald-500/15 border border-slate-800 text-[0.6875rem] font-mono text-emerald-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3 text-emerald-400" />
                    <span>{copiedSms ? 'Copied to Clipboard!' : 'Copy Polite SMS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try { playScanSuccess() } catch {}
                    }}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-emerald-500/15 border border-slate-800 text-[0.6875rem] font-mono text-emerald-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3 h-3 text-emerald-400" />
                    <span>Print 58mm Statement</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Exact integer centavo math with zero floating-point rounding errors.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Generates formal 58mm thermal receipts with itemized timestamps and customer signature lines.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Functions 100% offline through power blackouts and network disruptions.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 text-[0.6875rem] font-mono text-emerald-400 flex items-center justify-between">
              <span>Verified Dexie + Cloudflare D1 Synchronization</span>
              <span className="text-slate-400">Reclaims ~₱3,200/mo uncollected credit</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. HARDWARE DECK & ECOSYSTEM COMPATIBILITY ── */}
      <section id="hardware" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400 mb-2 block">
            Hardware Interoperability
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Works with the Hardware You Already Own
          </h2>
          <p className="text-sm text-slate-400 mt-2.5">
            Zero vendor hardware lock-in. Connect any standard USB, Bluetooth, or wireless POS peripherals without proprietary driver installations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {HARDWARE_ITEMS.map((h) => {
            const Icon = h.icon
            return (
              <div
                key={h.title}
                className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/30 transition-all flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">{h.title}</h3>
                  <p className="text-[0.6875rem] text-slate-400 mt-1 leading-snug">
                    {h.specs}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 8. COMPREHENSIVE PLATFORM COMPARISON MATRIX ── */}
      <section id="compare" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400 mb-2 block">
            Architectural Audit
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Institutional-Grade Architecture Without Enterprise Lock-In
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            See how TINDA POS compares against legacy cloud POS systems and traditional paper record-keeping.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-x-auto custom-scrollbar shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-mono uppercase text-slate-400">
                <th className="p-4 sm:p-5">Feature Capability</th>
                <th className="p-4 sm:p-5 text-emerald-400 font-bold bg-emerald-500/[0.08] border-x border-emerald-500/20">
                  TINDA POS Web
                </th>
                <th className="p-4 sm:p-5">Generic Cloud POS</th>
                <th className="p-4 sm:p-5">Paper Notebook (Kwaderno)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {[
                {
                  f: 'Subscription & License Fee',
                  t: '₱0 Free Tier / ₱500 Lifetime VIP (Zero Monthly Fees)',
                  c: '₱1,500 – ₱15,000 / year recurring subscription',
                  m: '₱50 per physical notebook'
                },
                {
                  f: 'High-Speed Barcode Scanning',
                  t: 'Included Free (USB Laser Gun + Camera Wedge)',
                  c: 'Often locked behind premium enterprise tiers',
                  m: 'Manual lookups only'
                },
                {
                  f: 'Thermal Receipt Printing',
                  t: 'Native ESC/POS Engine (58mm & 80mm Bluetooth/USB)',
                  c: 'Proprietary printer hardware requirements',
                  m: 'Manual handwritten receipts'
                },
                {
                  f: 'Offline Blackout Resilience',
                  t: '100% True Offline (Client-side Dexie IndexedDB)',
                  c: 'Requires constant cloud connection to transact',
                  m: 'Offline, but lacks inventory reconciliation'
                },
                {
                  f: 'Official DTI Price Radar',
                  t: '172+ Pre-loaded Government Price Ceilings',
                  c: 'No Philippine regulatory price ceiling enforcement',
                  m: 'Subject to manual pricing errors'
                },
                {
                  f: 'Senior / PWD 20% Precision',
                  t: '1-Tap Statutory Math with Integer Centavos',
                  c: 'Manual calculator math required',
                  m: 'Frequent manual change errors'
                },
                {
                  f: 'Audited Customer Credit (Utang)',
                  t: 'Integrated Ledger with 1-Tap SMS & Receipts',
                  c: 'Generic notes field only',
                  m: 'Frayed pages, lost debts & disputed totals'
                },
                {
                  f: 'Cloud Failover Resilience',
                  t: 'Cloudflare D1 Edge Workers + Supabase Dual-Cloud',
                  c: 'Single-cloud points of failure',
                  m: 'Zero backup protection against loss or fire'
                }
              ].map((row) => (
                <tr key={row.f} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 sm:p-5 font-medium text-slate-300">{row.f}</td>
                  <td className="p-4 sm:p-5 font-semibold text-emerald-300 bg-emerald-500/[0.04] border-x border-emerald-500/20">
                    {row.t}
                  </td>
                  <td className="p-4 sm:p-5 text-slate-400">{row.c}</td>
                  <td className="p-4 sm:p-5 text-slate-500">{row.m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 9. FREQUENTLY ASKED QUESTIONS (ACCORDION) ── */}
      <section id="faq" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400 mb-2 block">
            Technical Clarity
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={faq.q}
                className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-emerald-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 10. FINAL EXECUTIVE ACTION BANNER ── */}
      <section className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-emerald-500/30 backdrop-blur-xl shadow-2xl">
          <AppLogo size={46} animated={true} className="mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white max-w-xl mx-auto tracking-tight">
            Deploy Your High-Speed Retail Counter in Seconds
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2.5 max-w-lg mx-auto leading-relaxed">
            Create your store database instantly. Zero credit card required. Operates completely offline on any device.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenSignup}
              className="px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-tight shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Register Free Store</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onQuickDemo}
              className="px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold border border-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Launch Sandbox Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 11. INSTITUTIONAL FOOTER ── */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 bg-[#05080e]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <AppLogo size={28} showBadge={false} />
            <div>
              <span className="font-bold text-slate-200 tracking-wider uppercase text-xs">
                TINDA POS WEB
              </span>
              <p className="text-[0.625rem] font-mono text-slate-500">
                Institutional Ground-Level Commerce Architecture · Philippine Standard
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            © {new Date().getFullYear()} TINDA Business OS. Edge-persisted with Dexie, Cloudflare D1 &amp; Supabase.
          </p>

          <div className="flex items-center gap-5 text-xs text-slate-400">
            <button onClick={onOpenLogin} className="hover:text-emerald-400 transition-colors cursor-pointer">
              Sign In
            </button>
            <button onClick={onOpenSignup} className="hover:text-emerald-400 transition-colors cursor-pointer">
              Register Free
            </button>
            <button onClick={onQuickDemo} className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer">
              Sandbox Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
