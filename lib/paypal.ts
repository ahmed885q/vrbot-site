export type PayPalEnv = 'sandbox' | 'live'

export function getPayPalBaseUrl() {
  const env = (process.env.PAYPAL_ENV ?? 'sandbox') as PayPalEnv
  return env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

export function assertPaymentsEnabled() {
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    const err = new Error('Payments are disabled')
    ;(err as any).status = 403
    throw err
  }
}

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) throw new Error('Missing PAYPAL credentials')

  const base = getPayPalBaseUrl()

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal token error: ${text}`)
  }

  const json = await res.json()
  return json.access_token as string
}
