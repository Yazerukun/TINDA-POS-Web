import React from 'react'
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
  WifiOff
} from 'lucide-react'
import { AppLogo } from './AppLogo'

interface LandingPageProps {
  onOpenLogin: () => void
  onOpenSignup: () => void
  onQuickDemo: () => void
}

const FEATURES = [
  {
    icon: ScanLine,
    title: 'High-Speed Barcode',
    description:
      'Instant EAN-13 scanning, multi-product search, Senior/PWD discounts, and quick-cash keypad — under 20ms per scan.',
    color: 'emerald' as const
  },
  {
    icon: Sparkles,
    title: 'DTI SRP Price Guide',
    description:
      '172+ official DTI Suggested Retail Price ceilings pre-loaded. Canned fish, noodles, bread, milk, coffee — one-click import.',
    color: 'amber' as const
  },
  {
    icon: CalendarClock,
    title: 'Expiration Radar',
    description:
      'Automated 7, 14, and 30-day alerts for perishables. Never lose money on spoiled bread, dairy, or pharmaceuticals again.',
    color: 'rose' as const
  },
  {
    icon: Users,
    title: 'Utang Ledger',
    description:
      'Track customer credit balances, set limits, process partial repayments, and print audited credit statements.',
    color: 'emerald' as const
  },
  {
    icon: Printer,
    title: 'Thermal Printing',
    description:
      'Universal 58mm Bluetooth, 80mm desktop, and full A4 receipt printing — works with any thermal printer out of the box.',
    color: 'emerald' as const
  },
  {
    icon: BarChart3,
    title: 'X/Z Readings & Audit',
    description:
      'Shift closure readings, physical cash denomination counter, discrepancy detection, and operating expense tracking.',
    color: 'emerald' as const
  }
] as const

const COLOR_MAP = {
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/25',
    iconText: 'text-emerald-400',
    glowHover: 'group-hover:border-emerald-500/40 group-hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.2)]'
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconBorder: 'border-amber-500/25',
    iconText: 'text-amber-400',
    glowHover: 'group-hover:border-amber-500/40 group-hover:shadow-[0_0_40px_-12px_rgba(245,158,11,0.2)]'
  },
  rose: {
    iconBg: 'bg-rose-500/10',
    iconBorder: 'border-rose-500/25',
    iconText: 'text-rose-400',
    glowHover: 'group-hover:border-rose-500/40 group-hover:shadow-[0_0_40px_-12px_rgba(244,63,94,0.2)]'
  }
} as const

