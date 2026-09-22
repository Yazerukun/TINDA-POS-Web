import React, { useState, useEffect, useCallback } from 'react'
import type { Product, Category, Transaction, HeldCart, Customer, StoreSettings, CartItem, DiscountType } from './types'
import { db, DEFAULT_SETTINGS } from './db'
import { Navigation, type ActiveTab } from './components/Navigation'
import { POSScreen } from './components/POSScreen'
import { InventoryScreen } from './components/InventoryScreen'
import { AnalyticsScreen } from './components/AnalyticsScreen'
import { CustomersScreen } from './components/CustomersScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { CheckoutModal } from './components/CheckoutModal'

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([])
  const [loading, setLoading] = useState(true)

  // Checkout modal state
  const [checkoutData, setCheckoutData] = useState<{
    subtotal_c: number
    discount_c: number
    discount_type: DiscountType
    total_c: number
  } | null>(null)

  // Load all data from Dexie
  const loadData = useCallback(async () => {
    try {
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
    total_c: number
  ) => {
    setCheckoutData({ subtotal_c, discount_c, discount_type, total_c })
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

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center text-slate-300">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 font-black text-2xl border border-emerald-500/30 shadow-glow-emerald animate-pulse">
          T
        </div>
        <p className="mt-4 text-xs font-bold tracking-widest text-slate-400 uppercase">
          Initializing TINDA POS Web Engine...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-obsidian-950">
      {/* Top Luxury Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
      />

      {/* Main Screen Router */}
      <main className="flex-1">
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
          />
        )}
      </main>

      {/* Checkout Modal */}
      {checkoutData && (
        <CheckoutModal
          items={cart}
          subtotal_c={checkoutData.subtotal_c}
          discount_c={checkoutData.discount_c}
          discount_type={checkoutData.discount_type}
          total_c={checkoutData.total_c}
          customers={customers}
          selectedCustomerId={null}
          onClose={() => setCheckoutData(null)}
          onComplete={handleTransactionComplete}
        />
      )}
    </div>
  )
}
