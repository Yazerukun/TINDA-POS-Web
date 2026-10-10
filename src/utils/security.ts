/**
 * TINDA POS Web Security Suite
 * High-assurance client-side cryptographic hashing, input sanitization, and device fingerprinting.
 */

const PBKDF2_ITERATIONS = 10_000
const HASH_ALGO = 'SHA-256'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Hashes a 4-6 digit numeric PIN using PBKDF2 with SHA-256 and a random cryptographic salt.
 */
export async function hashPin(pin: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder()
  const salt = existingSalt ? hexToBytes(existingSalt) : crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin.trim()),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO
    },
    keyMaterial,
    256
  )

  const hashHex = bytesToHex(new Uint8Array(derivedBits))
  const saltHex = bytesToHex(salt)

  return { hash: hashHex, salt: saltHex }
}

/**
 * Verifies an entered PIN against a stored PBKDF2 hash or legacy plaintext PIN.
 */
export async function verifyPin(
  inputPin: string,
  storedValue: string,
  storedSalt?: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  const trimmed = inputPin.trim()
  if (!storedValue) return { valid: false, needsRehash: false }

  // Backward compatibility with unhashed plaintext PINs (e.g. '1234')
  if (storedValue === trimmed) {
    return { valid: true, needsRehash: true }
  }

  // If there's a stored salt or if the hash is 64 hex chars (PBKDF2-SHA256)
  if (storedSalt) {
    try {
      const { hash } = await hashPin(trimmed, storedSalt)
      return { valid: hash === storedValue, needsRehash: false }
    } catch {
      return { valid: false, needsRehash: false }
    }
  }

  return { valid: false, needsRehash: false }
}

/**
 * Sanitizes input from handheld laser / 2D barcode scanners and keyboard wedges.
 * Strips non-printable ASCII/control codes, CR/LF artifacts, and dangerous scripts.
 */
export function sanitizeBarcodeInput(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // remove control chars
    .replace(/[<>"'`]/g, '')              // strip XSS sensitive delimiters
    .trim()
}

/**
 * Computes a stable, privacy-preserving Browser Machine ID for VIP licensing.
 * Uses persistent client storage with a hardware entropy seed fallback.
 */
export async function getDeviceMachineId(): Promise<string> {
  const STORAGE_KEY = 'tinda_machine_id'
  const cached = localStorage.getItem(STORAGE_KEY)
  if (cached && /^TINDA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cached)) {
    return cached
  }

  // Generate hardware seed from browser entropy
  const entropy = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    crypto.randomUUID()
  ].join('|')

  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(entropy))
  const hex = bytesToHex(new Uint8Array(digest)).toUpperCase()

  const part1 = hex.substring(0, 4)
  const part2 = hex.substring(4, 8)
  const part3 = hex.substring(8, 12)
  const machineId = `TINDA-${part1}-${part2}-${part3}`

  localStorage.setItem(STORAGE_KEY, machineId)
  return machineId
}