export function LandingPage({
  onOpenLogin,
  onOpenSignup,
  onQuickDemo
}: LandingPageProps): React.JSX.Element {
  return (
    <div className="min-h-[100svh] bg-obsidian-950 text-stone-100 flex flex-col selection:bg-emerald-500/30 selection:text-white relative overflow-x-hidden supports-[height:100dvh]:min-h-[100dvh]">
      {/* ── ANIMATED BACKGROUND ORBS ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top ambient radial */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_70%)]" />

        {/* Morphing orb 1 — top-left */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-60 will-change-transform animate-morph"
          style={{
            background:
              'radial-gradient(circle at 40% 40%, rgba(16,185,129,0.15), rgba(5,150,105,0.06) 50%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />

        {/* Morphing orb 2 — right */}
        <div
          className="absolute top-1/4 -right-40 w-[450px] h-[450px] rounded-full opacity-50 will-change-transform animate-morph"
          style={{
            background:
              'radial-gradient(circle at 60% 50%, rgba(52,211,153,0.12), rgba(16,185,129,0.04) 50%, transparent 70%)',
            filter: 'blur(90px)',
            animationDelay: '-6s',
            animationDuration: '22s'
          }}
        />

        {/* Morphing orb 3 — bottom */}
        <div
          className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full opacity-40 will-change-transform animate-morph"
          style={{
            background:
              'radial-gradient(circle at 50% 60%, rgba(16,185,129,0.1), rgba(5,150,105,0.03) 60%, transparent 80%)',
            filter: 'blur(100px)',
            animationDelay: '-12s',
            animationDuration: '26s'
          }}
        />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      {/* ── STICKY FROSTED GLASS NAVIGATION ── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-obsidian-950/70 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <AppLogo size={34} animated={true} />
            <div className="leading-tight">
              <span className="font-serif text-[0.9375rem] sm:text-base font-bold tracking-[0.2em] uppercase text-stone-100">
                TINDA POS
              </span>
              <span className="hidden sm:block text-[0.625rem] font-sans font-medium tracking-[0.25em] uppercase text-emerald-400/70 mt-px">
                Philippine Retail System
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-[0.6875rem] font-sans font-medium uppercase tracking-[0.15em] text-stone-500 hover:text-stone-200 transition-colors duration-300"
            >
              Features
            </a>
            <a
              href="#offline"
              className="text-[0.6875rem] font-sans font-medium uppercase tracking-[0.15em] text-stone-500 hover:text-stone-200 transition-colors duration-300"
            >
              Offline Engine
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenLogin}
              className="btn-press px-4 py-2 rounded-full text-[0.6875rem] font-sans font-semibold text-stone-400 hover:text-stone-100 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all duration-300 flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>

            <button
              onClick={onOpenSignup}
              className="btn-press px-5 py-2 rounded-full text-[0.6875rem] font-sans font-bold text-obsidian-950 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_-4px_rgba(16,185,129,0.4)] hover:shadow-[0_0_28px_-4px_rgba(16,185,129,0.55)] transition-all duration-300 flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up Free</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 pt-20 sm:pt-28 lg:pt-36 pb-20 sm:pb-28 px-5 sm:px-8 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-400 text-[0.6875rem] font-sans font-medium tracking-wide mb-8 sm:mb-10 opacity-0 animate-stagger-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen POS for Filipino Merchants</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-[2rem] sm:text-[3.25rem] lg:text-[4rem] font-serif font-black tracking-tight leading-[1.1] max-w-4xl mx-auto opacity-0 animate-stagger-2">
          <span className="text-stone-100">The Complete </span>
          <span className="bg-gradient-to-r from-emerald-400 via-brand-400 to-emerald-500 bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
            Offline-Ready POS
          </span>
          <br className="hidden sm:block" />
          <span className="text-stone-100"> for Philippine Retail.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 sm:mt-8 text-sm sm:text-base lg:text-lg text-stone-400 max-w-2xl mx-auto font-sans leading-relaxed opacity-0 animate-stagger-3">
          Engineered for sari-sari stores, groceries, pharmacies, and wholesale
          counters. DTI SRP prices, expiration tracking, utang ledger, and
          thermal receipts — works 100% offline.
        </p>

        {/* CTA Group */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4 opacity-0 animate-stagger-4">
          <button
            onClick={onOpenSignup}
            className="btn-press group px-7 sm:px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-sans font-bold text-sm tracking-wide shadow-[0_0_30px_-6px_rgba(16,185,129,0.45)] hover:shadow-[0_0_40px_-6px_rgba(16,185,129,0.6)] transition-all duration-300 flex items-center gap-2.5"
          >
            <span>Register Store — Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
          </button>

          <button
            onClick={onOpenLogin}
            className="btn-press px-7 sm:px-8 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-stone-200 font-sans font-semibold text-sm tracking-wide border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-2.5"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Open Counter</span>
          </button>

          <button
            onClick={onQuickDemo}
            className="btn-press px-5 py-3.5 rounded-full bg-transparent hover:bg-white/[0.04] text-stone-500 hover:text-stone-300 font-sans font-medium text-sm tracking-wide transition-all duration-300 flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Demo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Trust Pillars */}
        <div className="mt-16 sm:mt-20 flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-0 animate-stagger-5">
          {[
            { icon: Zap, label: '0.02s speed' },
            { icon: WifiOff, label: '100% offline' },
            { icon: Sparkles, label: '172+ DTI SRP items' },
            { icon: Printer, label: 'Thermal print' }
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-stone-500"
            >
              <Icon className="w-3.5 h-3.5 text-emerald-500/70" />
              <span className="text-[0.6875rem] font-sans font-medium uppercase tracking-[0.12em]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section
        id="features"
        className="relative z-10 py-20 sm:py-28 px-5 sm:px-8 max-w-6xl mx-auto"
      >
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-18 opacity-0 animate-stagger-3">
          <span className="text-[0.6875rem] font-sans font-semibold uppercase tracking-[0.25em] text-emerald-400/80 mb-3 block">
            Built For Real Retail Counters
          </span>
          <h2 className="text-2xl sm:text-[2.5rem] font-serif font-bold text-stone-100 leading-tight">
            Every feature a Filipino merchant needs.
          </h2>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((feature, i) => {
            const colors = COLOR_MAP[feature.color]
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`group p-6 sm:p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 ${colors.glowHover} opacity-0 animate-stagger-${i + 1}`}
                style={{ willChange: 'transform, box-shadow' }}
              >
                {/* Icon */}
                <div
                  className={`h-11 w-11 rounded-xl ${colors.iconBg} border ${colors.iconBorder} flex items-center justify-center ${colors.iconText} mb-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Title */}
                <h3 className="text-[0.9375rem] font-sans font-semibold text-stone-100 mb-2 tracking-tight">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-[0.8125rem] text-stone-500 leading-relaxed font-sans">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── OFFLINE-FIRST BANNER ── */}
      <section
        id="offline"
        className="relative z-10 py-16 sm:py-24 px-5 sm:px-8 max-w-5xl mx-auto opacity-0 animate-stagger-4"
      >
        <div className="relative p-8 sm:p-12 lg:p-16 rounded-3xl overflow-hidden">
          {/* Background gradient fill */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] via-obsidian-900 to-obsidian-950 border border-emerald-500/20 rounded-3xl"
            aria-hidden="true"
          />
          {/* Inner floating orb */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30 will-change-transform animate-float-x"
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)',
              filter: 'blur(60px)'
            }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <WifiOff className="w-4 h-4" />
                <span className="text-[0.6875rem] font-sans font-semibold uppercase tracking-[0.2em]">
                  Zero Internet Required
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-stone-100 leading-snug">
                Transactions never stop during power cuts or network outages.
              </h3>
              <p className="text-sm text-stone-400 leading-relaxed font-sans">
                All records persist on-device via IndexedDB. When connectivity
                returns, TINDA POS silently syncs everything for automatic
                cloud backup.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={onOpenSignup}
                className="btn-press px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-sans font-bold text-[0.8125rem] tracking-wide shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 text-center"
              >
                Start Free Store
              </button>
              <button
                onClick={onOpenLogin}
                className="btn-press px-6 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-stone-200 font-sans font-semibold text-[0.8125rem] tracking-wide border border-white/10 hover:border-white/20 transition-all duration-300 text-center"
              >
                Sign In to Counter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mt-auto border-t border-white/[0.06] py-10 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AppLogo size={26} showBadge={false} />
            <span className="font-serif font-bold text-stone-400 tracking-wider uppercase text-[0.8125rem]">
              TINDA POS
            </span>
          </div>

          <p className="text-[0.6875rem] text-stone-600 font-sans">
            © {new Date().getFullYear()} TINDA Business POS. Enterprise
            Retail Engineering.
          </p>

          <div className="flex items-center gap-5 text-[0.6875rem] text-stone-500 font-sans">
            <button
              onClick={onOpenLogin}
              className="hover:text-stone-300 transition-colors duration-300"
            >
              Sign In
            </button>
            <button
              onClick={onOpenSignup}
              className="hover:text-stone-300 transition-colors duration-300"
            >
              Create Account
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
