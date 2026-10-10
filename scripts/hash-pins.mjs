#!/usr/bin/env node
// Hashes the plaintext PINs left in D1 and clears the column.
//
// Run once, after migrations/0001 and before deploying. The old GET /api/users
// returned every user's plaintext PIN, so these are all compromised and each
// account is flagged must_rotate_pin to force a change at next login.
//
//   node scripts/hash-pins.mjs            # dry run, prints the plan
//   node scripts/hash-pins.mjs --apply    # writes to the remote database

import { execFileSync } from 'node:child_process'

const APPLY = process.argv.includes('--apply')
const DB = 'tindapos-db'
const ITERATIONS = 100_000

// Keep the object: webcrypto.getRandomValues is a method and throws ERR_INVALID_THIS
// when destructured off the receiver.
import { webcrypto as wc } from 'node:crypto'

function b64url(bytes) {
  return Buffer.from(bytes).toString('base64url')
}

async function hashPin(pin, saltHex) {
  // deriveBits wants bytes, not the base64url text used in the salt column.
  const salt = Uint8Array.from(Buffer.from(saltHex, 'base64url'))
  const key = await wc.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await wc.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256)
  return Buffer.from(bits).toString('hex')
}

function sql(query) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--command', query, '--json'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  )
  const parsed = JSON.parse(out)
  return parsed[parsed.length - 1].results ?? []
}

const rows = sql('SELECT id, username, pin FROM users WHERE pin IS NOT NULL')
console.log(`${rows.length} account(s) with a plaintext PIN`)

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to write.')
  for (const r of rows) console.log(`  #${r.id} ${r.username}`)
  process.exit(0)
}

for (const row of rows) {
  const salt = b64url(wc.getRandomValues(new Uint8Array(16)))
  const pinHash = await hashPin(row.pin, salt)
  sql(
    `UPDATE users SET pin_hash = '${pinHash}', pin_salt = '${salt}', pin = NULL, must_rotate_pin = 1 WHERE id = ${Number(row.id)}`
  )
  console.log(`hashed #${row.id} ${row.username}`)
}

const left = sql('SELECT COUNT(*) AS n FROM users WHERE pin IS NOT NULL')
console.log(`\ndone. ${left[0].n} plaintext PIN(s) remain`)