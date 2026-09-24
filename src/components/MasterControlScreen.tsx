import React, { useState, useEffect } from 'react'
import {
  ShieldCheck, Crown, Store, Users, UserPlus, Search,
  Lock, KeyRound, CheckCircle2, AlertTriangle, RefreshCw,
  Clock, Download, ChevronDown, ChevronRight, Eye, EyeOff,
  Sparkles, Radio, Shield, Trash2, Edit3, X, Copy, Check,
  Zap, ExternalLink, Play, Wallet, Calendar, LogIn
} from 'lucide-react'
import { db } from '../db'
import type { UserAccount, UserRole, StoreSettings, ProAccessState } from '../types'

interface MasterControlScreenProps {
  currentCashierName?: string
  isMasterAdmin: boolean
  onRefreshAll?: () => void
  onMasqueradeStore?: (storeName: string, owner?: UserAccount) => void
}

export function MasterControlScreen({
  currentCashierName = 'Ian Muyco',
  isMasterAdmin,
  onRefreshAll,
  onMasqueradeStore
}: MasterControlScreenProps): React.JSX.Element {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'OWNERS' | 'STAFF'>('ALL')
  const [adStats, setAdStats] = useState<ProAccessState | null>(null)
  const [totalTransactions, setTotalTransactions] = useState<number>(0)
  const [expandedStores, setExpandedStores] = useState<Record<string, boolean>>({})

  // Store Pass & Token Authority State
  const [passTargetStore, setPassTargetStore] = useState<{
    storeName: string
    owner?: UserAccount
  } | null>(null)
  const [passOwnerState, setPassOwnerState] = useState<ProAccessState | null>(null)
  const [loadingPassState, setLoadingPassState] = useState(false)
  const [copiedUserId, setCopiedUserId] = useState<number | null>(null)

  // Modal: Add New Store / Merchant
  const [showAddStoreModal, setShowAddStoreModal] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newOwnerUsername, setNewOwnerUsername] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newOwnerPin, setNewOwnerPin] = useState('')
  const [storeModalError, setStoreModalError] = useState('')

  // Modal: Add Staff for specific store
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [staffTargetStore, setStaffTargetStore] = useState('')
  const [staffTargetOwner, setStaffTargetOwner] = useState('')
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffUsername, setNewStaffUsername] = useState('')
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('CASHIER')
  const [newStaffPin, setNewStaffPin] = useState('')
  const [staffModalError, setStaffModalError] = useState('')

  // Modal: Reset PIN
  const [editingPinUser, setEditingPinUser] = useState<UserAccount | null>(null)
  const [newPinValue, setNewPinValue] = useState('')

  // Visible PINs map for Master Admin inspection
  const [revealedPins, setRevealedPins] = useState<Record<number, boolean>>({})

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const allUsers = await db.users.toArray()
      setUsers(allUsers)

      const txCount = await db.transactions.count()
      setTotalTransactions(txCount)

      const proRec = await db.settings.get('pro_access_state')
      if (proRec && proRec.value) {
        setAdStats(proRec.value)
      }

      // Auto expand all stores by default
      const expMap: Record<string, boolean> = {}
      allUsers.forEach((u) => {
        const storeKey = u.store_name || 'Independent / General Stores'
        expMap[storeKey] = true
      })
      setExpandedStores(expMap)
    } catch (err) {
      console.error('Error loading master control data:', err)
      showToast('Failed to load master control data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Toggle Reveal PIN
  const toggleRevealPin = (userId?: number) => {
    if (!userId) return
    setRevealedPins((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  // Toggle Store Accordion
  const toggleStoreExpand = (storeKey: string) => {
    setExpandedStores((prev) => ({ ...prev, [storeKey]: !prev[storeKey] }))
  }

  // Toggle Account Active / Disabled
  const handleToggleStatus = async (user: UserAccount) => {
    if (!user.id) return
    if (user.username.toLowerCase() === 'skorts188@gmail.com') {
      showToast('Cannot disable the Platform Master Admin account.', 'error')
      return
    }

    const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    try {
      await db.users.update(user.id, { status: nextStatus })
      showToast(`User @${user.username} is now ${nextStatus}`)
      await loadData()
    } catch (e) {
      showToast('Failed to update status', 'error')
    }
  }

  // Delete User
  const handleDeleteUser = async (user: UserAccount) => {
    if (!user.id) return
    if (user.username.toLowerCase() === 'skorts188@gmail.com') {
      showToast('Cannot delete the Platform Master Admin account.', 'error')
      return
    }

    if (confirm(`Permanently delete account @${user.username} (${user.name})? This action cannot be undone.`)) {
      try {
        await db.users.delete(user.id)
        showToast(`User @${user.username} deleted`)
        await loadData()
      } catch (e) {
        showToast('Failed to delete user', 'error')
      }
    }
  }

  // Submit Reset PIN
  const handleSaveResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPinUser || !editingPinUser.id) return
    if (!newPinValue || newPinValue.length < 4) {
      showToast('PIN must be at least 4 characters', 'error')
      return
    }

    try {
      await db.users.update(editingPinUser.id, { pin: newPinValue })
      showToast(`PIN for @${editingPinUser.username} updated to "${newPinValue}"`)
      setEditingPinUser(null)
      setNewPinValue('')
      await loadData()
    } catch (e) {
      showToast('Failed to update PIN', 'error')
    }
  }

  // Create New Store / Merchant
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedStore = newStoreName.trim()
    const trimmedName = newOwnerName.trim()
    const trimmedUser = newOwnerUsername.trim().toLowerCase()
    const trimmedEmail = newOwnerEmail.trim()
    const trimmedPin = newOwnerPin.trim()

    if (!trimmedStore || !trimmedName || !trimmedUser || !trimmedPin) {
      setStoreModalError('Please fill in Store Name, Owner Name, Username, and PIN.')
      return
    }

    if (trimmedPin.length < 4) {
      setStoreModalError('PIN must be at least 4 digits.')
      return
    }

    const existing = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
    if (existing) {
      setStoreModalError(`Username "${trimmedUser}" is already taken.`)
      return
    }

    try {
      const newOwner: UserAccount = {
        username: trimmedUser,
        name: trimmedName,
        role: 'ADMIN',
        pin: trimmedPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        store_name: trimmedStore,
        email: trimmedEmail,
        is_owner: true
      }

      await db.users.add(newOwner)
      showToast(`Merchant Store "${trimmedStore}" successfully registered!`)

      setNewStoreName('')
      setNewOwnerName('')
      setNewOwnerUsername('')
      setNewOwnerEmail('')
      setNewOwnerPin('')
      setShowAddStoreModal(false)
      setStoreModalError('')
      await loadData()
    } catch (err) {
      console.error('Failed to create store:', err)
      setStoreModalError('Database error creating store.')
    }
  }

  // Create New Staff for Store
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newStaffName.trim()
    const trimmedUser = newStaffUsername.trim().toLowerCase()
    const trimmedPin = newStaffPin.trim()

    if (!trimmedName || !trimmedUser || !trimmedPin) {
      setStaffModalError('Please fill in Staff Name, Username, and PIN.')
      return
    }

    if (trimmedPin.length < 4) {
      setStaffModalError('PIN must be at least 4 digits.')
      return
    }

    const existing = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
    if (existing) {
      setStaffModalError(`Username "${trimmedUser}" is already registered.`)
      return
    }

    try {
      const newStaff: UserAccount = {
        username: trimmedUser,
        name: trimmedName,
        role: newStaffRole,
        pin: trimmedPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        store_name: staffTargetStore,
        owner_username: staffTargetOwner,
        is_owner: false
      }

      await db.users.add(newStaff)
      showToast(`Staff "${trimmedName}" added to ${staffTargetStore}!`)

      setNewStaffName('')
      setNewStaffUsername('')
      setNewStaffPin('')
      setShowAddStaffModal(false)
      setStaffModalError('')
      await loadData()
    } catch (err) {
      console.error('Failed to create staff:', err)
      setStaffModalError('Database error creating staff.')
    }
  }

  // Open Store Pass Authority Modal
  const handleOpenStorePassModal = async (storeName: string, owner?: UserAccount) => {
    setPassTargetStore({ storeName, owner })
    setLoadingPassState(true)
    try {
      if (owner?.id) {
        const rec = await db.settings.get(`pro_access_state_u${owner.id}`)
        if (rec?.value) {
          setPassOwnerState(rec.value)
        } else {
          setPassOwnerState({
            pro_expires_at: 0,
            tokens: 0,
            last_ad_watched_at: 0,
            total_ads_watched: 0,
            owner_bypass: false
          })
        }
      } else {
        setPassOwnerState(null)
      }
    } catch (e) {
      console.error('Failed to load store pass state:', e)
    } finally {
      setLoadingPassState(false)
    }
  }

  // Master Authority: Grant Shift Time
  const handleGrantTime = async (hours: number) => {
    if (!passTargetStore?.owner?.id) return
    const ownerId = passTargetStore.owner.id
    const addMs = hours * 60 * 60 * 1000
    const currentBase = Math.max(Date.now(), passOwnerState?.pro_expires_at || 0)
    const newExpiry = currentBase + addMs

    const updated: ProAccessState = {
      pro_expires_at: newExpiry,
      tokens: passOwnerState?.tokens || 0,
      last_ad_watched_at: passOwnerState?.last_ad_watched_at || 0,
      total_ads_watched: passOwnerState?.total_ads_watched || 0,
      owner_bypass: passOwnerState?.owner_bypass || false
    }

    try {
      await db.settings.put({ key: `pro_access_state_u${ownerId}`, value: updated })
      setPassOwnerState(updated)
      const days = hours / 24
      showToast(`⚡ Granted +${days >= 1 ? `${days} Day(s)` : `${hours} Hours`} to ${passTargetStore.storeName}!`)
    } catch (e) {
      showToast('Failed to update store pass', 'error')
    }
  }

  // Master Authority: Grant Tokens to Wallet
  const handleGrantTokens = async (amount: number) => {
    if (!passTargetStore?.owner?.id) return
    const ownerId = passTargetStore.owner.id
    const updated: ProAccessState = {
      pro_expires_at: passOwnerState?.pro_expires_at || 0,
      tokens: (passOwnerState?.tokens || 0) + amount,
      last_ad_watched_at: passOwnerState?.last_ad_watched_at || 0,
      total_ads_watched: passOwnerState?.total_ads_watched || 0,
      owner_bypass: passOwnerState?.owner_bypass || false
    }

    try {
      await db.settings.put({ key: `pro_access_state_u${ownerId}`, value: updated })
      setPassOwnerState(updated)
      showToast(`🪙 Granted +${amount} Tokens to ${passTargetStore.storeName}!`)
    } catch (e) {
      showToast('Failed to grant tokens', 'error')
    }
  }

  // Master Authority: Toggle VIP Bypass
  const handleToggleVipBypass = async () => {
    if (!passTargetStore?.owner?.id) return
    const ownerId = passTargetStore.owner.id
    const newBypass = !passOwnerState?.owner_bypass
    const updated: ProAccessState = {
      pro_expires_at: passOwnerState?.pro_expires_at || 0,
      tokens: passOwnerState?.tokens || 0,
      last_ad_watched_at: passOwnerState?.last_ad_watched_at || 0,
      total_ads_watched: passOwnerState?.total_ads_watched || 0,
      owner_bypass: newBypass
    }

    try {
      await db.settings.put({ key: `pro_access_state_u${ownerId}`, value: updated })
      setPassOwnerState(updated)
      showToast(newBypass ? `👑 Lifetime VIP Bypass ENABLED for ${passTargetStore.storeName}!` : `VIP Bypass DISABLED for ${passTargetStore.storeName}`)
    } catch (e) {
      showToast('Failed to toggle VIP bypass', 'error')
    }
  }

  // Master Authority: Expire Store Pass Immediately
  const handleExpireStorePassNow = async () => {
    if (!passTargetStore?.owner?.id) return
    const ownerId = passTargetStore.owner.id
    const updated: ProAccessState = {
      pro_expires_at: Date.now() - 1000,
      tokens: passOwnerState?.tokens || 0,
      last_ad_watched_at: passOwnerState?.last_ad_watched_at || 0,
      total_ads_watched: passOwnerState?.total_ads_watched || 0,
      owner_bypass: false
    }

    try {
      await db.settings.put({ key: `pro_access_state_u${ownerId}`, value: updated })
      setPassOwnerState(updated)
      showToast(`🔴 Expired pass for ${passTargetStore.storeName}! Store features locked.`, 'info')
    } catch (e) {
      showToast('Failed to expire pass', 'error')
    }
  }

  // 1-Click Copy PIN
  const handleCopyPin = (pin: string, username: string, userId?: number) => {
    if (userId) {
      setCopiedUserId(userId)
      setTimeout(() => setCopiedUserId(null), 2000)
    }
    try {
      navigator.clipboard.writeText(pin)
      showToast(`Copied PIN "${pin}" for @${username}`)
    } catch {
      showToast(`PIN is: ${pin}`)
    }
  }

  // Full Platform Master Database Backup JSON
  const handleExportFullMasterBackup = async () => {
    try {
      const [allUsers, allProducts, allCategories, allTx, allCust, allSettings, allExpenses] = await Promise.all([
        db.users.toArray(),
        db.products.toArray(),
        db.categories.toArray(),
        db.transactions.toArray(),
        db.customers.toArray(),
        db.settings.toArray(),
        db.expenses.toArray()
      ])

      const masterBackup = {
        exported_at: new Date().toISOString(),
        platform: 'TINDA POS Executive Retail Cloud',
        master_admin: 'skorts188@gmail.com',
        database_version: 1,
        stats: {
          total_stores: Object.keys(storesGrouped).length,
          total_users: allUsers.length,
          total_products: allProducts.length,
          total_transactions: allTx.length,
          total_expenses: allExpenses.length
        },
        data: {
          users: allUsers,
          products: allProducts,
          categories: allCategories,
          transactions: allTx,
          customers: allCust,
          expenses: allExpenses,
          settings: allSettings
        }
      }

      const blob = new Blob([JSON.stringify(masterBackup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tinda-pos-FULL-MASTER-BACKUP-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Full Platform Database Backup exported successfully!')
    } catch (err) {
      console.error('Backup error:', err)
      showToast('Failed to export master backup', 'error')
    }
  }

  // Group Users by Store
  const storesGrouped = React.useMemo(() => {
    const map: Record<string, { owner?: UserAccount; staff: UserAccount[] }> = {}

    // First collect all explicit owners
    users.forEach((u) => {
      const storeName = u.store_name || (u.is_owner ? `${u.name}'s Store` : 'Independent / General Staff')
      if (!map[storeName]) {
        map[storeName] = { staff: [] }
      }
      if (u.is_owner || u.role === 'ADMIN') {
        if (!map[storeName].owner) {
          map[storeName].owner = u
        } else {
          map[storeName].staff.push(u)
        }
      } else {
        map[storeName].staff.push(u)
      }
    })

    return map
  }, [users])

  // Filtered store entries
  const filteredStoreEntries = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return Object.entries(storesGrouped).filter(([storeName, group]) => {
      const matchesStore = storeName.toLowerCase().includes(query)
      const matchesOwner =
        group.owner?.name.toLowerCase().includes(query) ||
        group.owner?.username.toLowerCase().includes(query) ||
        group.owner?.email?.toLowerCase().includes(query)

      const matchesStaff = group.staff.some(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.username.toLowerCase().includes(query) ||
          s.role.toLowerCase().includes(query)
      )

      const textMatch = !query || matchesStore || matchesOwner || matchesStaff

      if (!textMatch) return false

      if (filterRole === 'OWNERS') return !!group.owner
      if (filterRole === 'STAFF') return group.staff.length > 0
      return true
    })
  }, [storesGrouped, searchQuery, filterRole])

  // Total Counts
  const totalStoresCount = Object.keys(storesGrouped).length
  const totalStaffCount = users.filter((u) => !u.is_owner && u.role !== 'ADMIN').length

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-in text-stone-100">
      {/* ── HEADER BANNER ── */}
      <div className="glass-vault rounded-3xl p-6 sm:p-8 border border-gold/40 shadow-vault relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/[0.08] blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-gold/[0.05] blur-[80px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-300 via-gold to-amber-600 flex items-center justify-center text-obsidian-950 font-serif font-black shadow-glow-gold">
                <Crown className="w-5 h-5 text-obsidian-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-stone-100 uppercase">
                    Platform Master Control
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-light font-mono text-[9px] font-extrabold uppercase tracking-widest border border-gold/40">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="font-mono text-xs text-gold-muted tracking-wider">
                  Platform Oversight, Registered Store Merchants &amp; Staff Hierarchy
                </p>
              </div>
            </div>

            {/* Master Credentials Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-gold/30 font-mono text-xs text-amber-200">
              <ShieldCheck className="w-4 h-4 text-gold-light" />
              <span>Logged in as:</span>
              <span className="font-bold text-gold-light">skorts188@gmail.com</span>
              <span className="text-stone-500">•</span>
              <span className="text-emerald-400 font-semibold">Zero-Ads Master Bypass Active</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddStoreModal(true)}
              className="btn-gold px-4 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 shadow-glow-gold"
            >
              <Store className="w-4 h-4" />
              <span>+ Register Store</span>
            </button>

            <button
              onClick={handleExportFullMasterBackup}
              className="btn-press px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] hover:border-gold/40 text-stone-300 hover:text-stone-100 text-xs font-mono flex items-center gap-2 transition-all shadow-sm"
              title="Download full database JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-gold-light" />
              <span>Full Master Backup</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="btn-press p-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] hover:border-gold/40 text-stone-400 hover:text-gold-light transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ── */}
      {notification && (
        <div className={`p-3.5 rounded-2xl border font-mono text-xs flex items-center justify-between animate-fade-in ${
          notification.type === 'error'
            ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
            : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-stone-400 hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Stores */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-stone-400">
              Registered Stores
            </span>
            <Store className="w-4 h-4 text-gold-light" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-stone-100">
            {totalStoresCount}
          </div>
          <p className="text-[10px] font-mono text-stone-400 mt-1">Merchant accounts created</p>
        </div>

        {/* Total Staff */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-stone-400">
              Total Staff Users
            </span>
            <Users className="w-4 h-4 text-amber-300" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-stone-100">
            {users.length}
          </div>
          <p className="text-[10px] font-mono text-stone-400 mt-1">
            {totalStaffCount} cashiers/leads + {users.length - totalStaffCount} owners
          </p>
        </div>

        {/* Total Platform Sales */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-stone-400">
              Platform Sales
            </span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-300">
            {totalTransactions}
          </div>
          <p className="text-[10px] font-mono text-stone-400 mt-1">Transactions recorded</p>
        </div>

        {/* Monetag Revenue Engine Status */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-gold/30 relative overflow-hidden bg-amber-500/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-gold-light">
              Monetag Ads Engine
            </span>
            <Sparkles className="w-4 h-4 text-gold" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-gold-light">
              {adStats?.total_ads_watched || 0}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">● Active</span>
          </div>
          <p className="text-[10px] font-mono text-gold-muted mt-1 truncate">
            Zones 11879014 &amp; 11879016 Live
          </p>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950/70 border border-white/[0.08]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores, owners, staff names, or usernames..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/60 border border-white/[0.07] focus:border-gold/60 text-stone-100 text-xs font-medium placeholder-stone-600 focus:outline-none transition-all"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(['ALL', 'OWNERS', 'STAFF'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterRole(mode)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase border transition-all ${
                filterRole === mode
                  ? 'bg-amber-500/20 border-gold text-gold-light shadow-glow-gold'
                  : 'bg-zinc-900/40 border-white/[0.06] text-stone-400 hover:text-stone-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ── STORES & USERS REGISTRY ── */}
      <div className="space-y-4">
        {filteredStoreEntries.length === 0 ? (
          <div className="p-8 text-center rounded-3xl glass-card border border-white/[0.08]">
            <Store className="w-8 h-8 text-stone-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-300">No matching stores or users found</p>
            <p className="text-xs font-mono text-stone-500 mt-1">Try changing search query or register a new store</p>
          </div>
        ) : (
          filteredStoreEntries.map(([storeName, group]) => {
            const isExpanded = expandedStores[storeName] !== false
            const owner = group.owner
            const staffList = group.staff
            const isPlatformMasterStore = owner?.username.toLowerCase() === 'skorts188@gmail.com'

            return (
              <div
                key={storeName}
                className="rounded-3xl glass-card border border-white/[0.08] hover:border-gold/30 transition-all overflow-hidden"
              >
                {/* Store Header Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40 border-b border-white/[0.06]">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <button
                      onClick={() => toggleStoreExpand(storeName)}
                      className="p-1 rounded-lg hover:bg-white/[0.06] text-stone-400 transition-colors mt-0.5 sm:mt-0"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gold-light" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-gold/30 flex items-center justify-center text-amber-300 shrink-0 font-serif font-bold text-sm">
                      <Store className="w-5 h-5 text-gold-light" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-base sm:text-lg font-bold text-stone-100 tracking-wide">
                          {storeName}
                        </h3>
                        {isPlatformMasterStore ? (
                          <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-light font-mono text-[9px] font-extrabold uppercase border border-gold/40">
                            PLATFORM HQ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-mono text-[9px] font-semibold uppercase border border-emerald-500/30">
                            Merchant Store
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px] text-stone-400 mt-1 flex-wrap">
                        {owner && (
                          <span>
                            Owner: <span className="text-stone-200 font-semibold">{owner.name}</span> (@{owner.username})
                          </span>
                        )}
                        {owner?.email && (
                          <span>• Contact: <span className="text-stone-300">{owner.email}</span></span>
                        )}
                        <span>• <span className="text-gold-light font-bold">{staffList.length}</span> Staff accounts</span>
                      </div>
                    </div>
                  </div>

                  {/* Store Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {!isPlatformMasterStore && onMasqueradeStore && (
                      <button
                        onClick={() => onMasqueradeStore(storeName, owner)}
                        className="btn-press px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-gold/40 text-gold-light font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                        title={`Manage ${storeName} POS as Master Admin`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Enter Store</span>
                      </button>
                    )}

                    {!isPlatformMasterStore && owner && (
                      <button
                        onClick={() => handleOpenStorePassModal(storeName, owner)}
                        className="btn-press px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                        title="Manage Store Pass, Time & Tokens"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Manage Pass</span>
                      </button>
                    )}

                    {!isPlatformMasterStore && (
                      <button
                        onClick={() => {
                          setStaffTargetStore(storeName)
                          setStaffTargetOwner(owner?.username || '')
                          setShowAddStaffModal(true)
                        }}
                        className="btn-press px-3 py-1.5 rounded-xl bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold-light font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Add Staff</span>
                      </button>
                    )}

                    {owner && (
                      <button
                        onClick={() => setEditingPinUser(owner)}
                        className="btn-press px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/[0.08] hover:border-gold/40 text-stone-300 text-[10px] font-mono flex items-center gap-1.5"
                        title="Reset Owner PIN"
                      >
                        <KeyRound className="w-3 h-3 text-gold-light" />
                        <span>PIN</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Store Staff Table */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-widest text-stone-400 pb-2">
                            <th className="py-2.5 px-3">Account / User</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Security PIN</th>
                            <th className="py-2.5 px-3">Ad Requirement</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {/* Owner row first if exists */}
                          {owner && (
                            <tr className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  {owner.avatar_url ? (
                                    <img
                                      src={owner.avatar_url}
                                      alt={owner.name}
                                      className="w-8 h-8 rounded-xl object-cover border border-gold/40 shadow-glow-gold shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-[#D4AF37] text-obsidian-950 font-serif font-bold text-xs flex items-center justify-center shrink-0">
                                      {owner.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                                      {isPlatformMasterStore && <Crown className="w-3.5 h-3.5 text-gold" />}
                                      <span>{owner.name}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-stone-400">@{owner.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider ${
                                  isPlatformMasterStore
                                    ? 'bg-gradient-to-r from-amber-500/20 to-gold/20 text-gold-light border border-gold/40'
                                    : 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                                }`}>
                                  {isPlatformMasterStore ? 'PLATFORM MASTER' : 'STORE OWNER'}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono">
                                <div className="flex items-center gap-1.5">
                                  <span>
                                    {revealedPins[owner.id || 0] ? owner.pin : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => toggleRevealPin(owner.id)}
                                    className="p-1 text-stone-500 hover:text-stone-300"
                                    title="Toggle PIN Visibility"
                                  >
                                    {revealedPins[owner.id || 0] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => handleCopyPin(owner.pin, owner.username, owner.id)}
                                    className="p-1 text-stone-500 hover:text-gold-light transition-colors"
                                    title="Copy PIN"
                                  >
                                    {copiedUserId === owner.id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px]">
                                {isPlatformMasterStore ? (
                                  <span className="text-emerald-400 font-bold">EXEMPT (ZERO ADS)</span>
                                ) : (
                                  <span className="text-amber-300">Requires Ad Shift (+1h/+2h/+3h)</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  ACTIVE
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingPinUser(owner)}
                                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-stone-300 border border-white/[0.08]"
                                    title="Reset PIN"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-gold-light" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Staff rows */}
                          {staffList.map((staff) => (
                            <tr key={staff.id || staff.username} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  {staff.avatar_url ? (
                                    <img
                                      src={staff.avatar_url}
                                      alt={staff.name}
                                      className="w-8 h-8 rounded-xl object-cover border border-white/20 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 text-stone-300 font-serif font-bold text-xs flex items-center justify-center shrink-0">
                                      {staff.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-semibold text-stone-200">{staff.name}</div>
                                    <div className="text-[10px] font-mono text-stone-400">@{staff.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider ${
                                  staff.role === 'INVENTORY_LEAD'
                                    ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                    : 'bg-zinc-800 text-stone-300 border border-white/[0.08]'
                                }`}>
                                  {staff.role}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono">
                                <div className="flex items-center gap-1.5">
                                  <span>
                                    {revealedPins[staff.id || 0] ? staff.pin : '••••'}
                                  </span>
                                  <button
                                    onClick={() => toggleRevealPin(staff.id)}
                                    className="p-1 text-stone-500 hover:text-stone-300"
                                    title="Toggle PIN Visibility"
                                  >
                                    {revealedPins[staff.id || 0] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => handleCopyPin(staff.pin, staff.username, staff.id)}
                                    className="p-1 text-stone-500 hover:text-gold-light transition-colors"
                                    title="Copy PIN"
                                  >
                                    {copiedUserId === staff.id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-amber-300">
                                Requires Ad Shift (30s Cooldown)
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  onClick={() => handleToggleStatus(staff)}
                                  className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                    staff.status === 'ACTIVE'
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                      : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                  {staff.status}
                                </button>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingPinUser(staff)}
                                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-stone-300 border border-white/[0.08]"
                                    title="Reset PIN"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-gold-light" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(staff)}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                                    title="Delete Staff"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {staffList.length === 0 && (
                      <div className="p-3 text-center rounded-xl bg-zinc-900/40 border border-white/[0.04]">
                        <p className="font-mono text-[11px] text-stone-500">
                          No sub-staff accounts created yet for this store. Store owner can add staff via Settings.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── MODAL: ADD STORE / MERCHANT ── */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-md rounded-3xl glass-vault border border-gold/40 p-6 sm:p-7 shadow-vault text-stone-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-gold-light" />
                <h3 className="font-serif text-base font-bold text-stone-100 uppercase tracking-wider">
                  Register Merchant Store
                </h3>
              </div>
              <button
                onClick={() => setShowAddStoreModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  Store / Business Name *
                </label>
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="e.g. Aling Nena's Sari-Sari Store"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-stone-100 text-xs font-medium placeholder-stone-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  Store Owner Full Name *
                </label>
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-stone-100 text-xs font-medium placeholder-stone-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  Owner Username *
                </label>
                <input
                  type="text"
                  value={newOwnerUsername}
                  onChange={(e) => setNewOwnerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. mariasari"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-stone-100 text-xs font-mono placeholder-stone-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  Contact Email / Phone (Optional)
                </label>
                <input
                  type="text"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="e.g. 0917-123-4567 or maria@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-stone-100 text-xs placeholder-stone-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  Security PIN / Password (Min 4 chars) *
                </label>
                <input
                  type="text"
                  value={newOwnerPin}
                  onChange={(e) => setNewOwnerPin(e.target.value)}
                  placeholder="e.g. 1234 or secret123"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-gold-light font-mono text-xs placeholder-stone-600 focus:outline-none"
                />
              </div>

              {storeModalError && (
                <p className="text-[11px] font-mono text-red-400">{storeModalError}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="btn-press px-4 py-2.5 rounded-xl bg-zinc-900 text-stone-400 font-mono text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-glow-gold"
                >
                  Register Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD STAFF FOR STORE ── */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-md rounded-3xl glass-vault border border-gold/40 p-6 sm:p-7 shadow-vault text-stone-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-100 uppercase tracking-wider">
                  Add Staff Account
                </h3>
                <p className="font-mono text-[10px] text-gold-muted">
                  Store: {staffTargetStore}
                </p>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  Full Staff Name *
                </label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Juan De La Cruz"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-stone-100 text-xs font-medium placeholder-stone-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  Staff Username / ID *
                </label>
                <input
                  type="text"
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. juan_cashier"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-stone-100 text-xs font-mono placeholder-stone-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1.5">
                  Assigned Staff Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { role: 'CASHIER' as UserRole, label: 'Cashier', desc: 'Front Register POS' },
                    { role: 'INVENTORY_LEAD' as UserRole, label: 'Inventory', desc: 'Stocks & Pricing' }
                  ].map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setNewStaffRole(r.role)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        newStaffRole === r.role
                          ? 'bg-amber-500/20 border-gold text-gold-light'
                          : 'bg-zinc-900/60 border-white/[0.06] text-stone-400'
                      }`}
                    >
                      <div className="text-xs font-semibold text-stone-200">{r.label}</div>
                      <div className="text-[9px] font-mono text-stone-500">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  4-Digit Security PIN *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-gold-light font-mono text-center tracking-widest focus:outline-none"
                />
              </div>

              {staffModalError && (
                <p className="text-[11px] font-mono text-red-400">{staffModalError}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="btn-press px-4 py-2.5 rounded-xl bg-zinc-900 text-stone-400 font-mono text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-glow-gold"
                >
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PIN ── */}
      {editingPinUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl glass-vault border border-gold/40 p-6 shadow-vault text-stone-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-gold-light" />
                <h3 className="font-serif text-sm font-bold text-stone-100 uppercase tracking-wider">
                  Reset Account PIN
                </h3>
              </div>
              <button
                onClick={() => setEditingPinUser(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPin} className="space-y-3">
              <p className="text-xs text-stone-300 font-mono">
                Updating credentials for: <span className="text-gold-light font-bold">@{editingPinUser.username}</span> ({editingPinUser.name})
              </p>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                  New Security PIN / Password
                </label>
                <input
                  type="text"
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value)}
                  placeholder="Enter new PIN or password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] focus:border-gold/60 text-gold-light font-mono text-center tracking-widest focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPinUser(null)}
                  className="btn-press px-3.5 py-2 rounded-xl bg-zinc-900 text-stone-400 font-mono text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-glow-gold"
                >
                  Save New PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: STORE PASS & TOKEN AUTHORITY (MASTER OVERRIDE) ── */}
      {passTargetStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/85 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl glass-vault border border-gold/50 p-6 sm:p-7 shadow-vault text-stone-100 animate-scale-up space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-gold/40 flex items-center justify-center text-gold-light">
                  <Zap className="w-5 h-5 text-gold-light" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-100 uppercase tracking-wide">
                    Store Pass Authority
                  </h3>
                  <p className="text-[11px] font-mono text-gold-muted">
                    {passTargetStore.storeName} &bull; Owner @{passTargetStore.owner?.username || 'unknown'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPassTargetStore(null)}
                className="text-stone-400 hover:text-stone-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingPassState ? (
              <div className="py-8 text-center text-xs font-mono text-stone-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gold-light" />
                <span>Loading store pass records...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status summary */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-950/80 border border-white/[0.08]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-stone-400 block">
                      Current Shift Pass
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-gold-light block truncate">
                      {passOwnerState?.owner_bypass
                        ? '👑 LIFETIME VIP BYPASS'
                        : passOwnerState?.pro_expires_at && passOwnerState.pro_expires_at > Date.now()
                        ? `${Math.ceil((passOwnerState.pro_expires_at - Date.now()) / (1000 * 3600))} Hours Remaining`
                        : '00:00:00 (EXPIRED)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-stone-400 block">
                      Token Balance
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-300 block truncate">
                      {passOwnerState?.tokens || 0} Tokens ({((passOwnerState?.tokens || 0) / 3).toFixed(1)} Days)
                    </span>
                  </div>
                </div>

                {/* 1-Click Time Grant */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block">
                    1-Click VIP Time Grant (Bypasses Ads)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleGrantTime(24)}
                      className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-gold/30 text-gold-light font-mono text-xs font-bold transition-all text-center"
                    >
                      +1 Day (24h)
                    </button>
                    <button
                      onClick={() => handleGrantTime(168)}
                      className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-gold/30 text-gold-light font-mono text-xs font-bold transition-all text-center"
                    >
                      +7 Days (1wk)
                    </button>
                    <button
                      onClick={() => handleGrantTime(720)}
                      className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-gold/30 text-gold-light font-mono text-xs font-bold transition-all text-center"
                    >
                      +30 Days (1mo)
                    </button>
                  </div>
                </div>

                {/* Grant Tokens to Wallet */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block">
                    Grant Tokens to Store Wallet
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleGrantTokens(3)}
                      className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-stone-200 font-mono text-xs font-bold transition-all text-center"
                    >
                      +3 Tokens (1d)
                    </button>
                    <button
                      onClick={() => handleGrantTokens(9)}
                      className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-stone-200 font-mono text-xs font-bold transition-all text-center"
                    >
                      +9 Tokens (3d)
                    </button>
                    <button
                      onClick={() => handleGrantTokens(30)}
                      className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-stone-200 font-mono text-xs font-bold transition-all text-center"
                    >
                      +30 Tokens (10d)
                    </button>
                  </div>
                </div>

                {/* Supreme Overrides */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={handleToggleVipBypass}
                    className={`py-2 px-3.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                      passOwnerState?.owner_bypass
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-zinc-900 text-stone-300 border-white/[0.1] hover:border-gold/40'
                    }`}
                  >
                    {passOwnerState?.owner_bypass ? '👑 VIP Bypass Active (Disable)' : '👑 Grant Lifetime VIP Bypass'}
                  </button>

                  <button
                    onClick={handleExpireStorePassNow}
                    className="py-2 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-mono text-xs font-bold transition-all"
                  >
                    🔴 Expire & Lock Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
