// Cloudflare Pages Function: /api/paymongo
// High-assurance, server-side proxy for PayMongo Dynamic QR Ph and payment verification.
// Keeps secret keys server-evaluated when called from the web app, validates amounts,
// and enforces strict transaction integrity checks.

interface PayMongoRequest {
  action: 'test_connection' | 'create_qr' | 'check_status'
  secretKey?: string
  amountCents?: number
  description?: string
  paymentIntentId?: string
  expectedAmountCents?: number
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS })
}

export async function onRequestPost({ request, env }: { request: Request; env?: Record<string, string> }) {
  try {
    const body: PayMongoRequest = await request.json()
    const { action } = body
    const secretKey = body.secretKey || env?.PAYMONGO_SECRET_KEY || ''

    if (!secretKey || typeof secretKey !== 'string' || !secretKey.startsWith('sk_')) {
      return Response.json(
        { ok: false, error: 'Invalid or missing PayMongo Secret Key. Must start with sk_test_ or sk_live_.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const authHeader = `Basic ${btoa(secretKey + ':')}`

    // 1. TEST CONNECTION ACTION
    if (action === 'test_connection') {
      const resp = await fetch('https://api.paymongo.com/v1/payments?limit=1', {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        }
      })

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}))
        const errMsg = errJson?.errors?.[0]?.detail || 'Invalid Secret Key or unauthorized by PayMongo.'
        return Response.json({ ok: false, error: errMsg }, { status: 401, headers: CORS_HEADERS })
      }

      const isLive = secretKey.startsWith('sk_live_')
      return Response.json(
        {
          ok: true,
          livemode: isLive,
          message: `Connected successfully to PayMongo (${isLive ? 'LIVE Production' : 'TEST Sandbox'} Mode).`
        },
        { headers: CORS_HEADERS }
      )
    }

    // 2. CREATE DYNAMIC QR PH PAYMENT INTENT ACTION
    if (action === 'create_qr') {
      const amountCents = Math.round(body.amountCents || 0)
      if (amountCents < 1000) {
        return Response.json(
          { ok: false, error: 'Minimum transaction amount for PayMongo Dynamic QR Ph is ₱10.00 (1,000 cents).' },
          { status: 400, headers: CORS_HEADERS }
        )
      }

      const description = (body.description || 'TINDA POS Order').slice(0, 100)

      // Step A: Create Payment Intent
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
        const errorDetail = errData?.errors?.[0]?.detail || 'Failed to create payment intent with PayMongo.'
        return Response.json({ ok: false, error: errorDetail }, { status: 400, headers: CORS_HEADERS })
      }

      const piData = await piResp.json()
      const paymentIntentId = piData?.data?.id
      const clientKey = piData?.data?.attributes?.client_key

      if (!paymentIntentId || !clientKey) {
        return Response.json(
          { ok: false, error: 'Malformed response from PayMongo Payment Intent creation.' },
          { status: 502, headers: CORS_HEADERS }
        )
      }

      // Step B: Create QR Ph Payment Method
      const pmResp = await fetch('https://api.paymongo.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            attributes: {
              type: 'qrph'
            }
          }
        })
      })

      if (!pmResp.ok) {
        const pmErrData = await pmResp.json().catch(() => ({}))
        const errorDetail = pmErrData?.errors?.[0]?.detail || 'Failed to create QR Ph payment method.'
        return Response.json({ ok: false, error: errorDetail }, { status: 400, headers: CORS_HEADERS })
      }

      const pmData = await pmResp.json()
      const paymentMethodId = pmData?.data?.id

      // Step C: Attach QR Ph Payment Method to Payment Intent
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
        const attachErrData = await attachResp.json().catch(() => ({}))
        const errorDetail = attachErrData?.errors?.[0]?.detail || 'Failed to attach QR Ph to payment intent.'
        return Response.json({ ok: false, error: errorDetail }, { status: 400, headers: CORS_HEADERS })
      }

      const attachData = await attachResp.json()
      const nextAction = attachData?.data?.attributes?.next_action
      const qrCodeObj = nextAction?.code

      const qrImageUrl = qrCodeObj?.image_url || null
      const testUrl = qrCodeObj?.test_url || null
      const expiresAt = qrCodeObj?.expires_at || null

      return Response.json(
        {
          ok: true,
          paymentIntentId,
          amountCents,
          qrImageUrl,
          testUrl,
          expiresAt,
          merchantDescriptor: attachData?.data?.attributes?.statement_descriptor || 'TINDA Store'
        },
        { headers: CORS_HEADERS }
      )
    }

    // 3. CHECK STATUS & VERIFY INTEGRITY ACTION
    if (action === 'check_status') {
      const { paymentIntentId, expectedAmountCents } = body
      if (!paymentIntentId) {
        return Response.json(
          { ok: false, error: 'paymentIntentId is required to verify status.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }

      const checkResp = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        }
      })

      if (!checkResp.ok) {
        const errJson = await checkResp.json().catch(() => ({}))
        const errMsg = errJson?.errors?.[0]?.detail || 'Failed to retrieve payment intent from PayMongo.'
        return Response.json(
          { ok: false, error: `PayMongo check error: ${errMsg}` },
          { status: 502, headers: CORS_HEADERS }
        )
      }

      const checkData = await checkResp.json()
      const attributes = checkData?.data?.attributes
      const status = attributes?.status // 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'cancelled'
      const actualAmount = attributes?.amount
      const payments = attributes?.payments || []
      const latestPayment = payments[payments.length - 1]
      const paymentId = latestPayment?.id || null

      // CRITICAL INTEGRITY CHECK: Prevent amount tampering
      if (status === 'succeeded' && expectedAmountCents && actualAmount !== expectedAmountCents) {
        return Response.json(
          {
            ok: false,
            error: `Security Alert: Amount mismatch! Expected ₱${(expectedAmountCents / 100).toFixed(2)} but received ₱${(actualAmount / 100).toFixed(2)}.`
          },
          { status: 422, headers: CORS_HEADERS }
        )
      }

      return Response.json(
        {
          ok: true,
          paymentIntentId,
          status,
          paid: status === 'succeeded',
          paymentId,
          amountCents: actualAmount,
          createdAt: attributes?.created_at,
          updatedAt: attributes?.updated_at
        },
        { headers: CORS_HEADERS }
      )
    }

    return Response.json({ ok: false, error: 'Unknown action requested.' }, { status: 400, headers: CORS_HEADERS })
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || 'Internal error in PayMongo proxy function.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
