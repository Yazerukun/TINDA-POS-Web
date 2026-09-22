import { db } from '../db'

export async function exportTindaBackup(): Promise<string> {
  const products = await db.products.toArray()
  const categories = await db.categories.toArray()
  const transactions = await db.transactions.toArray()
  const customers = await db.customers.toArray()
  const settings = await db.settings.toArray()

  const backupData = {
    version: '1.0.1',
    platform: 'web',
    exported_at: new Date().toISOString(),
    data: {
      products,
      categories,
      transactions,
      customers,
      settings
    }
  }

  return JSON.stringify(backupData, null, 2)
}

export async function downloadBackupFile(): Promise<void> {
  const json = await exportTindaBackup()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `tinda-backup-${dateStr}.tinda-backup`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importTindaBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonString)
    const data = parsed.data || parsed

    await db.transaction('rw', [db.products, db.categories, db.transactions, db.customers, db.settings], async () => {
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        await db.categories.clear()
        await db.categories.bulkAdd(data.categories)
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        await db.products.clear()
        await db.products.bulkAdd(data.products)
      }
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        await db.transactions.clear()
        await db.transactions.bulkAdd(data.transactions)
      }
      if (Array.isArray(data.customers) && data.customers.length > 0) {
        await db.customers.clear()
        await db.customers.bulkAdd(data.customers)
      }
      if (Array.isArray(data.settings) && data.settings.length > 0) {
        await db.settings.clear()
        await db.settings.bulkAdd(data.settings)
      }
    })

    return { success: true, message: 'Database successfully restored!' }
  } catch (err) {
    return { success: false, message: (err as Error)?.message || 'Invalid backup file.' }
  }
}
