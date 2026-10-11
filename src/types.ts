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
  suggested_price_c?: number | null
  stock: number
  low_stock_threshold?: number | null
  expiration_date?: string | null
  supplier_id?: number | null
  pieces_per_case?: number | null
  image_path: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  store_name?: string
  created_at: string
  updated_at: string
}

export interface CartItem {
  product: Product
  quantity: number
  unit_price_c: number
  total_c: number
  is_custom_price?: boolean
  original_price_c?: number
}

export type DiscountType = 'NONE' | 'SENIOR_PWD_20' | 'CUSTOM'

export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'MARIBANK' | 'UTANG' | 'SPLIT'

export interface SplitPaymentRecord {
  method: 'CASH' | 'GCASH' | 'MAYA' | 'MARIBANK' | 'UTANG'
  amount_c: number
  reference?: string | null
}

export interface HeldCart {
  id: string
  created_at: string
  items: CartItem[]
  customer_id: number | null
  discount_type: DiscountType
  custom_discount_c?: number
  notes?: string
  store_name?: string
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
  payment_method: PaymentMethod
  payments?: SplitPaymentRecord[]
  amount_tendered_c: number
  change_c: number
  customer_id: number | null
  cashier_name: string
  store_name?: string
  status?: 'COMPLETED' | 'VOIDED' | 'REFUNDED'
  void_reason?: string
  voided_at?: string
  voided_by?: string
}

export interface PrinterCustomizationSettings {
  receipt_paper_width: '58mm' | '80mm'
  receipt_feed_lines_end: number
  receipt_font_scale: number
  receipt_line_spacing: 'compact' | 'balanced' | 'spacious'
  receipt_ultra_black: boolean
  receipt_custom_header: string
  receipt_custom_footer: string
  receipt_show_cashier: boolean
  receipt_show_customer: boolean
  receipt_show_change_breakdown: boolean
  receipt_show_logo: boolean
  receipt_show_barcode: boolean
  receipt_store_name?: string
  receipt_address?: string
  receipt_contact?: string
}

export interface Customer {
  id: number
  name: string
  contact: string
  balance_c: number // Utang balance in cents
  credit_limit_c: number
  notes: string
  store_name?: string
  created_at: string
  updated_at: string
}

export type RestockType = 'RESTOCK' | 'RETURN' | 'ADJUSTMENT'

export interface RestockLog {
  id?: number
  product_id: number
  product_name: string
  quantity: number
  type: RestockType
  before_stock: number
  after_stock: number
  note: string | null
  timestamp: string
  cashier_name: string
  store_name?: string
}

export interface StoreSettings {
  store_name: string
  owner_name: string
  contact_number: string
  address: string
  receipt_footer: string
  default_low_stock: number
  currency_symbol: string
  printer_paper_width?: '58mm' | '80mm' | 'A4'
  printer_show_barcode?: boolean
  printer_show_logo?: boolean
  printer_show_customer_info?: boolean
  printer_auto_print?: boolean
  printer_custom_header?: string
  // PayMongo Gateway & Real-Time E-Wallet Settings
  paymongo_enabled?: boolean
  paymongo_secret_key?: string
  paymongo_public_key?: string
  paymongo_environment?: 'test' | 'live'
  paymongo_auto_complete?: boolean
  store_qr_image_url?: string
  store_qr_label?: string
  theme?: 'emerald' | 'sapphire' | 'stealth' | 'cyber' | 'amber' | 'light'
}

export type UserRole = 'ADMIN' | 'CASHIER' | 'INVENTORY_LEAD'

export interface UserAccount {
  id?: number
  username: string
  name: string
  role: UserRole
  pin: string
  status: 'ACTIVE' | 'DISABLED'
  created_at: string
  updated_at?: string
  last_active_at?: string
  store_name?: string
  owner_username?: string
  is_owner?: boolean
  email?: string
  avatar_url?: string
  is_vip?: boolean
  vip_key?: string
  vip_activated_at?: string
  vip_payment_ref?: string
}

export interface ExpenseCategory {
  id?: number
  name: string
}

export interface Expense {
  id?: number
  category: string
  amount_c: number
  date: string
  description: string
  cashier_name?: string
  store_name?: string
  created_at: string
}

export interface Supplier {
  id?: number
  name: string
  contact_person?: string
  phone?: string
  address?: string
  notes?: string
  status: 'ACTIVE' | 'INACTIVE'
  store_name?: string
  created_at: string
  updated_at?: string
}

export interface PriceReferenceInput {
  barcode: string
  product_name: string
  brand: string
  variant?: string
  unit: string
  market_price_c: number
  min_price_c?: number
  max_price_c?: number
  currency?: string
  source_name?: string
  source_type?: string
  source_url?: string
  location?: string
  effective_date?: string
  image_url?: string
  category?: string
}

export interface PriceReference extends PriceReferenceInput {
  id?: number
}

export interface CashCountRecord {
  id?: number
  business_date: string
  created_at: string
  cashier_name: string
  denominations: Record<string, number>
  total_c: number
  expected_c?: number
  discrepancy_c?: number
  notes?: string
  store_name?: string
}

export interface ZReadRecord {
  id?: number
  date: string
  created_at: string
  cashier_name: string
  total_sales_c: number
  cash_sales_c: number
  gcash_sales_c: number
  utang_sales_c: number
  gross_profit_c: number
  total_expenses_c: number
  net_profit_c: number
  transaction_count: number
  items_sold_count: number
  store_name?: string
}

export interface ProAccessState {
  pro_expires_at: number // unix timestamp ms
  tokens: number
  last_ad_watched_at: number // unix timestamp ms
  total_ads_watched: number
  owner_bypass: boolean
}
