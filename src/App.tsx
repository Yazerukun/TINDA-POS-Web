import React, { useState, useEffect, useCallback } from 'react'
import type { Product, Category, Transaction, HeldCart, Customer, StoreSettings, CartItem, DiscountType } from './types'
import { db, DEFAULT_SETTINGS, initDatabase } from './db'
import { Navigation, type ActiveTab } from './components/Navigation'
import { DashboardScreen } from './components/DashboardScreen'
import { POSScreen } from './components/POSScreen'
import { InventoryScreen } from './components/InventoryScreen'
import { AnalyticsScreen } from './components/AnalyticsScreen'
import { CustomersScreen } from './components/CustomersScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { CheckoutModal } from './components/CheckoutModal'
import { VaultAuthModal, type VaultSession } from './components/VaultAuthModal'

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([])
  const [loading, setLoading] = useState(true)

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

  // Checkout modal state
  const [checkoutData, setCheckoutData] = useState<{
    subtotal_c: number
    discount_c: number
    discount_type: DiscountType
    total_c: number
    customerId?: number | null
    quickTender_c?: number
  } | null>(null)

  // Load all data from Dexie
  const loadData = useCallback(async () => {
    try {
      await initDatabase()
      const [allProducts, allCategories, allTx, allCust, savedSettings, savedHeld] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.transactions.orderBy('id').reverse().toArray(),
        db.customers.toArray(),
        db.settings.get('store_settings'),
        db.held_carts.toArray()
      ])

      setProducts(allProducts)
      setCategories(allCategories)
      setTransactions(allTx)
      setCustomers(allCust)
      if (savedSettings?.value) {
        setSettings(savedSettings.value)
      }
      setHeldCarts(savedHeld)
    } catch (e) {
      console.error('Failed to load database:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Hold Cart functionality
  const handleHoldCart = async () => {
    if (cart.length === 0) return
    const newHeld: HeldCart = {
      id: `HELD-${Date.now()}`,
      created_at: new Date().toISOString(),
      items: cart,
      customer_id: null,
      discount_type: 'NONE'
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
    await db.settings.put({ key: 'store_settings', value: newSettings })
    setSettings(newSettings)
  }

  // Handle Vault Session Onboarding
  const handleAuthenticated = (session: VaultSession) => {
    setVaultSession(session)
    setIsVaultLocked(false)
    try {
      localStorage.setItem('tinda_vault_session', JSON.stringify(session))
    } catch {
      // ignore
    }
  }

  const handleLockTerminal = () => {
    try {
      localStorage.removeItem('tinda_vault_session')
    } catch {
      // ignore
    }
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

  return (
    <div className="min-h-screen bg-obsidian-950 text-stone-100 flex flex-col md:flex-row selection:bg-amber-400 selection:text-obsidian-950 font-sans">
      {/* Executive Vertical Navigation Sidebar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        lowStockCount={lowStockCount}
        cashierName={vaultSession?.cashierName || 'Master Admin'}
        cashierRole={vaultSession?.cashierRole || 'Administrator'}
        onLockTerminal={handleLockTerminal}
      />

      {/* Main Screen Router */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-6">
        {activeTab === 'dashboard' && (
          <DashboardScreen
            products={products}
            transactions={transactions}
            customers={customers}
            settings={settings}
            onNavigate={(tab) => setActiveTab(tab)}
            onQuickRestock={handleQuickRestock}
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

        {activeTab === 'inventory' && (
          <InventoryScreen
            products={products}
            categories={categories}
            onRefresh={loadData}
            cashierName={vaultSession?.cashierName}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsScreen transactions={transactions} />
        )}

        {activeTab === 'customers' && (
          <CustomersScreen
            customers={customers}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onRefreshAll={loadData}
            isAdmin={vaultSession?.isAdmin ?? (vaultSession?.userRole === 'ADMIN' || vaultSession?.cashierRole?.includes('Admin') || !vaultSession)}
            currentCashierName={vaultSession?.cashierName}
          />
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
          settings={settings}
          terminalId={vaultSession?.terminalId || 'TRM-8891'}
          onClose={() => setCheckoutData(null)}
          onComplete={handleTransactionComplete}
        />
      )}
    </div>
  )
}
