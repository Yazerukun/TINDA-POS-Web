// File: src/utils/billerCustomization.ts
// Custom Biller Presets for E-Wallet & Bills Payment Hub

export type BillerCategory = 'UTILITIES' | 'WATER' | 'LOANS' | 'TELCO' | 'INTERNET' | 'GOVERNMENT' | 'OTHER'

export interface BillerPreset {
  id: string
  name: string
  category: BillerCategory
  defaultFee: number
  icon: string
  isEload?: boolean // Protected telco E-Load networks (Globe, Smart, DITO)
}

export const DEFAULT_BILLER_PRESETS: BillerPreset[] = [
  // Utilities
  { id: 'util-meralco', name: 'Meralco', category: 'UTILITIES', defaultFee: 15, icon: '⚡' },
  { id: 'util-elec-coop', name: 'Electric Cooperative', category: 'UTILITIES', defaultFee: 15, icon: '⚡' },
  { id: 'util-veco', name: 'VECO / Visayan Electric', category: 'UTILITIES', defaultFee: 15, icon: '⚡' },
  // Water
  { id: 'water-maynilad', name: 'Maynilad / Manila Water', category: 'WATER', defaultFee: 15, icon: '💧' },
  { id: 'water-local', name: 'Local Water District', category: 'WATER', defaultFee: 15, icon: '💧' },
  // Loans & Credit
  { id: 'loan-home-credit', name: 'Home Credit', category: 'LOANS', defaultFee: 20, icon: '💳' },
  { id: 'loan-tala', name: 'Cashalo / Tala', category: 'LOANS', defaultFee: 20, icon: '💳' },
  { id: 'loan-shopee', name: 'ShopeePay / SPayLater', category: 'LOANS', defaultFee: 15, icon: '🛍️' },
  // Internet
  { id: 'net-converge', name: 'Converge ICT', category: 'INTERNET', defaultFee: 20, icon: '🌐' },
  { id: 'net-pldt', name: 'PLDT Home / Smart Bro', category: 'INTERNET', defaultFee: 20, icon: '🌐' },
  // Telco E-Load (Protected Networks)
  { id: 'telco-globe', name: 'Globe / TM Regular / Promo', category: 'TELCO', defaultFee: 5, icon: '📶', isEload: true },
  { id: 'telco-smart', name: 'Smart / TNT Regular / Promo', category: 'TELCO', defaultFee: 5, icon: '📶', isEload: true },
  { id: 'telco-dito', name: 'DITO Telecommunity', category: 'TELCO', defaultFee: 5, icon: '📶', isEload: true }
]

export const BILLER_CUSTOMIZATION_STORAGE_KEY = 'tinda_custom_biller_presets_v1'
export const BILLERS_CHANGED_EVENT = 'tinda:billers-changed'

export function loadBillerPresets(): BillerPreset[] {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_BILLER_PRESETS
    const raw = localStorage.getItem(BILLER_CUSTOMIZATION_STORAGE_KEY)
    if (!raw) return DEFAULT_BILLER_PRESETS
    const parsed = JSON.parse(raw) as BillerPreset[]
    if (Array.isArray(parsed) && parsed.length > 0) {
      const eloads = DEFAULT_BILLER_PRESETS.filter((b) => b.isEload)
      const nonEloads = parsed.filter((b) => !b.isEload)
      return [...nonEloads, ...eloads]
    }
  } catch {}
  return DEFAULT_BILLER_PRESETS
}

export function saveBillerPresets(presets: BillerPreset[]): void {
  try {
    const eloads = DEFAULT_BILLER_PRESETS.filter((b) => b.isEload)
    const customNonEloads = presets.filter((b) => !b.isEload)
    const toSave = [...customNonEloads, ...eloads]
    localStorage.setItem(BILLER_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(toSave))
    window.dispatchEvent(new CustomEvent(BILLERS_CHANGED_EVENT))
  } catch {}
}

export function resetBillerPresets(): BillerPreset[] {
  try {
    localStorage.removeItem(BILLER_CUSTOMIZATION_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(BILLERS_CHANGED_EVENT))
  } catch {}
  return DEFAULT_BILLER_PRESETS
}
