import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Crown } from 'lucide-react'
import type { Product, Category, Transaction, HeldCart, Customer, StoreSettings, CartItem, DiscountType, Expense, PaymentMethod } from './types'
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
import { EwalletScreen } from './components/EwalletScreen'
import { PrintingServicesScreen } from './components/PrintingServicesScreen'
import { UtangScreen } from './components/UtangScreen'
import { ReportsScreen } from './components/ReportsScreen'
import { BackupScreen } from './components/BackupScreen'
import { HandbookScreen } from './components/HandbookScreen'
import { TerminalToolsModal } from './components/TerminalToolsModal'
import { PrinterStudioModal } from './components/PrinterStudioModal'
import { SalesMonitorModal } from './components/SalesMonitorModal'
import { HelpGuideModal } from './components/HelpGuideModal'
import { AiAssistantModal } from './components/AiAssistantModal'
import { BarcodeScannerModal } from './components/BarcodeScannerModal'
import { PriceGuideModal } from './components/PriceGuideModal'
import { ExpirationTrackerModal } from './components/ExpirationTrackerModal'
import { CheckoutModal } from './components/CheckoutModal'
import { VaultAuthModal, type VaultSession } from './components/VaultAuthModal'
import { MasterControlScreen } from './components/MasterControlScreen'
import { UserProfileModal } from './components/UserProfileModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLogo } from './components/AppLogo'
import { LandingPage } from './components/LandingPage'
import { VipUpgradeModal } from './components/VipUpgradeModal'
import { initTheme } from './utils/theme'
import { useProAccess } from './services/proAccess'
import { sendHeartbeat } from './services/cloudSync'
import { importTindaBackup } from './utils/backup'
import { Upload, HardDriveDownload } from 'lucide-react'

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

  // Fast Tools & Utility Modal States
  const [isPriceGuideOpen, setIsPriceGuideOpen] = useState(false)
  const [isExpirationOpen, setIsExpirationOpen] = useState(false)
  const [isTerminalToolsOpen, setIsTerminalToolsOpen] = useState(false)
  const [isPrinterStudioOpen, setIsPrinterStudioOpen] = useState(false)
  const [isSalesMonitorOpen, setIsSalesMonitorOpen] = useState(false)
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false)
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false)
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false)
  const [isVipUpgradeOpen, setIsVipUpgradeOpen] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    initTheme()
  }, [])

  // Vault Session / Cashier Authentication State (Screen 1 vs Screen 2)
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(() => {
    try {
      const saved = localStorage.getItem('tinda_vault_session')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalInitialStep, setAuthModalInitialStep] = useState<'LOGIN' | 'SIGNUP'>('LOGIN')
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
    initialMethod?: PaymentMethod
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

      // Auto-migrate untagged records based on cashier name or active store
      const userStoreMap = new Map<string, string>()
      allUsers.forEach((u) => {
        const sName = u.store_name || (u.username === 'skorts188@gmail.com' ? 'PLATFORM_HQ' : `${u.name}'s Store`)
        if (u.name) userStoreMap.set(u.name.toLowerCase(), sName)
        if (u.username) userStoreMap.set(u.username.toLowerCase(), sName)
      })

      const fallbackStore = activeStoreName || 'PLATFORM_HQ'

      for (const prod of allProducts) {
        if (!prod.store_name) {
          prod.store_name = fallbackStore
          if (prod.id) db.products.update(prod.id, { store_name: fallbackStore }).catch(() => {})
        }
      }

      for (const cust of allCust) {
        if (!cust.store_name) {
          cust.store_name = fallbackStore
          if (cust.id) db.customers.update(cust.id, { store_name: fallbackStore }).catch(() => {})
        }
      }

      for (const tx of allTx) {
        if (!tx.store_name) {
          const matchedStore = (tx.cashier_name && userStoreMap.get(tx.cashier_name.toLowerCase())) || fallbackStore
          tx.store_name = matchedStore
          if (tx.id) db.transactions.update(tx.id, { store_name: matchedStore }).catch(() => {})
        }
      }

      for (const exp of allExpenses) {
        if (!exp.store_name) {
          const matchedStore = (exp.cashier_name && userStoreMap.get(exp.cashier_name.toLowerCase())) || fallbackStore
          exp.store_name = matchedStore
          if (exp.id) db.expenses.update(exp.id, { store_name: matchedStore }).catch(() => {})
        }
      }

      // Filter data for the active store (Platform HQ sees all; specific store sees their store's records and newly imported items)
      const isPlatformHq = activeStoreName === 'PLATFORM_HQ'
      const filteredTx = isPlatformHq ? allTx : allTx.filter((tx) => tx.store_name === activeStoreName || !tx.store_name)
      const filteredExpenses = isPlatformHq ? allExpenses : allExpenses.filter((e) => e.store_name === activeStoreName || !e.store_name)
      const filteredCustomers = isPlatformHq ? allCust : allCust.filter((c) => c.store_name === activeStoreName || !c.store_name)
      const filteredHeld = isPlatformHq ? savedHeld : savedHeld.filter((h) => h.store_name === activeStoreName || !h.store_name)
      const filteredProducts = isPlatformHq ? allProducts : allProducts.filter((p) => p.store_name === activeStoreName || !p.store_name)

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

  // Standalone Customer Facing Display (#monitor) mode
  const [isHashMonitor, setIsHashMonitor] = useState(
    () => window.location.hash === '#monitor' || window.location.hash === '#sales-monitor'
  )

  useEffect(() => {
    const handleHash = () => {
      setIsHashMonitor(window.location.hash === '#monitor' || window.location.hash === '#sales-monitor')
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Broadcast cart updates to Customer Facing Display / Sales Monitor
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('tinda_sales_monitor')
      channel.postMessage({
        type: 'CART_UPDATE',
        cart,
        storeName: activeStoreName
      })
    } catch {}
  }, [cart, activeStoreName])

  // Global Drag & Drop Auto-Detection for Desktop Backup Files (.tinda-backup)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [autoImporting, setAutoImporting] = useState(false)

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDraggingFile(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0) {
        setIsDraggingFile(false)
      }
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(false)
      const file = e.dataTransfer?.files?.[0]
      if (!file) return

      if (!file.name.endsWith('.tinda-backup') && !file.name.endsWith('.json')) {
        alert('Please drop a valid .tinda-backup or .json backup file.')
        return
      }

      setAutoImporting(true)
      try {
        const text = await file.text()
        const result = await importTindaBackup(text, { targetStoreName: activeStoreName })
        if (result.success) {
          alert(`⚡ AUTO-DETECT SUCCESS: ${result.message}`)
          await loadData()
        } else {
          alert(`Auto-detect failed: ${result.message}`)
        }
      } catch (err) {
        alert('Error reading backup file: ' + (err as Error)?.message)
      } finally {
        setAutoImporting(false)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [loadData, activeStoreName])

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
    quickTender_c?: number,
    initialMethod?: PaymentMethod
  ) => {
    setCheckoutData({
      subtotal_c,
      discount_c,
      discount_type,
      total_c,
      customerId,
      quickTender_c,
      initialMethod
    })
  }

  const handleAddToCartFromServices = (serviceItem: { name: string; price_c: number; quantity: number }) => {
    const pseudoProduct: Product = {
      id: Date.now(),
      name: serviceItem.name,
      sku: 'SRV-PRINT',
      barcode: null,
      category_id: null,
      subcategory_id: null,
      base_unit: 'pc',
      cost_c: 0,
      default_price_c: serviceItem.price_c,
      stock: 9999,
      image_path: null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setCart((prev) => [
      ...prev,
      {
        product: pseudoProduct,
        quantity: serviceItem.quantity,
        unit_price_c: serviceItem.price_c,
        total_c: serviceItem.price_c * serviceItem.quantity
      }
    ])
    setActiveTab('pos')
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
    setIsAuthModalOpen(false)
    try {
      localStorage.setItem('tinda_vault_session', JSON.stringify(session))
    } catch {
      // ignore
    }

    if (session.isMasterAdmin) {
      // Platform Master Admin: lifetime bypass
      await proAccess.toggleOwnerBypass(true)
    } else {
      // Load user session
      const userId = session.userId ?? session.username ?? 'guest'
      await proAccess.loadStateForUser(userId)
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
    setAuthModalInitialStep('LOGIN')
    setIsAuthModalOpen(true)
  }

  // Quick 1-click sandbox demo test drive
  const handleQuickDemo = async () => {
    const demoStoreName = 'Sari-Sari Store Demo'
    try {
      const existingDemoProducts = await db.products.where('store_name').equals(demoStoreName).count()
      if (existingDemoProducts === 0) {
        const demoItems: Omit<Product, 'id'>[] = [
          {
            name: 'Lucky Me! Instant Pancit Canton Kalamansi 60g',
            sku: 'LM-PC-KAL-60G',
            barcode: '4800016644818',
            category_id: 4,
            subcategory_id: null,
            base_unit: 'piece',
            cost_c: 1200,
            default_price_c: 1500,
            stock: 48,
            low_stock_threshold: 10,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            name: 'Coca-Cola Mismo 290ml',
            sku: 'KO-MISMO-290ML',
            barcode: '4801981110008',
            category_id: 1,
            subcategory_id: 6,
            base_unit: 'bottle',
            cost_c: 1400,
            default_price_c: 1800,
            stock: 36,
            low_stock_threshold: 8,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            name: 'San Miguel Pale Pilsen 330ml Can',
            sku: 'SMB-PALE-330ML',
            barcode: '4801041000011',
            category_id: 1,
            subcategory_id: null,
            base_unit: 'can',
            cost_c: 5200,
            default_price_c: 6500,
            stock: 24,
            low_stock_threshold: 6,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            name: 'Great Taste White Coffee Twin Pack 50g',
            sku: 'GT-WHITE-TWIN',
            barcode: '4800016053306',
            category_id: 1,
            subcategory_id: 7,
            base_unit: 'sachet',
            cost_c: 1000,
            default_price_c: 1400,
            stock: 60,
            low_stock_threshold: 12,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            name: 'Silver Swan Special Soy Sauce 385ml',
            sku: 'SS-SOY-385ML',
            barcode: '4800088120012',
            category_id: 3,
            subcategory_id: null,
            base_unit: 'bottle',
            cost_c: 1750,
            default_price_c: 2200,
            stock: 18,
            low_stock_threshold: 4,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            name: 'Bear Brand Fortified Powdered Milk Drink 33g',
            sku: 'BB-FORT-33G',
            barcode: '4800361257121',
            category_id: 1,
            subcategory_id: null,
            base_unit: 'sachet',
            cost_c: 1250,
            default_price_c: 1600,
            stock: 50,
            low_stock_threshold: 10,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            name: 'Century Tuna Flakes in Oil 155g',
            sku: 'CT-TUNA-OIL-155',
            barcode: '4800168100128',
            category_id: 3,
            subcategory_id: null,
            base_unit: 'can',
            cost_c: 3100,
            default_price_c: 3800,
            stock: 22,
            low_stock_threshold: 5,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            name: 'Safeguard Pure White Bar Soap 60g',
            sku: 'SG-WHITE-60G',
            barcode: '4902430730018',
            category_id: 5,
            subcategory_id: null,
            base_unit: 'bar',
            cost_c: 1950,
            default_price_c: 2500,
            stock: 30,
            low_stock_threshold: 6,
            image_path: null,
            status: 'ACTIVE',
            store_name: demoStoreName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        await db.products.bulkAdd(demoItems as Product[])
      }
    } catch (e) {
      console.warn('Demo products seeding error:', e)
    }

    const demoSession: VaultSession = {
      userId: 888888,
      cashierName: 'Demo Cashier',
      cashierRole: 'Store Owner / Admin',
      userRole: 'ADMIN',
      openingFloat_c: 200000,
      sessionStartTime: new Date().toISOString(),
      terminalId: 'DEMO-8891',
      isAdmin: true,
      isMasterAdmin: false,
      username: 'demo_partner',
      storeName: demoStoreName
    }
    await handleAuthenticated(demoSession, false)
    await loadData()
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
        <AppLogo size={68} animated={true} />
        <p className="mt-5 font-serif text-xs font-bold tracking-[0.3em] text-emerald-400 uppercase">
          INITIALIZING TINDA PRIVATE TERMINAL...
        </p>
      </div>
    )
  }

  // Standalone Customer Facing Display (#monitor) mode (kiosk/dual-screen)
  if (isHashMonitor) {
    return (
      <SalesMonitorModal
        open={true}
        onClose={() => {
          window.location.hash = ''
        }}
        cart={cart}
        storeName={activeStoreName}
        isStandalone={true}
      />
    )
  }

  // Unauthenticated Visitor Gatekeeper: Public Tailark-Grade Landing Page + Auth Modal
  if (!vaultSession) {
    return (
      <div className="min-h-screen bg-obsidian-950 text-stone-100 font-sans selection:bg-emerald-500 selection:text-obsidian-950">
        <LandingPage
          onOpenLogin={() => {
            setAuthModalInitialStep('LOGIN')
            setIsAuthModalOpen(true)
          }}
          onOpenSignup={() => {
            setAuthModalInitialStep('SIGNUP')
            setIsAuthModalOpen(true)
          }}
          onQuickDemo={handleQuickDemo}
        />
        <VaultAuthModal
          isOpen={isAuthModalOpen}
          onAuthenticated={handleAuthenticated}
          initialStep={authModalInitialStep}
          onClose={() => setIsAuthModalOpen(false)}
        />
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
    <div className="min-h-screen bg-obsidian-950 text-stone-100 flex flex-col md:flex-row selection:bg-amber-400 selection:text-stone-100 font-sans relative">
      {/* Global Drag-and-Drop Auto-Detection Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-obsidian-950/90 backdrop-blur-xl border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center p-6 text-center animate-in fade-in select-none">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mb-4 shadow-glow-emerald animate-bounce">
            <Upload className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-stone-100 uppercase tracking-wider">
            Drop Backup File Here
          </h2>
          <p className="text-sm text-emerald-400 mt-2 font-mono">
            Automatically reads and imports .tinda-backup database from Desktop TINDA POS!
          </p>
        </div>
      )}

      {/* Auto-Importing Spinner Overlay */}
      {autoImporting && (
        <div className="fixed inset-0 z-50 bg-obsidian-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in select-none">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 mb-4 animate-spin">
            <HardDriveDownload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-100">
            Auto-Detecting and Importing Database...
          </h3>
          <p className="text-xs text-stone-400 mt-1 font-mono">
            Processing products, price lists, customer accounts, and sales history. Please wait...
          </p>
        </div>
      )}

      {/* Executive Vertical Navigation Sidebar & Mobile Bottom Nav */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        lowStockCount={lowStockCount}
        cashierName={vaultSession?.cashierName || 'Master Admin'}
        cashierRole={vaultSession?.cashierRole || 'Administrator'}
        avatarUrl={vaultSession?.avatarUrl}
        storeName={activeStoreName}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLockTerminal={handleLockTerminal}
        onOpenTerminalTools={() => setIsTerminalToolsOpen(true)}
        onOpenSalesMonitor={() => setIsSalesMonitorOpen(true)}
        onOpenHelpGuide={() => setIsHelpGuideOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onOpenPrinterStudio={() => setIsPrinterStudioOpen(true)}
        onOpenVipUpgrade={() => setIsVipUpgradeOpen(true)}
        isMasterAdmin={vaultSession?.isMasterAdmin || false}
      />

      {/* Main Screen Router */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-6 flex flex-col">
        {/* Master Admin Masquerade / Store Impersonate Top Bar */}
        {masqueradeSession && (
          <div className="bg-gradient-to-r from-amber-600 via-gold to-amber-500 text-stone-100 px-4 py-2 flex items-center justify-between shadow-xl sticky top-0 z-50 animate-fade-in font-mono text-xs">
            <div className="flex items-center gap-2 font-bold tracking-wide">
              <Crown className="w-4 h-4 fill-current text-stone-100" />
              <span>MASQUERADE MODE: Managing Store "{masqueradeSession.activeStore}" as Master Admin</span>
            </div>
            <button
              onClick={handleExitMasquerade}
              className="bg-obsidian-950 text-gold-light hover:bg-slate-850 border border-gold/40 px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>↩ Return to Master Control</span>
            </button>
          </div>
        )}

        {/* Desktop & Tablet Top Status Bar with real-time station diagnostics */}
        <div className="hidden md:flex items-center justify-between px-4 lg:px-6 py-2.5 bg-obsidian-950/80 backdrop-blur-md border-b border-slate-900/[0.06] sticky top-0 z-30 min-w-0 gap-3">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0 truncate">
            <span className="font-sans font-semibold text-[0.8125rem] tracking-widest uppercase text-stone-400 shrink-0">
              Terminal <span className="text-gold-light font-bold">{vaultSession?.terminalId || 'TRM-8891'}</span>
            </span>
            <span className="text-stone-500 shrink-0">•</span>
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 font-mono text-[0.8125rem] text-stone-400 hover:text-slate-900 transition-colors cursor-pointer min-w-0 truncate"
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
              <span className="hidden lg:inline">SUPER ADMIN · ROOT ACCESS</span>
              <span className="lg:hidden">SUPER ADMIN</span>
              <span className="text-[0.75rem] text-gold underline ml-1">Control →</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold shadow-glow-emerald shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden lg:inline">PRO ENTERPRISE EDITION</span>
              <span className="lg:hidden">PRO ACTIVE</span>
              <span className="text-[0.75rem] text-emerald-400/80 font-normal">· UNLIMITED</span>
            </div>
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
            cashierName={vaultSession?.cashierName}
            storeName={activeStoreName}
            openingFloat_c={vaultSession?.openingFloat_c}
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
            cashierName={vaultSession?.cashierName}
            storeName={activeStoreName}
            onRefreshData={loadData}
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

        {activeTab === 'ewallet' && (
          <EwalletScreen
            currentCashierName={vaultSession?.cashierName}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'printing' && (
          <PrintingServicesScreen
            currentCashierName={vaultSession?.cashierName}
            storeName={activeStoreName}
            onAddToCart={handleAddToCartFromServices}
          />
        )}

        {activeTab === 'utang' && (
          <UtangScreen
            customers={customers}
            onRefresh={loadData}
            currentCashierName={vaultSession?.cashierName}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsScreen
            transactions={transactions}
            expenses={expenses}
            settings={settings}
            currentCashierName={vaultSession?.cashierName}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'backup' && (
          <BackupScreen
            onRefreshAll={loadData}
            storeName={activeStoreName}
          />
        )}

        {activeTab === 'handbook' && (
          <HandbookScreen />
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
            onOpenVipUpgrade={() => setIsVipUpgradeOpen(true)}
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
          initialMethod={checkoutData.initialMethod || 'CASH'}
          cashierName={vaultSession?.cashierName}
          storeName={activeStoreName}
          settings={settings}
          terminalId={vaultSession?.terminalId || 'TRM-8891'}
          onClose={() => setCheckoutData(null)}
          onComplete={handleTransactionComplete}
        />
      )}

      {/* Terminal & Fast Tools Dock Modal (Dedicated organized location) */}
      <TerminalToolsModal
        isOpen={isTerminalToolsOpen}
        onClose={() => setIsTerminalToolsOpen(false)}
        onOpenPriceGuide={() => setIsPriceGuideOpen(true)}
        onOpenExpiration={() => setIsExpirationOpen(true)}
        onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
        onOpenPrinterStudio={() => setIsPrinterStudioOpen(true)}
        currentCashierName={vaultSession?.cashierName}
        storeName={activeStoreName}
      />

      {/* Thermal & Label Studio Modal */}
      <PrinterStudioModal
        open={isPrinterStudioOpen}
        onClose={() => setIsPrinterStudioOpen(false)}
        storeName={activeStoreName}
      />

      {/* Customer Facing Display / Sales Monitor Modal */}
      <SalesMonitorModal
        open={isSalesMonitorOpen}
        onClose={() => setIsSalesMonitorOpen(false)}
        cart={cart}
        storeName={activeStoreName}
      />

      {/* Store SOP & Cashier Tour Modal */}
      <HelpGuideModal
        open={isHelpGuideOpen}
        onClose={() => setIsHelpGuideOpen(false)}
      />

      {/* TindaBot Retail AI Assistant Modal */}
      <AiAssistantModal
        open={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        storeName={activeStoreName}
      />

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        open={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onDetect={(code) => {
          setIsBarcodeScannerOpen(false)
          const matched = products.find((p) => p.barcode === code)
          if (matched) {
            setCart((prev) => {
              const existing = prev.find((i) => i.product.id === matched.id)
              if (existing) {
                return prev.map((i) =>
                  i.product.id === matched.id
                    ? { ...i, quantity: i.quantity + 1, total_c: (i.quantity + 1) * i.unit_price_c }
                    : i
                )
              }
              return [
                ...prev,
                {
                  product: matched,
                  quantity: 1,
                  unit_price_c: matched.default_price_c,
                  total_c: matched.default_price_c
                }
              ]
            })
            setActiveTab('pos')
          } else {
            alert(`Detected barcode: ${code} (No matching product found in inventory)`)
          }
        }}
      />

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

      {/* VIP Pro Lifetime Licensing Modal */}
      <VipUpgradeModal
        open={isVipUpgradeOpen}
        onClose={() => setIsVipUpgradeOpen(false)}
        onActivated={loadData}
      />

    </div>
  )
}

