import { db } from '../db'
import type {
  Product,
  Category,
  Transaction,
  TransactionItem,
  Customer,
  Supplier,
  Expense,
  ExpenseCategory,
  UserAccount,
  CashCountRecord,
  ZReadRecord
} from '../types'

export interface BackupStats {
  products: number
  categories: number
  transactions: number
  customers: number
  suppliers: number
  expenses: number
  users: number
  sourcePlatform?: string
}

export async function exportTindaBackup(): Promise<string> {
  const [
    products,
    categories,
    transactions,
    customers,
    settings,
    expenses,
    expense_categories,
    suppliers,
    cash_counts,
    z_reads,
    users
  ] = await Promise.all([
    db.products.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.customers.toArray(),
    db.settings.toArray(),
    db.expenses.toArray(),
    db.expense_categories.toArray(),
    db.suppliers.toArray(),
    db.cash_counts.toArray(),
    db.z_reads.toArray(),
    db.users.toArray()
  ])

  const backupData = {
    manifest: {
      format: 'tinda-pos-backup',
      formatVersion: 1,
      source: {
        platform: 'web',
        appVersion: '1.2.0',
        schemaVersion: 1
      },
      createdAt: new Date().toISOString()
    },
    version: '1.2.0',
    platform: 'web',
    exported_at: new Date().toISOString(),
    data: {
      products,
      categories,
      transactions,
      customers,
      settings: settings.map((s) => {
        if (s && s.value && typeof s.value === 'object') {
          const cleanVal = { ...s.value }
          delete cleanVal.paymongo_secret_key
          return { ...s, value: cleanVal }
        }
        return s
      }),
      expenses,
      expense_categories,
      suppliers,
      cash_counts,
      z_reads,
      users
    }
  }

  return JSON.stringify(backupData, null, 2)
}

