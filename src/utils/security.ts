/**
 * TINDA POS Web Security Suite
 * High-assurance client-side cryptographic hashing, input sanitization, and device fingerprinting.
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
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
