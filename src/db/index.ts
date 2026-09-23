import Dexie, { type Table } from 'dexie'
import type { Product, Category, Transaction, HeldCart, Customer, StoreSettings, RestockLog, UserAccount } from '../types'

export class TindaWebDatabase extends Dexie {
  products!: Table<Product, number>
  categories!: Table<Category, number>
  transactions!: Table<Transaction, number>
  held_carts!: Table<HeldCart, string>
  customers!: Table<Customer, number>
  settings!: Table<{ key: string; value: any }, string>
  restock_logs!: Table<RestockLog, number>
  users!: Table<UserAccount, number>

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
  }
}

export const db = new TindaWebDatabase()

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'TINDA SARI-SARI & MINIMART',
  owner_name: 'Boss Store Owner',
  contact_number: '+63 912 345 6789',
  address: 'Poblacion Market St., Philippines',
  receipt_footer: 'Salamat sa pagpalit! Balik-balik kamo!',
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

  const catCount = await db.categories.count()
  if (catCount > 0) return

  // Seed standard categories
  const beverageId = await db.categories.add({ id: 1, name: 'Beverages', parent_id: null, sort_order: 1 })
  const snacksId = await db.categories.add({ id: 2, name: 'Snacks & Biscuits', parent_id: null, sort_order: 2 })
  const cannedId = await db.categories.add({ id: 3, name: 'Canned Goods', parent_id: null, sort_order: 3 })
  const instantId = await db.categories.add({ id: 4, name: 'Instant Noodles', parent_id: null, sort_order: 4 })
  const personalId = await db.categories.add({ id: 5, name: 'Personal Care', parent_id: null, sort_order: 5 })

  // Seed subcategories
  const softDrinksId = await db.categories.add({ id: 6, name: 'Soft Drinks', parent_id: beverageId, sort_order: 1 })
  const coffeeId = await db.categories.add({ id: 7, name: 'Coffee & Tea', parent_id: beverageId, sort_order: 2 })

  // Save default settings
  await db.settings.put({ key: 'store_settings', value: DEFAULT_SETTINGS })
}
