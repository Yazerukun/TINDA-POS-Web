import { db } from '../db'

export async function exportTindaBackup(): Promise<string> {
  const [
    products,
    categories,
    transactions,
    customers,
    settings,
    expenses,
    expense_categories,
    suppliers,
    cash_counts,
    z_reads,
    users
  ] = await Promise.all([
    db.products.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.customers.toArray(),
    db.settings.toArray(),
    db.expenses.toArray(),
    db.expense_categories.toArray(),
    db.suppliers.toArray(),
    db.cash_counts.toArray(),
    db.z_reads.toArray(),
    db.users.toArray()
  ])

  const backupData = {
    version: '1.2.0',
    platform: 'web',
    exported_at: new Date().toISOString(),
    data: {
      products,
      categories,
      transactions,
      customers,
      settings,
      expenses,
      expense_categories,
      suppliers,
      cash_counts,
      z_reads,
      users
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

    await db.transaction(
      'rw',
      [
        db.products,
        db.categories,
        db.transactions,
        db.customers,
        db.settings,
        db.expenses,
        db.expense_categories,
        db.suppliers,
        db.cash_counts,
        db.z_reads,
        db.users
      ],
      async () => {
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
        if (Array.isArray(data.expenses) && data.expenses.length > 0) {
          await db.expenses.clear()
          await db.expenses.bulkAdd(data.expenses)
        }
        if (Array.isArray(data.expense_categories) && data.expense_categories.length > 0) {
          await db.expense_categories.clear()
          await db.expense_categories.bulkAdd(data.expense_categories)
        }
        if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
          await db.suppliers.clear()
          await db.suppliers.bulkAdd(data.suppliers)
        }
        if (Array.isArray(data.cash_counts) && data.cash_counts.length > 0) {
          await db.cash_counts.clear()
          await db.cash_counts.bulkAdd(data.cash_counts)
        }
        if (Array.isArray(data.z_reads) && data.z_reads.length > 0) {
          await db.z_reads.clear()
          await db.z_reads.bulkAdd(data.z_reads)
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          await db.users.clear()
          await db.users.bulkAdd(data.users)
        }
      }
    )

    return { success: true, message: 'Database successfully restored!' }
  } catch (err) {
    return { success: false, message: (err as Error)?.message || 'Invalid backup file.' }
  }
}
