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
  UserX,
  Camera,
  Crown,
  User,
  Printer,
  QrCode,
  FileText,
  Palette,
  Sparkles,
  RotateCcw,
  Zap,
  CreditCard,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import type { StoreSettings, UserAccount, UserRole } from '../types'
import { downloadBackupFile, importTindaBackup, rollbackRestoreCheckpoint } from '../utils/backup'
import { compressImageFile } from '../utils/image'
import { db, initDatabase } from '../db'
import { Receipt } from './Receipt'
import { THEMES, getActiveTheme, applyTheme, type ThemeId } from '../utils/theme'
import { getDeviceMachineId } from '../utils/security'
import { testPayMongoConnection } from '../utils/paymongo'
import { syncUserToCloud } from '../services/cloudSync'
import { canAddStaffAccount, isVipActive, FREE_TIER_LIMITS } from '../utils/vip'

interface SettingsScreenProps {
  settings: StoreSettings
  onSaveSettings: (s: StoreSettings) => void
  onRefreshAll: () => void
  isAdmin?: boolean
  currentCashierName?: string
  currentCashierRole?: string
  currentSessionStoreName?: string
  isMasterAdmin?: boolean
  currentUserId?: number
  currentUsername?: string
  currentUserAvatar?: string
  onUpdateAvatar?: (avatarUrl?: string) => void
  onOpenVipUpgrade?: () => void
}

export type SettingsTab = 'profile' | 'printer' | 'payments' | 'staff' | 'themes' | 'backup'

