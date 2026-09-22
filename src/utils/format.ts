export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) return '₱0.00'
  const val = cents / 100
  return '₱' + val.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function parsePesoToCents(amount: string | number): number {
  if (typeof amount === 'number') return Math.round(amount * 100)
  const clean = amount.replace(/[^0-9.-]+/g, '')
  const parsed = parseFloat(clean)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100)
}

export function formatDateTime(iso: string | Date): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatShortDate(iso: string | Date): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric'
  })
}
