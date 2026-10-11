// Cloudflare Pages Function: /api/vip
// High-assurance, server-side VIP Pro Licensing & Anti-Replay Ledger
//
// 1. All PayMongo operations run server-side using Cloudflare Secrets (PAYMONGO_SECRET_KEY).
// 2. Zero secrets or API keys exposed to frontend or stored in client storage.
// 3. Mathematical Anti-Replay: payment_intent_id is strictly UNIQUE in D1 vip_licenses.
// 4. Server-signed cryptographic license tokens (HMAC-SHA256) prevent client-side forgery.
// 5. Direct Master Admin manual fulfillment for verified offline transfers.

import {
  type Env as BaseEnv,
  isAllowedOrigin,
  requireSession,
  unauthorized,
  forbidden
  ,CORS
  ,logServerError
} from '../_shared/auth'

export interface Env extends BaseEnv {
  PAYMONGO_SECRET_KEY?: string
  PAYMONGO_PUBLIC_KEY?: string
  VIP_SIGNING_SECRET?: string
}

interface VipRequestBody {
  action: 'create_order' | 'claim_activation' | 'master_grant' | 'verify_token'
  username?: string
  storeName?: string
  paymentIntentId?: string
  targetUsername?: string
  reason?: string
  token?: string
}

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  const allowed = isAllowedOrigin(request)
  return {
    'Content-Type': 'application/json',
    ...CORS,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  }
}

async function getSigningKey(secretStr: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secretStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * Signs a VIP license token using Cloudflare server-only secret.
 * Output format: TINDAVIP.<b64url(payload)>.<b64url(signature)>
 */
async function signVipToken(
  payload: Record<string, unknown>,
  secretStr: string
): Promise<string> {
  const key = await getSigningKey(secretStr)
  const payloadBytes = enc.encode(JSON.stringify(payload))
  const payloadB64 = b64url(payloadBytes)
  const sigBytes = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64))
  const sigB64 = b64url(new Uint8Array(sigBytes))
  return `TINDAVIP.${payloadB64}.${sigB64}`
}

/**
 * Cryptographically verifies a VIP license token against server secret.
 */
async function verifyVipToken(
  tokenStr: string,
  secretStr: string
): Promise<{ valid: boolean; payload: any }> {
  try {
    if (!tokenStr || !tokenStr.startsWith('TINDAVIP.')) {
      return { valid: false, payload: null }
    }
    const parts = tokenStr.split('.')
    if (parts.length !== 3) return { valid: false, payload: null }
    const [, payloadB64, sigB64] = parts

    const key = await getSigningKey(secretStr)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromB64url(sigB64) as BufferSource,
      enc.encode(payloadB64) as BufferSource
    )
    if (!valid) return { valid: false, payload: null }

    const rawJson = new TextDecoder().decode(fromB64url(payloadB64))
    const payload = JSON.parse(rawJson)
    return { valid: true, payload }
  } catch {
    return { valid: false, payload: null }
  }
}

export async function onRequestOptions({ request }: { request: Request }) {
  return new Response(null, { headers: getCorsHeaders(request) })
}

/**
 * GET /api/vip?username=...
 * Look up VIP license status for an account from Cloudflare D1
 */
export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const cors = getCorsHeaders(request)
  if (!isAllowedOrigin(request)) return unauthorized()

  try {
    const url = new URL(request.url)
    const username = (url.searchParams.get('username') || '').trim().toLowerCase()

    if (!username) {
      return Response.json({ ok: false, error: 'Username parameter is required.' }, { status: 400, headers: cors })
    }
    const session = await requireSession(request, env)
    if (!session) return unauthorized()
    if (username !== session.username.toLowerCase() && !session.isMaster) return forbidden()

    const row = await env.TINDAPOS_DB.prepare(
      'SELECT id, username, payment_intent_id, payment_method, amount_cents, status, license_signature, registered_store, activated_at FROM vip_licenses WHERE username = ? COLLATE NOCASE LIMIT 1'
    )
      .bind(username)
      .first<any>()

    if (row && row.status === 'ACTIVE') {
      return Response.json(
        {
          ok: true,
          isVip: true,
          license: {
            username: row.username,
            paymentIntentId: row.payment_intent_id,
            paymentMethod: row.payment_method,
            amountCents: row.amount_cents,
            activatedAt: row.activated_at,
            registeredStore: row.registered_store,
            token: row.license_signature
          }
        },
        { headers: cors }
      )
    }

    return Response.json({ ok: true, isVip: false }, { headers: cors })
  } catch (err: unknown) {
    logServerError('vip.get', err)
    return Response.json({ ok: false, error: 'VIP service unavailable' }, { status: 500, headers: cors })
  }
}

