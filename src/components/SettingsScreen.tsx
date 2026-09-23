import React, { useState, useRef } from 'react'
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  Store,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Database
} from 'lucide-react'
import type { StoreSettings } from '../types'
import { downloadBackupFile, importTindaBackup } from '../utils/backup'
import { db, initDatabase, DEFAULT_SETTINGS } from '../db'

interface SettingsScreenProps {
  settings: StoreSettings
  onSaveSettings: (s: StoreSettings) => void
  onRefreshAll: () => void
}

export function SettingsScreen({ settings, onSaveSettings, onRefreshAll }: SettingsScreenProps): React.JSX.Element {
  const [form, setForm] = useState<StoreSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const result = await importTindaBackup(text)
      if (result.success) {
        alert('Database successfully restored from backup!')
        onRefreshAll()
      } else {
        alert('Restore failed: ' + result.message)
      }
    } catch (err) {
      alert('Error reading backup file: ' + (err as Error)?.message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleResetData = async () => {
    if (confirm('Sigurado ka ba nga i-clear ang TANANG data? Products, sales, customers, held tickets, ug restocking history ang mawala — walay demo items nga ibalik.')) {
      await db.products.clear()
      await db.categories.clear()
      await db.transactions.clear()
      await db.customers.clear()
      await db.held_carts.clear()
      await db.restock_logs.clear()
      await db.settings.clear()
      await initDatabase()
      onRefreshAll()
      alert('Database cleared! Sugdi ug idugang ang imong kaugalingong mga produkto.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-emerald-400" />
          <span>Store Settings & Universal Backup Archive</span>
        </h2>
        <p className="text-xs text-slate-400">
          I-configure ang impormasyon sa tindahan ug i-manage ang mga backup nga 100% offline.
        </p>
      </div>

      {/* Cloudflare Edge Status Card */}
      <div className="glass-panel rounded-3xl p-5 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-obsidian-900 to-obsidian-850 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Cloudflare Pages Edge Architecture</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                0ms Latency
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client-side IndexedDB with universal cross-device backup parity.
            </p>
          </div>
        </div>
      </div>

      {/* Store Profile Form */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Store className="h-4 w-4 text-emerald-400" />
            <span>Store Profile & Receipt Branding</span>
          </h3>
          {saved && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 animate-fade-in">
              <CheckCircle2 className="h-4 w-4" />
              <span>Saved!</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Name</label>
              <input
                type="text"
                required
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Name</label>
              <input
                type="text"
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Address / Location</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt Footer Message</label>
            <input
              type="text"
              value={form.receipt_footer}
              onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="btn-press px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 font-black text-xs shadow-glow-emerald"
          >
            Save Settings
          </button>
        </form>
      </div>

      {/* Universal Backup Archive */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] p-6 shadow-2xl space-y-4">
        <div className="border-b border-white/[0.08] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-400" />
            <span>Universal .tinda-backup Archive</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            100% interoperable tali sa Android APK ug niining Web version.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Box */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/[0.06] flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Export .tinda-backup</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                I-download ang tibuok database (products, sales, customers, litrato) isip single backup file.
              </p>
            </div>
            <button
              onClick={() => void downloadBackupFile()}
              className="btn-press w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs"
            >
              Download Backup File
            </button>
          </div>

          {/* Import Box */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/[0.06] flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-indigo-400" />
                <span>Restore .tinda-backup</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                I-load ang daan nga backup gikan sa imong Android phone o laing browser.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tinda-backup,.json"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="btn-press w-full py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 font-bold text-xs"
            >
              {importing ? 'Restoring Database...' : 'Select & Restore File'}
            </button>
          </div>
        </div>

        {/* Reset Database */}
        <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center">
          <span className="text-xs text-slate-500">I-clear ang tibuok data sa tindahan (products, sales, customers, held tickets, restocking history).</span>
          <button
            onClick={handleResetData}
            className="btn-press px-3 py-1.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>
    </div>
  )
}
