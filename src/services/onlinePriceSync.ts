import { db } from '../db'
import type { PriceReferenceInput } from '../types'

export interface SyncPriceResult {
  success: boolean
  offline?: boolean
  newCount: number
  totalCount: number
  lastUpdated?: string
  message: string
}

/**
 * Synchronizes the local Dexie price_references table with the Cloudflare Edge API.
 * Works seamlessly online, and gracefully handles offline situations.
 */
export async function syncOnlinePriceCatalog(): Promise<SyncPriceResult> {
  try {
    // 1. Check if navigator is online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const localCount = await db.price_references.count()
      return {
        success: false,
        offline: true,
        newCount: 0,
        totalCount: localCount,
        message: 'Device is offline. Using local cached price catalog.'
      }
    }

    // 2. Fetch from Cloudflare Edge API endpoint
    // Fall back to /api/prices.json if /api/prices is not available
    let res: Response | null = null
    try {
      res = await fetch('/api/prices?t=' + Date.now())
      if (!res.ok) {
        res = await fetch('/api/prices.json?t=' + Date.now())
      }
    } catch {
      res = await fetch('/api/prices.json?t=' + Date.now())
    }

    if (!res || !res.ok) {
      const localCount = await db.price_references.count()
      return {
        success: false,
        offline: true,
        newCount: 0,
        totalCount: localCount,
        message: 'Could not reach cloud price endpoint. Using local catalog.'
      }
    }

    const payload = await res.json()
    const items: PriceReferenceInput[] = payload.items || []

    if (!items || items.length === 0) {
      const localCount = await db.price_references.count()
      return {
        success: true,
        newCount: 0,
        totalCount: localCount,
        message: 'Local catalog is already up to date.'
      }
    }

    // 3. Upsert into db.price_references
    let newCount = 0
    for (const item of items) {
      if (!item.barcode) continue
      const existing = await db.price_references.where('barcode').equals(item.barcode).first()
      if (!existing) {
        await db.price_references.add(item as any)
        newCount++
      } else {
        // Update price if cloud has updated data
        if (
          existing.market_price_c !== item.market_price_c ||
          existing.product_name !== item.product_name
        ) {
          await db.price_references.update(existing.id, {
            market_price_c: item.market_price_c,
            min_price_c: item.min_price_c,
            max_price_c: item.max_price_c,
            effective_date: item.effective_date,
            source_name: item.source_name
          })
        }
      }
    }

    const totalCount = await db.price_references.count()
    const syncTime = new Date().toISOString()

    // Store sync timestamp
    await db.settings.put({
      key: 'last_price_sync',
      value: {
        timestamp: syncTime,
        total: totalCount
      }
    })

    return {
      success: true,
      newCount,
      totalCount,
      lastUpdated: syncTime,
      message: newCount > 0
        ? `Successfully synced ${newCount} new items from DTI & Retail Cloud!`
        : `Catalog verified with Cloud. All ${totalCount} items are up to date.`
    }
  } catch (err: any) {
    console.error('Online price sync error:', err)
    const localCount = await db.price_references.count()
    return {
      success: false,
      newCount: 0,
      totalCount: localCount,
      message: err.message || 'Price sync failed. Continuing with local data.'
    }
  }
}
