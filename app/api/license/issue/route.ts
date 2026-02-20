export const dynamic = "force-dynamic";
import crypto from 'crypto'

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64urlJson(obj: any) {
  return base64url(JSON.stringify(obj))
}

export function signJwtHS256(payload: any, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const h = base64urlJson(header)
  const p = base64urlJson(payload)
  const data = `${h}.${p}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest()
  return `${data}.${base64url(sig)}`
}

export function verifyJwtHS256(token: string, secret: string) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('BAD_TOKEN_FORMAT')

  const [h, p, s] = parts
  const data = `${h}.${p}`

  const sig = crypto.createHmac('sha256', secret).update(data).digest()
  const expected = base64url(sig)
  if (expected !== s) throw new Error('BAD_SIGNATURE')

  const payloadJson = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  const payload = JSON.parse(payloadJson)

  const now = Math.floor(Date.now() / 1000)
  if (payload?.exp && now > payload.exp) throw new Error('TOKEN_EXPIRED')

  return payload
}
