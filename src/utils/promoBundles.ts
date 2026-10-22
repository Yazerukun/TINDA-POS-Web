// File: src/utils/promoBundles.ts
// Promo Bundles, Buy-1-Take-1, and Volume Combos Engine for TINDA POS Web

import type { Product, CartItem } from '../types'

export type PromoType = 'FIXED_COMBO' | 'VOLUME_TIER'

export interface PromoBundleItem {
  product_id?: number
  name_keyword: string
  quantity: number
}

export interface PromoBundle {
  id: string
  name: string
  type: PromoType
  bundle_price_c: number
  is_active: boolean
  description: string
  badge?: string
  // For FIXED_COMBO:
  items: PromoBundleItem[]
  // For VOLUME_TIER:
  target_name_keyword?: string
  min_quantity?: number
}

const STORAGE_KEY = 'tinda_promo_bundles_v1'
export const PROMOS_CHANGED_EVENT = 'tinda:promos-changed'

export const DEFAULT_PROMO_BUNDLES: PromoBundle[] = [
  {
    id: 'combo_breakfast',
    name: 'Breakfast Combo (Pancit Canton + Egg)',
    type: 'FIXED_COMBO',
    bundle_price_c: 2800, // ₱28.00 (regular ₱32.00)
    is_active: true,
    description: 'Instant pancit canton plus fresh egg bundle',
    badge: 'Popular',
    items: [
      { name_keyword: 'canton', quantity: 1 },
      { name_keyword: 'egg', quantity: 1 }
    ]
  },
  {
    id: 'combo_snack',
    name: 'Merienda Combo (Drink + Snack)',
    type: 'FIXED_COMBO',
    bundle_price_c: 3000, // ₱30.00 (regular ₱35.00)
    is_active: true,
    description: 'Chilled beverage and chips / biscuit combo',
    badge: 'Save ₱5',
    items: [
      { name_keyword: 'coke', quantity: 1 },
      { name_keyword: 'chippy', quantity: 1 }
    ]
  },
  {
    id: 'tier_noodles_3for50',
    name: '3 Noodles for ₱50 Deal',
    type: 'VOLUME_TIER',
    bundle_price_c: 5000, // ₱50.00
    is_active: true,
    description: 'Buy any 3 instant noodle packs for ₱50',
    badge: 'Volume Deal',
    items: [],
    target_name_keyword: 'noodles',
    min_quantity: 3
  }
]

export function getStoredPromoBundles(): PromoBundle[] {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_PROMO_BUNDLES
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROMO_BUNDLES
    const parsed = JSON.parse(raw) as PromoBundle[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROMO_BUNDLES
  } catch {
    return DEFAULT_PROMO_BUNDLES
  }
}

export function savePromoBundles(bundles: PromoBundle[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bundles))
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROMOS_CHANGED_EVENT, { detail: bundles }))
  }
}

export function resetPromoBundles(): PromoBundle[] {
  savePromoBundles(DEFAULT_PROMO_BUNDLES)
  return DEFAULT_PROMO_BUNDLES
}
