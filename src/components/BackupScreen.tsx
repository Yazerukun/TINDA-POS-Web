import React, { useState, useEffect } from 'react'
import {
  HardDriveDownload,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Database,
  RefreshCw,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react'
import { db } from '../db'
import { playSuccessSound } from '../lib/sound'

interface BackupScreenProps {
  onRefreshAll?: () => void
  storeName?: string
}

export function BackupScreen({
  onRefreshAll,
  storeName = 'TINDA Retail Station'
}: BackupScreenProps): React.JSX.Element {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null)

  // DB Table Counts
  const [counts, setCounts] = useState<{
    products: number
    transactions: number
    customers: number
    expenses: number
  }>({ products: 0, transactions: 0, customers: 0, expenses: 0 })

  const loadCounts = async () => {
    try {
      const [p, t, c, e] = await Promise.all([
        db.products.count(),
        db.transactions.count(),
        db.customers.count(),
        db.expenses.count()
      ])
      setCounts({ products: p, transactions: t, customers: c, expenses: e })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadCounts()
  }, [])

  // Full JSON export
  const handleExportJson = async () => {
    setIsExporting(true)
    setStatusMessage(null)
    try {
      const [products, categories, transactions, customers, expenses, suppliers, settings] =
        await Promise.all([
          db.products.toArray(),
          db.categories.toArray(),
          db.transactions.toArray(),
          db.customers.toArray(),
          db.expenses.toArray(),
          db.suppliers.toArray(),
          db.settings.toArray()
        ])

      const backupData = {
        version: 1,
        system: 'TINDA-POS-WEB',
        exported_at: new Date().toISOString(),
        store_name: storeName,
        data: {
          products,
          categories,
          transactions,
          customers,
          expenses,
          suppliers,
          settings
        }
      }

      const jsonStr = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `tinda-pos-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      playSuccessSound()
      setStatusType('success')
      setStatusMessage('Matagumpay na na-download ang kumpletong JSON backup file!')
    } catch (err) {
      console.error('Backup export error:', err)
      setStatusType('error')
      setStatusMessage('Nagka-aberya sa pag-export ng backup file.')
    } finally {
      setIsExporting(false)
    }
  }

  // Restore JSON import
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const confirmRestore = window.confirm(
      'BABALA: Ang pag-restore ay magsasama at mag-a-update ng mga records sa iyong database. Nais mo bang magpatuloy?'
    )
    if (!confirmRestore) return

    setIsImporting(true)
    setStatusMessage(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content)

        if (!parsed.data) {
          throw new Error('Hindi wastong format ng TINDA POS backup.')
        }

        const { products, categories, transactions, customers, expenses, suppliers } = parsed.data

        if (Array.isArray(products) && products.length > 0) {
          await db.products.bulkPut(products)
        }
        if (Array.isArray(categories) && categories.length > 0) {
          await db.categories.bulkPut(categories)
        }
        if (Array.isArray(transactions) && transactions.length > 0) {
          await db.transactions.bulkPut(transactions)
        }
        if (Array.isArray(customers) && customers.length > 0) {
          await db.customers.bulkPut(customers)
        }
        if (Array.isArray(expenses) && expenses.length > 0) {
          await db.expenses.bulkPut(expenses)
        }
        if (Array.isArray(suppliers) && suppliers.length > 0) {
          await db.suppliers.bulkPut(suppliers)
        }

        playSuccessSound()
        setStatusType('success')
        setStatusMessage('Matagumpay na na-restore ang database mula sa backup file!')
        loadCounts()
        if (onRefreshAll) onRefreshAll()
      } catch (err) {
        console.error('Restore error:', err)
        setStatusType('error')
        setStatusMessage('Maling format o sira ang napiling backup file.')
      } finally {
        setIsImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  // CSV Export for Excel
  const handleExportCsv = async (tableName: 'products' | 'transactions') => {
    try {
      if (tableName === 'products') {
        const items = await db.products.toArray()
        let csv = 'ID,Name,Barcode,Cost,Price,Stock\n'
        items.forEach((p) => {
          csv += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.barcode || ''}",${p.cost_c / 100},${p.default_price_c / 100},${p.stock}\n`
        })
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tinda-inventory-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const txs = await db.transactions.toArray()
        let csv = 'Invoice,Date,Total,PaymentMethod,Cashier\n'
        txs.forEach((t) => {
          csv += `"${t.invoice_number}","${t.created_at}",${t.total_c / 100},"${t.payment_method}","${t.cashier_name}"\n`
        })
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tinda-sales-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      playSuccessSound()
    } catch {
      alert('Nagka-problema sa pagbuo ng CSV file.')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-obsidian-950 p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HardDriveDownload className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-wide">
              Data &amp; Backup Hub
            </h1>
            <p className="text-xs text-stone-400">
              Complete local Dexie database export, disaster recovery JSON restore, and Excel CSV exports
            </p>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            statusType === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <p className="text-xs font-semibold">{statusMessage}</p>
        </div>
      )}

      {/* Database Snapshot Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
          <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">Products</p>
          <p className="text-2xl font-mono font-bold text-stone-100 mt-1">{counts.products}</p>
        </div>
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
          <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">Transactions</p>
          <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">{counts.transactions}</p>
        </div>
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
          <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">Customers</p>
          <p className="text-2xl font-mono font-bold text-sky-400 mt-1">{counts.customers}</p>
        </div>
        <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
          <p className="text-[0.6875rem] font-bold text-stone-500 uppercase tracking-wider">Expenses</p>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{counts.expenses}</p>
        </div>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Database Export & Import */}
        <div className="p-6 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider font-sans">
              Full System Backup &amp; Restore
            </h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed font-sans">
            I-download ang buong kopya ng inyong imbentaryo, benta, resibo, at suki profiles bilang isang protektadong JSON file. Ligtas itong itago sa inyong USB flash drive o Google Drive.
          </p>

          <div className="pt-2 space-y-3">
            <button
              onClick={handleExportJson}
              disabled={isExporting}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-glow-emerald active:scale-[0.98]"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Full JSON Backup</span>
            </button>

            <label className="w-full py-3.5 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-700 text-stone-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-stone-400" />
              <span>Restore Database from File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Excel / CSV Exports */}
        <div className="p-6 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider font-sans">
              Spreadsheet Export (CSV / Excel)
            </h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed font-sans">
            I-export ang inyong data sa format na mabubuksan sa Microsoft Excel o Google Sheets para sa sariling accounting o buwanang auditing.
          </p>

          <div className="pt-2 space-y-3">
            <button
              onClick={() => handleExportCsv('products')}
              className="w-full py-3.5 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-700 text-sky-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Products to Excel (CSV)</span>
            </button>

            <button
              onClick={() => handleExportCsv('transactions')}
              className="w-full py-3.5 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-700 text-sky-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Sales &amp; Receipts to Excel (CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
