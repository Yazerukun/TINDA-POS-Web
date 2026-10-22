// File: src/utils/speedKeys.ts
// Speed Keys / Fast Buttons configuration and state management for POS

export interface SpeedKeyItem {
  id: string
  name: string
  price_c: number
  productId?: number | null
  image_path?: string | null
  icon?: string
  color?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' | 'slate' | 'indigo'
  unit_name?: string
  default_qty?: number
}

export const SPEED_KEYS_CHANGED_EVENT = 'tinda:speed-keys-changed'
const STORAGE_KEY = 'tinda_pos_speed_keys_v1'

export const DEFAULT_SPEED_KEYS: SpeedKeyItem[] = [
  {
    id: 'speedkey-yelo',
    name: 'Yelo (Ice Bag)',
    price_c: 500,
    icon: '🧊',
    color: 'cyan',
    unit_name: 'bag',
    default_qty: 1
  },
  {
    id: 'speedkey-yosi',
    name: 'Yosi (Single Stick)',
    price_c: 1000,
    icon: '🚬',
    color: 'amber',
    unit_name: 'stick',
    default_qty: 1
  },
  {
    id: 'speedkey-candy',
    name: 'Candy (Assorted)',
    price_c: 100,
    icon: '🍬',
    color: 'rose',
    unit_name: 'pc',
    default_qty: 1
  },
  {
    id: 'speedkey-sando',
    name: 'Sando Bag (Plastic)',
    price_c: 200,
    icon: '🛍️',
    color: 'emerald',
    unit_name: 'pc',
    default_qty: 1
  },
  {
    id: 'speedkey-itlog',
    name: 'Fresh Egg (Itlog)',
    price_c: 900,
    icon: '🥚',
    color: 'amber',
    unit_name: 'pc',
    default_qty: 1
  },
  {
    id: 'speedkey-water',
    name: 'Mineral Water (500ml)',
    price_c: 1500,
    icon: '💧',
    color: 'cyan',
    unit_name: 'bot',
    default_qty: 1
  }
]

export const SPEED_KEY_COLORS: Record<
  'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' | 'slate' | 'indigo',
  {
    name: string
    card: string
    badge: string
    border: string
    text: string
    dot: string
  }
> = {
  cyan: {
    name: 'Cyan Ice',
    card: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-400 active:scale-95',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    border: 'border-cyan-500/40',
    text: 'text-cyan-300',
    dot: 'bg-cyan-400'
  },
  amber: {
    name: 'Amber Glow',
    card: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-400 active:scale-95',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    dot: 'bg-amber-400'
  },
  rose: {
    name: 'Rose Ruby',
    card: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 hover:border-rose-400 active:scale-95',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    border: 'border-rose-500/40',
    text: 'text-rose-300',
    dot: 'bg-rose-400'
  },
  emerald: {
    name: 'Emerald Green',
    card: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-400 active:scale-95',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400'
  },
  indigo: {
    name: 'Indigo Violet',
    card: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 hover:border-indigo-400 active:scale-95',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    border: 'border-indigo-500/40',
    text: 'text-indigo-300',
    dot: 'bg-indigo-400'
  },
  violet: {
    name: 'Purple Velvet',
    card: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 hover:border-purple-400 active:scale-95',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    border: 'border-purple-500/40',
    text: 'text-purple-300',
    dot: 'bg-purple-400'
  },
  slate: {
    name: 'Slate Carbon',
    card: 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/30 hover:border-slate-400 active:scale-95',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    border: 'border-slate-500/40',
    text: 'text-slate-300',
    dot: 'bg-slate-400'
  }
}

export function getStoredSpeedKeys(): SpeedKeyItem[] {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SPEED_KEYS
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SPEED_KEYS
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch {
    // fallback
  }
  return DEFAULT_SPEED_KEYS
}

export function saveSpeedKeys(keys: SpeedKeyItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SPEED_KEYS_CHANGED_EVENT, { detail: keys }))
  }
}

export function resetSpeedKeysToDefault(): SpeedKeyItem[] {
  saveSpeedKeys(DEFAULT_SPEED_KEYS)
  return DEFAULT_SPEED_KEYS
}
