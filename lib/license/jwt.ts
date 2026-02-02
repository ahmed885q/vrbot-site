import crypto from 'crypto'

type JwtPayload = Record<string, unknown>

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function signJwtHS256(payload: JwtPayload, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = crypto.createHmac('sha256', secret).update(data).digest()
  const encodedSignature = base64url(signature)
  return `${data}.${encodedSignature}`
}