import React, { useState, useEffect, useMemo } from 'react'
import {
  Landmark,
  Zap,
  Smartphone,
  Droplet,
  Tv,
  CreditCard,
  Printer,
  History,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Receipt
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { playSuccessSound } from '../lib/sound'

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
  sourceWallet: 'GCASH' | 'MAYA' | 'SHOPEEPAY' | 'CASH'
  status: 'COMPLETED'
  createdAt: string
  referenceNo: string
  storeName?: string
}

const BILLER_PRESETS = [
  { name: 'Meralco', category: 'UTILITIES', defaultFee: 15, icon: '⚡' },
  { name: 'Electric Cooperative', category: 'UTILITIES', defaultFee: 15, icon: '⚡' },
  { name: 'VECO / Visayan Electric', category: 'UTILITIES', defaultFee: 15, icon: '⚡' },
  { name: 'Maynilad / Manila Water', category: 'WATER', defaultFee: 15, icon: '💧' },
  { name: 'Local Water District', category: 'WATER', defaultFee: 15, icon: '💧' },
  { name: 'Home Credit', category: 'LOANS', defaultFee: 20, icon: '💳' },
  { name: 'Cashalo / Tala', category: 'LOANS', defaultFee: 20, icon: '💳' },
  { name: 'ShopeePay / SPayLater', category: 'LOANS', defaultFee: 15, icon: '🛍️' },
  { name: 'Globe / TM Regular & Promo', category: 'TELCO', defaultFee: 5, icon: '📶' },
  { name: 'Smart / TNT Regular & Promo', category: 'TELCO', defaultFee: 5, icon: '📶' },
  { name: 'DITO Telecommunity', category: 'TELCO', defaultFee: 5, icon: '📶' },
  { name: 'Converge ICT', category: 'INTERNET', defaultFee: 20, icon: '🌐' },
  { name: 'PLDT Home / Smart Bro', category: 'INTERNET', defaultFee: 20, icon: '🌐' }
]

const STORAGE_KEY = 'tinda_bills_load_records'

interface EwalletScreenProps {
  currentCashierName?: string
  storeName?: string
}

