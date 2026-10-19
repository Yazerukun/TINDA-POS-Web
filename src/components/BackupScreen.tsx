import React, { useState, useEffect, useRef } from 'react'
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
  Sparkles,
  Zap,
  RotateCcw,
  FileText
} from 'lucide-react'
import { db } from '../db'
import { playSuccessSound } from '../lib/sound'
import {
  importTindaBackup,
  downloadBackupFile,
  rollbackRestoreCheckpoint,
  getAutoDetectedBackup,
  loadDtiStarterCatalog,
  type BackupStats
} from '../utils/backup'

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
  const [importStats, setImportStats] = useState<BackupStats | null>(null)
  const [checkpointTime, setCheckpointTime] = useState<string | null>(() =>
    localStorage.getItem('tinda_checkpoint_time')
  )
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Full backup export (Universal format)
  const handleExportBackup = async () => {
    setIsExporting(true)
    setStatusMessage(null)
    try {
      await downloadBackupFile()
      playSuccessSound()
      setStatusType('success')
      setStatusMessage('Full .tinda-backup archive successfully exported and downloaded!')
    } catch (err) {
      console.error('Backup export error:', err)
      setStatusType('error')
      setStatusMessage('An error occurred while exporting the backup file.')
    } finally {
      setIsExporting(false)
    }
  }

  // Core import helper
  const processBackupText = async (text: string) => {
    setIsImporting(true)
    setStatusMessage(null)
    setImportStats(null)

    try {
      const result = await importTindaBackup(text, { targetStoreName: storeName })
      if (result.success) {
        playSuccessSound()
        setStatusType('success')
        setStatusMessage(result.message)
        if (result.stats) {
          setImportStats(result.stats)
        }
        setCheckpointTime(new Date().toISOString())
        loadCounts()
        if (onRefreshAll) onRefreshAll()
      } else {
        setStatusType('error')
        setStatusMessage(result.message)
      }
    } catch (err: any) {
      setStatusType('error')
      setStatusMessage('Error parsing backup: ' + (err?.message || 'Invalid format'))
    } finally {
      setIsImporting(false)
    }
  }

  // 1-Click Auto-Detect & Import
  const handleAutoDetectAndImport = async () => {
    // 1. Check if a local backup snapshot exists in storage
    const detected = getAutoDetectedBackup()
    if (detected.found && detected.data) {
      const confirmAuto = window.confirm(
        `⚡ Auto-Detect found an existing backup snapshot!\n\n• Source: ${detected.source}\n• Saved: ${detected.time}\n${detected.summary ? `• Details: ${detected.summary}\n` : ''}\nWould you like to auto-restore this backup now?\n\n(Click "Cancel" to choose a new backup file from your device instead.)`
      )
      if (confirmAuto) {
        await processBackupText(detected.data)
        return
      }
    }

    // 2. Direct, synchronous trigger of file picker without MIME type or async gesture drops
    fileInputRef.current?.click()
  }

  // 1-Click DTI BNPC Starter Catalog Loader
  const handleLoadDtiCatalog = async () => {
    setIsImporting(true)
    setStatusMessage(null)
    try {
      const result = await loadDtiStarterCatalog(storeName)
      if (result.success) {
        playSuccessSound()
        setStatusType('success')
        setStatusMessage(result.message)
        await loadCounts()
        onRefreshAll?.()
      } else {
        setStatusType('error')
        setStatusMessage(result.message)
      }
    } catch (err: any) {
      setStatusType('error')
      setStatusMessage('Error loading DTI catalog: ' + (err?.message || 'Unknown error'))
    } finally {
      setIsImporting(false)
    }
  }

  // Manual File Selector Change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const confirmRestore = window.confirm(
      'WARNING: Restoring will merge and update records in your local database. Do you wish to proceed?'
    )
    if (!confirmRestore) {
      e.target.value = ''
      return
    }

    try {
      const text = await file.text()
      await processBackupText(text)
    } finally {
      e.target.value = ''
    }
  }

  // Drag and drop handler
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.tinda-backup') && !file.name.endsWith('.json')) {
      alert('Please drop a valid .tinda-backup or .json backup file.')
      return
    }

    const text = await file.text()
    await processBackupText(text)
  }

  // Emergency Rollback handler
  const handleRollback = async () => {
    if (!confirm('Rollback database to the snapshot prior to the last import?')) return
    setIsImporting(true)
    try {
      const result = await rollbackRestoreCheckpoint()
      if (result.success) {
        playSuccessSound()
        setStatusType('success')
        setStatusMessage(result.message)
        loadCounts()
        if (onRefreshAll) onRefreshAll()
      } else {
        setStatusType('error')
        setStatusMessage(result.message)
      }
    } finally {
      setIsImporting(false)
    }
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

      {/* Last Import Stats Summary */}
      {importStats && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-stone-100">
                Import Statistics ({importStats.sourcePlatform || 'Desktop SQLite Archive'}):
              </p>
              <p className="text-[11px] text-emerald-300/90 font-mono mt-0.5">
                {importStats.products} Products · {importStats.transactions} Transactions · {importStats.customers} Customers · {importStats.suppliers} Suppliers · {importStats.expenses} Expenses
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-300 self-start sm:self-auto">
            STATUS: 100% CONVERTED &amp; SAVED
          </span>
        </div>
      )}

      {/* Pre-Restore Rollback Snapshot Alert */}
      {checkpointTime && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-stone-100">
                Emergency Pre-Restore Snapshot Available
              </p>
              <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                Saved: {new Date(checkpointTime).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleRollback}
            disabled={isImporting}
            className="btn-press px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 self-start sm:self-auto shrink-0 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rollback to Pre-Restore State</span>
          </button>
        </div>
      )}

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Database Export & Universal Importer */}
        <div className="p-6 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider font-sans">
              Universal Desktop &amp; Web Backup Archive
            </h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed font-sans">
            100% interoperable with Offline Desktop TINDA POS (Windows/Linux SQLite) and Web database. You can auto-detect local backups or manually select a <code className="text-amber-300 font-mono text-[11px]">.tinda-backup</code> or <code className="text-amber-300 font-mono text-[11px]">.json</code> file.
          </p>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDraggingOver(true)
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer ${
              isDraggingOver
                ? 'border-emerald-500 bg-emerald-500/10 shadow-glow-emerald scale-[1.01]'
                : 'border-white/[0.1] hover:border-emerald-500/40 bg-obsidian-950/40'
            }`}
            onClick={handleAutoDetectAndImport}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-stone-400" />
            <p className="text-xs font-bold text-stone-200">
              Drag &amp; drop your backup file here
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Supports both <span className="text-amber-400 font-mono">.tinda-backup</span> and <span className="text-emerald-400 font-mono">.json</span> archives
            </p>
          </div>

          <div className="pt-2 space-y-3">
            {/* 1-Click Auto-Detect Button */}
            <button
              onClick={handleAutoDetectAndImport}
              disabled={isImporting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-glow-amber active:scale-[0.98]"
            >
              {isImporting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-obsidian-950" />
              ) : (
                <Zap className="w-4 h-4 text-obsidian-950 fill-obsidian-950" />
              )}
              <span>⚡ Auto-Detect &amp; 1-Click Import Backup</span>
            </button>

            {/* 1-Click Official DTI BNPC Starter Pack */}
            <button
              onClick={handleLoadDtiCatalog}
              disabled={isImporting}
              className="w-full py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>⚡ Load Official DTI BNPC Catalog (67 Items)</span>
            </button>

            {/* Manual File Selector */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".tinda-backup,.json,.csv"
              onChange={handleFileChange}
              disabled={isImporting}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full py-3 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-slate-700 text-stone-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4 text-stone-400" />
              <span>Manual File Picker (.tinda-backup / .json / .csv)</span>
            </button>

            {/* Export Backup File */}
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full py-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Universal .tinda-backup File</span>
            </button>
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
