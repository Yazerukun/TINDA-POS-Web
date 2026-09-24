import type { PriceReference } from '../types'
import { money } from './format'

export type SrpComparisonStatus =
  | 'MATCH'
  | 'WITHIN_RANGE'
  | 'ABOVE_SRP'
  | 'BELOW_SRP'
  | 'NO_SRP'

export interface SrpComparisonResult {
  status: SrpComparisonStatus
  label: string
  diffC: number
  badgeClass: string
}

/**
 * Searches local price reference records for a matching product by barcode or title.
 */
export function findSuggestedPrice(
  product: { barcode?: string | null; name?: string | null },
  priceReferences: PriceReference[]
): PriceReference | null {
  if (!priceReferences || priceReferences.length === 0) return null

  // 1. Exact Barcode Match
  if (product.barcode && product.barcode.trim()) {
    const cleanBarcode = product.barcode.trim()
    const found = priceReferences.find((r) => r.barcode === cleanBarcode)
    if (found) return found
  }

  // 2. Fuzzy / Keyword Name Match
  if (product.name && product.name.trim()) {
    const nameLower = product.name.toLowerCase().trim()

    // Direct exact or includes
    const directMatch = priceReferences.find(
      (r) =>
        r.product_name.toLowerCase() === nameLower ||
        nameLower.includes(r.product_name.toLowerCase()) ||
        r.product_name.toLowerCase().includes(nameLower)
    )
    if (directMatch) return directMatch

    // Tokenized keyword match
    const keywords = nameLower.split(/\s+/).filter((k) => k.length > 2)
    if (keywords.length > 0) {
      const best = priceReferences.find((r) => {
        const refText = `${r.product_name} ${r.brand} ${r.variant || ''}`.toLowerCase()
        return keywords.every((kw) => refText.includes(kw))
      })
      if (best) return best
    }
  }

  return null
}

/**
 * Compares current selling price against official suggested price / market range.
 */
export function getSrpComparison(
  sellingPriceC: number,
  suggestedPriceC?: number | null,
  minPriceC?: number | null,
  maxPriceC?: number | null
): SrpComparisonResult {
  if (!suggestedPriceC || suggestedPriceC <= 0) {
    return {
      status: 'NO_SRP',
      label: 'No SRP',
      diffC: 0,
      badgeClass: 'bg-zinc-800 text-stone-400 border border-zinc-700/50'
    }
  }

  // Check Range if defined
  if (minPriceC && maxPriceC && minPriceC > 0 && maxPriceC >= minPriceC) {
    if (sellingPriceC >= minPriceC && sellingPriceC <= maxPriceC) {
      return {
        status: 'WITHIN_RANGE',
        label: 'SRP OK',
        diffC: sellingPriceC - suggestedPriceC,
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
      }
    }
  }

  const diffC = sellingPriceC - suggestedPriceC

  if (diffC === 0) {
    return {
      status: 'MATCH',
      label: 'Exact SRP',
      diffC: 0,
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    }
  }

  if (diffC > 0) {
    return {
      status: 'ABOVE_SRP',
      label: `+${money(diffC)} Above SRP`,
      diffC,
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    }
  }

  return {
    status: 'BELOW_SRP',
    label: `${money(diffC)} Below SRP`,
    diffC,
    badgeClass: 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
  }
}
