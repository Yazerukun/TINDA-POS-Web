import React, { useState, useEffect, useCallback } from 'react'
import {
  Calculator as CalcIcon,
  X,
  Plus,
  Minus,
  Percent,
  Delete,
  CornerDownLeft,
  ShoppingCart,
  Coins,
  ArrowRight,
  Sparkles,
  Check
} from 'lucide-react'
import { Modal } from './ui/Modal'
import { toastSuccess, toastError } from '../stores/toast'
import { safeEvalArithmetic } from '../utils/calculator'

interface CashierCalculatorModalProps {
  open: boolean
  onClose: () => void
  currentCartTotalPesos?: number
  onAddCustomItemToCart?: (item: { name: string; price_c: number }) => void
}

const CASH_DENOMINATIONS = [20, 50, 100, 200, 500, 1000]

export function CashierCalculatorModal({
  open,
  onClose,
  currentCartTotalPesos = 0,
  onAddCustomItemToCart
}: CashierCalculatorModalProps): React.JSX.Element | null {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [resetOnNext, setResetOnNext] = useState(false)
  const [customItemName, setCustomItemName] = useState('Custom Service / Item')

  // Sukli / Change Mode Tab
  const [tab, setTab] = useState<'calc' | 'sukli'>('calc')
  const [billAmount, setBillAmount] = useState(
    currentCartTotalPesos > 0 ? currentCartTotalPesos.toFixed(2) : '0'
  )
  const [cashTendered, setCashTendered] = useState('')

  useEffect(() => {
    if (open && currentCartTotalPesos > 0) {
      setBillAmount(currentCartTotalPesos.toFixed(2))
    }
  }, [open, currentCartTotalPesos])

  const billNum = parseFloat(billAmount) || 0
  const cashNum = parseFloat(cashTendered) || 0
  const hasCashInput = cashTendered.trim().length > 0
  const changePesos = Math.max(0, cashNum - billNum)
  const isShort = hasCashInput && cashNum < billNum
  const shortPesos = Math.max(0, billNum - cashNum)

  // Calculator logic
  const handleDigit = (digit: string) => {
    if (resetOnNext || display === '0' || display === 'Error' || display.startsWith('Cannot')) {
      if (digit === '.') {
        setDisplay('0.')
      } else {
        setDisplay(digit)
      }
      setResetOnNext(false)
      return
    }
    if (digit === '.' && display.includes('.')) return
    setDisplay((prev) => prev + digit)
  }

  const handleOperator = (op: string) => {
    const normOp = op === '÷' ? '/' : op === '×' ? '*' : op === '−' ? '-' : op
    if (display === 'Error' || display.startsWith('Cannot')) {
      setDisplay('0')
      setExpression('')
      setResetOnNext(false)
      return
    }

    if (resetOnNext) {
      setExpression(`${display} ${normOp}`)
      setDisplay('0')
      setResetOnNext(false)
      return
    }

    if (display === '0' && expression.length > 0) {
      const trimmed = expression.trimEnd()
      const lastSpace = trimmed.lastIndexOf(' ')
      if (lastSpace >= 0) {
        setExpression(`${trimmed.substring(0, lastSpace)} ${normOp}`)
        return
      }
    }

    setExpression((prev) => `${prev ? prev + ' ' : ''}${display} ${normOp}`)
    setDisplay('0')
    setResetOnNext(false)
  }

  const handleClear = () => {
    setDisplay('0')
    setExpression('')
    setResetOnNext(false)
  }

  const handleBackspace = () => {
    if (resetOnNext || display === 'Error' || display.startsWith('Cannot')) {
      setDisplay('0')
      setResetOnNext(false)
      return
    }
    setDisplay((prev) => {
      if (prev.length <= 1) return '0'
      return prev.slice(0, -1)
    })
  }

  const handleCalculate = () => {
    if (display === 'Error' || display.startsWith('Cannot')) return
    const fullExpr = expression ? `${expression} ${display}` : display
    const res = safeEvalArithmetic(fullExpr)

    if (res.error) {
      setDisplay(res.error)
      setExpression('')
      setResetOnNext(true)
      return
    }

    const valStr = String(res.value ?? 0)
    setDisplay(valStr)
    setExpression('')
    setResetOnNext(true)
  }

  const handleAddToCart = () => {
    const val = parseFloat(display)
    if (isNaN(val) || val <= 0) {
      toastError('Invalid Amount', 'Please calculate or enter a positive amount to add to cart.')
      return
    }

    if (onAddCustomItemToCart) {
      const price_c = Math.round(val * 100)
      onAddCustomItemToCart({
        name: customItemName.trim() || 'Custom Item',
        price_c
      })
      toastSuccess('Added to Cart', `Added ${customItemName} (₱${val.toFixed(2)}) to cart.`)
      onClose()
    }
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key)
      } else if (e.key === '.') {
        handleDigit('.')
      } else if (e.key === '+') {
        handleOperator('+')
      } else if (e.key === '-') {
        handleOperator('−')
      } else if (e.key === '*') {
        handleOperator('×')
      } else if (e.key === '/') {
        handleOperator('÷')
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleCalculate()
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [open, display, expression, resetOnNext]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cashier Quick Calculator & Sukli"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 rounded-xl bg-ink-950 p-1 border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('calc')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'calc'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <CalcIcon className="w-3.5 h-3.5" />
            <span>Calculator</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('sukli')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'sukli'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Sukli / Change</span>
          </button>
        </div>

        {tab === 'calc' ? (
          /* Calculator View */
          <div className="space-y-3">
            {/* Screen Display */}
            <div className="rounded-2xl bg-ink-950 p-4 border border-white/[0.08] text-right">
              <div className="h-5 text-xs font-mono text-stone-500 truncate mb-1">
                {expression || ' '}
              </div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight select-all truncate">
                {display}
              </div>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="p-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold text-sm cursor-pointer transition active:scale-95"
              >
                C
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="p-3 rounded-xl bg-ink-800 hover:bg-ink-750 border border-white/[0.08] text-stone-300 font-bold text-sm cursor-pointer transition active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleOperator('%')}
                className="p-3 rounded-xl bg-ink-800 hover:bg-ink-750 border border-white/[0.08] text-stone-300 font-bold text-sm cursor-pointer transition active:scale-95"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => handleOperator('÷')}
                className="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold text-base cursor-pointer transition active:scale-95"
              >
                ÷
              </button>

              <button
                type="button"
                onClick={() => handleDigit('7')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleDigit('8')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleDigit('9')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleOperator('×')}
                className="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold text-base cursor-pointer transition active:scale-95"
              >
                ×
              </button>

              <button
                type="button"
                onClick={() => handleDigit('4')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleDigit('5')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleDigit('6')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleOperator('−')}
                className="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold text-base cursor-pointer transition active:scale-95"
              >
                −
              </button>

              <button
                type="button"
                onClick={() => handleDigit('1')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleDigit('2')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleDigit('3')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleOperator('+')}
                className="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold text-base cursor-pointer transition active:scale-95"
              >
                +
              </button>

              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="col-span-2 p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleDigit('.')}
                className="p-3 rounded-xl bg-ink-850 hover:bg-ink-800 border border-white/[0.06] text-white font-bold text-base cursor-pointer transition active:scale-95"
              >
                .
              </button>
              <button
                type="button"
                onClick={handleCalculate}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base cursor-pointer transition active:scale-95 shadow-glow-emerald"
              >
                =
              </button>
            </div>

            {/* Optional: Add Calculated Result directly to Cart */}
            {onAddCustomItemToCart && (
              <div className="pt-2 border-t border-white/[0.08] space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="Custom Item / Service Name"
                    className="flex-1 rounded-xl bg-ink-950 border border-white/[0.1] px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sukli / Change View */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-ink-950 border border-white/[0.08]">
                <label className="text-stone-400 block mb-1">Bill Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full bg-transparent font-mono font-bold text-lg text-white focus:outline-none"
                />
              </div>
              <div className="p-3 rounded-xl bg-ink-950 border border-white/[0.08]">
                <label className="text-stone-400 block mb-1">Cash Received (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full bg-transparent font-mono font-bold text-lg text-amber-300 focus:outline-none"
                />
              </div>
            </div>

            {/* Cash Chips */}
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1.5">
                Quick Cash Tendered Chips:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {CASH_DENOMINATIONS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(String(amt))}
                    className="py-1.5 px-2 rounded-lg bg-ink-800 hover:bg-emerald-500/20 border border-white/[0.08] hover:border-emerald-500/40 text-stone-200 font-mono text-xs font-bold transition cursor-pointer"
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Sukli Result Card */}
            <div
              className={`p-4 rounded-2xl border text-center transition-all ${
                isShort
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
                {isShort ? 'Kulang / Short Amount' : 'Sukli / Change Due'}
              </span>
              <div className="text-3xl font-extrabold font-mono tracking-tight">
                ₱{(isShort ? shortPesos : changePesos).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
