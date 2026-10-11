import React, { useState, useEffect, useMemo } from 'react'
import {
  Smartphone,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Trash2,
  Calculator,
  History,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Search,
  Receipt,
  RotateCcw,
  X,
  CreditCard,
  Plus,
  Clock,
  Sparkles,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '../utils/format'
import { playScanSuccess, playCheckoutChime, playScanError } from '../lib/sound'

// ─── TYPES & INTERFACES ──────────────────────────────────────────

export type EwalletChannel = 'GCASH' | 'MAYA' | 'MARIBANK' | 'SHOPEEPAY'
export type EwalletTransactionType = 'CASH_IN' | 'CASH_OUT'

export interface EwalletTransactionRecord {
  id: string
  channel: EwalletChannel
  type: EwalletTransactionType
  amount_c: number
  fee_c: number
  fee_collected_via: 'CASH' | 'WALLET'
  reference_no?: string
  customer_name?: string
  customer_phone?: string
  notes?: string
  cashier_name?: string
  created_at: string
}

export interface BillTransaction {
  id: string
  category: 'UTILITIES' | 'WATER' | 'LOANS' | 'TELCO' | 'INTERNET'
  biller: string
  accountNo: string
  customerName: string
  customerPhone?: string
  amount: number
  serviceFee: number
  feeMode: 'ADD' | 'DEDUCT'
  sourceWallet: EwalletChannel
  cashReceived?: number
  change?: number
  referenceNo: string
  status: 'COMPLETED'
  createdAt: string
  cashierName?: string
}

export interface EwalletAuditRecord {
  id: string
  business_date: string
  created_at: string
  cashier_name: string
  expected_cash_c: number
  actual_cash_c: number
  cash_difference_c: number
  cash_status: 'BALANCED' | 'OVER' | 'SHORT'
  denominations: number[]
  starting_gcash_c: number
  actual_gcash_c: number
  expected_gcash_c: number
  gcash_difference_c: number
  starting_maya_c: number
  actual_maya_c: number
  expected_maya_c: number
  maya_difference_c: number
  starting_maribank_c: number
  actual_maribank_c: number
  expected_maribank_c: number
  maribank_difference_c: number
  total_fees_c: number
  notes?: string
}

export interface CashCountDenomination {
  label: string
  cents: number
  kind: 'BILL' | 'COIN'
}

export const CASH_COUNT_DENOMINATIONS: CashCountDenomination[] = [
  { label: '₱1000', cents: 100000, kind: 'BILL' },
  { label: '₱500', cents: 50000, kind: 'BILL' },
  { label: '₱200', cents: 20000, kind: 'BILL' },
  { label: '₱100', cents: 10000, kind: 'BILL' },
  { label: '₱50', cents: 5000, kind: 'BILL' },
  { label: '₱20', cents: 2000, kind: 'BILL' },
  { label: '₱20', cents: 2000, kind: 'COIN' },
  { label: '₱10', cents: 1000, kind: 'COIN' },
  { label: '₱5', cents: 500, kind: 'COIN' },
  { label: '₱1', cents: 100, kind: 'COIN' },
  { label: '₱0.25', cents: 25, kind: 'COIN' }
]

export const BILLER_PRESETS = [
  { name: 'Meralco', category: 'UTILITIES' as const, defaultFee: 15, icon: '⚡' },
  { name: 'Electric Cooperative', category: 'UTILITIES' as const, defaultFee: 15, icon: '⚡' },
  { name: 'VECO / Visayan Electric', category: 'UTILITIES' as const, defaultFee: 15, icon: '⚡' },
  { name: 'Maynilad / Manila Water', category: 'WATER' as const, defaultFee: 15, icon: '💧' },
  { name: 'Local Water District', category: 'WATER' as const, defaultFee: 15, icon: '💧' },
  { name: 'Home Credit', category: 'LOANS' as const, defaultFee: 20, icon: '💳' },
  { name: 'Cashalo / Tala', category: 'LOANS' as const, defaultFee: 20, icon: '💳' },
  { name: 'ShopeePay / SPayLater', category: 'LOANS' as const, defaultFee: 15, icon: '🛍️' },
  { name: 'Globe / TM Regular & Promo', category: 'TELCO' as const, defaultFee: 5, icon: '📶' },
  { name: 'Smart / TNT Regular & Promo', category: 'TELCO' as const, defaultFee: 5, icon: '📶' },
  { name: 'DITO Telecommunity', category: 'TELCO' as const, defaultFee: 5, icon: '📶' },
  { name: 'Converge ICT', category: 'INTERNET' as const, defaultFee: 20, icon: '🌐' },
  { name: 'PLDT Home / Smart Bro', category: 'INTERNET' as const, defaultFee: 20, icon: '🌐' }
]

const EWALLET_STORAGE_KEY = 'tinda_ewallet_transactions'
const BILLS_STORAGE_KEY = 'tinda_bills_load_records'
const AUDITS_STORAGE_KEY = 'tinda_ewallet_audits'

interface EwalletScreenProps {
  currentCashierName?: string
  storeName?: string
}

export function EwalletScreen({
  currentCashierName = 'Cashier',
  storeName = 'TINDA Retail Station'
}: EwalletScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'register' | 'bills' | 'transactions' | 'audit' | 'history'>('register')

  // ─── 1. E-WALLET REGISTER FORM STATE ─────────────────────────────
  const [channel, setChannel] = useState<EwalletChannel>('GCASH')
  const [type, setType] = useState<EwalletTransactionType>('CASH_IN')
  const [amountStr, setAmountStr] = useState('')
  const [feeStr, setFeeStr] = useState('10')
  const [feeCollectedVia, setFeeCollectedVia] = useState<'CASH' | 'WALLET'>('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')

  // ─── 2. BILLS & E-LOAD FORM STATE ────────────────────────────────
  const [selectedBillerCat, setSelectedBillerCat] = useState<string>('ALL')
  const [selectedBiller, setSelectedBiller] = useState(BILLER_PRESETS[0]!.name)
  const [customBiller, setCustomBiller] = useState('')
  const [billAccountNo, setBillAccountNo] = useState('')
  const [billCustomerName, setBillCustomerName] = useState('')
  const [billCustomerPhone, setBillCustomerPhone] = useState('')
  const [billAmountStr, setBillAmountStr] = useState('')
  const [billFeeStr, setBillFeeStr] = useState(String(BILLER_PRESETS[0]?.defaultFee || 15))
  const [billFeeMode, setBillFeeMode] = useState<'ADD' | 'DEDUCT'>('ADD')
  const [billCashReceivedStr, setBillCashReceivedStr] = useState('')
  const [billSourceWallet, setBillSourceWallet] = useState<EwalletChannel>('GCASH')
  const [billReferenceNo, setBillReferenceNo] = useState('')

  // ─── 3. TRANSACTIONS & STORAGE STATE ─────────────────────────────
  const [transactions, setTransactions] = useState<EwalletTransactionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(EWALLET_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [billRecords, setBillRecords] = useState<BillTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(BILLS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [audits, setAudits] = useState<EwalletAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem(AUDITS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EWALLET_STORAGE_KEY, JSON.stringify(transactions))
    } catch {}
  }, [transactions])

  useEffect(() => {
    try {
      localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(billRecords))
    } catch {}
  }, [billRecords])

  useEffect(() => {
    try {
      localStorage.setItem(AUDITS_STORAGE_KEY, JSON.stringify(audits))
    } catch {}
  }, [audits])

  // ─── 4. AUDIT SHEET FORM STATE ───────────────────────────────────
  const [denominations, setDenominations] = useState<number[]>(() =>
    new Array(CASH_COUNT_DENOMINATIONS.length).fill(0)
  )
  const [expectedCashDrawerStr, setExpectedCashDrawerStr] = useState('0.00')
  const [startingGcashStr, setStartingGcashStr] = useState('0.00')
  const [actualGcashStr, setActualGcashStr] = useState('0.00')
  const [startingMayaStr, setStartingMayaStr] = useState('0.00')
  const [actualMayaStr, setActualMayaStr] = useState('0.00')
  const [startingMaribankStr, setStartingMaribankStr] = useState('0.00')
  const [actualMaribankStr, setActualMaribankStr] = useState('0.00')
  const [auditNotes, setAuditNotes] = useState('')

  // ─── 5. MODAL PRINT & DELETE STATE ───────────────────────────────
  const [slipEwalletTx, setSlipEwalletTx] = useState<EwalletTransactionRecord | null>(null)
  const [slipBillTx, setSlipBillTx] = useState<BillTransaction | null>(null)
  const [slipAuditRecord, setSlipAuditRecord] = useState<EwalletAuditRecord | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'EWALLET' | 'BILL' | 'AUDIT'; id: string } | null>(null)
  const [isClearAuditsModalOpen, setIsClearAuditsModalOpen] = useState(false)

  // ─── 6. TRANSACTION LEDGER SEARCH & FILTERS ──────────────────────
  const [txSearch, setTxSearch] = useState('')
  const [txFilterChannel, setTxFilterChannel] = useState<'ALL' | EwalletChannel>('ALL')
  const [txFilterType, setTxFilterType] = useState<'ALL' | 'CASH_IN' | 'CASH_OUT' | 'BILLS'>('ALL')

  // ─── COMPUTED METRICS ────────────────────────────────────────────

  // Shift summary metrics
  const shiftMetrics = useMemo(() => {
    let gcashInCount = 0, gcashInAmt_c = 0, gcashInFees_c = 0
    let gcashOutCount = 0, gcashOutAmt_c = 0, gcashOutFees_c = 0
    let mayaInCount = 0, mayaInAmt_c = 0, mayaInFees_c = 0
    let mayaOutCount = 0, mayaOutAmt_c = 0, mayaOutFees_c = 0
    let maribankInCount = 0, maribankInAmt_c = 0, maribankInFees_c = 0
    let maribankOutCount = 0, maribankOutAmt_c = 0, maribankOutFees_c = 0
    let totalFees_c = 0
    let netDrawerImpact_c = 0 // Cash In = Cash received into drawer (+); Cash Out = Cash handed out (-)

    for (const tx of transactions) {
      totalFees_c += tx.fee_c
      if (tx.channel === 'GCASH') {
        if (tx.type === 'CASH_IN') {
          gcashInCount++
          gcashInAmt_c += tx.amount_c
          gcashInFees_c += tx.fee_c
          netDrawerImpact_c += tx.fee_collected_via === 'CASH' ? tx.amount_c + tx.fee_c : tx.amount_c
        } else {
          gcashOutCount++
          gcashOutAmt_c += tx.amount_c
          gcashOutFees_c += tx.fee_c
          const cashGivenOut = tx.fee_collected_via === 'WALLET' ? Math.max(0, tx.amount_c - tx.fee_c) : tx.amount_c
          netDrawerImpact_c -= cashGivenOut
        }
      } else if (tx.channel === 'MAYA') {
        if (tx.type === 'CASH_IN') {
          mayaInCount++
          mayaInAmt_c += tx.amount_c
          mayaInFees_c += tx.fee_c
          netDrawerImpact_c += tx.fee_collected_via === 'CASH' ? tx.amount_c + tx.fee_c : tx.amount_c
        } else {
          mayaOutCount++
          mayaOutAmt_c += tx.amount_c
          mayaOutFees_c += tx.fee_c
          const cashGivenOut = tx.fee_collected_via === 'WALLET' ? Math.max(0, tx.amount_c - tx.fee_c) : tx.amount_c
          netDrawerImpact_c -= cashGivenOut
        }
      } else if (tx.channel === 'MARIBANK') {
        if (tx.type === 'CASH_IN') {
          maribankInCount++
          maribankInAmt_c += tx.amount_c
          maribankInFees_c += tx.fee_c
          netDrawerImpact_c += tx.fee_collected_via === 'CASH' ? tx.amount_c + tx.fee_c : tx.amount_c
        } else {
          maribankOutCount++
          maribankOutAmt_c += tx.amount_c
          maribankOutFees_c += tx.fee_c
          const cashGivenOut = tx.fee_collected_via === 'WALLET' ? Math.max(0, tx.amount_c - tx.fee_c) : tx.amount_c
          netDrawerImpact_c -= cashGivenOut
        }
      } else if (tx.channel === 'SHOPEEPAY') {
        if (tx.type === 'CASH_IN') {
          netDrawerImpact_c += tx.fee_collected_via === 'CASH' ? tx.amount_c + tx.fee_c : tx.amount_c
        } else {
          const cashGivenOut = tx.fee_collected_via === 'WALLET' ? Math.max(0, tx.amount_c - tx.fee_c) : tx.amount_c
          netDrawerImpact_c -= cashGivenOut
        }
      }
    }

    // Bills payment adds cash to drawer
    for (const b of billRecords) {
      const fee_c = Math.round(b.serviceFee * 100)
      const amt_c = Math.round(b.amount * 100)
      totalFees_c += fee_c
      const collected_c = b.feeMode === 'DEDUCT' ? Math.max(0, amt_c - fee_c) : amt_c + fee_c
      netDrawerImpact_c += collected_c
    }

    return {
      gcashInCount, gcashInAmt_c, gcashInFees_c,
      gcashOutCount, gcashOutAmt_c, gcashOutFees_c,
      mayaInCount, mayaInAmt_c, mayaInFees_c,
      mayaOutCount, mayaOutAmt_c, mayaOutFees_c,
      maribankInCount, maribankInAmt_c, maribankInFees_c,
      maribankOutCount, maribankOutAmt_c, maribankOutFees_c,
      totalFees_c,
      netDrawerImpact_c
    }
  }, [transactions, billRecords])

  // Denominations actual physical cash counted
  const actualCashC = useMemo(() => {
    return denominations.reduce((sum, q, i) => {
      const d = CASH_COUNT_DENOMINATIONS[i]
      return sum + (q || 0) * (d ? d.cents : 0)
    }, 0)
  }, [denominations])

  const expectedCashC = Math.round((parseFloat(expectedCashDrawerStr) || 0) * 100)
  const cashDifferenceC = actualCashC - expectedCashC
  const cashStatus = cashDifferenceC === 0 ? 'BALANCED' : cashDifferenceC > 0 ? 'OVER' : 'SHORT'

  // Multi-wallet digital balances
  const startingGcashC = Math.round((parseFloat(startingGcashStr) || 0) * 100)
  const actualGcashC = Math.round((parseFloat(actualGcashStr) || 0) * 100)
  const expectedGcashC = startingGcashC - shiftMetrics.gcashInAmt_c + shiftMetrics.gcashOutAmt_c
  const gcashDifferenceC = actualGcashC - expectedGcashC

  const startingMayaC = Math.round((parseFloat(startingMayaStr) || 0) * 100)
  const actualMayaC = Math.round((parseFloat(actualMayaStr) || 0) * 100)
  const expectedMayaC = startingMayaC - shiftMetrics.mayaInAmt_c + shiftMetrics.mayaOutAmt_c
  const mayaDifferenceC = actualMayaC - expectedMayaC

  const startingMaribankC = Math.round((parseFloat(startingMaribankStr) || 0) * 100)
  const actualMaribankC = Math.round((parseFloat(actualMaribankStr) || 0) * 100)
  const expectedMaribankC = startingMaribankC - shiftMetrics.maribankInAmt_c + shiftMetrics.maribankOutAmt_c
  const maribankDifferenceC = actualMaribankC - expectedMaribankC

  const handleDenomChange = (index: number, val: string): void => {
    const qty = parseInt(val, 10) || 0
    setDenominations((prev) => {
      const copy = [...prev]
      copy[index] = Math.max(0, qty)
      return copy
    })
  }

  // ─── ACTION HANDLERS ─────────────────────────────────────────────

  // Save E-Wallet transaction
  const handleSaveEwalletTx = (printSlip = false) => {
    const amt = parseFloat(amountStr)
    if (!amt || amt <= 0) {
      playScanError()
      alert('Please enter a valid amount.')
      return
    }

    const fee = parseFloat(feeStr) || 0
    const newTx: EwalletTransactionRecord = {
      id: 'EW-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
      channel,
      type,
      amount_c: Math.round(amt * 100),
      fee_c: Math.round(fee * 100),
      fee_collected_via: feeCollectedVia,
      reference_no: referenceNo.trim() || 'REF-' + Math.floor(100000 + Math.random() * 900000),
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      cashier_name: currentCashierName,
      created_at: new Date().toISOString()
    }

    setTransactions((prev) => [newTx, ...prev])
    playCheckoutChime()

    if (printSlip) {
      setSlipEwalletTx(newTx)
    }

    // Reset inputs
    setAmountStr('')
    setReferenceNo('')
    setCustomerName('')
    setCustomerPhone('')
    setNotes('')
  }

  // Save Bills / E-Load transaction
  const handleSaveBillTx = (printSlip = false) => {
    const amt = parseFloat(billAmountStr)
    if (!amt || amt <= 0) {
      playScanError()
      alert('Please enter a valid bill or load amount.')
      return
    }
    if (!billAccountNo.trim()) {
      playScanError()
      alert('Please enter the customer account number or mobile phone.')
      return
    }

    const fee = parseFloat(billFeeStr) || 0
    const cashRec = parseFloat(billCashReceivedStr) || undefined
    const totalDue = billFeeMode === 'DEDUCT' ? Math.max(0, amt - fee) : amt + fee
    const changeAmt = cashRec !== undefined && cashRec >= totalDue ? cashRec - totalDue : undefined

    const finalBillerName = selectedBiller === 'OTHER' ? (customBiller.trim() || 'Custom Biller') : selectedBiller
    const presetMatch = BILLER_PRESETS.find((p) => p.name === selectedBiller)

    const newBill: BillTransaction = {
      id: 'BL-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
      category: presetMatch?.category || 'UTILITIES',
      biller: finalBillerName,
      accountNo: billAccountNo.trim(),
      customerName: billCustomerName.trim() || 'Walk-in Customer',
      customerPhone: billCustomerPhone.trim() || undefined,
      amount: amt,
      serviceFee: fee,
      feeMode: billFeeMode,
      sourceWallet: billSourceWallet,
      cashReceived: cashRec,
      change: changeAmt,
      referenceNo: billReferenceNo.trim() || 'REF-' + Math.floor(100000 + Math.random() * 900000),
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      cashierName: currentCashierName
    }

    setBillRecords((prev) => [newBill, ...prev])
    playCheckoutChime()

    if (printSlip) {
      setSlipBillTx(newBill)
    }

    // Reset inputs
    setBillAmountStr('')
    setBillAccountNo('')
    setBillCustomerName('')
    setBillCustomerPhone('')
    setBillCashReceivedStr('')
    setBillReferenceNo('')
  }

  // Save Shift Audit Record
  const handleSaveAudit = (printMode = false) => {
    const record: EwalletAuditRecord = {
      id: 'AUD-' + Date.now().toString(36).toUpperCase(),
      business_date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
      created_at: new Date().toISOString(),
      cashier_name: currentCashierName,
      expected_cash_c: expectedCashC,
      actual_cash_c: actualCashC,
      cash_difference_c: cashDifferenceC,
      cash_status: cashStatus,
      denominations: [...denominations],
      starting_gcash_c: startingGcashC,
      actual_gcash_c: actualGcashC,
      expected_gcash_c: expectedGcashC,
      gcash_difference_c: gcashDifferenceC,
      starting_maya_c: startingMayaC,
      actual_maya_c: actualMayaC,
      expected_maya_c: expectedMayaC,
      maya_difference_c: mayaDifferenceC,
      starting_maribank_c: startingMaribankC,
      actual_maribank_c: actualMaribankC,
      expected_maribank_c: expectedMaribankC,
      maribank_difference_c: maribankDifferenceC,
      total_fees_c: shiftMetrics.totalFees_c,
      notes: auditNotes.trim() || undefined
    }

    setAudits((prev) => [record, ...prev])
    playScanSuccess()

    if (printMode) {
      setSlipAuditRecord(record)
    }

    setActiveTab('history')
  }

  const handleResetAuditSheet = () => {
    setDenominations(new Array(CASH_COUNT_DENOMINATIONS.length).fill(0))
    setExpectedCashDrawerStr('0.00')
    setStartingGcashStr('0.00')
    setActualGcashStr('0.00')
    setStartingMayaStr('0.00')
    setActualMayaStr('0.00')
    setStartingMaribankStr('0.00')
    setActualMaribankStr('0.00')
    setAuditNotes('')
  }

  const confirmDeleteItem = () => {
    if (!itemToDelete) return
    if (itemToDelete.type === 'EWALLET') {
      setTransactions((prev) => prev.filter((t) => t.id !== itemToDelete.id))
    } else if (itemToDelete.type === 'BILL') {
      setBillRecords((prev) => prev.filter((b) => b.id !== itemToDelete.id))
    } else if (itemToDelete.type === 'AUDIT') {
      setAudits((prev) => prev.filter((a) => a.id !== itemToDelete.id))
    }
    setItemToDelete(null)
  }

  // Combined ledger records
  const combinedLedger = useMemo(() => {
    type LedgerRow = {
      id: string
      date: string
      channel: EwalletChannel
      typeLabel: string
      isCashIn: boolean
      title: string
      subtitle: string
      amount_c: number
      fee_c: number
      feeMethod: string
      ref: string
      rawType: 'EWALLET' | 'BILL'
      rawItem: EwalletTransactionRecord | BillTransaction
    }

    const rows: LedgerRow[] = []

    for (const tx of transactions) {
      rows.push({
        id: tx.id,
        date: tx.created_at,
        channel: tx.channel,
        typeLabel: tx.type === 'CASH_IN' ? 'Cash In' : 'Cash Out',
        isCashIn: tx.type === 'CASH_IN',
        title: tx.customer_name ? `${tx.customer_name}` : 'Walk-in Customer',
        subtitle: tx.customer_phone ? `Phone: ${tx.customer_phone}` : (tx.notes || ''),
        amount_c: tx.amount_c,
        fee_c: tx.fee_c,
        feeMethod: tx.fee_collected_via === 'WALLET' ? 'Wallet Deduct' : 'Cash Collected',
        ref: tx.reference_no || '—',
        rawType: 'EWALLET',
        rawItem: tx
      })
    }

    for (const b of billRecords) {
      rows.push({
        id: b.id,
        date: b.createdAt,
        channel: b.sourceWallet,
        typeLabel: 'Bill / Load',
        isCashIn: true,
        title: `${b.biller} (${b.accountNo})`,
        subtitle: `Customer: ${b.customerName}`,
        amount_c: Math.round(b.amount * 100),
        fee_c: Math.round(b.serviceFee * 100),
        feeMethod: b.feeMode === 'DEDUCT' ? 'Deducted' : 'Cash Added',
        ref: b.referenceNo,
        rawType: 'BILL',
        rawItem: b
      })
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return rows.filter((r) => {
      if (txFilterChannel !== 'ALL' && r.channel !== txFilterChannel) return false
      if (txFilterType === 'CASH_IN' && (!r.isCashIn || r.rawType !== 'EWALLET')) return false
      if (txFilterType === 'CASH_OUT' && (r.isCashIn || r.rawType !== 'EWALLET')) return false
      if (txFilterType === 'BILLS' && r.rawType !== 'BILL') return false

      if (txSearch.trim()) {
        const q = txSearch.toLowerCase()
        const matchTitle = r.title.toLowerCase().includes(q)
        const matchSubtitle = r.subtitle.toLowerCase().includes(q)
        const matchRef = r.ref.toLowerCase().includes(q)
        const matchChannel = r.channel.toLowerCase().includes(q)
        if (!matchTitle && !matchSubtitle && !matchRef && !matchChannel) return false
      }

      return true
    })
  }, [transactions, billRecords, txFilterChannel, txFilterType, txSearch])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glow-emerald">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-stone-100 flex items-center gap-2">
                <span>E-Wallet &amp; Bills Hub</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  DESKTOP PARITY
                </span>
              </h1>
              <p className="text-xs text-stone-400 font-sans mt-0.5">
                Express GCash, Maya, MariBank &amp; ShopeePay Cash In/Out, Bills &amp; E-Load Presets, 3-Way Shift Reconciliation, and Instant Thermal Printing.
              </p>
            </div>
          </div>
        </div>

        {/* 5-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel bg-obsidian-950/90 border border-white/[0.08] overflow-x-auto scrollbar-none shadow-vault">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Cash In / Out</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'bills'
                ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Bills &amp; Load ({billRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Ledger ({transactions.length + billRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Audit Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
                : 'text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Audit History ({audits.length})</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 1: EXPRESS CASH IN / CASH OUT REGISTER                  */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Express Register Form */}
          <div className="lg:col-span-7 space-y-5">
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-400" />
                  <span>New E-Wallet Transaction</span>
                </h3>
                <span className="text-[11px] font-mono text-stone-400">
                  Cashier: <span className="text-emerald-400 font-bold">{currentCashierName}</span>
                </span>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                  Select Digital Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setChannel('GCASH')}
                    className={`btn-press flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-xs transition-all ${
                      channel === 'GCASH'
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300 shadow-md ring-2 ring-sky-500/40'
                        : 'border-white/[0.06] bg-obsidian-950/80 text-stone-400 hover:text-stone-200 hover:border-white/[0.12]'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 text-sky-400" />
                    <span>GCash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('MAYA')}
                    className={`btn-press flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-xs transition-all ${
                      channel === 'MAYA'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md ring-2 ring-emerald-500/40'
                        : 'border-white/[0.06] bg-obsidian-950/80 text-stone-400 hover:text-stone-200 hover:border-white/[0.12]'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 text-emerald-400" />
                    <span>Maya</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('MARIBANK')}
                    className={`btn-press flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-xs transition-all ${
                      channel === 'MARIBANK'
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300 shadow-md ring-2 ring-orange-500/40'
                        : 'border-white/[0.06] bg-obsidian-950/80 text-stone-400 hover:text-stone-200 hover:border-white/[0.12]'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 text-orange-400" />
                    <span>MariBank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('SHOPEEPAY')}
                    className={`btn-press flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-xs transition-all ${
                      channel === 'SHOPEEPAY'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-md ring-2 ring-amber-500/40'
                        : 'border-white/[0.06] bg-obsidian-950/80 text-stone-400 hover:text-stone-200 hover:border-white/[0.12]'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 text-amber-400" />
                    <span>ShopeePay</span>
                  </button>
                </div>
              </div>

              {/* Type Selector: Cash In vs Cash Out */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setType('CASH_IN')
                      setFeeCollectedVia('CASH')
                    }}
                    className={`btn-press flex flex-col items-center justify-center py-3 rounded-2xl border font-bold text-xs transition-all ${
                      type === 'CASH_IN'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-glow-emerald ring-2 ring-emerald-500/40'
                        : 'border-white/[0.06] bg-obsidian-950/80 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-black">
                      <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                      <span>CASH IN</span>
                    </span>
                    <span className="text-[10px] font-normal text-stone-400 mt-0.5">
                      Customer gives physical cash, store sends load
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType('CASH_OUT')
                      setFeeCollectedVia('WALLET')
                    }}
                    className={`btn-press flex flex-col items-center justify-center py-3 rounded-2xl border font-bold text-xs transition-all ${
                      type === 'CASH_OUT'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-md ring-2 ring-amber-500/40'
                        : 'border-white/[0.06] bg-obsidian-950/80 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-black">
                      <ArrowUpRight className="h-4 w-4 text-amber-400" />
                      <span>CASH OUT</span>
                    </span>
                    <span className="text-[10px] font-normal text-stone-400 mt-0.5">
                      Customer transfers load, store gives physical cash
                    </span>
                  </button>
                </div>
              </div>

              {/* Amount Input & Quick Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Principal Amount (₱) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-base font-bold text-stone-500 font-serif">₱</span>
                  <input
                    type="number"
                    step="any"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-white/[0.08] bg-obsidian-950 pl-9 pr-4 py-3 text-lg font-bold text-stone-100 outline-none focus:border-emerald-500/60 font-mono transition-all"
                  />
                </div>
                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[100, 200, 300, 500, 1000, 1500, 2000, 3000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountStr(String(amt))}
                      className="px-2.5 py-1 text-xs font-mono font-semibold rounded-xl border border-white/[0.06] bg-obsidian-950 text-stone-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
                    >
                      ₱{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Fee */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Service Fee (₱)
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">Store Profit</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-2.5 text-sm font-bold text-stone-500 font-serif">₱</span>
                    <input
                      type="number"
                      step="any"
                      value={feeStr}
                      onChange={(e) => setFeeStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 pl-8 pr-3 py-2 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500/60 font-mono transition-all"
                    />
                  </div>
                  {/* Quick fee buttons */}
                  {[5, 10, 15, 20, 30, 50].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFeeStr(String(f))}
                      className="px-2.5 py-1 text-xs font-mono font-semibold rounded-xl border border-white/[0.06] bg-obsidian-950 text-stone-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
                    >
                      ₱{f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Handling Mode */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-stone-400 font-medium text-[11px]">Fee Handling:</span>
                <div className="flex rounded-xl bg-obsidian-950 p-1 border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setFeeCollectedVia('WALLET')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      feeCollectedVia === 'WALLET'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {type === 'CASH_OUT' ? '− Deduct from Release' : '− Deduct from Load'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeCollectedVia('CASH')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      feeCollectedVia === 'CASH'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {type === 'CASH_OUT' ? '+ Extra Cash Outside' : '+ Add to Cash Collect'}
                  </button>
                </div>
              </div>

              {/* Live Calculation Summary */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 flex items-center justify-between shadow-inner">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    {type === 'CASH_OUT'
                      ? (feeCollectedVia === 'WALLET' ? 'Net Cash to Hand Out to Customer (Deducted)' : 'Total Physical Cash to Hand Out')
                      : (feeCollectedVia === 'WALLET' ? 'Total Cash Collected (Net Load Sent)' : 'Total Cash to Collect from Customer')}
                  </p>
                  <p className="text-xl font-black text-stone-100 font-serif mt-0.5">
                    ₱{(type === 'CASH_OUT'
                      ? (feeCollectedVia === 'WALLET' ? Math.max(0, (parseFloat(amountStr) || 0) - (parseFloat(feeStr) || 0)) : (parseFloat(amountStr) || 0))
                      : (feeCollectedVia === 'WALLET' ? (parseFloat(amountStr) || 0) : (parseFloat(amountStr) || 0) + (parseFloat(feeStr) || 0))
                    ).toFixed(2)}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border font-mono ${
                  feeCollectedVia === 'WALLET'
                    ? 'text-sky-300 bg-sky-500/15 border-sky-500/30'
                    : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                }`}>
                  {feeCollectedVia === 'WALLET' ? 'Fee Deducted: -₱' : 'Fee Added: +₱'}{(parseFloat(feeStr) || 0).toFixed(2)}
                </span>
              </div>

              {/* Customer & Reference Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-stone-400">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Juan dela Cruz"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-400">Account / Phone # (Optional)</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-stone-400">Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-400">Notes / Remarks</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Regular customer, load discount"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-2 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveEwalletTx(true)}
                  className="flex-1 btn-press flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3.5 text-xs font-bold text-obsidian-950 shadow-glow-emerald transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span>Record &amp; Print Claim Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEwalletTx(false)}
                  className="btn-press flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-obsidian-950 hover:bg-white/[0.04] px-5 py-3.5 text-xs font-bold text-stone-200 transition-all"
                >
                  <span>Save Only</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Active Shift Metrics Snapshot */}
          <div className="lg:col-span-5 space-y-5">
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>Active Shift E-Wallet Snapshot</span>
                </h3>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
                  <p className="text-[11px] font-bold text-sky-400">GCash Cash In</p>
                  <p className="text-base font-bold text-stone-100 font-mono mt-0.5">
                    ₱{(shiftMetrics.gcashInAmt_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {shiftMetrics.gcashInCount} txn · Fee: ₱{(shiftMetrics.gcashInFees_c / 100).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
                  <p className="text-[11px] font-bold text-sky-400">GCash Cash Out</p>
                  <p className="text-base font-bold text-stone-100 font-mono mt-0.5">
                    ₱{(shiftMetrics.gcashOutAmt_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {shiftMetrics.gcashOutCount} txn · Fee: ₱{(shiftMetrics.gcashOutFees_c / 100).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[11px] font-bold text-emerald-400">Maya Cash In</p>
                  <p className="text-base font-bold text-stone-100 font-mono mt-0.5">
                    ₱{(shiftMetrics.mayaInAmt_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {shiftMetrics.mayaInCount} txn · Fee: ₱{(shiftMetrics.mayaInFees_c / 100).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[11px] font-bold text-emerald-400">Maya Cash Out</p>
                  <p className="text-base font-bold text-stone-100 font-mono mt-0.5">
                    ₱{(shiftMetrics.mayaOutAmt_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {shiftMetrics.mayaOutCount} txn · Fee: ₱{(shiftMetrics.mayaOutFees_c / 100).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="text-[11px] font-bold text-orange-400">MariBank Cash In</p>
                  <p className="text-base font-bold text-stone-100 font-mono mt-0.5">
                    ₱{(shiftMetrics.maribankInAmt_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {shiftMetrics.maribankInCount} txn · Fee: ₱{(shiftMetrics.maribankInFees_c / 100).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="text-[11px] font-bold text-orange-400">MariBank Cash Out</p>
                  <p className="text-base font-bold text-stone-100 font-mono mt-0.5">
                    ₱{(shiftMetrics.maribankOutAmt_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {shiftMetrics.maribankOutCount} txn · Fee: ₱{(shiftMetrics.maribankOutFees_c / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Total Service Fees & Net Drawer Flow */}
              <div className="border-t border-white/[0.06] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
                    Total Fees Earned (Profit)
                  </span>
                  <span className="font-serif text-lg font-black text-amber-400">
                    ₱{(shiftMetrics.totalFees_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
                    Net Cash Drawer Flow
                  </span>
                  <span className={`font-mono text-sm font-bold ${
                    shiftMetrics.netDrawerImpact_c >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {shiftMetrics.netDrawerImpact_c >= 0 ? '+' : ''}
                    ₱{(shiftMetrics.netDrawerImpact_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Quick Jump to Audit Sheet */}
              <button
                type="button"
                onClick={() => {
                  setExpectedCashDrawerStr(((shiftMetrics.netDrawerImpact_c / 100) || 0).toFixed(2))
                  setActiveTab('audit')
                }}
                className="w-full btn-press mt-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>Reconcile in Audit Sheet</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 2: BILLS PAYMENT & E-LOAD HUB                           */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'bills' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Bills Payment Form */}
          <div className="lg:col-span-6 space-y-5">
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Bills Payment &amp; E-Load Terminal</span>
                </h3>
                <span className="text-[11px] font-mono text-stone-400">
                  Total Logged: <span className="text-emerald-400 font-bold">{billRecords.length}</span>
                </span>
              </div>

              {/* Category Filter Pills */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                  Biller Category
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {['ALL', 'UTILITIES', 'WATER', 'LOANS', 'TELCO', 'INTERNET'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedBillerCat(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                        selectedBillerCat === cat
                          ? 'bg-emerald-500 text-obsidian-950 font-bold shadow-glow-emerald'
                          : 'bg-obsidian-950/80 border border-white/[0.06] text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Billers' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Biller Select Grid */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                  Select Preset Biller
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {BILLER_PRESETS.filter((p) => selectedBillerCat === 'ALL' || p.category === selectedBillerCat).map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => {
                        setSelectedBiller(b.name)
                        setBillFeeStr(String(b.defaultFee))
                      }}
                      className={`btn-press p-2.5 rounded-xl border text-left transition-all ${
                        selectedBiller === b.name
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-glow-emerald'
                          : 'border-white/[0.06] bg-obsidian-950/80 text-stone-300 hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{b.icon}</span>
                        <span className="text-xs truncate">{b.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 mt-1 block">
                        Default Fee: ₱{b.defaultFee}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBiller('OTHER')
                      setBillFeeStr('15')
                    }}
                    className={`btn-press p-2.5 rounded-xl border text-left transition-all ${
                      selectedBiller === 'OTHER'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'border-white/[0.06] bg-obsidian-950/80 text-stone-300 hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold">Other / Custom</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500 mt-1 block">Custom Biller</span>
                  </button>
                </div>
              </div>

              {selectedBiller === 'OTHER' && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Custom Biller Name
                  </label>
                  <input
                    type="text"
                    value={customBiller}
                    onChange={(e) => setCustomBiller(e.target.value)}
                    placeholder="e.g. Local Cable Network, School Tuition"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3.5 py-2.5 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              )}

              {/* Account Number & Customer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Account / Phone No. <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={billAccountNo}
                    onChange={(e) => setBillAccountNo(e.target.value)}
                    placeholder="e.g. 1029384756 or 0917..."
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3.5 py-2.5 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={billCustomerName}
                    onChange={(e) => setBillCustomerName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3.5 py-2.5 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Amount & Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Bill / Load Amount (₱) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-bold text-stone-500 font-serif">₱</span>
                    <input
                      type="number"
                      step="any"
                      value={billAmountStr}
                      onChange={(e) => setBillAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 pl-8 pr-3 py-2 text-base font-bold text-stone-100 outline-none focus:border-emerald-500/60 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Convenience Fee (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-bold text-stone-500 font-serif">₱</span>
                    <input
                      type="number"
                      step="any"
                      value={billFeeStr}
                      onChange={(e) => setBillFeeStr(e.target.value)}
                      placeholder="15.00"
                      className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 pl-8 pr-3 py-2 text-base font-bold text-emerald-400 outline-none focus:border-emerald-500/60 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Mode & Source Digital Wallet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Fee Handling Mode
                  </label>
                  <div className="flex rounded-xl bg-obsidian-950 p-1 border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setBillFeeMode('ADD')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        billFeeMode === 'ADD'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      + Add to Bill (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillFeeMode('DEDUCT')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        billFeeMode === 'DEDUCT'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      − Deduct from Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Source Wallet (Used by Store)
                  </label>
                  <select
                    value={billSourceWallet}
                    onChange={(e) => setBillSourceWallet(e.target.value as EwalletChannel)}
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-2 text-xs font-bold text-stone-100 outline-none focus:border-emerald-500/60 transition-all font-mono"
                  >
                    <option value="GCASH">GCash</option>
                    <option value="MAYA">Maya</option>
                    <option value="MARIBANK">MariBank</option>
                    <option value="SHOPEEPAY">ShopeePay</option>
                  </select>
                </div>
              </div>

              {/* Cash Received & Live Change Due Calculator */}
              <div className="rounded-2xl border border-white/[0.08] bg-obsidian-950/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-bold uppercase tracking-wider">Total Amount Due</span>
                  <span className="font-serif text-base font-black text-emerald-400">
                    ₱{(billFeeMode === 'DEDUCT'
                      ? Math.max(0, (parseFloat(billAmountStr) || 0) - (parseFloat(billFeeStr) || 0))
                      : ((parseFloat(billAmountStr) || 0) + (parseFloat(billFeeStr) || 0))
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                      Cash Received from Customer (₱)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={billCashReceivedStr}
                      onChange={(e) => setBillCashReceivedStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/[0.08] bg-obsidian-900 px-3 py-1.5 text-sm font-bold text-stone-100 outline-none focus:border-emerald-500/60 font-mono"
                    />
                  </div>

                  <div className="text-right min-w-[100px]">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Change Due
                    </span>
                    <span className={`font-serif text-base font-black ${
                      (parseFloat(billCashReceivedStr) || 0) >=
                      (billFeeMode === 'DEDUCT'
                        ? Math.max(0, (parseFloat(billAmountStr) || 0) - (parseFloat(billFeeStr) || 0))
                        : ((parseFloat(billAmountStr) || 0) + (parseFloat(billFeeStr) || 0)))
                        ? 'text-emerald-400'
                        : 'text-stone-500'
                    }`}>
                      ₱{Math.max(
                        0,
                        (parseFloat(billCashReceivedStr) || 0) -
                        (billFeeMode === 'DEDUCT'
                          ? Math.max(0, (parseFloat(billAmountStr) || 0) - (parseFloat(billFeeStr) || 0))
                          : ((parseFloat(billAmountStr) || 0) + (parseFloat(billFeeStr) || 0)))
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveBillTx(true)}
                  className="flex-1 btn-press flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3.5 text-xs font-bold text-obsidian-950 shadow-glow-emerald transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span>Process &amp; Print Bill Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBillTx(false)}
                  className="btn-press flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-obsidian-950 hover:bg-white/[0.04] px-5 py-3.5 text-xs font-bold text-stone-200 transition-all"
                >
                  <span>Save Only</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Recent Bills List */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <span>Recent Bills &amp; E-Load Transactions</span>
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {billRecords.length} records
                </span>
              </div>

              {billRecords.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs font-sans">
                  No bills payment recorded yet. Process payments using the form on the left.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {billRecords.slice(0, 15).map((b) => (
                    <div
                      key={b.id}
                      className="glass-card p-3.5 rounded-2xl border border-white/[0.06] hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-100 truncate">{b.biller}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {b.sourceWallet}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-stone-400 truncate mt-0.5">
                          Acct: <span className="text-stone-300">{b.accountNo}</span> · {b.customerName}
                        </p>
                        <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                          {formatDateTime(b.createdAt)} · Ref: {b.referenceNo}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-serif text-sm font-bold text-emerald-400">
                          ₱{(b.feeMode === 'DEDUCT' ? b.amount : b.amount + b.serviceFee).toFixed(2)}
                        </p>
                        <p className="text-[10px] font-mono text-stone-400">
                          Fee: +₱{b.serviceFee.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setSlipBillTx(b)}
                            title="Print Thermal Bill Slip"
                            className="btn-press p-1 rounded-lg border border-white/[0.08] text-stone-400 hover:text-emerald-400 hover:border-emerald-500/40"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'BILL', id: b.id })}
                            title="Delete / Void Transaction"
                            className="btn-press p-1 rounded-lg border border-white/[0.08] text-stone-500 hover:text-rose-400 hover:border-rose-500/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 3: TRANSACTION LEDGER                                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-5">
          {/* Top Controls: Search & Channel Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <span>Unified E-Wallet &amp; Bills Transaction Ledger</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Complete audit trail of all express cash in, cash out, and bills payment records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Search customer, ref #, phone..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-white/[0.08] bg-obsidian-950 text-xs text-stone-100 outline-none focus:border-emerald-500/60 w-56 font-sans"
                />
              </div>

              {/* Channel Filter */}
              <select
                value={txFilterChannel}
                onChange={(e) => setTxFilterChannel(e.target.value as any)}
                className="py-1.5 px-3 rounded-xl border border-white/[0.08] bg-obsidian-950 text-xs font-bold text-stone-200 outline-none focus:border-emerald-500/60"
              >
                <option value="ALL">All Channels</option>
                <option value="GCASH">GCash</option>
                <option value="MAYA">Maya</option>
                <option value="MARIBANK">MariBank</option>
                <option value="SHOPEEPAY">ShopeePay</option>
              </select>

              {/* Type Filter */}
              <select
                value={txFilterType}
                onChange={(e) => setTxFilterType(e.target.value as any)}
                className="py-1.5 px-3 rounded-xl border border-white/[0.08] bg-obsidian-950 text-xs font-bold text-stone-200 outline-none focus:border-emerald-500/60"
              >
                <option value="ALL">All Types</option>
                <option value="CASH_IN">Cash In</option>
                <option value="CASH_OUT">Cash Out</option>
                <option value="BILLS">Bills &amp; Load</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-3 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-stone-400">Total Filtered Rows</span>
              <p className="text-lg font-mono font-bold text-stone-100 mt-0.5">{combinedLedger.length}</p>
            </div>
            <div className="glass-card p-3 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-stone-400">Total Principal Volume</span>
              <p className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                ₱{(combinedLedger.reduce((sum, r) => sum + r.amount_c, 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="glass-card p-3 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-stone-400">Total Fees (Profit)</span>
              <p className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                ₱{(combinedLedger.reduce((sum, r) => sum + r.fee_c, 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="glass-card p-3 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-stone-400">Net Drawer Delta</span>
              <p className={`text-lg font-mono font-bold mt-0.5 ${
                shiftMetrics.netDrawerImpact_c >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {shiftMetrics.netDrawerImpact_c >= 0 ? '+' : ''}
                ₱{(shiftMetrics.netDrawerImpact_c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian-950/90 border-b border-white/[0.08] text-stone-400 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Customer / Account</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Fee</th>
                  <th className="py-3 px-4">Ref No.</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {combinedLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-500 font-sans">
                      No matching transactions found in ledger.
                    </td>
                  </tr>
                ) : (
                  combinedLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-[11px] text-stone-400 whitespace-nowrap">
                        {formatDateTime(row.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          row.channel === 'GCASH'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : row.channel === 'MAYA'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : row.channel === 'MARIBANK'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {row.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          row.rawType === 'BILL'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : row.isCashIn
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {row.typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <p className="font-bold text-stone-200 text-xs">{row.title}</p>
                        {row.subtitle && (
                          <p className="text-[10px] text-stone-400 font-mono mt-0.5">{row.subtitle}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-stone-100 whitespace-nowrap">
                        ₱{(row.amount_c / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                        +₱{(row.fee_c / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-stone-400 whitespace-nowrap">
                        {row.ref}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (row.rawType === 'EWALLET') {
                                setSlipEwalletTx(row.rawItem as EwalletTransactionRecord)
                              } else {
                                setSlipBillTx(row.rawItem as BillTransaction)
                              }
                            }}
                            title="Print Claim Slip"
                            className="btn-press p-1.5 rounded-lg border border-white/[0.08] text-stone-400 hover:text-emerald-400 hover:border-emerald-500/40"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: row.rawType, id: row.id })}
                            title="Void / Delete Transaction"
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
      {/* TAB 4: CASH DRAWER & DIGITAL AUDIT SHEET                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] shadow-vault flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-400" />
                <span>Multi-Wallet &amp; Cash Drawer Reconciliation Audit</span>
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Count physical banknotes &amp; coins, verify digital balances for GCash, Maya &amp; MariBank, and detect discrepancies instantly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetAuditSheet}
                className="btn-press flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-xs font-semibold text-stone-300 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Counts</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Box 1: Physical Cash on Hand Counter */}
            <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-400" />
                <span>1. Cash in Drawer Count</span>
              </h3>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Expected Cash Drawer (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-stone-500 font-serif">₱</span>
                    <input
                      type="number"
                      step="any"
                      value={expectedCashDrawerStr}
                      onChange={(e) => setExpectedCashDrawerStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 pl-7 pr-3 py-1.5 text-sm font-bold text-stone-100 outline-none focus:border-emerald-500/60 font-mono"
                    />
                  </div>
                  {/* Preset Float Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setExpectedCashDrawerStr('0.00')}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border border-white/[0.06] bg-obsidian-950 text-stone-400 hover:text-stone-200"
                    >
                      ₱0 (Zero Float)
                    </button>
                    {shiftMetrics.netDrawerImpact_c !== 0 && (
                      <button
                        type="button"
                        onClick={() => setExpectedCashDrawerStr(((shiftMetrics.netDrawerImpact_c / 100) || 0).toFixed(2))}
                        className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      >
                        Net Flow ({shiftMetrics.netDrawerImpact_c >= 0 ? '+' : ''}₱{(shiftMetrics.netDrawerImpact_c / 100).toFixed(2)})
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-xs pt-2 border-t border-white/[0.04]">
                  <span className="text-stone-400">Actual Counted:</span>
                  <span className="font-serif font-bold text-emerald-400">
                    ₱{(actualCashC / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/[0.04] pt-2">
                  <span className="text-stone-400 font-semibold">Variance:</span>
                  <span className={`font-mono font-black ${
                    cashDifferenceC === 0 ? 'text-emerald-400' : cashDifferenceC > 0 ? 'text-sky-400' : 'text-rose-400'
                  }`}>
                    {cashDifferenceC > 0 ? '+' : ''}₱{(cashDifferenceC / 100).toFixed(2)} ({cashStatus})
                  </span>
                </div>
              </div>

              {/* Denominations List */}
              <div className="space-y-1 pt-2 border-t border-white/[0.06] max-h-64 overflow-y-auto pr-1">
                <p className="text-[10px] uppercase font-bold text-stone-500 mb-1">Denominations Breakdown</p>
                {CASH_COUNT_DENOMINATIONS.map((d, i) => (
                  <div key={d.label + d.kind} className="flex items-center justify-between text-xs gap-2 py-0.5">
                    <span className="w-14 font-mono font-bold text-stone-300">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations[i] || ''}
                      onChange={(e) => handleDenomChange(i, e.target.value)}
                      placeholder="0"
                      className="w-16 rounded-lg border border-white/[0.08] bg-obsidian-950 px-2 py-0.5 text-right text-xs text-stone-100 outline-none focus:border-emerald-500/60 font-mono"
                    />
                    <span className="w-16 text-right text-stone-400 font-mono text-[11px]">
                      ₱{(((denominations[i] || 0) * d.cents) / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: GCash App Wallet Audit */}
            <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span>2. GCash Reconciliation</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Starting Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={startingGcashStr}
                    onChange={(e) => setStartingGcashStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-1.5 text-xs font-mono font-bold text-stone-100 outline-none focus:border-sky-500/60"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-obsidian-950/80 border border-white/[0.06] space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-stone-400">
                    <span>Sent (Cash In):</span>
                    <span className="text-rose-400">-₱{(shiftMetrics.gcashInAmt_c / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Received (Cash Out):</span>
                    <span className="text-emerald-400">+₱{(shiftMetrics.gcashOutAmt_c / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-200 border-t border-white/[0.06] pt-1">
                    <span>Expected Balance:</span>
                    <span>₱{(expectedGcashC / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Actual App Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={actualGcashStr}
                    onChange={(e) => setActualGcashStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-1.5 text-xs font-mono font-bold text-sky-400 outline-none focus:border-sky-500/60"
                  />
                </div>

                <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-stone-400 font-semibold">Discrepancy:</span>
                  <span className={`font-mono font-black ${
                    gcashDifferenceC === 0 ? 'text-emerald-400' : gcashDifferenceC > 0 ? 'text-sky-400' : 'text-rose-400'
                  }`}>
                    {gcashDifferenceC > 0 ? '+' : ''}₱{(gcashDifferenceC / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 3: Maya App Wallet Audit */}
            <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span>3. Maya Reconciliation</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Starting Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={startingMayaStr}
                    onChange={(e) => setStartingMayaStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-1.5 text-xs font-mono font-bold text-stone-100 outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-obsidian-950/80 border border-white/[0.06] space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-stone-400">
                    <span>Sent (Cash In):</span>
                    <span className="text-rose-400">-₱{(shiftMetrics.mayaInAmt_c / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Received (Cash Out):</span>
                    <span className="text-emerald-400">+₱{(shiftMetrics.mayaOutAmt_c / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-200 border-t border-white/[0.06] pt-1">
                    <span>Expected Balance:</span>
                    <span>₱{(expectedMayaC / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Actual App Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={actualMayaStr}
                    onChange={(e) => setActualMayaStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-stone-400 font-semibold">Discrepancy:</span>
                  <span className={`font-mono font-black ${
                    mayaDifferenceC === 0 ? 'text-emerald-400' : mayaDifferenceC > 0 ? 'text-sky-400' : 'text-rose-400'
                  }`}>
                    {mayaDifferenceC > 0 ? '+' : ''}₱{(mayaDifferenceC / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 4: MariBank App Wallet Audit */}
            <div className="glass-panel p-5 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
              <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span>4. MariBank Reconciliation</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Starting Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={startingMaribankStr}
                    onChange={(e) => setStartingMaribankStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-1.5 text-xs font-mono font-bold text-stone-100 outline-none focus:border-orange-500/60"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-obsidian-950/80 border border-white/[0.06] space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-stone-400">
                    <span>Sent (Cash In):</span>
                    <span className="text-rose-400">-₱{(shiftMetrics.maribankInAmt_c / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Received (Cash Out):</span>
                    <span className="text-emerald-400">+₱{(shiftMetrics.maribankOutAmt_c / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-200 border-t border-white/[0.06] pt-1">
                    <span>Expected Balance:</span>
                    <span>₱{(expectedMaribankC / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Actual App Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={actualMaribankStr}
                    onChange={(e) => setActualMaribankStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950 px-3 py-1.5 text-xs font-mono font-bold text-orange-400 outline-none focus:border-orange-500/60"
                  />
                </div>

                <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-stone-400 font-semibold">Discrepancy:</span>
                  <span className={`font-mono font-black ${
                    maribankDifferenceC === 0 ? 'text-emerald-400' : maribankDifferenceC > 0 ? 'text-sky-400' : 'text-rose-400'
                  }`}>
                    {maribankDifferenceC > 0 ? '+' : ''}₱{(maribankDifferenceC / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Notes & Save Buttons */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Audit Notes &amp; Shift Explanation
              </label>
              <textarea
                rows={2}
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="e.g. End of night shift reconciliation. Cash balanced, MariBank has ₱5 discrepancy due to delayed customer transfer."
                className="w-full rounded-2xl border border-white/[0.08] bg-obsidian-950 p-3 text-xs text-stone-100 outline-none focus:border-emerald-500/60 transition-all font-sans"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-400">Total Shift Profit:</span>
                <span className="font-serif text-base font-bold text-amber-400">
                  ₱{(shiftMetrics.totalFees_c / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveAudit(true)}
                  className="flex-1 sm:flex-initial btn-press flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-xs font-bold text-obsidian-950 shadow-glow-emerald transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span>Save Audit &amp; Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAudit(false)}
                  className="flex-1 sm:flex-initial btn-press flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-obsidian-950 hover:bg-white/[0.04] px-5 py-3 text-xs font-bold text-stone-200 transition-all"
                >
                  <span>Save Record Only</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 5: AUDIT HISTORY                                        */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-vault space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-400" />
                <span>Shift Audit Logs &amp; Historical Reconciliation</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Past cash count and digital wallet audit snapshots saved on this station.
              </p>
            </div>
            {audits.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAuditsModalOpen(true)}
                className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Logs</span>
              </button>
            )}
          </div>

          {audits.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs font-sans">
              No audit records saved yet. Perform an audit in the &quot;Audit Sheet&quot; tab.
            </div>
          ) : (
            <div className="space-y-3">
              {audits.map((a) => (
                <div
                  key={a.id}
                  className="glass-card p-4 rounded-2xl border border-white/[0.06] hover:border-emerald-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-stone-100 font-mono">{a.business_date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        a.cash_status === 'BALANCED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : a.cash_status === 'OVER'
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        Cash: {a.cash_status} ({a.cash_difference_c >= 0 ? '+' : ''}₱{(a.cash_difference_c / 100).toFixed(2)})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 font-mono">
                      <span>Cashier: <strong className="text-stone-200">{a.cashier_name}</strong></span>
                      <span>Expected: ₱{(a.expected_cash_c / 100).toFixed(2)}</span>
                      <span>Actual: <strong className="text-emerald-400">₱{(a.actual_cash_c / 100).toFixed(2)}</strong></span>
                      <span>Fees: <strong className="text-amber-400">₱{(a.total_fees_c / 100).toFixed(2)}</strong></span>
                    </div>

                    {a.notes && (
                      <p className="text-[11px] text-stone-400 italic pt-0.5 font-sans">&quot;{a.notes}&quot;</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setSlipAuditRecord(a)}
                      className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-obsidian-950 text-xs font-semibold text-stone-300 hover:text-emerald-400 hover:border-emerald-500/40"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete({ type: 'AUDIT', id: a.id })}
                      className="btn-press p-1.5 rounded-xl border border-white/[0.08] text-stone-500 hover:text-rose-400 hover:border-rose-500/40"
                      title="Delete Audit"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PRINT MODAL: E-WALLET CLAIM SLIP                            */}
      {/* ─────────────────────────────────────────────────────────── */}
      {slipEwalletTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-emerald-500/30 p-6 shadow-vault space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Printer className="h-4 w-4" />
                <span>E-Wallet Claim Slip</span>
              </div>
              <button
                type="button"
                onClick={() => setSlipEwalletTx(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div className="p-4 rounded-2xl bg-white text-stone-900 font-mono text-xs space-y-2 shadow-inner">
              <div className="text-center border-b border-stone-300 pb-2">
                <p className="font-black text-sm uppercase">{storeName}</p>
                <p className="text-[10px] text-stone-600">OFFICIAL E-WALLET TRANSACTION SLIP</p>
                <p className="text-[10px] text-stone-500">{formatDateTime(slipEwalletTx.created_at)}</p>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span>Channel:</span>
                  <span className="font-bold">{slipEwalletTx.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-bold">{slipEwalletTx.type === 'CASH_IN' ? 'CASH IN' : 'CASH OUT'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ref No:</span>
                  <span className="font-bold">{slipEwalletTx.reference_no}</span>
                </div>
                {slipEwalletTx.customer_name && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{slipEwalletTx.customer_name}</span>
                  </div>
                )}
                {slipEwalletTx.customer_phone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{slipEwalletTx.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-stone-300 pt-1">
                  <span>Principal:</span>
                  <span className="font-bold">₱{(slipEwalletTx.amount_c / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span>₱{(slipEwalletTx.fee_c / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-stone-800 pt-1">
                  <span>TOTAL:</span>
                  <span>
                    ₱{(slipEwalletTx.type === 'CASH_OUT'
                      ? (slipEwalletTx.fee_collected_via === 'WALLET' ? Math.max(0, slipEwalletTx.amount_c - slipEwalletTx.fee_c) : slipEwalletTx.amount_c)
                      : (slipEwalletTx.fee_collected_via === 'WALLET' ? slipEwalletTx.amount_c : slipEwalletTx.amount_c + slipEwalletTx.fee_c)
                    ) / 100}
                  </span>
                </div>
              </div>

              <div className="text-center border-t border-stone-300 pt-2 text-[10px] text-stone-600">
                <p>Status: COMPLETED</p>
                <p>Cashier: {slipEwalletTx.cashier_name || currentCashierName}</p>
                <p className="mt-1 font-sans">Salamat sa pagtangkilik!</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSlipEwalletTx(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs shadow-glow-emerald flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Thermal Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PRINT MODAL: BILLS PAYMENT SLIP                             */}
      {/* ─────────────────────────────────────────────────────────── */}
      {slipBillTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-emerald-500/30 p-6 shadow-vault space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Printer className="h-4 w-4" />
                <span>Bills Payment Receipt</span>
              </div>
              <button
                type="button"
                onClick={() => setSlipBillTx(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div className="p-4 rounded-2xl bg-white text-stone-900 font-mono text-xs space-y-2 shadow-inner">
              <div className="text-center border-b border-stone-300 pb-2">
                <p className="font-black text-sm uppercase">{storeName}</p>
                <p className="text-[10px] text-stone-600">BILLS PAYMENT ACKNOWLEDGMENT</p>
                <p className="text-[10px] text-stone-500">{formatDateTime(slipBillTx.createdAt)}</p>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span>Biller:</span>
                  <span className="font-bold">{slipBillTx.biller}</span>
                </div>
                <div className="flex justify-between">
                  <span>Acct No:</span>
                  <span className="font-bold">{slipBillTx.accountNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{slipBillTx.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wallet:</span>
                  <span className="font-bold">{slipBillTx.sourceWallet}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ref No:</span>
                  <span className="font-bold">{slipBillTx.referenceNo}</span>
                </div>
                <div className="flex justify-between border-t border-stone-300 pt-1">
                  <span>Bill Amount:</span>
                  <span className="font-bold">₱{slipBillTx.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Convenience Fee:</span>
                  <span>₱{slipBillTx.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-stone-800 pt-1">
                  <span>TOTAL PAID:</span>
                  <span>
                    ₱{(slipBillTx.feeMode === 'DEDUCT'
                      ? Math.max(0, slipBillTx.amount - slipBillTx.serviceFee)
                      : slipBillTx.amount + slipBillTx.serviceFee
                    ).toFixed(2)}
                  </span>
                </div>
                {slipBillTx.cashReceived && (
                  <div className="flex justify-between text-stone-600 pt-1">
                    <span>Cash Tendered:</span>
                    <span>₱{slipBillTx.cashReceived.toFixed(2)}</span>
                  </div>
                )}
                {slipBillTx.change !== undefined && (
                  <div className="flex justify-between font-bold text-stone-800">
                    <span>Change Due:</span>
                    <span>₱{slipBillTx.change.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-center border-t border-stone-300 pt-2 text-[10px] text-stone-600">
                <p>Status: COMPLETED</p>
                <p>Cashier: {slipBillTx.cashierName || currentCashierName}</p>
                <p className="mt-1 font-sans">Thank you for your payment!</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSlipBillTx(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs shadow-glow-emerald flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Bill Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PRINT MODAL: SHIFT AUDIT REPORT SLIP                        */}
      {/* ─────────────────────────────────────────────────────────── */}
      {slipAuditRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-emerald-500/30 p-6 shadow-vault space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Printer className="h-4 w-4" />
                <span>Shift Audit Slip</span>
              </div>
              <button
                type="button"
                onClick={() => setSlipAuditRecord(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div className="p-4 rounded-2xl bg-white text-stone-900 font-mono text-xs space-y-2 shadow-inner max-h-[460px] overflow-y-auto">
              <div className="text-center border-b border-stone-300 pb-2">
                <p className="font-black text-sm uppercase">{storeName}</p>
                <p className="text-[10px] text-stone-600">CASH &amp; DIGITAL WALLET AUDIT</p>
                <p className="text-[10px] text-stone-500">Date: {slipAuditRecord.business_date}</p>
                <p className="text-[10px] text-stone-500">Cashier: {slipAuditRecord.cashier_name}</p>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <p className="font-bold border-b border-stone-300 pb-0.5">PHYSICAL CASH ON HAND</p>
                <div className="flex justify-between">
                  <span>Expected:</span>
                  <span>₱{(slipAuditRecord.expected_cash_c / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Actual Count:</span>
                  <span>₱{(slipAuditRecord.actual_cash_c / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span>Variance:</span>
                  <span>{slipAuditRecord.cash_difference_c >= 0 ? '+' : ''}₱{(slipAuditRecord.cash_difference_c / 100).toFixed(2)} ({slipAuditRecord.cash_status})</span>
                </div>

                <p className="font-bold border-b border-stone-300 pb-0.5 pt-2">DIGITAL RECONCILIATION</p>
                <div className="flex justify-between">
                  <span>GCash Variance:</span>
                  <span>{slipAuditRecord.gcash_difference_c >= 0 ? '+' : ''}₱{(slipAuditRecord.gcash_difference_c / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maya Variance:</span>
                  <span>{slipAuditRecord.maya_difference_c >= 0 ? '+' : ''}₱{(slipAuditRecord.maya_difference_c / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MariBank Variance:</span>
                  <span>{slipAuditRecord.maribank_difference_c >= 0 ? '+' : ''}₱{(slipAuditRecord.maribank_difference_c / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-stone-300 pt-1">
                  <span>Shift Fees Profit:</span>
                  <span>₱{(slipAuditRecord.total_fees_c / 100).toFixed(2)}</span>
                </div>
              </div>

              {slipAuditRecord.notes && (
                <div className="border-t border-stone-300 pt-1 text-[10px] italic">
                  Notes: {slipAuditRecord.notes}
                </div>
              )}

              <div className="text-center border-t border-stone-300 pt-2 text-[10px] text-stone-500">
                <p>Audited on {formatDateTime(slipAuditRecord.created_at)}</p>
                <p className="mt-2 font-mono">Sign: ____________________</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSlipAuditRecord(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs shadow-glow-emerald flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Audit Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* DELETE CONFIRMATION MODAL                                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-rose-500/30 p-6 shadow-vault space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="h-4 w-4" />
                <span>Confirm Void / Delete</span>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 font-sans">
              Are you sure you want to permanently delete this {itemToDelete.type.toLowerCase()} record? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* CLEAR ALL AUDITS MODAL                                      */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isClearAuditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-obsidian-950 rounded-3xl border border-rose-500/30 p-6 shadow-vault space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="h-4 w-4" />
                <span>Clear All Audit Logs</span>
              </div>
              <button
                type="button"
                onClick={() => setIsClearAuditsModalOpen(false)}
                className="btn-press text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 font-sans">
              Are you sure you want to permanently delete all historical audit logs?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsClearAuditsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-stone-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudits([])
                  setIsClearAuditsModalOpen(false)
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
