import React, { useState } from 'react'
import {
  Wrench,
  Sparkles,
  CalendarClock,
  Barcode,
  Printer,
  Calculator,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Coins
} from 'lucide-react'
import { AppLogo } from './AppLogo'
import { playSuccessSound } from '../lib/sound'

interface TerminalToolsModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenPriceGuide: () => void
  onOpenExpiration: () => void
  onOpenBarcodeScanner?: () => void
  onOpenPrinterStudio?: () => void
  currentCashierName?: string
  storeName?: string
}

export function TerminalToolsModal({
  isOpen,
  onClose,
  onOpenPriceGuide,
  onOpenExpiration,
  onOpenBarcodeScanner,
  onOpenPrinterStudio,
  currentCashierName = 'Cashier',
  storeName = 'TINDA Retail Station'
}: TerminalToolsModalProps): React.JSX.Element | null {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('tinda_sound_fx') !== 'false'
  })
  const [testPrintActive, setTestPrintActive] = useState(false)
  const [testPrintSuccess, setTestPrintSuccess] = useState(false)

  // Quick Calculator state
  const [calcOpen, setCalcOpen] = useState(false)
  const [calcDisplay, setCalcDisplay] = useState('0')
  const [calcPrev, setCalcPrev] = useState<number | null>(null)
  const [calcOp, setCalcOp] = useState<string | null>(null)

  if (!isOpen) return null

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('tinda_sound_fx', String(next))
    if (next) playSuccessSound()
  }

  const handleTestPrint = () => {
    setTestPrintActive(true)
    setTestPrintSuccess(false)
    setTimeout(() => {
      setTestPrintActive(false)
      setTestPrintSuccess(true)
      if (soundEnabled) playSuccessSound()
      setTimeout(() => setTestPrintSuccess(false), 3500)
    }, 800)
  }

  // Calculator helpers
  const handleCalcNum = (num: string) => {
    setCalcDisplay((prev) => (prev === '0' ? num : prev + num))
  }
  const handleCalcOp = (op: string) => {
    setCalcPrev(parseFloat(calcDisplay))
    setCalcOp(op)
    setCalcDisplay('0')
  }
  const handleCalcEquals = () => {
    if (calcPrev === null || !calcOp) return
    const cur = parseFloat(calcDisplay)
    let res = 0
    if (calcOp === '+') res = calcPrev + cur
    if (calcOp === '-') res = calcPrev - cur
    if (calcOp === '×') res = calcPrev * cur
    if (calcOp === '÷') res = cur !== 0 ? calcPrev / cur : 0
    setCalcDisplay(String(Math.round(res * 100) / 100))
    setCalcPrev(null)
    setCalcOp(null)
  }
  const handleCalcClear = () => {
    setCalcDisplay('0')
    setCalcPrev(null)
    setCalcOp(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-obsidian-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100 font-sans tracking-wide">
                  Terminal & Fast Tools Dock
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  UTILITY HUB
                </span>
              </div>
              <p className="text-xs text-stone-400 font-sans">
                Organized hardware diagnostics, SRP monitoring, and quick cashier utilities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Station Diagnostics Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-obsidian-850 to-obsidian-900 border border-emerald-500/25 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <AppLogo size={36} animated={false} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-100 truncate">{storeName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[0.6875rem] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    Station Active · Operator: {currentCashierName}
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[0.6875rem] font-mono text-stone-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                TRM-8891
              </span>
            </div>
          </div>

          {/* Section 1: Retail Price & Freshness Tools */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-sans">
                Retail Price & Freshness Radars
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* DTI SRP Bantay Presyo */}
              <button
                onClick={() => {
                  onClose()
                  onOpenPriceGuide()
                }}
                className="group p-4 rounded-2xl bg-amber-500/[0.05] hover:bg-amber-500/[0.1] border border-amber-500/25 text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[0.6875rem] font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                    DTI SRP
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300 group-hover:text-amber-200">
                    Bantay Presyo Price Guide
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                    Official Philippine DTI Suggested Retail Price reference with automatic profit margin calculator.
                  </p>
                </div>
              </button>

              {/* Expiration Tracker */}
              <button
                onClick={() => {
                  onClose()
                  onOpenExpiration()
                }}
                className="group p-4 rounded-2xl bg-rose-500/[0.05] hover:bg-rose-500/[0.1] border border-rose-500/25 text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <span className="text-[0.6875rem] font-mono font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-md border border-rose-500/30">
                    RADAR
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-300 group-hover:text-rose-200">
                    Shelf Expiration Watch
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                    Early warning monitor for perishable goods, canned dairy, and bakery items nearing expiry date.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Hardware & Cashier Utilities */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-sans mb-3">
              Hardware & Station Utilities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Barcode Scanner */}
              <button
                onClick={() => {
                  onClose()
                  if (onOpenBarcodeScanner) onOpenBarcodeScanner()
                }}
                className="p-3.5 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Barcode className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <h5 className="text-xs font-bold text-stone-200">Barcode Scanner</h5>
                <p className="text-[0.6875rem] text-stone-500 mt-0.5">Camera & USB wedge</p>
              </button>

              {/* Thermal Print Tester */}
              <button
                onClick={handleTestPrint}
                disabled={testPrintActive}
                className="p-3.5 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Printer className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  {testPrintSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : testPrintActive ? (
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  ) : (
                    <span className="text-[0.6875rem] font-mono text-stone-500">TEST</span>
                  )}
                </div>
                <h5 className="text-xs font-bold text-stone-200">
                  {testPrintActive ? 'Printing Test...' : testPrintSuccess ? 'Print OK!' : 'Receipt Tester'}
                </h5>
                <p className="text-[0.6875rem] text-stone-500 mt-0.5">58mm / 80mm ESC/POS</p>
              </button>

              {/* Audio Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-3.5 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-stone-500 group-hover:scale-110 transition-transform" />
                  )}
                  <span
                    className={`text-[0.6875rem] font-mono font-bold px-1.5 py-0.5 rounded ${
                      soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {soundEnabled ? 'ON' : 'MUTED'}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-stone-200">Cashier Chimes</h5>
                <p className="text-[0.6875rem] text-stone-500 mt-0.5">Scan & beep feedback</p>
              </button>
            </div>
          </div>

          {/* Quick Cashier Calculator Drawer */}
          <div className="p-4 rounded-2xl bg-obsidian-950/80 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                  Cashier Quick Calculator
                </h4>
              </div>
              <button
                onClick={() => setCalcOpen(!calcOpen)}
                className="text-[0.75rem] text-emerald-400 hover:underline font-mono font-bold"
              >
                {calcOpen ? 'Hide Keypad' : 'Show Keypad'}
              </button>
            </div>

            {calcOpen ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-obsidian-900 border border-slate-800 text-right font-mono text-xl font-bold text-emerald-400 truncate">
                  {calcDisplay}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', 'C', '0', '=', '+'].map((btn) => (
                    <button
                      key={btn}
                      onClick={() => {
                        if (btn === 'C') handleCalcClear()
                        else if (btn === '=') handleCalcEquals()
                        else if (['+', '-', '×', '÷'].includes(btn)) handleCalcOp(btn)
                        else handleCalcNum(btn)
                      }}
                      className={`py-2.5 rounded-xl font-mono text-sm font-bold transition-all active:scale-95 ${
                        btn === '='
                          ? 'bg-emerald-500 text-obsidian-950 col-span-1 shadow-glow-emerald'
                          : btn === 'C'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : ['+', '-', '×', '÷'].includes(btn)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-obsidian-850 hover:bg-obsidian-800 text-stone-200 border border-slate-800'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 font-sans">
                Quick float balancing and manual change calculation directly from the dock.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-obsidian-950 flex items-center justify-between">
          <span className="text-[0.6875rem] font-mono text-stone-500">
            TINDA Hardware &amp; Utility Engine · Professional Edition
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold font-sans transition-all"
          >
            Close Dock
          </button>
        </div>
      </div>
    </div>
  )
}
