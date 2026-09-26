import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Crown } from 'lucide-react'
import type { Product, Category, Transaction, HeldCart, Customer, StoreSettings, CartItem, DiscountType, Expense } from './types'
import { db, DEFAULT_SETTINGS, initDatabase } from './db'
import { Navigation, type ActiveTab } from './components/Navigation'
import { DashboardScreen } from './components/DashboardScreen'
import { POSScreen } from './components/POSScreen'
import { InventoryScreen } from './components/InventoryScreen'
import { AnalyticsScreen } from './components/AnalyticsScreen'
import { CustomersScreen } from './components/CustomersScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { TransactionsScreen } from './components/TransactionsScreen'
import { ExpensesScreen } from './components/ExpensesScreen'
import { SuppliersScreen } from './components/SuppliersScreen'
import { PriceGuideModal } from './components/PriceGuideModal'
import { ExpirationTrackerModal } from './components/ExpirationTrackerModal'
import { CheckoutModal } from './components/CheckoutModal'
import { VaultAuthModal, type VaultSession } from './components/VaultAuthModal'
import { RewardedAdModal } from './components/RewardedAdModal'
import { MasterControlScreen } from './components/MasterControlScreen'
import { UserProfileModal } from './components/UserProfileModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useProAccess } from './services/proAccess'
import { sendHeartbeat } from './services/cloudSync'

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const proAccess = useProAccess()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([])
  const [loading, setLoading] = useState(true)

  // Fast Tools Modal States
  const [isPriceGuideOpen, setIsPriceGuideOpen] = useState(false)
  const [isExpirationOpen, setIsExpirationOpen] = useState(false)

  // Vault Session / Cashier Authentication State (Screen 1 vs Screen 2)
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(() => {
    try {
      const saved = localStorage.getItem('tinda_vault_session')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(!vaultSession)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // Sync avatar with IndexedDB
  useEffect(() => {
    const syncSessionAvatar = async () => {
      if (!vaultSession?.username) return
      try {
        const u = await db.users.where('username').equalsIgnoreCase(vaultSession.username).first()
        if (u && u.avatar_url && u.avatar_url !== vaultSession.avatarUrl) {
          const updated = { ...vaultSession, avatarUrl: u.avatar_url }
          setVaultSession(updated)
          localStorage.setItem('tinda_vault_session', JSON.stringify(updated))
        }
      } catch (err) {
        console.error('Failed to sync avatar:', err)
      }
    }
    syncSessionAvatar()
  }, [vaultSession?.username, vaultSession?.avatarUrl])

  const handleUpdateAvatar = (avatarUrl?: string) => {
    if (!vaultSession) return
    const updated = { ...vaultSession, avatarUrl }
    setVaultSession(updated)
    try {
      localStorage.setItem('tinda_vault_session', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  // Real-time online presence heartbeat (every 25 seconds & on tab focus)
  useEffect(() => {
    if (!vaultSession?.username) return
    const ping = () => {
      sendHeartbeat(vaultSession.username)
    }
    ping()
    const timer = setInterval(ping, 25000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        ping()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [vaultSession?.username])

  // Checkout modal state
  const [checkoutData, setCheckoutData] = useState<{
    subtotal_c: number
    discount_c: number
    discount_type: DiscountType
    total_c: number
    customerId?: number | null
    quickTender_c?: number
  } | null>(null)

  // Master Admin Store Masquerade / Impersonate State
  const [masqueradeSession, setMasqueradeSession] = useState<{
    originalSession: VaultSession
    activeStore: string
  } | null>(null)

  const handleMasqueradeStore = (targetStoreName: string) => {
    if (!vaultSession) return
    setMasqueradeSession({
      originalSession: vaultSession,
      activeStore: targetStoreName
    })

    setVaultSession({
      ...vaultSession,
      storeName: targetStoreName,
      cashierName: `Master Admin (${targetStoreName})`
    })

    setActiveTab('pos')
  }

  const handleExitMasquerade = () => {
    if (!masqueradeSession) return
    setVaultSession(masqueradeSession.originalSession)
    setMasqueradeSession(null)
    setActiveTab('master-control')
  }

  // Active Store for multi-tenant isolation
  const activeStoreName = masqueradeSession
    ? masqueradeSession.activeStore
    : vaultSession?.isMasterAdmin
    ? (vaultSession.storeName || 'PLATFORM_HQ')
    : (vaultSession?.storeName || 'DEFAULT_STORE')

  // Load all data from Dexie scoped to active store
  const loadData = useCallback(async () => {
    try {
      await initDatabase()
      const [allProducts, allCategories, allTx, allCust, scopedSettingsRec, defaultSettingsRec, savedHeld, allExpenses, allUsers] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.transactions.orderBy('id').reverse().toArray(),
        db.customers.toArray(),
        db.settings.get(`store_settings_${activeStoreName}`),
        db.settings.get('store_settings'),
        db.held_carts.toArray(),
        db.expenses.orderBy('date').reverse().toArray(),
        db.users.toArray()
      ])

      // Auto-migrate untagged transactions or expenses based on cashier name
      const userStoreMap = new Map<string, string>()
      allUsers.forEach((u) => {
        const sName = u.store_name || (u.username === 'skorts188@gmail.com' ? 'PLATFORM_HQ' : `${u.name}'s Store`)
        if (u.name) userStoreMap.set(u.name.toLowerCase(), sName)
        if (u.username) userStoreMap.set(u.username.toLowerCase(), sName)
      })

      for (const tx of allTx) {
        if (!tx.store_name) {
          const matchedStore = (tx.cashier_name && userStoreMap.get(tx.cashier_name.toLowerCase())) || 'PLATFORM_HQ'
          tx.store_name = matchedStore
          db.transactions.update(tx.id, { store_name: matchedStore }).catch(() => {})
        }
      }

      for (const exp of allExpenses) {
        if (!exp.store_name) {
          const matchedStore = (exp.cashier_name && userStoreMap.get(exp.cashier_name.toLowerCase())) || 'PLATFORM_HQ'
          exp.store_name = matchedStore
          if (exp.id) db.expenses.update(exp.id, { store_name: matchedStore }).catch(() => {})
        }
      }

      // Filter data strictly by active store
      const filteredTx = allTx.filter((tx) => tx.store_name === activeStoreName)
      const filteredExpenses = allExpenses.filter((e) => e.store_name === activeStoreName)
      const filteredCustomers = allCust.filter(
        (c) => c.store_name === activeStoreName || (!c.store_name && activeStoreName === 'PLATFORM_HQ')
      )
      const filteredHeld = savedHeld.filter(
        (h) => h.store_name === activeStoreName || (!h.store_name && activeStoreName === 'PLATFORM_HQ')
      )
      const filteredProducts = allProducts.filter(
        (p) => p.store_name === activeStoreName || (!p.store_name && (activeStoreName === 'PLATFORM_HQ' || allUsers.length <= 1))
      )

      setProducts(filteredProducts)
      setCategories(allCategories)
      setTransactions(filteredTx)
      setCustomers(filteredCustomers)

      const effectiveSettings = scopedSettingsRec?.value || defaultSettingsRec?.value || {
        ...DEFAULT_SETTINGS,
        store_name: activeStoreName !== 'PLATFORM_HQ' ? activeStoreName : DEFAULT_SETTINGS.store_name
      }
      setSettings(effectiveSettings)

      setHeldCarts(filteredHeld)
      setExpenses(filteredExpenses)
    } catch (e) {
      console.error('Failed to load database:', e)
    } finally {
      setLoading(false)
    }
  }, [activeStoreName])

  useEffect(() => {
    loadData()
  }, [loadData])

  // On page refresh: if a session is already saved, restore that user's pro state
  useEffect(() => {
    if (vaultSession && !vaultSession.isMasterAdmin && vaultSession.userId) {
      const userId = vaultSession.userId ?? vaultSession.username ?? 'guest'
      proAccess.loadStateForUser(userId)
    } else if (vaultSession?.isMasterAdmin) {
      proAccess.toggleOwnerBypass(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount only

  // Hold Cart functionality
  const handleHoldCart = async () => {
    if (cart.length === 0) return
    const newHeld: HeldCart = {
      id: `HELD-${Date.now()}`,
      created_at: new Date().toISOString(),
      items: cart,
      customer_id: null,
      discount_type: 'NONE',
      store_name: activeStoreName
    }
    await db.held_carts.add(newHeld)
    setCart([])
    await loadData()
  }

  const handleResumeCart = async (held: HeldCart) => {
    setCart(held.items)
    await db.held_carts.delete(held.id)
    await loadData()
  }

  // Checkout triggers
  const handleInitiateCheckout = (
    subtotal_c: number,
    discount_c: number,
    discount_type: DiscountType,
    total_c: number,
    customerId?: number | null,
    quickTender_c?: number
  ) => {
    setCheckoutData({
      subtotal_c,
      discount_c,
      discount_type,
      total_c,
      customerId,
      quickTender_c
    })
  }

  const handleTransactionComplete = async (tx: Transaction) => {
    setCheckoutData(null)
    setCart([])
    await loadData()
  }

  // Save Settings
  const handleSaveSettings = async (newSettings: StoreSettings) => {
    await db.settings.put({ key: `store_settings_${activeStoreName}`, value: newSettings })
    await db.settings.put({ key: 'store_settings', value: newSettings })
    setSettings(newSettings)
  }

  // Handle Vault Session Onboarding
  const handleAuthenticated = async (session: VaultSession, isNewAccount = false) => {
    setVaultSession(session)
    setIsVaultLocked(false)
    try {
      localStorage.setItem('tinda_vault_session', JSON.stringify(session))
    } catch {
      // ignore
    }

    if (session.isMasterAdmin) {
      // Platform Master Admin: lifetime bypass, no ads ever
      await proAccess.toggleOwnerBypass(true)
    } else {
      // Load THIS user's own pro access state (per userId)
      const userId = session.userId ?? session.username ?? 'guest'
      const userState = await proAccess.loadStateForUser(userId)

      // Reset bypass in case previous session was master admin
      // (loadStateForUser already sets state, but bypass could be stale)
      const needsAds = isNewAccount ||
        userState.tokens < 3 ||
        userState.pro_expires_at <= Date.now()

      if (needsAds) {
        setTimeout(() => {
          proAccess.openRewardModal(
            isNewAccount
              ? 'Welcome! Watch 3 ads to unlock all features 🎯'
              : 'Watch ads to extend your access time ⏰'
          )
        }, 350)
      }
    }
  }

  const handleLockTerminal = () => {
    try {
      localStorage.removeItem('tinda_vault_session')
    } catch {
      // ignore
    }
    proAccess.toggleOwnerBypass(false)
    setCart([])
    setMasqueradeSession(null)
    setVaultSession(null)
    setIsVaultLocked(true)
  }

  // Quick restock from low-stock alert
  const handleQuickRestock = async (product: Product, addQty: number) => {
    try {
      const newStock = Math.max(0, product.stock + addQty)
      await db.products.update(product.id, {
        stock: newStock,
        updated_at: new Date().toISOString()
      })
      await loadData()
    } catch (e) {
      console.error('Failed to quick restock:', e)
    }
  }

  // Calculate low stock items count
  const defaultLowStock = settings.default_low_stock ?? 5
  const lowStockCount = products.filter(
    (p) => p.stock <= (p.low_stock_threshold !== undefined && p.low_stock_threshold !== null ? p.low_stock_threshold : defaultLowStock)
  ).length

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center text-stone-300">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-200/15 via-gold/15 to-transparent border border-gold/40 shadow-glow-gold animate-pulse">
          <span className="font-serif text-3xl font-bold tracking-widest text-gold-light">T</span>
          <div className="absolute -inset-1 rounded-2xl bg-gold/10 blur-[6px] -z-10" />
        </div>
        <p className="mt-5 font-serif text-xs font-bold tracking-[0.3em] text-gold-light uppercase">
          INITIALIZING TINDA PRIVATE TERMINAL...
        </p>
      </div>
    )
  }

  const isUserAdmin =
    vaultSession?.isAdmin ??
    (vaultSession?.userRole === 'ADMIN' ||
      vaultSession?.cashierRole?.toLowerCase().includes('admin') ||
      !vaultSession)

  // Pro Feature Gatekeeper Tab Selection
  const handleSelectTab = (tab: ActiveTab) => {
    const PRO_TABS: Record<string, string> = {
      analytics: 'Analytics & Z-Readings',
      expenses: 'Expenses Tracker',
      suppliers: 'Suppliers Directory',
    }

    if (PRO_TABS[tab]) {
      proAccess.requireProFeature(PRO_TABS[tab], () => {
        setActiveTab(tab)
      })
      return
    }

    setActiveTab(tab)
  }

  // Fast Tools Pro Gatekeeper
  const handleOpenPriceGuide = () => {
    proAccess.requireProFeature('DTI Price Guide & SRP Matcher', () => {
      setIsPriceGuideOpen(true)
    })
  }

  const handleOpenExpiration = () => {
    proAccess.requireProFeature('Shelf Life Expiry Watch', () => {
      setIsExpirationOpen(true)
    })
  }

  return (
    <div className="min-h-screen bg-obsidian-950 text-stone-100 flex flex-col md:flex-row selection:bg-amber-400 selection:text-obsidian-950 font-sans">
      {/* Executive Vertical Navigation Sidebar & Mobile Bottom Nav */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        lowStockCount={lowStockCount}
        cashierName={vaultSession?.cashierName || 'Master Admin'}
        cashierRole={vaultSession?.cashierRole || 'Administrator'}
        avatarUrl={vaultSession?.avatarUrl}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLockTerminal={handleLockTerminal}
        onOpenPriceGuide={handleOpenPriceGuide}
        onOpenExpiration={handleOpenExpiration}
        proFormattedTime={proAccess.formattedTime}
        isPro={proAccess.isPro}
        isMasterAdmin={vaultSession?.isMasterAdmin || false}
        onOpenProModal={() => proAccess.openRewardModal('Account Pro Access')}
      />

      {/* Main Screen Router */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-6 flex flex-col">
        {/* Master Admin Masquerade / Store Impersonate Top Bar */}
        {masqueradeSession && (
          <div className="bg-gradient-to-r from-amber-600 via-gold to-amber-500 text-obsidian-950 px-4 py-2 flex items-center justify-between shadow-xl sticky top-0 z-50 animate-fade-in font-mono text-xs">
            <div className="flex items-center gap-2 font-bold tracking-wide">
              <Crown className="w-4 h-4 fill-current text-obsidian-950" />
              <span>MASQUERADE MODE: Managing Store "{masqueradeSession.activeStore}" as Master Admin</span>
            </div>
            <button
              onClick={handleExitMasquerade}
              className="bg-obsidian-950 text-gold-light hover:bg-zinc-900 border border-gold/40 px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>↩ Return to Master Control</span>
            </button>
          </div>
        )}

        {/* Desktop & Tablet Top Status Bar with real-time shift time limit */}
        <div className="hidden md:flex items-center justify-between px-4 lg:px-6 py-2.5 bg-obsidian-950/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30 min-w-0 gap-3">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0 truncate">
            <span className="font-mono text-[11px] tracking-widest uppercase text-stone-400 shrink-0">
              Terminal <span className="text-gold-light font-bold">{vaultSession?.terminalId || 'TRM-8891'}</span>
            </span>
            <span className="text-stone-600 shrink-0">•</span>
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 font-mono text-[11px] text-stone-400 hover:text-white transition-colors cursor-pointer min-w-0 truncate"
              title="View & Edit Account Profile"
            >
              {vaultSession?.avatarUrl ? (
                <img
                  src={vaultSession.avatarUrl}
                  alt={vaultSession?.cashierName || 'Cashier'}
                  className="w-5 h-5 rounded-full object-cover border border-amber-400/40 shrink-0"
                />
              ) : null}
              <span className="truncate">
                Cashier: <span className="text-stone-200 font-semibold">{vaultSession?.cashierName || 'Staff'}</span>
                <span className="hidden lg:inline text-stone-400 font-normal"> ({vaultSession?.cashierRole || 'Staff'})</span>
              </span>
            </button>
          </div>

          {vaultSession?.isMasterAdmin ? (
            <button
              onClick={() => handleSelectTab('master-control')}
              className="flex items-center gap-2 px-3 py-1 rounded-full border border-gold/60 bg-gradient-to-r from-amber-500/20 via-gold/15 to-amber-500/20 text-gold-light text-xs font-mono font-bold shadow-glow-gold hover:border-gold transition-all shrink-0"
            >
              <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
              <span className="hidden lg:inline">SUPER ADMIN · ZERO ADS</span>
              <span className="lg:hidden">SUPER ADMIN</span>
              <span className="text-[10px] text-gold underline ml-1">Control →</span>
            </button>
          ) : (
            <button
              onClick={() => proAccess.openRewardModal('Account Pro Access')}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold transition-all shrink-0 ${
                proAccess.isPro
                  ? 'bg-amber-500/10 border-gold/40 text-gold-light hover:border-gold shadow-glow-gold'
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:border-rose-500 animate-pulse'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-gold-muted shrink-0" />
              <span className="hidden lg:inline">Shift Time Limit:</span>
              <span className="font-mono font-extrabold tracking-wider">{proAccess.formattedTime}</span>
              <span className="text-[10px] text-gold underline ml-1">
                {proAccess.isPro ? '+ Extend' : '⚡ Unlock'}
              </span>
            </button>
          )}
        </div>

        {activeTab === 'dashboard' && (
          <DashboardScreen
            products={products}
            transactions={transactions}
            customers={customers}
            expenses={expenses}
            settings={settings}
            onNavigate={handleSelectTab}
            onQuickRestock={handleQuickRestock}
            onOpenPriceGuide={handleOpenPriceGuide}
            onOpenExpiration={handleOpenExpiration}
          />
        )}

        {activeTab === 'pos' && (
          <POSScreen
            products={products}
            categories={categories}
            customers={customers}
            cart={cart}
            setCart={setCart}
            heldCarts={heldCarts}
            onHoldCart={handleHoldCart}
            onResumeCart={handleResumeCart}
            onCheckout={handleInitiateCheckout}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsScreen
            transactions={transactions}
            settings={settings}
            onTransactionVoided={loadData}
            isAdmin={isUserAdmin}
            currentCashierName={vaultSession?.cashierName || 'Master Admin'}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryScreen
            products={products}
            categories={categories}
            onRefresh={loadData}
            cashierName={vaultSession?.cashierName}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersScreen
            customers={customers}
            onRefresh={loadData}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesScreen
            cashierName={vaultSession?.cashierName || 'Master Admin'}
            onExpensesChanged={loadData}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersScreen />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsScreen
            transactions={transactions}
            cashierName={vaultSession?.cashierName || 'Master Admin'}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onRefreshAll={loadData}
            isAdmin={isUserAdmin}
            currentCashierName={vaultSession?.cashierName}
            currentCashierRole={vaultSession?.cashierRole}
            currentSessionStoreName={activeStoreName}
            isMasterAdmin={vaultSession?.isMasterAdmin || false}
            currentUserId={vaultSession?.userId}
            currentUsername={vaultSession?.username}
            currentUserAvatar={vaultSession?.avatarUrl}
            onUpdateAvatar={handleUpdateAvatar}
          />
        )}

        {activeTab === 'master-control' && (
          <ErrorBoundary fallbackTitle="Master Control Console Error">
            <MasterControlScreen
              currentCashierName={vaultSession?.cashierName}
              isMasterAdmin={vaultSession?.isMasterAdmin || false}
              onRefreshAll={loadData}
              onMasqueradeStore={handleMasqueradeStore}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Screen 1: Cashier Login & Shift Float Onboarding Modal */}
      <VaultAuthModal
        isOpen={isVaultLocked}
        onAuthenticated={handleAuthenticated}
        currentCashier={vaultSession?.cashierName}
      />

      {/* Checkout Modal (Private Settlement Authorization) */}
      {checkoutData && (
        <CheckoutModal
          items={cart}
          subtotal_c={checkoutData.subtotal_c}
          discount_c={checkoutData.discount_c}
          discount_type={checkoutData.discount_type}
          total_c={checkoutData.total_c}
          customers={customers}
          selectedCustomerId={checkoutData.customerId || null}
          presetTender_c={checkoutData.quickTender_c}
          cashierName={vaultSession?.cashierName}
          storeName={activeStoreName}
          settings={settings}
          terminalId={vaultSession?.terminalId || 'TRM-8891'}
          onClose={() => setCheckoutData(null)}
          onComplete={handleTransactionComplete}
        />
      )}

      {/* DTI SRP Bantay Presyo Modal */}
      <PriceGuideModal
        isOpen={isPriceGuideOpen}
        onClose={() => setIsPriceGuideOpen(false)}
        existingProducts={products}
        onProductAdded={loadData}
        storeName={activeStoreName}
      />

      {/* Expiration Tracker & Perishable Watch Modal */}
      <ExpirationTrackerModal
        isOpen={isExpirationOpen}
        onClose={() => setIsExpirationOpen(false)}
        products={products}
        onProductsUpdated={loadData}
      />

      {/* User Profile & Avatar Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUserId={vaultSession?.userId}
        currentUsername={vaultSession?.username}
        currentCashierName={vaultSession?.cashierName || 'Cashier'}
        currentCashierRole={vaultSession?.cashierRole || 'Staff'}
        currentStoreName={vaultSession?.storeName || activeStoreName}
        currentAvatarUrl={vaultSession?.avatarUrl}
        isMasterAdmin={vaultSession?.isMasterAdmin || false}
        onUpdateAvatar={handleUpdateAvatar}
      />

      {/* Rewarded Ad & Pro Time-Bank Gatekeeper Modal */}
      <RewardedAdModal
        open={proAccess.gateModalOpen}
        onClose={() => { if (vaultSession?.isMasterAdmin || proAccess.isPro) proAccess.closeRewardModal() }}
        blockedFeatureName={proAccess.pendingFeatureName}
        formattedTime={proAccess.formattedTime}
        isPro={proAccess.isPro}
        isFullyUnlocked={proAccess.isFullyUnlocked}
        remainingSeconds={proAccess.remainingSeconds}
        cooldownRemaining={proAccess.cooldownRemaining}
        canWatchAd={proAccess.canWatchAd}
        totalAdsWatched={proAccess.state.total_ads_watched}
        tokens={proAccess.state.tokens}
        onGrantReward={proAccess.grantRewardMinutes}
        onRedeemPackage={proAccess.redeemPackage}
        onExpireTest={proAccess.expireNowForTesting}
        ownerBypass={proAccess.state.owner_bypass}
        onToggleOwnerBypass={proAccess.toggleOwnerBypass}
        isMasterAdmin={vaultSession?.isMasterAdmin ?? false}
      />
      {/* HARD GATE: Full app lockout when store shift pass expires — non-master-admin */}
      {!isVaultLocked && vaultSession && !vaultSession.isMasterAdmin && !proAccess.isPro && !proAccess.gateModalOpen && (
        <div className="fixed inset-0 z-[200] bg-zinc-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-rose-950/60 border border-rose-700/40 flex items-center justify-center">
              <span className="text-5xl select-none">🔒</span>
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Store Shift Locked</h2>
              <p className="text-sm text-stone-400 mt-2 font-sans leading-relaxed max-w-sm mx-auto">
                Your store shift pass has expired. Watch a sponsor ad to earn tokens,
                then activate a shift pass to continue using TINDA POS.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-700/30">
              <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">Shift Pass Timer</p>
              <p className="text-4xl font-mono font-bold text-rose-400 mt-1">00:00:00</p>
              <p className="text-[10px] font-mono text-stone-600 mt-1">Expired — watch ads to earn tokens</p>
            </div>
            <button
              onClick={() => proAccess.openRewardModal('Store Shift Pass')}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm tracking-wider uppercase shadow-lg transition-all"
            >
              ⚡ Watch Sponsor Ad — Earn Tokens
            </button>
            <button
              onClick={() => {
                try { localStorage.removeItem('tinda_vault_session') } catch {}
                window.location.reload()
              }}
              className="text-xs font-mono text-stone-600 hover:text-stone-300 underline transition-colors mt-2"
            >
              Switch Account / Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