export function EwalletScreen({
  currentCashierName = 'Cashier',
  storeName = 'TINDA Retail Station'
}: EwalletScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'register' | 'history'>('register')

  // Form state
  const [selectedBiller, setSelectedBiller] = useState(BILLER_PRESETS[0]!.name)
  const [customBiller, setCustomBiller] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [serviceFeeStr, setServiceFeeStr] = useState('15')
  const [feeMode, setFeeMode] = useState<'ADD' | 'DEDUCT'>('ADD')
  const [sourceWallet, setSourceWallet] = useState<'GCASH' | 'MAYA' | 'SHOPEEPAY' | 'CASH'>('GCASH')
  const [referenceNo, setReferenceNo] = useState('')

  // Records state
  const [records, setRecords] = useState<BillTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [receiptTx, setReceiptTx] = useState<BillTransaction | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch {
      // ignore
    }
  }, [records])

  const currentPreset = BILLER_PRESETS.find((p) => p.name === selectedBiller)

  const handleSelectBiller = (billerName: string) => {
    setSelectedBiller(billerName)
    const preset = BILLER_PRESETS.find((p) => p.name === billerName)
    if (preset) {
      setServiceFeeStr(String(preset.defaultFee))
    }
  }

  const handleProcessTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(amountStr)
    const fee = parseFloat(serviceFeeStr) || 0

    if (isNaN(amount) || amount <= 0) {
      alert('Pakilagay ang wastong halaga ng bayarin.')
      return
    }
    if (!accountNo.trim()) {
      alert('Pakilagay ang Account Number o Biller Reference Number.')
      return
    }

    const effectiveBiller = selectedBiller === 'CUSTOM' ? customBiller.trim() || 'Custom Biller' : selectedBiller
    const matchedCategory = BILLER_PRESETS.find((p) => p.name === selectedBiller)?.category || 'UTILITIES'

    const newRecord: BillTransaction = {
      id: `BILL-${Date.now()}`,
      category: matchedCategory as any,
      biller: effectiveBiller,
      accountNo: accountNo.trim(),
      customerName: customerName.trim() || 'Walk-in Suki',
      customerPhone: customerPhone.trim() || undefined,
      amount,
      serviceFee: fee,
      feeMode,
      sourceWallet,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      referenceNo: referenceNo.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      storeName
    }

    setRecords([newRecord, ...records])
    setReceiptTx(newRecord)
    playSuccessSound()

    // Reset fields
    setAccountNo('')
    setCustomerName('')
    setCustomerPhone('')
    setAmountStr('')
    setReferenceNo('')
  }

  // Analytics summary
  const totalProcessedAmount = useMemo(() => {
    return records.reduce((sum, r) => sum + r.amount, 0)
  }, [records])

  const totalFeesEarned = useMemo(() => {
    return records.reduce((sum, r) => sum + r.serviceFee, 0)
  }, [records])

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records
    const q = searchQuery.toLowerCase()
    return records.filter(
      (r) =>
        r.biller.toLowerCase().includes(q) ||
        r.accountNo.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.referenceNo.toLowerCase().includes(q)
    )
  }, [records, searchQuery])

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-obsidian-950 p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-wide">
                E-Wallet &amp; Bills Hub
              </h1>
              <p className="text-xs text-stone-400">
                Philippine utility bills, prepaid load, cash-in/out, and bayad center services
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-obsidian-900 border border-slate-800 rounded-2xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Process Bill / Load
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-obsidian-950 shadow-glow-emerald'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({records.length})</span>
          </button>
        </div>
      </div>

      {/* Financial Pulse Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
              Total Bills Processed
            </p>
            <p className="text-xl font-mono font-bold text-stone-100 mt-1">
              {formatCurrency(Math.round(totalProcessedAmount * 100))}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
              Service Fees Earned
            </p>
            <p className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {formatCurrency(Math.round(totalFeesEarned * 100))}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">
              Transactions Completed
            </p>
            <p className="text-xl font-mono font-bold text-stone-200 mt-1">
              {records.length} Transactions
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {activeTab === 'register' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Biller Selection Bento (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-sans">
                Select Biller or Service Provider
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BILLER_PRESETS.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => handleSelectBiller(b.name)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedBiller === b.name
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                        : 'bg-obsidian-850 border-slate-800/80 text-stone-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">{b.icon}</span>
                      <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-stone-400">
                        +₱{b.defaultFee}
                      </span>
                    </div>
                    <p className="text-xs font-semibold truncate leading-tight">{b.name}</p>
                    <p className="text-[0.625rem] text-stone-500 uppercase tracking-wider mt-0.5">
                      {b.category}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Transaction Details Form (5 Cols) */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleProcessTransaction}
              className="p-6 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Payment Details
                </span>
                <span className="text-xs font-mono font-bold text-stone-300">
                  {selectedBiller}
                </span>
              </div>

              <div>
                <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  Account Number / Reference No. *
                </label>
                <input
                  type="text"
                  required
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  placeholder="e.g. 10-digit Meralco ATM ref"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-emerald-500 text-stone-100 font-mono text-sm outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Suki"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-emerald-500 text-stone-100 text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0917-xxx-xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-emerald-500 text-stone-100 text-sm outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Bill Amount (₱) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-emerald-500 text-emerald-400 font-mono text-base font-bold outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Convenience Fee (₱)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={serviceFeeStr}
                    onChange={(e) => setServiceFeeStr(e.target.value)}
                    placeholder="15"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 focus:border-emerald-500 text-stone-200 font-mono text-base font-bold outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={sourceWallet}
                    onChange={(e) => setSourceWallet(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-200 text-xs font-semibold outline-none"
                  >
                    <option value="GCASH">GCash</option>
                    <option value="MAYA">Maya</option>
                    <option value="SHOPEEPAY">ShopeePay</option>
                    <option value="CASH">Cash Over Counter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Fee Arrangement
                  </label>
                  <select
                    value={feeMode}
                    onChange={(e) => setFeeMode(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-stone-200 text-xs font-semibold outline-none"
                  >
                    <option value="ADD">Add fee to total collected</option>
                    <option value="DEDUCT">Fee already included</option>
                  </select>
                </div>
              </div>

              {/* Total Calculation Card */}
              {amountStr && !isNaN(parseFloat(amountStr)) && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Total Suki Collectible:
                  </span>
                  <span className="font-mono text-lg font-bold text-emerald-400">
                    {formatCurrency(
                      Math.round(
                        (feeMode === 'ADD'
                          ? parseFloat(amountStr) + (parseFloat(serviceFeeStr) || 0)
                          : parseFloat(amountStr)) * 100
                      )
                    )}
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-sm tracking-wider uppercase transition-all shadow-glow-emerald active:scale-[0.98]"
              >
                Confirm &amp; Record Bill Payment
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by biller, account, customer, or ref..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-200 text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-obsidian-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-obsidian-950/80 border-b border-slate-800 uppercase text-[0.625rem] tracking-wider text-stone-400 font-mono">
                  <tr>
                    <th className="px-4 py-3">Date &amp; Time</th>
                    <th className="px-4 py-3">Biller</th>
                    <th className="px-4 py-3">Account No</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Bill Amount</th>
                    <th className="px-4 py-3 text-right">Fee</th>
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">Ref No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-stone-400 text-[0.6875rem]">
                          {new Date(r.createdAt).toLocaleString('en-PH', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="px-4 py-3 font-sans font-bold text-stone-200">{r.biller}</td>
                        <td className="px-4 py-3 text-stone-300">{r.accountNo}</td>
                        <td className="px-4 py-3 font-sans text-stone-300">{r.customerName}</td>
                        <td className="px-4 py-3 text-right font-bold text-stone-100">
                          {formatCurrency(Math.round(r.amount * 100))}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                          +{formatCurrency(Math.round(r.serviceFee * 100))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[0.625rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            {r.sourceWallet}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-400 text-[0.6875rem]">{r.referenceNo}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-stone-500 font-sans">
                        Walang nakitang bill transactions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
