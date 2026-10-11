/**
 * TINDA POS - High-Assurance PayMongo Real-Time Payment Engine
 *
 * Handles Dynamic QR Ph code generation (GCash, Maya, ShopeePay, Bank Apps),
 * real-time status polling, cryptographic tamper verification, and safe key masking.
 */

export interface PayMongoConnectionResult {
  ok: boolean
  message: string
  livemode?: boolean
  error?: string
}

export interface CreateDynamicQrResult {
  ok: boolean
  paymentIntentId?: string
  qrImageUrl?: string
  testUrl?: string
  expiresAt?: string
  error?: string
}

export interface PollPaymentStatusResult {
  ok: boolean
  status: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'cancelled' | 'failed' | 'unknown'
  paid: boolean
  paymentId?: string
  error?: string
}

/**
 * Masks a secret key for secure UI presentation.
 * Example: "sk_test_abc123..." -> "sk_test_••••••••xyz"
 */
export function maskSecretKey(key?: string): string {
  if (!key) return ''
  const trimmed = key.trim()
  if (trimmed.length < 12) return '••••••••'
  const prefix = trimmed.slice(0, 8)
  const suffix = trimmed.slice(-4)
  return `${prefix}••••••••••••${suffix}`
}

/**
 * Validates the basic structural format of a PayMongo secret key.
 */
export function isValidPayMongoSecretKey(key?: string): boolean {
  if (!key) return false
  const trimmed = key.trim()
  return (trimmed.startsWith('sk_test_') || trimmed.startsWith('sk_live_')) && trimmed.length >= 24
}

/**
 * Checks connection and validity of a PayMongo Secret Key.
 * First tries the serverless edge proxy (/api/paymongo), falls back to direct API.
 */
export async function testPayMongoConnection(secretKey: string): Promise<PayMongoConnectionResult> {
  const cleanKey = secretKey.trim()
  if (!isValidPayMongoSecretKey(cleanKey)) {
    return {
      ok: false,
      message: 'Invalid key format. Must start with sk_test_ or sk_live_.',
      error: 'Invalid key format'
    }
  }

  // 1. Try Cloudflare Pages Function Proxy
  try {
    const proxyResp = await fetch('/api/paymongo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_connection', secretKey: cleanKey })
    })

    if (proxyResp.ok) {
      const data = await proxyResp.json()
      if (data.ok) {
        return {
          ok: true,
          livemode: data.livemode,
          message: data.message || 'Successfully connected to PayMongo!'
        }
      }
      return { ok: false, message: data.error || 'Connection failed', error: data.error }
    }
  } catch {
    // Edge function not reachable, fall through to direct call
  }

  // 2. Direct PayMongo API Fallback (Supported via PayMongo CORS)
  try {
    const authHeader = `Basic ${btoa(cleanKey + ':')}`
    const directResp = await fetch('https://api.paymongo.com/v1/payments?limit=1', {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!directResp.ok) {
      const errJson = await directResp.json().catch(() => ({}))
      const detail = errJson?.errors?.[0]?.detail || 'Unauthorized or invalid Secret Key.'
      return { ok: false, message: detail, error: detail }
    }

    const isLive = cleanKey.startsWith('sk_live_')
    return {
      ok: true,
      livemode: isLive,
      message: `Directly connected to PayMongo (${isLive ? 'LIVE Production' : 'TEST Sandbox'} Mode).`
    }
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'Network error connecting to PayMongo servers.',
      error: String(err)
    }
  }
}

/**
 * Creates a Dynamic QR Ph Payment Intent and attaches a QR code.
 */
