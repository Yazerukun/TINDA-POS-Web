import React, { useState } from 'react'
import {
  HelpCircle,
  X,
  Sparkles,
  ShoppingBag,
  Barcode,
  Wallet,
  Receipt,
  CheckCircle2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'

interface HelpGuideModalProps {
  open: boolean
  onClose: () => void
}

const GUIDE_STEPS = [
  {
    title: '1. Fast Counter & Barcode Scanning',
    desc: 'Press Space or click the search bar at the counter. You can scan using a USB Barcode Scanner, search item names, or use your mobile phone camera.',
    icon: Barcode,
    badge: 'SCAN'
  },
  {
    title: '2. Store Credit & Suki Discounts',
    desc: 'If the customer is a Senior Citizen or PWD, apply the discount in the cart. If a regular customer is purchasing on credit, select their Customer Name before checkout.',
    icon: Wallet,
    badge: 'CREDIT'
  },
  {
    title: '3. Payment Tender & Thermal Receipt',
    desc: 'Press Checkout (F12 or Enter). Choose Cash, GCash, or Maya. The system automatically computes the exact change and prints the thermal receipt.',
    icon: Receipt,
    badge: 'TENDER'
  },
  {
    title: '4. End-of-Day Z-Reading',
    desc: 'Before closing for the day, head to Reports & Z-Reading. Print the Z-Reading to audit gross sales and balance the cash drawer.',
    icon: CheckCircle2,
    badge: 'AUDIT'
  }
]

export function HelpGuideModal({ open, onClose }: HelpGuideModalProps): React.JSX.Element | null {
  const [currentStep, setCurrentStep] = useState(0)

  if (!open) return null

  const step = GUIDE_STEPS[currentStep]!
  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-obsidian-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider">
                Cashier Tour &amp; Quick Guide
              </h3>
              <p className="text-xs text-stone-400">Step-by-step cashier walkthrough</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-glow-amber">
            <Icon className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[0.6875rem] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              Step {currentStep + 1} of {GUIDE_STEPS.length} · {step.badge}
            </span>
            <h4 className="text-lg font-bold text-stone-100 mt-2 font-serif">{step.title}</h4>
            <p className="text-xs text-stone-300 mt-2 leading-relaxed max-w-sm mx-auto font-sans">
              {step.desc}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {GUIDE_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all ${
                  currentStep === i ? 'w-8 bg-amber-400' : 'w-2 bg-stone-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-obsidian-950 flex items-center justify-between">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] disabled:opacity-30 text-stone-300 text-xs font-bold flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep < GUIDE_STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(GUIDE_STEPS.length - 1, prev + 1))}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-obsidian-950 text-xs font-bold flex items-center gap-1 shadow-glow-amber"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 text-xs font-bold shadow-glow-emerald"
            >
              Got It, Let's Start!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
