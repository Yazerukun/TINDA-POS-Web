export interface PayMongoConnectionResult { ok: boolean; message: string; livemode?: boolean }
export interface CreateDynamicQrResult { ok: boolean; paymentIntentId?: string; qrImageUrl?: string; testUrl?: string; expiresAt?: string; error?: string }
export interface PollPaymentStatusResult { ok: boolean; status: string; paid: boolean; paymentId?: string; error?: string }

function headers(): Record<string, string> {
  const token = sessionStorage.getItem('tinda_session_token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

/** PayMongo credentials are configured only as Cloudflare secrets. */
export async function testPayMongoConnection(_ignoredClientValue?: string): Promise<PayMongoConnectionResult> {
  try {
    const response = await fetch('/api/paymongo', { method: 'POST', headers: headers(), body: JSON.stringify({ action: 'test_connection' }) })
    const data = await response.json() as PayMongoConnectionResult
    return response.ok ? data : { ok: false, message: 'PayMongo is not available.' }
  } catch { return { ok: false, message: 'PayMongo is not available.' } }
}

export async function createDynamicQrPayment(params: { amountCents: number; description?: string }): Promise<CreateDynamicQrResult> {
  try {
    const response = await fetch('/api/paymongo', { method: 'POST', headers: headers(), body: JSON.stringify({ action: 'create_qr', amountCents: Math.round(params.amountCents), description: params.description }) })
    const data = await response.json() as CreateDynamicQrResult
    return response.ok ? data : { ok: false, error: 'Unable to create payment QR.' }
  } catch { return { ok: false, error: 'Unable to reach payment service.' } }
}

export async function pollPaymentStatus(params: { paymentIntentId: string; expectedAmountCents: number }): Promise<PollPaymentStatusResult> {
  try {
    const response = await fetch('/api/paymongo', { method: 'POST', headers: headers(), body: JSON.stringify({ action: 'check_status', paymentIntentId: params.paymentIntentId, expectedAmountCents: params.expectedAmountCents }) })
    const data = await response.json() as PollPaymentStatusResult
    return response.ok ? data : { ok: false, status: 'unknown', paid: false, error: 'Unable to verify payment.' }
  } catch { return { ok: false, status: 'unknown', paid: false, error: 'Unable to verify payment.' } }
}
