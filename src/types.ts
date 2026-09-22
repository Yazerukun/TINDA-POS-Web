export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export interface Category {
  id: number
  name: string
  parent_id: number | null
  sort_order: number
}

export interface Product {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  category_id: number | null
  subcategory_id: number | null
  base_unit: string
  cost_c: number
  default_price_c: number
  stock: number
  image_path: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  created_at: string
  updated_at: string
}

export interface CartItem {
  product: Product
  quantity: number
  unit_price_c: number
  total_c: number
}

export type DiscountType = 'NONE' | 'SENIOR_PWD_20' | 'CUSTOM'

export interface HeldCart {
  id: string
  created_at: string
  items: CartItem[]
  customer_id: number | null
  discount_type: DiscountType
  custom_discount_c?: number
  notes?: string
}

export interface TransactionItem {
  product_id: number
  name: string
  unit_name: string
  quantity: number
  unit_price_c: number
  total_c: number
}

export interface Transaction {
  id: number
  invoice_number: string
  created_at: string
  items: TransactionItem[]
  subtotal_c: number
  discount_c: number
  discount_type: DiscountType
  total_c: number
  payment_method: 'CASH' | 'GCASH' | 'UTANG'
  amount_tendered_c: number
  change_c: number
  customer_id: number | null
  cashier_name: string
}

export interface Customer {
  id: number
  name: string
  contact: string
  balance_c: number // Utang balance in cents
  credit_limit_c: number
  notes: string
  created_at: string
  updated_at: string
}

export interface StoreSettings {
  store_name: string
  owner_name: string
  contact_number: string
  address: string
  receipt_footer: string
  default_low_stock: number
  currency_symbol: string
}
