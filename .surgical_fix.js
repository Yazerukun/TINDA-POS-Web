const fs = require('fs')

function replaceFirst(file, pairs) {
  let s = fs.readFileSync(file, 'utf8')
  let n = 0
  for (const [a, b] of pairs) {
    if (s.includes(a)) { s = s.split(a).join(b); n++ }
  }
  fs.writeFileSync(file, s)
  return n
}

// ---- 1) Navigation: Vault label -> Inventory ----
const nav = 'src/components/Navigation.tsx'
const navs = fs.readFileSync(nav, 'utf8')
const hasVaultLabel = /label: ['"]Vault['"]/.test(navs)
let navFixed = navs.replace(/\blabel: ['"](?:Private )?Vault['"]/g, (m) => {
  const isPrivate = /Private /.test(m)
  return isPrivate ? m.replace('Vault', 'Inventory') : m.replace('Vault', 'Inventory')
})
// garantiya exact line 32
navFixed = navFixed.replace("{ id: 'inventory', label: 'Vault', icon: Package }", "{ id: 'inventory', label: 'Inventory', icon: Package }")
fs.writeFileSync(nav, navFixed)

// ---- 2) VaultAuthModal: user-visible Vault->Inventory copy ----
const vam = 'src/components/VaultAuthModal.tsx'
const vamN = replaceFirst(vam, [
  ["role: 'Senior Vault Associate'", "role: 'Senior Inventory Associate'"],
  ["{ icon: WifiOff, title: 'Offline-first vault', desc: 'Your register works with zero signal' }", "{ icon: WifiOff, title: 'Offline-first inventory', desc: 'Your register works with zero signal' }"],
  ["Authorized concierge access to the Tinda vault.", "Authorized concierge access to the Tinda inventory."],
  ["Confirm & Open Vault Session", "Confirm & Open Inventory Session"],
  ["Shift floats, private settlement and client records — sealed under a single terminal session.", "Shift floats, private settlement and client records — sealed under a single terminal session."],
])

// ---- 3) db/index.ts: remove seed products + demo customers, keep categories/settings ----
const db = 'src/db/index.ts'
const ds = fs.readFileSync(db, 'utf8')
const handlers = {
  products: /  const initialProducts[\s\S]*?\/\/ Seed sample customers for Utang credit tracking/,
  customers: /  \/\/ Seed sample customers for Utang credit tracking[\s\S]*?await db\.customers\.bulkAdd\([\s\S]*?\n  \)/,
}
let dbFixed = ds
dbFixed = dbFixed.replace(handlers.products, '')
dbFixed = dbFixed.replace(handlers.customers, '')

fs.writeFileSync(db, dbFixed)

console.log('Navigation Vault-label matches:', hasVaultLabel)
console.log('Nav now:', navFixed.match(/\{ id: 'inventory'[^}]*\}/)?.[0])
console.log('VaultAuthModal edits applied:', vamN)
console.log('db products-block removed:', ds.length - dbFixed.length, 'chars trimmed')
