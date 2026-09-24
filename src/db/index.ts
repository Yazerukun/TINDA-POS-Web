import Dexie, { type Table } from 'dexie'
import type {
  Product,
  Category,
  Transaction,
  HeldCart,
  Customer,
  StoreSettings,
  RestockLog,
  UserAccount,
  Expense,
  ExpenseCategory,
  Supplier,
  PriceReference,
  CashCountRecord,
  ZReadRecord
} from '../types'
import { SEED_PRICE_REFERENCES } from '../data/seedPriceReferences'

export class TindaWebDatabase extends Dexie {
  products!: Table<Product, number>
  categories!: Table<Category, number>
  transactions!: Table<Transaction, number>
  held_carts!: Table<HeldCart, string>
  customers!: Table<Customer, number>
  settings!: Table<{ key: string; value: any }, string>
  restock_logs!: Table<RestockLog, number>
  users!: Table<UserAccount, number>
  expenses!: Table<Expense, number>
  expense_categories!: Table<ExpenseCategory, number>
  suppliers!: Table<Supplier, number>
  price_references!: Table<PriceReference, number>
  cash_counts!: Table<CashCountRecord, number>
  z_reads!: Table<ZReadRecord, number>

  constructor() {
    super('TindaWebDB')
    this.version(1).stores({
      products: '++id, name, sku, barcode, category_id, subcategory_id, status',
      categories: '++id, name, parent_id, sort_order',
      transactions: '++id, invoice_number, created_at, customer_id, payment_method',
      held_carts: 'id, created_at',
      customers: '++id, name, contact, balance_c',
      settings: 'key'
    })
    this.version(2).stores({
      restock_logs: '++id, product_id, timestamp'
    })
    this.version(3).stores({
      users: '++id, username, role, status'
    })
    this.version(4).stores({
      products: '++id, name, sku, barcode, category_id, subcategory_id, status, supplier_id, expiration_date',
      expenses: '++id, category, date, cashier_name',
      expense_categories: '++id, &name',
      suppliers: '++id, name, status',
      price_references: '++id, barcode, product_name, brand, category',
      cash_counts: '++id, business_date, created_at',
      z_reads: '++id, date, created_at'
    })
    this.version(5).stores({
      products: '++id, name, sku, barcode, category_id, subcategory_id, status, supplier_id, expiration_date, suggested_price_c'
    })
  }
}

export const db = new TindaWebDatabase()

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'TINDA SARI-SARI & MINIMART',
  owner_name: 'Boss Store Owner',
  contact_number: '+63 912 345 6789',
  address: 'Poblacion Market St., Philippines',
  receipt_footer: 'Thank you for your purchase! Please come again!',
  default_low_stock: 5,
  currency_symbol: '₱'
}

export async function initDatabase(): Promise<void> {
  // Ensure default Master Admin exists uniquely
  try {
    const existingAdmin = await db.users.where('username').equalsIgnoreCase('admin').first()
    if (!existingAdmin) {
      await db.users.add({
        username: 'admin',
        name: 'Master Admin',
        role: 'ADMIN',
        pin: '1234',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      })
    } else {
      // Clean up any duplicate admin entries
      const allAdmins = await db.users.where('username').equalsIgnoreCase('admin').toArray()
      if (allAdmins.length > 1) {
        for (let i = 1; i < allAdmins.length; i++) {
          if (allAdmins[i].id) {
            await db.users.delete(allAdmins[i].id!)
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to initialize users table:', err)
  }

  // Seed standard categories if empty
  const catCount = await db.categories.count()
  if (catCount === 0) {
    const beverageId = await db.categories.add({ id: 1, name: 'Beverages', parent_id: null, sort_order: 1 })
    await db.categories.add({ id: 2, name: 'Snacks & Biscuits', parent_id: null, sort_order: 2 })
    await db.categories.add({ id: 3, name: 'Canned Goods', parent_id: null, sort_order: 3 })
    await db.categories.add({ id: 4, name: 'Instant Noodles', parent_id: null, sort_order: 4 })
    await db.categories.add({ id: 5, name: 'Personal Care', parent_id: null, sort_order: 5 })

    // Seed subcategories
    await db.categories.add({ id: 6, name: 'Soft Drinks', parent_id: beverageId, sort_order: 1 })
    await db.categories.add({ id: 7, name: 'Coffee & Tea', parent_id: beverageId, sort_order: 2 })
  }

  // Save default settings if not exists
  const hasSettings = await db.settings.get('store_settings')
  if (!hasSettings) {
    await db.settings.put({ key: 'store_settings', value: DEFAULT_SETTINGS })
  }

  // Seed standard expense categories if empty
  const expCatCount = await db.expense_categories.count()
  if (expCatCount === 0) {
    const defaultExpCats = [
      'Rent',
      'Electricity',
      'Water',
      'Ice',
      'Plastic & Packaging',
      'Labor & Wages',
      'Store Supplies',
      'Meals & Food',
      'Delivery / Transpo',
      'Miscellaneous'
    ]
    for (const name of defaultExpCats) {
      await db.expense_categories.add({ name })
    }
  }

  // Seed initial vendor/suppliers if empty
  const supCount = await db.suppliers.count()
  if (supCount === 0) {
    await db.suppliers.bulkAdd([
      {
        name: 'Puregold Price Club',
        contact_person: 'Wholesale Desk',
        phone: '0917-123-4567',
        address: 'National Highway, City Proper',
        notes: 'Groceries, canned goods, detergents, snacks, toiletries',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      },
      {
        name: 'San Miguel Brewery & Foods',
        contact_person: 'Agent Mark',
        phone: '0918-234-5678',
        address: 'Provincial Distributor Warehouse',
        notes: 'Beer, gin, Magnolia poultry & dairy, San Mig Coffee',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      },
      {
        name: 'Coca-Cola Beverages PH',
        contact_person: 'Route Agent',
        phone: '0922-345-6789',
        address: 'Bottling Sales Center',
        notes: 'Coke Kasalo, Mismo, Royal, Sprite, Wilkins, Minute Maid',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      },
      {
        name: 'Local Bagsakan / Wet Market Wholesaler',
        contact_person: 'Kuya Edgar',
        phone: '0939-567-8901',
        address: 'Public Market Stalls 12-14',
        notes: 'Eggs, onion, garlic, sugar, cooking oil, rice sacks',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      }
    ])
  }

  // Seed or upgrade DTI & Market Price References
  try {
    const priceRefCount = await db.price_references.count()
    if (priceRefCount === 0 && SEED_PRICE_REFERENCES && SEED_PRICE_REFERENCES.length > 0) {
      await db.price_references.bulkAdd(SEED_PRICE_REFERENCES as any)
    } else if (priceRefCount < SEED_PRICE_REFERENCES.length) {
      // Upsert any missing references
      for (const item of SEED_PRICE_REFERENCES) {
        const exists = await db.price_references.where('barcode').equals(item.barcode).first()
        if (!exists) {
          await db.price_references.add(item as any)
        }
      }
    }
  } catch (err) {
    console.error('Failed to seed or update price references:', err)
  }
}
