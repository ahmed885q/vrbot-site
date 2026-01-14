import { NextResponse } from 'next/server'

export async function GET() {
  const res = NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL))
  res.cookies.set({ name: 'session', value: '', path: '/', maxAge: 0 })
  return res
}