export async function downloadBackupFile(): Promise<void> {
  const json = await exportTindaBackup()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `tinda-backup-${dateStr}.tinda-backup`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Creates an emergency recovery checkpoint before applying imported database records.
 */
export async function createRestoreCheckpoint(): Promise<void> {
  try {
    const checkpoint = await exportTindaBackup()
    localStorage.setItem('tinda_pre_restore_checkpoint', checkpoint)
    localStorage.setItem('tinda_checkpoint_time', new Date().toISOString())
  } catch (err) {
    console.warn('Could not save pre-restore checkpoint to localStorage:', err)
  }
}

/**
 * Restores previous database from emergency checkpoint if available.
 */
export async function rollbackRestoreCheckpoint(): Promise<{ success: boolean; message: string }> {
  const checkpoint = localStorage.getItem('tinda_pre_restore_checkpoint')
  if (!checkpoint) {
    return { success: false, message: 'No pre-restore snapshot found.' }
  }
  return importTindaBackup(checkpoint, { skipCheckpoint: true })
}

/**
 * Robust importer supporting both:
 * 1. Desktop Offline TINDA POS `.tinda-backup` files (Windows/Android SQLite with manifest & data.tables)
 * 2. Web Dexie JSON backups (flat data object)
 */
export async function importTindaBackup(
  jsonString: string,
  options?: { skipCheckpoint?: boolean; targetStoreName?: string }
): Promise<{ success: boolean; message: string; stats?: BackupStats }> {
  try {
    if (!options?.skipCheckpoint) {
      await createRestoreCheckpoint()
    }

    const parsed = JSON.parse(jsonString)
    const isDesktopFormat =
      parsed?.manifest?.format === 'tinda-pos-backup' ||
      (parsed?.data && Array.isArray(parsed.data.tables)) ||
      Array.isArray(parsed?.tables)

    const stats: BackupStats = {
      products: 0,
      categories: 0,
      transactions: 0,
      customers: 0,
      suppliers: 0,
      expenses: 0,
      users: 0,
      sourcePlatform: parsed?.manifest?.source?.platform || (isDesktopFormat ? 'desktop-offline' : 'web')
    }

    let productsToInsert: Product[] = []
    let categoriesToInsert: Category[] = []
    let transactionsToInsert: Transaction[] = []
    let customersToInsert: Customer[] = []
    let suppliersToInsert: Supplier[] = []
    let expensesToInsert: Expense[] = []
    let expenseCategoriesToInsert: ExpenseCategory[] = []
    let usersToInsert: UserAccount[] = []
    let settingsToInsert: { key: string; value: any }[] = []
    let cashCountsToInsert: CashCountRecord[] = []
    let zReadsToInsert: ZReadRecord[] = []

    const assignedStoreName = options?.targetStoreName || undefined

    if (isDesktopFormat) {
      // Extract tables array from desktop structure
      const rawTables: Array<{ name: string; rows: Record<string, any>[] }> =
        parsed.data?.tables || parsed.tables || []
      const tablesMap = new Map<string, Record<string, any>[]>()
      for (const t of rawTables) {
        if (t?.name && Array.isArray(t.rows)) {
          tablesMap.set(t.name, t.rows)
        }
      }

      // 1. Categories
      const catRows = tablesMap.get('categories') || []
      categoriesToInsert = catRows.map((row, idx) => ({
        id: Number(row.id) || idx + 1,
        name: String(row.name || 'Uncategorized'),
        parent_id: row.parent_id ? Number(row.parent_id) : null,
        sort_order: Number(row.sort_order ?? idx)
      }))

      // 2. Suppliers
      const supRows = tablesMap.get('suppliers') || []
      suppliersToInsert = supRows.map((row, idx) => ({
        id: Number(row.id) || idx + 1,
        name: String(row.name || 'Supplier'),
        contact_person: row.contact_person ? String(row.contact_person) : '',
        phone: row.phone ? String(row.phone) : '',
        address: row.address ? String(row.address) : '',
        notes: row.notes ? String(row.notes) : '',
        status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        store_name: row.store_name || assignedStoreName || undefined,
        created_at: String(row.created_at || new Date().toISOString())
      }))

      // 3. Products: Map SQLite columns (price_cents, stock_quantity, cost_cents)
      const prodRows = tablesMap.get('products') || []
      productsToInsert = prodRows.map((row, idx) => {
        const costVal = row.cost_cents ?? row.cost_c ?? 0
        const priceVal = row.price_cents ?? row.default_price_c ?? 0
        const stockVal = row.stock_quantity ?? row.stock ?? 0
        const minAlert = row.min_stock_alert ?? row.low_stock_threshold ?? 5

        return {
          id: Number(row.id) || idx + 1,
          name: String(row.name || 'Unnamed Product'),
          sku: row.sku ? String(row.sku) : null,
          barcode: row.barcode ? String(row.barcode) : null,
          category_id: row.category_id ? Number(row.category_id) : null,
          subcategory_id: row.subcategory_id ? Number(row.subcategory_id) : null,
          base_unit: String(row.unit || row.base_unit || 'pc'),
          cost_c: Number(costVal) || 0,
          default_price_c: Number(priceVal) || 0,
          suggested_price_c: row.suggested_price_c ? Number(row.suggested_price_c) : null,
          stock: Number(stockVal) || 0,
          low_stock_threshold: Number(minAlert) || 5,
          expiration_date: row.expiration_date ? String(row.expiration_date) : null,
          supplier_id: row.supplier_id ? Number(row.supplier_id) : null,
          image_path: row.image_path ? String(row.image_path) : null,
          status: (row.is_active === 0 || row.status === 'ARCHIVED') ? 'ARCHIVED' : 'ACTIVE',
          store_name: row.store_name || assignedStoreName || undefined,
          created_at: String(row.created_at || new Date().toISOString()),
          updated_at: String(row.updated_at || new Date().toISOString())
        }
      })

      // 4. Customers: Map SQLite columns (balance_cents, credit_limit_cents)
      const custRows = tablesMap.get('customers') || []
      customersToInsert = custRows.map((row, idx) => ({
        id: Number(row.id) || idx + 1,
        name: String(row.name || 'Valued Customer'),
        contact: String(row.phone || row.contact || ''),
        balance_c: Number(row.balance_cents ?? row.balance_c ?? 0),
        credit_limit_c: Number(row.credit_limit_cents ?? row.credit_limit_c ?? 0),
        notes: String(row.notes || ''),
        store_name: row.store_name || assignedStoreName || undefined,
        created_at: String(row.created_at || new Date().toISOString()),
        updated_at: String(row.updated_at || new Date().toISOString())
      }))

      // 5. Sales & Sale Items
      const saleRows = tablesMap.get('sales') || []
      const itemRows = tablesMap.get('sale_items') || []
      const itemsBySale = new Map<number, TransactionItem[]>()

      for (const item of itemRows) {
        const sId = Number(item.sale_id)
        if (!sId) continue
        const tItem: TransactionItem = {
          product_id: Number(item.product_id || 0),
          name: String(item.product_name || item.name || 'Item'),
          unit_name: String(item.unit || item.unit_name || 'pc'),
          quantity: Number(item.quantity || 1),
          unit_price_c: Number(item.unit_price_cents ?? item.unit_price_c ?? 0),
          total_c: Number(item.subtotal_cents ?? item.total_c ?? 0)
        }
        if (!itemsBySale.has(sId)) itemsBySale.set(sId, [])
        itemsBySale.get(sId)!.push(tItem)
      }

      transactionsToInsert = saleRows.map((s, idx) => {
        const sId = Number(s.id) || idx + 1
        const payMethod = String(s.payment_method || 'CASH').toUpperCase() as any
        const total = Number(s.total_cents ?? s.total_c ?? 0)
        const subtotal = Number(s.subtotal_cents ?? s.subtotal_c ?? total)
        const discount = Number(s.discount_cents ?? s.discount_c ?? 0)

        return {
          id: sId,
          invoice_number: String(s.receipt_number || s.invoice_number || `INV-${sId}`),
          created_at: String(s.created_at || new Date().toISOString()),
          items: itemsBySale.get(sId) || [],
          subtotal_c: subtotal,
          discount_c: discount,
          discount_type: discount > 0 ? 'CUSTOM' : 'NONE',
          total_c: total,
          payment_method: payMethod,
          amount_tendered_c: Number(s.amount_tendered_cents ?? s.amount_tendered_c ?? total),
          change_c: Number(s.change_cents ?? s.change_c ?? 0),
          customer_id: s.customer_id ? Number(s.customer_id) : null,
          cashier_name: String(s.cashier_name || 'Admin'),
          store_name: s.store_name || assignedStoreName || undefined,
          status: s.status === 'VOIDED' ? 'VOIDED' : 'COMPLETED'
        }
      })

      // 6. Expense Categories & Expenses
      const expCatRows = tablesMap.get('expense_categories') || []
      expenseCategoriesToInsert = expCatRows.map((row, idx) => ({
        id: Number(row.id) || idx + 1,
        name: String(row.name || 'General')
      }))

      const expRows = tablesMap.get('expenses') || []
      expensesToInsert = expRows.map((row, idx) => ({
        id: Number(row.id) || idx + 1,
        category: String(row.category_name || row.category || 'General'),
        amount_c: Number(row.amount_cents ?? row.amount_c ?? 0),
        date: String(row.expense_date || row.date || new Date().toISOString().split('T')[0]),
        description: String(row.description || ''),
        cashier_name: String(row.created_by || row.cashier_name || 'Admin'),
        store_name: row.store_name || assignedStoreName || undefined,
        created_at: String(row.created_at || new Date().toISOString())
      }))

      // 7. Users
      const userRows = tablesMap.get('users') || []
      usersToInsert = userRows.map((row, idx) => ({
        id: Number(row.id) || idx + 1,
        username: String(row.username || `user_${idx + 1}`),
        name: String(row.name || row.username || 'User'),
        role: String(row.role || 'CASHIER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CASHIER',
        pin: String(row.pin || '1234'),
        status: (row.is_active === 0 || row.status === 'DISABLED') ? 'DISABLED' : 'ACTIVE',
        store_name: row.store_name || assignedStoreName || undefined,
        created_at: String(row.created_at || new Date().toISOString())
      }))

      // 8. Settings
      const setRows = tablesMap.get('settings') || []
      settingsToInsert = setRows.map((row) => ({
        key: String(row.key),
        value: row.value
      }))
      const desktopSettingsObj = parsed.data?.settings || parsed.settings
      if (desktopSettingsObj && typeof desktopSettingsObj === 'object' && !Array.isArray(desktopSettingsObj)) {
        const storeObj = { ...desktopSettingsObj }
        if (assignedStoreName && assignedStoreName !== 'PLATFORM_HQ') {
          storeObj.store_name = assignedStoreName
        }
        settingsToInsert.push({ key: 'store_settings', value: storeObj })
        if (assignedStoreName) {
          settingsToInsert.push({ key: `store_settings_${assignedStoreName}`, value: storeObj })
        }
      }
    } else {
      // Web Flat Format
      const data = parsed.data || parsed
      const targetStore = assignedStoreName && assignedStoreName !== 'PLATFORM_HQ' ? assignedStoreName : undefined
      if (Array.isArray(data.categories)) categoriesToInsert = data.categories
      if (Array.isArray(data.products))
        productsToInsert = data.products.map((p: any) => ({ ...p, store_name: targetStore || p.store_name || assignedStoreName }))
      if (Array.isArray(data.transactions))
        transactionsToInsert = data.transactions.map((t: any) => ({ ...t, store_name: targetStore || t.store_name || assignedStoreName }))
      if (Array.isArray(data.customers))
        customersToInsert = data.customers.map((c: any) => ({ ...c, store_name: targetStore || c.store_name || assignedStoreName }))
      if (Array.isArray(data.settings)) settingsToInsert = data.settings
      if (Array.isArray(data.expenses))
        expensesToInsert = data.expenses.map((e: any) => ({ ...e, store_name: targetStore || e.store_name || assignedStoreName }))
      if (Array.isArray(data.expense_categories)) expenseCategoriesToInsert = data.expense_categories
      if (Array.isArray(data.suppliers))
        suppliersToInsert = data.suppliers.map((s: any) => ({ ...s, store_name: targetStore || s.store_name || assignedStoreName }))
      if (Array.isArray(data.cash_counts))
        cashCountsToInsert = data.cash_counts.map((cc: any) => ({ ...cc, store_name: targetStore || cc.store_name || assignedStoreName }))
      if (Array.isArray(data.z_reads)) zReadsToInsert = data.z_reads
      if (Array.isArray(data.users))
        usersToInsert = data.users.map((u: any) => ({ ...u, store_name: targetStore || u.store_name || assignedStoreName }))
    }

    // Populate stats
    stats.products = productsToInsert.length
    stats.categories = categoriesToInsert.length
    stats.transactions = transactionsToInsert.length
    stats.customers = customersToInsert.length
    stats.suppliers = suppliersToInsert.length
    stats.expenses = expensesToInsert.length
    stats.users = usersToInsert.length

    // Write to Dexie inside atomic transaction
    await db.transaction(
      'rw',
      [
        db.products,
        db.categories,
        db.transactions,
        db.customers,
        db.settings,
        db.expenses,
        db.expense_categories,
        db.suppliers,
        db.cash_counts,
        db.z_reads,
        db.users
      ],
      async () => {
        if (categoriesToInsert.length > 0) {
          await db.categories.clear()
          await db.categories.bulkAdd(categoriesToInsert)
        }
        if (productsToInsert.length > 0) {
          await db.products.clear()
          await db.products.bulkAdd(productsToInsert)
        }
        if (transactionsToInsert.length > 0) {
          await db.transactions.clear()
          await db.transactions.bulkAdd(transactionsToInsert)
        }
        if (customersToInsert.length > 0) {
          await db.customers.clear()
          await db.customers.bulkAdd(customersToInsert)
        }
        if (settingsToInsert.length > 0) {
          const sanitizedSettings = settingsToInsert.map((s) => {
            if (s && s.value && typeof s.value === 'object') {
              const clean = { ...s.value }
              delete clean.paymongo_secret_key
              return { ...s, value: clean }
            }
            return s
          })
          await db.settings.bulkPut(sanitizedSettings)
        }
        if (expensesToInsert.length > 0) {
          await db.expenses.clear()
          await db.expenses.bulkAdd(expensesToInsert)
        }
        if (expenseCategoriesToInsert.length > 0) {
          await db.expense_categories.clear()
          await db.expense_categories.bulkAdd(expenseCategoriesToInsert)
        }
        if (suppliersToInsert.length > 0) {
          await db.suppliers.clear()
          await db.suppliers.bulkAdd(suppliersToInsert)
        }
        if (cashCountsToInsert.length > 0) {
          await db.cash_counts.clear()
          await db.cash_counts.bulkAdd(cashCountsToInsert)
        }
        if (zReadsToInsert.length > 0) {
          await db.z_reads.clear()
          await db.z_reads.bulkAdd(zReadsToInsert)
        }
        if (usersToInsert.length > 0) {
          await db.users.bulkPut(usersToInsert)
        }
      }
    )

    const sourceLabel = isDesktopFormat ? 'Offline Desktop TINDA POS (.tinda-backup)' : 'TINDA POS Web Backup'
    const message = `Successfully imported from ${sourceLabel}: ${stats.products} products, ${stats.categories} categories, ${stats.customers} customers, and ${stats.transactions} sales transactions!`

    return {
      success: true,
      message,
      stats
    }
  } catch (err) {
    return {
      success: false,
      message: (err as Error)?.message || 'Invalid or corrupted backup file.'
    }
  }
}
