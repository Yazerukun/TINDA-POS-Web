import Dexie, { type Table } from 'dexie'
import type { Product, Category, Transaction, HeldCart, Customer, StoreSettings } from '../types'

export class TindaWebDatabase extends Dexie {
  products!: Table<Product, number>
  categories!: Table<Category, number>
  transactions!: Table<Transaction, number>
  held_carts!: Table<HeldCart, string>
  customers!: Table<Customer, number>
  settings!: Table<{ key: string; value: any }, string>

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

  const now = new Date().toISOString()

  // Seed sample products
  const initialProducts: Omit<Product, 'id'>[] = [
    {
      name: 'Coca-Cola Mismo 290ml',
      sku: 'BEV-CC-290',
      barcode: '4800016054123',
      category_id: beverageId,
      subcategory_id: softDrinksId,
      base_unit: 'bottle',
      cost_c: 1500,
      default_price_c: 2000,
      stock: 48,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'Sprite Mismo 290ml',
      sku: 'BEV-SP-290',
      barcode: '4800016054130',
      category_id: beverageId,
      subcategory_id: softDrinksId,
      base_unit: 'bottle',
      cost_c: 1500,
      default_price_c: 2000,
      stock: 36,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'Kopiko Blanca 30g Sachet',
      sku: 'BEV-KOP-BL',
      barcode: '8996001414002',
      category_id: beverageId,
      subcategory_id: coffeeId,
      base_unit: 'sachet',
      cost_c: 1100,
      default_price_c: 1500,
      stock: 80,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'Lucky Me! Pancit Canton Kalamansi 60g',
      sku: 'NOOD-LM-KAL',
      barcode: '4800016641019',
      category_id: instantId,
      subcategory_id: null,
      base_unit: 'pack',
      cost_c: 1400,
      default_price_c: 1800,
      stock: 65,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'Lucky Me! Pancit Canton Chilimansi 60g',
      sku: 'NOOD-LM-CHIL',
      barcode: '4800016641026',
      category_id: instantId,
      subcategory_id: null,
      base_unit: 'pack',
      cost_c: 1400,
      default_price_c: 1800,
      stock: 50,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'Mega Sardines in Tomato Sauce 155g',
      sku: 'CAN-MEGA-RED',
      barcode: '4806505541014',
      category_id: cannedId,
      subcategory_id: null,
      base_unit: 'can',
      cost_c: 2200,
      default_price_c: 2600,
      stock: 40,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'San Marino Corned Tuna 150g',
      sku: 'CAN-SM-TUNA',
      barcode: '4800110023412',
      category_id: cannedId,
      subcategory_id: null,
      base_unit: 'can',
      cost_c: 3200,
      default_price_c: 3800,
      stock: 25,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'Safeguard Pure White 60g',
      sku: 'PER-SAFE-60',
      barcode: '4902430754120',
      category_id: personalId,
      subcategory_id: null,
      base_unit: 'bar',
      cost_c: 2200,
      default_price_c: 2800,
      stock: 30,
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      name: 'Piattos Cheese 40g',
      sku: 'SNK-PIAT-CH',
      barcode: '4800016023412',
      category_id: snacksId,
      subcategory_id: null,
      base_unit: 'pack',
      cost_c: 1600,
      default_price_c: 2000,
      stock: 4, // Low stock demo!
      image_path: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    }
  ]

  for (const p of initialProducts) {
    await db.products.add(p as Product)
  }

  // Seed sample customers for Utang credit tracking
  await db.customers.bulkAdd([
    {
      id: 1,
      name: 'Nang Ester (Suki)',
      contact: '09171234567',
      balance_c: 45000, // ₱450.00 utang
      credit_limit_c: 200000,
      notes: 'Pay every 15th and 30th (Sahod day)',
      created_at: now,
      updated_at: now
    },
    {
      id: 2,
      name: 'Kuya Junjun Driver',
      contact: '09289876543',
      balance_c: 12000, // ₱120.00 utang
      credit_limit_c: 100000,
      notes: 'Tricycle TODA neighbor',
      created_at: now,
      updated_at: now
    }
  ])

  // Save default settings
  await db.settings.put({ key: 'store_settings', value: DEFAULT_SETTINGS })
}
