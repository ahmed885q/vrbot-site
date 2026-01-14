import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  const timestamp = Date.now().toString()

  const signature = crypto
    .createHmac('sha256', process.env.ADMIN_SESSION_SECRET!)
    .update(email + timestamp)
    .digest('hex')

  const token = `${email}.${timestamp}.${signature}`

  cookies().set({
    name: 'admin_session',
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  })

  return NextResponse.json({ success: true })
}
