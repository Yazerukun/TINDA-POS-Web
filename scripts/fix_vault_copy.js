const fs = require('fs')

function edit(file, pairs, label) {
  let s = fs.readFileSync(file, 'utf8')
  let n = 0
  for (const [a, b] of pairs) {
    if (s.includes(a)) { s = s.split(a).join(b); n++ }
  }
  fs.writeFileSync(file, s)
  console.log(`${label}: ${n} applied`)
}

// ---- 1) Navigation.tsx: Vault -> Inventory label ----
edit('src/components/Navigation.tsx', [
  ["{ id: 'inventory', label: 'Vault', icon: Package },", "{ id: 'inventory', label: 'Inventory', icon: Package },"],
  [`{ id: "inventory", label: "Vault", icon: Package },`, `{ id: "inventory", label: "Inventory", icon: Package },`],
], 'Navigation label')

// ---- 2) VaultAuthModal.tsx: user-visible copy Vault->Inventory ----
edit('src/components/VaultAuthModal.tsx', [
  ["{ icon: WifiOff, title: 'Offline-first vault', desc: 'Your register works with zero signal' },",
   "{ icon: WifiOff, title: 'Offline-first inventory', desc: 'Your register works with zero signal' },"],
  ["{ icon: ShieldCheck, title: 'End-to-end session records', desc: 'Every shift is sealed and auditable' },",
   "{ icon: ShieldCheck, title: 'End-to-end session records', desc: 'Every shift is sealed and auditable' },"],
  ["the Tinda vault", "the Tinda inventory"],
  ["Confirm & Open Vault Session", "Confirm & Open Inventory Session"],
  ["Senior Vault Associate", "Senior Inventory Associate"],
  ["The Private Vault", "The Private Inventory"],
  ["Protocol to open a private vault shift on the Tinda terminal.", "Protocol to open a private inventory shift on the Tinda terminal."],
  ["Authorized concierge access to the Tinda vault.", "Authorized concierge access to the Tinda inventory."],
], 'VaultAuthModal copy')

console.log('done')
