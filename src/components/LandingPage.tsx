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
  Volume2
} from 'lucide-react'
import { AppLogo } from './AppLogo'
import { playScanSuccess } from '../lib/sound'

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
// DATA: Architectural Capabilities (Bento)
// ─────────────────────────────────────────────────────────────────────────────
const ARCH_PILLARS = [
  {
    icon: ScanLine,
    title: 'Sub-20ms Barcode Engine',
    badge: 'Hardware & Camera',
    desc: 'Instant EAN-13, UPC, Code-128 decoding via USB laser or integrated device camera with audible tactile tone feedback.',
    color: 'emerald'
  },
  {
    icon: Sparkles,
    title: 'DTI SRP Ceiling Radar',
    badge: 'E-Presyo Compliant',
    desc: 'Pre-loaded with 172+ official Department of Trade & Industry retail ceilings. Never worry about pricing disputes or price-freeze compliance.',
    color: 'amber'
  },
  {
    icon: CalendarClock,
    title: 'Perishable Expiration Radar',
    badge: 'Zero Spoilage',
    desc: 'Automated 7, 14, and 30-day proactive alerts. Automatically mark down items nearing expiry to salvage 100% of inventory value.',
    color: 'rose'
  },
  {
    icon: Users,
    title: 'Audited Utang Ledger',
    badge: 'Customer Credit',
    desc: 'Granular credit limits, partial repayments, date-stamped balance logs, and printable customer statement receipts.',
    color: 'emerald'
  },
  {
    icon: Printer,
    title: 'Universal Thermal Engine',
    badge: 'ESC/POS Standard',
    desc: 'Native support for 58mm and 80mm Bluetooth, USB, and network receipt printers with automatic cash drawer kick-out.',
    color: 'emerald'
  },
  {
    icon: Database,
    title: 'Dual-Cloud Auto Failover',
    badge: 'Zero Downtime',
    desc: 'Edge-persisted via Cloudflare D1 with automatic failover to Supabase Managed PostgreSQL. 100% operational offline via Dexie DB.',
    color: 'teal'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// DATA: Hardware Compatibility
// ─────────────────────────────────────────────────────────────────────────────
const HARDWARE_ITEMS = [
  {
    icon: Printer,
    title: 'Thermal Printers',
    specs: '58mm / 80mm ESC/POS via Bluetooth, USB & Network (Xprinter, Epson, Munbyn, Goojprt)'
  },
  {
    icon: ScanLine,
    title: 'Barcode Scanners',
    specs: '1D & 2D Laser Guns, Wireless Handhelds, plus Device Camera Scanner via ZXing'
  },
  {
    icon: Smartphone,
    title: 'Tablets & Phones',
    specs: 'Optimized touch interface for iPad, Android tablets, and mobile registers'
  },
  {
    icon: Laptop,
    title: 'PC & Desktop POS',
    specs: 'Full keyboard navigation with F1-F12 hotkeys for instant cashier speedruns'
  },
  {
    icon: Store,
    title: 'RJ11 Cash Drawers',
    specs: 'Automatic drawer trigger pulse sent upon cash sale completion'
  },
  {
    icon: Layers,
    title: 'GCash / Maya QR',
    specs: 'Dynamic or static QR display for fast customer digital payments'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// DATA: FAQ Accordion
// ─────────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Does TINDA POS really work 100% without internet?',
    a: 'Yes. TINDA POS is built with an Offline-First Dexie (IndexedDB) engine. All products, sales, customers, and inventory operate entirely locally on your device. When your connection returns, it silently synchronizes transactions to Cloudflare D1 and Supabase in the background.'
  },
  {
    q: 'Do I need to buy expensive proprietary POS hardware?',
    a: 'Not at all! You can run TINDA POS on any laptop, desktop PC, Android tablet, iPad, or even smartphone. You can connect standard affordable ₱1,200 thermal printers and ₱800 USB barcode scanners out of the box.'
  },
  {
    q: 'What is the DTI Suggested Retail Price (SRP) feature?',
    a: 'The Philippine Department of Trade & Industry issues official price ceilings for basic necessities and prime commodities. TINDA POS includes these official prices pre-loaded, protecting your store from accidental overpricing and simplifying inventory setup.'
  },
  {
    q: 'Can I track customer utang (credit) and print statements?',
    a: 'Yes! The Utang Ledger allows you to set credit limits per customer, record partial payments, view full ledger histories, and print audited credit slips directly to your 58mm/80mm thermal printer.'
  },
  {
    q: 'Is there a monthly subscription fee?',
    a: 'TINDA POS Web includes a generous Free Tier for single-counter stores with full barcode and offline capabilities. Optional VIP upgrades (₱500 one-time lifetime) unlock multi-device cloud synchronization, automated daily cloud backups, and priority support.'
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
    { name: 'Lucky Me! Pancit Canton Kalamansi', price: 15.0, qty: 2, barcode: '4800016644818' },
    { name: 'Mega Sardines in Tomato Sauce 155g', price: 24.0, qty: 1, barcode: '4800016644812' }
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
    } catch {
      // Audio context policy
    }
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

  return (
    <div className="min-h-[100svh] bg-obsidian-950 text-stone-100 flex flex-col selection:bg-emerald-500/30 selection:text-white relative overflow-x-hidden">
      {/* ── AMBIENT BACKGROUND GLOW EFFECTS ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top ambient radial spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.18),_transparent_70%)]" />

        {/* Morphing emerald orb 1 — top-left */}
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-60 will-change-transform animate-morph"
          style={{
            background:
              'radial-gradient(circle at 40% 40%, rgba(16,185,129,0.16), rgba(5,150,105,0.06) 50%, transparent 70%)',
            filter: 'blur(90px)'
          }}
        />

        {/* Morphing teal orb 2 — top-right */}
        <div
          className="absolute top-1/4 -right-40 w-[550px] h-[550px] rounded-full opacity-45 will-change-transform animate-morph"
          style={{
            background:
              'radial-gradient(circle at 60% 50%, rgba(45,212,191,0.14), rgba(16,185,129,0.05) 50%, transparent 70%)',
            filter: 'blur(95px)',
            animationDelay: '-7s',
            animationDuration: '24s'
          }}
        />

        {/* Subtle engineering grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* ── STICKY LUXURY FROSTED NAVIGATION ── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-obsidian-950/80 backdrop-blur-2xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3.5">
            <AppLogo size={38} animated={true} />
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-serif text-[1.0625rem] sm:text-lg font-bold tracking-[0.18em] uppercase text-stone-100">
                  TINDA POS
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Web v1.0.3
                </span>
              </div>
              <span className="hidden md:block text-[0.6875rem] font-sans font-semibold tracking-[0.16em] uppercase text-emerald-400/80 mt-0.5">
                Executive Retail Counter · Philippine Standard
              </span>
            </div>
          </div>

          {/* Desktop Nav Anchors */}
          <nav className="hidden lg:flex items-center gap-7">
            <a
              href="#simulator"
              className="text-xs font-sans font-medium uppercase tracking-[0.14em] text-stone-400 hover:text-emerald-400 transition-colors"
            >
              Live Terminal
            </a>
            <a
              href="#dti-radar"
              className="text-xs font-sans font-medium uppercase tracking-[0.14em] text-stone-400 hover:text-emerald-400 transition-colors"
            >
              DTI SRP Radar
            </a>
            <a
              href="#pillars"
              className="text-xs font-sans font-medium uppercase tracking-[0.14em] text-stone-400 hover:text-emerald-400 transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#hardware"
              className="text-xs font-sans font-medium uppercase tracking-[0.14em] text-stone-400 hover:text-emerald-400 transition-colors"
            >
              Hardware
            </a>
            <a
              href="#roi"
              className="text-xs font-sans font-medium uppercase tracking-[0.14em] text-stone-400 hover:text-emerald-400 transition-colors"
            >
              Savings
            </a>
            <a
              href="#faq"
              className="text-xs font-sans font-medium uppercase tracking-[0.14em] text-stone-400 hover:text-emerald-400 transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onQuickDemo}
              className="btn-press hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all"
              title="1-Click Sandbox Demo"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Demo</span>
            </button>

            <button
              onClick={onOpenLogin}
              className="btn-press px-4 py-2 rounded-full text-xs font-semibold text-stone-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign In</span>
            </button>

            <button
              onClick={onOpenSignup}
              className="btn-press px-4 sm:px-5 py-2 rounded-full text-xs font-bold text-obsidian-950 bg-gradient-to-r from-emerald-400 via-brand-400 to-emerald-500 hover:from-emerald-300 hover:to-brand-300 shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)] transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Free</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER SECTION ── */}
      <section className="relative z-10 pt-16 sm:pt-24 lg:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        {/* Shimmer Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400 text-xs font-mono font-medium tracking-wide mb-6 sm:mb-8 backdrop-blur-md shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>PHILIPPINE RETAIL STANDARD · 100% OFFLINE READY</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight leading-[1.1] max-w-4xl mx-auto">
          <span className="text-stone-100">The Executive Counter </span>
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Engineered for Philippine Retail.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 sm:mt-7 text-sm sm:text-base lg:text-lg text-stone-400 max-w-2xl mx-auto font-sans leading-relaxed">
          High-speed barcode scanning, official DTI SRP price ceilings, automated perishable
          expiration radar, and customer credit ledger. Operates 100% offline with zero cloud
          dependency during power cuts.
        </p>

        {/* CTA Button Group */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onOpenSignup}
            className="btn-press group px-7 sm:px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-sans font-bold text-sm tracking-wide shadow-[0_0_30px_-6px_rgba(16,185,129,0.5)] hover:shadow-[0_0_40px_-6px_rgba(16,185,129,0.7)] transition-all flex items-center gap-2.5"
          >
            <span>Register Store Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenLogin}
            className="btn-press px-7 sm:px-8 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-stone-200 font-sans font-semibold text-sm tracking-wide border border-white/10 hover:border-emerald-500/30 transition-all flex items-center gap-2.5"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Open Cashier Counter</span>
          </button>

          <button
            onClick={onQuickDemo}
            className="btn-press px-6 py-3.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-sans font-bold text-sm tracking-wide border border-amber-500/30 transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Instant Sandbox Demo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Trust Telemetry Ticker */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-6 sm:gap-12">
          {[
            { label: '< 20ms Latency', sub: 'Instant Barcode Search' },
            { label: '100% Offline', sub: 'Dexie Local Storage' },
            { label: '172+ DTI Ceilings', sub: 'Pre-loaded E-Presyo' },
            { label: 'ESC/POS Driver', sub: '58mm / 80mm Printers' },
            { label: 'Dual-Cloud Edge', sub: 'Cloudflare + Supabase' }
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                {stat.label}
              </p>
              <p className="text-[0.6875rem] font-sans font-medium text-stone-500 uppercase tracking-wider mt-0.5">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 1. LIVE INTERACTIVE POS TERMINAL SIMULATOR ── */}
      <section
        id="simulator"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-2 block">
            Interactive Test Counter
          </span>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-100">
            Experience the Cashier Flow Live
          </h2>
          <p className="text-sm text-stone-400 mt-3 font-sans">
            Click any product below to simulate an instantaneous barcode scan and watch the
            subtotal, Senior/PWD discount, and thermal receipt generate in real-time.
          </p>
        </div>

        {/* Simulated POS Window Frame */}
        <div className="rounded-3xl border border-white/[0.1] bg-obsidian-950/90 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9),0_0_50px_-10px_rgba(16,185,129,0.15)] backdrop-blur-2xl overflow-hidden">
          {/* Mac/Terminal Style Header Bar */}
          <div className="px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-stone-400">
                TERMINAL TRM-8891 · EXECUTIVE RETAIL COUNTER · STATION 01
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OFFLINE ENGINE READY
              </span>
              <button
                onClick={handleSimClearCart}
                className="text-[0.6875rem] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 3-Column Split: Barcode Item Shelf | Live Cart & Keypad | Simulated Thermal Receipt */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
            {/* Left: Quick Item Barcode Shelf (4 cols) */}
            <div className="lg:col-span-4 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-stone-300 flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4 text-emerald-400" />
                  <span>Click Product to Scan</span>
                </span>
                <span className="text-[0.6875rem] font-mono text-emerald-400/90">
                  ⚡ 0.02s per item
                </span>
              </div>

              {lastScannedItem && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-fade-in">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Beep! Scanned: {lastScannedItem}</span>
                </div>
              )}

              <div className="space-y-2">
                {DTI_SRP_DATABASE.slice(0, 5).map((item) => (
                  <button
                    key={item.barcode}
                    onClick={() => handleSimAddProduct(item)}
                    className="btn-press w-full p-3 rounded-2xl bg-white/[0.02] hover:bg-emerald-500/[0.08] border border-white/[0.06] hover:border-emerald-500/40 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-stone-200 group-hover:text-emerald-300 truncate">
                        {item.name}
                      </p>
                      <p className="text-[0.625rem] font-mono text-stone-500 mt-0.5">
                        EAN: {item.barcode} · {item.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-bold text-emerald-400">
                        ₱{(item.srpCeiling_c / 100).toFixed(2)}
                      </p>
                      <span className="text-[0.5625rem] font-mono text-stone-500 uppercase">
                        + Tap Scan
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={onQuickDemo}
                  className="btn-press w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Launch Full Working Demo Counter</span>
                </button>
              </div>
            </div>

            {/* Center: Live Cart, Discount & Tender (4 cols) */}
            <div className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-stone-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>Current Cart ({simCart.reduce((sum, i) => sum + i.qty, 0)} items)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-300">
                    ₱{simSubtotal.toFixed(2)}
                  </span>
                </div>

                {/* Cart Lines */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {simCart.length === 0 ? (
                    <div className="text-center py-8 text-xs font-mono text-stone-500">
                      Cart is empty. Tap any product on the left to scan!
                    </div>
                  ) : (
                    simCart.map((item) => (
                      <div
                        key={item.barcode}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-stone-200 truncate">{item.name}</p>
                          <p className="text-[0.625rem] font-mono text-stone-500">
                            ₱{item.price.toFixed(2)} × {item.qty}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-stone-100">
                          ₱{(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Senior / PWD Discount Selector */}
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <p className="text-[0.6875rem] font-mono text-stone-400 uppercase tracking-wider mb-2">
                    Philippine Statutory Discount
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSimDiscount('NONE')}
                      className={`btn-press py-1.5 px-3 rounded-xl text-xs font-mono transition-all ${
                        simDiscount === 'NONE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-white/[0.02] text-stone-400 border border-white/[0.06]'
                      }`}
                    >
                      Regular Price
                    </button>
                    <button
                      onClick={() => setSimDiscount('SENIOR')}
                      className={`btn-press py-1.5 px-3 rounded-xl text-xs font-mono transition-all flex items-center justify-center gap-1 ${
                        simDiscount === 'SENIOR'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-white/[0.02] text-stone-400 border border-white/[0.06]'
                      }`}
                    >
                      <BadgePercent className="w-3.5 h-3.5" />
                      <span>Senior / PWD (20%)</span>
                    </button>
                  </div>
                </div>

                {/* Tender Keypad Simulator */}
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <p className="text-[0.6875rem] font-mono text-stone-400 uppercase tracking-wider mb-2">
                    Quick Cash Tender
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setSimTender(amt)}
                        className={`btn-press py-1.5 rounded-lg text-xs font-mono transition-all ${
                          simTender === amt
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-bold'
                            : 'bg-white/[0.02] text-stone-400 border border-white/[0.06]'
                        }`}
                      >
                        ₱{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Summary Bar */}
              <div className="mt-5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Subtotal</span>
                  <span className="font-mono">₱{simSubtotal.toFixed(2)}</span>
                </div>
                {simDiscount === 'SENIOR' && (
                  <div className="flex justify-between text-xs text-amber-300 font-mono mt-1">
                    <span>Senior/PWD 20% Discount</span>
                    <span>-₱{simDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-stone-100 mt-2 pt-2 border-t border-white/[0.06]">
                  <span>Total Due</span>
                  <span className="font-mono text-emerald-400 text-base">₱{simTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-stone-300 mt-1">
                  <span>Cash Tendered (₱{simTender})</span>
                  <span className="text-emerald-300 font-bold">
                    Sukli / Change: ₱{simChange.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Realistic Simulated 58mm Thermal Receipt (4 cols) */}
            <div className="lg:col-span-4 p-5 sm:p-6 bg-obsidian-900/60 flex flex-col items-center justify-center">
              <div className="w-full max-w-[270px] bg-stone-100 text-stone-900 p-4 rounded shadow-2xl font-mono text-[0.6875rem] leading-tight select-none relative">
                {/* Perforated Top Edge SVG */}
                <div className="text-center border-b border-dashed border-stone-400 pb-2 mb-2">
                  <p className="font-bold text-sm tracking-widest uppercase">TINDA STORE #01</p>
                  <p className="text-[0.625rem] text-stone-600">BRGY. POBLACION, CEBU CITY</p>
                  <p className="text-[0.5625rem] text-stone-500">TIN: 123-456-789-000</p>
                  <p className="text-[0.5625rem] text-stone-500 mt-1">
                    {new Date().toLocaleDateString('en-PH')} · {new Date().toLocaleTimeString('en-PH')}
                  </p>
                </div>

                {/* Receipt Line Items */}
                <div className="space-y-1 border-b border-dashed border-stone-400 pb-2 mb-2 min-h-[90px]">
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
                <div className="space-y-1 text-stone-800">
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
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-400">
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
                <div className="text-center pt-3 border-t border-dashed border-stone-400 mt-2">
                  <div className="inline-block bg-stone-900 text-stone-100 px-3 py-1 text-[0.5625rem] font-bold tracking-widest">
                    ||||| |||| ||||| ||||
                  </div>
                  <p className="text-[0.5625rem] text-stone-600 mt-1">SALAMAT SA PAGPALIT!</p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-[0.6875rem] font-mono text-stone-400 flex items-center gap-1.5 justify-center">
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>58mm ESC/POS Thermal Output</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. DTI SRP PRICE CEILING RADAR (Official E-Presyo) ── */}
      <section
        id="dti-radar"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Philippine Government Database</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-100">
            DTI Suggested Retail Price Watchdog
          </h2>
          <p className="text-sm text-stone-400 mt-3 font-sans">
            TINDA POS is pre-loaded with official DTI SRP ceilings for canned goods, noodles, milk,
            condiments, and bread. Never get penalized for accidental overpricing.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="max-w-4xl mx-auto mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={dtiSearch}
              onChange={(e) => setDtiSearch(e.target.value)}
              placeholder="Search pre-loaded DTI goods (e.g. Sardines, Pancit Canton, Soy Sauce, Milk)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/70 focus:bg-white/[0.05] text-stone-100 text-sm placeholder-stone-500 outline-none transition-all"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['All', 'Canned Fish', 'Noodles', 'Milk', 'Condiments', 'Coffee', 'Bread'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn-press px-3.5 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-white/[0.02] text-stone-400 border border-white/[0.06] hover:text-stone-200'
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
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-stone-400">
                      {item.category}
                    </span>
                    <span className="text-[0.625rem] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      DTI Verified
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-stone-200 group-hover:text-emerald-300 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-[0.625rem] font-mono text-stone-500 mt-1">
                    Barcode: {item.barcode}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">DTI Ceiling:</span>
                    <span className="font-mono font-bold text-amber-300">
                      ₱{(item.srpCeiling_c / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[0.6875rem]">
                    <span className="text-stone-500">Typical Wholesale:</span>
                    <span className="font-mono text-stone-400">
                      ₱{(item.typicalCost_c / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[0.6875rem]">
                    <span className="text-stone-500">Gross Margin:</span>
                    <span className="font-mono font-bold text-emerald-400">+{marginPct}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 3. SIX CORE ARCHITECTURAL CAPABILITIES (BENTO GRID) ── */}
      <section
        id="pillars"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-2 block">
            Core Architecture
          </span>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-100">
            Engineered for Ground-Level Store Operations
          </h2>
          <p className="text-sm text-stone-400 mt-3 font-sans">
            Every feature is purpose-built to eliminate common retail headaches: slow checkout lines,
            forgotten credit accounts, spoiled goods, and internet outages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ARCH_PILLARS.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.title}
                className="p-6 sm:p-7 rounded-3xl bg-white/[0.02] border border-white/[0.07] hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[0.6875rem] font-mono px-2.5 py-1 rounded-full bg-white/[0.04] text-stone-400">
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-stone-100 mb-2 font-sans tracking-tight">
                    {p.title}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed font-sans">{p.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>Production Certified</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 4. HARDWARE ECOSYSTEM COMPATIBILITY ── */}
      <section
        id="hardware"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-2 block">
            Plug & Play Peripherals
          </span>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-100">
            Works with the Hardware You Already Own
          </h2>
          <p className="text-sm text-stone-400 mt-3 font-sans">
            Zero vendor lock-in. Connect any standard USB, Bluetooth, or wireless POS peripherals
            without proprietary driver installations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {HARDWARE_ITEMS.map((h) => {
            const Icon = h.icon
            return (
              <div
                key={h.title}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition-all flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-stone-100 font-sans">{h.title}</h3>
                  <p className="text-[0.6875rem] text-stone-400 mt-1 leading-snug font-sans">
                    {h.specs}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 5. INTERACTIVE ROI & DAILY SAVINGS CALCULATOR ── */}
      <section
        id="roi"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
      >
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-500/[0.08] via-obsidian-900/90 to-obsidian-950 border border-emerald-500/30 backdrop-blur-2xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-2 block">
              Merchant Value Calculator
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Calculate Your Store's Monthly Savings
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-2 font-sans">
              Drag the slider to your average daily transaction count and see how much time and
              revenue TINDA POS recovers.
            </p>
          </div>

          {/* Slider */}
          <div className="max-w-md mx-auto mb-10 text-center">
            <div className="flex items-center justify-between text-xs font-mono text-stone-400 mb-2">
              <span>Low Volume (30)</span>
              <span className="text-sm font-bold text-emerald-400">{dailyCustomers} Customers / Day</span>
              <span>High Traffic (500)</span>
            </div>
            <input
              type="range"
              min={30}
              max={500}
              step={10}
              value={dailyCustomers}
              onChange={(e) => setDailyCustomers(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            />
          </div>

          {/* 3 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl sm:text-2xl font-mono font-bold text-stone-100">
                {(timeSavedMinutes / 60).toFixed(1)} hrs
              </p>
              <p className="text-[0.6875rem] font-sans text-stone-400 mt-1 uppercase tracking-wider">
                Cashier Time Saved Daily
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <CalendarClock className="w-5 h-5 text-rose-400 mx-auto mb-2" />
              <p className="text-xl sm:text-2xl font-mono font-bold text-stone-100">
                ₱{monthlySpoilageSaved.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] font-sans text-stone-400 mt-1 uppercase tracking-wider">
                Expired Goods Saved / Mo
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <Users className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-xl sm:text-2xl font-mono font-bold text-stone-100">
                ₱{monthlyUtangRecovered.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] font-sans text-stone-400 mt-1 uppercase tracking-wider">
                Uncollected Utang Recovered / Mo
              </p>
            </div>
          </div>

          <div className="mt-8 text-center pt-6 border-t border-white/[0.08]">
            <p className="text-xs text-stone-400 font-sans">
              Estimated Net Value Recovered:{' '}
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ₱{totalMonthlyGain.toLocaleString()} per month
              </span>
            </p>
            <div className="mt-4">
              <button
                onClick={onOpenSignup}
                className="btn-press px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-sans font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                Claim Free Store Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. COMPARISON MATRIX (TINDA POS vs OTHERS) ── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-2 block">
            Head-to-Head Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
            Why Modern Merchants Choose TINDA POS
          </h2>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-xs font-mono uppercase text-stone-400">
                <th className="p-4 sm:p-5">Feature Capability</th>
                <th className="p-4 sm:p-5 text-emerald-400 font-bold bg-emerald-500/[0.05]">
                  TINDA POS Web
                </th>
                <th className="p-4 sm:p-5">Traditional Cloud POS</th>
                <th className="p-4 sm:p-5">Manual Ledger / Notebook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs font-sans">
              {[
                {
                  f: 'Monthly Cost',
                  t: '₱0 Free Tier / ₱500 Lifetime',
                  c: '₱1,500 – ₱3,500 / month',
                  m: 'Paper & ink costs'
                },
                {
                  f: '100% Offline Resilience',
                  t: '✅ Yes (Dexie IndexedDB)',
                  c: '❌ Freezes during brownout',
                  m: '✅ Yes (Manual math)'
                },
                {
                  f: 'Official DTI SRP Ceilings',
                  t: '✅ 172+ Pre-loaded Items',
                  c: '❌ Manual entry required',
                  m: '❌ Guesswork'
                },
                {
                  f: 'Perishable Expiration Radar',
                  t: '✅ 7, 14, 30-Day Auto Alerts',
                  c: '❌ Expensive add-on',
                  m: '❌ Spoiled inventory lost'
                },
                {
                  f: 'Utang / Credit Statements',
                  t: '✅ Thermal Statement Slips',
                  c: '⚠️ Partial or non-compliant',
                  m: '❌ Misplaced / torn pages'
                },
                {
                  f: 'Hardware Flexibility',
                  t: '✅ Any Phone, PC, Tablet',
                  c: '❌ Proprietary terminal lock-in',
                  m: 'N/A'
                }
              ].map((row) => (
                <tr key={row.f} className="hover:bg-white/[0.02]">
                  <td className="p-4 sm:p-5 font-medium text-stone-300">{row.f}</td>
                  <td className="p-4 sm:p-5 font-semibold text-emerald-300 bg-emerald-500/[0.03]">
                    {row.t}
                  </td>
                  <td className="p-4 sm:p-5 text-stone-400">{row.c}</td>
                  <td className="p-4 sm:p-5 text-stone-500">{row.m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 7. FAQ ACCORDION ── */}
      <section
        id="faq"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
      >
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-2 block">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-semibold text-stone-200 font-sans">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-emerald-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 text-xs text-stone-400 font-sans leading-relaxed border-t border-white/[0.04] pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 8. FINAL HIGH-CONVERTING CLOSING BANNER ── */}
      <section className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-emerald-500/[0.12] via-teal-500/[0.08] to-emerald-500/[0.12] border border-emerald-500/30 backdrop-blur-2xl">
          <AppLogo size={52} animated={true} className="mx-auto mb-4" />
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-100 max-w-xl mx-auto">
            Ready to Upgrade Your Retail Counter?
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-3 max-w-lg mx-auto font-sans leading-relaxed">
            Create your free store in 30 seconds. No credit card required. Works completely offline on
            any device.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenSignup}
              className="btn-press px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-sans font-bold text-sm tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2"
            >
              <span>Register Free Store</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onQuickDemo}
              className="btn-press px-7 py-3.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-sans font-bold text-sm tracking-wide border border-amber-500/35 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Launch Sandbox Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 9. MASTER FOOTER ── */}
      <footer className="mt-auto border-t border-white/[0.08] py-10 px-4 sm:px-6 lg:px-8 bg-obsidian-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AppLogo size={30} showBadge={false} />
            <div>
              <span className="font-serif font-bold text-stone-300 tracking-wider uppercase text-sm">
                TINDA POS WEB
              </span>
              <p className="text-[0.625rem] font-mono text-stone-500">
                Enterprise Retail Architecture · Philippine Standard
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-500 font-sans text-center">
            © {new Date().getFullYear()} TINDA Business POS. Edge-persisted with Dexie, Cloudflare D1
            & Supabase.
          </p>

          <div className="flex items-center gap-6 text-xs text-stone-400 font-sans">
            <button
              onClick={onOpenLogin}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onOpenSignup}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Register Free
            </button>
            <button
              onClick={onQuickDemo}
              className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Sandbox Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