/**
 * POST /api/vip
 * Handles order creation, settlement verification & claim, and master manual activation
 */
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  const cors = getCorsHeaders(request)
  if (!isAllowedOrigin(request)) return unauthorized()

  try {
    const body: VipRequestBody = await request.json()
    const { action } = body
    const session = await requireSession(request, env)
    if (!session) return unauthorized()
    const secretKey = env.PAYMONGO_SECRET_KEY || ''
    const signingSecret = env.VIP_SIGNING_SECRET
    if (!signingSecret || signingSecret.length < 32) {
      return Response.json({ ok: false, error: 'VIP service is not configured.' }, { status: 503, headers: cors })
    }

    // =========================================================================
    // 1. ACTION: CREATE ORDER (₱500.00 PayMongo QR Ph Intent)
    // =========================================================================
    if (action === 'create_order') {
      const username = session.username.toLowerCase()
      if (!username) {
        return Response.json({ ok: false, error: 'Username is required to create a VIP order.' }, { status: 400, headers: cors })
      }

      if (!secretKey || !secretKey.startsWith('sk_')) {
        return Response.json(
          { ok: false, error: 'Server misconfiguration: PayMongo Secret Key is not configured on Cloudflare Edge.' },
          { status: 500, headers: cors }
        )
      }

      const storeName = (body.storeName || 'TINDA Store').trim()
      const authHeader = `Basic ${btoa(secretKey + ':')}`
      const amountCents = 50000 // ₱500.00 fixed VIP Pro Lifetime price

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
              payment_method_allowed: ['qrph', 'gcash', 'paymaya'],
              currency: 'PHP',
              description: `TINDA POS VIP Pro Lifetime - @${username} (${storeName})`
            }
          }
        })
      })

      if (!piResp.ok) {
        const errData = await piResp.json().catch(() => ({}))
        return Response.json(
          { ok: false, error: errData?.errors?.[0]?.detail || 'Failed to create PayMongo payment intent.' },
          { status: 400, headers: cors }
        )
      }

      const piData = await piResp.json()
      const paymentIntentId = piData?.data?.id
      const clientKey = piData?.data?.attributes?.client_key

      if (!paymentIntentId || !clientKey) {
        return Response.json({ ok: false, error: 'Malformed PayMongo response.' }, { status: 502, headers: cors })
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
        const pmErr = await pmResp.json().catch(() => ({}))
        return Response.json(
          { ok: false, error: pmErr?.errors?.[0]?.detail || 'Failed to initialize QR Ph method.' },
          { status: 400, headers: cors }
        )
      }

      const pmData = await pmResp.json()
      const paymentMethodId = pmData?.data?.id

      // Step C: Attach QR Ph Payment Method
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
        const attachErr = await attachResp.json().catch(() => ({}))
        return Response.json(
          { ok: false, error: attachErr?.errors?.[0]?.detail || 'Failed to attach QR Ph to intent.' },
          { status: 400, headers: cors }
        )
      }

      const attachData = await attachResp.json()
      const qrCodeObj = attachData?.data?.attributes?.next_action?.code
      const qrImageUrl = qrCodeObj?.image_url || null
      const expiresAt = qrCodeObj?.expires_at || null

      // Step D: Record pending order in D1
      const now = new Date().toISOString()
      await env.TINDAPOS_DB.prepare(
        `INSERT INTO vip_orders (payment_intent_id, username, store_name, amount_cents, status, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?)
         ON CONFLICT(payment_intent_id) DO UPDATE SET status = 'PENDING', created_at = excluded.created_at`
      )
        .bind(paymentIntentId, username, storeName, amountCents, now)
        .run()

      return Response.json(
        {
          ok: true,
          paymentIntentId,
          amountCents,
          amountFormatted: '₱500.00',
          qrImageUrl,
          expiresAt,
          username
        },
        { headers: cors }
      )
    }

    // =========================================================================
    // 2. ACTION: CLAIM ACTIVATION (Real-time Settlement Verification & Anti-Replay)
    // =========================================================================
    if (action === 'claim_activation') {
      const { paymentIntentId } = body
      const username = session.username.toLowerCase()
      const storeName = (body.storeName || '').trim()

      if (!paymentIntentId || !username) {
        return Response.json(
          { ok: false, error: 'paymentIntentId and username are required for VIP activation.' },
          { status: 400, headers: cors }
        )
      }

      // Check Anti-Replay Ledger: Has this payment intent already been consumed?
      const existingLicense = await env.TINDAPOS_DB.prepare(
        'SELECT username, payment_intent_id, license_signature, activated_at FROM vip_licenses WHERE payment_intent_id = ? LIMIT 1'
      )
        .bind(paymentIntentId)
        .first<any>()

      if (existingLicense) {
        if (existingLicense.username.toLowerCase() === username) {
          // Idempotent recovery for the exact same account
          return Response.json(
            {
              ok: true,
              isVip: true,
              token: existingLicense.license_signature,
              username: existingLicense.username,
              activatedAt: existingLicense.activated_at,
              message: 'VIP Pro Lifetime license already active for this account.'
            },
            { headers: cors }
          )
        } else {
          // Replay attack prevention: Same payment intent attempted for another account!
          return Response.json(
            {
              ok: false,
              error: `Security Alert: This payment transaction (${paymentIntentId}) was already claimed by another account (@${existingLicense.username}). Every account requires its own separate ₱500 license.`
            },
            { status: 409, headers: cors }
          )
        }
      }

      // Step B: Query PayMongo Source of Truth API
      if (!secretKey) {
        return Response.json({ ok: false, error: 'Server secret key missing.' }, { status: 500, headers: cors })
      }
      const authHeader = `Basic ${btoa(secretKey + ':')}`

      const checkResp = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        }
      })

      if (!checkResp.ok) {
        const errJson = await checkResp.json().catch(() => ({}))
        const errMsg = errJson?.errors?.[0]?.detail || 'Failed to verify payment intent with PayMongo.'
        return Response.json(
          { ok: false, error: `PayMongo check error: ${errMsg}` },
          { status: 502, headers: cors }
        )
      }

      const checkData = await checkResp.json()
      const attributes = checkData?.data?.attributes
      const status = attributes?.status // 'succeeded'
      const amountCents = attributes?.amount
      const payments = attributes?.payments || []

      // HARDLOCK RULE: Strict settlement verification
      if (status !== 'succeeded') {
        return Response.json(
          {
            ok: false,
            error: `Payment not completed yet. Current status: "${status}". Please scan the QR Ph code and complete payment first.`
          },
          { status: 402, headers: cors }
        )
      }

      if (amountCents !== 50000) {
        return Response.json(
          {
            ok: false,
            error: `Fraud Detection: Transaction amount mismatch! Expected ₱500.00 (50,000 cents) but received ₱${(amountCents / 100).toFixed(2)}.`
          },
          { status: 422, headers: cors }
        )
      }

      if (payments.length === 0) {
        return Response.json(
          { ok: false, error: 'No confirmed capture found in PayMongo records.' },
          { status: 402, headers: cors }
        )
      }

      // Step C: Mint Server-Signed Cryptographic License Token
      const now = new Date().toISOString()
      const payload = {
        v: 1,
        un: username,
        store: storeName,
        tier: 'VIP_PRO_LIFETIME',
        ref: paymentIntentId,
        iat: Math.floor(Date.now() / 1000)
      }
      const licenseToken = await signVipToken(payload, signingSecret)

      // Step D: Write to D1 Anti-Replay Ledger & Orders
      await env.TINDAPOS_DB.prepare(
        `INSERT INTO vip_licenses (username, payment_intent_id, payment_method, amount_cents, currency, status, license_signature, registered_store, activated_at, created_at)
         VALUES (?, ?, 'PAYMONGO_QRPH', 50000, 'PHP', 'ACTIVE', ?, ?, ?, ?)
         ON CONFLICT(username) DO UPDATE SET
           payment_intent_id = excluded.payment_intent_id,
           license_signature = excluded.license_signature,
           registered_store = excluded.registered_store,
           activated_at = excluded.activated_at`
      )
        .bind(username, paymentIntentId, licenseToken, storeName, now, now)
        .run()

      await env.TINDAPOS_DB.prepare(
        "UPDATE vip_orders SET status = 'CLAIMED' WHERE payment_intent_id = ?"
      )
        .bind(paymentIntentId)
        .run()

      // Also ensure cloud pro_access is synchronized for this account
      await env.TINDAPOS_DB.prepare(
        `INSERT INTO pro_access (username, store_name, pro_expires_at, updated_at)
         VALUES (?, ?, 2147483647, ?)
         ON CONFLICT(username) DO UPDATE SET pro_expires_at = 2147483647, updated_at = excluded.updated_at`
      )
        .bind(username, storeName, now)
        .run()

      return Response.json(
        {
          ok: true,
          isVip: true,
          token: licenseToken,
          username,
          activatedAt: now,
          message: `VIP Pro Lifetime verified and locked to @${username}!`
        },
        { headers: cors }
      )
    }

    // =========================================================================
    // 3. ACTION: MASTER GRANT (verified manual payment fulfillment)
    // =========================================================================
    if (action === 'master_grant') {
      if (!session || !session.isMaster) {
        return forbidden()
      }

      const targetUsername = (body.targetUsername || '').trim().toLowerCase()
      if (!targetUsername) {
        return Response.json({ ok: false, error: 'targetUsername is required.' }, { status: 400, headers: cors })
      }

      const note = (body.reason || 'MANUAL_PAYMENT_VERIFIED').slice(0, 100)
      const ref = `MAYA_IAN_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      const now = new Date().toISOString()

      const payload = {
        v: 1,
        un: targetUsername,
        tier: 'VIP_PRO_LIFETIME',
        ref,
        grantedBy: 'MASTER_ADMIN_IAN',
        note,
        iat: Math.floor(Date.now() / 1000)
      }
      const licenseToken = await signVipToken(payload, signingSecret)

      await env.TINDAPOS_DB.prepare(
        `INSERT INTO vip_licenses (username, payment_intent_id, payment_method, amount_cents, currency, status, license_signature, registered_store, activated_at, created_at)
         VALUES (?, ?, 'MAYA_MANUAL_IAN', 50000, 'PHP', 'ACTIVE', ?, ?, ?, ?)
         ON CONFLICT(username) DO UPDATE SET
           payment_intent_id = excluded.payment_intent_id,
           license_signature = excluded.license_signature,
           activated_at = excluded.activated_at`
      )
        .bind(targetUsername, ref, licenseToken, note, now, now)
        .run()

      await env.TINDAPOS_DB.prepare(
        `INSERT INTO pro_access (username, store_name, pro_expires_at, updated_at)
         VALUES (?, 'VIP Store', 2147483647, ?)
         ON CONFLICT(username) DO UPDATE SET pro_expires_at = 2147483647, updated_at = excluded.updated_at`
      )
        .bind(targetUsername, now)
        .run()

      return Response.json(
        {
          ok: true,
          isVip: true,
          token: licenseToken,
          targetUsername,
          ref,
          message: `Official VIP Pro Lifetime License minted for @${targetUsername} by Master Admin!`
        },
        { headers: cors }
      )
    }

    // =========================================================================
    // 4. ACTION: VERIFY TOKEN
    // =========================================================================
    if (action === 'verify_token') {
      const { token } = body
      const username = (body.username || '').trim().toLowerCase()

      if (!token) {
        return Response.json({ ok: false, valid: false, error: 'Token is required' }, { status: 400, headers: cors })
      }

      const { valid, payload } = await verifyVipToken(token, signingSecret)
      if (!valid) {
        return Response.json({ ok: true, valid: false, reason: 'Invalid cryptographic signature.' }, { headers: cors })
      }

      if (username && payload?.un && payload.un.toLowerCase() !== username) {
        return Response.json(
          { ok: true, valid: false, reason: 'Token belongs to a different account.' },
          { headers: cors }
        )
      }

      return Response.json({ ok: true, valid: true, payload }, { headers: cors })
    }

    return Response.json({ ok: false, error: 'Unknown action requested.' }, { status: 400, headers: cors })
  } catch (err: unknown) {
    logServerError('vip.post', err)
    return Response.json({ ok: false, error: 'VIP service unavailable' }, { status: 500, headers: cors })
  }
}