export function SettingsScreen({
  settings,
  onSaveSettings,
  onRefreshAll,
  isAdmin = true,
  currentCashierName,
  currentCashierRole,
  currentSessionStoreName,
  isMasterAdmin = false,
  currentUserId,
  currentUsername,
  currentUserAvatar,
  onUpdateAvatar,
  onOpenVipUpgrade
}: SettingsScreenProps): React.JSX.Element {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const [form, setForm] = useState<StoreSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showTestPrintModal, setShowTestPrintModal] = useState(false)
  const [testPaperWidth, setTestPaperWidth] = useState<'58mm' | '80mm' | 'A4'>(
    settings.printer_paper_width || '80mm'
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Current User Account state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [isUploadingCurrentAvatar, setIsUploadingCurrentAvatar] = useState(false)
  const myFileInputRef = useRef<HTMLInputElement>(null)

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
  const [newUserAvatar, setNewUserAvatar] = useState<string | undefined>(undefined)
  const [userFormError, setUserFormError] = useState('')
  const [userSuccessMessage, setUserSuccessMessage] = useState('')
  const newUserAvatarInputRef = useRef<HTMLInputElement>(null)

  // PayMongo Gateway & Real-Time E-Wallet state
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [isTestingPayMongo, setIsTestingPayMongo] = useState(false)
  const [payMongoTestResult, setPayMongoTestResult] = useState<{
    ok: boolean
    message: string
    livemode?: boolean
  } | null>(null)
  const qrImageInputRef = useRef<HTMLInputElement>(null)

  const handleTestPayMongo = async () => {
    if (!form.paymongo_secret_key) return
    setIsTestingPayMongo(true)
    setPayMongoTestResult(null)
    try {
      const res = await testPayMongoConnection(form.paymongo_secret_key)
      setPayMongoTestResult({ ok: res.ok, message: res.message, livemode: res.livemode })
    } catch (err: any) {
      setPayMongoTestResult({ ok: false, message: err?.message || 'Connection test failed' })
    } finally {
      setIsTestingPayMongo(false)
    }
  }

  const handleUploadCustomQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, 800, 800, 0.85)
      setForm((prev) => ({ ...prev, store_qr_image_url: compressed }))
    } catch {
      alert('Failed to process image file.')
    }
  }

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await db.users.toArray()

      // Show staff: If Master Admin is in global mode (not masquerading), show all accounts; otherwise isolate to active store
      const targetStore = currentSessionStoreName || (isMasterAdmin ? null : settings.store_name)
      let storeUsers = targetStore
        ? allUsers.filter(u => !u.store_name || u.store_name === targetStore || u.role === 'ADMIN')
        : allUsers

      // Fallback: If store filter resulted in empty array, but accounts exist, show all accounts so none are accidentally hidden
      if (storeUsers.length === 0 && allUsers.length > 0) {
        storeUsers = allUsers
      }
      setUsers(storeUsers)

      // Identify currently logged in user
      if (currentUserId) {
        const found = allUsers.find(u => u.id === currentUserId)
        if (found) setCurrentUser(found)
      } else if (currentUsername) {
        const found = allUsers.find(u => u.username.toLowerCase() === currentUsername.toLowerCase())
        if (found) setCurrentUser(found)
      } else if (currentCashierName) {
        const found = allUsers.find(u => u.name.toLowerCase() === currentCashierName.toLowerCase())
        if (found) setCurrentUser(found)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }, [isMasterAdmin, currentSessionStoreName, currentUserId, currentUsername, currentCashierName, settings.store_name])

  // Theme Engine state
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(() => {
    return (form.theme as ThemeId) || getActiveTheme()
  })

  // Machine ID & VIP licensing state
  const [machineId, setMachineId] = useState('')
  const [vipInfo, setVipInfo] = useState<{ active: boolean; registeredTo?: string } | null>(null)
  const [checkpointTime, setCheckpointTime] = useState<string | null>(null)

  useEffect(() => {
    getDeviceMachineId().then(setMachineId)
    const savedVip = localStorage.getItem('tinda_vip_license')
    if (savedVip) {
      try {
        setVipInfo(JSON.parse(savedVip))
      } catch {}
    }
    const cpTime = localStorage.getItem('tinda_checkpoint_time')
    if (cpTime) setCheckpointTime(cpTime)
  }, [])

  const handleSelectTheme = (tId: ThemeId) => {
    setActiveThemeId(tId)
    applyTheme(tId)
    setForm(prev => ({ ...prev, theme: tId }))
    const targetTheme = THEMES.find(t => t.id === tId)
    setUserSuccessMessage(`Applied theme: ${targetTheme?.name || tId}`)
    setTimeout(() => setUserSuccessMessage(''), 3000)
  }

  const handleRollbackCheckpoint = async () => {
    if (!confirm('Restore database to the state prior to the most recent import checkpoint?')) return
    setImporting(true)
    try {
      const result = await rollbackRestoreCheckpoint()
      if (result.success) {
        alert('Database rollback snapshot successfully restored!')
        onRefreshAll()
        loadUsers()
      } else {
        alert('Rollback failed: ' + result.message)
      }
    } finally {
      setImporting(false)
    }
  }

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    onSaveSettings({ ...form, theme: activeThemeId })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleAutoDetectAndImport = async () => {
    if (typeof (window as any).showOpenFilePicker === 'function') {
      try {
        setImporting(true)
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'TINDA POS Backup Archives (*.tinda-backup, *.json)',
              accept: {
                'application/json': ['.json', '.tinda-backup'],
                'application/octet-stream': ['.tinda-backup']
              }
            }
          ],
          multiple: false
        })
        const file = await handle.getFile()
        const text = await file.text()
        const targetStore = currentSessionStoreName || form.store_name || settings.store_name
        const result = await importTindaBackup(text, { targetStoreName: targetStore })
        if (result.success) {
          alert(result.message)
          const nowIso = new Date().toISOString()
          setCheckpointTime(nowIso)
          onRefreshAll()
          loadUsers()
        } else {
          alert('Restore failed: ' + result.message)
        }
        return
      } catch (err: any) {
        setImporting(false)
        if (err.name === 'AbortError') return
      } finally {
        setImporting(false)
      }
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const targetStore = currentSessionStoreName || form.store_name || settings.store_name
      const result = await importTindaBackup(text, { targetStoreName: targetStore })
      if (result.success) {
        alert(result.message)
        const nowIso = new Date().toISOString()
        setCheckpointTime(nowIso)
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
    if (
      confirm(
        'DANGER: Are you sure you want to clear all data? This deletes all products, sales history, customer debt records, and restock logs! This cannot be undone unless you have a backup.'
      )
    ) {
      if (confirm('Final confirmation: Reset entire local database?')) {
        await Promise.all([
          db.products.clear(),
          db.categories.clear(),
          db.transactions.clear(),
          db.customers.clear(),
          db.held_carts.clear(),
          db.restock_logs.clear(),
          db.expenses.clear(),
          db.expense_categories.clear(),
          db.suppliers.clear(),
          db.cash_counts.clear(),
          db.z_reads.clear(),
          db.settings.clear()
        ])
        await initDatabase()
        onRefreshAll()
        alert('Database has been completely reset.')
      }
    }
  }

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

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

    const existing = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
    if (existing) {
      setUserFormError('This username is already taken. Please choose another.')
      return
    }

    if (!canAddStaffAccount(users.length)) {
      setUserFormError(
        `Free Community Edition is limited to ${FREE_TIER_LIMITS.MAX_STAFF_ACCOUNTS} staff account. Upgrade to VIP Pro Lifetime for unlimited staff PINs!`
      )
      return
    }

    try {
      const newStaffAccount: UserAccount = {
        name: trimmedName,
        username: trimmedUser,
        role: newUserRole,
        pin: trimmedPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        store_name: currentSessionStoreName || settings.store_name,
        owner_username: currentCashierName,
        is_owner: false,
        avatar_url: newUserAvatar
      }

      const insertedId = await db.users.add(newStaffAccount)
      newStaffAccount.id = insertedId as number

      syncUserToCloud(newStaffAccount).catch(() => {})

      setUserSuccessMessage(`User "${trimmedName}" successfully created!`)
      setTimeout(() => setUserSuccessMessage(''), 3000)

      setNewFullName('')
      setNewUsername('')
      setNewUserRole('CASHIER')
      setNewUserPin('')
      setNewUserAvatar(undefined)
      setShowAddUserModal(false)
      await loadUsers()
    } catch (err) {
      console.error('Failed to create user:', err)
      setUserFormError('Failed to save user to database.')
    }
  }

  const handleUploadMyAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      return
    }

    setIsUploadingCurrentAvatar(true)
    try {
      const dataUrl = await compressImageFile(file, 320, 320, 0.85)

      if (currentUser?.id) {
        await db.users.update(currentUser.id, { avatar_url: dataUrl })
        const u = await db.users.get(currentUser.id)
        if (u) syncUserToCloud(u).catch(() => {})
      } else if (currentUsername) {
        const existing = await db.users.where('username').equalsIgnoreCase(currentUsername).first()
        if (existing?.id) {
          await db.users.update(existing.id, { avatar_url: dataUrl })
          syncUserToCloud({ ...existing, avatar_url: dataUrl }).catch(() => {})
        } else {
          const newAcc: UserAccount = {
            username: currentUsername,
            name: currentCashierName || 'Staff Member',
            role: isMasterAdmin ? 'ADMIN' : 'CASHIER',
            pin: '1234',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            avatar_url: dataUrl,
            store_name: currentSessionStoreName || settings.store_name,
            is_owner: isMasterAdmin
          }
          await db.users.add(newAcc)
          syncUserToCloud(newAcc).catch(() => {})
        }
      } else if (currentCashierName) {
        const existing = await db.users.where('name').equalsIgnoreCase(currentCashierName).first()
        if (existing?.id) {
          await db.users.update(existing.id, { avatar_url: dataUrl })
          syncUserToCloud({ ...existing, avatar_url: dataUrl }).catch(() => {})
        }
      }

      onUpdateAvatar?.(dataUrl)
      setUserSuccessMessage('Your profile picture has been updated!')
      setTimeout(() => setUserSuccessMessage(''), 3000)
      await loadUsers()
    } catch (err) {
      console.error('Failed to upload profile picture:', err)
      alert('Failed to upload image. Please try another photo.')
    } finally {
      setIsUploadingCurrentAvatar(false)
      if (myFileInputRef.current) myFileInputRef.current.value = ''
    }
  }

  const handleRemoveMyAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return
    setIsUploadingCurrentAvatar(true)
    try {
      if (currentUser?.id) {
        await db.users.update(currentUser.id, { avatar_url: undefined })
        const u = await db.users.get(currentUser.id)
        if (u) syncUserToCloud(u).catch(() => {})
      } else if (currentUsername) {
        const existing = await db.users.where('username').equalsIgnoreCase(currentUsername).first()
        if (existing?.id) {
          await db.users.update(existing.id, { avatar_url: undefined })
          syncUserToCloud({ ...existing, avatar_url: undefined }).catch(() => {})
        }
      }
      onUpdateAvatar?.(undefined)
      setUserSuccessMessage('Profile picture removed.')
      setTimeout(() => setUserSuccessMessage(''), 3000)
      await loadUsers()
    } catch (err) {
      console.error('Failed to remove avatar:', err)
    } finally {
      setIsUploadingCurrentAvatar(false)
    }
  }

  const handleStaffAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetUser: UserAccount) => {
    const file = e.target.files?.[0]
    if (!file || !targetUser.id) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      return
    }

    try {
      const dataUrl = await compressImageFile(file, 320, 320, 0.85)
      await db.users.update(targetUser.id, { avatar_url: dataUrl })
      const u = await db.users.get(targetUser.id)
      if (u) syncUserToCloud(u).catch(() => {})

      if (targetUser.id === currentUser?.id || (currentUsername && targetUser.username.toLowerCase() === currentUsername.toLowerCase())) {
        onUpdateAvatar?.(dataUrl)
      }

      setUserSuccessMessage(`Updated profile picture for ${targetUser.name}!`)
      setTimeout(() => setUserSuccessMessage(''), 3000)
      await loadUsers()
    } catch (err) {
      console.error('Failed to upload staff photo:', err)
      alert('Failed to update staff photo.')
    } finally {
      e.target.value = ''
    }
  }

  const handleRemoveStaffAvatar = async (targetUser: UserAccount) => {
    if (!targetUser.id) return
    if (!confirm(`Are you sure you want to remove the profile picture for ${targetUser.name}?`)) return
    try {
      await db.users.update(targetUser.id, { avatar_url: undefined })
      const u = await db.users.get(targetUser.id)
      if (u) syncUserToCloud(u).catch(() => {})

      if (targetUser.id === currentUser?.id || (currentUsername && targetUser.username.toLowerCase() === currentUsername.toLowerCase())) {
        onUpdateAvatar?.(undefined)
      }
      setUserSuccessMessage(`Removed profile picture for ${targetUser.name}.`)
      setTimeout(() => setUserSuccessMessage(''), 3000)
      await loadUsers()
    } catch (err) {
      console.error('Failed to remove staff photo:', err)
    }
  }

  const handleNewUserAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file, 320, 320, 0.85)
      setNewUserAvatar(dataUrl)
    } catch (err) {
      console.error('Failed to compress avatar:', err)
      setUserFormError('Failed to process image.')
    }
  }

  const handleToggleUserStatus = async (user: UserAccount) => {
    if (!user.id) return
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'

    if (user.role === 'ADMIN' && newStatus === 'DISABLED') {
      const adminCount = users.filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE').length
      if (adminCount <= 1) {
        alert('Cannot disable the only active Master Admin account.')
        return
      }
    }

    await db.users.update(user.id, { status: newStatus })
    const u = await db.users.get(user.id)
    if (u) syncUserToCloud(u).catch(() => {})
    await loadUsers()
  }

  const handleUpdatePin = async (userId: number) => {
    if (!newPinValue || newPinValue.length < 4) {
      alert('PIN must be at least 4 digits.')
      return
    }
    await db.users.update(userId, { pin: newPinValue })
    const updatedUser = await db.users.get(userId)
    if (updatedUser) {
      syncUserToCloud(updatedUser).catch(() => {})
      setUserSuccessMessage(`Security PIN updated for ${updatedUser.name}!`)
      setTimeout(() => setUserSuccessMessage(''), 3000)
    }
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      
      {/* ── TOP HEADER & STICKY SAVE ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-emerald-400" />
            <span>Store Settings &amp; Administration</span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure store profile, hardware printers, e-wallets, staff accounts, and offline database archives.
          </p>
        </div>

        {/* Global Save Action */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl animate-fade-in shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Saved!</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSave()}
            className="btn-press px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs shadow-glow-emerald flex items-center gap-2 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* ── MODULAR 6-TAB NAVIGATION BAR ── */}
      <div className="p-1 rounded-2xl bg-zinc-900/90 border border-white/[0.08] shadow-inner overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
            }`}
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Store Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('printer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'printer'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Printer &amp; Receipts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
            }`}
          >
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>Payments &amp; QR Ph</span>
            {form.paymongo_enabled && (
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-4 h-4 text-amber-500" />
            <span>Staff Accounts</span>
            {users.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.1] text-stone-300">
                {users.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'themes'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
            }`}
          >
            <Palette className="w-4 h-4 text-purple-400" />
            <span>Themes Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Data &amp; Backup</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: STORE PROFILE & BRANDING ────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel rounded-3xl border border-white/[0.08] p-6 shadow-2xl bg-zinc-950/70 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-400" />
                  <span>Store Profile &amp; Receipt Branding</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  General retail identity, address, and official details printed on sales receipts.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Store / Business Name *</label>
                  <input
                    type="text"
                    required
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    value={form.contact_number}
                    onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Store Address / Location</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Receipt Footer Message</label>
                <input
                  type="text"
                  value={form.receipt_footer}
                  onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                  placeholder="e.g. Salamat sa pagpalit! Balik-balik kamo!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Default Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.default_low_stock || 5}
                    onChange={(e) => setForm({ ...form, default_low_stock: Number(e.target.value) || 5 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={form.currency_symbol || '₱'}
                    onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn-press px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs shadow-glow-emerald cursor-pointer transition-all"
                >
                  Save Store Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: PRINTER & HARDWARE SETUP ────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'printer' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel rounded-3xl border border-white/[0.08] p-6 shadow-2xl bg-zinc-950/70 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
              <div>
                <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Printer className="h-4 w-4 text-amber-400" />
                  <span>Receipt &amp; Universal Printer Setup</span>
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Select your physical receipt paper width. Compatible with all Bluetooth, USB, ESC/POS, and office printers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTestPrintModal(true)}
                className="btn-press px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-mono font-bold flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Test Print Sample</span>
              </button>
            </div>

            {/* Paper Width Selection Cards */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-2">
                Primary Printer Paper Width
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 58mm Card */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, printer_paper_width: '58mm' })}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    form.printer_paper_width === '58mm'
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-glow-amber ring-1 ring-amber-500/30'
                      : 'bg-zinc-900 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-stone-100">58mm Mini Thermal</span>
                    <span className="text-[0.75rem] font-mono text-amber-300">2-Inch Roll</span>
                  </div>
                  <p className="text-[0.8125rem] text-stone-400">
                    Portable Bluetooth &amp; mini USB printers (GOOJPRT, Xprinter 58, Sunmi, MPT-II).
                  </p>
                </button>

                {/* 80mm Card */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, printer_paper_width: '80mm' })}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    (form.printer_paper_width || '80mm') === '80mm'
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-glow-amber ring-1 ring-amber-500/30'
                      : 'bg-zinc-900 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-stone-100">80mm Standard Thermal</span>
                    <span className="text-[0.75rem] font-mono text-amber-300">3-Inch Roll</span>
                  </div>
                  <p className="text-[0.8125rem] text-stone-400">
                    Desktop commercial POS printers (Epson TM-T20, Star Micronics, Xprinter 80).
                  </p>
                </button>

                {/* A4 Sheet Card */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, printer_paper_width: 'A4' })}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    form.printer_paper_width === 'A4'
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-glow-amber ring-1 ring-amber-500/30'
                      : 'bg-zinc-900 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-stone-100">A4 / Letter Full Page</span>
                    <span className="text-[0.75rem] font-mono text-amber-300">Standard Sheet</span>
                  </div>
                  <p className="text-[0.8125rem] text-stone-400">
                    Standard office inkjet / laser printers and formal commercial PDF invoices.
                  </p>
                </button>
              </div>
            </div>

            {/* Customization Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all">
                <input
                  type="checkbox"
                  checked={form.printer_show_barcode ?? true}
                  onChange={(e) => setForm({ ...form, printer_show_barcode: e.target.checked })}
                  className="rounded border-white/20 text-emerald-500 focus:ring-0 w-4 h-4 bg-zinc-800 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-stone-100 block">Print Code128 Barcode</span>
                  <span className="text-[0.75rem] text-stone-400 block">Scannable invoice barcode for counter audits</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all">
                <input
                  type="checkbox"
                  checked={form.printer_show_logo ?? true}
                  onChange={(e) => setForm({ ...form, printer_show_logo: e.target.checked })}
                  className="rounded border-white/20 text-emerald-500 focus:ring-0 w-4 h-4 bg-zinc-800 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-stone-100 block">Print Store Crest Monogram</span>
                  <span className="text-[0.75rem] text-stone-400 block">Luxury brand emblem at top of receipt</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all">
                <input
                  type="checkbox"
                  checked={form.printer_show_customer_info ?? true}
                  onChange={(e) => setForm({ ...form, printer_show_customer_info: e.target.checked })}
                  className="rounded border-white/20 text-emerald-500 focus:ring-0 w-4 h-4 bg-zinc-800 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-stone-100 block">Customer Store Credit Balance</span>
                  <span className="text-[0.75rem] text-stone-400 block">Print remaining ledger balance for utang transactions</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all">
                <input
                  type="checkbox"
                  checked={form.printer_auto_print ?? false}
                  onChange={(e) => setForm({ ...form, printer_auto_print: e.target.checked })}
                  className="rounded border-white/20 text-emerald-500 focus:ring-0 w-4 h-4 bg-zinc-800 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-stone-100 block">Auto-Prompt Print on Checkout</span>
                  <span className="text-[0.75rem] text-stone-400 block">Automatically open print dialog after sale settlement</span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSave()}
                className="btn-press px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs shadow-glow-emerald cursor-pointer transition-all"
              >
                Save Printer Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: PAYMENTS & PAYMONGO QR PH ───────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel rounded-3xl border border-white/[0.08] p-6 shadow-2xl bg-zinc-950/70 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
              <div>
                <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-sky-400" />
                  <span>Digital Payments &amp; Real-Time Dynamic QR Ph (GCash / Maya)</span>
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Accept automated real-time payments directly into your PayMongo merchant account.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Per-Store Encrypted</span>
                </span>
              </div>
            </div>

            {/* Enable PayMongo Gateway Switch */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-100 block">
                      Enable PayMongo Real-Time Dynamic QR Ph
                    </span>
                    <span className="text-[11px] text-stone-400 block">
                      When enabled, checkout generates live QR Ph codes for GCash &amp; Maya with instant status radar.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.paymongo_enabled ?? false}
                  onChange={(e) => setForm({ ...form, paymongo_enabled: e.target.checked })}
                  className="rounded border-white/20 text-sky-500 focus:ring-0 w-5 h-5 bg-zinc-800 cursor-pointer"
                />
              </label>

              {form.paymongo_enabled && (
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  {/* Environment Switcher */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-white/[0.08] text-xs">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, paymongo_environment: 'test' })}
                      className={`py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                        (form.paymongo_environment ?? 'test') === 'test'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      🧪 Test Sandbox Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, paymongo_environment: 'live' })}
                      className={`py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                        form.paymongo_environment === 'live'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      🚀 Live Production (Real Money)
                    </button>
                  </div>

                  {/* Secret Key Input with Masking & Testing */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        <span>PayMongo Secret Key (sk_test_... or sk_live_...)</span>
                      </label>
                      <span className="text-[10px] text-stone-500 font-mono">
                        Admin Only · Private &amp; Isolated
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showSecretKey ? 'text' : 'password'}
                          value={form.paymongo_secret_key || ''}
                          onChange={(e) => {
                            setForm({ ...form, paymongo_secret_key: e.target.value.trim() })
                            setPayMongoTestResult(null)
                          }}
                          placeholder="sk_test_... or sk_live_..."
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs font-mono text-stone-100 focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-100 p-1 cursor-pointer"
                          title={showSecretKey ? 'Hide key' : 'Show key'}
                        >
                          {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleTestPayMongo}
                        disabled={isTestingPayMongo || !form.paymongo_secret_key}
                        className="btn-press px-3.5 py-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 text-xs font-bold shrink-0 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isTestingPayMongo ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                        <span>{isTestingPayMongo ? 'Testing...' : 'Test Connection'}</span>
                      </button>
                    </div>

                    {/* Test Result Message */}
                    {payMongoTestResult && (
                      <div
                        className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                          payMongoTestResult.ok
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {payMongoTestResult.ok ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        )}
                        <span className="font-medium">{payMongoTestResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Auto Finalize Sale Toggle */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all">
                    <input
                      type="checkbox"
                      checked={form.paymongo_auto_complete ?? true}
                      onChange={(e) => setForm({ ...form, paymongo_auto_complete: e.target.checked })}
                      className="rounded border-white/20 text-sky-500 focus:ring-0 w-4 h-4 bg-zinc-800 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-stone-100 block">
                        Auto-Finalize Sale on Payment Confirmation
                      </span>
                      <span className="text-[11px] text-stone-400 block">
                        Automatically closes checkout and prints the receipt the moment payment hits PayMongo.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Fallback Personal Static QR Upload */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-100 block">
                    Personal Store GCash / Maya Static QR Image (Fallback)
                  </span>
                  <span className="text-[11px] text-stone-400 block">
                    Upload a photo of your printed store QR code. This displays at checkout when manual verification is selected.
                  </span>
                </div>
                <input
                  ref={qrImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCustomQr}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => qrImageInputRef.current?.click()}
                  className="btn-press px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{form.store_qr_image_url ? 'Change QR Image' : 'Upload QR Photo'}</span>
                </button>
              </div>

              {form.store_qr_image_url && (
                <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-zinc-950 border border-white/[0.08]">
                  <img
                    src={form.store_qr_image_url}
                    alt="Store QR"
                    className="h-16 w-16 object-contain rounded-lg border border-zinc-800 bg-white"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-stone-200 block">Personal QR active</span>
                    <span className="text-[10px] text-stone-400 block">Shows on customer checkout screen</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, store_qr_image_url: undefined })}
                    className="p-1 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Remove QR"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSave()}
                className="btn-press px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs shadow-glow-emerald cursor-pointer transition-all"
              >
                Save Payment Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 4: STAFF & CASHIER ACCOUNTS ────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Your Profile Card */}
          <div className="glass-panel rounded-3xl border border-amber-500/30 p-5 shadow-2xl bg-gradient-to-r from-amber-500/[0.08] via-zinc-950 to-zinc-950 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-glow-amber bg-zinc-900 flex items-center justify-center">
                    {currentUser?.avatar_url || currentUserAvatar ? (
                      <img
                        src={currentUser?.avatar_url || currentUserAvatar}
                        alt={currentCashierName || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-bold text-xl">
                        {((currentUser?.name || currentCashierName || currentUsername || 'User')).substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {isUploadingCurrentAvatar && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => myFileInputRef.current?.click()}
                    disabled={isUploadingCurrentAvatar}
                    className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 transition-all shadow-md cursor-pointer"
                    title="Upload Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={myFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadMyAvatar}
                    className="hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <h3 className="text-sm font-bold text-stone-100 flex items-center gap-1.5">
                      {isMasterAdmin && <Crown className="w-4 h-4 text-amber-400" />}
                      <span>{currentCashierName || 'Staff Member'}</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold uppercase">
                      {currentCashierRole || (isMasterAdmin ? 'Master Admin' : 'Staff')}
                    </span>
                  </div>
                  {currentUsername && (
                    <p className="text-xs font-mono text-stone-400 mt-0.5">@{currentUsername}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-0.5">
                    Your personal profile picture across counter sessions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => myFileInputRef.current?.click()}
                  disabled={isUploadingCurrentAvatar}
                  className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{currentUser?.avatar_url || currentUserAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {(currentUser?.avatar_url || currentUserAvatar) && (
                  <button
                    type="button"
                    onClick={handleRemoveMyAvatar}
                    disabled={isUploadingCurrentAvatar}
                    className="btn-press flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Staff Roster Card */}
          <div className="glass-panel rounded-3xl border border-white/[0.08] p-6 shadow-2xl bg-zinc-950/70 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-4 gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  <span>Staff &amp; Cashier Accounts</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Only Master Admin can provision and manage counter staff accounts and individual security PINs.
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (!canAddStaffAccount(users.length)) {
                      if (
                        confirm(
                          `Free Community Edition is limited to ${FREE_TIER_LIMITS.MAX_STAFF_ACCOUNTS} staff account.\n\nWould you like to unlock unlimited staff accounts with VIP Pro Lifetime for ₱500?`
                        )
                      ) {
                        onOpenVipUpgrade?.()
                      }
                      return
                    }
                    setShowAddUserModal(true)
                  }}
                  className="btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition-all self-start sm:self-auto shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Staff / Cashier</span>
                </button>
              )}
            </div>

            {!isVipActive() && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    Free Community Edition: <strong>{users.length} / {FREE_TIER_LIMITS.MAX_STAFF_ACCOUNTS}</strong> staff account active.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenVipUpgrade}
                  className="font-bold underline text-amber-200 hover:text-white shrink-0"
                >
                  Upgrade for Unlimited Staff
                </button>
              </div>
            )}

            {userSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>{userSuccessMessage}</span>
              </div>
            )}

            {/* Users List */}
            <div className="space-y-2.5">
              {loadingUsers ? (
                <p className="text-xs text-stone-400 font-mono py-4 text-center">Loading accounts...</p>
              ) : users.length === 0 ? (
                <div className="text-center py-6 text-stone-500 text-xs font-mono">
                  No users found. Using default Master Admin account.
                </div>
              ) : (
                users.map((u) => {
                  const isMaster = u.role === 'ADMIN'
                  const isEditingThisPin = editingPinUserId === u.id

                  return (
                    <div
                      key={u.id ?? u.username}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        u.status === 'ACTIVE'
                          ? 'bg-zinc-900 border-white/[0.08]'
                          : 'bg-zinc-900/50 border-red-500/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.name || u.username}
                            className="h-10 w-10 rounded-xl object-cover border border-amber-500/40 shadow-glow-amber shrink-0"
                          />
                        ) : (
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isMaster
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-glow-amber'
                              : 'bg-zinc-800 border border-white/10 text-stone-200'
                          }`}>
                            {((u.name || u.username || 'User')).substring(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs sm:text-sm font-semibold text-stone-100">{u.name || u.username || 'Staff Member'}</p>
                            <span className="text-[0.75rem] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-stone-400">
                              @{u.username}
                            </span>
                            <span className={`text-[0.75rem] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isMaster
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : u.role === 'INVENTORY_LEAD'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {u.role === 'ADMIN' ? 'Master Admin' : u.role === 'INVENTORY_LEAD' ? 'Inventory Lead' : 'Cashier'}
                            </span>
                            {u.store_name && (
                              <span className="text-[0.75rem] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                {u.store_name}
                              </span>
                            )}
                            {u.status === 'DISABLED' && (
                              <span className="text-[0.75rem] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-[0.75rem] text-stone-500 font-mono mt-0.5">
                            Created: {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Actions (Admin Only) */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {isEditingThisPin ? (
                            <div className="flex items-center gap-1.5 animate-fade-in">
                              <input
                                type="password"
                                maxLength={6}
                                placeholder="New PIN"
                                value={newPinValue}
                                onChange={(e) => setNewPinValue(e.target.value.replace(/[^0-9]/g, ''))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (u.id) handleUpdatePin(u.id)
                                  }
                                }}
                                className="w-20 px-2 py-1 rounded-lg bg-zinc-950 border border-amber-500/50 text-xs font-mono text-amber-300 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => u.id && handleUpdatePin(u.id)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                                title="Save PIN"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPinUserId(null)
                                  setNewPinValue('')
                                }}
                                className="p-1.5 rounded-lg bg-white/[0.05] text-stone-400 hover:bg-white/[0.1] cursor-pointer"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPinUserId(u.id ?? null)
                                setNewPinValue('')
                              }}
                              className="btn-press px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-stone-300 hover:text-stone-100 text-xs flex items-center gap-1 cursor-pointer"
                              title="Change PIN"
                            >
                              <Key className="h-3 w-3 text-amber-400" />
                              <span className="text-[0.8125rem]">PIN</span>
                            </button>
                          )}

                          <label
                            className="btn-press px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-stone-300 hover:text-stone-100 text-xs flex items-center gap-1 cursor-pointer"
                            title={u.avatar_url ? 'Change Photo' : 'Upload Photo'}
                          >
                            <Camera className="h-3 w-3 text-amber-400" />
                            <span className="text-[0.8125rem] hidden sm:inline">{u.avatar_url ? 'Photo' : '+ Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleStaffAvatarUpload(e, u)}
                              className="hidden"
                            />
                          </label>

                          {u.avatar_url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStaffAvatar(u)}
                              className="btn-press p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs cursor-pointer"
                              title="Remove Photo"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`btn-press p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer ${
                              u.status === 'ACTIVE'
                                ? 'bg-zinc-800 border-white/[0.1] text-stone-400 hover:text-stone-200'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}
                            title={u.status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
                          >
                            {u.status === 'ACTIVE' ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>

                          {(!isMaster || users.filter((x) => x.role === 'ADMIN').length > 1) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="btn-press p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs cursor-pointer"
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 5: RETAIL THEMES STUDIO ────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'themes' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel rounded-3xl border border-white/[0.08] p-6 shadow-2xl bg-zinc-950/70 space-y-4">
            <div className="border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-400" />
                <span>Retail Display Themes &amp; Color Palettes</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Choose the most elegant and fitting color theme for your retail counter, grocery, or boutique.
              </p>
            </div>

            {userSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>{userSuccessMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {THEMES.map((theme) => {
                const isSelected = activeThemeId === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    style={isSelected ? { borderColor: theme.accentColor, boxShadow: `0 0 25px -4px ${theme.accentColor}44` } : undefined}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 ring-1 ring-white/20'
                        : 'border-white/[0.08] bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 rounded-full border border-white/20 shadow-sm shrink-0"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <h4 className="text-xs font-bold text-stone-100">{theme.name}</h4>
                      </div>
                      {isSelected && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                          style={{ color: theme.accentColor, backgroundColor: `${theme.accentColor}18`, borderColor: `${theme.accentColor}44` }}
                        >
                          <Check className="h-3 w-3" /> ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400">{theme.subtitle}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] font-mono text-stone-500">
                      <span>{theme.isDark ? 'Dark Mode' : 'Light Retail Mode'}</span>
                      <span className="group-hover:text-stone-300 transition-colors">
                        {isSelected ? 'Currently Applied' : 'Click to Apply'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 6: DATA, BACKUP & VIP LICENSING ────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Universal Backup Box */}
          <div className="glass-panel rounded-3xl border border-white/[0.08] p-6 shadow-2xl bg-zinc-950/70 space-y-4">
            <div className="border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-400" />
                <span>Universal .tinda-backup Archive &amp; Offline Desktop Importer</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                100% interoperable with Desktop TINDA POS (Windows/Linux SQLite), Android, and Web edition.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export Box */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-emerald-400" />
                    <span>Export .tinda-backup</span>
                  </h4>
                  <p className="text-[0.8125rem] text-stone-400 mt-1">
                    Download a full archive of your store database (products, sales, customers, debt ledger) as a portable file.
                  </p>
                </div>
                <button
                  onClick={() => void downloadBackupFile()}
                  className="btn-press w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs cursor-pointer transition-all"
                >
                  Download Backup File (.tinda-backup)
                </button>
              </div>

              {/* Import Box */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-indigo-400" />
                    <span>Restore / Import Offline Database</span>
                  </h4>
                  <p className="text-[0.8125rem] text-stone-400 mt-1">
                    Load a .tinda-backup file. Automatically assigns all imported inventory and sales directly to your store!
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".tinda-backup,.json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleAutoDetectAndImport}
                    disabled={importing}
                    className="btn-press w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-glow-amber transition-all cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5 fill-zinc-950" />
                    <span>⚡ Auto-Detect &amp; 1-Click Import</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="btn-press w-full py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{importing ? 'Importing & Converting...' : 'Manual Select .tinda-backup File'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pre-Restore Rollback Snapshot */}
            {checkpointTime && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-stone-100 block">
                      Emergency Pre-Restore Rollback Snapshot Available
                    </span>
                    <span className="text-[11px] text-amber-300/80 block font-mono">
                      Saved: {new Date(checkpointTime).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRollbackCheckpoint}
                  disabled={importing}
                  className="btn-press px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs shrink-0 cursor-pointer"
                >
                  Rollback Snapshot
                </button>
              </div>
            )}
          </div>

          {/* VIP Licensing & Device ID Card */}
          <div className="glass-panel rounded-3xl border border-amber-500/30 p-6 shadow-2xl space-y-4 bg-gradient-to-r from-amber-950/20 via-zinc-950 to-zinc-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-glow-amber">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-100">TINDA POS VIP Pro Lifetime Licensing</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[0.6875rem] font-mono font-bold border border-amber-500/30">
                      {vipInfo?.active ? 'LIFETIME UNLOCKED' : '₱500 ONE-TIME'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Terminal-locked permanent key · PayMongo QR Ph or Maya 09912255156 (Dev Francis)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenVipUpgrade}
                className="btn-press px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-glow-amber flex items-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer"
              >
                <Crown className="h-4 w-4" />
                <span>{vipInfo?.active ? 'View License Details' : 'Upgrade to VIP Pro'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-zinc-900 border border-white/[0.08]">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">This Terminal Machine ID</span>
                <span className="font-mono font-bold text-amber-300 text-xs truncate block mt-1">
                  {machineId || 'Generating...'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900 border border-white/[0.08]">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">Official Maya Dev Support</span>
                <span className="font-mono font-bold text-emerald-400 text-xs block mt-1">
                  0991 225 5156 (Dev Francis)
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900 border border-white/[0.08]">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">Licensed Store Owner</span>
                <span className="text-xs font-bold text-stone-200 truncate block mt-1">
                  {vipInfo?.registeredTo || 'Store Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Cloudflare Edge Status */}
          <div className="glass-panel rounded-3xl p-4 border border-emerald-500/20 bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-stone-100">Cloudflare Pages Edge Architecture</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  High-assurance client Dexie IndexedDB with universal cross-device restore parity.
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone: Reset Database */}
          <div className="p-4 rounded-3xl border border-red-500/20 bg-red-950/10 space-y-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="text-xs font-bold text-red-400 block">Factory Reset Local Database</span>
                <span className="text-[11px] text-stone-400 block">
                  Permanently deletes all products, sales history, and customer records from this browser.
                </span>
              </div>
              <button
                onClick={handleResetData}
                className="btn-press px-3.5 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── ADD USER MODAL ────────────────── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-100">Create Staff Account</h3>
                  <p className="text-[0.75rem] text-stone-400 font-mono">Master Admin provisioning</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddUserModal(false)
                  setUserFormError('')
                }}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-white/[0.05] cursor-pointer"
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
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Clara"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Username / ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    placeholder="e.g. maria"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Security PIN (4-6 digits) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400 tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Staff Role &amp; Access Level
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs font-medium text-stone-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="CASHIER">Cashier (POS Counter &amp; Sales)</option>
                  <option value="INVENTORY_LEAD">Inventory Lead (POS Counter + Inventory Management)</option>
                  <option value="ADMIN">Master Admin (Full Access + Staff Management)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Profile Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl border border-white/10 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                    {newUserAvatar ? (
                      <img src={newUserAvatar} alt="Staff Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-stone-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => newUserAvatarInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-stone-300 hover:text-stone-100 text-xs font-semibold cursor-pointer"
                    >
                      {newUserAvatar ? 'Change Photo' : 'Choose Photo'}
                    </button>
                    {newUserAvatar && (
                      <button
                        type="button"
                        onClick={() => setNewUserAvatar(undefined)}
                        className="px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={newUserAvatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleNewUserAvatarSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-stone-400 hover:text-stone-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-press px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-glow-amber cursor-pointer"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── TEST PRINT RECEIPT MODAL ────────────────── */}
      {showTestPrintModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="no-print w-full max-w-2xl bg-zinc-900 border border-white/[0.08] rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-100">Printer Output Test</h3>
                <p className="text-[0.8125rem] font-mono text-stone-400">
                  Verify paper margins, font size, and barcode alignment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-white/[0.08] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setTestPaperWidth('58mm')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    testPaperWidth === '58mm'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setTestPaperWidth('80mm')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    testPaperWidth === '80mm'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setTestPaperWidth('A4')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    testPaperWidth === 'A4'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  A4
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="btn-press px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-glow-amber hover:brightness-110 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Paper</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTestPrintModal(false)}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-400 hover:text-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Test Paper Preview */}
          <div className="w-full flex justify-center py-2">
            <Receipt
              tx={{
                id: 8891,
                invoice_number: 'INV-20260924-8891',
                created_at: new Date().toISOString(),
                items: [
                  { product_id: 101, name: 'San Miguel Pale Pilsen 330ml', unit_name: 'can', quantity: 2, unit_price_c: 6500, total_c: 13000 },
                  { product_id: 102, name: 'Lucky Me Pancit Canton Kalamansi', unit_name: 'pack', quantity: 3, unit_price_c: 1800, total_c: 5400 },
                  { product_id: 103, name: 'Purefoods Corned Beef 150g', unit_name: 'can', quantity: 1, unit_price_c: 8500, total_c: 8500 }
                ],
                subtotal_c: 26900,
                discount_c: 2000,
                discount_type: 'CUSTOM',
                total_c: 24900,
                payment_method: 'CASH',
                amount_tendered_c: 30000,
                change_c: 5100,
                customer_id: null,
                cashier_name: currentCashierName || 'Ian Muyco',
                store_name: form.store_name || settings.store_name
              }}
              storeName={form.store_name || settings.store_name}
              address={form.address || settings.address}
              contact={form.contact_number || settings.contact_number}
              receiptFooter={form.receipt_footer || settings.receipt_footer}
              paperWidth={testPaperWidth}
              showBarcode={form.printer_show_barcode ?? true}
              showLogo={form.printer_show_logo ?? true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
