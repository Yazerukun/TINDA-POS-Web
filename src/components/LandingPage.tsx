import React from 'react'
import {
  ShoppingBag,
  Store,
  Zap,
  Sparkles,
  Receipt,
  ShieldCheck,
  BarChart3,
  Users,
  Printer,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle2,
  WifiOff,
  Database,
  CalendarClock,
  Banknote,
  Search,
  ScanLine,
  Lock,
  ChevronRight
} from 'lucide-react'
import { AppLogo } from './AppLogo'

interface LandingPageProps {
  onOpenLogin: () => void
  onOpenSignup: () => void
  onQuickDemo: () => void
}

export function LandingPage({
  onOpenLogin,
  onOpenSignup,
  onQuickDemo
}: LandingPageProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-obsidian-950 text-stone-100 flex flex-col selection:bg-emerald-500 selection:text-obsidian-950 relative overflow-x-hidden">
      {/* ── AMBIENT RADIAL LIGHTING (Tailark Aesthetics) ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.14),_transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-emerald-600/[0.06] rounded-full blur-[120px] pointer-events-none animate-float-slow" />
      <div className="absolute top-1/3 -right-48 w-96 h-96 bg-teal-500/[0.05] rounded-full blur-[120px] pointer-events-none animate-float-reverse" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-96 bg-emerald-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

      {/* ── TOP STICKY NAVIGATION BAR ── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-obsidian-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <AppLogo size={38} animated={true} />
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-serif text-base sm:text-lg font-bold tracking-[0.18em] uppercase text-stone-100">
                  TINDA POS
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[0.6875rem] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Online &amp; Offline
                </span>
              </div>
              <span className="text-[0.6875rem] font-sans font-semibold tracking-[0.2em] uppercase text-emerald-400/80">
                Philippine Retail System
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-stone-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#modules" className="hover:text-emerald-400 transition-colors">Modules</a>
            <a href="#dti-srp" className="hover:text-emerald-400 transition-colors">DTI SRP</a>
            <a href="#offline" className="hover:text-emerald-400 transition-colors">Offline Engine</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenLogin}
              className="btn-press px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-stone-300 hover:text-stone-100 hover:bg-white/[0.06] border border-white/10 transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Log In</span>
            </button>

            <button
              onClick={onOpenSignup}
              className="btn-press px-4 sm:px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-brand-600 hover:from-emerald-400 hover:to-brand-500 text-obsidian-950 shadow-glow-emerald transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up Free</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glowing Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 shadow-glow-emerald text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-6 sm:mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Next-Gen Point of Sale for Filipino Merchants</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-1" />
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-stone-100 max-w-4xl mx-auto leading-[1.15]">
          The Complete <span className="bg-gradient-to-r from-emerald-400 via-brand-400 to-emerald-500 bg-clip-text text-transparent">Enterprise &amp; Offline-Ready POS</span> for Philippine Retail.
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 sm:mt-6 text-sm sm:text-lg text-stone-400 max-w-2xl mx-auto font-sans leading-relaxed">
          Engineered for sari-sari stores, groceries, bakeries, pharmacies, and wholesale counters.
          Features 172+ DTI SRP price ceilings, perishable expiration tracking, utang ledger, and thermal receipts — works 100% offline with zero data loss.
        </p>

        {/* Hero Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onOpenSignup}
            className="btn-press px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 font-sans font-bold text-sm uppercase tracking-wider shadow-glow-emerald flex items-center gap-2 transition-all group"
          >
            <span>Register Store — Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenLogin}
            className="btn-press px-6 sm:px-8 py-3.5 rounded-2xl bg-obsidian-900/90 hover:bg-obsidian-850 text-stone-100 font-sans font-bold text-sm uppercase tracking-wider border border-white/10 hover:border-emerald-500/40 shadow-sm flex items-center gap-2 transition-all"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Open Register Counter</span>
          </button>

          <button
            onClick={onQuickDemo}
            className="btn-press px-5 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-amber-400 font-mono text-xs uppercase tracking-wider border border-amber-500/25 transition-all flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Demo Mode</span>
          </button>
        </div>

        {/* 4 Core Pillars Trust Strip */}
        <div className="mt-14 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="font-mono text-xs font-bold uppercase">0.02s Speed</span>
            </div>
            <p className="text-xs text-stone-400">Barcode scanner & quick-tender cash counter</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <WifiOff className="w-4 h-4" />
              <span className="font-mono text-xs font-bold uppercase">100% Offline</span>
            </div>
            <p className="text-xs text-stone-400">Never stops during brownouts or internet loss</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="font-mono text-xs font-bold uppercase">DTI SRP Built-in</span>
            </div>
            <p className="text-xs text-stone-400">172+ official DTI price guide items pre-loaded</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Printer className="w-4 h-4" />
              <span className="font-mono text-xs font-bold uppercase">Thermal Print</span>
            </div>
            <p className="text-xs text-stone-400">Universal 58mm, 80mm & A4 receipt printing</p>
          </div>
        </div>
      </section>

      {/* ── MODULE SHOWCASE (Tailark Glassmorphism Cards) ── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-[0.75rem] font-sans font-semibold uppercase tracking-[0.22em] text-emerald-400 mb-2">
            Engineered For Real Retail Counters
          </h2>
          <p className="text-2xl sm:text-4xl font-serif font-bold text-stone-100">
            Every feature a Filipino merchant needs to run an audited, profitable store.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Card 1: Fast POS Counter */}
          <div className="p-6 sm:p-7 rounded-3xl bg-obsidian-900/70 border border-white/10 hover:border-emerald-500/40 transition-all shadow-vault group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
              <ScanLine className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">
              High-Speed Barcode Counter
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Instant EAN-13 scanning, multi-product search, customer cart holds, Senior/PWD statutory discounts, and quick-cash keypad calculation.
            </p>
          </div>

          {/* Card 2: DTI SRP Bantay Presyo */}
          <div className="p-6 sm:p-7 rounded-3xl bg-obsidian-900/70 border border-white/10 hover:border-emerald-500/40 transition-all shadow-vault group">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">
              DTI SRP Price Guide (172+ Items)
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Real-time Suggested Retail Price ceilings for canned fish, instant noodles, bread, milk, coffee, water, and candles. One-click inventory import.
            </p>
          </div>

          {/* Card 3: Expiration Watch */}
          <div className="p-6 sm:p-7 rounded-3xl bg-obsidian-900/70 border border-white/10 hover:border-emerald-500/40 transition-all shadow-vault group">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5 group-hover:scale-105 transition-transform">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">
              Perishable Expiration Radar
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Never lose money on spoiled goods. Automated 7-day, 14-day, and 30-day alerts for expiring bread, dairy, and pharmaceuticals with discount workflows.
            </p>
          </div>

          {/* Card 4: Customer Credit Ledger */}
          <div className="p-6 sm:p-7 rounded-3xl bg-obsidian-900/70 border border-white/10 hover:border-emerald-500/40 transition-all shadow-vault group">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">
              Customer Credit (Utang) Ledger
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Track loyal neighborhood customer balances, set credit limits, issue partial debt repayments, and print audited customer credit balance statements.
            </p>
          </div>

          {/* Card 5: Thermal Receipt & Invoices */}
          <div className="p-6 sm:p-7 rounded-3xl bg-obsidian-900/70 border border-white/10 hover:border-emerald-500/40 transition-all shadow-vault group">
            <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-5 group-hover:scale-105 transition-transform">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">
              Universal Thermal Printing
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              One-click thermal printer integration for 58mm mobile Bluetooth rolls, 80mm desktop POS receipt printers, and full A4 tax audit sheets.
            </p>
          </div>

          {/* Card 6: Z-Reading & Cash Drawer Audit */}
          <div className="p-6 sm:p-7 rounded-3xl bg-obsidian-900/70 border border-white/10 hover:border-emerald-500/40 transition-all shadow-vault group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-100 mb-2">
              X/Z Readings & Drawer Count
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Official shift closure readings, physical cash denomination counter, discrepancy detector (cash over/short), and operating expense tracking.
            </p>
          </div>
        </div>
      </section>

      {/* ── OFFLINE-FIRST ARCHITECTURE BANNER ── */}
      <section id="offline" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border border-emerald-500/30 shadow-vault flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Zero Internet Required · Local IndexedDB Storage</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Transactions Never Stop During Power Cuts or Network Outages.
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              All transactions, inventory changes, and customer records persist safely on your device.
              When internet connectivity is restored, TINDA POS silently syncs your data securely for automatic backup.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={onOpenSignup}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs uppercase tracking-wider shadow-glow-emerald transition-all text-center"
            >
              Start Free Store Now
            </button>
            <button
              onClick={onOpenLogin}
              className="px-6 py-3.5 rounded-2xl bg-obsidian-950 border border-white/10 hover:border-emerald-500/40 text-stone-200 font-bold text-xs uppercase tracking-wider transition-all text-center"
            >
              Sign In to Counter
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mt-auto border-t border-white/[0.08] bg-obsidian-950 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-stone-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AppLogo size={28} showBadge={false} />
            <span className="font-serif font-bold text-stone-300 tracking-wider uppercase text-sm">
              TINDA POS Web v1.0.1
            </span>
          </div>
          <p>© {new Date().getFullYear()} TINDA Business POS. Enterprise Retail Engineering.</p>
          <div className="flex items-center gap-4 text-stone-400">
            <button onClick={onOpenLogin} className="hover:text-emerald-400 transition-colors">Sign In</button>
            <span>•</span>
            <button onClick={onOpenSignup} className="hover:text-emerald-400 transition-colors">Create Account</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
