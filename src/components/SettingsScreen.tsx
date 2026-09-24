import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  Store,
  CheckCircle2,
  Globe,
  Database,
  UserPlus,
  Users,
  Shield,
  Trash2,
  Lock,
  Key,
  Check,
  X,
  UserCheck,
  UserX
} from 'lucide-react'
import type { StoreSettings, UserAccount, UserRole } from '../types'
import { downloadBackupFile, importTindaBackup } from '../utils/backup'
import { db, initDatabase } from '../db'

interface SettingsScreenProps {
  settings: StoreSettings
  onSaveSettings: (s: StoreSettings) => void
  onRefreshAll: () => void
  isAdmin?: boolean
  currentCashierName?: string
}

export function SettingsScreen({
  settings,
  onSaveSettings,
  onRefreshAll,
  isAdmin = true,
  currentCashierName
}: SettingsScreenProps): React.JSX.Element {
  const [form, setForm] = useState<StoreSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Staff accounts state
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [editingPinUserId, setEditingPinUserId] = useState<number | null>(null)
  const [newPinValue, setNewPinValue] = useState('')

  // New user form state
  const [newFullName, setNewFullName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newUserRole, setNewUserRole] = useState<UserRole>('CASHIER')
  const [newUserPin, setNewUserPin] = useState('')
  const [userFormError, setUserFormError] = useState('')
  const [userSuccessMessage, setUserSuccessMessage] = useState('')

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await db.users.toArray()
      setUsers(allUsers)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

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
        loadUsers()
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
    if (confirm('Are you sure you want to clear ALL data? Products, sales, customers, held tickets, and restock history will be permanently deleted.')) {
      await db.products.clear()
      await db.categories.clear()
      await db.transactions.clear()
      await db.customers.clear()
      await db.held_carts.clear()
      await db.restock_logs.clear()
      await db.settings.clear()
      await db.users.clear()
      await initDatabase()
      onRefreshAll()
      loadUsers()
      alert('Database cleared! You can now start adding your own products and staff accounts.')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserFormError('')

    const trimmedUser = newUsername.trim().toLowerCase()
    const trimmedName = newFullName.trim()
    const trimmedPin = newUserPin.trim()

    if (!trimmedName || !trimmedUser || !trimmedPin) {
      setUserFormError('Please fill in all required fields.')
      return
    }

    if (trimmedPin.length < 4) {
      setUserFormError('PIN must be at least 4 numeric digits.')
      return
    }

    // Check if username already exists
    const existing = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
    if (existing) {
      setUserFormError('This username is already taken. Please choose another.')
      return
    }

    try {
      await db.users.add({
        name: trimmedName,
        username: trimmedUser,
        role: newUserRole,
        pin: trimmedPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      })

      setUserSuccessMessage(`User "${trimmedName}" successfully created!`)
      setTimeout(() => setUserSuccessMessage(''), 3000)

      // Reset form
      setNewFullName('')
      setNewUsername('')
      setNewUserRole('CASHIER')
      setNewUserPin('')
      setShowAddUserModal(false)
      await loadUsers()
    } catch (err) {
      console.error('Failed to create user:', err)
      setUserFormError('Failed to save user to database.')
    }
  }

  const handleToggleUserStatus = async (user: UserAccount) => {
    if (!user.id) return
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'

    // Prevent disabling the current user or the only admin
    if (user.role === 'ADMIN' && newStatus === 'DISABLED') {
      const adminCount = users.filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE').length
      if (adminCount <= 1) {
        alert('Cannot disable the only active Master Admin account.')
        return
      }
    }

    await db.users.update(user.id, { status: newStatus })
    await loadUsers()
  }

  const handleUpdatePin = async (userId: number) => {
    if (!newPinValue || newPinValue.length < 4) {
      alert('PIN must be at least 4 digits.')
      return
    }
    await db.users.update(userId, { pin: newPinValue })
    setEditingPinUserId(null)
    setNewPinValue('')
    await loadUsers()
  }

  const handleDeleteUser = async (user: UserAccount) => {
    if (!user.id) return
    if (user.role === 'ADMIN') {
      const adminCount = users.filter((u) => u.role === 'ADMIN').length
      if (adminCount <= 1) {
        alert('Cannot delete the only Master Admin account.')
        return
      }
    }

    if (confirm(`Are you sure you want to permanently delete user "${user.name}" (@${user.username})?`)) {
      await db.users.delete(user.id)
      await loadUsers()
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-emerald-400" />
          <span>Store Settings &amp; Administration</span>
        </h2>
        <p className="text-xs text-slate-400">
          Configure store profile, manage staff accounts, and download offline backup archives.
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

      {/* ── STAFF & CASHIER ACCOUNTS (Master Admin Section) ── */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-4 gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400" />
              <span>Staff &amp; Cashier Accounts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Only Master Admin can create and manage staff accounts. Account names are hidden on the login screen for security.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddUserModal(true)}
              className="btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition-all self-start sm:self-auto shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Staff / Cashier</span>
            </button>
          )}
        </div>

        {userSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span>{userSuccessMessage}</span>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-2.5">
          {loadingUsers ? (
            <p className="text-xs text-slate-400 font-mono py-4 text-center">Loading accounts...</p>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">
              No users found. Using default Master Admin account.
            </div>
          ) : (
            users.map((u) => {
              const isMaster = u.role === 'ADMIN'
              const isEditingThisPin = editingPinUserId === u.id

              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    u.status === 'ACTIVE'
                      ? 'bg-zinc-950/60 border-white/[0.08]'
                      : 'bg-zinc-950/30 border-red-500/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-serif font-bold text-xs shrink-0 ${
                      isMaster
                        ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-glow-gold'
                        : 'bg-zinc-900 border border-white/10 text-stone-200'
                    }`}>
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-semibold text-white">{u.name}</p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-stone-400">
                          @{u.username}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isMaster
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : u.role === 'INVENTORY_LEAD'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {u.role === 'ADMIN' ? 'Master Admin' : u.role === 'INVENTORY_LEAD' ? 'Inventory Lead' : 'Cashier'}
                        </span>
                        {u.status === 'DISABLED' && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 uppercase">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Created: {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Admin Only) */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {/* Change PIN toggle */}
                      {isEditingThisPin ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <input
                            type="password"
                            maxLength={6}
                            placeholder="New PIN"
                            value={newPinValue}
                            onChange={(e) => setNewPinValue(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-20 px-2 py-1 rounded-lg bg-zinc-900 border border-gold/50 text-xs font-mono text-gold-light focus:outline-none"
                          />
                          <button
                            onClick={() => u.id && handleUpdatePin(u.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            title="Save PIN"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPinUserId(null)
                              setNewPinValue('')
                            }}
                            className="p-1.5 rounded-lg bg-white/10 text-stone-400 hover:bg-white/20"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPinUserId(u.id ?? null)
                            setNewPinValue('')
                          }}
                          className="btn-press px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-stone-300 hover:text-white text-xs flex items-center gap-1"
                          title="Change PIN"
                        >
                          <Key className="h-3 w-3 text-gold-muted" />
                          <span className="text-[11px]">PIN</span>
                        </button>
                      )}

                      {/* Toggle status */}
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`btn-press p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                          u.status === 'ACTIVE'
                            ? 'bg-zinc-900/60 border-white/10 text-stone-400 hover:text-stone-200'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}
                        title={u.status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
                      >
                        {u.status === 'ACTIVE' ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </button>

                      {/* Delete user */}
                      {(!isMaster || users.filter((x) => x.role === 'ADMIN').length > 1) && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="btn-press p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                          title="Delete User"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── ADD USER MODAL ── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-gold/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Staff Account</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Master Admin provisioning</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddUserModal(false)
                  setUserFormError('')
                }}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {userFormError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl font-medium">
                {userFormError}
              </p>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Clara"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username / ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    placeholder="e.g. maria"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security PIN (4-6 digits) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-mono text-gold-light focus:outline-none focus:border-amber-400 tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Staff Role &amp; Access Level
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950/80 border border-white/[0.08] text-xs font-medium text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="CASHIER">Cashier (POS Counter &amp; Sales)</option>
                  <option value="INVENTORY_LEAD">Inventory Lead (POS Counter + Inventory Management)</option>
                  <option value="ADMIN">Master Admin (Full Access + Staff Management)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-stone-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-glow-gold"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Profile Form */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Store className="h-4 w-4 text-emerald-400" />
            <span>Store Profile &amp; Receipt Branding</span>
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
            100% interoperable between Android APK and this Web version.
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
                Download the complete store database (products, sales, customers, photos) as a single offline backup file.
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
                Load an existing backup file from your Android phone or another browser.
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
          <span className="text-xs text-slate-500">Clear entire store database (products, sales, customers, held tickets, restocking history).</span>
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