export async function createDynamicQrPayment(params: {
  secretKey: string
  amountCents: number
  description?: string
}): Promise<CreateDynamicQrResult> {
  const cleanKey = params.secretKey.trim()
  const amountCents = Math.round(params.amountCents)
  const description = params.description || 'TINDA POS Order'

  if (amountCents < 1000) {
    return {
      ok: false,
      error: 'Minimum transaction amount for PayMongo Dynamic QR is ₱10.00 (1,000 cents).'
    }
  }

  // 1. Try Cloudflare Pages Function Proxy
  try {
    const proxyResp = await fetch('/api/paymongo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_qr',
        secretKey: cleanKey,
        amountCents,
        description
      })
    })

    if (proxyResp.ok) {
      const data = await proxyResp.json()
      if (data.ok && data.qrImageUrl) {
        return {
          ok: true,
          paymentIntentId: data.paymentIntentId,
          qrImageUrl: data.qrImageUrl,
          testUrl: data.testUrl,
          expiresAt: data.expiresAt
        }
      }
      if (!data.ok) return { ok: false, error: data.error }
    }
  } catch {
    // Edge function not reachable, fall through to direct call
  }

  // 2. Direct PayMongo API Fallback
  try {
    const authHeader = `Basic ${btoa(cleanKey + ':')}`

    // A. Create Payment Intent
    const piResp = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCents,
            payment_method_allowed: ['qrph', 'gcash', 'paymaya', 'card'],
            currency: 'PHP',
            description
          }
        }
      })
    })

    if (!piResp.ok) {
      const errData = await piResp.json().catch(() => ({}))
      return { ok: false, error: errData?.errors?.[0]?.detail || 'Failed to create Payment Intent.' }
    }

    const piData = await piResp.json()
    const paymentIntentId = piData?.data?.id
    const clientKey = piData?.data?.attributes?.client_key

    // B. Create QR Ph Payment Method
    const pmResp = await fetch('https://api.paymongo.com/v1/payment_methods', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          attributes: { type: 'qrph' }
        }
      })
    })

    if (!pmResp.ok) {
      const errData = await pmResp.json().catch(() => ({}))
      return { ok: false, error: errData?.errors?.[0]?.detail || 'Failed to create QR Ph Payment Method.' }
    }

    const pmData = await pmResp.json()
    const paymentMethodId = pmData?.data?.id

    // C. Attach
    const attachResp = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey
          }
        }
      })
    })

    if (!attachResp.ok) {
      const errData = await attachResp.json().catch(() => ({}))
      return { ok: false, error: errData?.errors?.[0]?.detail || 'Failed to attach QR Ph to Payment Intent.' }
    }

    const attachData = await attachResp.json()
    const nextAction = attachData?.data?.attributes?.next_action
    const qrCodeObj = nextAction?.code

    return {
      ok: true,
      paymentIntentId,
      qrImageUrl: qrCodeObj?.image_url,
      testUrl: qrCodeObj?.test_url,
      expiresAt: qrCodeObj?.expires_at
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error generating dynamic QR.' }
  }
}

/**
 * Polls the payment status of a given payment intent.
 * Enforces strict amount matching against expected amount cents to prevent tampering.
 */
export async function pollPaymentStatus(params: {
  secretKey: string
  paymentIntentId: string
  expectedAmountCents: number
}): Promise<PollPaymentStatusResult> {
  const cleanKey = params.secretKey.trim()

  // 1. Try Cloudflare Pages Function Proxy
  try {
    const proxyResp = await fetch('/api/paymongo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check_status',
        secretKey: cleanKey,
        paymentIntentId: params.paymentIntentId,
        expectedAmountCents: params.expectedAmountCents
      })
    })

    if (proxyResp.ok) {
      const data = await proxyResp.json()
      if (data.ok) {
        return {
          ok: true,
          status: data.status,
          paid: data.paid,
          paymentId: data.paymentId
        }
      }
      return { ok: false, status: 'unknown', paid: false, error: data.error }
    }
  } catch {
    // Edge function not reachable, fall through to direct call
  }

  // 2. Direct PayMongo API Fallback
  try {
    const authHeader = `Basic ${btoa(cleanKey + ':')}`
    const resp = await fetch(`https://api.paymongo.com/v1/payment_intents/${params.paymentIntentId}`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!resp.ok) {
      return { ok: false, status: 'unknown', paid: false, error: 'Could not fetch payment intent.' }
    }

    const data = await resp.json()
    const attributes = data?.data?.attributes
    const status = attributes?.status || 'unknown'
    const actualAmount = attributes?.amount
    const payments = attributes?.payments || []
    const latestPayment = payments[payments.length - 1]
    const paymentId = latestPayment?.id || null

    // Strict Tamper Check
    if (status === 'succeeded' && actualAmount !== params.expectedAmountCents) {
      return {
        ok: false,
        status: 'failed',
        paid: false,
        error: `Amount mismatch: Received ₱${(actualAmount / 100).toFixed(2)} vs expected ₱${(params.expectedAmountCents / 100).toFixed(2)}.`
      }
    }

    return {
      ok: true,
      status,
      paid: status === 'succeeded',
      paymentId
    }
  } catch (err: any) {
    return { ok: false, status: 'unknown', paid: false, error: err?.message || 'Network error polling status.' }
  }
}
