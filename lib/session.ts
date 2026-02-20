import { cookies } from 'next/headers'
import crypto from 'crypto'

export type Session = {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export async function validateSession(): Promise<Session | null> {
  const token = cookies().get('admin_session')?.value
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [email, timestamp, signature] = parts

  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return null

  const expected = crypto
    .createHmac('sha256', secret)
    .update(email + timestamp)
    .digest('hex')

  if (signature !== expected) return null

  const age = Date.now() - parseInt(timestamp)
  if (isNaN(age) || age > 86400000) return null

  return { userId: email, email, role: 'admin' }
}
