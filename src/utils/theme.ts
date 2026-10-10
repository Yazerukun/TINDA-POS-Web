/**
 * TINDA POS Multi-Theme Engine
 * 6 curated theme palettes designed for retail clarity, high-contrast POS terminals, and aesthetic elegance.
 */

export type ThemeId = 'emerald' | 'sapphire' | 'stealth' | 'cyber' | 'amber' | 'light'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  subtitle: string
  accentColor: string
  badgeColor: string
  previewBg: string
  isDark: boolean
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'emerald',
    name: 'Emerald Obsidian',
    subtitle: 'Luxury Dark · Signature Default',
    accentColor: '#10b981',
    badgeColor: 'bg-emerald-500 text-stone-950',
    previewBg: 'bg-[#0a0d0f]',
    isDark: true
  },
  {
    id: 'sapphire',
    name: 'Midnight Sapphire',
    subtitle: 'Deep Navy & Electric Cyan Glow',
    accentColor: '#0284c7',
    badgeColor: 'bg-sky-500 text-stone-950',
    previewBg: 'bg-[#060d17]',
    isDark: true
  },
  {
    id: 'stealth',
    name: 'OLED Stealth',
    subtitle: 'True AMOLED Pitch Black & Crisp White',
    accentColor: '#e2e8f0',
    badgeColor: 'bg-stone-200 text-stone-950',
    previewBg: 'bg-[#000000]',
    isDark: true
  },
  {
    id: 'cyber',
    name: 'Cyber Matrix',
    subtitle: 'High-Speed Neon Green & High Visibility',
    accentColor: '#22c55e',
    badgeColor: 'bg-green-500 text-stone-950',
    previewBg: 'bg-[#050e07]',
    isDark: true
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    subtitle: 'Warm Espresso & Honey Gold Glow',
    accentColor: '#f59e0b',
    badgeColor: 'bg-amber-500 text-stone-950',
    previewBg: 'bg-[#120b06]',
    isDark: true
  },
  {
    id: 'light',
    name: 'Daytime Retail Light',
    subtitle: 'High-Contrast Bright Mode for Sunny Counters',
    accentColor: '#059669',
    badgeColor: 'bg-emerald-600 text-white',
    previewBg: 'bg-[#f8fafc]',
    isDark: false
  }
]

const STORAGE_KEY = 'tinda_active_theme'

export function getActiveTheme(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeId
  if (saved && THEMES.some((t) => t.id === saved)) {
    return saved
  }
  return 'emerald'
}

export function applyTheme(themeId: ThemeId): void {
  const root = document.documentElement
  const body = document.body

  // Remove previous theme classes
  THEMES.forEach((t) => {
    root.classList.remove(`theme-${t.id}`)
    body.classList.remove(`theme-${t.id}`)
  })

  // Add new theme class
  root.classList.add(`theme-${themeId}`)
  body.classList.add(`theme-${themeId}`)
  root.setAttribute('data-theme', themeId)

  // Toggle dark class
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]
  if (theme.isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Update theme meta color
  let metaTheme = document.querySelector('meta[name="theme-color"]')
  if (!metaTheme) {
    metaTheme = document.createElement('meta')
    metaTheme.setAttribute('name', 'theme-color')
    document.head.appendChild(metaTheme)
  }
  metaTheme.setAttribute('content', theme.isDark ? '#0a0d0f' : '#ffffff')

  try {
    localStorage.setItem(STORAGE_KEY, themeId)
  } catch {}
}

export function initTheme(): ThemeId {
  const current = getActiveTheme()
  applyTheme(current)
  return current
}
